/**
 * 支付提醒服务
 *
 * 功能:
 * 1. 检测待支付订单
 * 2. 发送支付提醒通知
 * 3. 自动关闭超时订单
 */

import { AppDataSource } from '../config/database';
import { notificationTemplateService } from './NotificationTemplateService';
import { adminNotificationService } from './AdminNotificationService';

import { log } from '../config/logger';
export class PaymentReminderService {
  /**
   * 检查并发送待支付提醒
   */
  async checkAndSendReminders(): Promise<{
    success: boolean;
    checked: number;
    sent: number;
    failed: number;
  }> {
    try {
      log.info('[PaymentReminder] 开始检查待支付订单...');

      const result = {
        success: true,
        checked: 0,
        sent: 0,
        failed: 0
      };

      // 查询24小时前创建但未支付的订单
      const pendingOrders = await this.getPendingOrders();
      result.checked = pendingOrders.length;

      for (const order of pendingOrders) {
        const sent = await this.sendPaymentReminder(order);
        if (sent) {
          result.sent++;
        } else {
          result.failed++;
        }
      }

      log.info(`[PaymentReminder] 检查完成: 检查${result.checked}个, 发送${result.sent}个, 失败${result.failed}个`);

      return result;
    } catch (error: any) {
      log.error('[PaymentReminder] 检查失败:', error);
      return {
        success: false,
        checked: 0,
        sent: 0,
        failed: 0
      };
    }
  }

  /**
   * 查询待支付订单
   */
  private async getPendingOrders(): Promise<any[]> {
    try {
      // 查询24小时前创建的待支付订单
      const orders = await AppDataSource.query(`
        SELECT
          po.id,
          po.order_no,
          po.tenant_id,
          po.package_id,
          po.amount,
          po.status,
          po.created_at,
          t.name as tenant_name,
          t.email,
          t.phone,
          p.name as package_name
        FROM payment_orders po
        LEFT JOIN tenants t ON po.tenant_id = t.id
        LEFT JOIN packages p ON po.package_id = p.id
        WHERE po.status = 'pending'
          AND po.created_at BETWEEN DATE_SUB(NOW(), INTERVAL 25 HOUR) AND DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `);

      log.info(`[PaymentReminder] 发现${orders.length}个待支付订单`);

      return orders;
    } catch (error: any) {
      log.error('[PaymentReminder] 查询待支付订单失败:', error);
      return [];
    }
  }

  /**
   * 发送支付提醒通知
   */
  private async sendPaymentReminder(order: any): Promise<boolean> {
    try {
      // 检查今天是否已发送过提醒(防止重复发送)
      const today = new Date().toISOString().slice(0, 10);
      const logs = await AppDataSource.query(`
        SELECT id FROM notification_logs
        WHERE template_code = 'payment_pending'
          AND related_id = ?
          AND DATE(created_at) = ?
      `, [order.id, today]);

      if (logs.length > 0) {
        log.info(`[PaymentReminder] 订单${order.order_no}今天已发送过提醒,跳过`);
        return false;
      }

      // 计算订单创建时间
      const createTime = new Date(order.created_at).toLocaleString('zh-CN');

      // 发送通知
      await notificationTemplateService.sendByTemplate('payment_pending', {
        tenantName: order.tenant_name,
        orderNumber: order.order_no,
        packageName: order.package_name,
        amount: order.amount.toFixed(2),
        createTime: createTime
      }, {
        to: order.email || order.phone,
        priority: 'normal',
        relatedId: order.id,
        relatedType: 'payment_order'
      });

      log.info(`[PaymentReminder] 已发送支付提醒给订单${order.order_no}`);

      // 通知管理员：待支付提醒
      adminNotificationService.notify('payment_pending', {
        title: `待支付提醒：${order.order_no}`,
        content: `租户「${order.tenant_name || '未知'}」的订单 ${order.order_no}（金额 ¥${order.amount}）已超过24小时未支付`,
        relatedId: order.id,
        relatedType: 'payment_order',
        extraData: { orderNo: order.order_no, amount: order.amount, tenantName: order.tenant_name }
      }).catch(err => log.error('[PaymentReminder] 发送管理员通知失败:', err.message));

      return true;
    } catch (error: any) {
      log.error(`[PaymentReminder] 发送提醒失败(订单${order.order_no}):`, error);
      return false;
    }
  }

  /**
   * 检查并关闭超时订单
   */
  async checkAndCloseExpiredOrders(): Promise<{
    success: boolean;
    checked: number;
    closed: number;
  }> {
    try {
      log.info('[PaymentReminder] 开始检查超时订单...');

      // 查询48小时前创建的待支付订单
      const expiredOrders = await AppDataSource.query(`
        SELECT
          po.id,
          po.order_no,
          po.tenant_id,
          po.status,
          po.created_at
        FROM payment_orders po
        WHERE po.status = 'pending'
          AND po.created_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)
      `);

      log.info(`[PaymentReminder] 发现${expiredOrders.length}个超时订单`);

      let closed = 0;

      for (const order of expiredOrders) {
        // 更新订单状态为已关闭
        await AppDataSource.query(`
          UPDATE payment_orders
          SET status = 'closed',
              updated_at = NOW()
          WHERE id = ?
        `, [order.id]);

        closed++;
        log.info(`[PaymentReminder] 已关闭超时订单${order.order_no}`);
      }

      return {
        success: true,
        checked: expiredOrders.length,
        closed
      };
    } catch (error: any) {
      log.error('[PaymentReminder] 检查超时订单失败:', error);
      return {
        success: false,
        checked: 0,
        closed: 0
      };
    }
  }

  /**
   * 执行完整的检查流程
   */
  async runFullCheck(): Promise<void> {
    log.info('\n========================================');
    log.info('支付提醒检查任务开始');
    log.info('时间:', new Date().toLocaleString('zh-CN'));
    log.info('========================================\n');

    // 1. 检查并发送待支付提醒
    const reminderResult = await this.checkAndSendReminders();
    log.info('\n待支付提醒结果:', reminderResult);

    // 2. 检查并关闭超时订单
    const expiredResult = await this.checkAndCloseExpiredOrders();
    log.info('\n超时订单处理结果:', expiredResult);

    log.info('\n========================================');
    log.info('支付提醒检查任务完成');
    log.info('========================================\n');
  }
}

export const paymentReminderService = new PaymentReminderService();
