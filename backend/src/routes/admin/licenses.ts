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

// 生成授权码
const generateLicenseKey = (): string => {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return segments.join('-');
};

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

    res.json({
      success: true,
      data: { list, total, page: pageNum, pageSize: pageSizeNum }
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

    res.json({ success: true, data: license });
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
      remark
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
      remark
    } = req.body;

    const licenseRepo = AppDataSource.getRepository(License);
    const license = await licenseRepo.findOne({ where: { id } });

    if (!license) {
      return res.status(404).json({ success: false, message: '授权不存在' });
    }

    if (customerName) license.customerName = customerName;
    if (contact !== undefined) license.customerContact = contact;
    if (phone !== undefined) license.customerPhone = phone;
    if (email !== undefined) license.customerEmail = email;
    if (licenseType) license.licenseType = licenseType;
    if (maxUsers) license.maxUsers = maxUsers;
    if (maxStorageGb) license.maxStorageGb = maxStorageGb;
    if (modules) license.features = modules;
    if (status) license.status = status;
    if (expiresAt) license.expiresAt = new Date(expiresAt);
    if (remark !== undefined) license.notes = remark;

    await licenseRepo.save(license);

    res.json({ success: true, data: license, message: '授权更新成功' });
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

// 获取私有客户账单记录
router.get('/:id/bills', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 10 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 100);
    const offset = (pageNum - 1) * pageSizeNum;

    const [list] = await AppDataSource.query(
      `SELECT * FROM payment_orders WHERE license_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [id, pageSizeNum, offset]
    );
    const [countResult] = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM payment_orders WHERE license_id = ?`, [id]
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
    console.error('[Admin Licenses] Get bills failed:', error);
    res.status(500).json({ success: false, message: '获取账单记录失败' });
  }
});

export default router;
