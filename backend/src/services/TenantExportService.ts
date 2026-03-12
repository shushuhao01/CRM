/**
 * 租户数据导出服务
 *
 * 功能：
 * 1. 导出指定租户的所有业务数据
 * 2. 支持选择导出范围（全部/部分数据）
 * 3. 异步导出，提供进度查询
 * 4. 生成 JSON 格式的数据包
 */

import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/Tenant';
import { Customer } from '../entities/Customer';
import { Order } from '../entities/Order';
import { Product } from '../entities/Product';
import * as fs from 'fs';
import * as path from 'path';

export interface ExportOptions {
  tenantId: string;
  tables?: string[];  // 要导出的表，不指定则导出全部
  startDate?: Date;   // 开始日期（增量导出）
  endDate?: Date;     // 结束日期
}

export interface ExportJob {
  id: string;
  tenantId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;  // 0-100
  totalRecords: number;
  processedRecords: number;
  filePath?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// 导出任务存储（实际应该用数据库）
const exportJobs = new Map<string, ExportJob>();

export class TenantExportService {
  /**
   * 创建导出任务
   */
  static async createExportJob(options: ExportOptions): Promise<ExportJob> {
    const jobId = `export_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const job: ExportJob = {
      id: jobId,
      tenantId: options.tenantId,
      status: 'pending',
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      createdAt: new Date()
    };

    exportJobs.set(jobId, job);

    // 异步执行导出
    this.executeExport(jobId, options).catch(error => {
      console.error(`导出任务失败 [${jobId}]:`, error);
      const failedJob = exportJobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.error = error.message;
      }
    });

    return job;
  }

  /**
   * 查询导出任务状态
   */
  static getExportJob(jobId: string): ExportJob | undefined {
    return exportJobs.get(jobId);
  }

  /**
   * 执行导出
   */
  private static async executeExport(jobId: string, options: ExportOptions): Promise<void> {
    const job = exportJobs.get(jobId);
    if (!job) throw new Error('导出任务不存在');

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

      // 2. 准备导出数据结构
      const exportData: any = {
        version: '1.0',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          code: tenant.code
        },
        exportTime: new Date().toISOString(),
        dataRange: {
          startDate: options.startDate?.toISOString(),
          endDate: options.endDate?.toISOString()
        },
        data: {}
      };

      // 3. 导出各个表的数据
      const tablesToExport = options.tables || ['customers', 'orders', 'products'];
      job.totalRecords = 0;
      job.processedRecords = 0;

      for (const table of tablesToExport) {
        const data = await this.exportTable(table, options);
        exportData.data[table] = data;
        job.processedRecords += data.length;
        job.progress = Math.round((job.processedRecords / job.totalRecords) * 100);
      }

      // 4. 保存到文件
      const exportDir = path.join(__dirname, '../../exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const fileName = `tenant_${options.tenantId}_${Date.now()}.json`;
      const filePath = path.join(exportDir, fileName);

      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

      // 5. 更新任务状态
      job.status = 'completed';
      job.progress = 100;
      job.filePath = filePath;
      job.completedAt = new Date();

      console.log(`✅ 导出任务完成 [${jobId}]: ${filePath}`);

    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      throw error;
    }
  }

  /**
   * 导出指定表的数据
   */
  private static async exportTable(tableName: string, options: ExportOptions): Promise<any[]> {
    const { tenantId, startDate, endDate } = options;

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
        console.warn(`未知的表名: ${tableName}`);
        return [];
    }

    repository = AppDataSource.getRepository(entityClass);

    // 构建查询条件
    const where: any = { tenantId };

    // 如果指定了日期范围，添加时间过滤
    // 注意：这里假设所有表都有 created_at 字段
    // 实际使用时需要根据具体表结构调整

    const data = await repository.find({ where });

    return data;
  }

  /**
   * 获取导出文件路径
   */
  static getExportFilePath(jobId: string): string | undefined {
    const job = exportJobs.get(jobId);
    return job?.filePath;
  }

  /**
   * 清理过期的导出任务
   */
  static cleanupExpiredJobs(maxAgeHours: number = 24): void {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const [jobId, job] of exportJobs.entries()) {
      const age = now.getTime() - job.createdAt.getTime();
      if (age > maxAge) {
        // 删除文件
        if (job.filePath && fs.existsSync(job.filePath)) {
          fs.unlinkSync(job.filePath);
        }
        // 删除任务记录
        exportJobs.delete(jobId);
        console.log(`🗑️  清理过期导出任务: ${jobId}`);
      }
    }
  }
}
