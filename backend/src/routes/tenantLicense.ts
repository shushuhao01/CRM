/**
 * Tenant License Routes - 租户授权验证（供CRM前端调用）
 * 类似企业微信的企业ID验证流程
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { adminNotificationService } from '../services/AdminNotificationService';
import { getTenantResourceUsage } from '../middleware/checkTenantLimits';

import { log } from '../config/logger';
const router = Router();

// 🔥 正确获取客户端IP（支持代理/反向代理）
const getClientIp = (req: Request): string => {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const first = Array.isArray(xff) ? xff[0] : xff.split(',')[0];
    return first.trim();
  }
  const xri = req.headers['x-real-ip'];
  if (xri) {
    return Array.isArray(xri) ? xri[0] : xri;
  }
  const ip = req.ip || req.socket?.remoteAddress || '';
  return ip.replace(/^::ffff:/, '');
};

/**
 * 安全解析JSON：兼容TEXT列（字符串）和JSON列（已自动解析为对象/数组）
 */
function safeJsonParse(val: any): any {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return null; }
  }
  return null;
}

/**
 * 检查私有部署激活状态（无需认证）
 * 私有部署模式下，检查是否已有激活的租户
 * 如果已激活，返回租户信息，前端可直接跳过授权码输入
 */
router.get('/check-private', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      `SELECT t.id, t.name, t.code, t.license_status, t.status, t.expire_date,
              t.max_users, t.features,
              p.name as package_name, p.features as package_features
       FROM tenants t
       LEFT JOIN tenant_packages p ON t.package_id = p.id
       WHERE t.license_status IN ('active', 'paid') AND t.status != 'disabled'
       ORDER BY t.activated_at DESC
       LIMIT 1`
    );
    const tenant = rows[0];

    if (!tenant) {
      return res.json({ success: true, data: { activated: false } });
    }

    if (tenant.expire_date && new Date(tenant.expire_date) < new Date()) {
      return res.json({
        success: true,
        data: { activated: false, message: '授权已过期，请重新激活或续费' }
      });
    }

    res.json({
      success: true,
      data: {
        activated: true,
        tenantId: tenant.id,
        tenantCode: tenant.code,
        tenantName: tenant.name,
        packageName: tenant.package_name,
        maxUsers: tenant.max_users,
        expireDate: tenant.expire_date,
        features: safeJsonParse(tenant.features),
        packageFeatures: safeJsonParse(tenant.package_features),
        deployType: 'private'   // 私有激活检查返回的始终是private
      }
    });
  } catch (error: any) {
    log.error('[Tenant License] Check private activation failed:', error);
    res.json({ success: true, data: { activated: false } });
  }
});

/**
 * 验证租户授权码
 * 支持两种授权码：
 *   PRIVATE-XXXX-XXXX-XXXX-XXXX → 私有部署授权码（查 licenses 表）
 *   TENANT-XXXX 或 LIC-XXXX    → SaaS租户授权码（查 tenants 表）
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { licenseKey } = req.body;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    if (!licenseKey) {
      return res.status(400).json({ success: false, message: '请输入授权码' });
    }

    // ============ 私有部署授权码（PRIVATE- 前缀）============
    if (licenseKey.toUpperCase().startsWith('PRIVATE-')) {
      const rows = await AppDataSource.query(
        `SELECT l.*, pc.customer_name as company_name
         FROM licenses l
         LEFT JOIN private_customers pc ON l.private_customer_id = pc.id
         WHERE l.license_key = ? AND l.customer_type = 'private'`,
        [licenseKey]
      );
      const lic = rows[0];

      if (!lic) {
        await AppDataSource.query(
          `INSERT INTO license_logs (id, license_id, license_key, action, result, message, ip_address, user_agent)
           VALUES (?, NULL, ?, 'verify', 'failed', '私有授权码不存在', ?, ?)`,
          [uuidv4(), licenseKey, ip, userAgent]
        ).catch(() => {});
        return res.status(404).json({
          success: false,
          message: '该授权码为私有部署专用，不能在租户系统中使用。请使用租户授权码（TENANT-前缀）或联系管理员',
          errorType: 'WRONG_LICENSE_TYPE'
        });
      }

      if (lic.status === 'revoked') {
        return res.status(403).json({ success: false, message: '该授权已被吊销，请联系管理员' });
      }
      if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
        return res.status(403).json({ success: false, message: '授权已过期，请联系管理员续费', expireDate: lic.expires_at });
      }

      // 私有授权码激活：检查本地 tenants 表是否已有该授权码对应的租户
      const existTenants = await AppDataSource.query(
        `SELECT id, name, code, license_status, expire_date FROM tenants WHERE license_key = ?`,
        [licenseKey]
      );
      let tenant = existTenants[0];

      if (!tenant) {
        // 首次激活：在本地 tenants 表创建私有租户记录
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const tenantId = uuidv4();
        // 生成私有编码（P前缀区分私有）
        const tenantCode = `P${new Date().getFullYear().toString().slice(2)}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}${Math.random().toString(36).substring(2,6).toUpperCase()}`;
        await AppDataSource.query(
          `INSERT INTO tenants (id, name, code, license_key, license_status, max_users, max_storage_gb, features, status, activated_at, expire_date, last_verify_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'active', ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
          [
            tenantId,
            lic.customer_name || lic.company_name || '私有部署企业',
            tenantCode,
            licenseKey,
            lic.max_users || 50,
            lic.max_storage_gb || 50,
            lic.features || '[]',
            now, // activated_at
            lic.expires_at || null,
            now, // last_verify_at
            now, // created_at
            now  // updated_at
          ]
        );
        // 更新 licenses 表状态
        await AppDataSource.query(`UPDATE licenses SET status = 'active', activated_at = ? WHERE id = ?`, [now, lic.id]);
        tenant = { id: tenantId, name: lic.customer_name || '私有部署企业', code: tenantCode, license_status: 'active', expire_date: lic.expires_at };
        log.info(`[TenantLicense] 私有授权码首次激活，创建本地租户: ${tenant.name} (${tenantCode})`);

        // 通知管理员
        adminNotificationService.notify('tenant_login', {
          title: `私有客户首次激活：${tenant.name}`,
          content: `私有部署客户「${tenant.name}」（编码：${tenantCode}）首次激活系统，IP：${ip || '未知'}`,
          relatedId: tenant.id,
          relatedType: 'tenant',
          extraData: { tenantName: tenant.name, tenantCode, ip, deployType: 'private' }
        }).catch((err: any) => log.error('[TenantLicense] 通知失败:', err.message));
      } else {
        // 已激活：更新验证时间
        await AppDataSource.query(`UPDATE tenants SET last_verify_at = NOW() WHERE id = ?`, [tenant.id]);
      }

      return res.json({
        success: true,
        data: {
          tenantId: tenant.id,
          tenantCode: tenant.code,
          tenantName: tenant.name,
          packageName: '私有部署版',
          maxUsers: lic.max_users || 50,
          expireDate: lic.expires_at,
          features: safeJsonParse(lic.features),
          packageFeatures: null,
          deployType: 'private'   // 🔑 关键标识：告诉前端这是私有部署
        },
        message: '私有授权码验证成功'
      });
    }

    // ============ SaaS 租户授权码（TENANT- / LIC- 前缀）============
    const queryResult = await AppDataSource.query(
      `SELECT t.*, p.name as package_name, p.features as package_features
       FROM tenants t
       LEFT JOIN tenant_packages p ON t.package_id = p.id
       WHERE t.license_key = ?`,
      [licenseKey]
    );
    const tenant = queryResult[0];

    if (!tenant) {
      await AppDataSource.query(
        `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message, ip_address, user_agent)
         VALUES (?, NULL, ?, 'verify', 'failed', '授权码不存在', ?, ?)`,
        [uuidv4(), licenseKey, ip, userAgent]
      ).catch(() => {});
      return res.status(404).json({ success: false, message: '授权码无效，请检查后重试' });
    }

    if (tenant.status === 'disabled') {
      await logVerify(tenant.id, licenseKey, 'failed', '租户已被禁用', ip, userAgent);
      return res.status(403).json({ success: false, message: '该租户已被禁用，请联系管理员' });
    }
    if (tenant.license_status === 'suspended') {
      await logVerify(tenant.id, licenseKey, 'failed', '授权已暂停', ip, userAgent);
      return res.status(403).json({ success: false, message: '授权已暂停，请联系管理员' });
    }
    if (tenant.expire_date && new Date(tenant.expire_date) < new Date()) {
      await AppDataSource.query(`UPDATE tenants SET license_status = 'expired', status = 'expired' WHERE id = ?`, [tenant.id]);
      await logVerify(tenant.id, licenseKey, 'failed', '授权已过期', ip, userAgent);
      return res.status(403).json({ success: false, message: '授权已过期，请续费后使用', expireDate: tenant.expire_date });
    }

    if (tenant.license_status === 'pending' || tenant.license_status === 'paid') {
      await AppDataSource.query(`UPDATE tenants SET license_status = 'active', activated_at = NOW(), last_verify_at = NOW() WHERE id = ?`, [tenant.id]);
      const activateMsg = tenant.license_status === 'paid' ? '付款后首次激活成功' : '首次激活成功';
      await logVerify(tenant.id, licenseKey, 'success', activateMsg, ip, userAgent);
      adminNotificationService.notify('tenant_login', {
        title: `租户首次激活：${tenant.name}`,
        content: `租户「${tenant.name}」（编码：${tenant.code}）首次激活，IP：${ip || '未知'}`,
        relatedId: tenant.id, relatedType: 'tenant',
        extraData: { tenantName: tenant.name, tenantCode: tenant.code, ip }
      }).catch((err: any) => log.error('[TenantLicense] 通知失败:', err.message));
    } else {
      await AppDataSource.query(`UPDATE tenants SET last_verify_at = NOW() WHERE id = ?`, [tenant.id]);
      await logVerify(tenant.id, licenseKey, 'success', '验证成功', ip, userAgent);
    }

    res.json({
      success: true,
      data: {
        tenantId: tenant.id,
        tenantCode: tenant.code,
        tenantName: tenant.name,
        packageName: tenant.package_name,
        maxUsers: tenant.max_users,
        expireDate: tenant.expire_date,
        features: safeJsonParse(tenant.features),
        packageFeatures: safeJsonParse(tenant.package_features),
        deployType: 'saas'   // 🔑 关键标识：SaaS模式
      },
      message: '授权验证成功'
    });
  } catch (error: any) {
    log.error('[Tenant License] Verify failed:', error);
    res.status(500).json({ success: false, message: '验证失败，请稍后重试' });
  }
});

/**
 * 通过租户编码识别租户（日常登录用，员工只需输入短编码）
 */
router.post('/verify-code', async (req: Request, res: Response) => {
  try {
    const { tenantCode } = req.body;

    if (!tenantCode) {
      return res.status(400).json({ success: false, message: '请输入租户编码' });
    }

    const rows = await AppDataSource.query(
      `SELECT t.id, t.name, t.code, t.license_status, t.status, t.expire_date,
              t.max_users, t.features,
              p.name as package_name, p.features as package_features
       FROM tenants t
       LEFT JOIN tenant_packages p ON t.package_id = p.id
       WHERE t.code = ?`,
      [tenantCode.toUpperCase()]
    );
    const tenant = rows[0];

    if (!tenant) {
      return res.status(404).json({ success: false, message: '租户编码不存在，请确认后重试' });
    }

    if (tenant.license_status === 'pending') {
      return res.status(400).json({
        success: false,
        message: '该租户尚未激活，请先使用授权码激活系统',
        needActivation: true
      });
    }

    // paid状态（已付款未用授权码激活），允许通过编码登录并自动激活
    if (tenant.license_status === 'paid') {
      await AppDataSource.query(`UPDATE tenants SET license_status = 'active', activated_at = NOW(), last_verify_at = NOW() WHERE id = ?`, [tenant.id]);
    }

    if (tenant.status === 'disabled') {
      return res.status(403).json({ success: false, message: '该租户已被禁用，请联系管理员' });
    }

    if (tenant.license_status === 'suspended') {
      return res.status(403).json({ success: false, message: '授权已暂停，请联系管理员' });
    }

    if (tenant.expire_date && new Date(tenant.expire_date) < new Date()) {
      return res.status(403).json({
        success: false,
        message: '授权已过期，请联系管理员续费',
        expireDate: tenant.expire_date
      });
    }

    res.json({
      success: true,
      data: {
        tenantId: tenant.id,
        tenantCode: tenant.code,
        tenantName: tenant.name,
        packageName: tenant.package_name,
        maxUsers: tenant.max_users,
        expireDate: tenant.expire_date,
        features: safeJsonParse(tenant.features),
        packageFeatures: safeJsonParse(tenant.package_features)
      },
      message: '租户识别成功'
    });
  } catch (error: any) {
    log.error('[Tenant License] Verify code failed:', error);
    res.status(500).json({ success: false, message: '验证失败，请稍后重试' });
  }
});

/**
 * 获取租户信息（已登录用户调用）
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: '未找到租户信息' });
    }

    const queryResult = await AppDataSource.query(
      `SELECT t.id, t.name, t.code, t.license_key, t.license_status, t.package_id,
              t.max_users, t.user_count, t.expire_date, t.features, t.activated_at,
              p.name as package_name, p.features as package_features
       FROM tenants t
       LEFT JOIN tenant_packages p ON t.package_id = p.id
       WHERE t.id = ?`,
      [tenantId]
    );
    const tenant = queryResult[0];

    if (!tenant) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    res.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        licenseKey: maskLicenseKey(tenant.license_key),
        licenseStatus: tenant.license_status,
        packageName: tenant.package_name,
        maxUsers: tenant.max_users,
        userCount: tenant.user_count,
        expireDate: tenant.expire_date,
        activatedAt: tenant.activated_at,
        features: safeJsonParse(tenant.features),
        packageFeatures: safeJsonParse(tenant.package_features)
      }
    });
  } catch (error: any) {
    log.error('[Tenant License] Get info failed:', error);
    res.status(500).json({ success: false, message: '获取租户信息失败' });
  }
});

/**
 * 检查授权状态（心跳检测）
 */
router.post('/heartbeat', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      return res.json({ success: true, valid: true });
    }

    const queryResult = await AppDataSource.query(
      `SELECT license_status, status, expire_date FROM tenants WHERE id = ?`,
      [tenantId]
    );
    const tenant = queryResult[0];

    if (!tenant) {
      return res.json({ success: false, valid: false, message: '租户不存在' });
    }

    if (tenant.status === 'disabled' || tenant.license_status === 'suspended') {
      return res.json({ success: false, valid: false, message: '授权已暂停' });
    }

    if (tenant.expire_date && new Date(tenant.expire_date) < new Date()) {
      return res.json({ success: false, valid: false, message: '授权已过期' });
    }

    await AppDataSource.query(
      `UPDATE tenants SET last_verify_at = NOW() WHERE id = ?`,
      [tenantId]
    );

    res.json({ success: true, valid: true });
  } catch (error: any) {
    log.error('[Tenant License] Heartbeat failed:', error);
    res.json({ success: true, valid: true });
  }
});

/**
 * 获取租户资源使用情况（用户数、存储空间）
 * CRM前端定时调用，用于顶部预警提示
 */
router.get('/resource-usage', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    if (!tenantId) {
      return res.json({ success: true, data: null });
    }

    const usage = await getTenantResourceUsage(tenantId);
    if (!usage) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: usage });
  } catch (error: any) {
    log.error('[Tenant License] Get resource usage failed:', error);
    res.json({ success: true, data: null });
  }
});

// 辅助函数：记录验证日志
async function logVerify(tenantId: string, licenseKey: string, result: string, message: string, ip?: string, userAgent?: string) {
  try {
    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message, ip_address, user_agent)
       VALUES (?, ?, ?, 'verify', ?, ?, ?, ?)`,
      [uuidv4(), tenantId, licenseKey, result, message, ip, userAgent]
    );
  } catch (e) {
    log.error('[Tenant License] Log failed:', e);
  }
}

// 辅助函数：遮蔽授权码
function maskLicenseKey(key: string): string {
  if (!key) return '';
  const parts = key.split('-');
  if (parts.length < 3) return key.substring(0, 4) + '****';
  return `${parts[0]}-${parts[1]}-****-****`;
}

export default router;

