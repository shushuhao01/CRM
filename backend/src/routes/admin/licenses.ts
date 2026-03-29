/**
 * Admin Licenses Routes - 授权管理
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { License } from '../../entities/License';
import { LicenseLog } from '../../entities/LicenseLog';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// 生成授权码（私有部署）
const generateLicenseKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  for (let i = 0; i < 4; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(segment);
  }
  return `PRIVATE-${segments.join('-')}`;
};

// 获取授权统计（聚合接口，一次返回所有状态数量）
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked
       FROM licenses`
    );
    const row = result[0] || {};
    res.json({
      success: true,
      data: {
        total: Number(row.total) || 0,
        active: Number(row.active) || 0,
        pending: Number(row.pending) || 0,
        expired: Number(row.expired) || 0,
        revoked: Number(row.revoked) || 0
      }
    });
  } catch (error: any) {
    console.error('[Admin Licenses] Get stats failed:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

// 获取授权列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, licenseType, keyword } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 100);
    const skip = (pageNum - 1) * pageSizeNum;

    const licenseRepo = AppDataSource.getRepository(License);
    const queryBuilder = licenseRepo.createQueryBuilder('license');

    if (status) {
      queryBuilder.andWhere('license.status = :status', { status });
    }
    if (licenseType) {
      queryBuilder.andWhere('license.licenseType = :licenseType', { licenseType });
    }
    if (keyword) {
      queryBuilder.andWhere(
        '(license.customerName LIKE :keyword OR license.licenseKey LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder.orderBy('license.createdAt', 'DESC');
    queryBuilder.skip(skip).take(pageSizeNum);

    const [list, total] = await queryBuilder.getManyAndCount();

    // 批量查询每个 license 的实际已创建用户数
    const listWithUserCount = await Promise.all(
      list.map(async (license) => {
        let userCount = 0;
        if (license.customerPhone) {
          try {
            const countResult = await AppDataSource.query(
              `SELECT COUNT(*) as cnt FROM users WHERE username = ? AND tenant_id IS NULL`,
              [license.customerPhone]
            );
            userCount = Number(countResult[0]?.cnt) || 0;
          } catch { /* ignore */ }
        }
        return { ...license, userCount };
      })
    );

    res.json({
      success: true,
      data: { list: listWithUserCount, total, page: pageNum, pageSize: pageSizeNum }
    });
  } catch (error: any) {
    console.error('[Admin Licenses] Get list failed:', error);
    res.status(500).json({ success: false, message: '获取授权列表失败' });
  }
});

// 获取授权详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const licenseRepo = AppDataSource.getRepository(License);
    const license = await licenseRepo.findOne({ where: { id } });

    if (!license) {
      return res.status(404).json({ success: false, message: '授权不存在' });
    }

    // 如果有关联套餐，查询套餐详情
    let packageInfo = null;
    let packageModules: string[] = [];
    if (license.packageId) {
      try {
        const pkgRows = await AppDataSource.query(
          'SELECT id, name, code, type, price, billing_cycle, max_users, max_storage_gb, features, modules, description FROM tenant_packages WHERE id = ?',
          [license.packageId]
        );
        if (pkgRows.length > 0) {
          packageInfo = pkgRows[0];
          if (typeof packageInfo.features === 'string') {
            try { packageInfo.features = JSON.parse(packageInfo.features); } catch { packageInfo.features = []; }
          }
          // 解析套餐modules
          if (packageInfo.modules) {
            try {
              packageModules = typeof packageInfo.modules === 'string' ? JSON.parse(packageInfo.modules) : packageInfo.modules;
            } catch { packageModules = []; }
          }
        }
      } catch (e) {
        console.warn('[Admin Licenses] Query package info failed:', e);
      }
    }

    // 🔥 解析license的功能模块：检查features是否包含有效模块ID
    const moduleIds = ['dashboard','customer','order','service-management','performance','logistics','service','data','finance','product','system'];
    let resolvedFeatures = license.features;
    if (resolvedFeatures) {
      const parsed = Array.isArray(resolvedFeatures) ? resolvedFeatures : (typeof resolvedFeatures === 'string' ? (() => { try { return JSON.parse(resolvedFeatures as string); } catch { return []; } })() : []);
      const hasModuleIds = parsed.some((f: string) => moduleIds.includes(f));
      if (!hasModuleIds && packageModules.length > 0) {
        // features不包含有效模块ID，使用套餐默认modules
        resolvedFeatures = packageModules;
      } else if (hasModuleIds) {
        resolvedFeatures = parsed;
      }
    } else if (packageModules.length > 0) {
      resolvedFeatures = packageModules;
    }

    // 查询实际已创建用户数
    let userCount = 0;
    if (license.customerPhone) {
      try {
        const countResult = await AppDataSource.query(
          `SELECT COUNT(*) as cnt FROM users WHERE username = ? AND tenant_id IS NULL`,
          [license.customerPhone]
        );
        userCount = Number(countResult[0]?.cnt) || 0;
      } catch { /* ignore */ }
    }

    // 🔥 解析createdBy：将UUID转换为实际用户名
    let createdByName: string | null = null;
    if (license.createdBy) {
      try {
        // 先查 admin_users 表（管理后台操作员）
        const adminRows = await AppDataSource.query(
          'SELECT username, name FROM admin_users WHERE id = ? LIMIT 1',
          [license.createdBy]
        );
        if (adminRows.length > 0) {
          createdByName = adminRows[0].name || adminRows[0].username || null;
        }
      } catch { /* ignore - table might not exist */ }

      // 如果 admin_users 没找到，尝试查 users 表（租户自建）
      if (!createdByName) {
        try {
          const userRows = await AppDataSource.query(
            'SELECT username, name, real_name FROM users WHERE id = ? LIMIT 1',
            [license.createdBy]
          );
          if (userRows.length > 0) {
            createdByName = userRows[0].real_name || userRows[0].name || userRows[0].username || null;
            if (createdByName) createdByName += '（自建）';
          }
        } catch { /* ignore */ }
      }

      // 都查不到，显示"系统创建"
      if (!createdByName) {
        createdByName = '系统创建';
      }
    } else {
      createdByName = '系统创建';
    }

    res.json({ success: true, data: { ...license, features: resolvedFeatures, packageInfo, userCount, createdByName } });
  } catch (error: any) {
    console.error('[Admin Licenses] Get detail failed:', error);
    res.status(500).json({ success: false, message: '获取授权详情失败' });
  }
});

// 创建授权
router.post('/', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const {
      customerName,
      contact,
      phone,
      email,
      licenseType,
      maxUsers,
      maxStorageGb,
      modules,
      expiresAt,
      remark,
      packageId,
      packageName
    } = req.body;

    if (!customerName) {
      return res.status(400).json({ success: false, message: '客户名称不能为空' });
    }

    const licenseRepo = AppDataSource.getRepository(License);

    const license = new License();
    license.id = uuidv4();
    license.licenseKey = generateLicenseKey();
    license.customerName = customerName;
    license.customerContact = contact;
    license.customerPhone = phone;
    license.customerEmail = email;
    license.licenseType = licenseType || 'trial';
    license.maxUsers = maxUsers || 10;
    license.maxStorageGb = maxStorageGb || 5;
    license.features = modules; // 功能模块
    if (packageId) license.packageId = packageId;
    if (packageName) license.packageName = packageName;
    license.status = 'pending';
    license.expiresAt = expiresAt ? new Date(expiresAt) : undefined;
    license.notes = remark;
    license.createdBy = adminUser?.adminId;

    await licenseRepo.save(license);

    res.json({ success: true, data: license, message: '授权创建成功' });
  } catch (error: any) {
    console.error('[Admin Licenses] Create failed:', error);
    res.status(500).json({ success: false, message: '创建授权失败' });
  }
});

// 更新授权
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      customerName,
      contact,
      phone,
      email,
      licenseType,
      maxUsers,
      maxStorageGb,
      modules,
      status,
      expiresAt,
      remark,
      packageId,
      packageName,
      regenerateKey
    } = req.body;

    const licenseRepo = AppDataSource.getRepository(License);
    const license = await licenseRepo.findOne({ where: { id } });

    if (!license) {
      return res.status(404).json({ success: false, message: '授权不存在' });
    }

    if (customerName !== undefined && customerName !== null) license.customerName = customerName;
    if (contact !== undefined) license.customerContact = contact;
    if (phone !== undefined) license.customerPhone = phone;
    if (email !== undefined) license.customerEmail = email;
    if (licenseType !== undefined && licenseType !== null) license.licenseType = licenseType;
    if (maxUsers !== undefined && maxUsers !== null) license.maxUsers = maxUsers;
    if (maxStorageGb !== undefined && maxStorageGb !== null) license.maxStorageGb = maxStorageGb;
    if (modules !== undefined) license.features = modules;
    if (packageId !== undefined) { license.packageId = packageId || null; }
    if (packageName !== undefined) { license.packageName = packageName || null; }
    if (status !== undefined && status !== null) license.status = status;
    if (expiresAt !== undefined) license.expiresAt = expiresAt ? new Date(expiresAt) : undefined;
    if (remark !== undefined) license.notes = remark;

    // 重新生成授权码
    if (regenerateKey) {
      license.licenseKey = generateLicenseKey();
      license.status = 'pending';
      license.activatedAt = undefined;
      license.machineId = undefined;
    }

    await licenseRepo.save(license);

    res.json({ success: true, data: license, message: regenerateKey ? '授权码已重新生成' : '授权更新成功' });
  } catch (error: any) {
    console.error('[Admin Licenses] Update failed:', error);
    res.status(500).json({ success: false, message: '更新授权失败' });
  }
});

// 吊销授权
router.post('/:id/revoke', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;

    const licenseRepo = AppDataSource.getRepository(License);
    const logRepo = AppDataSource.getRepository(LicenseLog);

    const license = await licenseRepo.findOne({ where: { id } });
    if (!license) {
      return res.status(404).json({ success: false, message: '授权不存在' });
    }

    license.status = 'revoked';
    await licenseRepo.save(license);

    // 记录日志
    const log = new LicenseLog();
    log.id = uuidv4();
    log.licenseId = license.id;
    log.licenseKey = license.licenseKey;
    log.action = 'revoke';
    log.result = 'success';
    log.message = `管理员 ${adminUser?.username} 吊销了授权`;
    await logRepo.save(log);

    res.json({ success: true, message: '授权已吊销' });
  } catch (error: any) {
    console.error('[Admin Licenses] Revoke failed:', error);
    res.status(500).json({ success: false, message: '吊销授权失败' });
  }
});

// 续期授权
router.post('/:id/renew', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { expiresAt } = req.body;
    const adminUser = (req as any).adminUser;

    if (!expiresAt) {
      return res.status(400).json({ success: false, message: '请选择新的到期时间' });
    }

    const licenseRepo = AppDataSource.getRepository(License);
    const logRepo = AppDataSource.getRepository(LicenseLog);

    const license = await licenseRepo.findOne({ where: { id } });
    if (!license) {
      return res.status(404).json({ success: false, message: '授权不存在' });
    }

    const oldExpiresAt = license.expiresAt;
    license.expiresAt = new Date(expiresAt);
    license.status = 'active';
    await licenseRepo.save(license);

    // 记录日志
    const log = new LicenseLog();
    log.id = uuidv4();
    log.licenseId = license.id;
    log.licenseKey = license.licenseKey;
    log.action = 'renew';
    log.result = 'success';
    log.message = `管理员 ${adminUser?.username} 续期授权，从 ${oldExpiresAt} 到 ${expiresAt}`;
    await logRepo.save(log);

    res.json({ success: true, data: license, message: '授权续期成功' });
  } catch (error: any) {
    console.error('[Admin Licenses] Renew failed:', error);
    res.status(500).json({ success: false, message: '续期授权失败' });
  }
});

// 删除授权
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const licenseRepo = AppDataSource.getRepository(License);

    const license = await licenseRepo.findOne({ where: { id } });
    if (!license) {
      return res.status(404).json({ success: false, message: '授权不存在' });
    }

    await licenseRepo.remove(license);

    res.json({ success: true, message: '授权已删除' });
  } catch (error: any) {
    console.error('[Admin Licenses] Delete failed:', error);
    res.status(500).json({ success: false, message: '删除授权失败' });
  }
});

// 获取授权验证日志
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 100);
    const skip = (pageNum - 1) * pageSizeNum;

    // 自动清理超过30天的旧日志
    try {
      await AppDataSource.query(
        `DELETE FROM license_logs WHERE license_id = ? AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [id]
      );
    } catch { /* 清理失败不影响查询 */ }

    const logRepo = AppDataSource.getRepository(LicenseLog);
    const [list, total] = await logRepo.findAndCount({
      where: { licenseId: id },
      order: { createdAt: 'DESC' },
      skip,
      take: pageSizeNum
    });

    res.json({
      success: true,
      data: { list, total, page: pageNum, pageSize: pageSizeNum }
    });
  } catch (error: any) {
    console.error('[Admin Licenses] Get logs failed:', error);
    res.status(500).json({ success: false, message: '获取日志失败' });
  }
});

// 清空授权操作日志
router.delete('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 验证授权是否存在
    const licenseRepo = AppDataSource.getRepository(License);
    const license = await licenseRepo.findOne({ where: { id } });
    if (!license) {
      return res.status(404).json({ success: false, message: '授权不存在' });
    }

    const result = await AppDataSource.query(
      `DELETE FROM license_logs WHERE license_id = ?`,
      [id]
    );
    const deletedCount = result.affectedRows || 0;

    res.json({
      success: true,
      message: `已清空 ${deletedCount} 条操作日志`
    });
  } catch (error: any) {
    console.error('[Admin Licenses] Clear logs failed:', error);
    res.status(500).json({ success: false, message: '清空日志失败' });
  }
});

// 获取私有客户账单记录
router.get('/:id/bills', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 10 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 100);
    const offset = (pageNum - 1) * pageSizeNum;

    const list = await AppDataSource.query(
      `SELECT * FROM payment_orders WHERE license_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [id, pageSizeNum, offset]
    );
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM payment_orders WHERE license_id = ?`, [id]
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
    console.error('[Admin Licenses] Get bills failed:', error);
    res.status(500).json({ success: false, message: '获取账单记录失败' });
  }
});

export default router;

