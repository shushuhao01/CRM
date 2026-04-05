/**
 * 统计服务
 */
import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/Tenant';
import { License } from '../entities/License';
import { PrivateCustomer } from '../entities/PrivateCustomer';
import { cacheService } from './CacheService';

import { log } from '../config/logger';
export class StatisticsService {
  /**
   * 获取仪表盘统计数据（带缓存）
   */
  async getDashboardStats(): Promise<any> {
    return cacheService.getOrSet(
      'dashboard:stats',
      () => this.fetchDashboardStats(),
      300 // 5分钟缓存
    );
  }

  /**
   * 获取仪表盘统计数据（实际查询）
   */
  private async fetchDashboardStats(): Promise<any> {
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const licenseRepo = AppDataSource.getRepository(License);
    const privateRepo = AppDataSource.getRepository(PrivateCustomer);

    // 租户统计
    const [totalTenants, activeTenants, expiredTenants] = await Promise.all([
      tenantRepo.count(),
      tenantRepo.count({ where: { status: 'active' } }),
      tenantRepo.count({ where: { status: 'expired' } })
    ]);

    // 本月新增租户
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const newTenantsThisMonth = await tenantRepo
      .createQueryBuilder('tenant')
      .where('tenant.createdAt >= :start', { start: thisMonthStart })
      .getCount();

    // 授权统计
    const [totalLicenses, activeLicenses, expiredLicenses, trialLicenses] = await Promise.all([
      licenseRepo.count(),
      licenseRepo.count({ where: { status: 'active' } }),
      licenseRepo.count({ where: { status: 'expired' } }),
      licenseRepo.count({ where: { licenseType: 'trial' } })
    ]);

    // 即将到期的授权（30天内）
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const expiringLicenses = await licenseRepo
      .createQueryBuilder('license')
      .where('license.status = :status', { status: 'active' })
      .andWhere('license.expiresAt IS NOT NULL')
      .andWhere('license.expiresAt <= :date', { date: thirtyDaysLater })
      .getCount();

    // 收入统计（直接SQL查询payment_orders表）
    const [totalRevRow, thisMonthRevRow, todayRevRow, lastMonthRevRow] = await Promise.all([
      AppDataSource.query("SELECT COALESCE(SUM(amount),0) as total FROM payment_orders WHERE status='paid'"),
      AppDataSource.query("SELECT COALESCE(SUM(amount),0) as total FROM payment_orders WHERE status='paid' AND paid_at >= ?", [thisMonthStart]),
      AppDataSource.query("SELECT COALESCE(SUM(amount),0) as total FROM payment_orders WHERE status='paid' AND DATE(paid_at) = CURDATE()"),
      AppDataSource.query("SELECT COALESCE(SUM(amount),0) as total FROM payment_orders WHERE status='paid' AND paid_at >= ? AND paid_at < ?",
        [new Date(new Date(thisMonthStart).setMonth(thisMonthStart.getMonth()-1)), thisMonthStart])
    ]);
    const totalRevenue   = Number(totalRevRow[0]?.total   || 0);
    const thisMonthRevenue = Number(thisMonthRevRow[0]?.total || 0);
    const todayRevenue   = Number(todayRevRow[0]?.total   || 0);
    const lastMonthRevenue = Number(lastMonthRevRow[0]?.total || 0);

    const revenueGrowthRate = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(2)
      : '0.00';

    // 订单统计
    const [totalOrdersRow, pendingOrdersRow, paidOrdersRow] = await Promise.all([
      AppDataSource.query("SELECT COUNT(*) as c FROM payment_orders"),
      AppDataSource.query("SELECT COUNT(*) as c FROM payment_orders WHERE status='pending'"),
      AppDataSource.query("SELECT COUNT(*) as c FROM payment_orders WHERE status='paid'")
    ]);
    const totalOrders   = Number(totalOrdersRow[0]?.c   || 0);
    const pendingOrders = Number(pendingOrdersRow[0]?.c || 0);
    const paidOrders    = Number(paidOrdersRow[0]?.c    || 0);

    // 私有客户统计
    const [totalPrivateCustomers, activePrivateCustomers] = await Promise.all([
      privateRepo.count(),
      privateRepo.count({ where: { status: 'active' } })
    ]);

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        expired: expiredTenants,
        newThisMonth: newTenantsThisMonth
      },
      licenses: {
        total: totalLicenses,
        active: activeLicenses,
        expired: expiredLicenses,
        trial: trialLicenses,
        expiringSoon: expiringLicenses
      },
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        today: todayRevenue,
        growthRate: revenueGrowthRate
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        paid: paidOrders
      },
      privateCustomers: {
        total: totalPrivateCustomers,
        active: activePrivateCustomers
      }
    };
  }

  /**
   * 获取租户统计（带缓存）
   */
  async getTenantStats(params: {
    startDate?: string;
    endDate?: string;
    packageId?: string;
  }): Promise<any> {
    const cacheKey = `tenant:stats:${JSON.stringify(params)}`;
    return cacheService.getOrSet(
      cacheKey,
      () => this.fetchTenantStats(params),
      600 // 10分钟缓存
    );
  }

  /**
   * 获取租户统计（实际查询）
   */
  private async fetchTenantStats(params: {
    startDate?: string;
    endDate?: string;
    packageId?: string;
  }): Promise<any> {
    try {
      const tenantRepo = AppDataSource.getRepository(Tenant);

      let query = tenantRepo.createQueryBuilder('tenant');

      if (params.startDate) {
        query = query.andWhere('tenant.createdAt >= :startDate', { startDate: params.startDate });
      }
      if (params.endDate) {
        query = query.andWhere('tenant.createdAt <= :endDate', { endDate: `${params.endDate} 23:59:59` });
      }
      if (params.packageId) {
        query = query.andWhere('tenant.packageId = :packageId', { packageId: params.packageId });
      }

      const [total, active, expired, suspended] = await Promise.all([
        query.clone().getCount(),
        query.clone().andWhere('tenant.status = :status', { status: 'active' }).getCount(),
        query.clone().andWhere('tenant.status = :status', { status: 'expired' }).getCount(),
        query.clone().andWhere('tenant.status = :status', { status: 'suspended' }).getCount()
      ]);

      // 按套餐统计
      const byPackage = await tenantRepo
        .createQueryBuilder('tenant')
        .select('tenant.packageName', 'packageName')
        .addSelect('COUNT(*)', 'count')
        .groupBy('tenant.packageName')
        .getRawMany();

      return {
        total,
        active,
        expired,
        suspended,
        byPackage
      };
    } catch (error) {
      log.error('[StatisticsService] Fetch tenant stats failed:', error);
      // 返回默认值
      return {
        total: 0,
        active: 0,
        expired: 0,
        suspended: 0,
        byPackage: []
      };
    }
  }

  /**
   * 获取收入统计（带缓存）
   */
  async getRevenueStats(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'month' | 'year';
  }): Promise<any> {
    const cacheKey = `revenue:stats:${JSON.stringify(params)}`;
    return cacheService.getOrSet(
      cacheKey,
      () => this.fetchRevenueStats(params),
      600 // 10分钟缓存
    );
  }

  /**
   * 获取收入统计（实际查询）
   */
  private async fetchRevenueStats(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'month' | 'year';
  }): Promise<any> {
    const conditions: string[] = ["status='paid'"];
    const values: any[] = [];
    if (params.startDate) { conditions.push('paid_at >= ?'); values.push(params.startDate); }
    if (params.endDate)   { conditions.push('paid_at <= ?'); values.push(`${params.endDate} 23:59:59`); }
    const where = conditions.join(' AND ');

    const dateExpr = params.groupBy === 'month' ? "DATE_FORMAT(paid_at,'%Y-%m')"
                   : params.groupBy === 'year'  ? "DATE_FORMAT(paid_at,'%Y')"
                   : "DATE(paid_at)";

    const [totalResult, byPayType, trend] = await Promise.all([
      AppDataSource.query(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM payment_orders WHERE ${where}`, values),
      AppDataSource.query(`SELECT pay_type as payType, COALESCE(SUM(amount),0) as amount, COUNT(*) as count FROM payment_orders WHERE ${where} GROUP BY pay_type`, values),
      AppDataSource.query(`SELECT ${dateExpr} as date, COALESCE(SUM(amount),0) as amount, COUNT(*) as count FROM payment_orders WHERE ${where} GROUP BY date ORDER BY date ASC`, values)
    ]);

    return {
      total: Number(totalResult[0]?.total || 0),
      count: Number(totalResult[0]?.count || 0),
      byPayType,
      trend
    };
  }

  /**
   * 获取用户统计
   */
  async getUserStats(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const tenantRepo = AppDataSource.getRepository(Tenant);

      // 获取所有租户的用户数统计
      const result = await tenantRepo
        .createQueryBuilder('tenant')
        .select('COALESCE(SUM(tenant.currentUsers), 0)', 'totalUsers')
        .addSelect('COALESCE(AVG(tenant.currentUsers), 0)', 'avgUsers')
        .addSelect('MAX(tenant.currentUsers)', 'maxUsers')
        .getRawOne();

      return {
        totalUsers: Number(result.totalUsers),
        avgUsers: Number(result.avgUsers).toFixed(2),
        maxUsers: Number(result.maxUsers)
      };
    } catch (error) {
      log.error('[StatisticsService] Get user stats failed:', error);
      // 返回默认值
      return {
        totalUsers: 0,
        avgUsers: '0.00',
        maxUsers: 0
      };
    }
  }

  /**
   * 获取趋势分析
   */
  async getTrendAnalysis(days: number = 30): Promise<any> {
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 收入趋势（直接SQL）
    const revenueTrend = await AppDataSource.query(
      `SELECT DATE(paid_at) as date, COALESCE(SUM(amount),0) as amount
       FROM payment_orders WHERE status='paid' AND paid_at >= ?
       GROUP BY date ORDER BY date ASC`,
      [startDate]
    );

    // 租户增长趋势
    const tenantTrend = await tenantRepo
      .createQueryBuilder('tenant')
      .where('tenant.createdAt >= :startDate', { startDate })
      .select('DATE(tenant.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      revenueTrend,
      tenantTrend
    };
  }
}

export const statisticsService = new StatisticsService();
