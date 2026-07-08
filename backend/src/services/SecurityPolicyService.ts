/**
 * 安全策略服务
 * 统一读取"安全配置/安全策略"，供登录、改密、会话超时、IP白名单等安全逻辑使用
 *
 * 策略来源优先级：
 *   1. SaaS 模式：管理后台"配置下发-安全策略"（system_config 表 admin_system_config.distributedConfig.security，非草稿时生效）
 *   2. 租户/私有部署本地"系统设置-安全配置"（system_configs 表 config_group='security_settings'）
 *   3. 系统默认值
 *
 * 私有部署模式下只读本地系统设置（由租户管理员自己配置），不受管理后台下发管控。
 */
import { AppDataSource } from '../config/database';
import { deployConfig } from '../config/deploy';
import { cacheService } from './CacheService';
import { log } from '../config/logger';

export interface SecurityPolicy {
  /** 密码最小长度 */
  passwordMinLength: number;
  /** 密码复杂度要求: uppercase/lowercase/number/special */
  passwordComplexity: string[];
  /** 密码有效期（天），0 = 永不过期 */
  passwordExpireDays: number;
  /** 是否启用登录失败锁定 */
  loginFailLock: boolean;
  /** 最大登录失败次数 */
  maxLoginFails: number;
  /** 锁定时长（分钟），0 = 永久锁定需管理员解锁 */
  lockDuration: number;
  /** 会话超时时间（分钟）：登录后超过该时长强制下线重新登录，0 = 不限制 */
  sessionTimeout: number;
  /** 强制 HTTPS */
  forceHttps: boolean;
  /** IP 白名单（换行分隔），空 = 不限制 */
  ipWhitelist: string;
  /** 策略来源: admin(管理后台下发) / local(本地系统设置) / default(默认值) */
  source: 'admin' | 'local' | 'default';
}

export const DEFAULT_SECURITY_POLICY: Omit<SecurityPolicy, 'source'> = {
  passwordMinLength: 6,
  passwordComplexity: [],
  passwordExpireDays: 0,
  loginFailLock: false,
  maxLoginFails: 5,
  lockDuration: 30,
  sessionTimeout: 120,
  forceHttps: false,
  ipWhitelist: ''
};

/** 策略缓存 TTL（秒）：配置修改后最多延迟 60 秒生效 */
const POLICY_CACHE_TTL = 60;

const toNumber = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const toBoolean = (v: unknown, fallback: boolean): boolean => {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
};

const toComplexityArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.filter(item => typeof item === 'string');
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
};

class SecurityPolicyService {
  /**
   * 获取生效的安全策略
   * @param tenantId 租户ID（登录等无租户上下文场景需显式传入；私有部署可为 null）
   */
  async getPolicy(tenantId?: string | null): Promise<SecurityPolicy> {
    const cacheKey = `security:policy:${tenantId || 'global'}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    let policy: SecurityPolicy;

    // 1. SaaS 模式：管理后台下发的安全策略优先
    const adminPolicy = deployConfig.isSaaS() ? await this.loadAdminDistributedPolicy() : null;
    if (adminPolicy) {
      policy = { ...this.normalize(adminPolicy), source: 'admin' };
    } else {
      // 2. 本地系统设置（租户级）
      const localSettings = await this.loadLocalSecuritySettings(tenantId);
      if (localSettings && Object.keys(localSettings).length > 0) {
        policy = { ...this.normalize(localSettings), source: 'local' };
      } else {
        // 3. 默认值
        policy = { ...DEFAULT_SECURITY_POLICY, source: 'default' };
      }
    }

    cacheService.set(cacheKey, policy, POLICY_CACHE_TTL);
    return policy;
  }

  /**
   * 读取管理后台"配置下发"的安全策略（SaaS 模式）
   * 草稿状态（__draft=true）视为未管控，返回 null
   */
  private async loadAdminDistributedPolicy(): Promise<Record<string, unknown> | null> {
    try {
      const result = await AppDataSource.query(
        `SELECT config_value FROM system_config WHERE config_key = 'admin_system_config' LIMIT 1`
      );
      if (!result || result.length === 0) return null;
      const data = JSON.parse(result[0].config_value || '{}');
      const security = data?.distributedConfig?.security;
      if (!security || typeof security !== 'object' || security.__draft) return null;
      return security;
    } catch (error: any) {
      log.warn('[SecurityPolicy] 读取管理后台下发安全策略失败:', error?.message);
      return null;
    }
  }

  /**
   * 读取本地"系统设置-安全配置"（system_configs 表）
   * 登录场景无租户上下文，需要显式按 tenant_id 查询；私有部署 tenant_id 可能为 NULL
   */
  private async loadLocalSecuritySettings(tenantId?: string | null): Promise<Record<string, unknown> | null> {
    try {
      // 注意：system_configs 表列名为驼峰式（configKey/configValue/valueType/isEnabled），仅 tenant_id 为下划线
      let rows: Array<{ configKey: string; configValue: string; valueType: string; tenant_id: string | null }>;
      if (tenantId) {
        rows = await AppDataSource.query(
          `SELECT configKey, configValue, valueType, tenant_id FROM system_configs
           WHERE configGroup = 'security_settings' AND isEnabled = 1
           AND (tenant_id = ? OR tenant_id IS NULL)
           ORDER BY tenant_id IS NULL ASC`,
          [tenantId]
        );
      } else {
        rows = await AppDataSource.query(
          `SELECT configKey, configValue, valueType, tenant_id FROM system_configs
           WHERE configGroup = 'security_settings' AND isEnabled = 1`
        );
      }
      if (!rows || rows.length === 0) return null;

      const settings: Record<string, unknown> = {};
      for (const row of rows) {
        // 租户专属配置优先（ORDER BY 保证租户行在前，已写入的 key 不被全局行覆盖）
        if (settings[row.configKey] !== undefined) continue;
        settings[row.configKey] = this.parseValue(row.configValue, row.valueType);
      }
      return settings;
    } catch (error: any) {
      log.warn('[SecurityPolicy] 读取本地安全配置失败:', error?.message);
      return null;
    }
  }

  private parseValue(value: string, type: string): unknown {
    try {
      switch (type) {
        case 'number': return Number(value);
        case 'boolean': return value === 'true';
        case 'json': return JSON.parse(value);
        default: return value;
      }
    } catch {
      return value;
    }
  }

  /** 将原始配置对象规范化为完整策略（缺失项用默认值补齐） */
  private normalize(raw: Record<string, unknown>): Omit<SecurityPolicy, 'source'> {
    const d = DEFAULT_SECURITY_POLICY;
    return {
      passwordMinLength: toNumber(raw.passwordMinLength, d.passwordMinLength),
      passwordComplexity: toComplexityArray(raw.passwordComplexity),
      passwordExpireDays: toNumber(raw.passwordExpireDays, d.passwordExpireDays),
      loginFailLock: toBoolean(raw.loginFailLock, d.loginFailLock),
      maxLoginFails: toNumber(raw.maxLoginFails, d.maxLoginFails) || d.maxLoginFails,
      lockDuration: toNumber(raw.lockDuration, d.lockDuration),
      sessionTimeout: toNumber(raw.sessionTimeout, d.sessionTimeout),
      forceHttps: toBoolean(raw.forceHttps, d.forceHttps),
      ipWhitelist: typeof raw.ipWhitelist === 'string' ? raw.ipWhitelist : d.ipWhitelist
    };
  }

  /**
   * 校验密码是否符合策略（长度 + 复杂度）
   */
  validatePassword(password: string, policy: SecurityPolicy): { valid: boolean; message: string } {
    const errors: string[] = [];
    if (!password || password.length < policy.passwordMinLength) {
      errors.push(`密码长度至少${policy.passwordMinLength}位`);
    }
    if (policy.passwordComplexity.includes('uppercase') && !/[A-Z]/.test(password)) {
      errors.push('必须包含大写字母');
    }
    if (policy.passwordComplexity.includes('lowercase') && !/[a-z]/.test(password)) {
      errors.push('必须包含小写字母');
    }
    if (policy.passwordComplexity.includes('number') && !/\d/.test(password)) {
      errors.push('必须包含数字');
    }
    if (policy.passwordComplexity.includes('special') && !/[!@#$%^&*(),.?":{}|<>~`_\-+=[\]\\/;']/.test(password)) {
      errors.push('必须包含特殊字符');
    }
    return { valid: errors.length === 0, message: errors.join('；') };
  }

  /**
   * 校验客户端 IP 是否在白名单内
   * 白名单为空 = 不限制；本机回环地址始终放行（防止管理员把自己锁死）
   * 支持：精确 IP、通配符（192.168.1.*）、前缀（192.168.）
   */
  isIpAllowed(clientIp: string, whitelist: string): boolean {
    const list = (whitelist || '')
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (list.length === 0) return true;

    const normalizedIp = (clientIp || '').replace(/^::ffff:/, '');
    // 回环地址始终放行
    if (normalizedIp === '127.0.0.1' || normalizedIp === '::1' || normalizedIp === 'localhost') {
      return true;
    }

    return list.some(entry => {
      if (entry === normalizedIp || entry === clientIp) return true;
      // 通配符：192.168.1.* → 前缀匹配 192.168.1.
      if (entry.includes('*')) {
        const prefix = entry.substring(0, entry.indexOf('*'));
        return prefix.length > 0 && normalizedIp.startsWith(prefix);
      }
      // 网段前缀：192.168. / 10.0.0
      if (entry.endsWith('.')) {
        return normalizedIp.startsWith(entry);
      }
      return false;
    });
  }

  /**
   * 判断密码是否已过期（基于策略的密码有效期）
   * @returns true = 已过期需要修改
   */
  isPasswordExpired(passwordLastChanged: Date | null | undefined, policy: SecurityPolicy): boolean {
    if (!policy.passwordExpireDays || policy.passwordExpireDays <= 0) return false;
    if (!passwordLastChanged) return true; // 启用有效期但从未改过密码，视为过期
    const ageMs = Date.now() - new Date(passwordLastChanged).getTime();
    return ageMs >= policy.passwordExpireDays * 24 * 60 * 60 * 1000;
  }

  /**
   * 清除策略缓存（安全配置保存 / 管理后台下发保存后调用）
   * @param tenantId 指定租户；不传则清除所有租户的策略缓存
   */
  clearCache(tenantId?: string | null): void {
    if (tenantId) {
      cacheService.delete(`security:policy:${tenantId}`);
      cacheService.delete('security:policy:global');
    } else {
      // 管理后台下发影响所有租户，按前缀清理
      cacheService.deleteByPrefix('security:policy:');
    }
  }
}

export const securityPolicyService = new SecurityPolicyService();
