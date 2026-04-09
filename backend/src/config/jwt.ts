import { log } from './logger';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;  // 修改为string以匹配User.id类型
  username: string;
  role: string;
  departmentId?: string | null;  // 修改为string以匹配Department.id类型
  tenantId?: string | null;  // 租户ID（SaaS模式）
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// 🔒 已知的不安全默认密钥黑名单 — 禁止在生产环境中使用
const INSECURE_SECRETS = [
  'crm-secret-key',
  'your-refresh-secret-key',
  'your-secret-key',
  'admin-secret-key',
  'secret',
  'your_jwt_secret_key_here_change_in_production',
  'your_jwt_refresh_secret_key_here_change_in_production',
  'your-super-secret-jwt-key-change-in-production',
  'your-refresh-secret-key-change-in-production',
  'member-center-secret-key-2026',
];

/**
 * 🔒 获取安全的JWT密钥
 * - 生产环境：必须从环境变量读取，且不能是已知弱密钥，否则自动生成随机密钥并发出严重警告
 * - 开发环境：允许使用默认值但输出警告
 */
function getSecureSecret(envKey: string, label: string): string {
  const envValue = process.env[envKey];
  const isProduction = process.env.NODE_ENV === 'production';

  // 环境变量已设置且不在弱密钥黑名单中 → 直接使用
  if (envValue && !INSECURE_SECRETS.includes(envValue)) {
    return envValue;
  }

  if (isProduction) {
    // 🚨 生产环境：密钥不安全，自动生成随机密钥（每次重启不同，会导致旧Token失效）
    const randomSecret = crypto.randomBytes(64).toString('hex');
    log.error(`🚨🚨🚨 [安全严重警告] ${label} 未配置安全密钥！`);
    log.error(`   环境变量 ${envKey} 未设置或使用了不安全的默认值。`);
    log.error(`   已自动生成临时随机密钥（服务重启后所有用户需重新登录）。`);
    log.error(`   请立即在 .env 文件中设置强密钥：`);
    log.error(`   ${envKey}=${crypto.randomBytes(32).toString('hex')}`);
    log.error(`🚨🚨🚨`);
    return randomSecret;
  }

  // 开发环境：使用默认值但输出一次性警告
  const fallback = envKey === 'JWT_SECRET' ? 'crm-dev-secret-do-not-use-in-prod' : 'crm-refresh-dev-secret-do-not-use-in-prod';
  if (!envValue) {
    log.warn(`⚠️ [JWT] 开发环境：${envKey} 未设置，使用内置开发密钥（禁止用于生产环境）`);
  }
  return envValue || fallback;
}

export class JwtConfig {
  private static readonly ACCESS_TOKEN_SECRET: string = getSecureSecret('JWT_SECRET', 'JWT访问令牌');
  private static readonly REFRESH_TOKEN_SECRET: string = getSecureSecret('JWT_REFRESH_SECRET', 'JWT刷新令牌');
  private static readonly ACCESS_TOKEN_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly REFRESH_TOKEN_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  /** 获取当前使用的AccessToken密钥（供其他模块统一引用，避免各自硬编码默认值） */
  static getAccessTokenSecret(): string {
    return this.ACCESS_TOKEN_SECRET;
  }

  /**
   * 生成访问令牌
   */
  static generateAccessToken(payload: JwtPayload): string {
    // 使用非常长的token有效期，避免频繁过期
    // 开发环境：365天，生产环境：使用配置的时间（默认7天）
    const expiresIn: string = process.env.NODE_ENV === 'development' ? '365d' : this.ACCESS_TOKEN_EXPIRES_IN;

    // 仅开发环境输出日志
    if (process.env.NODE_ENV === 'development') {
      log.info('[JWT] 生成访问令牌，有效期:', expiresIn);
    }

    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn,
      issuer: 'crm-system',
      audience: 'crm-users'
    } as SignOptions);
  }

  /**
   * 生成刷新令牌
   */
  static generateRefreshToken(payload: JwtPayload): string {
    // 开发环境使用更长的刷新token有效期
    const expiresIn: string = process.env.NODE_ENV === 'development' ? '90d' : this.REFRESH_TOKEN_EXPIRES_IN;

    return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
      expiresIn,
      issuer: 'crm-system',
      audience: 'crm-users'
    } as SignOptions);
  }

  /**
   * 生成令牌对
   */
  static generateTokenPair(payload: JwtPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * 验证访问令牌
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        issuer: 'crm-system',
        audience: 'crm-users'
      }) as JwtPayload;

      return payload;
    } catch (error) {
      // 仅在开发环境输出错误详情
      if (process.env.NODE_ENV === 'development') {
        log.error('[JWT] Token验证失败:', error instanceof Error ? error.message : '未知错误');
      }
      throw new Error('Invalid access token');
    }
  }

  /**
   * 验证刷新令牌
   */
  static verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
        issuer: 'crm-system',
        audience: 'crm-users'
      }) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * 解码令牌（不验证）
   */
  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查令牌是否即将过期（30分钟内）
   */
  static isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;

      const expirationTime = decoded.exp * 1000; // 转换为毫秒
      const currentTime = Date.now();
      const thirtyMinutes = 30 * 60 * 1000; // 30分钟

      return (expirationTime - currentTime) < thirtyMinutes;
    } catch (error) {
      return true;
    }
  }
}

/**
 * 🔒 统一的bcrypt salt rounds配置
 * 从环境变量 BCRYPT_ROUNDS 读取，默认12轮
 * 所有密码哈希操作应使用此常量，避免各处硬编码不同的值
 */
export const BCRYPT_ROUNDS: number = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
