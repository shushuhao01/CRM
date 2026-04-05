/**
 * Admin Recycle Bin Routes - 回收站管理
 * 支持查看已删除的私有客户和租户客户，恢复和彻底删除
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { log } from '../../config/logger';

const router = Router();

/**
 * GET /recycle-bin - 获取回收站列表
 * @query type - 类型筛选：all/license/tenant
 * @query keyword - 关键词搜索
 * @query page - 页码
 * @query pageSize - 每页数量
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, type = 'all', keyword } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 100);
    const offset = (pageNum - 1) * pageSizeNum;

    const items: any[] = [];
    let totalCount = 0;

    // 查询已删除的私有客户
    if (type === 'all' || type === 'license') {
      let licenseSql = `SELECT id, customer_name as name, customer_contact as contact,
                         customer_phone as phone, customer_email as email, license_key,
                         license_type, status, max_users, expires_at,
                         deleted_at, deleted_by, created_at, updated_at,
                         'license' as item_type
                         FROM licenses WHERE deleted_at IS NOT NULL`;
      const licenseParams: any[] = [];

      if (keyword) {
        licenseSql += ` AND (customer_name LIKE ? OR license_key LIKE ?)`;
        licenseParams.push(`%${keyword}%`, `%${keyword}%`);
      }

      const [licenseList, licenseCount] = await Promise.all([
        AppDataSource.query(licenseSql + ` ORDER BY deleted_at DESC`, licenseParams),
        AppDataSource.query(
          `SELECT COUNT(*) as total FROM licenses WHERE deleted_at IS NOT NULL${keyword ? ' AND (customer_name LIKE ? OR license_key LIKE ?)' : ''}`,
          keyword ? [`%${keyword}%`, `%${keyword}%`] : []
        )
      ]);

      items.push(...(licenseList || []).map((row: any) => ({
        ...row,
        item_type: 'license',
        type_label: '私有客户'
      })));
      totalCount += Number(licenseCount[0]?.total || 0);
    }

    // 查询已删除的租户客户
    if (type === 'all' || type === 'tenant') {
      let tenantSql = `SELECT t.id, t.name, t.contact as contact, t.phone, t.email as email,
                        t.license_key, t.code, t.status, t.max_users, t.expire_date as expires_at,
                        t.deleted_at, t.deleted_by, t.created_at, t.updated_at,
                        p.name as package_name,
                        'tenant' as item_type
                        FROM tenants t
                        LEFT JOIN tenant_packages p ON t.package_id = p.id
                        WHERE t.deleted_at IS NOT NULL`;
      const tenantParams: any[] = [];

      if (keyword) {
        tenantSql += ` AND (t.name LIKE ? OR t.code LIKE ? OR t.license_key LIKE ?)`;
        tenantParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }

      const [tenantList, tenantCount] = await Promise.all([
        AppDataSource.query(tenantSql + ` ORDER BY t.deleted_at DESC`, tenantParams),
        AppDataSource.query(
          `SELECT COUNT(*) as total FROM tenants WHERE deleted_at IS NOT NULL${keyword ? ' AND (name LIKE ? OR code LIKE ? OR license_key LIKE ?)' : ''}`,
          keyword ? [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`] : []
        )
      ]);

      items.push(...(tenantList || []).map((row: any) => ({
        ...row,
        item_type: 'tenant',
        type_label: '租户客户'
      })));
      totalCount += Number(tenantCount[0]?.total || 0);
    }

    // 按 deleted_at 排序
    items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

    // 分页
    const paginatedItems = items.slice(offset, offset + pageSizeNum);

    res.json({
      success: true,
      data: {
        list: paginatedItems,
        total: totalCount,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error: any) {
    log.error('[Admin RecycleBin] Get list failed:', error);
    res.status(500).json({ success: false, message: '获取回收站列表失败' });
  }
});

/**
 * POST /recycle-bin/:id/restore - 恢复已删除的客户
 * @body type - license/tenant
 */
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    if (!type || !['license', 'tenant'].includes(type)) {
      return res.status(400).json({ success: false, message: '请指定恢复类型（license 或 tenant）' });
    }

    if (type === 'license') {
      // 检查是否存在且已被删除
      const rows = await AppDataSource.query(
        'SELECT id FROM licenses WHERE id = ? AND deleted_at IS NOT NULL', [id]
      );
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: '回收站中未找到该私有客户' });
      }
      await AppDataSource.query(
        'UPDATE licenses SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]
      );
      res.json({ success: true, message: '私有客户已恢复' });
    } else {
      // 检查是否存在且已被删除
      const rows = await AppDataSource.query(
        'SELECT id FROM tenants WHERE id = ? AND deleted_at IS NOT NULL', [id]
      );
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: '回收站中未找到该租户客户' });
      }
      await AppDataSource.query(
        'UPDATE tenants SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]
      );
      res.json({ success: true, message: '租户客户已恢复' });
    }
  } catch (error: any) {
    log.error('[Admin RecycleBin] Restore failed:', error);
    res.status(500).json({ success: false, message: '恢复失败' });
  }
});

/**
 * DELETE /recycle-bin/:id/permanent - 彻底删除客户（不可恢复）
 * @query type - license/tenant
 */
router.delete('/:id/permanent', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!type || !['license', 'tenant'].includes(type as string)) {
      return res.status(400).json({ success: false, message: '请指定删除类型（license 或 tenant）' });
    }

    if (type === 'license') {
      // 检查是否存在于回收站
      const rows = await AppDataSource.query(
        'SELECT id FROM licenses WHERE id = ? AND deleted_at IS NOT NULL', [id]
      );
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: '回收站中未找到该私有客户' });
      }
      // 先删除关联日志
      await AppDataSource.query('DELETE FROM license_logs WHERE license_id = ?', [id]);
      // 再彻底删除
      await AppDataSource.query('DELETE FROM licenses WHERE id = ?', [id]);
      res.json({ success: true, message: '私有客户已彻底删除' });
    } else {
      // 检查是否存在于回收站
      const rows = await AppDataSource.query(
        'SELECT id FROM tenants WHERE id = ? AND deleted_at IS NOT NULL', [id]
      );
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: '回收站中未找到该租户客户' });
      }
      // 先删除关联日志
      await AppDataSource.query('DELETE FROM tenant_license_logs WHERE tenant_id = ?', [id]);
      // 再彻底删除
      await AppDataSource.query('DELETE FROM tenants WHERE id = ?', [id]);
      res.json({ success: true, message: '租户客户已彻底删除' });
    }
  } catch (error: any) {
    log.error('[Admin RecycleBin] Permanent delete failed:', error);
    res.status(500).json({ success: false, message: '彻底删除失败' });
  }
});

/**
 * POST /recycle-bin/empty - 清空回收站
 */
router.post('/empty', async (req: Request, res: Response) => {
  try {
    // 彻底删除所有回收站中的私有客户
    const deletedLicenses = await AppDataSource.query(
      'SELECT id FROM licenses WHERE deleted_at IS NOT NULL'
    );
    for (const lic of (deletedLicenses || [])) {
      await AppDataSource.query('DELETE FROM license_logs WHERE license_id = ?', [lic.id]);
    }
    await AppDataSource.query('DELETE FROM licenses WHERE deleted_at IS NOT NULL');

    // 彻底删除所有回收站中的租户客户
    const deletedTenants = await AppDataSource.query(
      'SELECT id FROM tenants WHERE deleted_at IS NOT NULL'
    );
    for (const t of (deletedTenants || [])) {
      await AppDataSource.query('DELETE FROM tenant_license_logs WHERE tenant_id = ?', [t.id]);
    }
    await AppDataSource.query('DELETE FROM tenants WHERE deleted_at IS NOT NULL');

    const totalDeleted = (deletedLicenses?.length || 0) + (deletedTenants?.length || 0);
    res.json({ success: true, message: `回收站已清空，共删除 ${totalDeleted} 条记录` });
  } catch (error: any) {
    log.error('[Admin RecycleBin] Empty failed:', error);
    res.status(500).json({ success: false, message: '清空回收站失败' });
  }
});

export default router;


