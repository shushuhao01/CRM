/**
 * 定时任务调度服务
 *
 * 使用node-cron管理定时任务
 */

import * as cron from 'node-cron';
import { licenseExpirationReminderService } from './LicenseExpirationReminderService';
import { paymentReminderService } from './PaymentReminderService';
import { dataCleanupService } from './DataCleanupService';
import { subscriptionService } from './SubscriptionService';
import { logisticsAutoSyncService } from './LogisticsAutoSyncService';
import { wecomSyncScheduler } from './WecomSyncScheduler';
import { onlineSeatService } from './OnlineSeatService';
import { capacityService } from './CapacityService';

import { log } from '../config/logger';
export class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * 启动所有定时任务
   */
  start(): void {
    log.info('[Scheduler] 启动定时任务调度器...');

    // 授权到期检查任务 - 每天早上9点执行
    this.scheduleTask(
      'license-expiration-check',
      '0 9 * * *', // 每天9:00
      async () => {
        await licenseExpirationReminderService.runFullCheck();
      },
      '授权到期检查'
    );

    // 支付提醒检查任务 - 每天早上10点执行
    this.scheduleTask(
      'payment-reminder-check',
      '0 10 * * *', // 每天10:00
      async () => {
        await paymentReminderService.runFullCheck();
      },
      '支付提醒检查'
    );

    // 数据清理任务 - 每月1日凌晨3点执行
    // 清理90天前的操作日志、系统日志和已读通知
    this.scheduleTask(
      'data-cleanup',
      '0 3 1 * *', // 每月1日 03:00
      async () => {
        await dataCleanupService.runFullCleanup();
      },
      '过期数据清理（操作日志/系统日志/已读通知）'
    );

    // 订阅自动扣款 - 每天凌晨1点执行
    this.scheduleTask(
      'subscription-auto-deduct',
      '0 1 * * *', // 每天 01:00
      async () => {
        await subscriptionService.runAutoDeduct();
      },
      '订阅自动扣款'
    );

    // 订阅扣款重试 - 每天下午2点执行
    // 宽限期策略：3次重试 + 7天宽限期
    this.scheduleTask(
      'subscription-deduct-retry',
      '0 14 * * *', // 每天 14:00
      async () => {
        await subscriptionService.runDeductRetry();
      },
      '订阅扣款重试（3次重试+7天宽限期）'
    );

    // 🔥 物流状态自动同步 - 每15分钟执行一次
    this.scheduleTask(
      'logistics-auto-sync',
      '*/15 * * * *', // 每15分钟
      async () => {
        await logisticsAutoSyncService.runAutoSync();
      },
      '物流状态自动同步（每15分钟）'
    );

    // 🔥 企微客户自动同步 - 每2小时执行一次
    this.scheduleTask(
      'wecom-customer-sync',
      '0 */2 * * *', // 每2小时
      async () => {
        await wecomSyncScheduler.runAutoSync();
      },
      '企微客户自动同步（每2小时）'
    );

    // 🔥 在线席位过期会话清理 - 每1分钟执行一次（配合2分钟活跃阈值）
    this.scheduleTask(
      'online-seat-cleanup',
      '* * * * *', // 每1分钟
      async () => {
        await onlineSeatService.cleanupExpiredSessions();
      },
      '在线席位过期会话清理（每1分钟）'
    );

    // 🔥 扩容到期回退 - 每小时检查一次
    this.scheduleTask(
      'capacity-expire-check',
      '0 * * * *', // 每小时整点
      async () => {
        const count = await capacityService.expireCapacityOrders();
        if (count > 0) log.info(`[Scheduler] 已回退 ${count} 个过期扩容订单`);
      },
      '扩容到期回退检查（每小时）'
    );

    // 如果是开发环境,可以设置更频繁的检查用于测试
    if (process.env.NODE_ENV !== 'production') {
      log.info('[Scheduler] 开发环境: 可以手动触发任务测试');
    }

    log.info(`[Scheduler] 已启动${this.tasks.size}个定时任务`);
  }

  /**
   * 停止所有定时任务
   */
  stop(): void {
    log.info('[Scheduler] 停止所有定时任务...');

    this.tasks.forEach((task, name) => {
      task.stop();
      log.info(`[Scheduler] 已停止任务: ${name}`);
    });

    this.tasks.clear();
    log.info('[Scheduler] 所有定时任务已停止');
  }

  /**
   * 调度一个任务
   */
  private scheduleTask(
    name: string,
    cronExpression: string,
    handler: () => Promise<void>,
    description?: string
  ): void {
    try {
      const task = cron.schedule(cronExpression, async () => {
        log.info(`[Scheduler] 执行任务: ${name}`);
        try {
          await handler();
        } catch (error) {
          log.error(`[Scheduler] 任务执行失败(${name}):`, error);
        }
      });

      this.tasks.set(name, task);
      log.info(`[Scheduler] 已调度任务: ${name} (${description || cronExpression})`);
    } catch (error) {
      log.error(`[Scheduler] 调度任务失败(${name}):`, error);
    }
  }

  /**
   * 手动触发任务(用于测试)
   */
  async triggerTask(name: string): Promise<boolean> {
    try {
      log.info(`[Scheduler] 手动触发任务: ${name}`);

      switch (name) {
        case 'license-expiration-check':
          await licenseExpirationReminderService.runFullCheck();
          return true;
        case 'payment-reminder-check':
          await paymentReminderService.runFullCheck();
          return true;
        case 'data-cleanup':
          await dataCleanupService.runFullCleanup();
          return true;
        case 'subscription-auto-deduct':
          await subscriptionService.runAutoDeduct();
          return true;
        case 'subscription-deduct-retry':
          await subscriptionService.runDeductRetry();
          return true;
        case 'logistics-auto-sync':
          await logisticsAutoSyncService.runAutoSync();
          return true;
        case 'wecom-customer-sync':
          await wecomSyncScheduler.runAutoSync();
          return true;
        case 'online-seat-cleanup':
          await onlineSeatService.cleanupExpiredSessions();
          return true;
        case 'capacity-expire-check':
          await capacityService.expireCapacityOrders();
          return true;
        default:
          log.error(`[Scheduler] 未知任务: ${name}`);
          return false;
      }
    } catch (error) {
      log.error(`[Scheduler] 手动触发任务失败(${name}):`, error);
      return false;
    }
  }

  /**
   * 获取所有任务状态
   */
  getTasksStatus(): Array<{ name: string; running: boolean }> {
    const status: Array<{ name: string; running: boolean }> = [];

    this.tasks.forEach((task, name) => {
      status.push({
        name,
        running: true // node-cron没有直接的状态查询,假设已调度的都在运行
      });
    });

    return status;
  }
}

export const schedulerService = new SchedulerService();
