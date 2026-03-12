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
import { v4 as uuidv4 } from 'uuid';

// 模板变量接口
export interface TemplateVariables {
  [key: string]: string | number | undefined;
}

// 发送选项接口
export interface SendOptions {
  to?: string | string[];        // 收件人(邮箱或手机号)
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
      console.error('[NotificationTemplate] 发送失败:', error);
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
      adminUrl: SITE_CONFIG.ADMIN_URL
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
   * 发送邮件
   */
  private async sendEmail(
    subject: string,
    content: string,
    options?: SendOptions
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 通过通知渠道服务发送
      const results = await notificationChannelService.sendToAllChannels({
        title: subject,
        content: content,
        type: 'template_notification',
        priority: options?.priority || 'normal',
        actionUrl: options?.actionUrl
      });

      const emailResult = results.find(r => r.channelId === 'email');
      if (emailResult) {
        return { success: emailResult.success, message: emailResult.message };
      }

      return { success: false, message: '邮件渠道未配置' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 发送短信
   */
  private async sendSms(
    content: string,
    options?: SendOptions
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 通过通知渠道服务发送
      const results = await notificationChannelService.sendToAllChannels({
        title: '系统通知',
        content: content,
        type: 'template_notification',
        priority: options?.priority || 'normal'
      });

      const smsResult = results.find(r => r.channelId === 'sms');
      if (smsResult) {
        return { success: smsResult.success, message: smsResult.message };
      }

      return { success: false, message: '短信渠道未配置' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
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
      console.log('[NotificationTemplate] 发送记录:', {
        templateCode: template.templateCode,
        variables,
        results
      });
    } catch (error) {
      console.error('[NotificationTemplate] 记录日志失败:', error);
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
