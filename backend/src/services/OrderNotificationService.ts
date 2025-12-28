/**
 * 订单消息通知服务
 *
 * 负责订单全生命周期的消息通知
 * 所有消息都存储到数据库，支持跨设备通知
 * 🔥 2025-12-15 更新：添加企业微信机器人推送功能
 *
 * 创建日期：2025-12-14
 */

import { getDataSource } from '../config/database';
import { SystemMessage } from '../entities/SystemMessage';
import { User } from '../entities/User';
import { NotificationChannel, NotificationLog } from '../entities/NotificationChannel';
import { v4 as uuidv4 } from 'uuid';

// 消息类型定义
export const OrderMessageTypes = {
  // 订单生命周期
  ORDER_CREATED: 'order_created',           // 订单创建
  ORDER_PENDING_AUDIT: 'order_pending_audit', // 待审核
  ORDER_AUDIT_APPROVED: 'order_audit_approved', // 审核通过
  ORDER_AUDIT_REJECTED: 'order_audit_rejected', // 审核拒绝
  ORDER_PENDING_SHIPMENT: 'order_pending_shipment', // 待发货
  ORDER_SHIPPED: 'order_shipped',           // 已发货
  ORDER_DELIVERED: 'order_delivered',       // 已签收
  ORDER_REJECTED: 'order_rejected',         // 拒收
  ORDER_CANCELLED: 'order_cancelled',       // 已取消

  // 物流异常
  ORDER_LOGISTICS_RETURNED: 'order_logistics_returned', // 物流退回
  ORDER_LOGISTICS_CANCELLED: 'order_logistics_cancelled', // 物流取消
  ORDER_PACKAGE_EXCEPTION: 'order_package_exception', // 包裹异常

  // 取消审核
  ORDER_CANCEL_REQUEST: 'order_cancel_request', // 取消申请
  ORDER_CANCEL_APPROVED: 'order_cancel_approved', // 取消审核通过
  ORDER_CANCEL_REJECTED: 'order_cancel_rejected', // 取消审核拒绝
};

// 售后消息类型
export const AfterSalesMessageTypes = {
  AFTER_SALES_CREATED: 'after_sales_created',     // 售后创建
  AFTER_SALES_ASSIGNED: 'after_sales_assigned',   // 售后分配
  AFTER_SALES_PROCESSING: 'after_sales_processing', // 处理中
  AFTER_SALES_COMPLETED: 'after_sales_completed',   // 已完成
  AFTER_SALES_REJECTED: 'after_sales_rejected',     // 已拒绝
  AFTER_SALES_CANCELLED: 'after_sales_cancelled',   // 已取消
};

// 管理员角色列表
const ADMIN_ROLES = ['super_admin', 'admin', 'customer_service'];

interface OrderInfo {
  id: string;
  orderNumber: string;
  customerName?: string;
  totalAmount?: number;
  createdBy?: string;
  createdByName?: string;
}

interface AfterSalesInfo {
  id: string;
  serviceNumber: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  serviceType?: string;
  createdBy?: string;
  createdByName?: string;
  assignedTo?: string;
  assignedToId?: string;
}

class OrderNotificationService {

  /**
   * 发送消息到数据库
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
      createdBy?: string;
    }
  ): Promise<boolean> {
    try {
      console.log(`[OrderNotification] 📨 准备发送系统消息: type=${type}, targetUserId=${targetUserId}`);

      if (!targetUserId) {
        console.warn('[OrderNotification] ⚠️ 目标用户ID为空，跳过发送');
        return false;
      }

      const dataSource = getDataSource();
      if (!dataSource) {
        console.error('[OrderNotification] ❌ 数据库未连接');
        return false;
      }

      const messageRepo = dataSource.getRepository(SystemMessage);

      const messageId = uuidv4();
      const message = messageRepo.create({
        id: messageId,
        type,
        title,
        content,
        targetUserId,
        priority: options?.priority || 'normal',
        category: options?.category || '订单通知',
        relatedId: options?.relatedId,
        relatedType: options?.relatedType || 'order',
        actionUrl: options?.actionUrl,
        createdBy: options?.createdBy,
        isRead: 0
      });

      await messageRepo.save(message);
      console.log(`[OrderNotification] ✅ 系统消息已保存: id=${messageId}, type=${type} -> ${targetUserId}`);

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
        console.log(`[OrderNotification] 🔌 WebSocket推送: ${title} -> 用户 ${targetUserId}`);
      }

      // 🔥 同时发送到企业微信机器人
      this.sendToWechatRobot(type, title, content).catch(err => {
        console.warn('[OrderNotification] 企业微信推送失败:', err.message);
      });

      return true;
    } catch (error) {
      console.error('[OrderNotification] ❌ 发送消息失败:', error);
      return false;
    }
  }

  /**
   * 🔥 发送消息到所有配置的通知渠道（企业微信、钉钉、邮箱、短信等）
   */
  private async sendToAllChannels(type: string, title: string, content: string): Promise<void> {
    try {
      console.log(`[OrderNotification] 🔔 开始发送到外部渠道: type=${type}, title=${title}`);

      const dataSource = getDataSource();
      if (!dataSource) {
        console.error('[OrderNotification] ❌ 数据库未连接，无法发送到外部渠道');
        return;
      }

      const channelRepo = dataSource.getRepository(NotificationChannel);

      // 查找所有启用的通知渠道
      const channels = await channelRepo.find({
        where: { isEnabled: 1 }
      });

      console.log(`[OrderNotification] 📋 找到 ${channels.length} 个启用的通知渠道`);

      if (channels.length === 0) {
        console.log('[OrderNotification] ⚠️ 未配置任何通知渠道');
        return;
      }

      // 并行发送到所有渠道
      const sendPromises = channels.map(channel => {
        console.log(`[OrderNotification] 📤 检查渠道: ${channel.name} (${channel.channelType}), messageTypes=${JSON.stringify(channel.messageTypes)}`);

        // 检查消息类型是否在配置的类型列表中
        // 🔥 修复：如果 messageTypes 为空或未配置，默认发送所有类型
        if (channel.messageTypes && Array.isArray(channel.messageTypes) && channel.messageTypes.length > 0) {
          if (!channel.messageTypes.includes(type) && !channel.messageTypes.includes('all')) {
            console.log(`[OrderNotification] ⏭️ 跳过渠道 ${channel.name}: 消息类型 ${type} 不在配置列表中 (配置: ${channel.messageTypes.join(', ')})`);
            return Promise.resolve();
          }
        } else {
          console.log(`[OrderNotification] 📤 渠道 ${channel.name} 未配置消息类型过滤，发送所有类型`);
        }

        console.log(`[OrderNotification] ✅ 准备发送到渠道: ${channel.name} (${channel.channelType})`);

        switch (channel.channelType) {
          case 'wechat_work':
            return this.sendToWechatWork(channel, type, title, content);
          case 'dingtalk':
            return this.sendToDingtalk(channel, type, title, content);
          case 'email':
            return this.sendToEmail(channel, type, title, content);
          case 'sms':
            return this.sendToSms(channel, type, title, content);
          case 'wechat_mp':
            return this.sendToWechatMP(channel, type, title, content);
          default:
            console.warn(`[OrderNotification] ⚠️ 不支持的渠道类型: ${channel.channelType}`);
            return Promise.resolve();
        }
      });

      const results = await Promise.allSettled(sendPromises);
      console.log(`[OrderNotification] 📊 外部渠道发送完成: ${results.filter(r => r.status === 'fulfilled').length}/${results.length} 成功`);
    } catch (error) {
      console.error('[OrderNotification] ❌ 发送到通知渠道失败:', error);
    }
  }

  /**
   * 🔥 发送到企业微信机器人
   */
  private async sendToWechatWork(channel: NotificationChannel, type: string, title: string, content: string): Promise<void> {
    const logRepo = getDataSource()?.getRepository(NotificationLog);
    const webhook = channel.config?.webhook;

    if (!webhook) {
      console.warn(`[OrderNotification] 企业微信渠道 ${channel.name} 未配置webhook`);
      return;
    }

    const messageBody = {
      msgtype: 'text',
      text: { content: `${title}\n\n${content}` }
    };

    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageBody)
      });

      const result = await response.json() as { errcode: number; errmsg: string };

      // 记录发送日志
      if (logRepo) {
        const log = logRepo.create({
          id: uuidv4(),
          channelId: channel.id,
          channelType: 'wechat_work',
          messageType: type,
          title,
          content,
          status: result.errcode === 0 ? 'success' : 'failed',
          response: JSON.stringify(result),
          errorMessage: result.errcode !== 0 ? result.errmsg : undefined,
          sentAt: new Date()
        });
        await logRepo.save(log);
      }

      if (result.errcode === 0) {
        console.log(`[OrderNotification] ✅ 企业微信推送成功: ${channel.name}`);
      } else {
        console.warn(`[OrderNotification] ⚠️ 企业微信推送失败: ${result.errmsg}`);
      }
    } catch (error: any) {
      console.error(`[OrderNotification] ❌ 企业微信请求失败:`, error.message);
    }
  }

  /**
   * 🔥 发送到钉钉机器人
   */
  private async sendToDingtalk(channel: NotificationChannel, type: string, title: string, content: string): Promise<void> {
    const logRepo = getDataSource()?.getRepository(NotificationLog);
    const webhook = channel.config?.webhook;
    const secret = channel.config?.secret;

    if (!webhook) {
      console.warn(`[OrderNotification] 钉钉渠道 ${channel.name} 未配置webhook`);
      return;
    }

    let url = webhook;

    // 如果配置了加签密钥，需要计算签名
    if (secret) {
      const crypto = await import('crypto');
      const timestamp = Date.now();
      const stringToSign = `${timestamp}\n${secret}`;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(stringToSign);
      const sign = encodeURIComponent(hmac.digest('base64'));
      url = `${webhook}&timestamp=${timestamp}&sign=${sign}`;
    }

    const messageBody = {
      msgtype: 'text',
      text: { content: `${title}\n\n${content}` }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageBody)
      });

      const result = await response.json() as { errcode: number; errmsg: string };

      if (logRepo) {
        const log = logRepo.create({
          id: uuidv4(),
          channelId: channel.id,
          channelType: 'dingtalk',
          messageType: type,
          title,
          content,
          status: result.errcode === 0 ? 'success' : 'failed',
          response: JSON.stringify(result),
          errorMessage: result.errcode !== 0 ? result.errmsg : undefined,
          sentAt: new Date()
        });
        await logRepo.save(log);
      }

      if (result.errcode === 0) {
        console.log(`[OrderNotification] ✅ 钉钉推送成功: ${channel.name}`);
      } else {
        console.warn(`[OrderNotification] ⚠️ 钉钉推送失败: ${result.errmsg}`);
      }
    } catch (error: any) {
      console.error(`[OrderNotification] ❌ 钉钉请求失败:`, error.message);
    }
  }

  /**
   * 🔥 发送邮件通知
   */
  private async sendToEmail(channel: NotificationChannel, type: string, title: string, content: string): Promise<void> {
    const logRepo = getDataSource()?.getRepository(NotificationLog);
    const { host, port, user, pass, from, to } = channel.config || {};

    if (!host || !user || !pass || !to) {
      console.warn(`[OrderNotification] 邮件渠道 ${channel.name} 配置不完整`);
      return;
    }

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host,
        port: port || 465,
        secure: true,
        auth: { user, pass }
      });

      const mailOptions = {
        from: from || user,
        to,
        subject: title,
        text: content,
        html: `<h3>${title}</h3><p>${content.replace(/\n/g, '<br>')}</p>`
      };

      const result = await transporter.sendMail(mailOptions);

      if (logRepo) {
        const log = logRepo.create({
          id: uuidv4(),
          channelId: channel.id,
          channelType: 'email',
          messageType: type,
          title,
          content,
          status: 'success',
          response: JSON.stringify(result),
          sentAt: new Date()
        });
        await logRepo.save(log);
      }

      console.log(`[OrderNotification] ✅ 邮件发送成功: ${channel.name}`);
    } catch (error: any) {
      console.error(`[OrderNotification] ❌ 邮件发送失败:`, error.message);

      if (logRepo) {
        const log = logRepo.create({
          id: uuidv4(),
          channelId: channel.id,
          channelType: 'email',
          messageType: type,
          title,
          content,
          status: 'failed',
          errorMessage: error.message,
          sentAt: new Date()
        });
        await logRepo.save(log);
      }
    }
  }

  /**
   * 🔥 发送短信通知（需要配置短信服务商API）
   */
  private async sendToSms(channel: NotificationChannel, type: string, title: string, content: string): Promise<void> {
    const logRepo = getDataSource()?.getRepository(NotificationLog);
    const { apiUrl, apiKey, phones, templateId } = channel.config || {};

    if (!apiUrl || !apiKey || !phones) {
      console.warn(`[OrderNotification] 短信渠道 ${channel.name} 配置不完整`);
      return;
    }

    try {
      // 通用短信API调用（根据实际短信服务商调整）
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          phones: Array.isArray(phones) ? phones : [phones],
          templateId,
          params: { title, content: content.substring(0, 70) } // 短信内容限制
        })
      });

      const result = await response.json();

      if (logRepo) {
        const log = logRepo.create({
          id: uuidv4(),
          channelId: channel.id,
          channelType: 'sms',
          messageType: type,
          title,
          content: content.substring(0, 70),
          status: response.ok ? 'success' : 'failed',
          response: JSON.stringify(result),
          sentAt: new Date()
        });
        await logRepo.save(log);
      }

      console.log(`[OrderNotification] ✅ 短信发送成功: ${channel.name}`);
    } catch (error: any) {
      console.error(`[OrderNotification] ❌ 短信发送失败:`, error.message);
    }
  }

  /**
   * 🔥 发送微信公众号模板消息
   */
  private async sendToWechatMP(channel: NotificationChannel, type: string, title: string, content: string): Promise<void> {
    const logRepo = getDataSource()?.getRepository(NotificationLog);
    const { appId, appSecret, templateId, openIds } = channel.config || {};

    if (!appId || !appSecret || !templateId || !openIds) {
      console.warn(`[OrderNotification] 微信公众号渠道 ${channel.name} 配置不完整`);
      return;
    }

    try {
      // 获取access_token
      const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json() as { access_token?: string; errcode?: number };

      if (!tokenData.access_token) {
        throw new Error('获取access_token失败');
      }

      // 发送模板消息
      const sendUrl = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${tokenData.access_token}`;
      const openIdList = Array.isArray(openIds) ? openIds : [openIds];

      for (const openId of openIdList) {
        const messageBody = {
          touser: openId,
          template_id: templateId,
          data: {
            first: { value: title },
            keyword1: { value: type },
            keyword2: { value: content.substring(0, 100) },
            remark: { value: '请登录系统查看详情' }
          }
        };

        const response = await fetch(sendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageBody)
        });

        const result = await response.json() as { errcode: number; errmsg: string };

        if (logRepo) {
          const log = logRepo.create({
            id: uuidv4(),
            channelId: channel.id,
            channelType: 'wechat_mp',
            messageType: type,
            title,
            content,
            targetUsers: [openId],
            status: result.errcode === 0 ? 'success' : 'failed',
            response: JSON.stringify(result),
            errorMessage: result.errcode !== 0 ? result.errmsg : undefined,
            sentAt: new Date()
          });
          await logRepo.save(log);
        }
      }

      console.log(`[OrderNotification] ✅ 微信公众号推送成功: ${channel.name}`);
    } catch (error: any) {
      console.error(`[OrderNotification] ❌ 微信公众号推送失败:`, error.message);
    }
  }

  /**
   * 🔥 兼容旧方法名
   */
  private async sendToWechatRobot(type: string, title: string, content: string): Promise<void> {
    return this.sendToAllChannels(type, title, content);
  }

  /**
   * 批量发送消息
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
      createdBy?: string;
    }
  ): Promise<number> {
    try {
      console.log(`[OrderNotification] 📤 sendBatchMessages 被调用: type=${type}, targetUserIds=${targetUserIds.length}个`);

      // 🔥 如果没有目标用户，直接返回但仍然发送到外部渠道
      if (!targetUserIds || targetUserIds.length === 0) {
        console.warn('[OrderNotification] ⚠️ 没有目标用户，跳过系统消息，但仍发送到外部渠道');
        // 发送到外部渠道
        this.sendToAllChannels(type, title, content).catch(err => {
          console.warn('[OrderNotification] 外部渠道推送失败:', err.message);
        });
        return 0;
      }

      const dataSource = getDataSource();
      if (!dataSource) {
        console.error('[OrderNotification] 数据库未连接');
        return 0;
      }

      const messageRepo = dataSource.getRepository(SystemMessage);

      // 🔥 修复：只创建一条消息记录，targetUserId 存储所有目标用户ID（逗号分隔）
      // 这样每种通知只有一条记录，避免重复
      const messageId = uuidv4();
      const message = messageRepo.create({
        id: messageId,
        type,
        title,
        content,
        targetUserId: targetUserIds.join(','), // 多个用户ID用逗号分隔
        priority: options?.priority || 'normal',
        category: options?.category || '订单通知',
        relatedId: options?.relatedId,
        relatedType: options?.relatedType || 'order',
        actionUrl: options?.actionUrl,
        createdBy: options?.createdBy,
        isRead: 0
      });

      await messageRepo.save(message);
      console.log(`[OrderNotification] ✅ 创建1条系统消息: ${type}, 目标用户: ${targetUserIds.length}个`);

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
        console.log(`[OrderNotification] 🔌 WebSocket推送给 ${targetUserIds.length} 个用户`);
      }

      // 🔥 同时发送到外部渠道（只发送一次，不重复）
      this.sendToAllChannels(type, title, content).catch(err => {
        console.warn('[OrderNotification] 外部渠道推送失败:', err.message);
      });

      return 1; // 返回1表示创建了1条消息
    } catch (error) {
      console.error('[OrderNotification] ❌ 批量发送消息失败:', error);
      return 0;
    }
  }

  /**
   * 获取指定角色的所有用户ID
   * 🔥 修复：同时查询 status='active' 和 status=1 的用户（兼容不同的状态值）
   */
  private async getUserIdsByRoles(roles: string[]): Promise<string[]> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        console.error('[OrderNotification] ❌ 数据库未连接 (getDataSource返回null)');
        return [];
      }

      // 🔥 检查数据源是否已初始化
      if (!dataSource.isInitialized) {
        console.error('[OrderNotification] ❌ 数据库未初始化 (isInitialized=false)');
        return [];
      }

      const userRepo = dataSource.getRepository(User);

      // 🔥 查询所有用户，不限制status，然后在代码中过滤
      const allUsers = await userRepo.find({
        select: ['id', 'role', 'status', 'username', 'realName']
      });

      console.log(`[OrderNotification] 📋 数据库中共有 ${allUsers.length} 个用户`);
      console.log(`[OrderNotification] 📋 查找角色: ${roles.join(', ')}`);
      console.log(`[OrderNotification] 📋 所有用户角色: ${allUsers.map(u => `${u.username || u.realName}(${u.role}, status=${u.status})`).join(', ')}`);

      // 🔥 过滤：角色匹配 且 状态为活跃（兼容 'active', 1, '1', true）
      const matchedUsers = allUsers.filter(u => {
        const roleMatch = roles.includes(u.role);
        // 使用类型断言避免TypeScript类型检查错误
        const status = u.status as unknown;
        const statusActive = status === 'active' || status === 1 || status === '1' || status === true;

        if (roleMatch) {
          console.log(`[OrderNotification] 👤 用户 ${u.username || u.realName} (ID: ${u.id}): role=${u.role}, status=${u.status}, statusActive=${statusActive}`);
        }

        return roleMatch && statusActive;
      });

      const userIds = matchedUsers.map(u => u.id);
      console.log(`[OrderNotification] ✅ 匹配到 ${userIds.length} 个用户: ${userIds.join(', ')}`);

      return userIds;
    } catch (error) {
      console.error('[OrderNotification] ❌ 获取用户列表失败:', error);
      return [];
    }
  }

  // ==================== 订单生命周期通知 ====================

  /**
   * 订单创建通知 - 通知下单员
   */
  async notifyOrderCreated(order: OrderInfo, _operatorName?: string): Promise<void> {
    if (!order.createdBy) return;

    const content = `您的订单 #${order.orderNumber} 已创建成功，客户：${order.customerName || '未知'}，金额：¥${(order.totalAmount || 0).toFixed(2)}`;

    await this.sendMessage(
      OrderMessageTypes.ORDER_CREATED,
      '📝 订单创建成功',
      content,
      order.createdBy,
      {
        relatedId: order.id,
        actionUrl: '/order/list'
      }
    );
  }

  /**
   * 订单待审核通知 - 只通知管理员、超管、客服
   * 🔥 修复：不通知下单员（销售员），只通知审核相关人员
   */
  async notifyOrderPendingAudit(order: OrderInfo, _operatorName?: string): Promise<void> {
    console.log(`[OrderNotification] 🔔 notifyOrderPendingAudit 被调用: orderNumber=${order.orderNumber}, createdBy=${order.createdBy}, createdByName=${order.createdByName}`);

    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);
    console.log(`[OrderNotification] 📋 获取到管理员用户: ${adminUserIds.length} 个, IDs: ${adminUserIds.join(', ')}`);

    // 🔥 修复：只通知管理员、超管、客服，不通知下单员
    const allTargets = new Set<string>(adminUserIds);

    // 🔥 移除：不再添加下单员到通知目标
    // if (order.createdBy) {
    //   allTargets.add(order.createdBy);
    // }

    console.log(`[OrderNotification] 📤 待审核通知目标用户: ${Array.from(allTargets).join(', ')}`);

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    const content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}，金额：¥${(order.totalAmount || 0).toFixed(2)}）已提交审核，请及时处理`;

    const sentCount = await this.sendBatchMessages(
      OrderMessageTypes.ORDER_PENDING_AUDIT,
      '📋 订单待审核',
      content,
      Array.from(allTargets),
      {
        priority: 'high',
        relatedId: order.id,
        actionUrl: '/order/audit'
      }
    );

    console.log(`[OrderNotification] ✅ 待审核通知发送完成: ${sentCount} 条消息`);
  }

  /**
   * 订单审核通过通知 - 通知下单员
   * 🔥 添加销售员名字
   */
  async notifyOrderAuditApproved(order: OrderInfo, auditorName: string): Promise<void> {
    console.log(`[OrderNotification] 🔔 notifyOrderAuditApproved 被调用: orderNumber=${order.orderNumber}, createdBy=${order.createdBy}, auditorName=${auditorName}`);

    if (!order.createdBy) {
      console.warn(`[OrderNotification] ⚠️ 订单 ${order.orderNumber} 没有 createdBy，跳过通知`);
      return;
    }

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    const content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）已被 ${auditorName} 审核通过，即将安排发货`;

    await this.sendMessage(
      OrderMessageTypes.ORDER_AUDIT_APPROVED,
      '✅ 订单审核通过',
      content,
      order.createdBy,
      {
        relatedId: order.id,
        actionUrl: '/order/list'
      }
    );
  }

  /**
   * 订单审核拒绝通知 - 通知下单员 + 管理员
   * 🔥 添加销售员名字
   */
  async notifyOrderAuditRejected(order: OrderInfo, auditorName: string, reason?: string): Promise<void> {
    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);
    const allTargets = new Set<string>(adminUserIds);

    if (order.createdBy) {
      allTargets.add(order.createdBy);
    }

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    const content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）被 ${auditorName} 审核拒绝${reason ? `，原因：${reason}` : ''}`;

    await this.sendBatchMessages(
      OrderMessageTypes.ORDER_AUDIT_REJECTED,
      '❌ 订单审核拒绝',
      content,
      Array.from(allTargets),
      {
        priority: 'high',
        relatedId: order.id,
        actionUrl: '/order/list'
      }
    );
  }

  /**
   * 订单待发货通知 - 通知下单员 + 管理员
   * 🔥 修复：审核通过后待发货状态也要通知管理员、超管、客服
   */
  async notifyOrderPendingShipment(order: OrderInfo): Promise<void> {
    console.log(`[OrderNotification] 🔔 notifyOrderPendingShipment 被调用: orderNumber=${order.orderNumber}, createdBy=${order.createdBy}, createdByName=${order.createdByName}`);

    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);
    console.log(`[OrderNotification] 📋 获取到管理员用户: ${adminUserIds.length} 个, IDs: ${adminUserIds.join(', ')}`);

    const allTargets = new Set<string>(adminUserIds);

    // 添加下单员
    if (order.createdBy) {
      allTargets.add(order.createdBy);
    }

    console.log(`[OrderNotification] 📤 待发货通知目标用户: ${Array.from(allTargets).join(', ')}`);

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    const content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）已审核通过，进入待发货状态，请及时安排发货`;

    const sentCount = await this.sendBatchMessages(
      OrderMessageTypes.ORDER_PENDING_SHIPMENT,
      '📦 订单待发货',
      content,
      Array.from(allTargets),
      {
        priority: 'high',
        relatedId: order.id,
        actionUrl: '/logistics/shipping'
      }
    );

    console.log(`[OrderNotification] ✅ 待发货通知发送完成: ${sentCount} 条消息`);
  }

  /**
   * 订单已发货通知 - 通知下单员
   * 🔥 添加销售员名字
   */
  async notifyOrderShipped(order: OrderInfo, trackingNumber?: string, expressCompany?: string): Promise<void> {
    if (!order.createdBy) return;

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    let content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）已发货`;
    if (expressCompany) content += `，快递公司：${expressCompany}`;
    if (trackingNumber) content += `，运单号：${trackingNumber}`;

    await this.sendMessage(
      OrderMessageTypes.ORDER_SHIPPED,
      '🚚 订单已发货',
      content,
      order.createdBy,
      {
        relatedId: order.id,
        actionUrl: '/order/list'
      }
    );
  }

  /**
   * 订单已签收通知 - 通知下单员
   * 🔥 添加销售员名字
   */
  async notifyOrderDelivered(order: OrderInfo): Promise<void> {
    if (!order.createdBy) return;

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    const content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）已签收，感谢您的支持`;

    await this.sendMessage(
      OrderMessageTypes.ORDER_DELIVERED,
      '✅ 订单已签收',
      content,
      order.createdBy,
      {
        relatedId: order.id,
        actionUrl: '/order/list'
      }
    );
  }

  /**
   * 订单拒收通知 - 通知下单员 + 管理员
   * 🔥 添加销售员名字
   */
  async notifyOrderRejected(order: OrderInfo, reason?: string): Promise<void> {
    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);
    const allTargets = new Set<string>(adminUserIds);

    if (order.createdBy) {
      allTargets.add(order.createdBy);
    }

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    const content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）被客户拒收${reason ? `，原因：${reason}` : ''}`;

    await this.sendBatchMessages(
      OrderMessageTypes.ORDER_REJECTED,
      '⚠️ 订单拒收',
      content,
      Array.from(allTargets),
      {
        priority: 'high',
        relatedId: order.id,
        actionUrl: '/order/list'
      }
    );
  }

  /**
   * 订单取消通知 - 通知下单员 + 管理员
   * 🔥 添加销售员名字
   */
  async notifyOrderCancelled(order: OrderInfo, reason?: string, operatorName?: string): Promise<void> {
    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);
    const allTargets = new Set<string>(adminUserIds);

    if (order.createdBy) {
      allTargets.add(order.createdBy);
    }

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    let content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）已取消`;
    if (operatorName) content += `，操作人：${operatorName}`;
    if (reason) content += `，原因：${reason}`;

    await this.sendBatchMessages(
      OrderMessageTypes.ORDER_CANCELLED,
      '🚫 订单已取消',
      content,
      Array.from(allTargets),
      {
        relatedId: order.id,
        actionUrl: '/order/list'
      }
    );
  }

  // ==================== 物流异常通知 ====================

  /**
   * 物流退回通知 - 通知下单员 + 管理员
   * 🔥 添加销售员名字
   */
  async notifyLogisticsReturned(order: OrderInfo, reason?: string): Promise<void> {
    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);
    const allTargets = new Set<string>(adminUserIds);

    if (order.createdBy) {
      allTargets.add(order.createdBy);
    }

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    const content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）物流已退回${reason ? `，原因：${reason}` : ''}`;

    await this.sendBatchMessages(
      OrderMessageTypes.ORDER_LOGISTICS_RETURNED,
      '📦 物流退回',
      content,
      Array.from(allTargets),
      {
        priority: 'high',
        relatedId: order.id,
        actionUrl: '/logistics/shipping'
      }
    );
  }

  /**
   * 物流取消通知 - 通知下单员 + 管理员
   * 🔥 添加销售员名字
   */
  async notifyLogisticsCancelled(order: OrderInfo, reason?: string): Promise<void> {
    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);
    const allTargets = new Set<string>(adminUserIds);

    if (order.createdBy) {
      allTargets.add(order.createdBy);
    }

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    const content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）物流已取消${reason ? `，原因：${reason}` : ''}`;

    await this.sendBatchMessages(
      OrderMessageTypes.ORDER_LOGISTICS_CANCELLED,
      '🚫 物流取消',
      content,
      Array.from(allTargets),
      {
        priority: 'high',
        relatedId: order.id,
        actionUrl: '/logistics/shipping'
      }
    );
  }

  /**
   * 包裹异常通知 - 通知下单员 + 管理员
   * 🔥 添加销售员名字
   */
  async notifyPackageException(order: OrderInfo, reason?: string): Promise<void> {
    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);
    const allTargets = new Set<string>(adminUserIds);

    if (order.createdBy) {
      allTargets.add(order.createdBy);
    }

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    const content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）包裹异常${reason ? `，详情：${reason}` : '，请及时处理'}`;

    await this.sendBatchMessages(
      OrderMessageTypes.ORDER_PACKAGE_EXCEPTION,
      '⚠️ 包裹异常',
      content,
      Array.from(allTargets),
      {
        priority: 'urgent',
        relatedId: order.id,
        actionUrl: '/logistics/shipping'
      }
    );
  }

  // ==================== 取消审核通知 ====================

  /**
   * 取消申请通知 - 通知管理员
   * 🔥 添加销售员名字
   */
  async notifyOrderCancelRequest(order: OrderInfo, reason?: string): Promise<void> {
    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    const content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）申请取消${reason ? `，原因：${reason}` : ''}，请及时审核`;

    await this.sendBatchMessages(
      OrderMessageTypes.ORDER_CANCEL_REQUEST,
      '📝 取消申请待审核',
      content,
      adminUserIds,
      {
        priority: 'high',
        relatedId: order.id,
        actionUrl: '/order/cancel-audit'
      }
    );
  }

  /**
   * 取消审核通过通知 - 通知下单员
   * 🔥 添加销售员名字
   */
  async notifyOrderCancelApproved(order: OrderInfo, auditorName: string): Promise<void> {
    if (!order.createdBy) return;

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    const content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）取消申请已被 ${auditorName} 审核通过`;

    await this.sendMessage(
      OrderMessageTypes.ORDER_CANCEL_APPROVED,
      '✅ 取消申请通过',
      content,
      order.createdBy,
      {
        relatedId: order.id,
        actionUrl: '/order/list'
      }
    );
  }

  /**
   * 取消审核拒绝通知 - 通知下单员
   * 🔥 添加销售员名字
   */
  async notifyOrderCancelRejected(order: OrderInfo, auditorName: string, reason?: string): Promise<void> {
    if (!order.createdBy) return;

    // 🔥 添加销售员名字
    const salesPersonInfo = order.createdByName ? `【销售员：${order.createdByName}】` : '';
    const content = `${salesPersonInfo}订单 #${order.orderNumber}（客户：${order.customerName || '未知'}）取消申请被 ${auditorName} 拒绝${reason ? `，原因：${reason}` : ''}`;

    await this.sendMessage(
      OrderMessageTypes.ORDER_CANCEL_REJECTED,
      '❌ 取消申请被拒绝',
      content,
      order.createdBy,
      {
        relatedId: order.id,
        actionUrl: '/order/list'
      }
    );
  }

  // ==================== 售后生命周期通知 ====================

  /**
   * 售后创建通知 - 通知创建者 + 管理员
   */
  async notifyAfterSalesCreated(afterSales: AfterSalesInfo): Promise<void> {
    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);
    const allTargets = new Set<string>(adminUserIds);

    if (afterSales.createdBy) {
      allTargets.add(afterSales.createdBy);
    }

    const typeText = this.getAfterSalesTypeText(afterSales.serviceType);
    const content = `${typeText}申请 #${afterSales.serviceNumber} 已创建，关联订单：${afterSales.orderNumber || '无'}，客户：${afterSales.customerName || '未知'}`;

    await this.sendBatchMessages(
      AfterSalesMessageTypes.AFTER_SALES_CREATED,
      `📝 ${typeText}申请已创建`,
      content,
      Array.from(allTargets),
      {
        category: '售后通知',
        relatedId: afterSales.id,
        relatedType: 'afterSales',
        actionUrl: '/service/list'
      }
    );
  }

  /**
   * 售后分配通知 - 通知处理人和创建者
   */
  async notifyAfterSalesAssigned(afterSales: AfterSalesInfo, operatorId?: string, _operatorName?: string): Promise<void> {
    const typeText = this.getAfterSalesTypeText(afterSales.serviceType);

    // 通知处理人
    if (afterSales.assignedToId) {
      const handlerContent = `您有新的${typeText}工单需要处理：#${afterSales.serviceNumber}，客户：${afterSales.customerName || '未知'}`;
      await this.sendMessage(
        AfterSalesMessageTypes.AFTER_SALES_ASSIGNED,
        `📋 新${typeText}工单`,
        handlerContent,
        afterSales.assignedToId,
        {
          category: '售后通知',
          relatedId: afterSales.id,
          relatedType: 'afterSales',
          actionUrl: `/service/detail/${afterSales.id}`
        }
      );
    }

    // 通知创建者（如果创建者不是操作人）
    if (afterSales.createdBy && afterSales.createdBy !== operatorId) {
      const creatorContent = `您提交的${typeText}申请 #${afterSales.serviceNumber} 已分配给 ${afterSales.assignedTo || '处理人员'} 处理`;
      await this.sendMessage(
        AfterSalesMessageTypes.AFTER_SALES_ASSIGNED,
        `📋 ${typeText}已分配`,
        creatorContent,
        afterSales.createdBy,
        {
          category: '售后通知',
          relatedId: afterSales.id,
          relatedType: 'afterSales',
          actionUrl: `/service/detail/${afterSales.id}`
        }
      );
    }
  }

  /**
   * 售后处理中通知 - 通知创建者
   */
  async notifyAfterSalesProcessing(afterSales: AfterSalesInfo, operatorName?: string): Promise<void> {
    if (!afterSales.createdBy) return;

    const typeText = this.getAfterSalesTypeText(afterSales.serviceType);
    const content = `您的${typeText}申请 #${afterSales.serviceNumber}（客户：${afterSales.customerName || '未知'}）正在处理中${operatorName ? `，处理人：${operatorName}` : ''}`;

    await this.sendMessage(
      AfterSalesMessageTypes.AFTER_SALES_PROCESSING,
      `🔄 ${typeText}处理中`,
      content,
      afterSales.createdBy,
      {
        category: '售后通知',
        relatedId: afterSales.id,
        relatedType: 'afterSales',
        actionUrl: '/service/list'
      }
    );
  }

  /**
   * 售后完成通知 - 通知创建者
   */
  async notifyAfterSalesCompleted(afterSales: AfterSalesInfo, operatorName?: string): Promise<void> {
    if (!afterSales.createdBy) return;

    const typeText = this.getAfterSalesTypeText(afterSales.serviceType);
    const content = `您的${typeText}申请 #${afterSales.serviceNumber}（客户：${afterSales.customerName || '未知'}）已处理完成${operatorName ? `，处理人：${operatorName}` : ''}`;

    await this.sendMessage(
      AfterSalesMessageTypes.AFTER_SALES_COMPLETED,
      `✅ ${typeText}已完成`,
      content,
      afterSales.createdBy,
      {
        category: '售后通知',
        relatedId: afterSales.id,
        relatedType: 'afterSales',
        actionUrl: '/service/list'
      }
    );
  }

  /**
   * 售后拒绝通知 - 通知创建者
   */
  async notifyAfterSalesRejected(afterSales: AfterSalesInfo, operatorName?: string, reason?: string): Promise<void> {
    if (!afterSales.createdBy) return;

    const typeText = this.getAfterSalesTypeText(afterSales.serviceType);
    const content = `您的${typeText}申请 #${afterSales.serviceNumber}（客户：${afterSales.customerName || '未知'}）已被拒绝${reason ? `，原因：${reason}` : ''}`;

    await this.sendMessage(
      AfterSalesMessageTypes.AFTER_SALES_REJECTED,
      `❌ ${typeText}被拒绝`,
      content,
      afterSales.createdBy,
      {
        category: '售后通知',
        relatedId: afterSales.id,
        relatedType: 'afterSales',
        actionUrl: '/service/list'
      }
    );
  }

  /**
   * 售后取消通知 - 通知创建者 + 管理员
   */
  async notifyAfterSalesCancelled(afterSales: AfterSalesInfo, operatorName?: string): Promise<void> {
    const adminUserIds = await this.getUserIdsByRoles(ADMIN_ROLES);
    const allTargets = new Set<string>(adminUserIds);

    if (afterSales.createdBy) {
      allTargets.add(afterSales.createdBy);
    }

    const typeText = this.getAfterSalesTypeText(afterSales.serviceType);
    const content = `${typeText}申请 #${afterSales.serviceNumber}（客户：${afterSales.customerName || '未知'}）已取消${operatorName ? `，操作人：${operatorName}` : ''}`;

    await this.sendBatchMessages(
      AfterSalesMessageTypes.AFTER_SALES_CANCELLED,
      `🚫 ${typeText}已取消`,
      content,
      Array.from(allTargets),
      {
        category: '售后通知',
        relatedId: afterSales.id,
        relatedType: 'afterSales',
        actionUrl: '/service/list'
      }
    );
  }

  /**
   * 获取售后类型文本
   */
  private getAfterSalesTypeText(type?: string): string {
    const typeMap: Record<string, string> = {
      'return': '退货',
      'exchange': '换货',
      'repair': '维修',
      'refund': '退款',
      'complaint': '投诉'
    };
    return typeMap[type || ''] || '售后';
  }

  // ==================== 业绩分享通知 ====================

  /**
   * 业绩分享通知 - 通知被分享的成员
   */
  async notifyPerformanceShare(shareInfo: {
    shareId: string;
    shareNumber: string;
    orderNumber: string;
    orderAmount: number;
    memberId: string;
    memberName: string;
    percentage: number;
    shareAmount: number;
    createdBy?: string;
    createdByName?: string;
  }): Promise<void> {
    console.log(`[OrderNotification] 🔔 notifyPerformanceShare 被调用: shareNumber=${shareInfo.shareNumber}, memberId=${shareInfo.memberId}`);

    if (!shareInfo.memberId) {
      console.warn(`[OrderNotification] ⚠️ 业绩分享 ${shareInfo.shareNumber} 没有 memberId，跳过通知`);
      return;
    }

    const content = `您收到了来自 ${shareInfo.createdByName || '同事'} 的业绩分享！订单 #${shareInfo.orderNumber}，分享比例 ${shareInfo.percentage}%，分享金额 ¥${shareInfo.shareAmount.toFixed(2)}`;

    await this.sendMessage(
      'performance_share',
      '💰 业绩分享通知',
      content,
      shareInfo.memberId,
      {
        priority: 'normal',
        category: '业绩通知',
        relatedId: shareInfo.shareId,
        relatedType: 'performance_share',
        actionUrl: '/performance/share',
        createdBy: shareInfo.createdBy
      }
    );
  }
}

// 导出单例
export const orderNotificationService = new OrderNotificationService();
