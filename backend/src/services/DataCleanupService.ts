/**
 * 数据清理服务
 *
 * 功能：定期清理过期日志和已读通知，防止数据库无限增长
 *
 * 清理策略：
 *   - operation_logs: 清理90天前的操作日志
 *   - logs: 清理90天前的系统日志
 *   - notifications: 清理90天前已读的通知
 *
 * 日期：2026-03-30
 * 任务：第一阶段 任务1.6
 */

import { AppDataSource } from '../config/database';

import { log } from '../config/logger';
export class DataCleanupService {
  /**
   * 清理过期的操作日志（默认90天前）
   * operation_logs 表的时间列为 created_at (snake_case)
   */
  async cleanupOperationLogs(retentionDays: number = 90): Promise<number> {
    try {
      const result = await AppDataSource.query(
        `DELETE FROM operation_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [retentionDays]
      );
      const deletedCount = result.affectedRows || 0;
      if (deletedCount > 0) {
        log.info(`[DataCleanup] 已清理 ${deletedCount} 条过期操作日志（${retentionDays}天前）`);
      }
      return deletedCount;
    } catch (error) {
      log.error('[DataCleanup] 清理操作日志失败:', error);
      return 0;
    }
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
   * 清理已读的过期通知（默认90天前已读的通知）
   * notifications 表：schema 使用 is_read(boolean) + created_at(snake_case)
   * 兼容两种可能的列名（is_read / status）
   */
  async cleanupReadNotifications(retentionDays: number = 90): Promise<number> {
    try {
      // 优先使用 schema.sql 定义的列名 (is_read + created_at)
      let result;
      try {
        result = await AppDataSource.query(
          `DELETE FROM notifications WHERE is_read = 1 AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [retentionDays]
        );
      } catch {
        // 兼容实体定义的列名 (status + createdAt)
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
   * 执行全部清理任务
   */
  async runFullCleanup(): Promise<void> {
    log.info('[DataCleanup] 开始执行数据清理任务...');

    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '90');

    const operationLogsDeleted = await this.cleanupOperationLogs(retentionDays);
    const systemLogsDeleted = await this.cleanupSystemLogs(retentionDays);
    const notificationsDeleted = await this.cleanupReadNotifications(retentionDays);

    const totalDeleted = operationLogsDeleted + systemLogsDeleted + notificationsDeleted;

    if (totalDeleted > 0) {
      log.info(`[DataCleanup] 数据清理完成，共清理 ${totalDeleted} 条记录`);
      log.info(`  - 操作日志: ${operationLogsDeleted} 条`);
      log.info(`  - 系统日志: ${systemLogsDeleted} 条`);
      log.info(`  - 已读通知: ${notificationsDeleted} 条`);
    } else {
      log.info('[DataCleanup] 数据清理完成，暂无需要清理的过期数据');
    }
  }
}

export const dataCleanupService = new DataCleanupService();
