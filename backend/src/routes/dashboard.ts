import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { Customer } from '../entities/Customer';
import { User } from '../entities/User';
import { Between, In } from 'typeorm';

const router = Router();

// 所有仪表板路由都需要认证
router.use(authenticateToken);

/**
 * 🔥 统一的业绩计算规则
 * 判断订单是否计入下单业绩
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

  // 如果是待流转状态，需要检查markType
  if (order.status === 'pending_transfer') {
    // 只有正常发货单才计入业绩，预留单和退单不计入
    return order.markType === 'normal';
  }

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
 * @desc 获取核心指标数据
 * @access Private
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const customerRepository = AppDataSource.getRepository(Customer);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 今日新增客户
    const newCustomers = await customerRepository.count({
      where: {
        createdAt: Between(todayStart, todayEnd)
      }
    });

    // 🔥 今日订单数据（使用新的业绩计算规则）
    const todayOrdersData = await orderRepository.find({
      where: {
        createdAt: Between(todayStart, todayEnd)
      },
      select: ['totalAmount', 'status', 'markType']
    });

    // 过滤有效订单（计入下单业绩）
    const validTodayOrders = todayOrdersData.filter(o => isValidForOrderPerformance(o));
    const todayOrders = validTodayOrders.length;
    const todayRevenue = validTodayOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);

    // 🔥 本月订单数据（使用新的业绩计算规则）
    const monthlyOrdersData = await orderRepository.find({
      where: {
        createdAt: Between(monthStart, todayEnd)
      },
      select: ['totalAmount', 'status', 'markType']
    });

    // 过滤有效订单（计入下单业绩）
    const validMonthlyOrders = monthlyOrdersData.filter(o => isValidForOrderPerformance(o));
    const monthlyOrders = validMonthlyOrders.length;
    const monthlyRevenue = validMonthlyOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);

    // 🔥 发货业绩和签收业绩（可选返回）
    const todayShippedOrders = todayOrdersData.filter(o => isValidForShipmentPerformance(o));
    const todayDeliveredOrders = todayOrdersData.filter(o => isValidForDeliveryPerformance(o));
    const monthlyShippedOrders = monthlyOrdersData.filter(o => isValidForShipmentPerformance(o));
    const monthlyDeliveredOrders = monthlyOrdersData.filter(o => isValidForDeliveryPerformance(o));

    res.json({
      success: true,
      data: {
        // 下单业绩
        todayOrders,
        todayRevenue,
        monthlyOrders,
        monthlyRevenue,
        newCustomers,
        pendingService: 0,
        // 发货业绩
        todayShippedCount: todayShippedOrders.length,
        todayShippedAmount: todayShippedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
        monthlyShippedCount: monthlyShippedOrders.length,
        monthlyShippedAmount: monthlyShippedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
        // 签收业绩
        todayDeliveredCount: todayDeliveredOrders.length,
        todayDeliveredAmount: todayDeliveredOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
        monthlyDeliveredCount: monthlyDeliveredOrders.length,
        monthlyDeliveredAmount: monthlyDeliveredOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
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
    const orderRepository = AppDataSource.getRepository(Order);
    const userRepository = AppDataSource.getRepository(User);

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
      data: {
        sales: salesRankings,
        products: productRankings
      }
    });
  } catch (error) {
    console.error('获取排行榜数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取排行榜数据失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/dashboard/charts
 * @desc 获取图表数据
 * @access Private
 */
router.get('/charts', async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const { period = 'month' } = req.query;

    const now = new Date();
    const categories: string[] = [];
    const revenueData: number[] = [];
    const ordersData: number[] = [];

    if (period === 'month') {
      // 最近6个月
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        categories.push(`${date.getMonth() + 1}月`);

        const monthOrders = await orderRepository.find({
          where: {
            createdAt: Between(date, monthEnd)
          },
          select: ['totalAmount', 'status', 'markType']
        });

        // 🔥 使用新的业绩计算规则
        const validOrders = monthOrders.filter(o => isValidForOrderPerformance(o));
        ordersData.push(validOrders.length);
        revenueData.push(validOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0));
      }
    } else if (period === 'week') {
      // 最近8周
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

        categories.push(`第${8 - i}周`);

        const weekOrders = await orderRepository.find({
          where: {
            createdAt: Between(weekStart, weekEnd)
          },
          select: ['totalAmount', 'status', 'markType']
        });

        // 🔥 使用新的业绩计算规则
        const validOrders = weekOrders.filter(o => isValidForOrderPerformance(o));
        ordersData.push(validOrders.length);
        revenueData.push(validOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0));
      }
    } else {
      // 最近7天
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        categories.push(`${date.getMonth() + 1}/${date.getDate()}`);

        const dayOrders = await orderRepository.find({
          where: {
            createdAt: Between(dayStart, dayEnd)
          },
          select: ['totalAmount', 'status', 'markType']
        });

        // 🔥 使用新的业绩计算规则
        const validOrders = dayOrders.filter(o => isValidForOrderPerformance(o));
        ordersData.push(validOrders.length);
        revenueData.push(validOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0));
      }
    }

    // 获取订单状态分布
    const allOrders = await orderRepository.find({
      select: ['status']
    });

    const statusMap: Record<string, { name: string; count: number; color: string }> = {
      pending_transfer: { name: '待流转', count: 0, color: '#909399' },
      pending_audit: { name: '待审核', count: 0, color: '#E6A23C' },
      audit_rejected: { name: '审核拒绝', count: 0, color: '#F56C6C' },
      pending_shipment: { name: '待发货', count: 0, color: '#409EFF' },
      shipped: { name: '已发货', count: 0, color: '#67C23A' },
      delivered: { name: '已签收', count: 0, color: '#67C23A' },
      logistics_returned: { name: '物流部退回', count: 0, color: '#F56C6C' },
      cancelled: { name: '已取消', count: 0, color: '#909399' }
    };

    allOrders.forEach(order => {
      if (statusMap[order.status]) {
        statusMap[order.status].count += 1;
      }
    });

    const orderStatus = Object.entries(statusMap)
      .filter(([_, data]) => data.count > 0)
      .map(([_, data]) => ({
        name: data.name,
        value: data.count,
        color: data.color
      }));

    res.json({
      success: true,
      data: {
        performance: {
          categories,
          series: [
            { name: '订单数量', data: ordersData },
            { name: '销售额', data: revenueData }
          ]
        },
        orderStatus
      }
    });
  } catch (error) {
    console.error('获取图表数据失败:', error);
    res.status(500).json({
      success: false,
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
    const orderRepository = AppDataSource.getRepository(Order);

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
      data: todos
    });
  } catch (error) {
    console.error('获取待办事项失败:', error);
    res.status(500).json({
      success: false,
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
    data: quickActions
  });
});

export default router;
