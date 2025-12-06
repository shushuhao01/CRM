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

    // 今日订单数（排除已取消）
    const todayOrders = await orderRepository.count({
      where: {
        createdAt: Between(todayStart, todayEnd)
      }
    });

    // 今日新增客户
    const newCustomers = await customerRepository.count({
      where: {
        createdAt: Between(todayStart, todayEnd)
      }
    });

    // 今日业绩
    const todayOrdersData = await orderRepository.find({
      where: {
        createdAt: Between(todayStart, todayEnd)
      },
      select: ['totalAmount', 'status']
    });
    const todayRevenue = todayOrdersData
      .filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);

    // 本月订单数
    const monthlyOrders = await orderRepository.count({
      where: {
        createdAt: Between(monthStart, todayEnd)
      }
    });

    // 本月业绩
    const monthlyOrdersData = await orderRepository.find({
      where: {
        createdAt: Between(monthStart, todayEnd)
      },
      select: ['totalAmount', 'status']
    });
    const monthlyRevenue = monthlyOrdersData
      .filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);

    res.json({
      success: true,
      data: {
        todayOrders,
        newCustomers,
        todayRevenue,
        monthlyOrders,
        monthlyRevenue,
        pendingService: 0
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

    // 获取本月订单（排除已取消和已退款）
    const monthOrders = await orderRepository.find({
      where: {
        createdAt: Between(monthStart, now)
      },
      select: ['salesUserId', 'totalAmount', 'status'],
      relations: ['orderItems']
    });

    // 过滤有效订单
    const validOrders = monthOrders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded');

    // 统计销售人员业绩
    const salesStats: Record<string, { sales: number; orders: number }> = {};
    validOrders.forEach(order => {
      const salesUserId = order.salesUserId;
      if (!salesUserId) return;

      const salesUserIdStr = String(salesUserId);
      if (!salesStats[salesUserIdStr]) {
        salesStats[salesUserIdStr] = { sales: 0, orders: 0 };
      }
      salesStats[salesUserIdStr].sales += Number(order.totalAmount) || 0;
      salesStats[salesUserIdStr].orders += 1;
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
          select: ['totalAmount', 'status']
        });

        const validOrders = monthOrders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded');
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
          select: ['totalAmount', 'status']
        });

        const validOrders = weekOrders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded');
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
          select: ['totalAmount', 'status']
        });

        const validOrders = dayOrders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded');
        ordersData.push(validOrders.length);
        revenueData.push(validOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0));
      }
    }

    // 获取订单状态分布
    const allOrders = await orderRepository.find({
      select: ['status']
    });

    const statusMap: Record<string, { name: string; count: number; color: string }> = {
      pending: { name: '待处理', count: 0, color: '#909399' },
      confirmed: { name: '已确认', count: 0, color: '#409EFF' },
      paid: { name: '已支付', count: 0, color: '#67C23A' },
      shipped: { name: '已发货', count: 0, color: '#E6A23C' },
      delivered: { name: '已送达', count: 0, color: '#67C23A' },
      completed: { name: '已完成', count: 0, color: '#67C23A' },
      cancelled: { name: '已取消', count: 0, color: '#F56C6C' },
      refunded: { name: '已退款', count: 0, color: '#F56C6C' }
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
      description: `订单号: ${order.orderNo}`
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
