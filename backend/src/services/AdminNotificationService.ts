/**
 * 管理后台通知服务
 * 负责管理员通知的创建、分发、渠道推送
 */
import { AppDataSource } from '../config/database'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

// 事件类型定义
export const EVENT_TYPES = {
  tenant_registered: { label: '新租户注册', level: 'info' as const, category: '用户动态' },
  payment_created: { label: '新支付订单', level: 'info' as const, category: '支付动态' },
  payment_success: { label: '支付成功', level: 'success' as const, category: '支付动态' },
  payment_pending: { label: '待支付提醒', level: 'warning' as const, category: '支付动态' },
  payment_cancelled: { label: '支付取消', level: 'warning' as const, category: '支付动态' },
  payment_refund: { label: '订单退款', level: 'warning' as const, category: '支付动态' },
  license_expiring: { label: '授权即将到期', level: 'warning' as const, category: '授权动态' },
  license_expired: { label: '授权已过期', level: 'error' as const, category: '授权动态' },
  tenant_login: { label: '租户首次登录', level: 'info' as const, category: '用户动态' },
  system_error: { label: '系统异常', level: 'error' as const, category: '系统告警' },
} as const

export type EventType = keyof typeof EVENT_TYPES

export const CHANNEL_TYPES = ['system', 'dingtalk', 'wecom', 'wechat_mp', 'email'] as const
export type ChannelType = typeof CHANNEL_TYPES[number]

interface NotifyPayload {
  title?: string
  content?: string
  relatedId?: string
  relatedType?: string
  extraData?: Record<string, any>
}

class AdminNotificationService {

  /**
   * 发送通知（主入口）
   * 1. 创建系统通知记录
   * 2. 查询通知规则，分发到已启用的渠道
   */
  async notify(eventType: EventType, payload: NotifyPayload): Promise<void> {
    try {
      const eventMeta = EVENT_TYPES[eventType]
      if (!eventMeta) {
        console.warn(`[AdminNotification] 未知事件类型: ${eventType}`)
        return
      }

      const title = payload.title || eventMeta.label
      const content = payload.content || title
      const level = eventMeta.level
      const notificationId = uuidv4()

      // 1. 写入通知记录
      await AppDataSource.query(
        `INSERT INTO admin_notifications (id, title, content, event_type, level, is_read, related_id, related_type, extra_data)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        [
          notificationId, title, content, eventType, level,
          payload.relatedId || null,
          payload.relatedType || null,
          payload.extraData ? JSON.stringify(payload.extraData) : null
        ]
      )

      // 2. 查询启用的规则和渠道
      const rules = await AppDataSource.query(
        `SELECT r.channel_type, c.config_data, c.is_enabled as channel_enabled
         FROM admin_notification_rules r
         JOIN admin_notification_channels c ON r.channel_type = c.channel_type
         WHERE r.event_type = ? AND r.is_enabled = 1 AND c.is_enabled = 1`,
        [eventType]
      )

      // 3. 分发到各渠道（异步，不阻塞主流程）
      for (const rule of rules) {
        if (rule.channel_type === 'system') continue // 系统消息已通过上面的INSERT实现
        this.dispatchToChannel(rule.channel_type, rule.config_data, { title, content, level, eventType })
          .catch(err => console.error(`[AdminNotification] 渠道 ${rule.channel_type} 推送失败:`, err.message))
      }
    } catch (error: any) {
      console.error('[AdminNotification] 通知发送失败:', error.message)
    }
  }

  /**
   * 分发到具体渠道
   */
  private async dispatchToChannel(
    channelType: string,
    configDataStr: string,
    notification: { title: string; content: string; level: string; eventType: string }
  ): Promise<void> {
    let config: any = {}
    try {
      config = typeof configDataStr === 'string' ? JSON.parse(configDataStr) : configDataStr
    } catch { config = {} }

    switch (channelType) {
      case 'dingtalk':
        await this.sendDingtalk(config, notification)
        break
      case 'wecom':
        await this.sendWecom(config, notification)
        break
      case 'email':
        await this.sendEmail(config, notification)
        break
      case 'wechat_mp':
        await this.sendWechatMp(config, notification)
        break
    }
  }

  /**
   * 钉钉机器人通知
   */
  private async sendDingtalk(
    config: { webhook: string; secret?: string },
    notification: { title: string; content: string; level: string }
  ): Promise<void> {
    if (!config.webhook) return

    let url = config.webhook
    // 加签
    if (config.secret) {
      const timestamp = Date.now()
      const stringToSign = `${timestamp}\n${config.secret}`
      const sign = crypto.createHmac('sha256', config.secret).update(stringToSign).digest('base64')
      url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`
    }

    const levelEmoji: Record<string, string> = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' }
    const body = {
      msgtype: 'markdown',
      markdown: {
        title: notification.title,
        text: `### ${levelEmoji[notification.level] || 'ℹ️'} ${notification.title}\n\n${notification.content}\n\n> 来自 CRM管理后台`
      }
    }

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  }

  /**
   * 企业微信机器人通知
   */
  private async sendWecom(
    config: { webhook: string },
    notification: { title: string; content: string; level: string }
  ): Promise<void> {
    if (!config.webhook) return

    const levelEmoji: Record<string, string> = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' }
    const body = {
      msgtype: 'markdown',
      markdown: {
        content: `### ${levelEmoji[notification.level] || 'ℹ️'} ${notification.title}\n${notification.content}\n> 来自 CRM管理后台`
      }
    }

    await fetch(config.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  }

  /**
   * 邮件通知
   */
  private async sendEmail(
    config: { smtp_host: string; smtp_port: number; username: string; password: string; from_name: string; to_emails: string[] },
    notification: { title: string; content: string; level: string }
  ): Promise<void> {
    if (!config.smtp_host || !config.username || !config.to_emails?.length) return

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port || 465,
      secure: (config.smtp_port || 465) === 465,
      auth: { user: config.username, pass: config.password }
    })

    const levelColor: Record<string, string> = { info: '#409EFF', warning: '#E6A23C', success: '#67C23A', error: '#F56C6C' }
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:${levelColor[notification.level] || '#409EFF'};color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;">${notification.title}</h2>
        </div>
        <div style="padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:14px;line-height:1.8;color:#333;">${notification.content}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
          <p style="font-size:12px;color:#999;">此消息由 CRM管理后台 自动发送</p>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: `"${config.from_name || 'CRM管理后台'}" <${config.username}>`,
      to: config.to_emails.join(','),
      subject: `[CRM通知] ${notification.title}`,
      html
    })
  }

  /**
   * 微信公众号模板消息（需要有关注用户的openid）
   */
  private async sendWechatMp(
    config: { app_id: string; app_secret: string; template_id: string; openids?: string[] },
    notification: { title: string; content: string }
  ): Promise<void> {
    if (!config.app_id || !config.app_secret || !config.template_id) return
    if (!config.openids?.length) return

    // 获取access_token
    const tokenRes = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.app_id}&secret=${config.app_secret}`
    )
    const tokenData = await tokenRes.json() as any
    if (!tokenData.access_token) return

    // 给每个openid发送模板消息
    for (const openid of config.openids) {
      await fetch(`https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${tokenData.access_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: openid,
          template_id: config.template_id,
          data: {
            first: { value: notification.title },
            keyword1: { value: notification.content },
            keyword2: { value: new Date().toLocaleString('zh-CN') },
            remark: { value: '来自CRM管理后台' }
          }
        })
      })
    }
  }

  // =============================================
  // 通知消息 CRUD
  // =============================================

  async getNotifications(params: { page?: number; pageSize?: number; isRead?: string; eventType?: string }) {
    const { page = 1, pageSize = 20, isRead, eventType } = params
    const offset = (Number(page) - 1) * Number(pageSize)

    let where = '1=1'
    const queryParams: any[] = []

    if (isRead !== undefined && isRead !== '') {
      where += ' AND is_read = ?'
      queryParams.push(Number(isRead))
    }
    if (eventType) {
      where += ' AND event_type = ?'
      queryParams.push(eventType)
    }

    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM admin_notifications WHERE ${where}`, queryParams
    )

    const list = await AppDataSource.query(
      `SELECT * FROM admin_notifications WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, Number(pageSize), offset]
    )

    return {
      list,
      total: Number(countResult[0].total),
      page: Number(page),
      pageSize: Number(pageSize)
    }
  }

  async getUnreadCount(): Promise<number> {
    const result = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM admin_notifications WHERE is_read = 0'
    )
    return Number(result[0].count)
  }

  async markAsRead(id: string): Promise<void> {
    await AppDataSource.query(
      'UPDATE admin_notifications SET is_read = 1 WHERE id = ?', [id]
    )
  }

  async markAllAsRead(): Promise<void> {
    await AppDataSource.query(
      'UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0'
    )
  }

  async deleteNotification(id: string): Promise<void> {
    await AppDataSource.query(
      'DELETE FROM admin_notifications WHERE id = ?', [id]
    )
  }

  async clearAllNotifications(): Promise<void> {
    await AppDataSource.query('DELETE FROM admin_notifications')
  }

  // =============================================
  // 渠道配置 CRUD
  // =============================================

  async getChannels() {
    return await AppDataSource.query(
      'SELECT id, channel_type, name, is_enabled, config_data, created_at, updated_at FROM admin_notification_channels ORDER BY FIELD(channel_type, "system", "dingtalk", "wecom", "wechat_mp", "email")'
    )
  }

  async saveChannel(channelType: string, data: { name?: string; is_enabled?: boolean; config_data?: any }) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const configStr = data.config_data ? JSON.stringify(data.config_data) : '{}'

    const existing = await AppDataSource.query(
      'SELECT id FROM admin_notification_channels WHERE channel_type = ?', [channelType]
    )

    if (existing.length > 0) {
      await AppDataSource.query(
        'UPDATE admin_notification_channels SET name = COALESCE(?, name), is_enabled = ?, config_data = ?, updated_at = ? WHERE channel_type = ?',
        [data.name || null, data.is_enabled ? 1 : 0, configStr, now, channelType]
      )
    } else {
      await AppDataSource.query(
        'INSERT INTO admin_notification_channels (id, channel_type, name, is_enabled, config_data) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), channelType, data.name || channelType, data.is_enabled ? 1 : 0, configStr]
      )
    }
  }

  async saveChannelsBatch(channels: Array<{ channel_type: string; name: string; is_enabled: boolean; config_data: any }>) {
    for (const ch of channels) {
      await this.saveChannel(ch.channel_type, ch)
    }
  }

  /**
   * 测试渠道连接
   */
  async testChannel(channelType: string, config: any): Promise<{ success: boolean; message: string }> {
    try {
      switch (channelType) {
        case 'dingtalk': {
          if (!config.webhook) return { success: false, message: '请填写Webhook地址' }
          await this.sendDingtalk(config, { title: '🔔 测试通知', content: '这是一条来自CRM管理后台的测试消息', level: 'info' })
          return { success: true, message: '钉钉消息发送成功，请检查群消息' }
        }
        case 'wecom': {
          if (!config.webhook) return { success: false, message: '请填写Webhook地址' }
          await this.sendWecom(config, { title: '🔔 测试通知', content: '这是一条来自CRM管理后台的测试消息', level: 'info' })
          return { success: true, message: '企业微信消息发送成功，请检查群消息' }
        }
        case 'email': {
          if (!config.smtp_host || !config.username) return { success: false, message: '请填写SMTP配置' }
          if (!config.to_emails?.length) return { success: false, message: '请添加收件人邮箱' }
          await this.sendEmail(config, { title: '🔔 测试通知', content: '这是一条来自CRM管理后台的测试消息，如果您收到了此邮件说明邮件通知配置正确。', level: 'info' })
          return { success: true, message: '邮件发送成功，请检查收件箱' }
        }
        case 'wechat_mp': {
          if (!config.app_id || !config.app_secret) return { success: false, message: '请填写AppID和AppSecret' }
          // 测试获取access_token
          const res = await fetch(
            `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.app_id}&secret=${config.app_secret}`
          )
          const data = await res.json() as any
          if (data.access_token) {
            return { success: true, message: `连接成功，获取到access_token` }
          } else {
            return { success: false, message: `连接失败: ${data.errmsg || '未知错误'}` }
          }
        }
        case 'system': {
          return { success: true, message: '系统消息渠道始终可用' }
        }
        default:
          return { success: false, message: `未知渠道类型: ${channelType}` }
      }
    } catch (error: any) {
      return { success: false, message: `测试失败: ${error.message}` }
    }
  }

  // =============================================
  // 通知规则 CRUD
  // =============================================

  async getRules() {
    return await AppDataSource.query(
      'SELECT id, event_type, channel_type, is_enabled FROM admin_notification_rules ORDER BY event_type, channel_type'
    )
  }

  async saveRules(rules: Array<{ event_type: string; channel_type: string; is_enabled: boolean }>) {
    for (const rule of rules) {
      const existing = await AppDataSource.query(
        'SELECT id FROM admin_notification_rules WHERE event_type = ? AND channel_type = ?',
        [rule.event_type, rule.channel_type]
      )

      if (existing.length > 0) {
        await AppDataSource.query(
          'UPDATE admin_notification_rules SET is_enabled = ? WHERE event_type = ? AND channel_type = ?',
          [rule.is_enabled ? 1 : 0, rule.event_type, rule.channel_type]
        )
      } else {
        await AppDataSource.query(
          'INSERT INTO admin_notification_rules (id, event_type, channel_type, is_enabled) VALUES (?, ?, ?, ?)',
          [uuidv4(), rule.event_type, rule.channel_type, rule.is_enabled ? 1 : 0]
        )
      }
    }
  }
}

export const adminNotificationService = new AdminNotificationService()

