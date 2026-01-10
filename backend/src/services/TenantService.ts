/**
 * Tenant Service - 租户服务（SaaS 云端版）
 * 提供租户的用户数限制、存储空间限制等功能
 *
 * 与私有部署不同，SaaS 版所有数据都在你的服务器上，可以直接控制
 */
import { AppDataSource } from '../config/database';

export interface TenantInfo {
  id: string;
  name: string;
  code: string;
  maxUsers: number;
  currentUsers: number;
  maxStorageGb: number;
  usedStorageMb: number;
  expireDate: string | null;
  status: string;
  licenseStatus: string;
  features: string[] | null;
}

export interface TenantLimitCheck {
  allowed: boolean;
  message?: string;
  current: number;
  max: number;
}

class TenantService {
  /**
   * 根据租户ID获取租户信息
   */
  async getTenantById(tenantId: string): Promise<TenantInfo | null> {
    try {
      const result = await AppDataSource.query(
        `SELECT t.*, p.max_storage_gb
         FROM tenants t
         LEFT JOIN tenant_packages p ON t.package_id = p.id
         WHERE t.id = ?`,
        [tenantId]
      );

      if (!result || result.length === 0) {
        return null;
      }

      const tenant = result[0];

      // 获取当前用户数
      const userCountResult = await AppDataSource.query(
        `SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND status = 'active'`,
        [tenantId]
      ).catch(() => [{ count: 0 }]);

      // 获取已使用存储空间（MB）
      const storageResult = await this.calculateTenantStorage(tenantId);

      return {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        maxUsers: tenant.max_users || 10,
        currentUsers: userCountResult[0]?.count || 0,
        maxStorageGb: tenant.max_storage_gb || 5,
        usedStorageMb: storageResult,
        expireDate: tenant.expire_date,
        status: tenant.status,
        licenseStatus: tenant.license_status,
        features: tenant.features ? JSON.parse(tenant.features) : null
      };
    } catch (error) {
      console.error('[TenantService] 获取租户信息失败:', error);
      return null;
    }
  }

  /**
   * 检查租户是否可以创建新用户
   */
  async canCreateUser(tenantId: string): Promise<TenantLimitCheck> {
    try {
      const tenant = await this.getTenantById(tenantId);

      if (!tenant) {
        return {
          allowed: false,
          message: '租户不存在',
          current: 0,
          max: 0
        };
      }

      // 检查租户状态
      if (tenant.status !== 'active') {
        return {
          allowed: false,
          message: '租户已被禁用',
          current: tenant.currentUsers,
          max: tenant.maxUsers
        };
      }

      // 检查授权状态
      if (tenant.licenseStatus === 'suspended') {
        return {
          allowed: false,
          message: '租户授权已暂停',
          current: tenant.currentUsers,
          max: tenant.maxUsers
        };
      }

      // 检查是否过期
      if (tenant.expireDate && new Date(tenant.expireDate) < new Date()) {
        return {
          allowed: false,
          message: '租户授权已过期，请续费',
          current: tenant.currentUsers,
          max: tenant.maxUsers
        };
      }

      // 检查用户数限制
      if (tenant.currentUsers >= tenant.maxUsers) {
        return {
          allowed: false,
          message: `用户数已达上限（${tenant.currentUsers}/${tenant.maxUsers}），请升级套餐`,
          current: tenant.currentUsers,
          max: tenant.maxUsers
        };
      }

      return {
        allowed: true,
        current: tenant.currentUsers,
        max: tenant.maxUsers
      };
    } catch (error) {
      console.error('[TenantService] 检查用户数限制失败:', error);
      return {
        allowed: true, // 出错时默认允许
        current: 0,
        max: 999999
      };
    }
  }

  /**
   * 检查租户是否可以上传文件（存储空间限制）
   * @param tenantId 租户ID
   * @param fileSizeMb 要上传的文件大小（MB）
   */
  async canUploadFile(tenantId: string, fileSizeMb: number): Promise<TenantLimitCheck> {
    try {
      const tenant = await this.getTenantById(tenantId);

      if (!tenant) {
        return {
          allowed: false,
          message: '租户不存在',
          current: 0,
          max: 0
        };
      }

      const maxStorageMb = tenant.maxStorageGb * 1024;
      const newUsedMb = tenant.usedStorageMb + fileSizeMb;

      if (newUsedMb > maxStorageMb) {
        return {
          allowed: false,
          message: `存储空间不足（已用 ${(tenant.usedStorageMb / 1024).toFixed(2)}GB / ${tenant.maxStorageGb}GB），请升级套餐`,
          current: tenant.usedStorageMb,
          max: maxStorageMb
        };
      }

      return {
        allowed: true,
        current: tenant.usedStorageMb,
        max: maxStorageMb
      };
    } catch (error) {
      console.error('[TenantService] 检查存储空间失败:', error);
      return {
        allowed: true,
        current: 0,
        max: 999999
      };
    }
  }

  /**
   * 计算租户已使用的存储空间（MB）
   * 统计：附件、录音、图片等文件
   */
  async calculateTenantStorage(tenantId: string): Promise<number> {
    try {
      // 统计各类文件的大小
      // 这里需要根据你的实际表结构来调整
      let totalSizeMb = 0;

      // 1. 统计附件表
      const attachmentResult = await AppDataSource.query(
        `SELECT COALESCE(SUM(file_size), 0) as total FROM attachments WHERE tenant_id = ?`,
        [tenantId]
      ).catch(() => [{ total: 0 }]);
      totalSizeMb += (attachmentResult[0]?.total || 0) / (1024 * 1024);

      // 2. 统计通话录音
      const recordingResult = await AppDataSource.query(
        `SELECT COALESCE(SUM(file_size), 0) as total FROM call_recordings WHERE tenant_id = ?`,
        [tenantId]
      ).catch(() => [{ total: 0 }]);
      totalSizeMb += (recordingResult[0]?.total || 0) / (1024 * 1024);

      // 3. 可以继续添加其他文件类型的统计...

      return Math.round(totalSizeMb * 100) / 100; // 保留2位小数
    } catch (error) {
      console.error('[TenantService] 计算存储空间失败:', error);
      return 0;
    }
  }

  /**
   * 更新租户的用户数（在管理后台修改后调用）
   */
  async updateMaxUsers(tenantId: string, maxUsers: number): Promise<boolean> {
    try {
      await AppDataSource.query(
        `UPDATE tenants SET max_users = ?, updated_at = NOW() WHERE id = ?`,
        [maxUsers, tenantId]
      );
      return true;
    } catch (error) {
      console.error('[TenantService] 更新用户数限制失败:', error);
      return false;
    }
  }

  /**
   * 更新租户的存储空间限制
   */
  async updateMaxStorage(tenantId: string, maxStorageGb: number): Promise<boolean> {
    try {
      // 更新租户表或套餐表
      await AppDataSource.query(
        `UPDATE tenants SET max_storage_gb = ?, updated_at = NOW() WHERE id = ?`,
        [maxStorageGb, tenantId]
      );
      return true;
    } catch (error) {
      console.error('[TenantService] 更新存储空间限制失败:', error);
      return false;
    }
  }

  /**
   * 获取租户使用统计
   */
  async getTenantStats(tenantId: string): Promise<{
    users: { current: number; max: number; remaining: number };
    storage: { usedMb: number; maxGb: number; remainingMb: number };
  }> {
    const tenant = await this.getTenantById(tenantId);

    if (!tenant) {
      return {
        users: { current: 0, max: 0, remaining: 0 },
        storage: { usedMb: 0, maxGb: 0, remainingMb: 0 }
      };
    }

    const maxStorageMb = tenant.maxStorageGb * 1024;

    return {
      users: {
        current: tenant.currentUsers,
        max: tenant.maxUsers,
        remaining: Math.max(0, tenant.maxUsers - tenant.currentUsers)
      },
      storage: {
        usedMb: tenant.usedStorageMb,
        maxGb: tenant.maxStorageGb,
        remainingMb: Math.max(0, maxStorageMb - tenant.usedStorageMb)
      }
    };
  }

  /**
   * 检查功能模块是否可用
   */
  async isFeatureEnabled(tenantId: string, featureCode: string): Promise<boolean> {
    try {
      const tenant = await this.getTenantById(tenantId);

      if (!tenant) {
        return false;
      }

      // 租户被禁用或过期
      if (tenant.status !== 'active' || tenant.licenseStatus === 'suspended') {
        return false;
      }

      if (tenant.expireDate && new Date(tenant.expireDate) < new Date()) {
        return false;
      }

      // 检查功能列表
      if (!tenant.features) {
        return true; // 没有限制时默认所有功能可用
      }

      if (tenant.features.includes('all')) {
        return true;
      }

      return tenant.features.includes(featureCode);
    } catch (error) {
      console.error('[TenantService] 检查功能模块失败:', error);
      return true;
    }
  }
}

export const tenantService = new TenantService();
export default tenantService;
