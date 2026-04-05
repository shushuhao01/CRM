/**
 * Admin Customer Management Routes - 客户管理（统一管理私有+租户客户）
 * 提供：统计概览、所有客户列表、续费提醒、跟进记录
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../../config/logger';

const router = Router();

/**
 * 确保 customer_follow_ups 跟进记录表存在
 */
const ensureFollowUpTable = async () => {
  try {
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS customer_follow_ups (
        id VARCHAR(36) PRIMARY KEY,
        customer_id VARCHAR(36) NOT NULL COMMENT '客户ID（license.id 或 tenant.id）',
        customer_type ENUM('private', 'tenant') NOT NULL COMMENT '客户类型',
        content TEXT NOT NULL COMMENT '跟进内容',
        operator_id VARCHAR(36) DEFAULT NULL COMMENT '操作人ID',
        operator_name VARCHAR(100) DEFAULT NULL COMMENT '操作人姓名',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer (customer_id, customer_type),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户跟进记录表'
    `);
  } catch (e) {
    log.warn('[CustomerManagement] 创建跟进记录表失败（可能已存在）:', (e as any).message?.substring(0, 80));
  }
};

// 延迟创建表：使用路由中间件确保数据库连接就绪后再建表
let tableReady = false;
router.use(async (_req: Request, _res: Response, next: Function) => {
  if (!tableReady) {
    try {
      await ensureFollowUpTable();
      tableReady = true;
    } catch (e) {
      // 如果建表失败，下次请求继续尝试
      log.warn('[CustomerManagement] 中间件建表失败，下次请求重试');
    }
  }
  next();
});

// ==================== 统计概览 ====================

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    // 私有客户统计
    const privateStats = await AppDataSource.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked,
        SUM(CASE WHEN status = 'active' AND license_type != 'perpetual' AND expires_at IS NOT NULL AND expires_at > NOW() AND expires_at <= DATE_ADD(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as pending_renewal
      FROM licenses WHERE deleted_at IS NULL
    `);

    // 租户客户统计
    const tenantStats = await AppDataSource.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) as disabled,
        SUM(CASE WHEN expire_date IS NOT NULL AND expire_date < NOW() THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'active' AND expire_date IS NOT NULL AND expire_date > NOW() AND expire_date <= DATE_ADD(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as pending_renewal
      FROM tenants WHERE deleted_at IS NULL
    `);

    const p = privateStats[0] || {};
    const t = tenantStats[0] || {};

    res.json({
      success: true,
      data: {
        private: {
          total: Number(p.total) || 0,
          active: Number(p.active) || 0,
          expired: Number(p.expired) || 0,
          pending: Number(p.pending) || 0,
          revoked: Number(p.revoked) || 0,
          pendingRenewal: Number(p.pending_renewal) || 0
        },
        tenant: {
          total: Number(t.total) || 0,
          active: Number(t.active) || 0,
          expired: Number(t.expired) || 0,
          disabled: Number(t.disabled) || 0,
          pendingRenewal: Number(t.pending_renewal) || 0
        },
        combined: {
          total: (Number(p.total) || 0) + (Number(t.total) || 0),
          active: (Number(p.active) || 0) + (Number(t.active) || 0),
          expired: (Number(p.expired) || 0) + (Number(t.expired) || 0),
          pendingRenewal: (Number(p.pending_renewal) || 0) + (Number(t.pending_renewal) || 0)
        }
      }
    });
  } catch (error: any) {
    log.error('[CustomerManagement] Get stats failed:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

// ==================== 所有客户列表（合并私有+租户） ====================

router.get('/all-customers', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, keyword, customerType, status } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 100);
    const offset = (pageNum - 1) * pageSizeNum;

    // 构建私有客户子查询
    let privateSql = `
      SELECT
        l.id,
        l.customer_name as customerName,
        l.customer_contact as contact,
        l.customer_phone as phone,
        l.customer_email as email,
        l.license_key as licenseKey,
        l.license_type as licenseType,
        l.status,
        l.max_users as maxUsers,
        l.expires_at as expireDate,
        l.created_at as createdAt,
        l.activated_at as activatedAt,
        'private' as customerType,
        NULL as packageName,
        NULL as tenantCode,
        (SELECT content FROM customer_follow_ups WHERE customer_id = l.id AND customer_type = 'private' ORDER BY created_at DESC LIMIT 1) as lastFollowUp,
        (SELECT created_at FROM customer_follow_ups WHERE customer_id = l.id AND customer_type = 'private' ORDER BY created_at DESC LIMIT 1) as lastFollowUpTime
      FROM licenses l
      WHERE l.deleted_at IS NULL
    `;
    const privateParams: any[] = [];

    // 构建租户客户子查询
    let tenantSql = `
      SELECT
        t.id,
        t.name as customerName,
        t.contact,
        t.phone,
        t.email,
        t.license_key as licenseKey,
        'saas' as licenseType,
        t.status,
        t.max_users as maxUsers,
        t.expire_date as expireDate,
        t.created_at as createdAt,
        NULL as activatedAt,
        'tenant' as customerType,
        p.name as packageName,
        t.code as tenantCode,
        (SELECT content FROM customer_follow_ups WHERE customer_id = t.id AND customer_type = 'tenant' ORDER BY created_at DESC LIMIT 1) as lastFollowUp,
        (SELECT created_at FROM customer_follow_ups WHERE customer_id = t.id AND customer_type = 'tenant' ORDER BY created_at DESC LIMIT 1) as lastFollowUpTime
      FROM tenants t
      LEFT JOIN tenant_packages p ON t.package_id = p.id
      WHERE t.deleted_at IS NULL
    `;
    const tenantParams: any[] = [];

    // 关键词筛选
    if (keyword) {
      privateSql += ` AND (l.customer_name LIKE ? OR l.customer_phone LIKE ? OR l.license_key LIKE ?)`;
      privateParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      tenantSql += ` AND (t.name LIKE ? OR t.phone LIKE ? OR t.license_key LIKE ? OR t.code LIKE ?)`;
      tenantParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 状态筛选
    if (status) {
      privateSql += ` AND l.status = ?`;
      privateParams.push(status);
      tenantSql += ` AND t.status = ?`;
      tenantParams.push(status === 'expired' ? 'active' : status); // 租户过期需特殊处理
      if (status === 'expired') {
        tenantSql = tenantSql.replace(`AND t.status = ?`, `AND t.expire_date IS NOT NULL AND t.expire_date < NOW()`);
        tenantParams.pop();
      }
    }

    // 根据客户类型筛选
    let unionSql = '';
    let unionParams: any[] = [];

    if (customerType === 'private') {
      unionSql = privateSql;
      unionParams = privateParams;
    } else if (customerType === 'tenant') {
      unionSql = tenantSql;
      unionParams = tenantParams;
    } else {
      // 全部：UNION ALL
      unionSql = `(${privateSql}) UNION ALL (${tenantSql})`;
      unionParams = [...privateParams, ...tenantParams];
    }

    // 包装为分页查询
    const countSql = `SELECT COUNT(*) as total FROM (${unionSql}) as combined`;
    const dataSql = `SELECT * FROM (${unionSql}) as combined ORDER BY createdAt DESC LIMIT ? OFFSET ?`;

    const countResult = await AppDataSource.query(countSql, unionParams);
    const total = Number(countResult[0]?.total || 0);

    const list = await AppDataSource.query(dataSql, [...unionParams, pageSizeNum, offset]);

    res.json({
      success: true,
      data: {
        list: Array.isArray(list) ? list : [],
        total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error: any) {
    log.error('[CustomerManagement] Get all customers failed:', error);
    res.status(500).json({ success: false, message: '获取客户列表失败' });
  }
});

// ==================== 续费提醒列表 ====================

router.get('/renewal-reminders', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, level, customerType } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 100);
    const offset = (pageNum - 1) * pageSizeNum;

    // 私有客户：有到期时间且未过期且非永久的
    const privateSql = `
      SELECT
        l.id,
        l.customer_name as customerName,
        l.customer_contact as contact,
        l.customer_phone as phone,
        l.customer_email as email,
        l.license_type as licenseType,
        l.status,
        l.max_users as maxUsers,
        l.expires_at as expireDate,
        l.created_at as createdAt,
        l.activated_at as activatedAt,
        'private' as customerType,
        NULL as packageName,
        DATEDIFF(l.expires_at, NOW()) as remainingDays,
        DATEDIFF(l.expires_at, COALESCE(l.activated_at, l.created_at)) as totalDays,
        CASE
          WHEN DATEDIFF(l.expires_at, COALESCE(l.activated_at, l.created_at)) > 0
          THEN ROUND(DATEDIFF(l.expires_at, NOW()) * 100.0 / DATEDIFF(l.expires_at, COALESCE(l.activated_at, l.created_at)), 1)
          ELSE 0
        END as remainingPercent,
        (SELECT content FROM customer_follow_ups WHERE customer_id = l.id AND customer_type = 'private' ORDER BY created_at DESC LIMIT 1) as lastFollowUp,
        (SELECT created_at FROM customer_follow_ups WHERE customer_id = l.id AND customer_type = 'private' ORDER BY created_at DESC LIMIT 1) as lastFollowUpTime,
        (SELECT operator_name FROM customer_follow_ups WHERE customer_id = l.id AND customer_type = 'private' ORDER BY created_at DESC LIMIT 1) as lastFollowUpBy
      FROM licenses l
      WHERE l.deleted_at IS NULL
        AND l.status IN ('active', 'expired')
        AND l.license_type != 'perpetual'
        AND l.expires_at IS NOT NULL
    `;

    // 租户客户：有到期时间的（含已过期，方便跟进续费）
    const tenantSql = `
      SELECT
        t.id,
        t.name as customerName,
        t.contact,
        t.phone,
        t.email,
        'saas' as licenseType,
        t.status,
        t.max_users as maxUsers,
        t.expire_date as expireDate,
        t.created_at as createdAt,
        NULL as activatedAt,
        'tenant' as customerType,
        p.name as packageName,
        DATEDIFF(t.expire_date, NOW()) as remainingDays,
        DATEDIFF(t.expire_date, t.created_at) as totalDays,
        CASE
          WHEN DATEDIFF(t.expire_date, t.created_at) > 0
          THEN ROUND(DATEDIFF(t.expire_date, NOW()) * 100.0 / DATEDIFF(t.expire_date, t.created_at), 1)
          ELSE 0
        END as remainingPercent,
        (SELECT content FROM customer_follow_ups WHERE customer_id = t.id AND customer_type = 'tenant' ORDER BY created_at DESC LIMIT 1) as lastFollowUp,
        (SELECT created_at FROM customer_follow_ups WHERE customer_id = t.id AND customer_type = 'tenant' ORDER BY created_at DESC LIMIT 1) as lastFollowUpTime,
        (SELECT operator_name FROM customer_follow_ups WHERE customer_id = t.id AND customer_type = 'tenant' ORDER BY created_at DESC LIMIT 1) as lastFollowUpBy
      FROM tenants t
      LEFT JOIN tenant_packages p ON t.package_id = p.id
      WHERE t.deleted_at IS NULL
        AND t.expire_date IS NOT NULL
    `;

    // 组合查询
    let unionSql = '';
    if (customerType === 'private') {
      unionSql = privateSql;
    } else if (customerType === 'tenant') {
      unionSql = tenantSql;
    } else {
      unionSql = `(${privateSql}) UNION ALL (${tenantSql})`;
    }

    // 包装为外层查询，按剩余百分比/过期状态筛选
    let outerWhere = '';
    const outerParams: any[] = [];
    if (level === 'expired') {
      outerWhere = ' WHERE remainingDays < 0';
    } else if (level === 'critical') {
      outerWhere = ' WHERE remainingDays >= 0 AND remainingPercent <= 10';
    } else if (level === 'warning') {
      outerWhere = ' WHERE remainingDays >= 0 AND remainingPercent > 10 AND remainingPercent <= 20';
    } else {
      // 默认显示所有剩余50%以内 + 已过期的客户
      outerWhere = ' WHERE remainingPercent <= 50 OR remainingDays < 0';
    }

    const wrapSql = `SELECT * FROM (${unionSql}) as reminders ${outerWhere}`;
    const countSql = `SELECT COUNT(*) as total FROM (${wrapSql}) as cnt`;
    const dataSql = `${wrapSql} ORDER BY remainingPercent ASC, remainingDays ASC LIMIT ? OFFSET ?`;

    const countResult = await AppDataSource.query(countSql, outerParams);
    const total = Number(countResult[0]?.total || 0);

    const list = await AppDataSource.query(dataSql, [...outerParams, pageSizeNum, offset]);

    // 统计各级别数量
    const levelCountSql = `
      SELECT
        SUM(CASE WHEN remainingDays < 0 THEN 1 ELSE 0 END) as expiredCount,
        SUM(CASE WHEN remainingDays >= 0 AND remainingPercent <= 10 THEN 1 ELSE 0 END) as criticalCount,
        SUM(CASE WHEN remainingDays >= 0 AND remainingPercent > 10 AND remainingPercent <= 20 THEN 1 ELSE 0 END) as warningCount,
        SUM(CASE WHEN remainingDays >= 0 AND remainingPercent > 20 AND remainingPercent <= 50 THEN 1 ELSE 0 END) as normalCount
      FROM (${unionSql}) as levels WHERE remainingPercent <= 50 OR remainingDays < 0
    `;
    const levelResult = await AppDataSource.query(levelCountSql);
    const levels = levelResult[0] || {};

    res.json({
      success: true,
      data: {
        list: Array.isArray(list) ? list : [],
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        levelStats: {
          expired: Number(levels.expiredCount) || 0,
          critical: Number(levels.criticalCount) || 0,
          warning: Number(levels.warningCount) || 0,
          normal: Number(levels.normalCount) || 0
        }
      }
    });
  } catch (error: any) {
    log.error('[CustomerManagement] Get renewal reminders failed:', error);
    res.status(500).json({ success: false, message: '获取续费提醒列表失败' });
  }
});

// ==================== 添加跟进记录 ====================

router.post('/follow-up', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const { customerId, customerType, content } = req.body;

    if (!customerId || !customerType || !content) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    if (!['private', 'tenant'].includes(customerType)) {
      return res.status(400).json({ success: false, message: '客户类型无效' });
    }


    const id = uuidv4();
    await AppDataSource.query(
      `INSERT INTO customer_follow_ups (id, customer_id, customer_type, content, operator_id, operator_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, customerId, customerType, content, adminUser?.adminId || null, adminUser?.username || '系统']
    );

    res.json({ success: true, message: '跟进记录已保存', data: { id } });
  } catch (error: any) {
    log.error('[CustomerManagement] Add follow-up failed:', error);
    res.status(500).json({ success: false, message: '添加跟进记录失败' });
  }
});

// ==================== 获取跟进记录列表 ====================

router.get('/follow-ups/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { customerType, page = 1, pageSize = 10 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 50);
    const offset = (pageNum - 1) * pageSizeNum;


    let sql = `SELECT * FROM customer_follow_ups WHERE customer_id = ?`;
    const params: any[] = [customerId];

    if (customerType) {
      sql += ` AND customer_type = ?`;
      params.push(customerType);
    }

    const countSql = `SELECT COUNT(*) as total FROM customer_follow_ups WHERE customer_id = ?${customerType ? ' AND customer_type = ?' : ''}`;
    const countResult = await AppDataSource.query(countSql, params);
    const total = Number(countResult[0]?.total || 0);

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSizeNum, offset);
    const list = await AppDataSource.query(sql, params);

    res.json({
      success: true,
      data: {
        list: Array.isArray(list) ? list : [],
        total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error: any) {
    log.error('[CustomerManagement] Get follow-ups failed:', error);
    res.status(500).json({ success: false, message: '获取跟进记录失败' });
  }
});

export default router;


