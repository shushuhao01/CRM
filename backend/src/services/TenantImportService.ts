/**
 * 租户数据导入服务
 *
 * 功能：
 * 1. 导入 JSON 格式的数据包
 * 2. 验证数据格式和版本
 * 3. 冲突处理策略（跳过/覆盖/报错）
 * 4. 异步导入，提供进度查询
 */

import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/Tenant';
import { Customer } from '../entities/Customer';
import { Order } from '../entities/Order';
import { Product } from '../entities/Product';
import * as fs from 'fs';

import { log } from '../config/logger';
export interface ImportOptions {
  tenantId: string;
  filePath: string;
  conflictStrategy: 'skip' | 'overwrite' | 'error';  // 冲突处理策略
}

export interface ImportJob {
  id: string;
  tenantId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;  // 0-100
  totalRecords: number;
  processedRecords: number;
  skippedRecords: number;
  errorRecords: number;
  errors: string[];
  createdAt: Date;
  completedAt?: Date;
}

// 导入任务存储（实际应该用数据库）
const importJobs = new Map<string, ImportJob>();

export class TenantImportService {
  /**
   * 创建导入任务
   */
  static async createImportJob(options: ImportOptions): Promise<ImportJob> {
    const jobId = `import_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const job: ImportJob = {
      id: jobId,
      tenantId: options.tenantId,
      status: 'pending',
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      errors: [],
      createdAt: new Date()
    };

    importJobs.set(jobId, job);

    // 异步执行导入
    this.executeImport(jobId, options).catch(error => {
      log.error(`导入任务失败 [${jobId}]:`, error);
      const failedJob = importJobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.errors.push(error.message);
      }
    });

    return job;
  }

  /**
   * 查询导入任务状态
   */
  static getImportJob(jobId: string): ImportJob | undefined {
    return importJobs.get(jobId);
  }

  /**
   * 执行导入
   */
  private static async executeImport(jobId: string, options: ImportOptions): Promise<void> {
    const job = importJobs.get(jobId);
    if (!job) throw new Error('导入任务不存在');

    try {
      job.status = 'processing';

      // 1. 验证租户存在
      const tenantRepo = AppDataSource.getRepository(Tenant);
      const tenant = await tenantRepo.findOne({
        where: { id: options.tenantId }
      });

      if (!tenant) {
        throw new Error('租户不存在');
      }

      // 2. 读取并验证导入文件
      if (!fs.existsSync(options.filePath)) {
        throw new Error('导入文件不存在');
      }

      const fileContent = fs.readFileSync(options.filePath, 'utf-8');
      const importData = JSON.parse(fileContent);

      // 3. 验证数据格式
      this.validateImportData(importData);

      // 4. 计算总记录数
      job.totalRecords = 0;
      for (const tableName in importData.data) {
        job.totalRecords += importData.data[tableName].length;
      }

      // 5. 导入各个表的数据
      for (const tableName in importData.data) {
        const records = importData.data[tableName];
        await this.importTable(
          tableName,
          records,
          options.tenantId,
          options.conflictStrategy,
          job
        );
      }

      // 6. 更新任务状态
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();

      log.info(`✅ 导入任务完成 [${jobId}]`);
      log.info(`  - 总记录数: ${job.totalRecords}`);
      log.info(`  - 已处理: ${job.processedRecords}`);
      log.info(`  - 已跳过: ${job.skippedRecords}`);
      log.info(`  - 错误: ${job.errorRecords}`);

    } catch (error: any) {
      job.status = 'failed';
      job.errors.push(error.message);
      throw error;
    }
  }

  /**
   * 验证导入数据格式
   */
  private static validateImportData(data: any): void {
    if (!data.version) {
      throw new Error('缺少版本信息');
    }

    if (data.version !== '1.0') {
      throw new Error(`不支持的数据版本: ${data.version}`);
    }

    if (!data.tenant || !data.tenant.id) {
      throw new Error('缺少租户信息');
    }

    if (!data.data || typeof data.data !== 'object') {
      throw new Error('数据格式错误');
    }
  }

  /**
   * 导入指定表的数据
   */
  private static async importTable(
    tableName: string,
    records: any[],
    tenantId: string,
    conflictStrategy: 'skip' | 'overwrite' | 'error',
    job: ImportJob
  ): Promise<void> {
    let repository: any;
    let entityClass: any;

    // 根据表名获取对应的 Repository
    switch (tableName) {
      case 'customers':
        entityClass = Customer;
        break;
      case 'orders':
        entityClass = Order;
        break;
      case 'products':
        entityClass = Product;
        break;
      default:
        log.warn(`未知的表名: ${tableName}`);
        return;
    }

    repository = AppDataSource.getRepository(entityClass);

    // 逐条导入记录
    for (const record of records) {
      try {
        // 确保 tenant_id 正确
        record.tenantId = tenantId;

        // 检查记录是否已存在
        const existing = await repository.findOne({
          where: { id: record.id, tenantId }
        });

        if (existing) {
          // 处理冲突
          if (conflictStrategy === 'skip') {
            job.skippedRecords++;
            job.processedRecords++;
            continue;
          } else if (conflictStrategy === 'error') {
            throw new Error(`记录已存在: ${record.id}`);
          } else if (conflictStrategy === 'overwrite') {
            // 更新现有记录
            await repository.update({ id: record.id, tenantId }, record);
          }
        } else {
          // 插入新记录
          await repository.save(record);
        }

        job.processedRecords++;
        job.progress = Math.round((job.processedRecords / job.totalRecords) * 100);

      } catch (error: any) {
        job.errorRecords++;
        job.errors.push(`${tableName}[${record.id}]: ${error.message}`);
        log.error(`导入记录失败 [${tableName}]:`, error);
      }
    }
  }

  /**
   * 清理过期的导入任务
   */
  static cleanupExpiredJobs(maxAgeHours: number = 24): void {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const [jobId, job] of importJobs.entries()) {
      const age = now.getTime() - job.createdAt.getTime();
      if (age > maxAge) {
        importJobs.delete(jobId);
        log.info(`🗑️  清理过期导入任务: ${jobId}`);
      }
    }
  }
}
