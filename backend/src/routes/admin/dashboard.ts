/**
 * Admin Dashboard Routes - 仪表盘统计
 * 支持内存缓存，减少重复 SQL 查询
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { License } from '../../entities/License';

import { log } from '../../config/logger';
const router = Router();

// ===== 内存缓存 =====
interface CacheEntry {
  data: any;
  expireAt: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = {
  stats: 60 * 1000,       // 统计数据缓存 60 秒
  trend: 5 * 60 * 1000,   // 趋势数据缓存 5 分钟
  activities: 30 * 1000,   // 活动数据缓存 30 秒
  recentLogs: 30 * 1000    // 最近日志缓存 30 秒
};

function getCache(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expireAt) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttl: number) {
  cache.set(key, { data, expireAt: Date.now() + ttl });
}

// 手动清除缓存（供外部调用，比如数据变更后）
export function clearDashboardCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// 获取仪表盘统计数据（带缓存）- 4卡片: 总客户数 / 本月新增 / 活跃客户 / 沉默客户
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const cached = getCache('stats');
    if (cached) {
      return res.json({ success: true, data: cached, _cached: true });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    // ======== 私有客户统计（排除软删除） ========
    let privateTotal = 0, privateActive = 0, privateSilent = 0, privateMonthNew = 0;
    try {
      const privateStats = await AppDataSource.query(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
           SUM(CASE WHEN status IN ('expired', 'revoked') THEN 1 ELSE 0 END) as silent,
           SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as month_new
         FROM licenses WHERE deleted_at IS NULL`,
        [startOfMonth]
      );
      privateTotal = parseInt(privateStats[0]?.total) || 0;
      privateActive = parseInt(privateStats[0]?.active) || 0;
      privateSilent = parseInt(privateStats[0]?.silent) || 0;
      privateMonthNew = parseInt(privateStats[0]?.month_new) || 0;
    } catch (e) {
      log.error('[Dashboard] Private stats query failed:', e);
    }

    // ======== 租户客户统计 ========
    let tenantTotal = 0, tenantActive = 0, tenantSilent = 0, tenantMonthNew = 0;
    try {
      const tenantStats = await AppDataSource.query(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN license_status = 'active' AND status = 'active'
                     AND (expire_date IS NULL OR expire_date >= CURDATE()) THEN 1 ELSE 0 END) as active,
           SUM(CASE WHEN license_status IN ('expired', 'suspended')
                     OR (expire_date IS NOT NULL AND expire_date < CURDATE())
                     OR status = 'inactive' THEN 1 ELSE 0 END) as silent,
           SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as month_new
         FROM tenants`,
        [startOfMonth]
      );
      tenantTotal = parseInt(tenantStats[0]?.total) || 0;
      tenantActive = parseInt(tenantStats[0]?.active) || 0;
      tenantSilent = parseInt(tenantStats[0]?.silent) || 0;
      tenantMonthNew = parseInt(tenantStats[0]?.month_new) || 0;
    } catch (e) {
      log.error('[Dashboard] Tenant stats query failed:', e);
    }

    const statsData = {
      totalCustomers: {
        total: privateTotal + tenantTotal,
        private: privateTotal,
        tenant: tenantTotal
      },
      monthlyNew: {
        total: privateMonthNew + tenantMonthNew,
        private: privateMonthNew,
        tenant: tenantMonthNew
      },
      activeCustomers: {
        total: privateActive + tenantActive,
        private: privateActive,
        tenant: tenantActive
      },
      silentCustomers: {
        total: privateSilent + tenantSilent,
        private: privateSilent,
        tenant: tenantSilent
      }
    };

    setCache('stats', statsData, CACHE_TTL.stats);
    res.json({ success: true, data: statsData });
  } catch (error: any) {
    log.error('[Admin Dashboard] Get stats failed:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

// 获取最近授权列表（带缓存）
router.get('/recent-licenses', async (req: Request, res: Response) => {
  try {
    const cached = getCache('recent-licenses');
    if (cached) {
      return res.json({ success: true, data: cached, _cached: true });
    }

    const licenseRepo = AppDataSource.getRepository(License);
    const list = await licenseRepo.find({
      order: { createdAt: 'DESC' },
      take: 10
    });

    setCache('recent-licenses', list, CACHE_TTL.recentLogs);
    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Admin Dashboard] Get recent licenses failed:', error);
    res.status(500).json({ success: false, message: '获取最近授权失败' });
  }
});

// 获取即将到期的授权（带缓存）
router.get('/expiring-licenses', async (req: Request, res: Response) => {
  try {
    const cached = getCache('expiring-licenses');
    if (cached) {
      return res.json({ success: true, data: cached, _cached: true });
    }

    const licenseRepo = AppDataSource.getRepository(License);

    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const list = await licenseRepo
      .createQueryBuilder('license')
      .where('license.status = :status', { status: 'active' })
      .andWhere('license.expiresAt IS NOT NULL')
      .andWhere('license.expiresAt <= :date', { date: thirtyDaysLater })
      .orderBy('license.expiresAt', 'ASC')
      .take(10)
      .getMany();

    setCache('expiring-licenses', list, CACHE_TTL.stats);
    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Admin Dashboard] Get expiring licenses failed:', error);
    res.status(500).json({ success: false, message: '获取即将到期授权失败' });
  }
});

// 获取最近验证日志（带缓存，合并私有客户和租户客户的授权日志）
router.get('/recent-logs', async (req: Request, res: Response) => {
  try {
    const cached = getCache('recent-logs');
    if (cached) {
      return res.json({ success: true, data: cached, _cached: true });
    }

    // 私有客户授权日志（JOIN licenses 表获取客户名称）
    const privateLogs = await AppDataSource.query(`
      SELECT
        ll.id,
        'private' AS customerType,
        ll.license_id AS licenseId,
        ll.license_key AS licenseKey,
        ll.action,
        ll.ip_address AS ipAddress,
        ll.result,
        ll.message,
        ll.created_at AS createdAt,
        l.customer_name AS customerName,
        l.created_by AS createdBy
      FROM license_logs ll
      LEFT JOIN licenses l ON ll.license_id = l.id
      ORDER BY ll.created_at DESC
      LIMIT 50
    `);

    // 租户客户授权日志（JOIN tenants 表获取租户名称）
    let tenantLogs: any[] = [];
    try {
      tenantLogs = await AppDataSource.query(`
        SELECT
          tl.id,
          'tenant' AS customerType,
          tl.tenant_id AS licenseId,
          tl.license_key AS licenseKey,
          tl.action,
          tl.ip_address AS ipAddress,
          tl.result,
          tl.message,
          tl.created_at AS createdAt,
          t.name AS customerName,
          COALESCE(tl.operator_name, t.contact) AS createdBy
        FROM tenant_license_logs tl
        LEFT JOIN tenants t ON tl.tenant_id = t.id
        ORDER BY tl.created_at DESC
        LIMIT 50
      `);
    } catch {
      // tenant_license_logs 表可能不存在（旧版数据库），忽略
    }

    // 合并两个来源，按时间倒序排列，取最近50条
    const merged = [...privateLogs, ...tenantLogs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    setCache('recent-logs', merged, CACHE_TTL.recentLogs);
    res.json({ success: true, data: merged });
  } catch (error: any) {
    log.error('[Admin Dashboard] Get recent logs failed:', error);
    res.status(500).json({ success: false, message: '获取最近日志失败' });
  }
});

// 获取授权类型分布统计（私有+租户，支持按时间段筛选：本月/上月/全部）
router.get('/stats/license-types', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'all';
    const cacheKey = `license_types_v2_${period}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, _cached: true });
    }

    // 构建时间条件
    let privateDateCond = '';
    let tenantDateCond = '';
    const privateParams: any[] = [];
    const tenantParams: any[] = [];
    const now = new Date();

    if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      privateDateCond = ' AND l.created_at >= ?';
      tenantDateCond = ' AND t.created_at >= ?';
      privateParams.push(startOfMonth);
      tenantParams.push(startOfMonth);
    } else if (period === 'lastMonth') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString().slice(0, 19);
      privateDateCond = ' AND l.created_at >= ? AND l.created_at <= ?';
      tenantDateCond = ' AND t.created_at >= ? AND t.created_at <= ?';
      privateParams.push(startOfLastMonth, endOfLastMonth);
      tenantParams.push(startOfLastMonth, endOfLastMonth);
    }

    // 1. 私有客户授权类型分布（license_type: trial/monthly/annual/perpetual）
    const privateResult = await AppDataSource.query(
      `SELECT l.license_type as type, COUNT(*) as count
       FROM licenses l WHERE l.deleted_at IS NULL${privateDateCond}
       GROUP BY l.license_type`,
      privateParams
    );

    const privateTypes: Record<string, number> = { trial: 0, monthly: 0, annual: 0, perpetual: 0 };
    for (const row of privateResult) {
      if (privateTypes.hasOwnProperty(row.type)) {
        privateTypes[row.type] = parseInt(row.count) || 0;
      }
    }

    // 2. 租户客户授权类型分布（通过 package 的 billing_cycle + is_trial）
    let tenantTypes: Record<string, number> = { trial: 0, monthly: 0, yearly: 0, once: 0, other: 0 };
    try {
      const tenantResult = await AppDataSource.query(
        `SELECT
           CASE
             WHEN p.is_trial = 1 THEN 'trial'
             WHEN p.billing_cycle = 'monthly' THEN 'monthly'
             WHEN p.billing_cycle = 'yearly' THEN 'yearly'
             WHEN p.billing_cycle = 'once' THEN 'once'
             ELSE 'other'
           END as btype,
           COUNT(*) as count
         FROM tenants t
         LEFT JOIN tenant_packages p ON CAST(t.package_id AS UNSIGNED) = p.id
         WHERE 1=1${tenantDateCond}
         GROUP BY btype`,
        tenantParams
      );
      for (const row of tenantResult) {
        const key = row.btype || 'other';
        if (tenantTypes.hasOwnProperty(key)) {
          tenantTypes[key] = parseInt(row.count) || 0;
        }
      }
    } catch (e) {
      log.error('[Dashboard] Tenant type distribution query failed:', e);
      // 如果JOIN方式失败，尝试简单计数
      try {
        const fallback = await AppDataSource.query(
          `SELECT COUNT(*) as count FROM tenants WHERE 1=1${tenantDateCond}`,
          tenantParams
        );
        tenantTypes.other = parseInt(fallback[0]?.count) || 0;
      } catch (_e2) { /* ignore */ }
    }

    const data = { private: privateTypes, tenant: tenantTypes };
    setCache(cacheKey, data, CACHE_TTL.stats);
    res.json({ success: true, data });
  } catch (error: any) {
    log.error('[Admin Dashboard] Get license type stats failed:', error);
    res.status(500).json({ success: false, message: '获取授权类型统计失败' });
  }
});

// 获取趋势数据（支持 period 参数：month/lastMonth/all，也兼容 days 参数）
router.get('/trend', async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string;
    let days = parseInt(req.query.days as string) || 30;
    let startDateStr: string;
    const now = new Date();

    if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      days = Math.ceil((now.getTime() - startOfMonth.getTime()) / 86400000) + 1;
      startDateStr = startOfMonth.toISOString().slice(0, 10);
    } else if (period === 'lastMonth') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days = Math.ceil((endOfLastMonth.getTime() - startOfLastMonth.getTime()) / 86400000) + 1;
      startDateStr = startOfLastMonth.toISOString().slice(0, 10);
    } else if (period === 'all') {
      days = 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDateStr = startDate.toISOString().slice(0, 10);
    } else {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDateStr = startDate.toISOString().slice(0, 10);
    }

    const cacheKey = `trend_${period || days}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, _cached: true });
    }

    // 每日新增授权数（排除软删除）
    const licensesTrend = await AppDataSource.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM licenses WHERE created_at >= ? AND deleted_at IS NULL
       GROUP BY DATE(created_at) ORDER BY date`,
      [startDateStr]
    );

    // 每日新增租户数
    const tenantsTrend = await AppDataSource.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM tenants WHERE created_at >= ?
       GROUP BY DATE(created_at) ORDER BY date`,
      [startDateStr]
    );

    // 每日收入（已支付订单）
    let revenueTrend: any[] = [];
    try {
      revenueTrend = await AppDataSource.query(
        `SELECT DATE(created_at) as date, SUM(amount) as amount, COUNT(*) as count
         FROM payment_orders WHERE status = 'paid' AND created_at >= ?
         GROUP BY DATE(created_at) ORDER BY date`,
        [startDateStr]
      );
    } catch (_e) {
      // payment_orders 表可能不存在 amount 字段或表不存在
    }

    // 构建完整的日期数组
    const dateMap: Record<string, { licenses: number; tenants: number; revenue: number }> = {};
    if (period === 'lastMonth') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      for (let i = 0; i < days; i++) {
        const d = new Date(startOfLastMonth);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        dateMap[key] = { licenses: 0, tenants: 0, revenue: 0 };
      }
    } else {
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const key = d.toISOString().slice(0, 10);
        dateMap[key] = { licenses: 0, tenants: 0, revenue: 0 };
      }
    }

    for (const row of licensesTrend) {
      const key = new Date(row.date).toISOString().slice(0, 10);
      if (dateMap[key]) dateMap[key].licenses = parseInt(row.count);
    }
    for (const row of tenantsTrend) {
      const key = new Date(row.date).toISOString().slice(0, 10);
      if (dateMap[key]) dateMap[key].tenants = parseInt(row.count);
    }
    for (const row of revenueTrend) {
      const key = new Date(row.date).toISOString().slice(0, 10);
      if (dateMap[key]) dateMap[key].revenue = parseFloat(row.amount) || 0;
    }

    const trendData = Object.entries(dateMap).map(([date, data]) => ({
      date,
      ...data
    }));

    // 计算增长率（本期 vs 上期对比）
    const halfDays = Math.floor(days / 2);
    const currentPeriod = trendData.slice(-halfDays);
    const previousPeriod = trendData.slice(0, halfDays);

    const sumField = (arr: any[], field: string) =>
      arr.reduce((sum, item) => sum + (item[field] || 0), 0);

    const currentLicenses = sumField(currentPeriod, 'licenses');
    const previousLicenses = sumField(previousPeriod, 'licenses');
    const currentTenants = sumField(currentPeriod, 'tenants');
    const previousTenants = sumField(previousPeriod, 'tenants');

    const calcGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const trendResult = {
        trend: trendData,
        growth: {
          licenses: calcGrowth(currentLicenses, previousLicenses),
          tenants: calcGrowth(currentTenants, previousTenants)
        }
    };

    setCache(cacheKey, trendResult, CACHE_TTL.trend);
    res.json({ success: true, data: trendResult });
  } catch (error: any) {
    log.error('[Admin Dashboard] Get trend failed:', error);
    res.status(500).json({ success: false, message: '获取趋势数据失败' });
  }
});

// 获取最近活动（跨表合并，带缓存，支持分页）
router.get('/activities', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 0;
    const pageSize = parseInt(req.query.pageSize as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const isPaginated = page > 0 && pageSize > 0;
    const fetchLimit = isPaginated ? 200 : Math.max(limit, 20);

    const cacheKey = isPaginated ? `activities_page_${page}_${pageSize}` : `activities_${limit}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, _cached: true });
    }

    // 从多个表获取最近操作，合并为活动流
    const activities: any[] = [];

    // 1. 最近新增授权（排除软删除）
    try {
      const recentLicenses = await AppDataSource.query(
        `SELECT id, customer_name as title, 'license_created' as type, created_at
         FROM licenses WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?`,
        [fetchLimit]
      );
      for (const row of recentLicenses) {
        activities.push({
          id: `license_${row.id}`,
          type: 'license_created',
          title: `新增私有客户「${row.title}」`,
          icon: 'Key',
          color: '#409eff',
          time: row.created_at
        });
      }
    } catch (_e) { /* table may not exist */ }

    // 2. 最近新增租户
    try {
      const recentTenants = await AppDataSource.query(
        `SELECT id, name as title, 'tenant_created' as type, created_at
         FROM tenants ORDER BY created_at DESC LIMIT ?`,
        [fetchLimit]
      );
      for (const row of recentTenants) {
        activities.push({
          id: `tenant_${row.id}`,
          type: 'tenant_created',
          title: `新增租户「${row.title}」`,
          icon: 'OfficeBuilding',
          color: '#67c23a',
          time: row.created_at
        });
      }
    } catch (_e) { /* table may not exist */ }

    // 3. 最近支付订单
    try {
      const recentPayments = await AppDataSource.query(
        `SELECT id, order_no, package_name, amount, status, created_at
         FROM payment_orders ORDER BY created_at DESC LIMIT ?`,
        [fetchLimit]
      );
      for (const row of recentPayments) {
        const statusMap: Record<string, string> = {
          paid: '已支付', pending: '待支付', closed: '已关闭',
          pending_transfer: '待转账', refunded: '已退款', expired: '已过期',
          cancelled: '已取消', failed: '支付失败'
        };
        const statusText = statusMap[row.status] || row.status;
        const colorMap: Record<string, string> = {
          paid: '#67c23a', pending: '#e6a23c', closed: '#909399',
          pending_transfer: '#e6a23c', refunded: '#f56c6c', failed: '#f56c6c'
        };
        activities.push({
          id: `payment_${row.id}`,
          type: `payment_${row.status}`,
          title: `订单 ${row.order_no} ${statusText}（¥${parseFloat(row.amount || 0).toFixed(2)}）`,
          icon: 'Wallet',
          color: colorMap[row.status] || '#e6a23c',
          time: row.created_at
        });
      }
    } catch (_e) { /* table may not exist */ }

    // 4. 最近版本发布
    try {
      const recentVersions = await AppDataSource.query(
        `SELECT id, version, status, created_at
         FROM versions WHERE status = 'published' ORDER BY created_at DESC LIMIT ?`,
        [fetchLimit]
      );
      for (const row of recentVersions) {
        activities.push({
          id: `version_${row.id}`,
          type: 'version_published',
          title: `发布版本 v${row.version}`,
          icon: 'Upload',
          color: '#9c27b0',
          time: row.created_at
        });
      }
    } catch (_e) { /* table may not exist */ }

    // 按时间倒序排列
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    let result: any;
    if (isPaginated) {
      const total = activities.length;
      const start = (page - 1) * pageSize;
      const items = activities.slice(start, start + pageSize);
      result = { items, total, page, pageSize };
    } else {
      result = activities.slice(0, limit);
    }

    setCache(cacheKey, result, CACHE_TTL.activities);
    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[Admin Dashboard] Get activities failed:', error);
    res.status(500).json({ success: false, message: '获取最近活动失败' });
  }
});

export default router;
