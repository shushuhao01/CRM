/**
 * 短信额度预警与通知服务
 *
 * - 额度预警：剩余额度跌破阈值（100/50/10/用完）时，系统消息通知租户管理员和超级管理员，
 *   每个阈值只通知一次，购买额度到账后重置预警状态
 * - 发送失败提醒：因额度不足导致发送失败时，通知管理员"谁的短信发给哪个客户失败"
 */
import { AppDataSource } from '../config/database';
import { tenantRawSQLStrict } from '../utils/tenantHelpers';
import { sendBatchSystemMessages } from './messageService';
import { log } from '../config/logger';

/** 预警阈值（降序），0 表示已用完 */
const WARN_THRESHOLDS = [100, 50, 10, 0];

/** 获取当前租户的管理员用户ID列表（admin + super_admin） */
async function getTenantAdminUserIds(): Promise<string[]> {
  try {
    const { User } = await import('../entities/User');
    const { getTenantRepo } = await import('../utils/tenantRepo');
    const repo = getTenantRepo(User);
    const admins = await repo.createQueryBuilder('u')
      .where('u.role IN (:...roles)', { roles: ['admin', 'super_admin', 'superadmin'] })
      .getMany();
    return admins.map(a => a.id);
  } catch (err) {
    log.warn('[SMS-Quota] 获取管理员列表失败:', err);
    return [];
  }
}

export class SmsQuotaNotifyService {

  /**
   * 检查剩余额度并按阈值预警（在扣减额度之后调用，需处于租户上下文中）
   */
  static async checkQuotaWarning(): Promise<void> {
    try {
      const t = tenantRawSQLStrict();
      const rows = await AppDataSource.query(
        `SELECT config_key, config_value FROM system_config
         WHERE config_key IN ('sms_quota_total', 'sms_quota_used', 'sms_quota_warn_level') ${t.sql}`,
        [...t.params]
      );
      let total = 0, used = 0;
      let warnedLevel: number | null = null;
      for (const r of rows) {
        if (r.config_key === 'sms_quota_total') total = parseInt(r.config_value) || 0;
        if (r.config_key === 'sms_quota_used') used = parseInt(r.config_value) || 0;
        if (r.config_key === 'sms_quota_warn_level' && r.config_value !== '' && r.config_value != null) {
          warnedLevel = parseInt(r.config_value);
          if (Number.isNaN(warnedLevel)) warnedLevel = null;
        }
      }

      if (total <= 0) return; // 未开通额度功能，不预警

      const remaining = Math.max(0, total - used);

      // 找到当前命中的最小阈值（thresholds 为降序，最后一次命中即最小）
      let level: number | null = null;
      for (const th of WARN_THRESHOLDS) {
        if (remaining <= th) level = th;
      }

      if (level === null) {
        // 剩余量高于所有阈值（如管理后台直接调增额度），清除已有预警标记
        if (warnedLevel !== null) await SmsQuotaNotifyService.setWarnLevel(null);
        return;
      }

      // 同级或更低级已预警过，不重复通知
      if (warnedLevel !== null && warnedLevel <= level) return;

      await SmsQuotaNotifyService.setWarnLevel(level);

      const adminIds = await getTenantAdminUserIds();
      if (adminIds.length === 0) return;

      const isExhausted = remaining <= 0;
      const title = isExhausted ? '短信额度已用完' : `短信额度不足预警（剩余${remaining}条）`;
      const content = isExhausted
        ? '短信额度已全部用完，系统已暂停发送短信（含自动发送）。请尽快购买额度，以免影响业务通知。'
        : `短信额度仅剩 ${remaining} 条（预警阈值 ${level} 条），请及时购买额度。额度用完后将暂停发送短信。`;

      await sendBatchSystemMessages(adminIds.map(uid => ({
        type: 'sms_quota_warning',
        title,
        content,
        targetUserId: uid,
        category: '短信管理',
        priority: isExhausted ? 'high' : 'normal',
        actionUrl: '/service-management/sms'
      })));

      log.info(`[SMS-Quota] 额度预警已通知 ${adminIds.length} 位管理员: 剩余${remaining}条, 阈值${level}`);
    } catch (err) {
      log.warn('[SMS-Quota] 额度预警检查失败:', err);
    }
  }

  /**
   * 因额度不足发送失败时，通知租户管理员（需处于租户上下文中）
   * @param senderName 发送人名称（自动发送规则为"自动发送"）
   * @param recipients 接收人列表
   * @param contentSummary 短信内容摘要
   */
  static async notifyQuotaSendFailure(
    senderName: string,
    recipients: Array<{ name?: string; phone?: string }>,
    contentSummary: string
  ): Promise<void> {
    try {
      const adminIds = await getTenantAdminUserIds();
      if (adminIds.length === 0) return;

      const recipientDesc = recipients
        .slice(0, 5)
        .map(r => `${r.name || '客户'}(${r.phone || '未知号码'})`)
        .join('、') + (recipients.length > 5 ? ` 等${recipients.length}人` : '');
      const summary = (contentSummary || '').substring(0, 60);

      await sendBatchSystemMessages(adminIds.map(uid => ({
        type: 'sms_quota_send_failed',
        title: '短信发送失败：额度不足',
        content: `因短信额度不足，${senderName} 发送给 ${recipientDesc} 的短信发送失败。短信内容：${summary}${(contentSummary || '').length > 60 ? '...' : ''}。请购买额度后重新发送。`,
        targetUserId: uid,
        category: '短信管理',
        priority: 'high',
        actionUrl: '/service-management/sms'
      })));

      log.info(`[SMS-Quota] 额度不足发送失败已通知管理员: 发送人=${senderName}, 接收人=${recipientDesc}`);
    } catch (err) {
      log.warn('[SMS-Quota] 额度不足失败提醒发送失败:', err);
    }
  }

  /**
   * 设置/清除预警等级标记（当前租户上下文）
   */
  private static async setWarnLevel(level: number | null): Promise<void> {
    const t = tenantRawSQLStrict();
    if (level === null) {
      await AppDataSource.query(
        `DELETE FROM system_config WHERE config_key = 'sms_quota_warn_level' ${t.sql}`,
        [...t.params]
      );
      return;
    }
    const existing = await AppDataSource.query(
      `SELECT id FROM system_config WHERE config_key = 'sms_quota_warn_level' ${t.sql} LIMIT 1`,
      [...t.params]
    );
    if (existing.length > 0) {
      await AppDataSource.query(
        `UPDATE system_config SET config_value = ?, updated_at = NOW()
         WHERE config_key = 'sms_quota_warn_level' ${t.sql}`,
        [String(level), ...t.params]
      );
    } else {
      const { TenantContextManager } = await import('../utils/tenantContext');
      const tenantId = TenantContextManager.getTenantId() || null;
      await AppDataSource.query(
        `INSERT INTO system_config (config_key, config_value, config_group, tenant_id, description)
         VALUES ('sms_quota_warn_level', ?, 'sms_quota', ?, '短信额度已预警等级')`,
        [String(level), tenantId]
      );
    }
  }

  /**
   * 购买额度到账后重置预警标记（显式传入租户ID，供支付回调等无上下文场景使用）
   */
  static async resetWarnLevel(tenantId: string | null): Promise<void> {
    try {
      if (tenantId) {
        await AppDataSource.query(
          `DELETE FROM system_config WHERE config_key = 'sms_quota_warn_level' AND tenant_id = ?`,
          [tenantId]
        );
      } else {
        await AppDataSource.query(
          `DELETE FROM system_config WHERE config_key = 'sms_quota_warn_level' AND tenant_id IS NULL`
        );
      }
    } catch (err) {
      log.warn('[SMS-Quota] 重置预警等级失败:', err);
    }
  }
}
