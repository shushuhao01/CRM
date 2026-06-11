/**
 * 短信签名解析工具
 *
 * 短信内容开头的【...】是服务商签名，不是模板变量：
 * - SaaS 模式：租户统一使用平台短信通道发送 → 签名取管理后台配置的 sms_config.signName
 * - 私有部署：优先取 CRM 系统设置（sms_settings 组）中配置的短信签名，
 *   未配置时回退到平台 sms_config.signName
 */
import { IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';
import { isSaaSMode } from '../config/deploy';
import { log } from '../config/logger';

/** 匹配内容开头的【...】签名段（含变量形式如【{companyName}】） */
const SIGN_PREFIX_RE = /^\s*【[^】]*】\s*/;

/**
 * 解析当前生效的短信签名
 */
export async function resolveSmsSignName(): Promise<string> {
  try {
    if (!isSaaSMode()) {
      // 私有部署：优先读取 CRM 系统设置中配置的短信签名（system_configs 表 sms_settings 组）
      const repo = AppDataSource.getRepository(SystemConfig);
      const cfg = await repo.findOne({
        where: { configKey: 'signName', configGroup: 'sms_settings', tenantId: IsNull() }
      });
      const v = (cfg?.configValue || '').trim();
      if (v) return v;
    }

    // SaaS 模式 / 私有部署未配置时：读取管理后台平台短信通道签名（system_config 表 sms_config）
    const rows = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'sms_config' LIMIT 1`
    ).catch(() => []);
    if (rows && rows.length > 0) {
      const data = JSON.parse(rows[0].config_value || '{}');
      if (data.signName) return String(data.signName).trim();
    }
  } catch (err) {
    log.warn('[SMS] 解析短信签名失败:', err);
  }
  return '';
}

/**
 * 去掉内容开头的【...】签名段
 */
export function stripSmsSignPrefix(content: string): string {
  if (!content) return content || '';
  return content.replace(SIGN_PREFIX_RE, '');
}

/**
 * 将真实签名前置到内容开头（替换原有的【...】段）
 * 签名为空时原样返回，保持原有展示
 */
export function applySmsSignature(content: string, signName: string): string {
  if (!signName) return content;
  return `【${signName}】${stripSmsSignPrefix(content)}`;
}
