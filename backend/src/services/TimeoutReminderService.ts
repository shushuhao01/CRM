/**
 * 超时提醒服务
 *
 * 负责检测订单审核、发货、售后处理的超时情况并自动发送提醒
 *
 * 功能：
 * 1. 订单审核超时提醒（默认24小时）
 * 2. 订单发货超时提醒（默认48小时）
 * 3. 售后处理超时提醒（默认48小时）
 *
 * 创建日期：2025-12-19
 */

import { getDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { AfterSalesService } from '../entities/AfterSalesService';
import { SystemMessage } from '../entities/SystemMessage';
import { User } from '../entities/User';
import { SystemConfig } from '../entities/SystemConfig';
import { v4 as uuidv4 } from 'uuid';
import { LessThan, In } from 'typeorm';

// 超时消息类型
export const TimeoutMessageTypes = {
  ORDER_AUDIT_TIMEOUT: 'order_audit_timeout',           // 订单审核超时
  ORDER_SHIPMENT_TIMEOUT: 'order_shipment_timeout',     // 发货超时
  AFTER_SALES_TIMEOUT: 'after_sales_timeout',           // 售后处理超时
  ORDER_FOLLOWUP_REMINDER: 'order_followup_reminder',   // 订单跟进提醒
  CUSTOMER_FOLLOWUP_REMINDER: 'customer_followup_reminder', // 客户跟进提醒
};

// 默认超时配置（小时）
const DEFAULT_TIMEOUT_CONFIG = {
  orderAuditTimeout: 24,      // 订单审核超时：24小时
  orderShipmentTimeout: 48,   // 发货超时：48小时
  afterSalesTimeout: 48,      // 售后处理超时：48小时
  orderFollowupDays: 3,       // 订单签收后跟进提醒：3天
};

// 管理员角色列表
const ADMIN_ROLES = ['super_admin', 'admin', 'customer_service'];

// 超时记录缓存（避免重复发送）
const sentTimeoutReminders = new Map<string, number>();

// 清理过期的缓存记录（24小时后可以再次发送）
const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

class TimeoutReminderService {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * 启动超时检测服务
   */
  start(intervalMinutes: number = 30): void {
    if (this.isRunning) {
      console.log('[TimeoutReminder] ⚠️ 服务已在运行中');
      return;
    }

    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`[TimeoutReminder] 🚀 超时提醒服务已启动，检测间隔：${intervalMinutes}分钟`);

    // 立即执行一次检测
    this.runAllChecks();

    // 设置定时检测
    this.checkInterval = setInterval(() => {
      this.runAllChecks();
    }, intervalMs);
  }

  /**
   * 停止超时检测服务
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('[TimeoutReminder] 🛑 超时提醒服务已停止');
  }

  /**
   * 执行所有超时检测
   */
  async runAllChecks(): Promise<void> {
    console.log('[TimeoutReminder] 🔍 开始执行超时检测...');
    const startTime = Date.now();

    try {
      // 清理过期的提醒缓存
      this.cleanupReminderCache();

      // 获取超时配置
      const config = await this.getTimeoutConfig();

      // 并行执行所有检测
      const results = await Promise.allSettled([
        this.checkOrderAuditTimeout(config.orderAuditTimeout),
        this.checkOrderShipmentTimeout(config.orderShipmentTimeout),
        this.checkAfterSalesTimeout(config.afterSalesTimeout),
        this.checkOrderFollowupReminder(config.orderFollowupDays),
        this.checkCustomerFollowupReminder(),
      ]);

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const duration = Date.now() - startTime;

      console.log(`[TimeoutReminder] ✅ 超时检测完成，成功：${successCount}/5，耗时：${duration}ms`);
    } catch (error) {
      console.error('[TimeoutReminder] ❌ 超时检测失败:', error);
    }
  }

  /**
   * 获取超时配置
   */
  private async getTimeoutConfig(): Promise<typeof DEFAULT_TIMEOUT_CONFIG> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        return DEFAULT_TIMEOUT_CONFIG;
      }

      const configRepo = dataSource.getRepository(SystemConfig);

      // 尝试从数据库读取配置
      const configs = await configRepo.find({
        where: { configGroup: 'timeout_reminder' }
      });

      const result = { ...DEFAULT_TIMEOUT_CONFIG };

      configs.forEach(config => {
        const value = parseInt(config.configValue || '0', 10);
        if (value > 0) {
          switch (config.configKey) {
            case 'order_audit_timeout_hours':
              result.orderAuditTimeout = value;
              break;
            case 'order_shipment_timeout_hours':
              result.orderShipmentTimeout = value;
              break;
            case 'after_sales_timeout_hours':
              result.afterSalesTimeout = value;
              break;
            case 'order_followup_days':
              result.orderFollowupDays = value;
              break;
          }
        }
      });

      return result;
    } catch (error) {
      console.warn('[TimeoutReminder] 读取配置失败，使用默认配置:', error);
      return DEFAULT_TIMEOUT_CONFIG;
    }
  }

  /**
   * 清理过期的提醒缓存
   */
  private cleanupReminderCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    sentTimeoutReminders.forEach((timestamp, key) => {
      if (now - timestamp > REMINDER_COOLDOWN_MS) {
        sentTimeoutReminders.delete(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`[TimeoutReminder] 🧹 清理了 ${cleanedCount} 条过期的提醒缓存`);
    }
  }

  /**
   * 检查是否已发送过提醒（避免重复发送）
   * 🔥 修复：改为基于数据库的去重，避免服务重启后重复发送
   */
  private async hasRecentReminder(type: string, id: string): Promise<boolean> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        // 如果数据库不可用，使用内存缓存
        const key = `${type}:${id}`;
        const lastSent = sentTimeoutReminders.get(key);
        return !!(lastSent && Date.now() - lastSent < REMINDER_COOLDOWN_MS);
      }

      const messageRepo = dataSource.getRepository(SystemMessage);

      // 检查数据库中是否已有相同类型和关联ID的消息（24小时内）
      const recentMessage = await messageRepo
        .createQueryBuilder('msg')
        .where('msg.type = :type', { type })
        .andWhere('msg.relatedId = :relatedId', { relatedId: id })
        .andWhere('msg.createdAt > :since', { since: new Date(Date.now() - REMINDER_COOLDOWN_MS) })
        .getOne();

      if (recentMessage) {
        console.log(`[TimeoutReminder] ⏭️ 跳过重复提醒: ${type}:${id} (已在 ${recentMessage.createdAt} 发送过)`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[TimeoutReminder] 检查重复提醒失败:', error);
      // 出错时使用内存缓存
      const key = `${type}:${id}`;
      const lastSent = sentTimeoutReminders.get(key);
      return !!(lastSent && Date.now() - lastSent < REMINDER_COOLDOWN_MS);
    }
  }

  /**
   * 记录已发送的提醒
   */
  private markReminderSent(type: string, id: string): void {
    const key = `${type}:${id}`;
    sentTimeoutReminders.set(key, Date.now());
  }

  /**
   * 检测订单审核超时
   */
  async checkOrderAuditTimeout(timeoutHours: number): Promise<number> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        console.error('[TimeoutReminder] 数据库未连接');
        return 0;
      }

      const orderRepo = dataSource.getRepository(Order);
      const timeoutDate = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

      // 查找超时的待审核订单
      const timeoutOrders = await orderRepo.find({
        where: {
          status: In(['pending_audit', 'pending_transfer']),
          createdAt: LessThan(timeoutDate)
        },
        select: ['id', 'orderNumber', 'customerName', 'totalAmount', 'createdBy', 'createdByName', 'createdAt']
      });

      console.log(`[TimeoutReminder] 📋 发现 ${timeoutOrders.length} 个审核超时订单`);

      let sentCount = 0;
      for (const order of timeoutOrders) {
        // 检查是否已发送过提醒
        if (await this.hasRecentReminder(TimeoutMessageTypes.ORDER_AUDIT_TIMEOUT, order.id)) {
          continue;
        }

        const hours = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (60 * 60 * 1000));

        await this.sendOrderAuditTimeoutReminder(order, hours);
        this.markReminderSent(TimeoutMessageTypes.ORDER_AUDIT_TIMEOUT, order.id);
        sentCount++;
      }

      if (sentCount > 0) {
        console.log(`[TimeoutReminder] ✅ 发送了 ${sentCount} 条订单审核超时提醒`);
      }

      return sentCount;
    } catch (error) {
      console.error('[TimeoutReminder] ❌ 检测订单审核超时失败:', error);
      return 0;
    }
  }

  /**
   * 检测发货超时
   */
  async checkOrderShipmentTimeout(timeoutHours: number): Promise<number> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        return 0;
      }

      const orderRepo = dataSource.getRepository(Order);
      const timeoutDate = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

      // 查找超时的待发货订单（审核通过但未发货）
      const timeoutOrders = await orderRepo.find({
        where: {
          status: In(['confirmed', 'pending_shipment', 'paid']),
          updatedAt: LessThan(timeoutDate)
        },
        select: ['id', 'orderNumber', 'customerName', 'totalAmount', 'createdBy', 'createdByName', 'updatedAt']
      });

      console.log(`[TimeoutReminder] 📋 发现 ${timeoutOrders.length} 个发货超时订单`);

      let sentCount = 0;
      for (const order of timeoutOrders) {
        if (await this.hasRecentReminder(TimeoutMessageTypes.ORDER_SHIPMENT_TIMEOUT, order.id)) {
          continue;
        }

        const hours = Math.floor((Date.now() - new Date(order.updatedAt).getTime()) / (60 * 60 * 1000));

        await this.sendOrderShipmentTimeoutReminder(order, hours);
        this.markReminderSent(TimeoutMessageTypes.ORDER_SHIPMENT_TIMEOUT, order.id);
        sentCount++;
      }

      if (sentCount > 0) {
        console.log(`[TimeoutReminder] ✅ 发送了 ${sentCount} 条发货超时提醒`);
      }

      return sentCount;
    } catch (error) {
      console.error('[TimeoutReminder] ❌ 检测发货超时失败:', error);
      return 0;
    }
  }

  /**
   * 检测售后处理超时
   */
  async checkAfterSalesTimeout(timeoutHours: number): Promise<number> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        return 0;
      }

      const afterSalesRepo = dataSource.getRepository(AfterSalesService);
      const timeoutDate = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

      // 查找超时的待处理售后
      const timeoutServices = await afterSalesRepo.find({
        where: {
          status: In(['pending', 'processing']),
          createdAt: LessThan(timeoutDate)
        }
      });

      console.log(`[TimeoutReminder] 📋 发现 ${timeoutServices.length} 个售后处理超时`);

      let sentCount = 0;
      for (const service of timeoutServices) {
        if (await this.hasRecentReminder(TimeoutMessageTypes.AFTER_SALES_TIMEOUT, service.id)) {
          continue;
        }

        const hours = Math.floor((Date.now() - new Date(service.createdAt).getTime()) / (60 * 60 * 1000));

        await this.sendAfterSalesTimeoutReminder(service, hours);
        this.markReminderSent(TimeoutMessageTypes.AFTER_SALES_TIMEOUT, service.id);
        sentCount++;
      }

      if (sentCount > 0) {
        console.log(`[TimeoutReminder] ✅ 发送了 ${sentCount} 条售后超时提醒`);
      }

      return sentCount;
    } catch (error) {
      console.error('[TimeoutReminder] ❌ 检测售后超时失败:', error);
      return 0;
    }
  }

  /**
   * 检测订单签收后跟进提醒
   */
  async checkOrderFollowupReminder(followupDays: number): Promise<number> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        return 0;
      }

      const orderRepo = dataSource.getRepository(Order);
      const followupDate = new Date(Date.now() - followupDays * 24 * 60 * 60 * 1000);
      const maxDate = new Date(Date.now() - (followupDays + 1) * 24 * 60 * 60 * 1000);

      // 查找签收后需要跟进的订单（签收时间在指定天数前）
      const orders = await orderRepo
        .createQueryBuilder('order')
        .where('order.status = :status', { status: 'delivered' })
        .andWhere('order.delivered_at <= :followupDate', { followupDate })
        .andWhere('order.delivered_at > :maxDate', { maxDate })
        .select(['order.id', 'order.orderNumber', 'order.customerName', 'order.createdBy', 'order.deliveredAt'])
        .getMany();

      console.log(`[TimeoutReminder] 📋 发现 ${orders.length} 个需要跟进的订单`);

      let sentCount = 0;
      for (const order of orders) {
        if (await this.hasRecentReminder(TimeoutMessageTypes.ORDER_FOLLOWUP_REMINDER, order.id)) {
          continue;
        }

        await this.sendOrderFollowupReminder(order, followupDays);
        this.markReminderSent(TimeoutMessageTypes.ORDER_FOLLOWUP_REMINDER, order.id);
        sentCount++;
      }

      if (sentCount > 0) {
        console.log(`[TimeoutReminder] ✅ 发送了 ${sentCount} 条订单跟进提醒`);
      }

      return sentCount;
    } catch (error) {
      console.error('[TimeoutReminder] ❌ 检测订单跟进提醒失败:', error);
      return 0;
    }
  }

  // ==================== 发送提醒消息 ====================

  /**
   * 发送订单审核超时提醒
   */
  private async sendOrderAuditTimeoutReminder(order: any, hours: number): Promise<void> {
    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);

    const content = `⚠️ 订单 #${order.orderNumber}（客户：${order.customerName || '未知'}，金额：¥${(parseFloat(order.totalAmount) || 0).toFixed(2)}）审核已超时 ${hours} 小时，请尽快处理`;

    await this.sendBatchMessages(
      TimeoutMessageTypes.ORDER_AUDIT_TIMEOUT,
      '⏰ 订单审核超时提醒',
      content,
      adminUserIds,
      {
        priority: 'high',
        category: '超时提醒',
        relatedId: order.id,
        relatedType: 'order',
        actionUrl: '/order/audit'
      }
    );
  }

  /**
   * 发送发货超时提醒
   */
  private async sendOrderShipmentTimeoutReminder(order: any, hours: number): Promise<void> {
    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);
    const allTargets = new Set<string>(adminUserIds);

    // 也通知下单员
    if (order.createdBy) {
      allTargets.add(order.createdBy);
    }

    const content = `⚠️ 订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）已超过 ${hours} 小时未发货，请尽快安排发货`;

    await this.sendBatchMessages(
      TimeoutMessageTypes.ORDER_SHIPMENT_TIMEOUT,
      '⏰ 发货超时提醒',
      content,
      Array.from(allTargets),
      {
        priority: 'high',
        category: '超时提醒',
        relatedId: order.id,
        relatedType: 'order',
        actionUrl: '/logistics/shipping'
      }
    );
  }

  /**
   * 发送售后处理超时提醒
   */
  private async sendAfterSalesTimeoutReminder(service: AfterSalesService, hours: number): Promise<void> {
    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);
    const allTargets = new Set<string>(adminUserIds);

    // 通知处理人
    if (service.assignedToId) {
      allTargets.add(service.assignedToId);
    }

    const typeText = this.getAfterSalesTypeText(service.serviceType);
    const content = `⚠️ ${typeText}申请 #${service.serviceNumber}（客户：${service.customerName || '未知'}）已超时 ${hours} 小时未处理，请尽快处理`;

    await this.sendBatchMessages(
      TimeoutMessageTypes.AFTER_SALES_TIMEOUT,
      '⏰ 售后处理超时提醒',
      content,
      Array.from(allTargets),
      {
        priority: 'high',
        category: '超时提醒',
        relatedId: service.id,
        relatedType: 'afterSales',
        actionUrl: '/service/list'
      }
    );
  }

  /**
   * 发送订单跟进提醒
   */
  private async sendOrderFollowupReminder(order: any, days: number): Promise<void> {
    if (!order.createdBy) return;

    const content = `📞 订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）已签收 ${days} 天，请及时跟进客户满意度`;

    await this.sendMessage(
      TimeoutMessageTypes.ORDER_FOLLOWUP_REMINDER,
      '📞 订单跟进提醒',
      content,
      order.createdBy,
      {
        priority: 'normal',
        category: '跟进提醒',
        relatedId: order.id,
        relatedType: 'order',
        actionUrl: '/order/list'
      }
    );
  }

  /**
   * 检测客户跟进提醒（基于跟进记录的下次跟进时间）
   */
  async checkCustomerFollowupReminder(): Promise<number> {
    try {
      const dataSource = getDataSource();
      if (!dataSource || !dataSource.isInitialized) {
        console.log('[TimeoutReminder] ⚠️ 数据源未初始化，跳过客户跟进提醒检查');
        return 0;
      }

      // 查找到期的跟进记录（下次跟进时间在当前时间之前，且状态为待跟进）
      const now = new Date();
      const followupRecords = await dataSource.query(`
        SELECT
          id, call_id, customer_id, customer_name, content,
          next_follow_up_date,
          user_id, user_name,
          follow_up_type, priority
        FROM follow_up_records
        WHERE status = 'pending'
          AND next_follow_up_date IS NOT NULL
          AND next_follow_up_date <= ?
          AND next_follow_up_date > DATE_SUB(?, INTERVAL 1 DAY)
        ORDER BY next_follow_up_date ASC
      `, [now, now]);

      console.log(`[TimeoutReminder] 📋 发现 ${followupRecords.length} 个到期的客户跟进记录`);

      let sentCount = 0;
      for (const record of followupRecords) {
        // 🔥 修复：使用跟进记录ID作为去重标识，与发送消息时的relatedId保持一致
        const reminderKey = `followup_${record.id}`;
        if (await this.hasRecentReminder(TimeoutMessageTypes.CUSTOMER_FOLLOWUP_REMINDER, reminderKey)) {
          continue;
        }

        await this.sendCustomerFollowupReminder(record);
        this.markReminderSent(TimeoutMessageTypes.CUSTOMER_FOLLOWUP_REMINDER, reminderKey);
        sentCount++;
      }

      if (sentCount > 0) {
        console.log(`[TimeoutReminder] ✅ 发送了 ${sentCount} 条客户跟进提醒`);
      }

      return sentCount;
    } catch (error) {
      console.error('[TimeoutReminder] ❌ 检测客户跟进提醒失败:', error);
      return 0;
    }
  }

  /**
   * 发送客户跟进提醒
   */
  private async sendCustomerFollowupReminder(record: any): Promise<void> {
    if (!record.user_id) return;

    const followupTypeText: Record<string, string> = {
      'call': '电话跟进',
      'visit': '上门拜访',
      'email': '邮件跟进',
      'message': '短信跟进'
    };
    const typeText = followupTypeText[record.follow_up_type] || '跟进';

    const content = `📞 客户跟进提醒：${record.customer_name || '未知客户'} 需要进行${typeText}
跟进内容：${record.content || '无'}
计划时间：${new Date(record.next_follow_up_date).toLocaleString('zh-CN')}`;

    // 🔥 修复：使用跟进记录ID作为relatedId，确保去重逻辑正确
    await this.sendMessage(
      TimeoutMessageTypes.CUSTOMER_FOLLOWUP_REMINDER,
      '📞 客户跟进提醒',
      content,
      record.user_id,
      {
        priority: record.priority || 'normal',
        category: '跟进提醒',
        relatedId: `followup_${record.id}`,
        relatedType: 'followup',
        actionUrl: `/service-management/call?customerId=${record.customer_id}`
      }
    );
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取售后类型文本
   */
  private getAfterSalesTypeText(type?: string): string {
    const typeMap: Record<string, string> = {
      'return': '退货',
      'exchange': '换货',
      'repair': '维修',
      'refund': '退款',
      'complaint': '投诉',
      'inquiry': '咨询'
    };
    return typeMap[type || ''] || '售后';
  }

  /**
   * 获取指定角色的所有用户ID
   */
  private async getUserIdsByRoles(roles: string[]): Promise<string[]> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        return [];
      }

      const userRepo = dataSource.getRepository(User);
      const users = await userRepo.find({
        select: ['id', 'role', 'status']
      });

      return users
        .filter(u => roles.includes(u.role) && (u.status === 'active' || String(u.status) === '1'))
        .map(u => u.id);
    } catch (error) {
      console.error('[TimeoutReminder] 获取用户列表失败:', error);
      return [];
    }
  }

  /**
   * 发送单条消息
   */
  private async sendMessage(
    type: string,
    title: string,
    content: string,
    targetUserId: string,
    options?: {
      priority?: string;
      category?: string;
      relatedId?: string;
      relatedType?: string;
      actionUrl?: string;
    }
  ): Promise<boolean> {
    try {
      const dataSource = getDataSource();
      if (!dataSource || !targetUserId) {
        return false;
      }

      const messageRepo = dataSource.getRepository(SystemMessage);
      const message = messageRepo.create({
        id: uuidv4(),
        type,
        title,
        content,
        targetUserId,
        priority: options?.priority || 'normal',
        category: options?.category || '超时提醒',
        relatedId: options?.relatedId,
        relatedType: options?.relatedType,
        actionUrl: options?.actionUrl,
        isRead: 0
      });

      await messageRepo.save(message);

      // 🔥 通过WebSocket实时推送
      if (global.webSocketService) {
        global.webSocketService.pushSystemMessage({
          id: message.id,
          type: message.type,
          title: message.title,
          content: message.content,
          priority: message.priority as any,
          relatedId: message.relatedId,
          relatedType: message.relatedType,
          actionUrl: message.actionUrl
        }, { userId: parseInt(targetUserId) });
      }

      return true;
    } catch (error) {
      console.error('[TimeoutReminder] 发送消息失败:', error);
      return false;
    }
  }

  /**
   * 批量发送消息
   * 🔥 2025-12-29 修复：只创建一条消息记录，targetUserId存储逗号分隔的用户ID
   */
  private async sendBatchMessages(
    type: string,
    title: string,
    content: string,
    targetUserIds: string[],
    options?: {
      priority?: string;
      category?: string;
      relatedId?: string;
      relatedType?: string;
      actionUrl?: string;
    }
  ): Promise<number> {
    try {
      const dataSource = getDataSource();
      if (!dataSource || targetUserIds.length === 0) {
        return 0;
      }

      const messageRepo = dataSource.getRepository(SystemMessage);

      // 🔥 只创建一条消息，targetUserId 存储所有用户ID（逗号分隔）
      const messageId = uuidv4();
      const message = messageRepo.create({
        id: messageId,
        type,
        title,
        content,
        targetUserId: targetUserIds.join(','), // 多个用户ID用逗号分隔
        priority: options?.priority || 'normal',
        category: options?.category || '超时提醒',
        relatedId: options?.relatedId,
        relatedType: options?.relatedType,
        actionUrl: options?.actionUrl,
        isRead: 0
      });

      await messageRepo.save(message);
      console.log(`[TimeoutReminder] ✅ 创建1条消息，目标用户: ${targetUserIds.length}个`);

      // 🔥 通过WebSocket实时推送给所有目标用户
      if (global.webSocketService) {
        targetUserIds.forEach(userId => {
          global.webSocketService.pushSystemMessage({
            id: messageId,
            type: message.type,
            title: message.title,
            content: message.content,
            priority: message.priority as any,
            relatedId: message.relatedId,
            relatedType: message.relatedType,
            actionUrl: message.actionUrl
          }, { userId: parseInt(userId) });
        });
      }

      return 1; // 返回1表示创建了1条消息
    } catch (error) {
      console.error('[TimeoutReminder] 批量发送消息失败:', error);
      return 0;
    }
  }

  /**
   * 手动触发检测（供API调用）
   */
  async manualCheck(): Promise<{
    orderAuditTimeout: number;
    orderShipmentTimeout: number;
    afterSalesTimeout: number;
    orderFollowup: number;
    customerFollowup: number;
  }> {
    const config = await this.getTimeoutConfig();

    const [orderAuditTimeout, orderShipmentTimeout, afterSalesTimeout, orderFollowup, customerFollowup] = await Promise.all([
      this.checkOrderAuditTimeout(config.orderAuditTimeout),
      this.checkOrderShipmentTimeout(config.orderShipmentTimeout),
      this.checkAfterSalesTimeout(config.afterSalesTimeout),
      this.checkOrderFollowupReminder(config.orderFollowupDays),
      this.checkCustomerFollowupReminder(),
    ]);

    return {
      orderAuditTimeout,
      orderShipmentTimeout,
      afterSalesTimeout,
      orderFollowup,
      customerFollowup
    };
  }

  /**
   * 获取当前配置
   */
  async getCurrentConfig(): Promise<typeof DEFAULT_TIMEOUT_CONFIG> {
    return this.getTimeoutConfig();
  }
}

// 导出单例
export const timeoutReminderService = new TimeoutReminderService();
export default timeoutReminderService;
