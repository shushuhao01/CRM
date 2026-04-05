/**
 * 通知模板服务
 *
 * 功能:
 * 1. 模板管理(CRUD)
 * 2. 模板渲染(变量替换)
 * 3. 通知发送(邮件+短信)
 * 4. 业务场景集成
 */

import { getDataSource } from '../config/database';
import { NotificationTemplate } from '../entities/NotificationTemplate';
import { notificationChannelService } from './NotificationChannelService';
import { SITE_CONFIG } from '../config/sites';
import { AppDataSource } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

import { log } from '../config/logger';
// 模板变量接口
export interface TemplateVariables {
  [key: string]: string | number | undefined;
}

// 发送选项接口
export interface SendOptions {
  to?: string | string[];        // 收件人(邮箱或手机号)
  emailTo?: string;              // 邮件收件人（明确指定）
  smsTo?: string;                // 短信收件人（明确指定）
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;            // 操作链接
  relatedId?: string;            // 关联ID
  relatedType?: string;          // 关联类型
}

class NotificationTemplateService {
  /**
   * 根据模板代码发送通知
   */
  async sendByTemplate(
    templateCode: string,
    variables: TemplateVariables,
    options?: SendOptions
  ): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        return { success: false, message: '数据库未连接' };
      }

      // 获取模板
      const templateRepo = dataSource.getRepository(NotificationTemplate);
      const template = await templateRepo.findOne({
        where: { templateCode, isEnabled: 1 }
      });

      if (!template) {
        return { success: false, message: `模板不存在或未启用: ${templateCode}` };
      }

      // 渲染模板
      const rendered = this.renderTemplate(template, variables);

      // 准备发送内容
      const sendResults: any[] = [];

      // 发送邮件
      if (template.sendEmail && rendered.emailSubject && rendered.emailContent) {
        const emailResult = await this.sendEmail(
          rendered.emailSubject,
          rendered.emailContent,
          options
        );
        sendResults.push({ type: 'email', ...emailResult });
      }

      // 发送短信
      if (template.sendSms && rendered.smsContent) {
        const smsResult = await this.sendSms(
          rendered.smsContent,
          options
        );
        sendResults.push({ type: 'sms', ...smsResult });
      }

      // 记录发送日志
      await this.logNotification(template, variables, sendResults);

      const successCount = sendResults.filter(r => r.success).length;
      const totalCount = sendResults.length;

      return {
        success: successCount > 0,
        message: `发送完成: ${successCount}/${totalCount} 成功`,
        details: sendResults
      };
    } catch (error: any) {
      log.error('[NotificationTemplate] 发送失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 渲染模板(替换变量)
   */
  private renderTemplate(
    template: NotificationTemplate,
    variables: TemplateVariables
  ): {
    emailSubject?: string;
    emailContent?: string;
    smsContent?: string;
  } {
    const result: any = {};

    // 渲染邮件主题
    if (template.emailSubject) {
      result.emailSubject = this.replaceVariables(template.emailSubject, variables);
    }

    // 渲染邮件内容
    if (template.emailContent) {
      result.emailContent = this.replaceVariables(template.emailContent, variables);
    }

    // 渲染短信内容
    if (template.smsContent) {
      result.smsContent = this.replaceVariables(template.smsContent, variables);
    }

    return result;
  }

  /**
   * 替换变量
   */
  private replaceVariables(template: string, variables: TemplateVariables): string {
    let result = template;

    // 添加网站地址到变量中
    const allVariables = {
      ...variables,
      crmUrl: SITE_CONFIG.CRM_URL,
      websiteUrl: SITE_CONFIG.WEBSITE_URL,
      apiUrl: SITE_CONFIG.API_URL,
      adminUrl: SITE_CONFIG.ADMIN_URL,
      renewUrl: SITE_CONFIG.RENEW_URL,
      loginUrl: SITE_CONFIG.CRM_URL
    };

    // 替换 {{variable}} 格式的变量
    Object.keys(allVariables).forEach(key => {
      const value = allVariables[key];
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, String(value));
      }
    });

    // 清理未替换的变量(显示为空)
    result = result.replace(/{{[^}]+}}/g, '');

    return result;
  }

  /**
   * 从 system_config 获取邮件配置
   */
  private async getEmailSettings(): Promise<any | null> {
    try {
      const result = await AppDataSource.query(
        `SELECT config_value FROM system_config WHERE config_key = 'email_settings' LIMIT 1`
      ).catch(() => []);
      if (result && result.length > 0) {
        const data = JSON.parse(result[0].config_value || '{}');
        if (data.enabled && data.smtpHost && data.senderEmail && data.emailPassword) {
          return data;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 从 system_config 获取短信配置
   */
  private async getSmsSettings(): Promise<any | null> {
    try {
      const result = await AppDataSource.query(
        `SELECT config_value FROM system_config WHERE config_key = 'sms_config' LIMIT 1`
      ).catch(() => []);
      if (result && result.length > 0) {
        const data = JSON.parse(result[0].config_value || '{}');
        if (data.enabled && data.accessKeyId && data.accessKeySecret && data.signName) {
          return data;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 发送邮件
   * 优先使用通知渠道服务，若无可用渠道则 fallback 到系统基础邮件配置
   */
  private async sendEmail(
    subject: string,
    content: string,
    options?: SendOptions
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. 先尝试通过通知渠道服务发送（查找 email 类型渠道）
      const results = await notificationChannelService.sendToAllChannels({
        title: subject,
        content: content,
        type: 'template_notification',
        priority: options?.priority || 'normal',
        actionUrl: options?.actionUrl
      });

      // 检查是否有 email 类型的渠道结果
      if (results.length > 0) {
        const emailResult = results.find(r => r.success);
        if (emailResult) {
          return { success: true, message: emailResult.message };
        }
      }

      // 2. Fallback: 使用系统基础邮件配置
      log.info('[NotificationTemplate] 通知渠道无可用邮件渠道，尝试使用系统基础邮件配置');
      const emailSettings = await this.getEmailSettings();
      if (!emailSettings) {
        return { success: false, message: '发送失败，请检查服务配置' };
      }

      // 确定收件人（优先使用 emailTo，其次 to，最后用配置的 testEmail）
      const recipients = options?.emailTo
        || (options?.to ? (Array.isArray(options.to) ? options.to.join(',') : options.to) : null)
        || emailSettings.testEmail;

      if (!recipients) {
        return { success: false, message: '未指定收件人邮箱' };
      }

      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: emailSettings.smtpHost,
        port: emailSettings.smtpPort || 465,
        secure: emailSettings.enableSsl !== false,
        auth: {
          user: emailSettings.senderEmail,
          pass: emailSettings.emailPassword
        },
        tls: emailSettings.enableTls ? { rejectUnauthorized: false } : undefined
      });

      const htmlContent = this.buildEmailHtml(subject, content, options);

      await transporter.sendMail({
        from: `"${emailSettings.senderName || 'CRM系统'}" <${emailSettings.senderEmail}>`,
        to: recipients,
        subject: subject,
        text: content.replace(/<[^>]+>/g, ''),
        html: htmlContent
      });

      return { success: true, message: '邮件发送成功' };
    } catch (error: any) {
      log.error('[NotificationTemplate] 邮件发送失败:', error);
      return { success: false, message: `邮件发送失败: ${error.message}` };
    }
  }

  /**
   * 发送短信
   * 优先使用通知渠道服务，若无可用渠道则 fallback 到系统基础短信配置
   */
  private async sendSms(
    content: string,
    options?: SendOptions
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. 先尝试通过通知渠道服务发送（查找 sms 类型渠道）
      const results = await notificationChannelService.sendToAllChannels({
        title: '系统通知',
        content: content,
        type: 'template_notification',
        priority: options?.priority || 'normal'
      });

      if (results.length > 0) {
        const smsResult = results.find(r => r.success);
        if (smsResult) {
          return { success: true, message: smsResult.message };
        }
      }

      // 2. Fallback: 使用系统基础短信配置
      log.info('[NotificationTemplate] 通知渠道无可用短信渠道，尝试使用系统基础短信配置');
      const smsSettings = await this.getSmsSettings();
      if (!smsSettings) {
        return { success: false, message: '发送失败，请检查服务配置' };
      }

      // 确定收件人手机号（优先使用 smsTo，其次 to）
      const phone = options?.smsTo
        || (options?.to ? (Array.isArray(options.to) ? options.to[0] : options.to) : null);

      if (!phone) {
        return { success: false, message: '未指定收件人手机号' };
      }

      // 使用阿里云短信服务
      const { aliyunSmsService } = await import('./AliyunSmsService');

      // 使用通用模板或验证码模板
      const templateCode = smsSettings.templates?.VERIFY_CODE || smsSettings.templateCode;
      if (!templateCode) {
        return { success: false, message: '短信模板CODE未配置' };
      }

      aliyunSmsService.init({
        accessKeyId: smsSettings.accessKeyId,
        accessKeySecret: smsSettings.accessKeySecret,
        signName: smsSettings.signName,
        templateCode: templateCode,
        templates: smsSettings.templates || {}
      });

      const result = await aliyunSmsService.sendVerificationCode(phone, content.substring(0, 6));

      return { success: result.success, message: result.message || (result.success ? '短信发送成功' : '短信发送失败') };
    } catch (error: any) {
      log.error('[NotificationTemplate] 短信发送失败:', error);
      return { success: false, message: `短信发送失败: ${error.message}` };
    }
  }

  /**
   * 检测内容是否为HTML格式
   */
  private isHtmlContent(content: string): boolean {
    return /<(?:div|p|h[1-6]|table|ul|ol|br|span|a|strong|em)\b/i.test(content);
  }

  /**
   * 构建邮件HTML（自动适配HTML/纯文本内容，移动端友好）
   */
  private buildEmailHtml(subject: string, content: string, options?: SendOptions): string {
    const isHtml = this.isHtmlContent(content);
    // HTML内容直接嵌入，纯文本使用 pre-wrap 保留换行
    const contentBlock = isHtml
      ? `<div style="line-height: 1.8; color: #333;">${content}</div>`
      : `<div style="white-space: pre-wrap; line-height: 1.8; color: #333;">${content}</div>`;

    const actionBlock = options?.actionUrl
      ? `<div style="text-align: center; margin-top: 24px;">
           <a href="${options.actionUrl}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">查看详情</a>
         </div>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f4f5f7; }
    img { max-width: 100%; }
    a { color: #667eea; }
    p { margin: 0 0 12px 0; }
  </style>
</head>
<body style="margin: 0; padding: 0; background: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f5f7; padding: 24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
        <!-- 头部 -->
        <tr>
          <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 28px 32px;">
            <h2 style="margin: 0; color: #fff; font-size: 20px; font-weight: 600;">${subject}</h2>
          </td>
        </tr>
        <!-- 内容区 -->
        <tr>
          <td style="padding: 28px 32px;">
            ${contentBlock}
            ${actionBlock}
          </td>
        </tr>
        <!-- 底部 -->
        <tr>
          <td style="background: #f8f9fa; padding: 16px 32px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #999; font-size: 12px; line-height: 1.6;">此邮件由云客CRM系统自动发送，请勿直接回复</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  /**
   * 记录通知日志
   */
  private async logNotification(
    template: NotificationTemplate,
    variables: TemplateVariables,
    results: any[]
  ): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) return;

      // 这里可以扩展记录到notification_logs表
      log.info('[NotificationTemplate] 发送记录:', {
        templateCode: template.templateCode,
        variables,
        results
      });
    } catch (error) {
      log.error('[NotificationTemplate] 记录日志失败:', error);
    }
  }

  /**
   * 获取所有模板
   */
  async getAllTemplates(): Promise<NotificationTemplate[]> {
    const dataSource = getDataSource();
    if (!dataSource) return [];

    const templateRepo = dataSource.getRepository(NotificationTemplate);
    return templateRepo.find({ order: { category: 'ASC', createdAt: 'DESC' } });
  }

  /**
   * 根据分类获取模板
   */
  async getTemplatesByCategory(category: string): Promise<NotificationTemplate[]> {
    const dataSource = getDataSource();
    if (!dataSource) return [];

    const templateRepo = dataSource.getRepository(NotificationTemplate);
    return templateRepo.find({
      where: { category, isEnabled: 1 },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * 获取单个模板
   */
  async getTemplate(templateCode: string): Promise<NotificationTemplate | null> {
    const dataSource = getDataSource();
    if (!dataSource) return null;

    const templateRepo = dataSource.getRepository(NotificationTemplate);
    return templateRepo.findOne({ where: { templateCode } });
  }

  /**
   * 创建模板
   */
  async createTemplate(data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const dataSource = getDataSource();
    if (!dataSource) throw new Error('数据库未连接');

    const templateRepo = dataSource.getRepository(NotificationTemplate);
    const template = templateRepo.create({
      id: uuidv4(),
      ...data
    });

    return templateRepo.save(template);
  }

  /**
   * 更新模板
   */
  async updateTemplate(
    templateCode: string,
    data: Partial<NotificationTemplate>
  ): Promise<NotificationTemplate | null> {
    const dataSource = getDataSource();
    if (!dataSource) return null;

    const templateRepo = dataSource.getRepository(NotificationTemplate);
    const template = await templateRepo.findOne({ where: { templateCode } });

    if (!template) return null;

    // 系统模板不允许修改某些字段
    if (template.isSystem) {
      delete data.templateCode;
      delete data.isSystem;
    }

    Object.assign(template, data);
    return templateRepo.save(template);
  }

  /**
   * 删除模板
   */
  async deleteTemplate(templateCode: string): Promise<boolean> {
    const dataSource = getDataSource();
    if (!dataSource) return false;

    const templateRepo = dataSource.getRepository(NotificationTemplate);
    const template = await templateRepo.findOne({ where: { templateCode } });

    if (!template) return false;

    // 系统模板不允许删除
    if (template.isSystem) {
      throw new Error('系统模板不允许删除');
    }

    await templateRepo.remove(template);
    return true;
  }

  /**
   * 测试模板渲染
   */
  async testTemplate(
    templateCode: string,
    variables: TemplateVariables
  ): Promise<{
    emailSubject?: string;
    emailContent?: string;
    smsContent?: string;
  }> {
    const dataSource = getDataSource();
    if (!dataSource) throw new Error('数据库未连接');

    const templateRepo = dataSource.getRepository(NotificationTemplate);
    const template = await templateRepo.findOne({ where: { templateCode } });

    if (!template) {
      throw new Error(`模板不存在: ${templateCode}`);
    }

    return this.renderTemplate(template, variables);
  }
}

// 导出单例
export const notificationTemplateService = new NotificationTemplateService();
export default notificationTemplateService;
