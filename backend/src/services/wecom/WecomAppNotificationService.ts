/**
 * 企微服务商应用通知服务
 *
 * 根据 wecom_notification_templates 配置，通过企微 message/send API 向授权企业推送应用通知。
 *
 * 通知范围 (notifyScope):
 *  - self: 仅通知当事人（如客户的归属成员）
 *  - team: 通知当事人 + 其部门经理
 *  - all:  通知当事人 + 部门经理 + 管理员
 */
import { AppDataSource } from '../../config/database';
import { WecomNotificationTemplate } from '../../entities/WecomNotificationTemplate';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomApiService } from '../WecomApiService';
import { WecomTokenService } from './WecomTokenService';
import { log } from '../../config/logger';

export interface NotificationPayload {
  templateType: string;
  tenantId: string;
  /** 当事人的企微 userId */
  triggerUserId?: string;
  /** 当事人所属部门 ID */
  departmentId?: string;
  /** 模板变量键值对 */
  variables: Record<string, string>;
  /** 跳转链接（可选） */
  url?: string;
}

interface SendResult {
  templateId: string;
  templateName: string;
  scope: string;
  targetUsers: string[];
  success: boolean;
  errcode?: number;
  errmsg?: string;
}

export class WecomAppNotificationService {

  /**
   * 按模板类型触发通知
   * 自动查找启用的模板 → 确定收件人 → 调用企微 API
   */
  static async notify(payload: NotificationPayload): Promise<SendResult[]> {
    const { templateType, tenantId, triggerUserId, variables, url } = payload;

    const tplRepo = AppDataSource.getRepository(WecomNotificationTemplate);
    const templates = await tplRepo.find({
      where: { templateType, isEnabled: true },
      order: { sortOrder: 'ASC' },
    });

    if (templates.length === 0) {
      log.info(`[WecomAppNotify] No enabled templates for type=${templateType}`);
      return [];
    }

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({
      where: { tenantId, isEnabled: true },
    });
    if (!config) {
      log.warn(`[WecomAppNotify] No active WecomConfig for tenant=${tenantId}`);
      return [];
    }

    let accessToken: string;
    try {
      accessToken = await WecomTokenService.getAccessToken(config, 'corp');
    } catch (err: any) {
      log.error(`[WecomAppNotify] Failed to get access token: ${err.message}`);
      return [];
    }

    const agentId = (config as any).agentId || 0;
    const results: SendResult[] = [];

    for (const tpl of templates) {
      const targetUsers = await this.resolveRecipients(tpl.notifyScope, tenantId, triggerUserId, payload.departmentId);
      if (targetUsers.length === 0) {
        log.info(`[WecomAppNotify] No recipients for template=${tpl.templateName}, scope=${tpl.notifyScope}`);
        results.push({ templateId: tpl.templateId, templateName: tpl.templateName, scope: tpl.notifyScope, targetUsers: [], success: true, errmsg: '无收件人' });
        continue;
      }

      try {
        const description = this.renderContent(tpl, variables);
        const res = await WecomApiService.sendAppMessage(accessToken, {
          touser: targetUsers.join('|'),
          agentid: agentId,
          msgtype: 'textcard',
          textcard: {
            title: tpl.templateName,
            description,
            url: url || '',
            btntxt: '查看详情',
          },
        });

        results.push({
          templateId: tpl.templateId,
          templateName: tpl.templateName,
          scope: tpl.notifyScope,
          targetUsers,
          success: res.errcode === 0,
          errcode: res.errcode,
          errmsg: res.errmsg,
        });

        log.info(`[WecomAppNotify] Sent: type=${templateType}, tpl=${tpl.templateName}, users=${targetUsers.length}, errcode=${res.errcode}`);
      } catch (err: any) {
        log.error(`[WecomAppNotify] Send failed: tpl=${tpl.templateName}, error=${err.message}`);
        results.push({
          templateId: tpl.templateId,
          templateName: tpl.templateName,
          scope: tpl.notifyScope,
          targetUsers,
          success: false,
          errmsg: err.message,
        });
      }
    }

    return results;
  }

  /**
   * 根据 notifyScope 解析收件人列表
   */
  private static async resolveRecipients(
    scope: string,
    tenantId: string,
    triggerUserId?: string,
    departmentId?: string
  ): Promise<string[]> {
    const users = new Set<string>();

    if (triggerUserId) {
      users.add(triggerUserId);
    }

    if (scope === 'self') {
      return Array.from(users);
    }

    // team / all → 加入部门经理
    if ((scope === 'team' || scope === 'all') && departmentId) {
      try {
        const managers = await AppDataSource.query(
          `SELECT wecom_userid FROM users WHERE tenant_id = ? AND department_id = ? AND role IN ('manager', 'department_manager') AND wecom_userid IS NOT NULL`,
          [tenantId, departmentId]
        );
        for (const m of managers) {
          if (m.wecom_userid) users.add(m.wecom_userid);
        }
      } catch (err: any) {
        log.warn(`[WecomAppNotify] resolveRecipients manager query failed: ${err.message}`);
      }
    }

    // all → 加入管理员
    if (scope === 'all') {
      try {
        const admins = await AppDataSource.query(
          `SELECT wecom_userid FROM users WHERE tenant_id = ? AND role = 'admin' AND wecom_userid IS NOT NULL`,
          [tenantId]
        );
        for (const a of admins) {
          if (a.wecom_userid) users.add(a.wecom_userid);
        }
      } catch (err: any) {
        log.warn(`[WecomAppNotify] resolveRecipients admin query failed: ${err.message}`);
      }
    }

    return Array.from(users);
  }

  /**
   * 用变量渲染通知内容
   */
  private static renderContent(tpl: WecomNotificationTemplate, variables: Record<string, string>): string {
    let content = tpl.description || tpl.templateName;

    // 尝试解析 templateContent 中的 sampleContent
    if (tpl.templateContent) {
      try {
        const parsed = JSON.parse(tpl.templateContent);
        if (parsed.sampleContent) content = parsed.sampleContent;
      } catch { /* 不是 JSON 则直接使用 */ }
    }

    // 替换 {{key}} 变量
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return content;
  }
}

export default WecomAppNotificationService;
