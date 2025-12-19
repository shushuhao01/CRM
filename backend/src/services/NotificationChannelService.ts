/**
 * 第三方通知渠道服务
 *
 * 支持的渠道：
 * - 钉钉群机器人 (dingtalk)
 * - 企业微信群机器人 (wechat_work)
 * - 微信公众号模板消息 (wechat_mp)
 * - 邮件 (email)
 * - 短信 (sms)
 *
 * 🔥 2025-12-19 新增：WebSocket实时推送集成
 */

import { getDataSource } from '../config/database';
import { NotificationChannel, NotificationLog } from '../entities/NotificationChannel';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { webSocketService } from './WebSocketService';

// 发送结果接口
export interface SendResult {
  success: boolean;
  message: string;
  details?: any;
  channelId?: string;
  channelName?: string;
}

// 消息内容接口
export interface NotificationMessage {
  title: string;
  content: string;
  type?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  relatedId?: string;
}

// Markdown消息接口
export interface MarkdownMessage {
  title: string;
  text: string;
}

class NotificationChannelService {
  /**
   * 发送通知到所有启用的渠道
   */
  async sendToAllChannels(message: NotificationMessage): Promise<SendResult[]> {
    const results: SendResult[] = [];

    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        return [{ success: false, message: '数据库未连接' }];
      }

      const channelRepo = dataSource.getRepository(NotificationChannel);
      const channels = await channelRepo.find({ where: { isEnabled: 1 } });

      if (channels.length === 0) {
        console.log('[NotificationChannel] 没有启用的通知渠道');
        return [];
      }

      // 并行发送到所有渠道
      const sendPromises = channels.map(async (channel) => {
        // 检查消息类型过滤
        if (message.type && channel.messageTypes && channel.messageTypes.length > 0) {
          if (!channel.messageTypes.includes(message.type) && !channel.messageTypes.includes('all')) {
            return { success: true, message: '消息类型不匹配，跳过', channelId: channel.id, channelName: channel.name };
          }
        }

        // 检查优先级过滤
        if (channel.priorityFilter && channel.priorityFilter !== 'all') {
          if (message.priority && message.priority !== channel.priorityFilter) {
            if (channel.priorityFilter === 'high' && !['high', 'urgent'].includes(message.priority)) {
              return { success: true, message: '优先级不匹配，跳过', channelId: channel.id, channelName: channel.name };
            }
            if (channel.priorityFilter === 'urgent' && message.priority !== 'urgent') {
              return { success: true, message: '优先级不匹配，跳过', channelId: channel.id, channelName: channel.name };
            }
          }
        }

        const result = await this.sendToChannel(channel, message);
        return { ...result, channelId: channel.id, channelName: channel.name };
      });

      const settledResults = await Promise.allSettled(sendPromises);

      settledResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            message: result.reason?.message || '发送失败',
            channelId: channels[index]?.id,
            channelName: channels[index]?.name
          });
        }
      });

      const successCount = results.filter(r => r.success).length;
      console.log(`[NotificationChannel] 发送完成: ${successCount}/${results.length} 成功`);

      // 🔥 通过WebSocket推送通知发送状态给相关用户
      if (global.webSocketService) {
        results.forEach(result => {
          if (result.channelName) {
            // 广播通知状态（管理员可见）
            webSocketService.sendToRole('admin', 'channel_notification_status', {
              channelName: result.channelName,
              channelType: result.channelId,
              success: result.success,
              message: result.message
            });
          }
        });
      }

    } catch (error: any) {
      console.error('[NotificationChannel] 发送失败:', error);
      results.push({ success: false, message: error.message });
    }

    return results;
  }

  /**
   * 发送到指定渠道
   */
  async sendToChannel(channel: NotificationChannel, message: NotificationMessage): Promise<SendResult> {
    const fullContent = `${message.title}\n\n${message.content}`;

    switch (channel.channelType) {
      case 'dingtalk':
        return this.sendToDingtalk(channel, fullContent, message);
      case 'wechat_work':
        return this.sendToWechatWork(channel, fullContent, message);
      case 'wechat_mp':
        return this.sendToWechatMP(channel, message);
      case 'email':
        return this.sendToEmail(channel, message);
      case 'sms':
        return this.sendToSms(channel, message);
      case 'system':
        return { success: true, message: '系统通知无需外部发送' };
      default:
        return { success: false, message: `不支持的渠道类型: ${channel.channelType}` };
    }
  }

  /**
   * 发送钉钉消息
   */
  async sendToDingtalk(channel: NotificationChannel, content: string, message: NotificationMessage): Promise<SendResult> {
    const config = channel.config || {};
    const { webhook, secret, at_all, at_mobiles } = config;

    if (!webhook) {
      return { success: false, message: '钉钉Webhook地址未配置' };
    }

    try {
      let url = webhook;

      // 加签处理
      if (secret) {
        const timestamp = Date.now();
        const stringToSign = `${timestamp}\n${secret}`;
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(stringToSign);
        const sign = encodeURIComponent(hmac.digest('base64'));
        url = `${webhook}&timestamp=${timestamp}&sign=${sign}`;
      }

      // 构建消息体
      const msgBody: any = {
        msgtype: 'text',
        text: { content },
        at: {
          isAtAll: at_all || false,
          atMobiles: at_mobiles || []
        }
      };

      // 如果是高优先级，使用Markdown格式
      if (message.priority === 'high' || message.priority === 'urgent') {
        msgBody.msgtype = 'markdown';
        msgBody.markdown = {
          title: message.title,
          text: `### ${message.priority === 'urgent' ? '🚨 紧急' : '⚠️ 重要'} ${message.title}\n\n${message.content}`
        };
        delete msgBody.text;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgBody)
      });

      const result = await response.json() as { errcode: number; errmsg: string };

      // 记录日志
      await this.logNotification(channel, message, result.errcode === 0, JSON.stringify(result));

      if (result.errcode === 0) {
        return { success: true, message: '钉钉消息发送成功', details: result };
      } else {
        return { success: false, message: `钉钉发送失败: ${result.errmsg}`, details: result };
      }
    } catch (error: any) {
      await this.logNotification(channel, message, false, undefined, error.message);
      return { success: false, message: `钉钉发送异常: ${error.message}` };
    }
  }

  /**
   * 发送企业微信消息
   */
  async sendToWechatWork(channel: NotificationChannel, content: string, message: NotificationMessage): Promise<SendResult> {
    const config = channel.config || {};
    const { webhook, mentioned_list, mentioned_mobile_list } = config;

    if (!webhook) {
      return { success: false, message: '企业微信Webhook地址未配置' };
    }

    try {
      // 构建消息体
      const msgBody: any = {
        msgtype: 'text',
        text: {
          content,
          mentioned_list: mentioned_list || [],
          mentioned_mobile_list: mentioned_mobile_list || []
        }
      };

      // 如果是高优先级，使用Markdown格式
      if (message.priority === 'high' || message.priority === 'urgent') {
        msgBody.msgtype = 'markdown';
        msgBody.markdown = {
          content: `### ${message.priority === 'urgent' ? '🚨 紧急' : '⚠️ 重要'} ${message.title}\n\n${message.content}`
        };
        delete msgBody.text;
      }

      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgBody)
      });

      const result = await response.json() as { errcode: number; errmsg: string };

      await this.logNotification(channel, message, result.errcode === 0, JSON.stringify(result));

      if (result.errcode === 0) {
        return { success: true, message: '企业微信消息发送成功', details: result };
      } else {
        return { success: false, message: `企业微信发送失败: ${result.errmsg}`, details: result };
      }
    } catch (error: any) {
      await this.logNotification(channel, message, false, undefined, error.message);
      return { success: false, message: `企业微信发送异常: ${error.message}` };
    }
  }

  /**
   * 发送微信公众号模板消息
   */
  async sendToWechatMP(channel: NotificationChannel, message: NotificationMessage): Promise<SendResult> {
    const config = channel.config || {};
    const { app_id, app_secret, template_id, openids } = config;

    if (!app_id || !app_secret || !template_id) {
      return { success: false, message: '微信公众号配置不完整' };
    }

    if (!openids || openids.length === 0) {
      return { success: false, message: '未配置接收用户的OpenID' };
    }

    try {
      // 获取access_token
      const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${app_id}&secret=${app_secret}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json() as { access_token?: string; errcode?: number; errmsg?: string };

      if (!tokenData.access_token) {
        return { success: false, message: `获取access_token失败: ${tokenData.errmsg}` };
      }

      // 发送模板消息
      const sendUrl = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${tokenData.access_token}`;
      const openIdList = Array.isArray(openids) ? openids : [openids];

      let successCount = 0;
      let lastError = '';

      for (const openid of openIdList) {
        const msgBody = {
          touser: openid,
          template_id,
          url: message.actionUrl || '',
          data: {
            first: { value: message.title, color: '#173177' },
            keyword1: { value: message.type || '系统通知' },
            keyword2: { value: message.content.substring(0, 100) },
            keyword3: { value: new Date().toLocaleString('zh-CN') },
            remark: { value: '请登录系统查看详情', color: '#909399' }
          }
        };

        const response = await fetch(sendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msgBody)
        });

        const result = await response.json() as { errcode: number; errmsg: string };

        if (result.errcode === 0) {
          successCount++;
        } else {
          lastError = result.errmsg;
        }
      }

      await this.logNotification(channel, message, successCount > 0, `成功: ${successCount}/${openIdList.length}`);

      if (successCount === openIdList.length) {
        return { success: true, message: `微信公众号消息发送成功，共${successCount}人` };
      } else if (successCount > 0) {
        return { success: true, message: `部分发送成功: ${successCount}/${openIdList.length}` };
      } else {
        return { success: false, message: `发送失败: ${lastError}` };
      }
    } catch (error: any) {
      await this.logNotification(channel, message, false, undefined, error.message);
      return { success: false, message: `微信公众号发送异常: ${error.message}` };
    }
  }

  /**
   * 发送邮件
   */
  async sendToEmail(channel: NotificationChannel, message: NotificationMessage): Promise<SendResult> {
    const config = channel.config || {};
    const { smtp_host, smtp_port, username, password, from_name, to_emails } = config;

    if (!smtp_host || !username || !password) {
      return { success: false, message: '邮件SMTP配置不完整' };
    }

    if (!to_emails || to_emails.length === 0) {
      return { success: false, message: '未配置收件人邮箱' };
    }

    try {
      // 动态导入nodemailer
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.createTransport({
        host: smtp_host,
        port: smtp_port || 465,
        secure: (smtp_port || 465) === 465,
        auth: { user: username, pass: password }
      });

      const recipients = Array.isArray(to_emails) ? to_emails.join(',') : to_emails;

      // 构建HTML邮件内容
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">${message.title}</h2>
          </div>
          <div style="background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="white-space: pre-wrap; line-height: 1.6;">${message.content}</p>
            ${message.actionUrl ? `<p><a href="${message.actionUrl}" style="color: #667eea;">点击查看详情</a></p>` : ''}
          </div>
          <div style="background: #f0f0f0; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; color: #666; font-size: 12px;">
            此邮件由CRM系统自动发送，请勿直接回复
          </div>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `"${from_name || 'CRM系统'}" <${username}>`,
        to: recipients,
        subject: message.title,
        text: message.content,
        html: htmlContent
      });

      await this.logNotification(channel, message, true, JSON.stringify(info));

      return { success: true, message: `邮件发送成功: ${info.messageId}`, details: info };
    } catch (error: any) {
      await this.logNotification(channel, message, false, undefined, error.message);
      return { success: false, message: `邮件发送失败: ${error.message}` };
    }
  }

  /**
   * 发送短信
   */
  async sendToSms(channel: NotificationChannel, message: NotificationMessage): Promise<SendResult> {
    const config = channel.config || {};
    const { provider, access_key, access_secret, phones } = config;

    if (!provider || !access_key || !access_secret) {
      return { success: false, message: '短信服务配置不完整' };
    }

    if (!phones || phones.length === 0) {
      return { success: false, message: '未配置接收手机号' };
    }

    try {
      const phoneList = Array.isArray(phones) ? phones.join(',') : phones;

      // 根据不同的短信服务商调用不同的API
      if (provider === 'aliyun') {
        return await this.sendAliyunSms(config, phoneList, message);
      } else if (provider === 'tencent') {
        return await this.sendTencentSms(config, phoneList, message);
      } else {
        return { success: false, message: `不支持的短信服务商: ${provider}` };
      }
    } catch (error: any) {
      await this.logNotification(channel, message, false, undefined, error.message);
      return { success: false, message: `短信发送失败: ${error.message}` };
    }
  }

  /**
   * 阿里云短信发送
   */
  private async sendAliyunSms(config: any, phones: string, message: NotificationMessage): Promise<SendResult> {
    const { access_key, access_secret, sign_name, template_code } = config;

    // 阿里云短信API签名计算
    const timestamp = new Date().toISOString().replace(/\.\d{3}/, '');
    const nonce = uuidv4();

    const params: Record<string, string> = {
      AccessKeyId: access_key,
      Action: 'SendSms',
      Format: 'JSON',
      PhoneNumbers: phones,
      SignName: sign_name,
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: nonce,
      SignatureVersion: '1.0',
      TemplateCode: template_code,
      TemplateParam: JSON.stringify({ content: message.content.substring(0, 70) }),
      Timestamp: timestamp,
      Version: '2017-05-25'
    };

    // 按字母排序参数
    const sortedKeys = Object.keys(params).sort();
    const canonicalizedQueryString = sortedKeys
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonicalizedQueryString)}`;
    const hmac = crypto.createHmac('sha1', `${access_secret}&`);
    hmac.update(stringToSign);
    const signature = hmac.digest('base64');

    const url = `https://dysmsapi.aliyuncs.com/?${canonicalizedQueryString}&Signature=${encodeURIComponent(signature)}`;

    const response = await fetch(url);
    const result = await response.json() as { Code: string; Message: string };

    if (result.Code === 'OK') {
      return { success: true, message: '阿里云短信发送成功', details: result };
    } else {
      return { success: false, message: `阿里云短信发送失败: ${result.Message}`, details: result };
    }
  }

  /**
   * 腾讯云短信发送
   */
  private async sendTencentSms(config: any, phones: string, message: NotificationMessage): Promise<SendResult> {
    const { access_key, access_secret, sdk_app_id, sign_name, template_id } = config;

    // 腾讯云短信API v3签名
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
    const service = 'sms';
    const host = 'sms.tencentcloudapi.com';

    const phoneArray = phones.split(',').map(p => p.startsWith('+86') ? p : `+86${p}`);

    const payload = JSON.stringify({
      PhoneNumberSet: phoneArray,
      SmsSdkAppId: sdk_app_id,
      SignName: sign_name,
      TemplateId: template_id,
      TemplateParamSet: [message.content.substring(0, 70)]
    });

    // 计算签名
    const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');
    const canonicalRequest = `POST\n/\n\ncontent-type:application/json\nhost:${host}\n\ncontent-type;host\n${hashedPayload}`;
    const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const credentialScope = `${date}/${service}/tc3_request`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

    const secretDate = crypto.createHmac('sha256', `TC3${access_secret}`).update(date).digest();
    const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
    const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    const authorization = `TC3-HMAC-SHA256 Credential=${access_key}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;

    const response = await fetch(`https://${host}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': host,
        'X-TC-Action': 'SendSms',
        'X-TC-Version': '2021-01-11',
        'X-TC-Timestamp': String(timestamp),
        'Authorization': authorization
      },
      body: payload
    });

    const result = await response.json() as { Response: { SendStatusSet?: any[]; Error?: { Code: string; Message: string } } };

    if (result.Response.SendStatusSet) {
      return { success: true, message: '腾讯云短信发送成功', details: result };
    } else {
      return { success: false, message: `腾讯云短信发送失败: ${result.Response.Error?.Message}`, details: result };
    }
  }

  /**
   * 记录通知日志
   */
  private async logNotification(
    channel: NotificationChannel,
    message: NotificationMessage,
    success: boolean,
    response?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) return;

      const logRepo = dataSource.getRepository(NotificationLog);
      const log = logRepo.create({
        id: uuidv4(),
        channelId: channel.id,
        channelType: channel.channelType,
        messageType: message.type || 'unknown',
        title: message.title,
        content: message.content,
        status: success ? 'success' : 'failed',
        response,
        errorMessage,
        sentAt: new Date()
      });

      await logRepo.save(log);
    } catch (error) {
      console.error('[NotificationChannel] 记录日志失败:', error);
    }
  }

  /**
   * 发送Markdown格式消息（钉钉/企业微信）
   */
  async sendMarkdownMessage(channelType: 'dingtalk' | 'wechat_work', webhook: string, markdown: MarkdownMessage, secret?: string): Promise<SendResult> {
    try {
      let url = webhook;

      // 钉钉加签
      if (channelType === 'dingtalk' && secret) {
        const timestamp = Date.now();
        const stringToSign = `${timestamp}\n${secret}`;
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(stringToSign);
        const sign = encodeURIComponent(hmac.digest('base64'));
        url = `${webhook}&timestamp=${timestamp}&sign=${sign}`;
      }

      const msgBody = {
        msgtype: 'markdown',
        markdown: channelType === 'dingtalk'
          ? { title: markdown.title, text: markdown.text }
          : { content: markdown.text }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgBody)
      });

      const result = await response.json() as { errcode: number; errmsg: string };

      if (result.errcode === 0) {
        return { success: true, message: 'Markdown消息发送成功', details: result };
      } else {
        return { success: false, message: `发送失败: ${result.errmsg}`, details: result };
      }
    } catch (error: any) {
      return { success: false, message: `发送异常: ${error.message}` };
    }
  }
}

// 导出单例
export const notificationChannelService = new NotificationChannelService();
export default notificationChannelService;
