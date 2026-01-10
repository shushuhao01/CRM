/**
 * Admin Tenants Routes - 租户管理（含授权码功能）
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// 生成租户授权码（格式：TENANT-XXXX-XXXX-XXXX-XXXX）
const generateTenantLicenseKey = (): string => {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return `TENANT-${segments.join('-')}`;
};

// 获取租户列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, keyword, packageId } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 100);
    const offset = (pageNum - 1) * pageSizeNum;

    let sql = `SELECT t.*, p.name as package_name FROM tenants t
               LEFT JOIN tenant_packages p ON t.package_id = p.id WHERE 1=1`;
    const params: any[] = [];

    if (status) {
      sql += ` AND t.status = ?`;
      params.push(status);
    }
    if (keyword) {
      sql += ` AND (t.name LIKE ? OR t.code LIKE ? OR t.license_key LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (packageId) {
      sql += ` AND t.package_id = ?`;
      params.push(packageId);
    }

    const countSql = sql.replace('SELECT t.*, p.name as package_name', 'SELECT COUNT(*) as total');
    sql += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSizeNum, offset);

    const [list] = await AppDataSource.query(sql, params);
    const [countResult] = await AppDataSource.query(countSql, params.slice(0, -2));
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: { list: Array.isArray(list) ? list : [list], total, page: pageNum, pageSize: pageSizeNum }
    });
  } catch (error: any) {
    console.error('[Admin Tenants] Get list failed:', error);
    res.status(500).json({ success: false, message: '获取租户列表失败' });
  }
});

// 获取租户详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows] = await AppDataSource.query(
      `SELECT t.*, p.name as package_name FROM tenants t
       LEFT JOIN tenant_packages p ON t.package_id = p.id WHERE t.id = ?`, [id]
    );
    const tenant = Array.isArray(rows) ? rows[0] : rows;

    if (!tenant) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    res.json({ success: true, data: tenant });
  } catch (error: any) {
    console.error('[Admin Tenants] Get detail failed:', error);
    res.status(500).json({ success: false, message: '获取租户详情失败' });
  }
});

// 创建租户（自动生成授权码）
router.post('/', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const { name, code, packageId, contact, phone, email, maxUsers, maxStorageGb, expireDate, features } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: '租户名称和编码不能为空' });
    }

    // 检查编码是否已存在
    const [existing] = await AppDataSource.query('SELECT id FROM tenants WHERE code = ?', [code]);
    if (existing && (Array.isArray(existing) ? existing.length > 0 : existing)) {
      return res.status(400).json({ success: false, message: '租户编码已存在' });
    }

    const id = uuidv4();
    const licenseKey = generateTenantLicenseKey();

    await AppDataSource.query(
      `INSERT INTO tenants (id, name, code, license_key, license_status, package_id, contact, phone, email, max_users, max_storage_gb, expire_date, features, status)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, name, code, licenseKey, packageId || null, contact || null, phone || null, email || null,
       maxUsers || 10, maxStorageGb || 5, expireDate || null, features ? JSON.stringify(features) : null]
    );

    // 记录日志
    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message, operator_id, operator_name)
       VALUES (?, ?, ?, 'generate', 'success', ?, ?, ?)`,
      [uuidv4(), id, licenseKey, `创建租户并生成授权码`, adminUser?.adminId, adminUser?.username]
    );

    res.json({
      success: true,
      data: { id, licenseKey },
      message: '租户创建成功，授权码已生成'
    });
  } catch (error: any) {
    console.error('[Admin Tenants] Create failed:', error);
    res.status(500).json({ success: false, message: '创建租户失败' });
  }
});

// 更新租户
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, packageId, contact, phone, email, maxUsers, maxStorageGb, expireDate, features, status } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (packageId !== undefined) { updates.push('package_id = ?'); params.push(packageId); }
    if (contact !== undefined) { updates.push('contact = ?'); params.push(contact); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (maxUsers) { updates.push('max_users = ?'); params.push(maxUsers); }
    if (maxStorageGb) { updates.push('max_storage_gb = ?'); params.push(maxStorageGb); }
    if (expireDate) { updates.push('expire_date = ?'); params.push(expireDate); }
    if (features) { updates.push('features = ?'); params.push(JSON.stringify(features)); }
    if (status) { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的内容' });
    }

    params.push(id);
    await AppDataSource.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: '租户更新成功' });
  } catch (error: any) {
    console.error('[Admin Tenants] Update failed:', error);
    res.status(500).json({ success: false, message: '更新租户失败' });
  }
});

// 重新生成授权码
router.post('/:id/regenerate-license', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;

    const [rows] = await AppDataSource.query('SELECT * FROM tenants WHERE id = ?', [id]);
    const tenant = Array.isArray(rows) ? rows[0] : rows;
    if (!tenant) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    const oldLicenseKey = tenant.license_key;
    const newLicenseKey = generateTenantLicenseKey();

    await AppDataSource.query(
      `UPDATE tenants SET license_key = ?, license_status = 'pending', activated_at = NULL WHERE id = ?`,
      [newLicenseKey, id]
    );

    // 记录日志
    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message, operator_id, operator_name)
       VALUES (?, ?, ?, 'generate', 'success', ?, ?, ?)`,
      [uuidv4(), id, newLicenseKey, `重新生成授权码，旧授权码: ${oldLicenseKey}`, adminUser?.adminId, adminUser?.username]
    );

    res.json({ success: true, data: { licenseKey: newLicenseKey }, message: '授权码已重新生成' });
  } catch (error: any) {
    console.error('[Admin Tenants] Regenerate license failed:', error);
    res.status(500).json({ success: false, message: '重新生成授权码失败' });
  }
});

// 暂停租户授权
router.post('/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUser = (req as any).adminUser;

    await AppDataSource.query(
      `UPDATE tenants SET license_status = 'suspended', status = 'disabled' WHERE id = ?`, [id]
    );

    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, action, result, message, operator_id, operator_name)
       VALUES (?, ?, 'suspend', 'success', ?, ?, ?)`,
      [uuidv4(), id, reason || '管理员暂停授权', adminUser?.adminId, adminUser?.username]
    );

    res.json({ success: true, message: '租户授权已暂停' });
  } catch (error: any) {
    console.error('[Admin Tenants] Suspend failed:', error);
    res.status(500).json({ success: false, message: '暂停授权失败' });
  }
});

// 恢复租户授权
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;

    await AppDataSource.query(
      `UPDATE tenants SET license_status = 'active', status = 'active' WHERE id = ?`, [id]
    );

    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, action, result, message, operator_id, operator_name)
       VALUES (?, ?, 'resume', 'success', '恢复租户授权', ?, ?)`,
      [uuidv4(), id, adminUser?.adminId, adminUser?.username]
    );

    res.json({ success: true, message: '租户授权已恢复' });
  } catch (error: any) {
    console.error('[Admin Tenants] Resume failed:', error);
    res.status(500).json({ success: false, message: '恢复授权失败' });
  }
});

// 续期租户
router.post('/:id/renew', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { expireDate } = req.body;
    const adminUser = (req as any).adminUser;

    if (!expireDate) {
      return res.status(400).json({ success: false, message: '请选择新的到期时间' });
    }

    const [rows] = await AppDataSource.query('SELECT expire_date FROM tenants WHERE id = ?', [id]);
    const tenant = Array.isArray(rows) ? rows[0] : rows;
    const oldExpireDate = tenant?.expire_date;

    await AppDataSource.query(
      `UPDATE tenants SET expire_date = ?, license_status = 'active', status = 'active' WHERE id = ?`,
      [expireDate, id]
    );

    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, action, result, message, operator_id, operator_name)
       VALUES (?, ?, 'renew', 'success', ?, ?, ?)`,
      [uuidv4(), id, `续期：${oldExpireDate} -> ${expireDate}`, adminUser?.adminId, adminUser?.username]
    );

    res.json({ success: true, message: '租户续期成功' });
  } catch (error: any) {
    console.error('[Admin Tenants] Renew failed:', error);
    res.status(500).json({ success: false, message: '续期失败' });
  }
});

// 获取租户授权日志
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 100);
    const offset = (pageNum - 1) * pageSizeNum;

    const [list] = await AppDataSource.query(
      `SELECT * FROM tenant_license_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [id, pageSizeNum, offset]
    );
    const [countResult] = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM tenant_license_logs WHERE tenant_id = ?`, [id]
    );

    res.json({
      success: true,
      data: {
        list: Array.isArray(list) ? list : [list],
        total: countResult[0]?.total || 0,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error: any) {
    console.error('[Admin Tenants] Get logs failed:', error);
    res.status(500).json({ success: false, message: '获取日志失败' });
  }
});

// 删除租户
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 先删除日志
    await AppDataSource.query('DELETE FROM tenant_license_logs WHERE tenant_id = ?', [id]);
    // 再删除租户
    await AppDataSource.query('DELETE FROM tenants WHERE id = ?', [id]);

    res.json({ success: true, message: '租户已删除' });
  } catch (error: any) {
    console.error('[Admin Tenants] Delete failed:', error);
    res.status(500).json({ success: false, message: '删除租户失败' });
  }
});

// 获取租户账单记录
router.get('/:id/bills', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 10 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 100);
    const offset = (pageNum - 1) * pageSizeNum;

    const [list] = await AppDataSource.query(
      `SELECT * FROM payment_orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [id, pageSizeNum, offset]
    );
    const [countResult] = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM payment_orders WHERE tenant_id = ?`, [id]
    );

    res.json({
      success: true,
      data: {
        list: Array.isArray(list) ? list : (list ? [list] : []),
        total: countResult[0]?.total || 0,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error: any) {
    console.error('[Admin Tenants] Get bills failed:', error);
    res.status(500).json({ success: false, message: '获取账单记录失败' });
  }
});

export default router;
