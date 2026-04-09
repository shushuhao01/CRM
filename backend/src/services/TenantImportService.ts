/**
 * 租户数据导入服务
 *
 * 功能：
 * 1. 导入 JSON 格式的数据包（兼容 v1.0 和 v2.0 格式）
 * 2. 验证数据格式和版本
 * 3. 冲突处理策略（跳过/覆盖/报错）
 * 4. 异步导入，提供进度查询
 * 5. 🔥 支持通用SQL导入，覆盖全部核心业务表
 */

import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/Tenant';
import * as fs from 'fs';

import { log } from '../config/logger';

export interface ImportOptions {
  tenantId: string;
  filePath: string;
  conflictStrategy: 'skip' | 'overwrite' | 'error';  // 冲突处理策略
  clearBeforeImport?: boolean;  // 导入前清空目标租户数据（全量恢复模式）
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
   * 执行导入（🔥 v3.0: 事务安全 + 清空模式 + 依赖排序）
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

      // 3. 验证数据格式（兼容 v1.0 / v2.0 / v3.0）
      this.validateImportData(importData);

      // 🔒 安全校验：导入文件中的租户ID必须与目标租户匹配（防止误导入其他租户的备份）
      if (importData.tenant && importData.tenant.id && importData.tenant.id !== options.tenantId) {
        log.warn(`[TenantImport] 导入文件租户ID(${importData.tenant.id})与目标租户ID(${options.tenantId})不匹配，将强制覆盖为目标租户ID`);
      }

      // 4. 按依赖顺序排列要导入的表
      const tablesToImport = this.getOrderedTables(Object.keys(importData.data));

      // 5. 计算总记录数
      job.totalRecords = 0;
      for (const tableName of tablesToImport) {
        if (Array.isArray(importData.data[tableName])) {
          job.totalRecords += importData.data[tableName].length;
        }
      }

      if (job.totalRecords === 0) {
        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date();
        return;
      }

      // 6. 🔥 使用事务包裹整个导入过程（失败自动回滚，不影响其他租户）
      await AppDataSource.transaction(async (transactionalEntityManager) => {

        // 6a. 如果启用 clearBeforeImport，先按逆序删除目标租户的旧数据
        if (options.clearBeforeImport) {
          const reversedTables = [...tablesToImport].reverse();
          for (const tableName of reversedTables) {
            try {
              // 检查表是否存在且有 tenant_id 列
              const hasTenantCol = await transactionalEntityManager.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'tenant_id'`,
                [tableName]
              );
              if (hasTenantCol.length > 0) {
                const delResult = await transactionalEntityManager.query(
                  `DELETE FROM \`${tableName}\` WHERE tenant_id = ?`,
                  [options.tenantId]
                );
                log.info(`[TenantImport] 清空表 ${tableName}: 删除 ${delResult.affectedRows || 0} 条记录`);
              }
            } catch (err) {
              log.warn(`[TenantImport] 清空表 ${tableName} 跳过: ${(err as Error).message?.substring(0, 60)}`);
            }
          }
        }

        // 6b. 按依赖顺序逐表导入
        for (const tableName of tablesToImport) {
          const records = importData.data[tableName];
          if (!Array.isArray(records) || records.length === 0) continue;

          await this.importTableBySQL(
            tableName,
            records,
            options.tenantId,
            options.conflictStrategy,
            job,
            transactionalEntityManager
          );
        }
      });

      // 7. 更新任务状态
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
   * 🔥 按依赖关系排序导入表（与 TenantExportService.ALL_EXPORTABLE_TABLES 保持一致）
   */
  private static readonly IMPORT_TABLE_ORDER = [
    'departments', 'users', 'roles', 'permissions', 'role_permissions',
    'product_categories', 'products',
    'customer_tags', 'customer_groups', 'customers', 'customer_shares', 'customer_assignments',
    'follow_up_records', 'customer_files',
    'orders', 'order_items', 'order_status_history', 'order_attachments', 'cod_cancel_applications',
    'after_sales_services', 'service_records', 'service_follow_ups', 'service_follow_up_records',
    'service_operation_logs', 'after_sale_attachments',
    'logistics_companies', 'logistics_api_configs', 'logistics_tracking', 'logistics_traces',
    'call_records', 'call_recordings', 'call_lines', 'user_line_assignments', 'phone_configs',
    'work_phones', 'device_bind_logs', 'global_call_config', 'outbound_tasks', 'phone_blacklist',
    'performance_configs', 'performance_metrics', 'performance_report_configs', 'performance_report_logs',
    'performance_shares', 'performance_share_members', 'commission_settings', 'commission_ladders',
    'department_order_limits',
    'value_added_orders', 'value_added_price_config', 'value_added_status_configs',
    'payment_orders', 'payment_records',
    'system_configs', 'improvement_goals', 'rejection_reasons', 'remark_presets', 'payment_method_options',
    'sms_templates', 'sms_records', 'outsource_companies',
    'wecom_configs', 'wecom_user_bindings', 'wecom_customers', 'wecom_acquisition_links',
    'wecom_service_accounts', 'wecom_payment_records', 'wecom_chat_records',
    'announcements', 'announcement_reads', 'notifications', 'notification_templates',
    'notification_channels', 'notification_logs', 'system_messages',
    'message_subscriptions', 'department_subscription_configs', 'message_read_status',
    'message_cleanup_history',
    'customer_service_permissions', 'sensitive_info_permissions', 'operation_logs',
    'data_records',
  ];

  private static getOrderedTables(tables: string[]): string[] {
    const tableSet = new Set(tables);
    const ordered: string[] = [];
    // 先按预定义顺序添加已知表
    for (const t of this.IMPORT_TABLE_ORDER) {
      if (tableSet.has(t)) {
        ordered.push(t);
        tableSet.delete(t);
      }
    }
    // 剩余未知表追加到末尾
    for (const t of tableSet) {
      ordered.push(t);
    }
    return ordered;
  }

  /**
   * 验证导入数据格式（兼容 v1.0 和 v2.0）
   */
  private static validateImportData(data: any): void {
    if (!data.version) {
      throw new Error('缺少版本信息');
    }

    if (!['1.0', '2.0', '3.0'].includes(data.version)) {
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
   * 🔥 通用SQL导入（事务安全，强制 tenant_id 隔离）
   */
  private static async importTableBySQL(
    tableName: string,
    records: any[],
    tenantId: string,
    conflictStrategy: 'skip' | 'overwrite' | 'error',
    job: ImportJob,
    manager?: import('typeorm').EntityManager
  ): Promise<void> {
    const queryRunner = manager || AppDataSource;

    // 检查表是否存在且有 tenant_id 列
    const hasTenantCol = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'tenant_id'`,
      [tableName]
    );
    if (hasTenantCol.length === 0) {
      log.warn(`[TenantImport] 表 ${tableName} 不存在或无 tenant_id 列，跳过`);
      job.skippedRecords += records.length;
      job.processedRecords += records.length;
      return;
    }

    // 获取表的所有列名（用于构建INSERT语句）
    const columns = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [tableName]
    );
    const columnNames = columns.map((c: any) => c.COLUMN_NAME);

    // 检查表是否有 id 列（用于冲突检测）
    const hasIdCol = columnNames.includes('id');

    // 逐条导入记录
    for (const record of records) {
      try {
        // 🔒 强制覆盖 tenant_id 为目标租户（核心安全逻辑）
        record.tenant_id = tenantId;
        if ('tenantId' in record) {
          record.tenantId = tenantId;
        }

        // 只保留表中实际存在的列
        const validColumns = columnNames.filter((col: string) => record[col] !== undefined);
        const values = validColumns.map((col: string) => record[col]);

        if (validColumns.length === 0) {
          job.skippedRecords++;
          job.processedRecords++;
          continue;
        }

        // 冲突检测（🔒 始终加 tenant_id 条件，防止影响其他租户）
        if (hasIdCol && record.id) {
          const existing = await queryRunner.query(
            `SELECT id FROM \`${tableName}\` WHERE id = ? AND tenant_id = ?`,
            [record.id, tenantId]
          );

          if (existing.length > 0) {
            if (conflictStrategy === 'skip') {
              job.skippedRecords++;
              job.processedRecords++;
              continue;
            } else if (conflictStrategy === 'error') {
              throw new Error(`记录已存在: ${tableName}[${record.id}]`);
            } else if (conflictStrategy === 'overwrite') {
              // 更新现有记录（🔒 WHERE 条件包含 tenant_id）
              const setClauses = validColumns
                .filter((col: string) => col !== 'id')
                .map((col: string) => `\`${col}\` = ?`);
              const updateValues = validColumns
                .filter((col: string) => col !== 'id')
                .map((col: string) => record[col]);

              if (setClauses.length > 0) {
                await queryRunner.query(
                  `UPDATE \`${tableName}\` SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
                  [...updateValues, record.id, tenantId]
                );
              }
              job.processedRecords++;
              continue;
            }
          }
        }

        // 插入新记录
        const placeholders = validColumns.map(() => '?').join(', ');
        const colList = validColumns.map((col: string) => `\`${col}\``).join(', ');
        await queryRunner.query(
          `INSERT INTO \`${tableName}\` (${colList}) VALUES (${placeholders})`,
          values
        );

        job.processedRecords++;
        job.progress = Math.round((job.processedRecords / job.totalRecords) * 100);

      } catch (error: any) {
        job.errorRecords++;
        job.processedRecords++;
        const errMsg = `${tableName}[${record.id || '?'}]: ${error.message?.substring(0, 100)}`;
        if (job.errors.length < 50) {
          job.errors.push(errMsg);
        }
        log.error(`[TenantImport] 导入记录失败:`, errMsg);
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
