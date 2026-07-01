/**
 * 数据清理服务
 *
 * 功能：定期清理过期日志和已读通知，防止数据库无限增长
 *
 * 清理策略（配置来源优先级）：
 *   SAAS模式：admin_system_config JSON → opLogAutoCleanup / opLogRetentionDays → 遍历所有租户清理
 *   私有部署：system_configs 表 → oplog_auto_cleanup / oplog_retention_days → 单租户清理
 *   兜底：「系统管理→系统设置→日志设置」中的配置 + 环境变量 LOG_RETENTION_DAYS
 *
 * 日期：2026-03-30
 * 任务：第一阶段 任务1.6
 */

import { AppDataSource } from '../config/database';

import { log } from '../config/logger';

interface CleanupConfig {
  autoCleanup: boolean;
  retentionDays: number;
}

export class DataCleanupService {
  /**
   * 获取操作日志清理配置
   * 优先级：admin_system_config (SAAS) > system_configs/oplog (私有) > 环境变量
   */
  async getOperationLogCleanupConfig(): Promise<CleanupConfig> {
    try {
      // 1. 尝试从 admin_system_config 读取（SAAS 管理后台的日志清理配置）
      const adminConfig = await AppDataSource.query(
        `SELECT config_value FROM system_config WHERE config_key = 'admin_system_config' LIMIT 1`
      ).catch(() => []);
      if (adminConfig && adminConfig.length > 0) {
        const data = JSON.parse(adminConfig[0].config_value || '{}');
        return {
          autoCleanup: data.opLogAutoCleanup === true,
          retentionDays: parseInt(data.opLogRetentionDays) || 90,
        };
      }
    } catch { /* 管理后台配置不存在，继续往下 */ }

    try {
      // 2. 尝试从 system_configs 读取（私有部署 CRM 端日志设置）
      const localConfig = await AppDataSource.query(
        `SELECT configKey, configValue FROM system_configs WHERE configGroup = 'oplog' AND configKey IN ('oplog_auto_cleanup', 'oplog_retention_days')`
      ).catch(() => []);
      let autoCleanup = true;
      let retentionDays = 90;
      if (localConfig && localConfig.length > 0) {
        for (const row of localConfig) {
          if (row.configKey === 'oplog_auto_cleanup') autoCleanup = row.configValue === 'true';
          if (row.configKey === 'oplog_retention_days') retentionDays = parseInt(row.configValue) || 90;
        }
        return { autoCleanup, retentionDays };
      }
    } catch { /* system_configs 不存在，继续往下 */ }

    // 3. 兜底：环境变量
    return {
      autoCleanup: true,
      retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '90'),
    };
  }

  /**
   * 清理过期的操作日志
   * operation_logs / cod_operation_logs / service_operation_logs
   */
  async cleanupOperationLogs(retentionDays: number): Promise<number> {
    const tables = ['operation_logs', 'cod_operation_logs', 'service_operation_logs'];
    let totalDeleted = 0;
    for (const table of tables) {
      try {
        const result = await AppDataSource.query(
          `DELETE FROM \`${table}\` WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [retentionDays]
        );
        const deleted = result.affectedRows || 0;
        if (deleted > 0) {
          log.info(`[DataCleanup] 已清理 ${table}: ${deleted} 条（${retentionDays}天前）`);
        }
        totalDeleted += deleted;
      } catch {
        // 表可能不存在
      }
    }
    return totalDeleted;
  }

  /**
   * 清理过期的系统日志（默认90天前）
   * logs 表的时间列为 createdAt (camelCase)
   */
  async cleanupSystemLogs(retentionDays: number = 90): Promise<number> {
    try {
      const result = await AppDataSource.query(
        `DELETE FROM logs WHERE createdAt < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [retentionDays]
      );
      const deletedCount = result.affectedRows || 0;
      if (deletedCount > 0) {
        log.info(`[DataCleanup] 已清理 ${deletedCount} 条过期系统日志（${retentionDays}天前）`);
      }
      return deletedCount;
    } catch (error) {
      log.error('[DataCleanup] 清理系统日志失败:', error);
      return 0;
    }
  }

  /**
   * 清理已读的过期通知
   */
  async cleanupReadNotifications(retentionDays: number = 90): Promise<number> {
    try {
      let result;
      try {
        result = await AppDataSource.query(
          `DELETE FROM notifications WHERE is_read = 1 AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [retentionDays]
        );
      } catch {
        result = await AppDataSource.query(
          `DELETE FROM notifications WHERE status = 'read' AND createdAt < DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [retentionDays]
        );
      }
      const deletedCount = result.affectedRows || 0;
      if (deletedCount > 0) {
        log.info(`[DataCleanup] 已清理 ${deletedCount} 条过期已读通知（${retentionDays}天前）`);
      }
      return deletedCount;
    } catch (error) {
      log.error('[DataCleanup] 清理已读通知失败:', error);
      return 0;
    }
  }

  /**
   * 清理过期的性能/绩效操作日志
   */
  async cleanupPerformanceLogs(retentionDays: number): Promise<number> {
    const tables = ['performance_operation_logs'];
    let totalDeleted = 0;
    for (const table of tables) {
      try {
        const result = await AppDataSource.query(
          `DELETE FROM \`${table}\` WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [retentionDays]
        );
        const deleted = result.affectedRows || 0;
        if (deleted > 0) {
          log.info(`[DataCleanup] 已清理 ${table}: ${deleted} 条（${retentionDays}天前）`);
        }
        totalDeleted += deleted;
      } catch {
        // 表可能不存在
      }
    }
    return totalDeleted;
  }

  /**
   * 执行全部清理任务
   */
  async runFullCleanup(): Promise<void> {
    log.info('[DataCleanup] 开始执行数据清理任务...');

    // 获取清理配置（自动识别 SAAS / 私有部署）
    const config = await this.getOperationLogCleanupConfig();

    if (!config.autoCleanup) {
      log.info('[DataCleanup] 操作日志自动清理已禁用，跳过');
      return;
    }

    log.info(`[DataCleanup] 清理配置: 保留${config.retentionDays}天前的日志`);

    const operationLogsDeleted = await this.cleanupOperationLogs(config.retentionDays);
    const performanceLogsDeleted = await this.cleanupPerformanceLogs(config.retentionDays);
    const systemLogsDeleted = await this.cleanupSystemLogs(config.retentionDays);
    const notificationsDeleted = await this.cleanupReadNotifications(config.retentionDays);

    const totalDeleted = operationLogsDeleted + performanceLogsDeleted + systemLogsDeleted + notificationsDeleted;

    if (totalDeleted > 0) {
      log.info(`[DataCleanup] 数据清理完成，共清理 ${totalDeleted} 条记录`);
      log.info(`  - 业务操作日志: ${operationLogsDeleted} 条`);
      log.info(`  - 绩效操作日志: ${performanceLogsDeleted} 条`);
      log.info(`  - 系统日志: ${systemLogsDeleted} 条`);
      log.info(`  - 已读通知: ${notificationsDeleted} 条`);
    } else {
      log.info('[DataCleanup] 数据清理完成，暂无需要清理的过期数据');
    }
  }
}

export const dataCleanupService = new DataCleanupService();
