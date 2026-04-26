/**
 * 企微Token管理服务 (V2.0)
 *
 * 双模式支持:
 * - self_built (自建应用): corpId + secret 直接获取 access_token
 * - third_party (第三方应用): suite_access_token + permanent_code 换取 corp_access_token
 *
 * 功能:
 * 1. 统一Token获取入口，按auth_type自动分支
 * 2. 多Secret类型支持: corp/contact/external/chat
 * 3. Token缓存管理(内存缓存+提前刷新)
 * 4. Suite Token管理(第三方应用专用)
 */
import axios from 'axios';
import * as crypto from 'crypto';
import { AppDataSource } from '../../config/database';
import { WecomConfig } from '../../entities/WecomConfig';
import { log } from '../../config/logger';

const WECOM_API_BASE = 'https://qyapi.weixin.qq.com/cgi-bin';

/** Token类型 */
type SecretType = 'corp' | 'contact' | 'external' | 'chat';

/** 缓存条目 */
interface CacheEntry {
  token: string;
  expireTime: number;
}

// ==================== 缓存 ====================

const corpTokenCache: Map<string, CacheEntry> = new Map();
const suiteTokenCache: Map<string, CacheEntry> = new Map();

export class WecomTokenService {

  // ==================== 公共入口 ====================

  /**
   * 获取企业 Access Token（统一入口）
   * 自动根据 config.authType 选择 自建/第三方 模式
   */
  static async getAccessToken(config: WecomConfig, secretType: SecretType = 'corp'): Promise<string> {
    if (config.authType === 'third_party') {
      return this.getCorpTokenByThirdParty(config, secretType);
    }
    return this.getCorpTokenBySelfBuilt(config, secretType);
  }

  /**
   * 根据 configId 获取 Access Token
   */
  static async getAccessTokenByConfigId(configId: number, secretType: SecretType = 'corp'): Promise<string> {
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) {
      throw new Error('企微配置不存在或已禁用');
    }
    return this.getAccessToken(config, secretType);
  }

  // ==================== 自建应用模式 ====================

  /**
   * 自建应用: corpId + secret 获取 access_token
   */
  private static async getCorpTokenBySelfBuilt(config: WecomConfig, secretType: SecretType): Promise<string> {
    const secret = this.resolveSecret(config, secretType);
    if (!secret) {
      throw new Error(`企微配置缺少 ${secretType} 类型的Secret`);
    }

    const cacheKey = `self:${config.corpId}:${this.hashSecret(secret)}`;
    const cached = corpTokenCache.get(cacheKey);
    if (cached && cached.expireTime > Date.now()) {
      return cached.token;
    }

    log.info(`[WecomToken] Fetching self_built token, corpId=${config.corpId}, type=${secretType}`);

    const response = await axios.get(`${WECOM_API_BASE}/gettoken`, {
      params: { corpid: config.corpId, corpsecret: secret }
    });

    if (response.data.errcode && response.data.errcode !== 0) {
      const hint = this.getErrorHint(response.data.errcode);
      throw new Error(`获取Token失败: ${response.data.errmsg} (${response.data.errcode})${hint}`);
    }

    const token = response.data.access_token;
    const expireTime = Date.now() + (response.data.expires_in - 300) * 1000;
    corpTokenCache.set(cacheKey, { token, expireTime });
    return token;
  }

  // ==================== 第三方应用模式 ====================

  /**
   * 第三方应用: 使用 permanent_code 换取企业 access_token
   */
  private static async getCorpTokenByThirdParty(config: WecomConfig, _secretType: SecretType): Promise<string> {
    if (!config.permanentCode) {
      throw new Error('第三方应用缺少永久授权码(permanent_code)');
    }

    const cacheKey = `tp:${config.corpId}:${config.suiteId || 'default'}`;
    const cached = corpTokenCache.get(cacheKey);
    if (cached && cached.expireTime > Date.now()) {
      return cached.token;
    }

    // 先获取 suite_access_token
    const suiteToken = await this.getSuiteAccessToken(config.suiteId || '');

    log.info(`[WecomToken] Fetching third_party corp token, corpId=${config.corpId}`);

    const response = await axios.post(
      `${WECOM_API_BASE}/service/get_corp_token?suite_access_token=${suiteToken}`,
      {
        auth_corpid: config.corpId,
        permanent_code: config.permanentCode
      }
    );

    if (response.data.errcode && response.data.errcode !== 0) {
      throw new Error(`获取企业Token失败: ${response.data.errmsg} (${response.data.errcode})`);
    }

    const token = response.data.access_token;
    const expireTime = Date.now() + (response.data.expires_in - 300) * 1000;
    corpTokenCache.set(cacheKey, { token, expireTime });
    return token;
  }

  /**
   * 获取 Suite Access Token (第三方应用专用)
   * 需要: suite_id + suite_secret + suite_ticket (来自企微推送)
   */
  static async getSuiteAccessToken(suiteId: string): Promise<string> {
    const cacheKey = `suite:${suiteId}`;
    const cached = suiteTokenCache.get(cacheKey);
    if (cached && cached.expireTime > Date.now()) {
      return cached.token;
    }

    // 从系统配置中读取 suite 相关信息
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_suite_config' LIMIT 1"
    ).catch(() => []);

    if (rows.length === 0) {
      throw new Error('未配置第三方应用Suite信息(wecom_suite_config)');
    }

    let suiteConfig: any;
    try {
      suiteConfig = JSON.parse(rows[0].config_value);
    } catch {
      throw new Error('Suite配置格式错误');
    }

    const suiteSecret = suiteConfig.suite_secret;
    const suiteTicket = suiteConfig.suite_ticket;

    if (!suiteSecret || !suiteTicket) {
      throw new Error('Suite配置缺少必要参数(suite_secret/suite_ticket)');
    }

    log.info(`[WecomToken] Fetching suite_access_token, suiteId=${suiteId}`);

    const response = await axios.post(`${WECOM_API_BASE}/service/get_suite_token`, {
      suite_id: suiteId,
      suite_secret: suiteSecret,
      suite_ticket: suiteTicket
    });

    if (response.data.errcode && response.data.errcode !== 0) {
      throw new Error(`获取SuiteToken失败: ${response.data.errmsg} (${response.data.errcode})`);
    }

    const token = response.data.suite_access_token;
    const expireTime = Date.now() + (response.data.expires_in - 300) * 1000;
    suiteTokenCache.set(cacheKey, { token, expireTime });
    return token;
  }

  // ==================== 授权管理 ====================

  /**
   * 处理第三方应用授权回调 (create_auth事件)
   * 用 auth_code 换取 permanent_code 并保存到 WecomConfig
   */
  static async handleCreateAuth(suiteId: string, authCode: string, tenantIdHint?: string): Promise<WecomConfig> {
    const suiteToken = await this.getSuiteAccessToken(suiteId);

    log.info(`[WecomToken] Processing create_auth, suiteId=${suiteId}, tenantIdHint=${tenantIdHint || '(none)'}`);

    const response = await axios.post(
      `${WECOM_API_BASE}/service/get_permanent_code?suite_access_token=${suiteToken}`,
      { auth_code: authCode }
    );

    if (response.data.errcode && response.data.errcode !== 0) {
      throw new Error(`获取永久授权码失败: ${response.data.errmsg}`);
    }

    const { permanent_code, auth_corp_info, auth_user_info } = response.data;
    const corpId = auth_corp_info?.corpid;

    if (!corpId || !permanent_code) {
      throw new Error('授权回调数据不完整: 缺少corpid或permanent_code');
    }

    const configRepo = AppDataSource.getRepository(WecomConfig);
    let config = await configRepo.findOne({ where: { corpId } });

    if (config) {
      config.authType = 'third_party';
      config.permanentCode = permanent_code;
      config.suiteId = suiteId;
      config.authCorpInfo = JSON.stringify(auth_corp_info);
      config.authUserInfo = JSON.stringify(auth_user_info);
      config.isEnabled = true;
      config.connectionStatus = 'connected';
      if (!config.tenantId) {
        const resolved = tenantIdHint || await this.lookupTenantId(corpId, config.id);
        if (resolved) {
          config.tenantId = resolved;
          log.info(`[WecomToken] create_auth: 为已有config补充tenantId=${resolved}, corpId=${corpId}`);
        } else {
          log.warn(`[WecomToken] create_auth: 更新已有WecomConfig但tenantId为空且无法自动确定, corpId=${corpId}, configId=${config.id}`);
        }
      }
    } else {
      let tenantId: string | undefined = tenantIdHint || undefined;
      if (!tenantId) {
        tenantId = await this.lookupTenantId(corpId) || undefined;
      }

      if (!tenantId) {
        log.warn(`[WecomToken] create_auth: 新建WecomConfig未能确定tenantId, corpId=${corpId}, corpName=${auth_corp_info.corp_name || ''}`);
      }

      config = configRepo.create({
        tenantId,
        name: auth_corp_info.corp_name || corpId,
        corpId,
        corpSecret: '',
        authType: 'third_party',
        permanentCode: permanent_code,
        suiteId,
        authCorpInfo: JSON.stringify(auth_corp_info),
        authUserInfo: JSON.stringify(auth_user_info),
        isEnabled: true,
        connectionStatus: 'connected',
        bindTime: new Date(),
        bindOperator: 'system_auth'
      });
    }

    await configRepo.save(config);
    log.info(`[WecomToken] Auth saved for corp: ${corpId}, name: ${config.name}, tenantId: ${config.tenantId || '(empty)'}`);
    return config;
  }

  /**
   * 处理取消授权 (cancel_auth事件)
   */
  static async handleCancelAuth(corpId: string): Promise<void> {
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { corpId } });
    if (config) {
      config.isEnabled = false;
      config.connectionStatus = 'cancelled';
      config.permanentCode = '';
      await configRepo.save(config);

      this.clearCache(corpId);

      try {
        const { default: WecomApiService } = await import('../WecomApiService');
        WecomApiService.clearCache(corpId);
      } catch (_e) {
        log.warn(`[WecomToken] Failed to clear WecomApiService cache for corp: ${corpId}`);
      }

      log.info(`[WecomToken] Auth cancelled and all caches cleared for corp: ${corpId}`);
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 尝试从已有记录中查找corpId对应的tenantId
   * 使用原生SQL避免ORM的租户过滤
   */
  private static async lookupTenantId(corpId: string, excludeConfigId?: number): Promise<string | null> {
    try {
      const params: any[] = [corpId, ''];
      let sql = 'SELECT tenant_id FROM wecom_configs WHERE corp_id = ? AND tenant_id IS NOT NULL AND tenant_id != ?';
      if (excludeConfigId) {
        sql += ' AND id != ?';
        params.push(excludeConfigId);
      }
      sql += ' LIMIT 1';
      const rows = await AppDataSource.query(sql, params);
      return rows?.[0]?.tenant_id || null;
    } catch (_e) {
      return null;
    }
  }

  /**
   * 根据SecretType从config中获取对应Secret
   */
  private static resolveSecret(config: WecomConfig, secretType: SecretType): string {
    switch (secretType) {
      case 'contact':
        return config.contactSecret || config.corpSecret;
      case 'external':
        return config.externalContactSecret || config.contactSecret || config.corpSecret;
      case 'chat':
        return config.chatArchiveSecret || config.corpSecret;
      default:
        return config.corpSecret;
    }
  }

  /**
   * 对Secret做短哈希用于缓存Key
   */
  private static hashSecret(secret: string): string {
    return crypto.createHash('md5').update(secret).digest('hex').substring(0, 12);
  }

  /**
   * 常见错误码提示
   */
  private static getErrorHint(errcode: number): string {
    const hints: Record<number, string> = {
      40001: ' - secret无效，请检查是否复制正确',
      40013: ' - corpid无效，请检查企业ID是否正确',
      40056: ' - 不合法的agentid',
      60020: ' - IP不在白名单，请在企微后台添加服务器IP',
      40082: ' - suite_access_token无效或已过期'
    };
    return hints[errcode] || '';
  }

  /**
   * 清除指定配置的Token缓存（同时联动清除WecomApiService的缓存）
   */
  static clearCache(corpId?: string): void {
    if (corpId) {
      for (const key of corpTokenCache.keys()) {
        if (key.includes(corpId)) {
          corpTokenCache.delete(key);
        }
      }
    } else {
      corpTokenCache.clear();
      suiteTokenCache.clear();
    }

    // 联动清除 WecomApiService 中独立维护的 tokenCache/ticketCache
    try {
      const { WecomApiService } = require('../../services/WecomApiService');
      WecomApiService.clearCache(corpId);
    } catch (_e) { /* WecomApiService 不可用时忽略 */ }

    log.info(`[WecomToken] Cache cleared${corpId ? ' for ' + corpId : ' (all)'}`);
  }
}

export default WecomTokenService;

