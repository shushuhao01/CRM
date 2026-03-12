/**
 * 定时任务调度服务
 *
 * 使用node-cron管理定时任务
 */

import * as cron from 'node-cron';
import { licenseExpirationReminderService } from './LicenseExpirationReminderService';
import { paymentReminderService } from './PaymentReminderService';

export class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * 启动所有定时任务
   */
  start(): void {
    console.log('[Scheduler] 启动定时任务调度器...');

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

    // 如果是开发环境,可以设置更频繁的检查用于测试
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Scheduler] 开发环境: 可以手动触发任务测试');
    }

    console.log(`[Scheduler] 已启动${this.tasks.size}个定时任务`);
  }

  /**
   * 停止所有定时任务
   */
  stop(): void {
    console.log('[Scheduler] 停止所有定时任务...');

    this.tasks.forEach((task, name) => {
      task.stop();
      console.log(`[Scheduler] 已停止任务: ${name}`);
    });

    this.tasks.clear();
    console.log('[Scheduler] 所有定时任务已停止');
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
        console.log(`[Scheduler] 执行任务: ${name}`);
        try {
          await handler();
        } catch (error) {
          console.error(`[Scheduler] 任务执行失败(${name}):`, error);
        }
      });

      this.tasks.set(name, task);
      console.log(`[Scheduler] 已调度任务: ${name} (${description || cronExpression})`);
    } catch (error) {
      console.error(`[Scheduler] 调度任务失败(${name}):`, error);
    }
  }

  /**
   * 手动触发任务(用于测试)
   */
  async triggerTask(name: string): Promise<boolean> {
    try {
      console.log(`[Scheduler] 手动触发任务: ${name}`);

      switch (name) {
        case 'license-expiration-check':
          await licenseExpirationReminderService.runFullCheck();
          return true;
        case 'payment-reminder-check':
          await paymentReminderService.runFullCheck();
          return true;
        default:
          console.error(`[Scheduler] 未知任务: ${name}`);
          return false;
      }
    } catch (error) {
      console.error(`[Scheduler] 手动触发任务失败(${name}):`, error);
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
