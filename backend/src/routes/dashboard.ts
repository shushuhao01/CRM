import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * 仪表板路由
 * 提供仪表板相关的数据接口
 */

// 所有仪表板路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/v1/dashboard/rankings
 * @desc 获取排行榜数据
 * @access Private
 */
router.get('/rankings', (req, res) => {
  // 模拟销售排行榜数据
  const salesRanking = Array.from({ length: 10 }, (_, i) => ({
    id: `sales_${i + 1}`,
    name: `销售员${i + 1}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
    orders: Math.floor(Math.random() * 50) + 20,
    revenue: Math.floor(Math.random() * 100000) + 50000,
    change: `+${(Math.random() * 20 + 5).toFixed(1)}%`,
    trend: Math.random() > 0.3 ? 'up' : 'down'
  })).sort((a, b) => b.revenue - a.revenue);

  // 模拟产品排行榜数据
  const productRanking = Array.from({ length: 10 }, (_, i) => ({
    id: `product_${i + 1}`,
    name: `产品${String.fromCharCode(65 + i)}`,
    image: `https://picsum.photos/40/40?random=${i}`,
    sales: Math.floor(Math.random() * 200) + 50,
    revenue: Math.floor(Math.random() * 80000) + 30000,
    change: `+${(Math.random() * 25 + 8).toFixed(1)}%`,
    trend: Math.random() > 0.2 ? 'up' : 'down'
  })).sort((a, b) => b.sales - a.sales);

  res.json({
    success: true,
    data: {
      sales: salesRanking,
      products: productRanking
    }
  });
});

/**
 * @route GET /api/v1/dashboard/charts
 * @desc 获取图表数据
 * @access Private
 */
router.get('/charts', (req, res) => {
  const categories = ['1月', '2月', '3月', '4月', '5月', '6月'];
  
  const chartData = {
    performance: {
      categories,
      series: [
        {
          name: '订单数量',
          data: categories.map(() => Math.floor(Math.random() * 200) + 100)
        },
        {
          name: '销售额',
          data: categories.map(() => Math.floor(Math.random() * 500) + 300)
        }
      ]
    },
    orderStatus: [
      { name: '待处理', value: Math.floor(Math.random() * 50) + 20, color: '#409EFF' },
      { name: '处理中', value: Math.floor(Math.random() * 80) + 40, color: '#E6A23C' },
      { name: '已完成', value: Math.floor(Math.random() * 150) + 100, color: '#67C23A' },
      { name: '已取消', value: Math.floor(Math.random() * 20) + 5, color: '#F56C6C' }
    ]
  };

  res.json({
    success: true,
    data: chartData
  });
});

/**
 * @route GET /api/v1/dashboard/todos
 * @desc 获取待办事项数据
 * @access Private
 */
router.get('/todos', (req, res) => {
  const todoTypes = ['order', 'customer', 'service', 'system'] as const;
  const priorities = ['high', 'medium', 'low'] as const;
  const statuses = ['pending', 'processing'] as const;
  
  const todos = Array.from({ length: 8 }, (_, i) => ({
    id: `todo_${i + 1}`,
    title: `待办事项 ${i + 1}`,
    type: todoTypes[Math.floor(Math.random() * todoTypes.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    deadline: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: `这是待办事项 ${i + 1} 的详细描述`
  }));

  res.json({
    success: true,
    data: todos
  });
});

/**
 * @route GET /api/v1/dashboard/quick-actions
 * @desc 获取快捷操作数据
 * @access Private
 */
router.get('/quick-actions', (req, res) => {
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

/**
 * @route GET /api/v1/dashboard/metrics
 * @desc 获取核心指标数据
 * @access Private
 */
router.get('/metrics', (req, res) => {
  const metrics = {
    orders: {
      today: Math.floor(Math.random() * 200) + 100,
      change: `+${(Math.random() * 20 + 5).toFixed(1)}%`,
      trend: 'up'
    },
    customers: {
      today: Math.floor(Math.random() * 100) + 50,
      change: `+${(Math.random() * 15 + 3).toFixed(1)}%`,
      trend: 'up'
    },
    revenue: {
      today: Math.floor(Math.random() * 50000) + 30000,
      change: `+${(Math.random() * 25 + 10).toFixed(1)}%`,
      trend: 'up'
    },
    monthlyOrders: {
      count: Math.floor(Math.random() * 2000) + 1000,
      change: `+${(Math.random() * 30 + 15).toFixed(1)}%`,
      trend: 'up'
    }
  };

  res.json({
    success: true,
    data: metrics
  });
});

export default router;