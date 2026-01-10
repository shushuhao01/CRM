/**
 * License Service - 授权服务
 * 提供授权验证、用户数限制检查等功能
 *
 * 验证模式：
 * 1. 离线模式（默认）：只检查本地 system_license 表
 * 2. 在线模式：定期向管理后台验证授权状态
 */
import { AppDataSource } from '../config/database';

export interface LicenseInfo {
  activated: boolean;
  expired: boolean;
  licenseType: string;
  maxUsers: number;
  currentUsers: number;
  customerName: string;
  expiresAt: string | null;
  features: string[] | null;
}

// 缓存在线验证结果，避免频繁请求
let onlineVerifyCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

class LicenseService {
  /**
   * 获取当前授权信息（本地）
   */
  async getLicenseInfo(): Promise<LicenseInfo | null> {
    try {
      const result = await AppDataSource.query(
        `SELECT * FROM system_license WHERE status = 'active' LIMIT 1`
      ).catch(() => []);

      if (!result || result.length === 0) {
        return null;
      }

      const license = result[0];
      const isExpired = license.expires_at && new Date(license.expires_at) < new Date();

      // 获取当前用户数
      const userCountResult = await AppDataSource.query(
        `SELECT COUNT(*) as count FROM users WHERE status = 'active'`
      ).catch(() => [{ count: 0 }]);
      const currentUsers = userCountResult[0]?.count || 0;

      return {
        activated: true,
        expired: isExpired,
        licenseType: license.license_type,
        maxUsers: license.max_users || 50,
        currentUsers,
        customerName: license.customer_name,
        expiresAt: license.expires_at,
        features: license.features ? JSON.parse(license.features) : null
      };
    } catch (error) {
      console.error('[LicenseService] 获取授权信息失败:', error);
      return null;
    }
  }

  /**
   * 在线验证授权（向管理后台请求最新授权信息）
   * 用于定期同步授权状态，防止本地数据被篡改
   */
  async verifyOnline(): Promise<{ valid: boolean; maxUsers?: number; message?: string }> {
    try {
      // 检查缓存
      if (onlineVerifyCache && Date.now() - onlineVerifyCache.timestamp < CACHE_TTL) {
        return onlineVerifyCache.data;
      }

      // 获取本地授权信息
      const localLicense = await AppDataSource.query(
        `SELECT license_key, machine_id FROM system_license WHERE status = 'active' LIMIT 1`
      ).catch(() => []);

      if (!localLicense || localLicense.length === 0) {
        return { valid: false, message: '系统未激活' };
      }

      const { license_key, machine_id } = localLicense[0];
      const adminApiUrl = process.env.ADMIN_API_URL || 'http://localhost:3000/api/v1/admin';

      // 请求管理后台验证
      const response = await fetch(`${adminApiUrl}/verify/license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: license_key, machineId: machine_id })
      });

      const result = await response.json() as { success?: boolean; data?: { valid?: boolean; maxUsers?: number }; message?: string };

      if (result.success && result.data?.valid) {
        // 更新本地授权信息（同步最新的 maxUsers）
        await AppDataSource.query(
          `UPDATE system_license SET max_users = ?, updated_at = NOW() WHERE license_key = ?`,
          [result.data.maxUsers, license_key]
        ).catch(() => {});

        const cacheData = { valid: true, maxUsers: result.data.maxUsers };
        onlineVerifyCache = { data: cacheData, timestamp: Date.now() };
        return cacheData;
      }

      // 验证失败
      const cacheData = { valid: false, message: result.message || '授权验证失败' };
      onlineVerifyCache = { data: cacheData, timestamp: Date.now() };
      return cacheData;
    } catch (error) {
      console.error('[LicenseService] 在线验证失败:', error);
      // 网络错误时，使用本地数据（离线模式）
      return { valid: true, message: '离线模式' };
    }
  }

  /**
   * 检查是否可以创建新用户
   * @param useOnlineVerify 是否使用在线验证（默认 false，使用本地数据）
   */
  async canCreateUser(useOnlineVerify = false): Promise<{
    canCreate: boolean;
    message?: string;
    currentUsers: number;
    maxUsers: number;
  }> {
    try {
      // 如果启用在线验证，先同步最新授权信息
      if (useOnlineVerify) {
        const onlineResult = await this.verifyOnline();
        if (!onlineResult.valid) {
          return {
            canCreate: false,
            message: onlineResult.message || '授权验证失败',
            currentUsers: 0,
            maxUsers: 0
          };
        }
      }

      const licenseInfo = await this.getLicenseInfo();

      // 如果没有激活授权，默认允许（开发模式）
      if (!licenseInfo) {
        return {
          canCreate: true,
          currentUsers: 0,
          maxUsers: 999999
        };
      }

      // 检查授权是否过期
      if (licenseInfo.expired) {
        return {
          canCreate: false,
          message: '系统授权已过期，请联系管理员续期',
          currentUsers: licenseInfo.currentUsers,
          maxUsers: licenseInfo.maxUsers
        };
      }

      // 检查用户数是否超过限制
      if (licenseInfo.currentUsers >= licenseInfo.maxUsers) {
        return {
          canCreate: false,
          message: `用户数已达上限（${licenseInfo.currentUsers}/${licenseInfo.maxUsers}），请联系管理员升级授权`,
          currentUsers: licenseInfo.currentUsers,
          maxUsers: licenseInfo.maxUsers
        };
      }

      return {
        canCreate: true,
        currentUsers: licenseInfo.currentUsers,
        maxUsers: licenseInfo.maxUsers
      };
    } catch (error) {
      console.error('[LicenseService] 检查用户数限制失败:', error);
      // 出错时默认允许创建
      return {
        canCreate: true,
        currentUsers: 0,
        maxUsers: 999999
      };
    }
  }

  /**
   * 获取用户数统计
   */
  async getUserStats(): Promise<{ current: number; max: number; remaining: number }> {
    const licenseInfo = await this.getLicenseInfo();

    if (!licenseInfo) {
      return { current: 0, max: 999999, remaining: 999999 };
    }

    return {
      current: licenseInfo.currentUsers,
      max: licenseInfo.maxUsers,
      remaining: Math.max(0, licenseInfo.maxUsers - licenseInfo.currentUsers)
    };
  }

  /**
   * 检查功能模块是否可用
   */
  async isFeatureEnabled(featureCode: string): Promise<boolean> {
    try {
      const licenseInfo = await this.getLicenseInfo();

      // 没有授权信息时，默认所有功能可用（开发模式）
      if (!licenseInfo) {
        return true;
      }

      // 授权过期时，所有功能不可用
      if (licenseInfo.expired) {
        return false;
      }

      // 检查功能列表
      if (!licenseInfo.features) {
        return true; // 没有限制功能列表时，默认所有功能可用
      }

      // 如果 features 包含 'all'，则所有功能可用
      if (licenseInfo.features.includes('all')) {
        return true;
      }

      return licenseInfo.features.includes(featureCode);
    } catch (error) {
      console.error('[LicenseService] 检查功能模块失败:', error);
      return true; // 出错时默认允许
    }
  }

  /**
   * 清除在线验证缓存
   */
  clearCache() {
    onlineVerifyCache = null;
  }
}

export const licenseService = new LicenseService();
export default licenseService;
