import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { User } from '../entities/User';
import { Between, In } from 'typeorm';
import { getTenantRepo, tenantSQL } from '../utils/tenantRepo';

const router = Router();

// 所有仪表板路由都需要认证
router.use(authenticateToken);

/**
 * 🔥 统一的业绩计算规则
 * 判断订单是否计入下单业绩
 * 排除的状态：取消申请、已取消、审核拒绝、物流部退回、物流部取消、已退款
 * 待流转状态：所有标记类型都计入（包括normal正常发货单）
 */
const isValidForOrderPerformance = (order: { status: string; markType?: string }): boolean => {
  // 不计入业绩的状态
  const excludedStatuses = [
    'pending_cancel',      // 取消申请
    'cancelled',           // 已取消
    'audit_rejected',      // 审核拒绝
    'logistics_returned',  // 物流部退回
    'logistics_cancelled', // 物流部取消
    'refunded'             // 已退款
  ];

  // 🔥 修复：待流转状态的所有订单都计入业绩（包括normal正常发货单）
  // 其他状态，只要不在排除列表中就计入
  return !excludedStatuses.includes(order.status);
};

/**
 * 判断订单是否计入发货业绩
 */
const isValidForShipmentPerformance = (order: { status: string }): boolean => {
  const shippedStatuses = ['shipped', 'delivered', 'rejected', 'rejected_returned'];
  return shippedStatuses.includes(order.status);
};

/**
 * 判断订单是否计入签收业绩
 */
const isValidForDeliveryPerformance = (order: { status: string }): boolean => {
  return order.status === 'delivered';
};

/**
 * @route GET /api/v1/dashboard/metrics
 * @desc 获取核心指标数据（支持权限过滤）
 * @access Private
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userRole = currentUser?.role;
    const userId = currentUser?.userId;
    const departmentId = currentUser?.departmentId;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 🔥 昨天的时间范围（用于计算日环比）
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // 🔥 上月的时间范围（用于计算月环比）
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // 🔥 根据用户角色构建查询条件
    let userCondition = '';
    const params: any[] = [];

    if (userRole === 'super_admin' || userRole === 'admin') {
      // 管理员看所有数据
      userCondition = '';
    } else if (userRole === 'department_manager' || userRole === 'manager') {
      // 部门经理看本部门数据
      if (departmentId) {
        userCondition = ` AND (o.created_by IN (SELECT id FROM users WHERE department_id = ?) OR o.created_by_department_id = ?)`;
        params.push(departmentId, departmentId);
      }
    } else {
      // 普通员工看自己的数据
      userCondition = ` AND o.created_by = ?`;
      params.push(userId);
    }

    // 🔥 租户数据隔离
    const t = tenantSQL('o.');

    // 今日订单数据
    const todayOrdersData = await AppDataSource.query(
      `SELECT total_amount as totalAmount, status, mark_type as markType
       FROM orders o
       WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${t.sql}`,
      [todayStart, todayEnd, ...params, ...t.params]
    );

    // 🔥 昨日订单数据（用于计算环比）
    const yesterdayOrdersData = await AppDataSource.query(
      `SELECT total_amount as totalAmount, status, mark_type as markType
       FROM orders o
       WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${t.sql}`,
      [yesterdayStart, yesterdayEnd, ...params, ...t.params]
    );

    // 本月订单数据
    const monthlyOrdersData = await AppDataSource.query(
      `SELECT total_amount as totalAmount, status, mark_type as markType
       FROM orders o
       WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${t.sql}`,
      [monthStart, todayEnd, ...params, ...t.params]
    );

    // 🔥 上月订单数据（用于计算环比）
    const lastMonthOrdersData = await AppDataSource.query(
      `SELECT total_amount as totalAmount, status, mark_type as markType
       FROM orders o
       WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${t.sql}`,
      [lastMonthStart, lastMonthEnd, ...params, ...t.params]
    );

    // 过滤有效订单（计入下单业绩）
    const validTodayOrders = todayOrdersData.filter((o: any) => isValidForOrderPerformance(o));
    const todayOrders = validTodayOrders.length;
    const todayRevenue = validTodayOrders.reduce((sum: number, order: any) => sum + (Number(order.totalAmount) || 0), 0);

    const validYesterdayOrders = yesterdayOrdersData.filter((o: any) => isValidForOrderPerformance(o));
    const yesterdayOrders = validYesterdayOrders.length;
    const yesterdayRevenue = validYesterdayOrders.reduce((sum: number, order: any) => sum + (Number(order.totalAmount) || 0), 0);

    const validMonthlyOrders = monthlyOrdersData.filter((o: any) => isValidForOrderPerformance(o));
    const monthlyOrders = validMonthlyOrders.length;
    const monthlyRevenue = validMonthlyOrders.reduce((sum: number, order: any) => sum + (Number(order.totalAmount) || 0), 0);

    const validLastMonthOrders = lastMonthOrdersData.filter((o: any) => isValidForOrderPerformance(o));
    const lastMonthOrders = validLastMonthOrders.length;
    const lastMonthRevenue = validLastMonthOrders.reduce((sum: number, order: any) => sum + (Number(order.totalAmount) || 0), 0);

    // 🔥 计算环比的辅助函数
    const calculateChange = (current: number, previous: number): { change: number; trend: string } => {
      // 如果昨天/上月为0
      if (previous === 0) {
        if (current > 0) {
          // 从0增长到有数据，显示+100%
          return { change: 100, trend: 'up' };
        }
        // 都为0，显示0%
        return { change: 0, trend: 'stable' };
      }

      // 如果今天/本月为0，但昨天/上月有数据
      if (current === 0) {
        // 从有数据降到0，显示-100%
        return { change: -100, trend: 'down' };
      }

      // 正常计算环比
      const rawChange = ((current - previous) / previous) * 100;
      let change = Number(rawChange.toFixed(1));

      // 🔥 修复：如果环比绝对值小于0.1，统一显示为0（避免-0的情况）
      if (Math.abs(change) < 0.1) {
        change = 0;
      }

      const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
      return { change, trend };
    };

    // 🔥 计算各项指标的环比
    const todayOrdersChange = calculateChange(todayOrders, yesterdayOrders);
    const todayRevenueChange = calculateChange(todayRevenue, yesterdayRevenue);
    const monthlyOrdersChange = calculateChange(monthlyOrders, lastMonthOrders);
    const monthlyRevenueChange = calculateChange(monthlyRevenue, lastMonthRevenue);

    // 发货业绩和签收业绩
    const todayShippedOrders = todayOrdersData.filter((o: any) => isValidForShipmentPerformance(o));
    const todayDeliveredOrders = todayOrdersData.filter((o: any) => isValidForDeliveryPerformance(o));
    const monthlyShippedOrders = monthlyOrdersData.filter((o: any) => isValidForShipmentPerformance(o));
    const monthlyDeliveredOrders = monthlyOrdersData.filter((o: any) => isValidForDeliveryPerformance(o));

    const yesterdayShippedOrders = yesterdayOrdersData.filter((o: any) => isValidForShipmentPerformance(o));
    const yesterdayDeliveredOrders = yesterdayOrdersData.filter((o: any) => isValidForDeliveryPerformance(o));
    const lastMonthShippedOrders = lastMonthOrdersData.filter((o: any) => isValidForShipmentPerformance(o));
    const lastMonthDeliveredOrders = lastMonthOrdersData.filter((o: any) => isValidForDeliveryPerformance(o));

    const monthlyDeliveredCount = monthlyDeliveredOrders.length;
    const monthlyDeliveredAmount = monthlyDeliveredOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);
    const lastMonthDeliveredCount = lastMonthDeliveredOrders.length;
    const lastMonthDeliveredAmount = lastMonthDeliveredOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);

    const monthlyDeliveredCountChange = calculateChange(monthlyDeliveredCount, lastMonthDeliveredCount);
    const monthlyDeliveredAmountChange = calculateChange(monthlyDeliveredAmount, lastMonthDeliveredAmount);

    // 🔥 调试日志：输出环比数据
    console.log('[Dashboard API] 环比数据:');
    console.log('  本月订单:', monthlyOrders, '上月订单:', lastMonthOrders, '环比:', monthlyOrdersChange);
    console.log('  本月业绩:', monthlyRevenue, '上月业绩:', lastMonthRevenue, '环比:', monthlyRevenueChange);
    console.log('  本月签收单数:', monthlyDeliveredCount, '上月签收单数:', lastMonthDeliveredCount, '环比:', monthlyDeliveredCountChange);
    console.log('  本月签收业绩:', monthlyDeliveredAmount, '上月签收业绩:', lastMonthDeliveredAmount, '环比:', monthlyDeliveredAmountChange);

    // 待审核和待发货订单（🔥 添加租户隔离）
    const pendingAuditOrders = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM orders o WHERE o.status = 'pending_audit'${userCondition}${t.sql}`,
      [...params, ...t.params]
    );
    const pendingShipmentOrders = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM orders o WHERE o.status = 'pending_shipment'${userCondition}${t.sql}`,
      [...params, ...t.params]
    );

    // 新增客户（🔥 添加租户隔离）
    const ct2 = tenantSQL('');
    let customerCondition = '';
    const customerParams: any[] = [todayStart, todayEnd];
    const yesterdayCustomerParams: any[] = [yesterdayStart, yesterdayEnd];

    if (userRole !== 'super_admin' && userRole !== 'admin') {
      if (userRole === 'department_manager' || userRole === 'manager') {
        if (departmentId) {
          customerCondition = ` AND sales_person_id IN (SELECT id FROM users WHERE department_id = ?)`;
          customerParams.push(departmentId);
          yesterdayCustomerParams.push(departmentId);
        }
      } else {
        customerCondition = ` AND sales_person_id = ?`;
        customerParams.push(userId);
        yesterdayCustomerParams.push(userId);
      }
    }

    const [newCustomersResult] = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM customers WHERE created_at >= ? AND created_at <= ?${customerCondition}${ct2.sql}`,
      [...customerParams, ...ct2.params]
    );

    const [yesterdayCustomersResult] = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM customers WHERE created_at >= ? AND created_at <= ?${customerCondition}${ct2.sql}`,
      [...yesterdayCustomerParams, ...ct2.params]
    );

    const newCustomers = newCustomersResult?.count || 0;
    const yesterdayCustomers = yesterdayCustomersResult?.count || 0;
    const newCustomersChange = calculateChange(newCustomers, yesterdayCustomers);

    res.json({
      success: true,
      code: 200,
      message: '获取核心指标成功',
      data: {
        // 下单业绩
        todayOrders,
        todayOrdersChange: todayOrdersChange.change,
        todayOrdersTrend: todayOrdersChange.trend,

        todayRevenue,
        todayRevenueChange: todayRevenueChange.change,
        todayRevenueTrend: todayRevenueChange.trend,

        monthlyOrders,
        monthlyOrdersChange: monthlyOrdersChange.change,
        monthlyOrdersTrend: monthlyOrdersChange.trend,

        monthlyRevenue,
        monthlyRevenueChange: monthlyRevenueChange.change,
        monthlyRevenueTrend: monthlyRevenueChange.trend,

        newCustomers,
        newCustomersChange: newCustomersChange.change,
        newCustomersTrend: newCustomersChange.trend,

        pendingService: 0,
        pendingServiceChange: 0,
        pendingServiceTrend: 'stable',

        // 待处理
        pendingAudit: pendingAuditOrders[0]?.count || 0,
        pendingAuditChange: 0,
        pendingAuditTrend: 'stable',

        pendingShipment: pendingShipmentOrders[0]?.count || 0,
        pendingShipmentChange: 0,
        pendingShipmentTrend: 'stable',

        // 发货业绩
        todayShippedCount: todayShippedOrders.length,
        todayShippedAmount: todayShippedOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0),
        monthlyShippedCount: monthlyShippedOrders.length,
        monthlyShippedAmount: monthlyShippedOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0),

        // 签收业绩
        todayDeliveredCount: todayDeliveredOrders.length,
        todayDeliveredAmount: todayDeliveredOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0),

        monthlyDeliveredCount,
        monthlyDeliveredCountChange: monthlyDeliveredCountChange.change,
        monthlyDeliveredCountTrend: monthlyDeliveredCountChange.trend,

        monthlyDeliveredAmount,
        monthlyDeliveredAmountChange: monthlyDeliveredAmountChange.change,
        monthlyDeliveredAmountTrend: monthlyDeliveredAmountChange.trend
      }
    });
  } catch (error) {
    console.error('获取核心指标失败:', error);
    res.status(500).json({
      success: false,
      message: '获取核心指标失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});


/**
 * @route GET /api/v1/dashboard/rankings
 * @desc 获取排行榜数据
 * @access Private
 */
router.get('/rankings', async (_req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);
    const userRepository = getTenantRepo(User);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 获取本月订单
    const monthOrders = await orderRepository.find({
      where: {
        createdAt: Between(monthStart, now)
      },
      select: ['createdBy', 'totalAmount', 'status', 'markType'],
      relations: ['orderItems']
    });

    // 🔥 使用新的业绩计算规则过滤有效订单
    const validOrders = monthOrders.filter(o => isValidForOrderPerformance(o));

    // 统计销售人员业绩
    const salesStats: Record<string, { sales: number; orders: number }> = {};
    validOrders.forEach(order => {
      const createdBy = order.createdBy;
      if (!createdBy) return;

      const createdByStr = String(createdBy);
      if (!salesStats[createdByStr]) {
        salesStats[createdByStr] = { sales: 0, orders: 0 };
      }
      salesStats[createdByStr].sales += Number(order.totalAmount) || 0;
      salesStats[createdByStr].orders += 1;
    });

    // 获取用户信息
    const userIds = Object.keys(salesStats);
    const users = userIds.length > 0 ? await userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'realName', 'username', 'avatar']
    }) : [];

    const userMap = new Map(users.map(u => [u.id, u]));

    // 构建销售排行榜
    const salesRankings = Object.entries(salesStats)
      .map(([userIdStr, stats]) => {
        const user = userMap.get(userIdStr);
        return {
          id: userIdStr,
          name: user?.realName || user?.username || '未知用户',
          avatar: user?.avatar || '',
          sales: stats.sales,
          orders: stats.orders,
          growth: 0
        };
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    // 统计产品销售（从订单项中统计）
    const productStats: Record<number, { name: string; sales: number; orders: number; revenue: number }> = {};
    for (const order of validOrders) {
      if (order.orderItems && Array.isArray(order.orderItems)) {
        for (const item of order.orderItems) {
          const productId = item.productId;
          if (!productId) continue;

          if (!productStats[productId]) {
            productStats[productId] = {
              name: item.productName || '未知产品',
              sales: 0,
              orders: 0,
              revenue: 0
            };
          }
          productStats[productId].sales += item.quantity || 0;
          productStats[productId].orders += 1;
          productStats[productId].revenue += Number(item.subtotal) || 0;
        }
      }
    }

    const productRankings = Object.entries(productStats)
      .map(([id, stats]) => ({
        id,
        name: stats.name,
        sales: stats.sales,
        orders: stats.orders,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      success: true,
      code: 200,
      message: '获取排行榜数据成功',
      data: {
        sales: salesRankings,
        products: productRankings
      }
    });
  } catch (error) {
    console.error('获取排行榜数据失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取排行榜数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/dashboard/charts
 * @desc 获取图表数据（支持角色权限过滤）
 * @access Private
 */
router.get('/charts', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userRole = currentUser?.role;
    const userId = currentUser?.userId;
    const departmentId = currentUser?.departmentId;
    const { period = 'month' } = req.query;

    const now = new Date();

    // 🔥 根据用户角色构建查询条件（与metrics保持一致）
    let userCondition = '';
    const baseParams: any[] = [];

    if (userRole === 'super_admin' || userRole === 'admin') {
      // 管理员看所有数据
      userCondition = '';
    } else if (userRole === 'department_manager' || userRole === 'manager') {
      // 部门经理看本部门数据
      if (departmentId) {
        userCondition = ` AND (o.created_by IN (SELECT id FROM users WHERE department_id = ?) OR o.created_by_department_id = ?)`;
        baseParams.push(departmentId, departmentId);
      }
    } else {
      // 普通员工看自己的数据
      userCondition = ` AND o.created_by = ?`;
      baseParams.push(userId);
    }

    const categories: string[] = [];
    const orderRevenueData: number[] = [];  // 下单业绩（金额）
    const deliveredRevenueData: number[] = [];  // 签收业绩（金额）

    // 🔥 租户数据隔离 - 图表查询
    const ct = tenantSQL('o.');

    if (period === 'month') {
      // 本月每天的数据
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), i);
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), i, 23, 59, 59);

        categories.push(`${i}日`);

        const dayOrdersData = await AppDataSource.query(
          `SELECT total_amount as totalAmount, status, mark_type as markType
           FROM orders o
           WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${ct.sql}`,
          [dayStart, dayEnd, ...baseParams, ...ct.params]
        );

        // 下单业绩
        const validOrders = dayOrdersData.filter((o: any) => isValidForOrderPerformance(o));
        orderRevenueData.push(validOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0));

        // 签收业绩
        const deliveredOrders = dayOrdersData.filter((o: any) => isValidForDeliveryPerformance(o));
        deliveredRevenueData.push(deliveredOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0));
      }
    } else if (period === 'week') {
      // 最近7天
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        categories.push(`${date.getMonth() + 1}/${date.getDate()}`);

        const dayOrdersData = await AppDataSource.query(
          `SELECT total_amount as totalAmount, status, mark_type as markType
           FROM orders o
           WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${ct.sql}`,
          [dayStart, dayEnd, ...baseParams, ...ct.params]
        );

        // 下单业绩
        const validOrders = dayOrdersData.filter((o: any) => isValidForOrderPerformance(o));
        orderRevenueData.push(validOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0));

        // 签收业绩
        const deliveredOrders = dayOrdersData.filter((o: any) => isValidForDeliveryPerformance(o));
        deliveredRevenueData.push(deliveredOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0));
      }
    } else {
      // day: 今日每小时数据
      for (let i = 0; i < 24; i++) {
        const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i, 0, 0);
        const hourEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i, 59, 59);

        categories.push(`${i}:00`);

        const hourOrdersData = await AppDataSource.query(
          `SELECT total_amount as totalAmount, status, mark_type as markType
           FROM orders o
           WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${ct.sql}`,
          [hourStart, hourEnd, ...baseParams, ...ct.params]
        );

        // 下单业绩
        const validOrders = hourOrdersData.filter((o: any) => isValidForOrderPerformance(o));
        orderRevenueData.push(validOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0));

        // 签收业绩
        const deliveredOrders = hourOrdersData.filter((o: any) => isValidForDeliveryPerformance(o));
        deliveredRevenueData.push(deliveredOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0));
      }
    }

    // 🔥 获取本月订单状态分布（与汇总卡片保持一致的数据范围）
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthlyOrdersData = await AppDataSource.query(
      `SELECT status, total_amount as totalAmount
       FROM orders o
       WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${ct.sql}`,
      [monthStart, monthEnd, ...baseParams, ...ct.params]
    );

    const statusMap: Record<string, { name: string; count: number; amount: number; color: string }> = {
      pending_transfer: { name: '待流转', count: 0, amount: 0, color: '#909399' },
      pending_audit: { name: '待审核', count: 0, amount: 0, color: '#E6A23C' },
      audit_rejected: { name: '审核拒绝', count: 0, amount: 0, color: '#F56C6C' },
      pending_shipment: { name: '待发货', count: 0, amount: 0, color: '#409EFF' },
      shipped: { name: '已发货', count: 0, amount: 0, color: '#E6A23C' },
      delivered: { name: '已签收', count: 0, amount: 0, color: '#67C23A' },
      logistics_returned: { name: '物流部退回', count: 0, amount: 0, color: '#F56C6C' },
      logistics_cancelled: { name: '物流部取消', count: 0, amount: 0, color: '#F56C6C' },
      package_exception: { name: '包裹异常', count: 0, amount: 0, color: '#E6A23C' },
      rejected: { name: '拒收', count: 0, amount: 0, color: '#F56C6C' },
      pending_cancel: { name: '待取消', count: 0, amount: 0, color: '#909399' },
      cancelled: { name: '已取消', count: 0, amount: 0, color: '#909399' }
    };

    monthlyOrdersData.forEach((order: any) => {
      if (statusMap[order.status]) {
        statusMap[order.status].count += 1;
        statusMap[order.status].amount += Number(order.totalAmount) || 0;
      }
    });

    const orderStatus = Object.entries(statusMap)
      .filter(([_, data]) => data.count > 0)
      .map(([_, data]) => ({
        name: data.name,
        value: data.count,
        amount: data.amount,
        color: data.color
      }));

    res.json({
      success: true,
      code: 200,
      message: '获取图表数据成功',
      data: {
        performance: {
          categories,
          series: [
            { name: '下单业绩', data: orderRevenueData },
            { name: '签收业绩', data: deliveredRevenueData }
          ]
        },
        orderStatus
      }
    });
  } catch (error) {
    console.error('获取图表数据失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取图表数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});


/**
 * @route GET /api/v1/dashboard/todos
 * @desc 获取待办事项数据
 * @access Private
 */
router.get('/todos', async (_req: Request, res: Response) => {
  try {
    const orderRepository = getTenantRepo(Order);

    // 获取待处理订单作为待办事项
    const pendingOrders = await orderRepository.find({
      where: { status: 'pending' },
      take: 10,
      order: { createdAt: 'DESC' }
    });

    const todos = pendingOrders.map(order => ({
      id: String(order.id),
      title: '订单待处理',
      type: 'order',
      priority: 'high',
      status: 'pending',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: `订单号: ${order.orderNumber}`
    }));

    res.json({
      success: true,
      code: 200,
      message: '获取待办事项成功',
      data: todos
    });
  } catch (error) {
    console.error('获取待办事项失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取待办事项失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/dashboard/quick-actions
 * @desc 获取快捷操作数据
 * @access Private
 */
router.get('/quick-actions', (_req: Request, res: Response) => {
  const quickActions = [
    {
      key: 'add_customer',
      label: '新建客户',
      icon: 'UserPlus',
      color: '#409EFF',
      gradient: 'linear-gradient(135deg, #409EFF 0%, #1890ff 100%)',
      route: '/customer/add',
      description: '快速添加新客户'
    },
    {
      key: 'create_order',
      label: '新建订单',
      icon: 'ShoppingCart',
      color: '#67C23A',
      gradient: 'linear-gradient(135deg, #67C23A 0%, #52c41a 100%)',
      route: '/order/add',
      description: '为客户创建新订单'
    },
    {
      key: 'create_service',
      label: '新建售后',
      icon: 'CustomerService',
      color: '#F56C6C',
      gradient: 'linear-gradient(135deg, #F56C6C 0%, #ff4d4f 100%)',
      route: '/service/add',
      description: '创建售后服务单'
    },
    {
      key: 'order_list',
      label: '订单列表',
      icon: 'List',
      color: '#E6A23C',
      gradient: 'linear-gradient(135deg, #E6A23C 0%, #fa8c16 100%)',
      route: '/order/list',
      description: '查看订单列表'
    }
  ];

  res.json({
    success: true,
    code: 200,
    message: '获取快捷操作成功',
    data: quickActions
  });
});

export default router;
