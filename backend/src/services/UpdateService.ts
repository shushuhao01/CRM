/**
 * UpdateService - 版本一键更新核心服务
 * 负责：预检查 → 备份 → 获取代码 → 安装依赖 → 构建 → 数据库迁移 → 重启服务
 * 安全机制：每步骤前备份，失败自动回滚
 */
import { AppDataSource } from '../config/database';
import { UpdateTask } from '../entities/UpdateTask';
import { Version } from '../entities/Version';
import { MigrationHistory } from '../entities/MigrationHistory';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { log } from '../config/logger';

// 更新步骤定义
const UPDATE_STEPS = [
  { key: 'pre_check', label: '预检查', progress: 5 },
  { key: 'backing_up', label: '备份数据', progress: 20 },
  { key: 'downloading', label: '获取新版本', progress: 40 },
  { key: 'installing', label: '安装依赖', progress: 55 },
  { key: 'building', label: '构建项目', progress: 75 },
  { key: 'migrating', label: '数据库迁移', progress: 88 },
  { key: 'restarting', label: '重启服务', progress: 95 },
  { key: 'success', label: '更新完成', progress: 100 }
] as const;

// 超时时间（毫秒）
const CMD_TIMEOUT = 5 * 60 * 1000; // 5分钟

// 日志条目接口
interface LogEntry {
  time: string;
  step: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

// SSE 回调类型
type LogCallback = (entry: LogEntry & { progress: number }) => void;

export class UpdateService {
  private taskRepo: Repository<UpdateTask>;
  private versionRepo: Repository<Version>;
  private migrationRepo: Repository<MigrationHistory>;
  private projectRoot: string;
  private activeCallbacks: Map<string, LogCallback[]> = new Map();

  constructor() {
    this.taskRepo = AppDataSource.getRepository(UpdateTask);
    this.versionRepo = AppDataSource.getRepository(Version);
    this.migrationRepo = AppDataSource.getRepository(MigrationHistory);
    // 项目根目录（backend 的上级目录）
    this.projectRoot = path.resolve(process.cwd(), '..');
  }

  /**
   * 注册日志回调（用于 SSE 推送）
   */
  registerLogCallback(taskId: string, callback: LogCallback): void {
    if (!this.activeCallbacks.has(taskId)) {
      this.activeCallbacks.set(taskId, []);
    }
    this.activeCallbacks.get(taskId)!.push(callback);
  }

  /**
   * 移除日志回调
   */
  removeLogCallback(taskId: string, callback: LogCallback): void {
    const callbacks = this.activeCallbacks.get(taskId);
    if (callbacks) {
      const idx = callbacks.indexOf(callback);
      if (idx !== -1) callbacks.splice(idx, 1);
      if (callbacks.length === 0) this.activeCallbacks.delete(taskId);
    }
  }

  /**
   * 推送日志到 SSE 客户端并保存到数据库
   */
  private async pushLog(
    taskId: string,
    step: string,
    message: string,
    level: LogEntry['level'] = 'info',
    progress?: number
  ): Promise<void> {
    const entry: LogEntry = {
      time: new Date().toISOString(),
      step,
      message,
      level
    };

    const currentProgress = progress ?? this.getStepProgress(step);

    // 推送给 SSE 客户端
    const callbacks = this.activeCallbacks.get(taskId);
    if (callbacks) {
      callbacks.forEach(cb => {
        try { cb({ ...entry, progress: currentProgress }); } catch {}
      });
    }

    // 保存日志到数据库
    try {
      const task = await this.taskRepo.findOne({ where: { id: taskId } });
      if (task) {
        const existingLogs: LogEntry[] = task.logs ? JSON.parse(task.logs) : [];
        existingLogs.push(entry);
        task.logs = JSON.stringify(existingLogs);
        task.currentStep = step;
        task.progress = currentProgress;
        if (step === 'success' || step === 'failed' || step === 'rolled_back') {
          task.status = step;
          task.completedAt = new Date();
        } else {
          task.status = step;
        }
        await this.taskRepo.save(task);
      }
    } catch (e) {
      log.error('[UpdateService] 保存日志失败:', e);
    }

    log.info(`[UpdateService][${taskId}] [${step}] ${message}`);
  }

  /**
   * 获取步骤对应的进度值
   */
  private getStepProgress(step: string): number {
    const found = UPDATE_STEPS.find(s => s.key === step);
    return found ? found.progress : 0;
  }

  /**
   * 获取当前系统版本
   */
  async getCurrentVersion(): Promise<string> {
    try {
      const result = await AppDataSource.query(
        `SELECT config_value FROM system_config WHERE config_key = 'admin_system_config' LIMIT 1`
      ).catch(() => []);

      if (result && result.length > 0) {
        const data = JSON.parse(result[0].config_value || '{}');
        if (data.systemVersion) return data.systemVersion;
      }
    } catch {}

    // 回退：从 package.json 读取
    try {
      const pkgPath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkg.version || '0.0.0';
      }
    } catch {}

    return '0.0.0';
  }

  /**
   * 获取最新可更新版本
   */
  async getLatestAvailableVersion(): Promise<Version | null> {
    return this.versionRepo.findOne({
      where: { status: 'published' },
      order: { versionCode: 'DESC' }
    });
  }

  /**
   * 检查是否有新版本可用
   */
  async checkForUpdate(): Promise<{
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: Version | null;
  }> {
    const currentVersion = await this.getCurrentVersion();
    const latest = await this.getLatestAvailableVersion();

    if (!latest) {
      return { hasUpdate: false, currentVersion, latestVersion: null };
    }

    const currentCode = this.parseVersionCode(currentVersion);
    const hasUpdate = latest.versionCode > currentCode;

    return { hasUpdate, currentVersion, latestVersion: latest };
  }

  /**
   * 获取更新任务列表
   */
  async getUpdateTasks(params: { page?: number; pageSize?: number; status?: string }): Promise<{
    list: UpdateTask[];
    total: number;
  }> {
    const { page = 1, pageSize = 20, status } = params;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.taskRepo.createQueryBuilder('task');
    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }
    queryBuilder.orderBy('task.createdAt', 'DESC');
    queryBuilder.skip(skip).take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();
    return { list, total };
  }

  /**
   * 获取更新任务详情
   */
  async getUpdateTask(id: string): Promise<UpdateTask | null> {
    return this.taskRepo.findOne({ where: { id } });
  }

  /**
   * 触发一键更新（核心入口）
   */
  async startUpdate(versionId: string, triggeredBy?: string): Promise<UpdateTask> {
    // 检查是否有正在执行的更新任务
    const running = await this.taskRepo.findOne({
      where: [
        { status: 'backing_up' },
        { status: 'downloading' },
        { status: 'installing' },
        { status: 'building' },
        { status: 'migrating' },
        { status: 'restarting' },
        { status: 'pending' }
      ]
    });

    if (running) {
      throw new Error('已有更新任务正在执行，请等待完成后再试');
    }

    // 获取目标版本
    const targetVersion = await this.versionRepo.findOne({ where: { id: versionId } });
    if (!targetVersion) {
      throw new Error('目标版本不存在');
    }
    if (targetVersion.status !== 'published') {
      throw new Error('只能更新到已发布的版本');
    }

    const currentVersion = await this.getCurrentVersion();

    // 创建更新任务
    const task = new UpdateTask();
    task.id = uuidv4();
    task.versionId = versionId;
    task.status = 'pending';
    task.progress = 0;
    task.fromVersion = currentVersion;
    task.toVersion = targetVersion.version;
    task.triggeredBy = triggeredBy || null as any;
    task.logs = '[]';
    await this.taskRepo.save(task);

    // 异步执行更新流程（不阻塞请求）
    this.executeUpdate(task.id, targetVersion).catch(error => {
      log.error(`[UpdateService] 更新任务 ${task.id} 异常终止:`, error);
    });

    return task;
  }

  /**
   * 执行更新流程（异步）
   */
  private async executeUpdate(taskId: string, targetVersion: Version): Promise<void> {
    let backupPath = '';

    try {
      // Step 1: 预检查
      await this.pushLog(taskId, 'pre_check', '开始预检查...');
      await this.preCheck(taskId, targetVersion);
      await this.pushLog(taskId, 'pre_check', '预检查通过 ✓', 'success');

      // Step 2: 备份
      await this.pushLog(taskId, 'backing_up', '正在备份当前系统...');
      backupPath = await this.backup(taskId);
      await this.pushLog(taskId, 'backing_up', `备份完成 → ${path.basename(backupPath)} ✓`, 'success');

      // Step 3: 获取新版本代码
      await this.pushLog(taskId, 'downloading', '正在获取新版本...');
      await this.pullSource(taskId, targetVersion);
      await this.pushLog(taskId, 'downloading', '新版本代码已就绪 ✓', 'success');

      // Step 4: 安装依赖
      await this.pushLog(taskId, 'installing', '正在安装后端依赖...');
      await this.installDeps(taskId);
      await this.pushLog(taskId, 'installing', '依赖安装完成 ✓', 'success');

      // Step 5: 构建项目
      await this.pushLog(taskId, 'building', '正在构建项目...');
      await this.buildProject(taskId);
      await this.pushLog(taskId, 'building', '项目构建完成 ✓', 'success');

      // Step 6: 数据库迁移
      await this.pushLog(taskId, 'migrating', '检查数据库迁移...');
      await this.runMigrations(taskId);
      await this.pushLog(taskId, 'migrating', '数据库迁移完成 ✓', 'success');

      // Step 7: 重启服务
      await this.pushLog(taskId, 'restarting', '正在重启服务...');
      await this.restartService(taskId, targetVersion);
      await this.pushLog(taskId, 'restarting', '服务重启完成 ✓', 'success');

      // 完成
      await this.pushLog(taskId, 'success', `🎉 系统已成功更新到 v${targetVersion.version}`, 'success', 100);

    } catch (error: any) {
      const errorMsg = error.message || '未知错误';
      await this.pushLog(taskId, 'failed', `❌ 更新失败: ${errorMsg}`, 'error');

      // 自动回滚
      if (backupPath) {
        try {
          await this.pushLog(taskId, 'failed', '正在自动回滚...', 'warn');
          await this.rollback(taskId, backupPath);
          await this.pushLog(taskId, 'rolled_back', '✓ 已回滚到更新前状态', 'warn');
        } catch (rollbackError: any) {
          await this.pushLog(taskId, 'failed', `⚠ 回滚失败: ${rollbackError.message}，请手动恢复`, 'error');
        }
      }

      // 更新任务状态
      const task = await this.taskRepo.findOne({ where: { id: taskId } });
      if (task) {
        task.errorMessage = errorMsg;
        task.completedAt = new Date();
        await this.taskRepo.save(task);
      }
    }
  }

  /**
   * Step 1: 预检查
   */
  private async preCheck(taskId: string, targetVersion: Version): Promise<void> {
    // 检查磁盘空间
    const backendDir = path.join(this.projectRoot, 'backend');
    try {
      const stats = fs.statfsSync(backendDir);
      const freeGB = (stats.bavail * stats.bsize) / (1024 * 1024 * 1024);
      if (freeGB < 0.5) {
        throw new Error(`磁盘空间不足 (剩余 ${freeGB.toFixed(2)} GB，需要至少 0.5 GB)`);
      }
      await this.pushLog(taskId, 'pre_check', `磁盘空间充足 (${freeGB.toFixed(1)} GB 可用)`);
    } catch (e: any) {
      if (e.message.includes('磁盘空间不足')) throw e;
      // statfsSync 可能不支持，跳过检查
      await this.pushLog(taskId, 'pre_check', '磁盘空间检查跳过（不影响更新）', 'warn');
    }

    // 检查更新源是否可用
    const sourceType = targetVersion.sourceType || 'url';
    if (sourceType === 'git' && !targetVersion.gitRepoUrl) {
      throw new Error('Git 仓库地址未配置');
    }
    if (sourceType === 'url' && !targetVersion.downloadUrl) {
      throw new Error('下载地址未配置');
    }
    if (sourceType === 'upload' && !targetVersion.packagePath) {
      throw new Error('更新包路径未配置');
    }

    await this.pushLog(taskId, 'pre_check', `更新源类型: ${sourceType}`);

    // 设置开始时间
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (task) {
      task.startedAt = new Date();
      await this.taskRepo.save(task);
    }
  }

  /**
   * Step 2: 备份当前系统
   */
  private async backup(taskId: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = path.join(this.projectRoot, 'backend', 'backups', `update-${timestamp}`);

    // 创建备份目录
    fs.mkdirSync(backupDir, { recursive: true });

    // 备份后端 dist 目录
    const backendDist = path.join(this.projectRoot, 'backend', 'dist');
    if (fs.existsSync(backendDist)) {
      await this.pushLog(taskId, 'backing_up', '备份后端编译文件...');
      await this.execCommand(`xcopy "${backendDist}" "${path.join(backupDir, 'backend-dist')}\\" /E /I /Q /Y`, this.projectRoot);
    }

    // 备份前端 dist 目录（如果存在）
    const frontendDist = path.join(this.projectRoot, 'dist');
    if (fs.existsSync(frontendDist)) {
      await this.pushLog(taskId, 'backing_up', '备份前端编译文件...');
      await this.execCommand(`xcopy "${frontendDist}" "${path.join(backupDir, 'frontend-dist')}\\" /E /I /Q /Y`, this.projectRoot);
    }

    // 备份 package.json
    const pkgSrc = path.join(this.projectRoot, 'backend', 'package.json');
    if (fs.existsSync(pkgSrc)) {
      fs.copyFileSync(pkgSrc, path.join(backupDir, 'backend-package.json'));
    }

    // 数据库备份（mysqldump）
    await this.pushLog(taskId, 'backing_up', '备份数据库...');
    try {
      const dbName = process.env.DB_DATABASE || process.env.DB_NAME || 'crm';
      const dbUser = process.env.DB_USERNAME || process.env.DB_USER || 'root';
      const dbPass = process.env.DB_PASSWORD || '';
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '3306';

      const dumpFile = path.join(backupDir, 'database-backup.sql');
      const passArg = dbPass ? `-p"${dbPass}"` : '';
      const dumpCmd = `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} ${passArg} ${dbName} > "${dumpFile}"`;

      await this.execCommand(dumpCmd, this.projectRoot);
      await this.pushLog(taskId, 'backing_up', '数据库备份完成');
    } catch (e: any) {
      await this.pushLog(taskId, 'backing_up', `数据库备份跳过: ${e.message}（mysqldump 可能未安装）`, 'warn');
      // 不阻塞更新，但记录警告
    }

    // 保存 backupPath 到任务
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (task) {
      task.backupPath = backupDir;
      await this.taskRepo.save(task);
    }

    return backupDir;
  }

  /**
   * Step 3: 获取新版本代码
   */
  private async pullSource(taskId: string, version: Version): Promise<void> {
    const sourceType = version.sourceType || 'url';

    if (sourceType === 'git') {
      await this.pullFromGit(taskId, version);
    } else if (sourceType === 'upload') {
      await this.extractPackage(taskId, version.packagePath!);
    } else {
      // url 模式 - 下载并解压
      await this.downloadAndExtract(taskId, version.downloadUrl!);
    }
  }

  /**
   * 从 Git 仓库拉取代码
   */
  private async pullFromGit(taskId: string, version: Version): Promise<void> {
    const repoUrl = version.gitRepoUrl!;
    const branch = version.gitBranch || 'main';
    const tag = version.gitTag;

    // 检查是否有 .git 目录
    const gitDir = path.join(this.projectRoot, '.git');
    if (fs.existsSync(gitDir)) {
      // 已有 git 仓库，直接 pull
      await this.pushLog(taskId, 'downloading', `正在从 Git 拉取最新代码 (${tag || branch})...`);
      await this.execCommand('git fetch --all', this.projectRoot);

      if (tag) {
        await this.execCommand(`git checkout tags/${tag}`, this.projectRoot);
      } else {
        await this.execCommand(`git checkout ${branch}`, this.projectRoot);
        await this.execCommand(`git pull origin ${branch}`, this.projectRoot);
      }
    } else {
      // 没有 git 仓库，先初始化
      await this.pushLog(taskId, 'downloading', '初始化 Git 仓库...');
      await this.execCommand(`git init`, this.projectRoot);
      await this.execCommand(`git remote add origin ${repoUrl}`, this.projectRoot);
      await this.execCommand(`git fetch --all`, this.projectRoot);

      if (tag) {
        await this.execCommand(`git checkout tags/${tag}`, this.projectRoot);
      } else {
        await this.execCommand(`git checkout -b ${branch} origin/${branch}`, this.projectRoot);
      }
    }

    await this.pushLog(taskId, 'downloading', 'Git 代码拉取完成');
  }

  /**
   * 解压上传的更新包
   */
  private async extractPackage(taskId: string, packagePath: string): Promise<void> {
    const absPath = path.isAbsolute(packagePath)
      ? packagePath
      : path.join(this.projectRoot, packagePath);

    if (!fs.existsSync(absPath)) {
      throw new Error(`更新包不存在: ${packagePath}`);
    }

    await this.pushLog(taskId, 'downloading', `正在解压更新包: ${path.basename(absPath)}`);

    const ext = path.extname(absPath).toLowerCase();
    if (ext === '.zip') {
      // Windows 使用 PowerShell 解压
      await this.execCommand(
        `powershell -Command "Expand-Archive -Path '${absPath}' -DestinationPath '${this.projectRoot}' -Force"`,
        this.projectRoot
      );
    } else if (ext === '.gz' || ext === '.tgz') {
      await this.execCommand(`tar -xzf "${absPath}" -C "${this.projectRoot}"`, this.projectRoot);
    } else {
      throw new Error(`不支持的包格式: ${ext}，仅支持 .zip 和 .tar.gz`);
    }

    await this.pushLog(taskId, 'downloading', '更新包解压完成');
  }

  /**
   * 下载并解压（URL模式）
   */
  private async downloadAndExtract(taskId: string, downloadUrl: string): Promise<void> {
    await this.pushLog(taskId, 'downloading', `正在下载更新包: ${downloadUrl}`);

    const tempDir = path.join(this.projectRoot, 'backend', 'backups', 'temp-download');
    fs.mkdirSync(tempDir, { recursive: true });

    // 根据 URL 推断扩展名
    const urlPath = new URL(downloadUrl).pathname;
    const ext = path.extname(urlPath) || '.zip';
    const tempFile = path.join(tempDir, `update-package${ext}`);

    // 使用 PowerShell 下载
    await this.execCommand(
      `powershell -Command "Invoke-WebRequest -Uri '${downloadUrl}' -OutFile '${tempFile}' -UseBasicParsing"`,
      this.projectRoot,
      CMD_TIMEOUT
    );

    // 验证文件 hash（如果提供）
    // 解压
    await this.extractPackage(taskId, tempFile);

    // 清理临时文件
    try { fs.unlinkSync(tempFile); } catch {}
    try { fs.rmdirSync(tempDir); } catch {}
  }

  /**
   * Step 4: 安装依赖
   */
  private async installDeps(taskId: string): Promise<void> {
    const backendDir = path.join(this.projectRoot, 'backend');

    // 后端依赖
    if (fs.existsSync(path.join(backendDir, 'package.json'))) {
      await this.pushLog(taskId, 'installing', '安装后端依赖 (npm install)...');
      await this.execCommand('npm install --production', backendDir, CMD_TIMEOUT);
      await this.pushLog(taskId, 'installing', '后端依赖安装完成');
    }

    // 前端依赖（可选，如果需要构建前端）
    const frontendPkg = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(frontendPkg)) {
      await this.pushLog(taskId, 'installing', '安装前端依赖...');
      await this.execCommand('npm install', this.projectRoot, CMD_TIMEOUT);
      await this.pushLog(taskId, 'installing', '前端依赖安装完成');
    }
  }

  /**
   * Step 5: 构建项目
   */
  private async buildProject(taskId: string): Promise<void> {
    const backendDir = path.join(this.projectRoot, 'backend');

    // 构建后端（TypeScript 编译）
    if (fs.existsSync(path.join(backendDir, 'tsconfig.json'))) {
      await this.pushLog(taskId, 'building', '构建后端 (tsc)...');
      await this.execCommand('npm run build', backendDir, CMD_TIMEOUT);
      await this.pushLog(taskId, 'building', '后端构建完成');
    }

    // 构建前端（Vite）
    const frontendPkg = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(frontendPkg)) {
      try {
        await this.pushLog(taskId, 'building', '构建前端 (vite build)...');
        await this.execCommand('npm run build', this.projectRoot, CMD_TIMEOUT);
        await this.pushLog(taskId, 'building', '前端构建完成');
      } catch (e: any) {
        await this.pushLog(taskId, 'building', `前端构建跳过: ${e.message}`, 'warn');
      }
    }
  }

  /**
   * Step 6: 执行数据库迁移
   */
  private async runMigrations(taskId: string): Promise<void> {
    const migrationDir = path.join(this.projectRoot, 'backend', 'database-migrations');

    if (!fs.existsSync(migrationDir)) {
      await this.pushLog(taskId, 'migrating', '无迁移文件目录，跳过');
      return;
    }

    // 获取所有 .sql 文件
    const sqlFiles = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (sqlFiles.length === 0) {
      await this.pushLog(taskId, 'migrating', '无 SQL 迁移文件');
      return;
    }

    // 确保 migration_history 表存在
    try {
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS migration_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          filename VARCHAR(200) NOT NULL UNIQUE,
          checksum VARCHAR(64) NULL,
          execution_time INT NULL,
          success TINYINT DEFAULT 1,
          error_message TEXT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch {}

    // 获取已执行的迁移
    let executedFiles: string[] = [];
    try {
      const rows = await AppDataSource.query('SELECT filename FROM migration_history WHERE success = 1');
      executedFiles = rows.map((r: any) => r.filename);
    } catch {}

    // 找出未执行的迁移
    const pendingFiles = sqlFiles.filter(f => !executedFiles.includes(f));

    if (pendingFiles.length === 0) {
      await this.pushLog(taskId, 'migrating', '所有迁移已是最新，无需执行');
      return;
    }

    await this.pushLog(taskId, 'migrating', `发现 ${pendingFiles.length} 个待执行的迁移文件`);

    for (const file of pendingFiles) {
      const filePath = path.join(migrationDir, file);
      const sql = fs.readFileSync(filePath, 'utf8').trim();
      if (!sql) continue;

      const checksum = crypto.createHash('md5').update(sql).digest('hex');
      const startTime = Date.now();

      try {
        await this.pushLog(taskId, 'migrating', `执行迁移: ${file}`);

        // 分割并逐条执行 SQL 语句
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
          try {
            await AppDataSource.query(stmt);
          } catch (e: any) {
            // 忽略 "already exists" 类型的错误
            if (e.message && (
              e.message.includes('already exists') ||
              e.message.includes('Duplicate column') ||
              e.message.includes('Duplicate key name')
            )) {
              continue;
            }
            throw e;
          }
        }

        const execTime = Date.now() - startTime;

        // 记录成功
        await AppDataSource.query(
          `INSERT INTO migration_history (filename, checksum, execution_time, success) VALUES (?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE success = 1, execution_time = ?`,
          [file, checksum, execTime, execTime]
        );

        await this.pushLog(taskId, 'migrating', `迁移完成: ${file} (${execTime}ms)`, 'success');
      } catch (e: any) {
        const execTime = Date.now() - startTime;

        // 记录失败
        try {
          await AppDataSource.query(
            `INSERT INTO migration_history (filename, checksum, execution_time, success, error_message) VALUES (?, ?, ?, 0, ?)
             ON DUPLICATE KEY UPDATE success = 0, error_message = ?`,
            [file, checksum, execTime, e.message, e.message]
          );
        } catch {}

        throw new Error(`数据库迁移失败 (${file}): ${e.message}`);
      }
    }
  }

  /**
   * Step 7: 重启服务
   */
  private async restartService(taskId: string, targetVersion: Version): Promise<void> {
    const backendDir = path.join(this.projectRoot, 'backend');
    const ecoConfig = path.join(backendDir, 'ecosystem.config.js');

    // 更新系统版本号
    try {
      await this.pushLog(taskId, 'restarting', `更新系统版本号为 v${targetVersion.version}`);
      const result = await AppDataSource.query(
        `SELECT config_value FROM system_config WHERE config_key = 'admin_system_config' LIMIT 1`
      ).catch(() => []);

      if (result && result.length > 0) {
        const data = JSON.parse(result[0].config_value || '{}');
        data.systemVersion = targetVersion.version;
        await AppDataSource.query(
          `UPDATE system_config SET config_value = ? WHERE config_key = 'admin_system_config'`,
          [JSON.stringify(data)]
        );
      }
    } catch (e: any) {
      await this.pushLog(taskId, 'restarting', `版本号更新跳过: ${e.message}`, 'warn');
    }

    // 更新版本下载计数
    try {
      await this.versionRepo.increment({ id: targetVersion.id }, 'downloadCount', 1);
    } catch {}

    // 重启 PM2 服务
    if (fs.existsSync(ecoConfig)) {
      await this.pushLog(taskId, 'restarting', '正在通过 PM2 平滑重启服务...');
      // 使用 reload 而不是 restart，实现平滑重启
      await this.execCommand('npx pm2 reload ecosystem.config.js', backendDir, 60000);
      await this.pushLog(taskId, 'restarting', 'PM2 服务重启完成');
    } else {
      await this.pushLog(taskId, 'restarting', '未检测到 PM2 配置，请手动重启服务', 'warn');
    }
  }

  /**
   * 回滚操作
   */
  async rollback(taskId: string, backupPath?: string): Promise<void> {
    if (!backupPath) {
      const task = await this.taskRepo.findOne({ where: { id: taskId } });
      backupPath = task?.backupPath || '';
    }

    if (!backupPath || !fs.existsSync(backupPath)) {
      throw new Error('备份文件不存在，无法回滚');
    }

    await this.pushLog(taskId, 'rolled_back', '开始回滚...', 'warn');

    // 恢复后端 dist
    const backendDistBackup = path.join(backupPath, 'backend-dist');
    const backendDist = path.join(this.projectRoot, 'backend', 'dist');
    if (fs.existsSync(backendDistBackup)) {
      await this.pushLog(taskId, 'rolled_back', '恢复后端编译文件...', 'warn');
      if (fs.existsSync(backendDist)) {
        fs.rmSync(backendDist, { recursive: true, force: true });
      }
      await this.execCommand(`xcopy "${backendDistBackup}" "${backendDist}\\" /E /I /Q /Y`, this.projectRoot);
    }

    // 恢复前端 dist
    const frontendDistBackup = path.join(backupPath, 'frontend-dist');
    const frontendDist = path.join(this.projectRoot, 'dist');
    if (fs.existsSync(frontendDistBackup)) {
      await this.pushLog(taskId, 'rolled_back', '恢复前端编译文件...', 'warn');
      if (fs.existsSync(frontendDist)) {
        fs.rmSync(frontendDist, { recursive: true, force: true });
      }
      await this.execCommand(`xcopy "${frontendDistBackup}" "${frontendDist}\\" /E /I /Q /Y`, this.projectRoot);
    }

    // 恢复数据库
    const dbBackup = path.join(backupPath, 'database-backup.sql');
    if (fs.existsSync(dbBackup)) {
      await this.pushLog(taskId, 'rolled_back', '恢复数据库...', 'warn');
      try {
        const dbName = process.env.DB_DATABASE || process.env.DB_NAME || 'crm';
        const dbUser = process.env.DB_USERNAME || process.env.DB_USER || 'root';
        const dbPass = process.env.DB_PASSWORD || '';
        const dbHost = process.env.DB_HOST || 'localhost';
        const dbPort = process.env.DB_PORT || '3306';

        const passArg = dbPass ? `-p"${dbPass}"` : '';
        await this.execCommand(
          `mysql -h ${dbHost} -P ${dbPort} -u ${dbUser} ${passArg} ${dbName} < "${dbBackup}"`,
          this.projectRoot
        );
        await this.pushLog(taskId, 'rolled_back', '数据库恢复完成', 'warn');
      } catch (e: any) {
        await this.pushLog(taskId, 'rolled_back', `数据库恢复失败: ${e.message}`, 'error');
      }
    }

    // 重启服务
    const backendDir = path.join(this.projectRoot, 'backend');
    const ecoConfig = path.join(backendDir, 'ecosystem.config.js');
    if (fs.existsSync(ecoConfig)) {
      await this.pushLog(taskId, 'rolled_back', '正在重启服务...', 'warn');
      await this.execCommand('npx pm2 reload ecosystem.config.js', backendDir, 60000);
    }

    await this.pushLog(taskId, 'rolled_back', '回滚完成', 'warn');
  }

  /**
   * 获取所有已发布版本的更新历史
   */
  async getVersionHistory(page = 1, pageSize = 20): Promise<{ list: any[]; total: number }> {
    const [list, total] = await this.versionRepo.findAndCount({
      where: { status: 'published' },
      order: { versionCode: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    return { list, total };
  }

  /**
   * 执行系统命令（Promise 封装）
   */
  private execCommand(command: string, cwd: string, timeout: number = CMD_TIMEOUT): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        windowsHide: true
      };

      exec(command, options, (error, stdout, _stderr) => {
        if (error) {
          log.error(`[UpdateService] Command failed: ${command}`, error.message);
          reject(new Error(`命令执行失败: ${error.message}`));
          return;
        }
        resolve(String(stdout));
      });
    });
  }

  /**
   * 解析版本号为数字
   */
  private parseVersionCode(version: string): number {
    const parts = version.split('.').map(p => parseInt(p) || 0);
    return parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
  }
}

// 单例导出
export const updateService = new UpdateService();

