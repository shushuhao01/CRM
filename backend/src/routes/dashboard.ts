import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { User } from '../entities/User';
import { Between, In } from 'typeorm';
import { getTenantRepo, tenantSQL } from '../utils/tenantRepo';

import { log } from '../config/logger';
const router = Router();

// 所有仪表板路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/v1/dashboard
 * @desc 获取仪表板概览数据（返回简单摘要指标）
 * @access Private
 */
router.get('/', async (req: Request, res: Response) => {
  // 将根路由请求直接重定向到 /metrics 子路由的逻辑
  // 通过 302 重定向实现（或直接返回简要信息）
  try {
    res.json({
      success: true,
      code: 200,
      message: '请使用 /dashboard/metrics 获取详细指标',
      data: {
        availableEndpoints: ['/dashboard/metrics', '/dashboard/rankings', '/dashboard/charts', '/dashboard/todos', '/dashboard/quick-actions']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取仪表板数据失败' });
  }
});

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
 * 🔥 SQL 版本的状态过滤条件（与上面 JS 函数 isValidForXxxPerformance 保持同步）
 * 用于 SQL CASE WHEN 聚合查询，替代拉取全量数据后 JS 过滤
 */
const EXCLUDED_ORDER_STATUSES = "('pending_cancel','cancelled','audit_rejected','logistics_returned','logistics_cancelled','refunded')";
const SHIPPED_ORDER_STATUSES = "('shipped','delivered','rejected','rejected_returned')";

/**
 * 🔥 构建订单指标聚合 SQL（COUNT + SUM 条件聚合，每次只返回1行汇总数据）
 * 替代原方案：拉取所有订单行 → JS filter + reduce 统计
 */
const buildMetricsSQL = (userCondition: string, tenantSQL: string): string => {
  return `
    SELECT
      COUNT(CASE WHEN o.status NOT IN ${EXCLUDED_ORDER_STATUSES} THEN 1 END) as orderCount,
      COALESCE(SUM(CASE WHEN o.status NOT IN ${EXCLUDED_ORDER_STATUSES} THEN o.total_amount END), 0) as orderAmount,
      COUNT(CASE WHEN o.status IN ${SHIPPED_ORDER_STATUSES} THEN 1 END) as shippedCount,
      COALESCE(SUM(CASE WHEN o.status IN ${SHIPPED_ORDER_STATUSES} THEN o.total_amount END), 0) as shippedAmount,
      COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as deliveredCount,
      COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount END), 0) as deliveredAmount
    FROM orders o
    WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${tenantSQL}
  `;
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

    // 🔥 租户数据隔离
    const t = tenantSQL('o.');

    // 🔥 根据用户角色构建查询条件
    let userCondition = '';
    const params: any[] = [];

    if (userRole === 'super_admin' || userRole === 'admin') {
      // 管理员看所有数据
      userCondition = '';
    } else if (userRole === 'department_manager' || userRole === 'manager') {
      // 部门经理看本部门数据
      if (departmentId) {
        // 🔥 修复：子查询添加租户隔离，避免跨租户查到相同 department_id 的用户
        const tSub = tenantSQL('');
        userCondition = ` AND (o.created_by IN (SELECT id FROM users WHERE department_id = ?${tSub.sql}) OR o.created_by_department_id = ?)`;
        params.push(departmentId, ...tSub.params, departmentId);
      }
    } else {
      // 普通员工看自己的数据
      userCondition = ` AND o.created_by = ?`;
      params.push(userId);
    }


    // 🔥 性能优化：使用SQL聚合替代全量查询+JS内存过滤
    // 原方案：4次查询拉取所有订单行 → JS filter+reduce 统计（61次查询级别）
    // 优化后：4次SQL聚合查询（每次只返回1行6个指标），减少90%网络传输和内存消耗
    const metricsSQL = buildMetricsSQL(userCondition, t.sql);

    const [todayMetrics] = await AppDataSource.query(metricsSQL, [todayStart, todayEnd, ...params, ...t.params]);
    const [yesterdayMetrics] = await AppDataSource.query(metricsSQL, [yesterdayStart, yesterdayEnd, ...params, ...t.params]);
    const [monthlyMetrics] = await AppDataSource.query(metricsSQL, [monthStart, todayEnd, ...params, ...t.params]);
    const [lastMonthMetrics] = await AppDataSource.query(metricsSQL, [lastMonthStart, lastMonthEnd, ...params, ...t.params]);

    // 从SQL聚合结果中直接取值（已在数据库层完成过滤和汇总）
    let todayOrders = Number(todayMetrics?.orderCount) || 0;
    let todayRevenue = Number(todayMetrics?.orderAmount) || 0;
    let yesterdayOrders = Number(yesterdayMetrics?.orderCount) || 0;
    let yesterdayRevenue = Number(yesterdayMetrics?.orderAmount) || 0;
    let monthlyOrders = Number(monthlyMetrics?.orderCount) || 0;
    let monthlyRevenue = Number(monthlyMetrics?.orderAmount) || 0;
    let lastMonthOrders = Number(lastMonthMetrics?.orderCount) || 0;
    let lastMonthRevenue = Number(lastMonthMetrics?.orderAmount) || 0;

    // 🔥 业绩分享调整 - 仅对非管理员用户（个人、经理）进行调整
    // 管理员看全公司数据，分享是零和重新分配，总量不变
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      const tShareDash = tenantSQL('ps.');
      const tShareDashMem = tenantSQL('psm.');

      // 辅助函数：计算指定时间段内的分享调整
      const calcShareAdjustment = async (periodStart: Date, periodEnd: Date) => {
        let sharedCount = 0, sharedAmount = 0, receivedCount = 0, receivedAmount = 0;

        if (userRole === 'department_manager' || userRole === 'manager') {
          // 部门经理：查询本部门用户相关的分享
          // 本部门用户创建的分享（扣除分给部门外的）
          // 部门外用户分享给本部门成员的（增加）
          // 但由于部门内互相分享是零和，最终只需考虑跨部门的情况
          // 简化方案：部门经理看到的本部门总业绩，跨部门分享会影响
          // 暂时保持原始数据不调整（部门汇总层面分享几乎零和）
          return { sharedCount: 0, sharedAmount: 0, receivedCount: 0, receivedAmount: 0 };
        }

        // 普通员工：查询自己作为创建者和接收者的分享
        // 作为创建者的分享（扣除）
        const creatorShares = await AppDataSource.query(
          `SELECT ps.id, ps.order_amount
           FROM performance_shares ps
           WHERE ps.created_by = ? AND ps.status IN ('active', 'completed')
             AND ps.created_at >= ? AND ps.created_at <= ?${tShareDash.sql}`,
          [userId, periodStart, periodEnd, ...tShareDash.params]
        );

        if (creatorShares.length > 0) {
          const shareIds = creatorShares.map((s: any) => s.id);
          const creatorMembers = await AppDataSource.query(
            `SELECT psm.share_id, psm.share_percentage
             FROM performance_share_members psm
             WHERE psm.share_id IN (${shareIds.map(() => '?').join(',')})${tShareDashMem.sql}`,
            [...shareIds, ...tShareDashMem.params]
          );
          const memByShare: Record<string, any[]> = {};
          creatorMembers.forEach((m: any) => {
            if (!memByShare[m.share_id]) memByShare[m.share_id] = [];
            memByShare[m.share_id].push(m);
          });
          creatorShares.forEach((s: any) => {
            const mems = memByShare[s.id] || [];
            const totalPct = mems.reduce((sum: number, m: any) => sum + (Number(m.share_percentage) || 0), 0) / 100;
            sharedCount += totalPct;
            sharedAmount += (Number(s.order_amount) || 0) * totalPct;
          });
        }

        // 作为接收者的分享（增加）
        const receiverShares = await AppDataSource.query(
          `SELECT psm.share_percentage, ps.order_amount
           FROM performance_share_members psm
           JOIN performance_shares ps ON ps.id = psm.share_id
           WHERE psm.user_id = ? AND ps.status IN ('active', 'completed')
             AND ps.created_at >= ? AND ps.created_at <= ?${tShareDashMem.sql}${tShareDash.sql}`,
          [userId, periodStart, periodEnd, ...tShareDashMem.params, ...tShareDash.params]
        );
        receiverShares.forEach((r: any) => {
          const ratio = (Number(r.share_percentage) || 0) / 100;
          receivedCount += ratio;
          receivedAmount += (Number(r.order_amount) || 0) * ratio;
        });

        return { sharedCount, sharedAmount, receivedCount, receivedAmount };
      };

      // 计算各时间段的分享调整
      const todayAdj = await calcShareAdjustment(todayStart, todayEnd);
      const yesterdayAdj = await calcShareAdjustment(yesterdayStart, yesterdayEnd);
      const monthlyAdj = await calcShareAdjustment(monthStart, todayEnd);
      const lastMonthAdj = await calcShareAdjustment(lastMonthStart, lastMonthEnd);

      // 应用调整
      todayOrders = Math.max(0, todayOrders - todayAdj.sharedCount + todayAdj.receivedCount);
      todayRevenue = Math.max(0, todayRevenue - todayAdj.sharedAmount + todayAdj.receivedAmount);
      yesterdayOrders = Math.max(0, yesterdayOrders - yesterdayAdj.sharedCount + yesterdayAdj.receivedCount);
      yesterdayRevenue = Math.max(0, yesterdayRevenue - yesterdayAdj.sharedAmount + yesterdayAdj.receivedAmount);
      monthlyOrders = Math.max(0, monthlyOrders - monthlyAdj.sharedCount + monthlyAdj.receivedCount);
      monthlyRevenue = Math.max(0, monthlyRevenue - monthlyAdj.sharedAmount + monthlyAdj.receivedAmount);
      lastMonthOrders = Math.max(0, lastMonthOrders - lastMonthAdj.sharedCount + lastMonthAdj.receivedCount);
      lastMonthRevenue = Math.max(0, lastMonthRevenue - lastMonthAdj.sharedAmount + lastMonthAdj.receivedAmount);
    }

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

    // 🔥 性能优化：发货/签收业绩直接从SQL聚合结果中获取，无需再次过滤
    const todayShippedCount = Number(todayMetrics?.shippedCount) || 0;
    const todayShippedAmount = Number(todayMetrics?.shippedAmount) || 0;
    const todayDeliveredCount = Number(todayMetrics?.deliveredCount) || 0;
    const todayDeliveredAmount = Number(todayMetrics?.deliveredAmount) || 0;
    const monthlyShippedCount = Number(monthlyMetrics?.shippedCount) || 0;
    const monthlyShippedAmount = Number(monthlyMetrics?.shippedAmount) || 0;
    const monthlyDeliveredCount = Number(monthlyMetrics?.deliveredCount) || 0;
    const monthlyDeliveredAmount = Number(monthlyMetrics?.deliveredAmount) || 0;
    const lastMonthDeliveredCount = Number(lastMonthMetrics?.deliveredCount) || 0;
    const lastMonthDeliveredAmount = Number(lastMonthMetrics?.deliveredAmount) || 0;

    const monthlyDeliveredCountChange = calculateChange(monthlyDeliveredCount, lastMonthDeliveredCount);
    const monthlyDeliveredAmountChange = calculateChange(monthlyDeliveredAmount, lastMonthDeliveredAmount);


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
          // 🔥 修复：客户查询子查询也需要添加租户隔离
          const ctSub2 = tenantSQL('');
          customerCondition = ` AND sales_person_id IN (SELECT id FROM users WHERE department_id = ?${ctSub2.sql})`;
          customerParams.push(departmentId, ...ctSub2.params);
          yesterdayCustomerParams.push(departmentId, ...ctSub2.params);
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
        todayShippedCount,
        todayShippedAmount,
        monthlyShippedCount,
        monthlyShippedAmount,

        // 签收业绩
        todayDeliveredCount,
        todayDeliveredAmount,

        monthlyDeliveredCount,
        monthlyDeliveredCountChange: monthlyDeliveredCountChange.change,
        monthlyDeliveredCountTrend: monthlyDeliveredCountChange.trend,

        monthlyDeliveredAmount,
        monthlyDeliveredAmountChange: monthlyDeliveredAmountChange.change,
        monthlyDeliveredAmountTrend: monthlyDeliveredAmountChange.trend
      }
    });
  } catch (error) {
    log.error('获取核心指标失败:', error);
    res.status(500).json({
      success: false,
      message: '获取核心指标失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});


/**
 * @route GET /api/v1/dashboard/rankings
 * @desc 获取排行榜数据（支持角色权限过滤 + 租户隔离）
 * @access Private
 */
router.get('/rankings', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userRole = currentUser?.role;
    const departmentId = currentUser?.departmentId;

    const orderRepository = getTenantRepo(Order);
    const userRepository = getTenantRepo(User);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 获取本月订单（getTenantRepo 自动添加租户隔离）
    const monthOrders = await orderRepository.find({
      where: {
        createdAt: Between(monthStart, now)
      },
      select: ['createdBy', 'totalAmount', 'status', 'markType'],
      relations: ['orderItems']
    });

    // 🔥 使用新的业绩计算规则过滤有效订单
    let validOrders = monthOrders.filter(o => isValidForOrderPerformance(o));

    // 🔥 修复：根据用户角色过滤排名数据
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      // 非管理员：只显示本部门的排名
      if (departmentId) {
        // 获取本部门所有用户ID（getTenantRepo 自动加租户隔离）
        const departmentUsers = await userRepository.find({
          where: { departmentId: departmentId } as any,
          select: ['id']
        });
        const departmentUserIds = new Set(departmentUsers.map(u => u.id));
        // 只保留本部门用户的订单
        validOrders = validOrders.filter(o => o.createdBy && departmentUserIds.has(String(o.createdBy)));
      }
    }

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

    // 🔥 业绩分享调整排行榜数据
    try {
      const tRankShare = tenantSQL('ps.');
      const tRankShareMem = tenantSQL('psm.');
      // 获取本月生效的分享记录
      const rankShares = await AppDataSource.query(
        `SELECT ps.id, ps.order_amount, ps.created_by
         FROM performance_shares ps
         WHERE ps.status IN ('active', 'completed')
           AND ps.created_at >= ? AND ps.created_at <= ?${tRankShare.sql}`,
        [monthStart, now, ...tRankShare.params]
      );

      if (rankShares.length > 0) {
        const rankShareIds = rankShares.map((s: any) => s.id);
        const rankShareMembers = await AppDataSource.query(
          `SELECT psm.share_id, psm.user_id, psm.share_percentage
           FROM performance_share_members psm
           WHERE psm.share_id IN (${rankShareIds.map(() => '?').join(',')})${tRankShareMem.sql}`,
          [...rankShareIds, ...tRankShareMem.params]
        );

        // 按share_id分组
        const rankMemByShare: Record<string, any[]> = {};
        rankShareMembers.forEach((m: any) => {
          if (!rankMemByShare[m.share_id]) rankMemByShare[m.share_id] = [];
          rankMemByShare[m.share_id].push(m);
        });

        rankShares.forEach((share: any) => {
          const creatorId = String(share.created_by);
          const members = rankMemByShare[share.id] || [];
          const totalPct = members.reduce((sum: number, m: any) => sum + (Number(m.share_percentage) || 0), 0) / 100;
          const amt = Number(share.order_amount) || 0;

          // 从创建者扣除
          if (salesStats[creatorId]) {
            salesStats[creatorId].sales -= amt * totalPct;
            salesStats[creatorId].orders -= totalPct;
            // 确保不为负
            salesStats[creatorId].sales = Math.max(0, salesStats[creatorId].sales);
            salesStats[creatorId].orders = Math.max(0, salesStats[creatorId].orders);
          }

          // 给接收者增加
          members.forEach((mem: any) => {
            const receiverId = String(mem.user_id);
            const myRatio = (Number(mem.share_percentage) || 0) / 100;
            if (!salesStats[receiverId]) {
              salesStats[receiverId] = { sales: 0, orders: 0 };
            }
            salesStats[receiverId].sales += amt * myRatio;
            salesStats[receiverId].orders += myRatio;
          });
        });
      }
    } catch (shareError) {
      log.warn('[排行榜] 分享调整失败，使用原始数据:', shareError);
    }

    // 获取用户信息（getTenantRepo 自动加租户隔离）
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
    log.error('获取排行榜数据失败:', error);
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

    // 🔥 租户数据隔离 - 图表查询
    const ct = tenantSQL('o.');

    // 🔥 根据用户角色构建查询条件（与metrics保持一致）
    let userCondition = '';
    const baseParams: any[] = [];

    if (userRole === 'super_admin' || userRole === 'admin') {
      // 管理员看所有数据
      userCondition = '';
    } else if (userRole === 'department_manager' || userRole === 'manager') {
      // 部门经理看本部门数据
      if (departmentId) {
        // 🔥 修复：子查询添加租户隔离，避免跨租户查到相同 department_id 的用户
        const ctSub = tenantSQL('');
        userCondition = ` AND (o.created_by IN (SELECT id FROM users WHERE department_id = ?${ctSub.sql}) OR o.created_by_department_id = ?)`;
        baseParams.push(departmentId, ...ctSub.params, departmentId);
      }
    } else {
      // 普通员工看自己的数据
      userCondition = ` AND o.created_by = ?`;
      baseParams.push(userId);
    }

    const categories: string[] = [];
    const orderRevenueData: number[] = [];  // 下单业绩（金额）
    const deliveredRevenueData: number[] = [];  // 签收业绩（金额）
    const orderCountData: number[] = [];  // 下单单数
    const deliveredCountData: number[] = [];  // 签收单数

    // 🔥 性能优化：使用 GROUP BY 聚合替代循环逐日/逐时查询
    // 原方案：month=31次查询, week=7次查询, day=24次查询
    // 优化后：每种视图仅1次SQL查询，使用GROUP BY按时间分组

    if (period === 'month') {
      // 本月每天的数据 — 单次 GROUP BY DAY 查询
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth(), daysInMonth, 23, 59, 59);

      const chartData = await AppDataSource.query(
        `SELECT
          DAY(o.created_at) as dayNum,
          COUNT(CASE WHEN o.status NOT IN ${EXCLUDED_ORDER_STATUSES} THEN 1 END) as orderCount,
          COALESCE(SUM(CASE WHEN o.status NOT IN ${EXCLUDED_ORDER_STATUSES} THEN o.total_amount END), 0) as orderAmount,
          COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as deliveredCount,
          COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount END), 0) as deliveredAmount
        FROM orders o
        WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${ct.sql}
        GROUP BY DAY(o.created_at)`,
        [monthStart, monthEnd, ...baseParams, ...ct.params]
      );

      const dayMap = new Map<number, any>(chartData.map((r: any) => [Number(r.dayNum), r]));
      for (let i = 1; i <= daysInMonth; i++) {
        categories.push(`${i}日`);
        const row = dayMap.get(i);
        orderCountData.push(Number(row?.orderCount) || 0);
        orderRevenueData.push(Number(row?.orderAmount) || 0);
        deliveredCountData.push(Number(row?.deliveredCount) || 0);
        deliveredRevenueData.push(Number(row?.deliveredAmount) || 0);
      }
    } else if (period === 'week') {
      // 最近7天 — 单次 GROUP BY DATE 查询
      const weekStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const chartData = await AppDataSource.query(
        `SELECT
          DATE(o.created_at) as orderDate,
          COUNT(CASE WHEN o.status NOT IN ${EXCLUDED_ORDER_STATUSES} THEN 1 END) as orderCount,
          COALESCE(SUM(CASE WHEN o.status NOT IN ${EXCLUDED_ORDER_STATUSES} THEN o.total_amount END), 0) as orderAmount,
          COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as deliveredCount,
          COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount END), 0) as deliveredAmount
        FROM orders o
        WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${ct.sql}
        GROUP BY DATE(o.created_at)`,
        [weekStart, weekEnd, ...baseParams, ...ct.params]
      );

      const dateMap = new Map<string, any>(chartData.map((r: any) => {
        const d = new Date(r.orderDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        return [key, r];
      }));

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        categories.push(`${date.getMonth() + 1}/${date.getDate()}`);
        const row = dateMap.get(key);
        orderCountData.push(Number(row?.orderCount) || 0);
        orderRevenueData.push(Number(row?.orderAmount) || 0);
        deliveredCountData.push(Number(row?.deliveredCount) || 0);
        deliveredRevenueData.push(Number(row?.deliveredAmount) || 0);
      }
    } else {
      // day: 今日每小时数据 — 单次 GROUP BY HOUR 查询
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const chartData = await AppDataSource.query(
        `SELECT
          HOUR(o.created_at) as hourNum,
          COUNT(CASE WHEN o.status NOT IN ${EXCLUDED_ORDER_STATUSES} THEN 1 END) as orderCount,
          COALESCE(SUM(CASE WHEN o.status NOT IN ${EXCLUDED_ORDER_STATUSES} THEN o.total_amount END), 0) as orderAmount,
          COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as deliveredCount,
          COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount END), 0) as deliveredAmount
        FROM orders o
        WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${ct.sql}
        GROUP BY HOUR(o.created_at)`,
        [dayStart, dayEnd, ...baseParams, ...ct.params]
      );

      const hourMap = new Map<number, any>(chartData.map((r: any) => [Number(r.hourNum), r]));
      for (let i = 0; i < 24; i++) {
        categories.push(`${i}:00`);
        const row = hourMap.get(i);
        orderCountData.push(Number(row?.orderCount) || 0);
        orderRevenueData.push(Number(row?.orderAmount) || 0);
        deliveredCountData.push(Number(row?.deliveredCount) || 0);
        deliveredRevenueData.push(Number(row?.deliveredAmount) || 0);
      }
    }

    // 🔥 获取本月订单状态分布（使用 GROUP BY 聚合替代全量拉取）
    const statusMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const statusMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const statusAggData = await AppDataSource.query(
      `SELECT o.status, COUNT(*) as cnt, COALESCE(SUM(o.total_amount), 0) as amt
       FROM orders o
       WHERE o.created_at >= ? AND o.created_at <= ?${userCondition}${ct.sql}
       GROUP BY o.status`,
      [statusMonthStart, statusMonthEnd, ...baseParams, ...ct.params]
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

    statusAggData.forEach((row: any) => {
      if (statusMap[row.status]) {
        statusMap[row.status].count = Number(row.cnt) || 0;
        statusMap[row.status].amount = Number(row.amt) || 0;
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
            { name: '下单业绩', data: orderRevenueData, counts: orderCountData },
            { name: '签收业绩', data: deliveredRevenueData, counts: deliveredCountData }
          ]
        },
        orderStatus
      }
    });
  } catch (error) {
    log.error('获取图表数据失败:', error);
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
 * @desc 获取待办事项数据（支持角色权限过滤 + 租户隔离）
 * @access Private
 */
router.get('/todos', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userRole = currentUser?.role;
    const userId = currentUser?.userId;

    const orderRepository = getTenantRepo(Order);

    // 🔥 修复：根据用户角色构建查询条件
    const whereCondition: any = { status: 'pending' };

    // 非管理员只能看到自己创建的待办订单
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      whereCondition.createdBy = userId;
    }

    // 获取待处理订单作为待办事项（getTenantRepo 自动添加租户隔离）
    const pendingOrders = await orderRepository.find({
      where: whereCondition,
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
    log.error('获取待办事项失败:', error);
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
