/**
 * SaaS 平台守卫服务
 *
 * 核心安全机制：防止私有部署客户擅自切换为 SaaS 模式运营
 *
 * 原理：
 *   1. SaaS 模式启动时需要提供 SAAS_LICENSE_TOKEN（RS256 签名的 JWT）
 *   2. Token 由平台运营方使用私钥签发（私钥绝不随代码交付）
 *   3. 后端用硬编码的公钥验证 Token 签名 —— 客户无私钥，无法伪造
 *   4. 验证失败时自动降级为私有部署模式（系统可正常运行，但无多租户能力）
 *   5. 运行时定期重新验证，防止中途篡改
 */

import jwt from 'jsonwebtoken';
import { log } from '../config/logger';

// ==================== RSA 公钥（硬编码，安全：仅用于验证，无法签发） ====================
const SAAS_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq06YOg+NPHUHA8Saals/
827ZCwb+mHYa+aDdt6Tda4odXC7vtpaCPafYSusczzPaQrYE4UXrvY0jMcpyO2xs
LLbHuHHZU9D7KEm8ctdmR+fF5bi4zj8ZiuJ7g1vjgsUEHrSdQVV4epKG3MHLri7P
9kl/R7opQlBKX5Lp3GcAARbfDpz7WQOelpxYvl3EFQz+826QdupKtpjLzYE5/dkk
dQ3Wi0uWT5ovrRIRGBQ2dy4Mu+mjSeGItT9ohzLrD40m8bIzvMbqqw0eKgw5uL01
CbVBmZlL1qh5MiiheuHKrJ2HW7jc+FCT+rfMHs93MKYkCXegQCsNLs6YJ4ZlJ+9u
GQIDAQAB
-----END PUBLIC KEY-----`;

// Token 签名算法
const ALGORITHM = 'RS256';

// 定期验证间隔（毫秒）：每小时检查一次
const VERIFY_INTERVAL = 60 * 60 * 1000;

export interface SaaSLicensePayload {
  type: string;
  mode: string;
  allowedDomains: string[];
  maxTenants: number;
  iat: number;
  exp: number;
  licenseId: string;
  version: number;
}

class SaaSGuardServiceClass {
  /** 当前验证状态 */
  private verified: boolean = false;

  /** 解析后的许可证信息 */
  private licenseInfo: SaaSLicensePayload | null = null;

  /** 定期验证定时器 */
  private verifyTimer: NodeJS.Timeout | null = null;

  /** 最后一次验证时间 */
  private lastVerifyTime: number = 0;

  /** 降级原因 */
  private degradeReason: string = '';

  /**
   * 初始化 SaaS 守卫
   * 在系统启动时调用，验证 SaaS 许可证
   *
   * @returns 是否验证通过
   */
  initialize(): boolean {
    const deployMode = process.env.DEPLOY_MODE || 'private';

    // 非 SaaS 模式无需验证
    if (deployMode !== 'saas') {
      log.info('[SaaSGuard] 当前为私有部署模式，无需 SaaS 许可验证');
      this.verified = false;
      return false;
    }

    // SaaS 模式：执行许可验证
    log.info('[SaaSGuard] 检测到 DEPLOY_MODE=saas，开始验证 SaaS 平台许可...');

    const token = process.env.SAAS_LICENSE_TOKEN;
    if (!token) {
      this.degradeToPrivate('未提供 SAAS_LICENSE_TOKEN，SaaS 功能不可用');
      return false;
    }

    // 验证 Token
    const result = this.verifyToken(token);
    if (!result.valid) {
      this.degradeToPrivate(result.reason || 'Token 验证失败');
      return false;
    }

    // 验证通过
    this.verified = true;
    this.licenseInfo = result.payload!;
    this.lastVerifyTime = Date.now();

    log.info('[SaaSGuard] ✅ SaaS 平台许可验证通过！');
    log.info(`[SaaSGuard]   许可证ID: ${this.licenseInfo.licenseId}`);
    log.info(`[SaaSGuard]   绑定域名: ${this.licenseInfo.allowedDomains.join(', ')}`);
    log.info(`[SaaSGuard]   最大租户数: ${this.licenseInfo.maxTenants || '无限制'}`);
    log.info(`[SaaSGuard]   过期时间: ${new Date(this.licenseInfo.exp * 1000).toISOString()}`);

    // 启动定期验证
    this.startPeriodicVerify();

    return true;
  }

  /**
   * 验证 JWT Token
   */
  private verifyToken(token: string): { valid: boolean; reason?: string; payload?: SaaSLicensePayload } {
    try {
      const decoded = jwt.verify(token, SAAS_PUBLIC_KEY, {
        algorithms: [ALGORITHM]
      }) as SaaSLicensePayload;

      // 验证 payload 字段
      if (decoded.type !== 'saas_platform_license') {
        return { valid: false, reason: 'Token 类型不正确（非 SaaS 平台许可）' };
      }

      if (decoded.mode !== 'saas') {
        return { valid: false, reason: 'Token 模式不匹配（非 saas 模式）' };
      }

      if (decoded.version !== 1) {
        return { valid: false, reason: `Token 版本不支持（当前版本: ${decoded.version}）` };
      }

      // 过期时间检查（jwt.verify 已做，但这里再确认一次）
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return { valid: false, reason: 'SaaS 许可证已过期' };
      }

      return { valid: true, payload: decoded };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, reason: 'SaaS 许可证已过期' };
      }
      if (error.name === 'JsonWebTokenError') {
        return { valid: false, reason: `Token 签名验证失败: ${error.message}` };
      }
      return { valid: false, reason: `Token 验证异常: ${error.message}` };
    }
  }

  /**
   * 降级为私有部署模式
   */
  private degradeToPrivate(reason: string): void {
    this.verified = false;
    this.licenseInfo = null;
    this.degradeReason = reason;

    log.warn('[SaaSGuard] ⚠️ SaaS 许可验证失败，自动降级为私有部署模式');
    log.warn(`[SaaSGuard] 原因: ${reason}`);
    log.warn('[SaaSGuard] 系统将以私有部署模式正常运行，多租户功能不可用');
  }

  /**
   * 启动定期验证
   * 每小时重新验证 Token，确保运行期间许可持续有效
   */
  private startPeriodicVerify(): void {
    if (this.verifyTimer) {
      clearInterval(this.verifyTimer);
    }

    this.verifyTimer = setInterval(() => {
      const token = process.env.SAAS_LICENSE_TOKEN;
      if (!token) {
        this.degradeToPrivate('SAAS_LICENSE_TOKEN 已被移除');
        this.stopPeriodicVerify();
        return;
      }

      const result = this.verifyToken(token);
      if (!result.valid) {
        this.degradeToPrivate(result.reason || 'Token 定期验证失败');
        this.stopPeriodicVerify();
        return;
      }

      this.lastVerifyTime = Date.now();
      log.debug('[SaaSGuard] 定期验证通过');
    }, VERIFY_INTERVAL);

    // 允许进程正常退出
    if (this.verifyTimer.unref) {
      this.verifyTimer.unref();
    }
  }

  /**
   * 停止定期验证
   */
  private stopPeriodicVerify(): void {
    if (this.verifyTimer) {
      clearInterval(this.verifyTimer);
      this.verifyTimer = null;
    }
  }

  // ==================== 公共接口 ====================

  /**
   * 检查 SaaS 模式是否已验证通过
   * 这是核心判断方法，所有 SaaS 功能的开关
   */
  isVerified(): boolean {
    return this.verified;
  }

  /**
   * 获取许可证信息
   */
  getLicenseInfo(): SaaSLicensePayload | null {
    return this.licenseInfo;
  }

  /**
   * 获取最大租户数限制
   */
  getMaxTenants(): number {
    return this.licenseInfo?.maxTenants || 0; // 0 = 无限制
  }

  /**
   * 获取允许的域名列表
   */
  getAllowedDomains(): string[] {
    return this.licenseInfo?.allowedDomains || [];
  }

  /**
   * 获取降级原因（用于日志/调试）
   */
  getDegradeReason(): string {
    return this.degradeReason;
  }

  /**
   * 获取状态摘要（用于系统信息接口）
   */
  getStatus(): {
    saasAuthorized: boolean;
    licenseId?: string;
    maxTenants?: number;
    expiresAt?: string;
    lastVerifyTime?: string;
    degradeReason?: string;
  } {
    if (this.verified && this.licenseInfo) {
      return {
        saasAuthorized: true,
        licenseId: this.licenseInfo.licenseId,
        maxTenants: this.licenseInfo.maxTenants,
        expiresAt: new Date(this.licenseInfo.exp * 1000).toISOString(),
        lastVerifyTime: new Date(this.lastVerifyTime).toISOString()
      };
    }
    return {
      saasAuthorized: false,
      degradeReason: this.degradeReason || '未启用 SaaS 模式'
    };
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopPeriodicVerify();
    this.verified = false;
    this.licenseInfo = null;
  }
}

// 导出单例
export const SaaSGuardService = new SaaSGuardServiceClass();

