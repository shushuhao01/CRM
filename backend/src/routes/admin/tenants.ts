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

// 自动生成租户编码（格式：T + YYMMDD + 4位随机字母数字，如 T260319X3K9）
const generateTenantCode = async (): Promise<string> => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `T${yy}${mm}${dd}`;

  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 4);
    const code = `${prefix}${suffix}`;
    const existing = await AppDataSource.query('SELECT id FROM tenants WHERE code = ?', [code]);
    if (!existing || existing.length === 0) {
      return code;
    }
  }
  // 极端情况下使用更长的随机码
  return `${prefix}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
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

    const list = await AppDataSource.query(sql, params);
    const countResult = await AppDataSource.query(countSql, params.slice(0, -2));
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: { list, total, page: pageNum, pageSize: pageSizeNum }
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
    const rows = await AppDataSource.query(
      `SELECT t.*, p.name as package_name FROM tenants t
       LEFT JOIN tenant_packages p ON t.package_id = p.id WHERE t.id = ?`, [id]
    );
    const tenant = rows[0];

    if (!tenant) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    // 查询该租户的管理员账号状态
    const adminUsers = await AppDataSource.query(
      `SELECT id, username, status, login_fail_count, locked_at
       FROM users
       WHERE tenant_id = ? AND role = 'admin'
       ORDER BY created_at DESC`,
      [id]
    );

    // 添加管理员账号信息到返回数据
    tenant.adminUsers = adminUsers;
    tenant.hasLockedAdmin = adminUsers.some((u: any) => u.status === 'locked');

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
    const { name, packageId, contact, phone, email, maxUsers, maxStorageGb, expireDate, features } = req.body;
    let { code } = req.body;

    console.log('[Admin Tenants] 创建租户请求:', { name, contact, phone, email });

    if (!name) {
      return res.status(400).json({ success: false, message: '租户名称不能为空' });
    }

    // 手机号必填验证
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: '联系电话不能为空' });
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: '请输入正确的手机号格式' });
    }

    // 如果编码为空则自动生成
    if (!code || !code.trim()) {
      code = await generateTenantCode();
      console.log('[Admin Tenants] 自动生成租户编码:', code);
    }

    // 检查编码是否已存在
    const existing = await AppDataSource.query('SELECT id FROM tenants WHERE code = ?', [code]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: '租户编码已存在' });
    }

    const id = uuidv4();
    const licenseKey = generateTenantLicenseKey();
    console.log('[Admin Tenants] 生成授权码:', licenseKey);

    await AppDataSource.query(
      `INSERT INTO tenants (id, name, code, license_key, license_status, package_id, contact, phone, email, max_users, max_storage_gb, expire_date, features, status)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, name, code, licenseKey, packageId || null, contact || null, phone || null, email || null,
       maxUsers || 10, maxStorageGb || 5, expireDate || null, features ? JSON.stringify(features) : null]
    );
    console.log('[Admin Tenants] 租户记录已插入数据库');

    // 记录日志
    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message, operator_id, operator_name)
       VALUES (?, ?, ?, 'generate', 'success', ?, ?, ?)`,
      [uuidv4(), id, licenseKey, `创建租户并生成授权码`, adminUser?.adminId, adminUser?.username]
    );
    console.log('[Admin Tenants] 授权日志已记录');

    // 创建默认管理员账号（使用手机号作为用户名）
    console.log('[Admin Tenants] 开始创建默认管理员账号...');
    const { createDefaultAdmin } = await import('../../utils/adminAccountHelper');
    const adminAccount = await createDefaultAdmin({
      tenantId: id,
      phone: phone,
      realName: contact || name,
      email: email || undefined
    });
    console.log('[Admin Tenants] 管理员账号创建成功:', adminAccount.username);

    // 获取登录地址
    const loginUrl = process.env.FRONTEND_URL || 'https://app.yunke-crm.com';

    res.json({
      success: true,
      data: {
        id,
        tenantCode: code,
        licenseKey,
        loginUrl,
        adminAccount: {
          username: adminAccount.username,
          password: adminAccount.password
        }
      },
      message: '租户创建成功，授权码已生成'
    });
  } catch (error: any) {
    console.error('[Admin Tenants] Create failed:', error);
    console.error('[Admin Tenants] Error stack:', error.stack);
    res.status(500).json({ success: false, message: `创建租户失败: ${error.message}` });
  }
});

// 更新租户
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, packageId, contact, phone, email, maxUsers, maxStorageGb, expireDate, features, status } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined && name !== null) { updates.push('name = ?'); params.push(name); }
    if (packageId !== undefined) { updates.push('package_id = ?'); params.push(packageId); }
    if (contact !== undefined) { updates.push('contact = ?'); params.push(contact); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (maxUsers !== undefined && maxUsers !== null) { updates.push('max_users = ?'); params.push(maxUsers); }
    if (maxStorageGb !== undefined && maxStorageGb !== null) { updates.push('max_storage_gb = ?'); params.push(maxStorageGb); }
    if (expireDate !== undefined) { updates.push('expire_date = ?'); params.push(expireDate || null); }
    if (features !== undefined) { updates.push('features = ?'); params.push(JSON.stringify(features)); }
    if (req.body.modules !== undefined) { updates.push('modules = ?'); params.push(JSON.stringify(req.body.modules)); }
    if (status !== undefined && status !== null) { updates.push('status = ?'); params.push(status); }

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

    const rows = await AppDataSource.query('SELECT * FROM tenants WHERE id = ?', [id]);
    const tenant = rows[0];
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

    const rows = await AppDataSource.query('SELECT expire_date FROM tenants WHERE id = ?', [id]);
    const tenant = rows[0];
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

// 获取租户下用户列表
router.get('/:id/users', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 50 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 50, 200);
    const offset = (pageNum - 1) * pageSizeNum;

    const list = await AppDataSource.query(
      `SELECT u.id, u.username, u.name, u.real_name, u.phone, u.email, u.role,
              u.department_name, u.position, u.last_login_at, u.login_count, u.status, u.created_at
       FROM users u WHERE u.tenant_id = ? ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [id, pageSizeNum, offset]
    );
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM users WHERE tenant_id = ?`, [id]
    );

    res.json({
      success: true,
      data: {
        list,
        total: countResult[0]?.total || 0,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error: any) {
    console.error('[Admin Tenants] Get users failed:', error);
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

// 解锁租户管理员账号
router.post('/:id/unlock-admin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;
    const bcrypt = require('bcrypt');

    // 查找租户
    const rows = await AppDataSource.query('SELECT * FROM tenants WHERE id = ?', [id]);
    const tenant = rows[0];
    if (!tenant) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    // 查找该租户下被锁定的管理员账号
    const lockedUsers = await AppDataSource.query(
      `SELECT id, username, password FROM users
       WHERE tenant_id = ? AND status = 'locked' AND role = 'admin'`,
      [id]
    );

    if (lockedUsers.length === 0) {
      return res.json({
        success: true,
        message: '没有被锁定的管理员账号',
        data: { unlockedCount: 0 }
      });
    }

    let fixedPasswordCount = 0;
    const defaultPassword = 'Aa123456';

    // 检查并修复每个被锁定账号的密码格式
    for (const user of lockedUsers) {
      // 检查密码格式是否为bcrypt（应该以$2开头且长度约60字符）
      const isBcryptFormat = user.password && user.password.startsWith('$2') && user.password.length === 60;

      if (!isBcryptFormat) {
        // 密码格式错误，重新生成bcrypt密码
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);
        await AppDataSource.query(
          `UPDATE users SET password = ? WHERE id = ?`,
          [hashedPassword, user.id]
        );
        fixedPasswordCount++;
        console.log(`[Admin Tenants] Fixed password format for user: ${user.username}`);
      }
    }

    // 解锁所有被锁定的管理员账号
    const result = await AppDataSource.query(
      `UPDATE users
       SET status = 'active', login_fail_count = 0, locked_at = NULL
       WHERE tenant_id = ? AND status = 'locked' AND role = 'admin'`,
      [id]
    );

    const affectedRows = result.affectedRows || 0;

    // 记录日志
    const logMessage = fixedPasswordCount > 0
      ? `解锁管理员账号 ${affectedRows} 个，修复密码格式 ${fixedPasswordCount} 个，密码已重置为 ${defaultPassword}`
      : `解锁管理员账号 ${affectedRows} 个`;

    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, action, result, message, operator_id, operator_name)
       VALUES (?, ?, 'unlock_admin', 'success', ?, ?, ?)`,
      [uuidv4(), id, logMessage, adminUser?.adminId, adminUser?.username]
    );

    const responseMessage = fixedPasswordCount > 0
      ? `已解锁 ${affectedRows} 个管理员账号，其中 ${fixedPasswordCount} 个账号的密码已重置为 ${defaultPassword}`
      : `已解锁 ${affectedRows} 个管理员账号`;

    res.json({
      success: true,
      message: responseMessage,
      data: {
        unlockedCount: affectedRows,
        fixedPasswordCount,
        defaultPassword: fixedPasswordCount > 0 ? defaultPassword : undefined
      }
    });
  } catch (error: any) {
    console.error('[Admin Tenants] Unlock admin failed:', error);
    res.status(500).json({ success: false, message: '解锁失败' });
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

    const list = await AppDataSource.query(
      `SELECT * FROM tenant_license_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [id, pageSizeNum, offset]
    );
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM tenant_license_logs WHERE tenant_id = ?`, [id]
    );

    res.json({
      success: true,
      data: {
        list,
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

    const list = await AppDataSource.query(
      `SELECT * FROM payment_orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [id, pageSizeNum, offset]
    );
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM payment_orders WHERE tenant_id = ?`, [id]
    );

    res.json({
      success: true,
      data: {
        list,
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
