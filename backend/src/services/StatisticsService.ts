/**
 * 统计服务
 */
import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/Tenant';
import { License } from '../entities/License';
import { PaymentOrder } from '../entities/PaymentOrder';
import { PrivateCustomer } from '../entities/PrivateCustomer';
import { cacheService } from './CacheService';

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
    const paymentRepo = AppDataSource.getRepository(PaymentOrder);
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

    // 收入统计
    const [totalRevenue, thisMonthRevenue, todayRevenue] = await Promise.all([
      paymentRepo
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: 'paid' })
        .select('COALESCE(SUM(payment.amount), 0)', 'total')
        .getRawOne()
        .then(r => Number(r.total)),
      paymentRepo
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: 'paid' })
        .andWhere('payment.paidAt >= :start', { start: thisMonthStart })
        .select('COALESCE(SUM(payment.amount), 0)', 'total')
        .getRawOne()
        .then(r => Number(r.total)),
      paymentRepo
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: 'paid' })
        .andWhere('DATE(payment.paidAt) = CURDATE()')
        .select('COALESCE(SUM(payment.amount), 0)', 'total')
        .getRawOne()
        .then(r => Number(r.total))
    ]);

    // 上月收入（用于计算增长率）
    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthRevenue = await paymentRepo
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: 'paid' })
      .andWhere('payment.paidAt >= :start', { start: lastMonthStart })
      .andWhere('payment.paidAt < :end', { end: thisMonthStart })
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .getRawOne()
      .then(r => Number(r.total));

    const revenueGrowthRate = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(2)
      : '0.00';

    // 订单统计
    const [totalOrders, pendingOrders, paidOrders] = await Promise.all([
      paymentRepo.count(),
      paymentRepo.count({ where: { status: 'pending' } }),
      paymentRepo.count({ where: { status: 'paid' } })
    ]);

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
      console.error('[StatisticsService] Fetch tenant stats failed:', error);
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
    const paymentRepo = AppDataSource.getRepository(PaymentOrder);

    let query = paymentRepo
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: 'paid' });

    if (params.startDate) {
      query = query.andWhere('payment.paidAt >= :startDate', { startDate: params.startDate });
    }
    if (params.endDate) {
      query = query.andWhere('payment.paidAt <= :endDate', { endDate: `${params.endDate} 23:59:59` });
    }

    // 总收入
    const totalResult = await query.clone()
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .getRawOne();

    // 按支付方式统计
    const byPayType = await query.clone()
      .select('payment.payType', 'payType')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'amount')
      .addSelect('COUNT(*)', 'count')
      .groupBy('payment.payType')
      .getRawMany();

    // 按时间统计
    let dateFormat = 'DATE(payment.paidAt)';
    if (params.groupBy === 'month') {
      dateFormat = 'DATE_FORMAT(payment.paidAt, "%Y-%m")';
    } else if (params.groupBy === 'year') {
      dateFormat = 'DATE_FORMAT(payment.paidAt, "%Y")';
    }

    const trend = await query.clone()
      .select(dateFormat, 'date')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'amount')
      .addSelect('COUNT(*)', 'count')
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      total: Number(totalResult.total),
      count: Number(totalResult.count),
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
      console.error('[StatisticsService] Get user stats failed:', error);
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
    const paymentRepo = AppDataSource.getRepository(PaymentOrder);
    const tenantRepo = AppDataSource.getRepository(Tenant);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 收入趋势
    const revenueTrend = await paymentRepo
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: 'paid' })
      .andWhere('payment.paidAt >= :startDate', { startDate })
      .select('DATE(payment.paidAt)', 'date')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'amount')
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

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
