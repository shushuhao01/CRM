/**
 * Tenant License Routes - 租户授权验证（供CRM前端调用）
 * 类似企业微信的企业ID验证流程
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * 验证租户授权码
 * 用于登录前验证租户身份，类似企业微信输入企业ID
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { licenseKey } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!licenseKey) {
      return res.status(400).json({ success: false, message: '请输入租户授权码' });
    }

    // 查询租户
    const [rows] = await AppDataSource.query(
      `SELECT t.*, p.name as package_name, p.features as package_features
       FROM tenants t
       LEFT JOIN tenant_packages p ON t.package_id = p.id
       WHERE t.license_key = ?`,
      [licenseKey]
    );
    const tenant = Array.isArray(rows) ? rows[0] : rows;

    if (!tenant) {
      // 记录失败日志
      await AppDataSource.query(
        `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message, ip_address, user_agent)
         VALUES (?, NULL, ?, 'verify', 'failed', '授权码不存在', ?, ?)`,
        [uuidv4(), licenseKey, ip, userAgent]
      );
      return res.status(404).json({ success: false, message: '授权码无效，请检查后重试' });
    }

    // 检查租户状态
    if (tenant.status === 'disabled') {
      await logVerify(tenant.id, licenseKey, 'failed', '租户已被禁用', ip, userAgent);
      return res.status(403).json({ success: false, message: '该租户已被禁用，请联系管理员' });
    }

    // 检查授权状态
    if (tenant.license_status === 'suspended') {
      await logVerify(tenant.id, licenseKey, 'failed', '授权已暂停', ip, userAgent);
      return res.status(403).json({ success: false, message: '授权已暂停，请联系管理员' });
    }

    // 检查是否过期
    if (tenant.expire_date) {
      const expireDate = new Date(tenant.expire_date);
      if (expireDate < new Date()) {
        // 更新状态为过期
        await AppDataSource.query(
          `UPDATE tenants SET license_status = 'expired', status = 'expired' WHERE id = ?`,
          [tenant.id]
        );
        await logVerify(tenant.id, licenseKey, 'failed', '授权已过期', ip, userAgent);
        return res.status(403).json({
          success: false,
          message: '授权已过期，请续费后使用',
          expireDate: tenant.expire_date
        });
      }
    }

    // 首次激活
    if (tenant.license_status === 'pending') {
      await AppDataSource.query(
        `UPDATE tenants SET license_status = 'active', activated_at = NOW(), last_verify_at = NOW() WHERE id = ?`,
        [tenant.id]
      );
      await logVerify(tenant.id, licenseKey, 'success', '首次激活成功', ip, userAgent);
    } else {
      // 更新最后验证时间
      await AppDataSource.query(
        `UPDATE tenants SET last_verify_at = NOW() WHERE id = ?`,
        [tenant.id]
      );
      await logVerify(tenant.id, licenseKey, 'success', '验证成功', ip, userAgent);
    }

    // 返回租户信息（用于登录页显示）
    res.json({
      success: true,
      data: {
        tenantId: tenant.id,
        tenantCode: tenant.code,
        tenantName: tenant.name,
        packageName: tenant.package_name,
        maxUsers: tenant.max_users,
        expireDate: tenant.expire_date,
        features: tenant.features ? JSON.parse(tenant.features) : null,
        packageFeatures: tenant.package_features ? JSON.parse(tenant.package_features) : null
      },
      message: '授权验证成功'
    });
  } catch (error: any) {
    console.error('[Tenant License] Verify failed:', error);
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

    const [rows] = await AppDataSource.query(
      `SELECT t.id, t.name, t.code, t.license_key, t.license_status, t.package_id,
              t.max_users, t.user_count, t.expire_date, t.features, t.activated_at,
              p.name as package_name, p.features as package_features
       FROM tenants t
       LEFT JOIN tenant_packages p ON t.package_id = p.id
       WHERE t.id = ?`,
      [tenantId]
    );
    const tenant = Array.isArray(rows) ? rows[0] : rows;

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
        features: tenant.features ? JSON.parse(tenant.features) : null,
        packageFeatures: tenant.package_features ? JSON.parse(tenant.package_features) : null
      }
    });
  } catch (error: any) {
    console.error('[Tenant License] Get info failed:', error);
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
      return res.json({ success: true, valid: true }); // 私有部署模式
    }

    const [rows] = await AppDataSource.query(
      `SELECT license_status, status, expire_date FROM tenants WHERE id = ?`,
      [tenantId]
    );
    const tenant = Array.isArray(rows) ? rows[0] : rows;

    if (!tenant) {
      return res.json({ success: false, valid: false, message: '租户不存在' });
    }

    // 检查状态
    if (tenant.status === 'disabled' || tenant.license_status === 'suspended') {
      return res.json({ success: false, valid: false, message: '授权已暂停' });
    }

    // 检查过期
    if (tenant.expire_date && new Date(tenant.expire_date) < new Date()) {
      return res.json({ success: false, valid: false, message: '授权已过期' });
    }

    // 更新心跳时间
    await AppDataSource.query(
      `UPDATE tenants SET last_verify_at = NOW() WHERE id = ?`,
      [tenantId]
    );

    res.json({ success: true, valid: true });
  } catch (error: any) {
    console.error('[Tenant License] Heartbeat failed:', error);
    res.json({ success: true, valid: true }); // 出错时不阻断用户
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
    console.error('[Tenant License] Log failed:', e);
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
