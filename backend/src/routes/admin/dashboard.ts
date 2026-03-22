/**
 * Admin Dashboard Routes - 仪表盘统计
 * 支持内存缓存，减少重复 SQL 查询
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { License } from '../../entities/License';
import { Version } from '../../entities/Version';
import { LicenseLog } from '../../entities/LicenseLog';
import { Tenant } from '../../entities/Tenant';

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

// 获取仪表盘统计数据（带缓存）
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const cached = getCache('stats');
    if (cached) {
      return res.json({ success: true, data: cached, _cached: true });
    }

    const licenseRepo = AppDataSource.getRepository(License);
    const versionRepo = AppDataSource.getRepository(Version);
    const logRepo = AppDataSource.getRepository(LicenseLog);

    // 授权统计
    const [
      totalLicenses,
      activeLicenses,
      expiredLicenses,
      pendingLicenses,
      trialLicenses,
      perpetualLicenses,
      annualLicenses,
      monthlyLicenses
    ] = await Promise.all([
      licenseRepo.count(),
      licenseRepo.count({ where: { status: 'active' } }),
      licenseRepo.count({ where: { status: 'expired' } }),
      licenseRepo.count({ where: { status: 'pending' } }),
      licenseRepo.count({ where: { licenseType: 'trial' } }),
      licenseRepo.count({ where: { licenseType: 'perpetual' } }),
      licenseRepo.count({ where: { licenseType: 'annual' } }),
      licenseRepo.count({ where: { licenseType: 'monthly' } })
    ]);

    // 租户统计（使用原始SQL，避免实体兼容性问题）
    let totalTenants = 0, activeTenants = 0;
    try {
      const tenantStats = await AppDataSource.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM tenants`
      );
      totalTenants = parseInt(tenantStats[0]?.total) || 0;
      activeTenants = parseInt(tenantStats[0]?.active) || 0;
    } catch (_e) { /* tenants table may not exist */ }

    // 版本统计
    const [totalVersions, publishedVersions] = await Promise.all([
      versionRepo.count(),
      versionRepo.count({ where: { status: 'published' } })
    ]);

    // 最新版本
    const latestVersion = await versionRepo.findOne({
      where: { status: 'published' },
      order: { versionCode: 'DESC' }
    });

    // 最近7天验证次数
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentVerifications = await logRepo
      .createQueryBuilder('log')
      .where('log.action = :action', { action: 'verify' })
      .andWhere('log.createdAt >= :date', { date: sevenDaysAgo })
      .getCount();

    const statsData = {
        licenses: {
          total: totalLicenses,
          active: activeLicenses,
          expired: expiredLicenses,
          pending: pendingLicenses,
          byType: {
            trial: trialLicenses,
            perpetual: perpetualLicenses,
            annual: annualLicenses,
            monthly: monthlyLicenses
          }
        },
        tenants: {
          total: totalTenants,
          active: activeTenants
        },
        versions: {
          total: totalVersions,
          published: publishedVersions,
          latest: latestVersion ? latestVersion.version : null
        },
        activity: {
          recentVerifications
        }
    };

    setCache('stats', statsData, CACHE_TTL.stats);
    res.json({ success: true, data: statsData });
  } catch (error: any) {
    console.error('[Admin Dashboard] Get stats failed:', error);
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
    console.error('[Admin Dashboard] Get recent licenses failed:', error);
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
    console.error('[Admin Dashboard] Get expiring licenses failed:', error);
    res.status(500).json({ success: false, message: '获取即将到期授权失败' });
  }
});

// 获取最近验证日志（带缓存）
router.get('/recent-logs', async (req: Request, res: Response) => {
  try {
    const cached = getCache('recent-logs');
    if (cached) {
      return res.json({ success: true, data: cached, _cached: true });
    }

    const logRepo = AppDataSource.getRepository(LicenseLog);
    const list = await logRepo.find({
      order: { createdAt: 'DESC' },
      take: 20
    });

    setCache('recent-logs', list, CACHE_TTL.recentLogs);
    res.json({ success: true, data: list });
  } catch (error: any) {
    console.error('[Admin Dashboard] Get recent logs failed:', error);
    res.status(500).json({ success: false, message: '获取最近日志失败' });
  }
});

// 获取趋势数据（近N天，带缓存）
router.get('/trend', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const cacheKey = `trend_${days}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, _cached: true });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().slice(0, 10);

    // 每日新增授权数
    const licensesTrend = await AppDataSource.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM licenses WHERE created_at >= ?
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
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      dateMap[key] = { licenses: 0, tenants: 0, revenue: 0 };
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
    console.error('[Admin Dashboard] Get trend failed:', error);
    res.status(500).json({ success: false, message: '获取趋势数据失败' });
  }
});

// 获取最近活动（跨表合并，带缓存）
router.get('/activities', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const cacheKey = `activities_${limit}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, _cached: true });
    }

    // 从多个表获取最近操作，合并为活动流
    const activities: any[] = [];

    // 1. 最近新增授权
    try {
      const recentLicenses = await AppDataSource.query(
        `SELECT id, customer_name as title, 'license_created' as type, created_at
         FROM licenses ORDER BY created_at DESC LIMIT 5`
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
         FROM tenants ORDER BY created_at DESC LIMIT 5`
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
         FROM payment_orders ORDER BY created_at DESC LIMIT 5`
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
         FROM versions WHERE status = 'published' ORDER BY created_at DESC LIMIT 3`
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

    // 按时间倒序排列，取前limit条
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const result = activities.slice(0, limit);

    setCache(cacheKey, result, CACHE_TTL.activities);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[Admin Dashboard] Get activities failed:', error);
    res.status(500).json({ success: false, message: '获取最近活动失败' });
  }
});

export default router;
