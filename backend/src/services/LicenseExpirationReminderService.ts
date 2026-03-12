/**
 * 授权到期提醒服务
 *
 * 功能:
 * 1. 检测即将到期的授权
 * 2. 发送到期提醒通知
 * 3. 支持多个提醒时间点(7天、3天、1天)
 */

import { AppDataSource } from '../config/database';
import { notificationTemplateService } from './NotificationTemplateService';

export class LicenseExpirationReminderService {
  /**
   * 检查并发送授权到期提醒
   */
  async checkAndSendReminders(): Promise<{
    success: boolean;
    checked: number;
    sent: number;
    failed: number;
  }> {
    try {
      console.log('[LicenseReminder] 开始检查授权到期情况...');

      const result = {
        success: true,
        checked: 0,
        sent: 0,
        failed: 0
      };

      // 检查7天、3天、1天后到期的授权
      const reminderDays = [7, 3, 1];

      for (const days of reminderDays) {
        const reminders = await this.checkExpiringLicenses(days);
        result.checked += reminders.length;

        for (const reminder of reminders) {
          const sent = await this.sendExpirationReminder(reminder, days);
          if (sent) {
            result.sent++;
          } else {
            result.failed++;
          }
        }
      }

      console.log(`[LicenseReminder] 检查完成: 检查${result.checked}个, 发送${result.sent}个, 失败${result.failed}个`);

      return result;
    } catch (error: any) {
      console.error('[LicenseReminder] 检查失败:', error);
      return {
        success: false,
        checked: 0,
        sent: 0,
        failed: 0
      };
    }
  }

  /**
   * 检查即将到期的授权
   */
  private async checkExpiringLicenses(days: number): Promise<any[]> {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().slice(0, 10);

      // 查询即将到期的租户
      const tenants = await AppDataSource.query(`
        SELECT
          t.id,
          t.name,
          t.code,
          t.phone,
          t.email,
          t.license_key,
          t.expire_date,
          t.status
        FROM tenants t
        WHERE t.status = 'active'
          AND DATE(t.expire_date) = ?
          AND t.license_status = 'active'
      `, [targetDateStr]);

      console.log(`[LicenseReminder] 发现${tenants.length}个租户将在${days}天后到期`);

      return tenants;
    } catch (error: any) {
      console.error(`[LicenseReminder] 查询${days}天后到期的授权失败:`, error);
      return [];
    }
  }

  /**
   * 发送到期提醒通知
   */
  private async sendExpirationReminder(tenant: any, remainDays: number): Promise<boolean> {
    try {
      // 检查今天是否已发送过提醒(防止重复发送)
      const today = new Date().toISOString().slice(0, 10);
      const logs = await AppDataSource.query(`
        SELECT id FROM notification_logs
        WHERE template_code = 'license_expire_soon'
          AND related_id = ?
          AND DATE(created_at) = ?
      `, [tenant.id, today]);

      if (logs.length > 0) {
        console.log(`[LicenseReminder] 租户${tenant.name}今天已发送过提醒,跳过`);
        return false;
      }

      // 发送通知
      await notificationTemplateService.sendByTemplate('license_expire_soon', {
        tenantName: tenant.name,
        licenseKey: tenant.license_key,
        expireDate: tenant.expire_date,
        remainDays: remainDays.toString()
      }, {
        to: tenant.email || tenant.phone,
        priority: 'high',
        relatedId: tenant.id,
        relatedType: 'tenant'
      });

      console.log(`[LicenseReminder] 已发送到期提醒给租户${tenant.name}(剩余${remainDays}天)`);
      return true;
    } catch (error: any) {
      console.error(`[LicenseReminder] 发送提醒失败(租户${tenant.name}):`, error);
      return false;
    }
  }

  /**
   * 检查并处理已到期的授权
   */
  async checkAndHandleExpiredLicenses(): Promise<{
    success: boolean;
    checked: number;
    expired: number;
    notified: number;
  }> {
    try {
      console.log('[LicenseReminder] 开始检查已到期的授权...');

      // 查询已到期但状态仍为active的租户
      const expiredTenants = await AppDataSource.query(`
        SELECT
          t.id,
          t.name,
          t.code,
          t.phone,
          t.email,
          t.license_key,
          t.expire_date,
          t.status
        FROM tenants t
        WHERE t.status = 'active'
          AND DATE(t.expire_date) < CURDATE()
          AND t.license_status = 'active'
      `);

      console.log(`[LicenseReminder] 发现${expiredTenants.length}个已到期的租户`);

      let notified = 0;

      for (const tenant of expiredTenants) {
        // 更新租户状态为已到期
        await AppDataSource.query(`
          UPDATE tenants
          SET status = 'expired',
              license_status = 'expired',
              updated_at = NOW()
          WHERE id = ?
        `, [tenant.id]);

        // 发送到期通知
        try {
          await notificationTemplateService.sendByTemplate('license_expired', {
            tenantName: tenant.name,
            licenseKey: tenant.license_key,
            expireDate: tenant.expire_date
          }, {
            to: tenant.email || tenant.phone,
            priority: 'urgent',
            relatedId: tenant.id,
            relatedType: 'tenant'
          });

          notified++;
          console.log(`[LicenseReminder] 已发送到期通知给租户${tenant.name}`);
        } catch (error) {
          console.error(`[LicenseReminder] 发送到期通知失败(租户${tenant.name}):`, error);
        }
      }

      return {
        success: true,
        checked: expiredTenants.length,
        expired: expiredTenants.length,
        notified
      };
    } catch (error: any) {
      console.error('[LicenseReminder] 检查已到期授权失败:', error);
      return {
        success: false,
        checked: 0,
        expired: 0,
        notified: 0
      };
    }
  }

  /**
   * 执行完整的检查流程
   */
  async runFullCheck(): Promise<void> {
    console.log('\n========================================');
    console.log('授权到期检查任务开始');
    console.log('时间:', new Date().toLocaleString('zh-CN'));
    console.log('========================================\n');

    // 1. 检查并发送即将到期提醒
    const reminderResult = await this.checkAndSendReminders();
    console.log('\n即将到期提醒结果:', reminderResult);

    // 2. 检查并处理已到期授权
    const expiredResult = await this.checkAndHandleExpiredLicenses();
    console.log('\n已到期授权处理结果:', expiredResult);

    console.log('\n========================================');
    console.log('授权到期检查任务完成');
    console.log('========================================\n');
  }
}

export const licenseExpirationReminderService = new LicenseExpirationReminderService();
