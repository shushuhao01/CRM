/**
 * License Service - 授权服务
 * 提供授权验证、用户数限制检查等功能
 *
 * 验证模式：
 * 1. 离线模式（默认）：只检查本地 system_license 表
 * 2. 在线模式：定期向管理后台验证授权状态
 */
import { AppDataSource } from '../config/database';
import { License } from '../entities/License';
import { LicenseLog } from '../entities/LicenseLog';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { formatDateTime } from '../utils/dateFormat';
import { getCurrentTenantIdSafe } from '../utils/tenantHelpers';

import { log } from '../config/logger';
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

      // 获取当前用户数（SaaS模式下仅统计当前租户的用户）
      const tenantId = getCurrentTenantIdSafe();
      let userCountQuery = `SELECT COUNT(*) as count FROM users WHERE status = 'active'`;
      const userCountParams: any[] = [];
      if (tenantId) {
        userCountQuery += ` AND tenant_id = ?`;
        userCountParams.push(tenantId);
      }
      const userCountResult = await AppDataSource.query(userCountQuery, userCountParams)
        .catch(() => [{ count: 0 }]);
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
      log.error('[LicenseService] 获取授权信息失败:', error);
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

      const result = await response.json() as { success?: boolean; data?: { valid?: boolean; maxUsers?: number; expiresAt?: string; features?: any; licenseType?: string }; message?: string };

      if (result.success && result.data?.valid) {
        // 更新本地授权信息（同步所有关键字段：maxUsers、expiresAt、features、licenseType）
        const updates: string[] = ['updated_at = NOW()'];
        const values: any[] = [];

        if (result.data.maxUsers != null) {
          updates.push('max_users = ?');
          values.push(result.data.maxUsers);
        }
        if (result.data.expiresAt !== undefined) {
          updates.push('expires_at = ?');
          values.push(result.data.expiresAt);
        }
        if (result.data.features !== undefined) {
          updates.push('features = ?');
          values.push(typeof result.data.features === 'string' ? result.data.features : JSON.stringify(result.data.features));
        }
        if (result.data.licenseType) {
          updates.push('license_type = ?');
          values.push(result.data.licenseType);
        }

        values.push(license_key);
        await AppDataSource.query(
          `UPDATE system_license SET ${updates.join(', ')} WHERE license_key = ?`,
          values
        ).catch(() => {});

        // 清除写入限制缓存，使续费/扩容立即生效
        try {
          const { clearLicenseWriteCache } = await import('../middleware/checkLicenseWrite');
          clearLicenseWriteCache();
        } catch {}

        const cacheData = { valid: true, maxUsers: result.data.maxUsers };
        onlineVerifyCache = { data: cacheData, timestamp: Date.now() };
        return cacheData;
      }

      // 验证失败
      const cacheData = { valid: false, message: result.message || '授权验证失败' };
      onlineVerifyCache = { data: cacheData, timestamp: Date.now() };
      return cacheData;
    } catch (error) {
      log.error('[LicenseService] 在线验证失败:', error);
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
      log.error('[LicenseService] 检查用户数限制失败:', error);
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
      log.error('[LicenseService] 检查功能模块失败:', error);
      return true; // 出错时默认允许
    }
  }

  /**
   * 清除在线验证缓存
   */
  clearCache() {
    onlineVerifyCache = null;
  }

  // ===== Admin管理后台所需的CRUD方法 =====

  async createLicense(data: {
    customerName: string; customerContact?: string; customerPhone?: string;
    customerEmail?: string; licenseType: string; maxUsers?: number;
    maxStorageGb?: number; features?: string[]; expiresAt?: Date; notes?: string; createdBy?: string;
  }) {
    const id = crypto.randomUUID();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segs = Array.from({length:4}, () => Array.from({length:4}, () => chars[Math.floor(Math.random()*chars.length)]).join(''));
    const licenseKey = `PRIVATE-${segs.join('-')}`;
    const now = formatDateTime(new Date());
    const expiresAt = data.expiresAt ? formatDateTime(data.expiresAt) : null;
    await AppDataSource.query(
      `INSERT INTO licenses (id,license_key,customer_name,customer_contact,customer_phone,customer_email,license_type,max_users,max_storage_gb,features,expires_at,status,notes,created_by,customer_type,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending',?,?,?,NOW(),NOW())`,
      [id,licenseKey,data.customerName,data.customerContact,data.customerPhone,data.customerEmail,
       data.licenseType,data.maxUsers||10,data.maxStorageGb||5,JSON.stringify(data.features||[]),
       expiresAt,data.notes,data.createdBy,'saas']
    );
    const rows = await AppDataSource.query('SELECT * FROM licenses WHERE id=?',[id]);
    return rows[0];
  }

  async getLicenseList(params: { page?:number; pageSize?:number; keyword?:string; status?:string; licenseType?:string; sortBy?:string; sortOrder?:'ASC'|'DESC' }) {
    const { page=1, pageSize=20, keyword, status, licenseType, sortBy='created_at', sortOrder='DESC' } = params;
    const offset = (page-1)*pageSize;
    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    if (keyword) { conditions.push('(customer_name LIKE ? OR license_key LIKE ?)'); values.push(`%${keyword}%`,`%${keyword}%`); }
    if (status)  { conditions.push('status=?'); values.push(status); }
    if (licenseType) { conditions.push('license_type=?'); values.push(licenseType); }
    const where = conditions.join(' AND ');
    const safeSortBy = ['created_at','expires_at','customer_name','status'].includes(sortBy) ? sortBy : 'created_at';
    const [list, countRows] = await Promise.all([
      AppDataSource.query(`SELECT * FROM licenses WHERE ${where} ORDER BY ${safeSortBy} ${sortOrder} LIMIT ? OFFSET ?`,[...values,pageSize,offset]),
      AppDataSource.query(`SELECT COUNT(*) as total FROM licenses WHERE ${where}`,values)
    ]);
    return { list, total: Number(countRows[0]?.total)||0 };
  }

  async getLicenseById(id: string) {
    const rows = await AppDataSource.query('SELECT * FROM licenses WHERE id=?',[id]);
    return rows[0] || null;
  }

  async updateLicense(id: string, data: any) {
    const sets: string[] = [];
    const values: any[] = [];
    const allowed = ['customer_name','customer_contact','customer_phone','customer_email','license_type','max_users','max_storage_gb','features','expires_at','notes','status','wecom_chat_archive_auth'];
    for (const [k,v] of Object.entries(data)) {
      if (allowed.includes(k)) { sets.push(`${k}=?`); values.push(v); }
    }
    if (sets.length===0) { const r = await AppDataSource.query('SELECT * FROM licenses WHERE id=?',[id]); return r[0]; }
    await AppDataSource.query(`UPDATE licenses SET ${sets.join(',')},updated_at=NOW() WHERE id=?`,[...values,id]);
    const rows = await AppDataSource.query('SELECT * FROM licenses WHERE id=?',[id]);
    return rows[0];
  }

  async deleteLicense(id: string) {
    await AppDataSource.query('DELETE FROM licenses WHERE id=?',[id]);
  }

  async activateLicense(id: string, _machineId?: string) {
    await AppDataSource.query(`UPDATE licenses SET status='active',activated_at=NOW(),updated_at=NOW() WHERE id=?`,[id]);
    const rows = await AppDataSource.query('SELECT * FROM licenses WHERE id=?',[id]);
    return rows[0];
  }

  async deactivateLicense(id: string, _reason?: string) {
    await AppDataSource.query(`UPDATE licenses SET status='revoked',updated_at=NOW() WHERE id=?`,[id]);
    const rows = await AppDataSource.query('SELECT * FROM licenses WHERE id=?',[id]);
    return rows[0];
  }

  async renewLicense(id: string, expiresAt: Date) {
    const exp = formatDateTime(expiresAt);
    await AppDataSource.query(`UPDATE licenses SET expires_at=?,status='active',updated_at=NOW() WHERE id=?`,[exp,id]);
    const rows = await AppDataSource.query('SELECT * FROM licenses WHERE id=?',[id]);
    return rows[0];
  }

  async verifyLicense(licenseKey: string, _machineId?: string) {
    const rows = await AppDataSource.query('SELECT * FROM licenses WHERE license_key=?',[licenseKey]);
    const lic = rows[0];
    if (!lic) return { valid:false, message:'授权码不存在' };
    if (lic.status==='revoked') return { valid:false, message:'授权已吊销' };
    if (lic.expires_at && new Date(lic.expires_at)<new Date()) return { valid:false, message:'授权已过期' };
    return { valid:true, message:'授权有效', license:lic };
  }

  async getLicenseLogs(id: string, params: { page?:number; pageSize?:number }) {
    const { page=1, pageSize=20 } = params;
    const offset = (page-1)*pageSize;
    const [list, countRows] = await Promise.all([
      AppDataSource.query('SELECT * FROM license_logs WHERE license_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?',[id,pageSize,offset]),
      AppDataSource.query('SELECT COUNT(*) as total FROM license_logs WHERE license_id=?',[id])
    ]);
    return { list, total: Number(countRows[0]?.total)||0 };
  }

  async getStatistics() {
    const [total,active,expired,pending,revoked] = await Promise.all([
      AppDataSource.query('SELECT COUNT(*) as c FROM licenses'),
      AppDataSource.query("SELECT COUNT(*) as c FROM licenses WHERE status='active'"),
      AppDataSource.query("SELECT COUNT(*) as c FROM licenses WHERE status='expired' OR (expires_at IS NOT NULL AND expires_at < NOW())"),
      AppDataSource.query("SELECT COUNT(*) as c FROM licenses WHERE status='pending'"),
      AppDataSource.query("SELECT COUNT(*) as c FROM licenses WHERE status='revoked'")
    ]);
    return {
      total:   Number(total[0]?.c)||0,
      active:  Number(active[0]?.c)||0,
      expired: Number(expired[0]?.c)||0,
      pending: Number(pending[0]?.c)||0,
      revoked: Number(revoked[0]?.c)||0
    };
  }
}

export const licenseService = new LicenseService();
export default licenseService;
