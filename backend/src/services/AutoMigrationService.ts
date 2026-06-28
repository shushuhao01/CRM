/**
 * AutoMigrationService - 数据库自动迁移服务
 *
 * 核心原则：
 *   1. 只增不删：永远不删除表、列、索引
 *   2. 只建不改：永远不修改已有列的类型、约束
 *   3. 幂等执行：多次执行结果一致
 *   4. 完整记录：所有变更记录到 migration_history
 *   5. 可关闭：通过环境变量 AUTO_MIGRATION=false 可关闭
 *   6. 先备份：生产环境首次执行前自动备份当前结构
 *
 * 执行流程：
 *   1. 检查 AUTO_MIGRATION 环境变量
 *   2. 生产环境首次执行前自动备份结构
 *   3. 基于实体元数据自动创建缺失表（先建表保证SQL迁移文件的依赖表存在）
 *   4. 基于实体元数据自动补全缺失字段
 *   5. 执行 database-migrations/*.sql 迁移文件
 *   6. 基于实体元数据自动创建缺失索引
 *   7. 所有变更记录到 migration_history
 */

import { AppDataSource } from '../config/database';
import { log } from '../config/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { EntityMetadata } from 'typeorm';

export class AutoMigrationService {
  private static instance: AutoMigrationService | null = null;
  private migrationDir: string;
  private backupDir: string;
  private hasRun: boolean = false;

  private constructor() {
    this.migrationDir = path.resolve(process.cwd(), 'database-migrations');
    this.backupDir = path.resolve(process.cwd(), 'backups', 'schema-backups');
  }

  static getInstance(): AutoMigrationService {
    if (!this.instance) {
      this.instance = new AutoMigrationService();
    }
    return this.instance;
  }

  /**
   * 主入口：执行自动迁移
   */
  async run(): Promise<void> {
    // 检查环境变量开关
    const enabled = process.env.AUTO_MIGRATION;
    if (enabled === 'false' || enabled === '0' || enabled === 'no') {
      log.info('🔀 [自动迁移] AUTO_MIGRATION=false，跳过自动迁移');
      return;
    }

    if (this.hasRun) {
      log.info('🔀 [自动迁移] 已执行过，跳过');
      return;
    }

    const startTime = Date.now();
    const stats = { tables: 0, columns: 0, indexes: 0, sqlFiles: 0, errors: 0 };

    try {
      log.info('╔══════════════════════════════════════════════════╗');
      log.info('║       数据库自动迁移服务启动                      ║');
      log.info('╚══════════════════════════════════════════════════╝');

      // 1. 确保 migration_history 表存在
      await this.ensureMigrationHistoryTable();

      // 2. 生产环境首次执行前备份结构
      await this.backupSchemaIfNeeded();

      // 3. 基于实体自动创建缺失表（先建表，确保后续SQL迁移文件引用的表已存在）
      const tableResult = await this.autoCreateMissingTables();
      stats.tables = tableResult.created;

      // 4. 基于实体自动补全缺失字段
      const columnResult = await this.autoAddMissingColumns();
      stats.columns = columnResult.added;

      // 5. 执行 database-migrations/*.sql（表和字段已就位，SQL文件中的ALTER/UPDATE可正常执行）
      stats.sqlFiles = await this.runSqlMigrations();

      // 6. 基于实体自动创建缺失索引
      const indexResult = await this.autoCreateMissingIndexes();
      stats.indexes = indexResult.created;

      // 7. 记录本次迁移完成
      await this.recordAutoMigrationRun(stats);

      this.hasRun = true;

      const elapsed = Date.now() - startTime;
      log.info('╔══════════════════════════════════════════════════╗');
      log.info(`║  自动迁移完成 (${elapsed}ms)                           ║`);
      log.info(`║  新建表: ${stats.tables}  补字段: ${stats.columns}  建索引: ${stats.indexes}  SQL文件: ${stats.sqlFiles}  错误: ${stats.errors}  ║`);
      log.info('╚══════════════════════════════════════════════════╝');
    } catch (error) {
      log.error('❌ [自动迁移] 执行失败:', error);
      throw error;
    }
  }

  // ============================================================
  // 1. 确保 migration_history 表存在
  // ============================================================
  private async ensureMigrationHistoryTable(): Promise<void> {
    try {
      await AppDataSource.query(`
        CREATE TABLE IF NOT EXISTS \`migration_history\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`filename\` VARCHAR(200) NOT NULL UNIQUE COMMENT '迁移文件名或标识',
          \`checksum\` VARCHAR(64) NULL COMMENT '文件内容MD5校验和',
          \`execution_time\` INT NULL COMMENT '执行耗时(ms)',
          \`success\` TINYINT DEFAULT 1 COMMENT '是否成功: 0失败 1成功',
          \`error_message\` TEXT NULL COMMENT '错误信息',
          \`executed_at\` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库迁移历史记录'
      `);
    } catch (err) {
      log.warn('⚠️ [自动迁移] migration_history 表确保失败（可能已存在）:', (err as Error).message);
    }
  }

  // ============================================================
  // 2. 生产环境首次执行前备份结构
  // ============================================================
  private async backupSchemaIfNeeded(): Promise<void> {
    try {
      // 检查是否已经执行过自动迁移
      const rows = await AppDataSource.query(
        `SELECT COUNT(*) AS cnt FROM \`migration_history\` WHERE \`filename\` LIKE 'auto-migration-%'`
      ).catch(() => [{ cnt: 0 }]);

      if (rows[0]?.cnt > 0) {
        log.info('ℹ️ [自动迁移] 之前已执行过，跳过结构备份');
        return;
      }

      // 首次执行，备份当前结构
      log.info('📦 [自动迁移] 首次执行，开始备份当前数据库结构...');

      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `schema-${timestamp}.sql`);
      const dbName = process.env.DB_DATABASE || 'crm';

      // 导出所有表的 DDL 结构（不导出数据）
      const tables = await AppDataSource.query(
        `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`
      );

      let ddlContent = `-- 数据库结构备份\n-- 时间: ${new Date().toISOString()}\n-- 数据库: ${dbName}\n-- 表数量: ${tables.length}\n\n`;

      for (const row of tables) {
        const tableName = row.TABLE_NAME;
        try {
          const createRows = await AppDataSource.query(`SHOW CREATE TABLE \`${tableName}\``);
          if (createRows[0]?.['Create Table']) {
            ddlContent += `-- 表: ${tableName}\n`;
            ddlContent += createRows[0]['Create Table'] + ';\n\n';
          }
        } catch {
          // 某些表可能无法获取DDL，跳过
        }
      }

      fs.writeFileSync(backupFile, ddlContent, 'utf8');
      log.info(`✅ [自动迁移] 结构备份完成: ${backupFile} (${tables.length} 张表)`);
    } catch (error) {
      log.warn('⚠️ [自动迁移] 结构备份失败（不阻塞迁移）:', (error as Error).message);
    }
  }

  // ============================================================
  // 5. 执行 database-migrations/*.sql 迁移文件（在建表补字段之后执行）
  // ============================================================
  private async runSqlMigrations(): Promise<number> {
    if (!fs.existsSync(this.migrationDir)) {
      log.info('ℹ️ [自动迁移] 无 database-migrations 目录，跳过SQL文件迁移');
      return 0;
    }

    const sqlFiles = fs.readdirSync(this.migrationDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (sqlFiles.length === 0) {
      log.info('ℹ️ [自动迁移] 无SQL迁移文件');
      return 0;
    }

    // 获取已执行的文件
    let executedFiles: string[] = [];
    try {
      const rows = await AppDataSource.query(
        'SELECT filename FROM migration_history WHERE success = 1 AND filename NOT LIKE "auto-migration-%"'
      );
      executedFiles = rows.map((r: any) => r.filename);
    } catch {
      // 表不存在或其他错误，全部执行
    }

    const pendingFiles = sqlFiles.filter(f => !executedFiles.includes(f));

    if (pendingFiles.length === 0) {
      log.info('ℹ️ [自动迁移] 所有SQL迁移文件已是最新');
      return 0;
    }

    log.info(`📋 [自动迁移] 发现 ${pendingFiles.length} 个待执行的SQL迁移文件`);

    let executedCount = 0;

    for (const file of pendingFiles) {
      const filePath = path.join(this.migrationDir, file);
      const sql = fs.readFileSync(filePath, 'utf8').trim();
      if (!sql) continue;

      const checksum = crypto.createHash('md5').update(sql).digest('hex');
      const startTime = Date.now();
      let success = true;
      let errorMsg: string | null = null;

      try {
        log.info(`  📄 执行SQL迁移: ${file}`);

        // 分割并逐条执行 SQL 语句
        const statements = this.splitSqlStatements(sql);

        for (const stmt of statements) {
          try {
            await AppDataSource.query(stmt);
          } catch (e: any) {
            // 忽略 "already exists" 类型的错误（幂等）
            if (e.message && (
              e.message.includes('already exists') ||
              e.message.includes('Duplicate column') ||
              e.message.includes('Duplicate key name') ||
              e.message.includes('Duplicate entry')
            )) {
              continue;
            }
            throw e;
          }
        }

        const execTime = Date.now() - startTime;
        executedCount++;

        await AppDataSource.query(
          `INSERT INTO migration_history (filename, checksum, execution_time, success) VALUES (?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE success = 1, execution_time = ?, error_message = NULL`,
          [file, checksum, execTime, execTime]
        );

        log.info(`  ✅ 迁移完成: ${file} (${execTime}ms)`);
      } catch (e: any) {
        success = false;
        errorMsg = e.message;
        const execTime = Date.now() - startTime;

        log.error(`  ❌ 迁移失败: ${file} - ${e.message}`);

        await AppDataSource.query(
          `INSERT INTO migration_history (filename, checksum, execution_time, success, error_message) VALUES (?, ?, ?, 0, ?)
           ON DUPLICATE KEY UPDATE success = 0, execution_time = ?, error_message = ?`,
          [file, checksum, execTime, errorMsg, execTime, errorMsg]
        ).catch(() => {});
      }
    }

    return executedCount;
  }

  // ============================================================
  // 3. 基于实体元数据自动创建缺失表
  // ============================================================
  private async autoCreateMissingTables(): Promise<{ created: number }> {
    const entities = AppDataSource.entityMetadatas;
    let created = 0;

    log.info(`🔍 [自动迁移] 扫描 ${entities.length} 个实体，检查缺失表...`);

    for (const entity of entities) {
      const tableName = entity.tableName;
      if (!tableName) continue;

      try {
        const exists = await this.tableExists(tableName);
        if (!exists) {
          const createSql = this.generateCreateTableSql(entity);
          if (createSql) {
            await AppDataSource.query(createSql);
            created++;
            log.info(`  📦 新建表: ${tableName}`);
            await this.recordAutoMigrationDetail(`auto-create-table-${tableName}`, `CREATE TABLE ${tableName}`);
          }
        }
      } catch (error) {
        log.warn(`  ⚠️ 创建表 ${tableName} 失败:`, (error as Error).message);
      }
    }

    if (created > 0) {
      log.info(`✅ [自动迁移] 新建了 ${created} 张表`);
    }

    return { created };
  }

  // ============================================================
  // 4. 基于实体元数据自动补全缺失字段
  // ============================================================
  private async autoAddMissingColumns(): Promise<{ added: number }> {
    const entities = AppDataSource.entityMetadatas;
    let added = 0;

    for (const entity of entities) {
      const tableName = entity.tableName;
      if (!tableName) continue;

      try {
        // 确保表存在
        const tableExists = await this.tableExists(tableName);
        if (!tableExists) continue;

        // 获取数据库现有列
        const dbColumns = await this.getTableColumns(tableName);
        const dbColumnSet = new Set(dbColumns);

        // 遍历实体定义的列
        for (const column of entity.columns) {
          const columnName = column.databaseName;
          if (!columnName) continue;

          // 数据库中已存在该列，跳过（只建不改）
          if (dbColumnSet.has(columnName)) continue;

          // 生成 ALTER TABLE ADD COLUMN 语句
          const addSql = this.generateAddColumnSql(tableName, column);
          if (addSql) {
            try {
              await AppDataSource.query(addSql);
              added++;
              log.info(`  ➕ 补字段: ${tableName}.${columnName}`);
              await this.recordAutoMigrationDetail(
                `auto-add-column-${tableName}-${columnName}`,
                `ALTER TABLE ${tableName} ADD COLUMN ${columnName}`
              );
            } catch (err) {
              // 可能被其他路由级迁移抢先创建了，忽略
              if ((err as Error).message?.includes('Duplicate column')) {
                continue;
              }
              log.warn(`  ⚠️ 补字段 ${tableName}.${columnName} 失败:`, (err as Error).message);
            }
          }
        }
      } catch (error) {
        log.warn(`  ⚠️ 检查表 ${tableName} 列失败:`, (error as Error).message);
      }
    }

    if (added > 0) {
      log.info(`✅ [自动迁移] 补全了 ${added} 个字段`);
    }

    return { added };
  }

  // ============================================================
  // 6. 基于实体元数据自动创建缺失索引
  // ============================================================
  private async autoCreateMissingIndexes(): Promise<{ created: number }> {
    const entities = AppDataSource.entityMetadatas;
    let created = 0;

    for (const entity of entities) {
      const tableName = entity.tableName;
      if (!tableName) continue;

      try {
        const tableExists = await this.tableExists(tableName);
        if (!tableExists) continue;

        // 获取数据库现有索引名
        const dbIndexes = await this.getTableIndexes(tableName);
        const dbIndexSet = new Set(dbIndexes);

        // 遍历实体定义的索引
        for (const index of entity.indices) {
          const indexName = index.name;
          if (!indexName) continue;

          // PRIMARY 索引跳过
          if (indexName === 'PRIMARY' || indexName === 'PRIMARY_KEY') continue;

          // 数据库中已存在该索引，跳过
          if (dbIndexSet.has(indexName)) continue;

          // 确保索引引用的列都存在
          const indexColumns = index.columns.map(c => c.databaseName).filter(Boolean);
          if (indexColumns.length === 0) continue;

          // 生成 CREATE INDEX 语句
          const unique = index.isUnique ? 'UNIQUE ' : '';
          const columnList = indexColumns.map(c => `\`${c}\``).join(', ');
          const createIndexSql = `CREATE ${unique}INDEX \`${indexName}\` ON \`${tableName}\` (${columnList})`;

          try {
            await AppDataSource.query(createIndexSql);
            created++;
            log.info(`  🔑 建索引: ${tableName}.${indexName}`);
            await this.recordAutoMigrationDetail(
              `auto-create-index-${tableName}-${indexName}`,
              `CREATE INDEX ${indexName} ON ${tableName}`
            );
          } catch (err) {
            if ((err as Error).message?.includes('Duplicate key name') ||
                (err as Error).message?.includes('already exists')) {
              continue;
            }
            log.warn(`  ⚠️ 建索引 ${tableName}.${indexName} 失败:`, (err as Error).message);
          }
        }
      } catch (error) {
        log.warn(`  ⚠️ 检查表 ${tableName} 索引失败:`, (error as Error).message);
      }
    }

    if (created > 0) {
      log.info(`✅ [自动迁移] 新建了 ${created} 个索引`);
    }

    return { created };
  }

  // ============================================================
  // SQL 生成方法
  // ============================================================

  /**
   * 根据实体元数据生成 CREATE TABLE 语句
   */
  private generateCreateTableSql(entity: EntityMetadata): string | null {
    const tableName = entity.tableName;
    if (!tableName) return null;

    const columnDefs: string[] = [];
    const primaryKeys: string[] = [];

    for (const column of entity.columns) {
      const columnName = column.databaseName;
      if (!columnName) continue;

      const columnDef = this.generateColumnDef(column);
      columnDefs.push(`  \`${columnName}\` ${columnDef}`);

      if (column.isPrimary) {
        primaryKeys.push(`\`${columnName}\``);
      }
    }

    // 添加主键
    if (primaryKeys.length > 0) {
      columnDefs.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
    }

    // 添加实体级索引
    for (const index of entity.indices) {
      const indexName = index.name;
      if (!indexName || indexName === 'PRIMARY') continue;

      const indexColumns = index.columns.map(c => `\`${c.databaseName}\``).filter(Boolean);
      if (indexColumns.length === 0) continue;

      const unique = index.isUnique ? 'UNIQUE ' : '';
      columnDefs.push(`  ${unique}INDEX \`${indexName}\` (${indexColumns.join(', ')})`);
    }

    if (columnDefs.length === 0) return null;

    return `CREATE TABLE IF NOT EXISTS \`${tableName}\` (\n${columnDefs.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
  }

  /**
   * 生成列定义字符串
   */
  private generateColumnDef(column: any): string {
    const parts: string[] = [];
    const dataType = this.mapColumnType(column);
    parts.push(dataType);

    // NOT NULL
    if (!column.isNullable && !column.isPrimary) {
      parts.push('NOT NULL');
    } else if (column.isNullable) {
      parts.push('NULL');
    }

    // AUTO_INCREMENT
    if (column.isGenerated && column.generationStrategy === 'increment') {
      parts.push('AUTO_INCREMENT');
    }

    // DEFAULT
    if (column.default !== undefined && column.default !== null) {
      const defVal = this.formatDefaultValue(column.default, column.type);
      if (defVal !== null) {
        parts.push(`DEFAULT ${defVal}`);
      }
    }

    // COMMENT
    if (column.comment) {
      parts.push(`COMMENT '${column.comment.replace(/'/g, "\\'")}'`);
    }

    return parts.join(' ');
  }

  /**
   * 生成 ALTER TABLE ADD COLUMN 语句
   */
  private generateAddColumnSql(tableName: string, column: any): string | null {
    const columnName = column.databaseName;
    if (!columnName) return null;

    const columnDef = this.generateColumnDef(column);
    return `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDef}`;
  }

  /**
   * TypeORM 类型映射到 MySQL 类型
   */
  private mapColumnType(column: any): string {
    const type = column.type;
    const normalizedType = typeof type === 'string' ? type.toLowerCase() : String(type).toLowerCase();

    switch (normalizedType) {
      case 'varchar':
      case 'string':
        return `VARCHAR(${column.length || 255})`;

      case 'text':
        return 'TEXT';

      case 'longtext':
        return 'LONGTEXT';

      case 'mediumtext':
        return 'MEDIUMTEXT';

      case 'tinytext':
        return 'TINYTEXT';

      case 'int':
      case 'integer':
        return 'INT';

      case 'smallint':
        return 'SMALLINT';

      case 'tinyint':
        return 'TINYINT';

      case 'bigint':
        return 'BIGINT';

      case 'decimal':
        return `DECIMAL(${column.precision || 10}, ${column.scale || 2})`;

      case 'float':
        return 'FLOAT';

      case 'double':
        return 'DOUBLE';

      case 'boolean':
      case 'bool':
        return 'TINYINT(1)';

      case 'date':
        return 'DATE';

      case 'datetime':
        return 'DATETIME';

      case 'timestamp':
        return 'TIMESTAMP';

      case 'time':
        return 'TIME';

      case 'json':
        return 'JSON';

      case 'enum':
        const enumValues = column.enum || [];
        const enumStr = enumValues.map((v: string) => `'${v}'`).join(',');
        return `ENUM(${enumStr})`;

      case 'uuid':
        return `VARCHAR(36)`;

      case 'simple-array':
        return 'TEXT';

      case 'simple-json':
        return 'TEXT';

      case 'blob':
      case 'bytea':
        return 'BLOB';

      default:
        // 未知类型，默认用 TEXT
        if (typeof type === 'function') {
          // 类型是构造函数，尝试推断
          const typeName = type.name.toLowerCase();
          if (typeName.includes('date')) return 'DATETIME';
          if (typeName.includes('string')) return `VARCHAR(${column.length || 255})`;
          if (typeName.includes('number')) return 'INT';
          if (typeName.includes('boolean')) return 'TINYINT(1)';
        }
        return `VARCHAR(${column.length || 255})`;
    }
  }

  /**
   * 格式化默认值
   */
  private formatDefaultValue(defaultValue: any, columnType: any): string | null {
    if (defaultValue === undefined || defaultValue === null) return null;

    const type = typeof columnType === 'string' ? columnType.toLowerCase() : String(columnType).toLowerCase();

    // 函数类型的默认值（如 () => "now()"）
    if (typeof defaultValue === 'function') {
      const result = defaultValue();
      if (typeof result === 'string') return result;
      return `'${String(result)}'`;
    }

    // 字符串类型
    if (typeof defaultValue === 'string') {
      // 特殊函数
      if (defaultValue.toLowerCase() === 'current_timestamp' ||
          defaultValue.toLowerCase() === 'now()') {
        return 'CURRENT_TIMESTAMP';
      }
      // 字符串值
      return `'${defaultValue.replace(/'/g, "\\'")}'`;
    }

    // 布尔类型
    if (typeof defaultValue === 'boolean') {
      return defaultValue ? '1' : '0';
    }

    // 数字类型
    if (typeof defaultValue === 'number') {
      return String(defaultValue);
    }

    return `'${String(defaultValue).replace(/'/g, "\\'")}'`;
  }

  // ============================================================
  // SQL 语句分割
  // ============================================================
  private splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    let delimiter = ';';

    // 逐字符扫描，支持 DELIMITER 指令动态切换分隔符
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];

      // 在引号中：直接加入，不检测分隔符或注释
      if (inSingleQuote || inDoubleQuote || inBacktick) {
        if (char === "'" && !inDoubleQuote && !inBacktick) {
          inSingleQuote = !inSingleQuote;
        } else if (char === '"' && !inSingleQuote && !inBacktick) {
          inDoubleQuote = !inDoubleQuote;
        } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
          inBacktick = !inBacktick;
        }
        current += char;
        continue;
      }

      // 检测 DELIMITER 指令（行首，不在引号中）
      // 找到当前行的剩余部分
      if (char === 'D' || char === 'd') {
        // 获取从当前位置到行尾的内容
        let lineEnd = sql.indexOf('\n', i);
        if (lineEnd === -1) lineEnd = sql.length;
        const line = sql.substring(i, lineEnd).trim();

        if (line.toUpperCase().startsWith('DELIMITER ')) {
          // 提取新分隔符
          delimiter = line.substring('DELIMITER '.length).trim();
          // 跳过整行
          i = lineEnd;
          continue;
        }
      }

      // 检测行注释 --（不在引号中）
      if (char === '-' && sql[i + 1] === '-') {
        // 跳到行尾
        while (i < sql.length && sql[i] !== '\n') {
          i++;
        }
        if (i < sql.length) {
          current += sql[i]; // 加入换行符
        }
        continue;
      }

      // 检测块注释 /* */（不在引号中）
      if (char === '/' && sql[i + 1] === '*') {
        current += '/*';
        i += 2;
        while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) {
          current += sql[i];
          i++;
        }
        if (i < sql.length) {
          current += '*/';
          i++; // 跳过 '/'
        }
        continue;
      }

      // 引号状态切换
      if (char === "'") {
        inSingleQuote = true;
      } else if (char === '"') {
        inDoubleQuote = true;
      } else if (char === '`') {
        inBacktick = true;
      }

      // 检测分隔符（不在引号中）
      const delimLen = delimiter.length;
      if (sql.substring(i, i + delimLen) === delimiter) {
        const trimmed = current.trim();
        if (trimmed) {
          statements.push(trimmed);
        }
        current = '';
        i += delimLen - 1;
        continue;
      }

      current += char;
    }

    // 最后一条语句
    const trimmed = current.trim();
    if (trimmed) {
      statements.push(trimmed);
    }

    return statements;
  }

  // ============================================================
  // 记录方法
  // ============================================================

  private async recordAutoMigrationRun(stats: { tables: number; columns: number; indexes: number; sqlFiles: number; errors: number }): Promise<void> {
    try {
      const filename = `auto-migration-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      const summary = `新建表:${stats.tables}, 补字段:${stats.columns}, 建索引:${stats.indexes}, SQL文件:${stats.sqlFiles}`;

      await AppDataSource.query(
        `INSERT INTO migration_history (filename, checksum, execution_time, success, error_message) VALUES (?, ?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE success = 1, error_message = ?`,
        [filename, crypto.createHash('md5').update(summary).digest('hex'), 0, summary, summary]
      );
    } catch {
      // 不阻塞
    }
  }

  private async recordAutoMigrationDetail(filename: string, description: string): Promise<void> {
    try {
      await AppDataSource.query(
        `INSERT IGNORE INTO migration_history (filename, checksum, execution_time, success, error_message) VALUES (?, ?, 0, 1, ?)`,
        [filename, crypto.createHash('md5').update(description).digest('hex'), description]
      );
    } catch {
      // 不阻塞
    }
  }

  // ============================================================
  // 数据库查询辅助方法
  // ============================================================

  private async tableExists(tableName: string): Promise<boolean> {
    const rows = await AppDataSource.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    );
    return rows[0]?.cnt > 0;
  }

  private async getTableColumns(tableName: string): Promise<string[]> {
    const rows = await AppDataSource.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [tableName]
    );
    return rows.map((r: any) => r.COLUMN_NAME);
  }

  private async getTableIndexes(tableName: string): Promise<string[]> {
    const rows = await AppDataSource.query(
      `SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    );
    return rows.map((r: any) => r.INDEX_NAME);
  }
}

// 导出单例实例
export const autoMigrationService = AutoMigrationService.getInstance();
