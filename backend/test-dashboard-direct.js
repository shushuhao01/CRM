/**
 * 直接测试数据看板metrics接口
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function testDashboardMetrics() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_local'
  });

  try {
    console.log('=== 模拟后端dashboard metrics计算 ===\n');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 上月范围
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    console.log('本月范围:', monthStart.toLocaleString(), '~', todayEnd.toLocaleString());
    console.log('上月范围:', lastMonthStart.toLocaleString(), '~', lastMonthEnd.toLocaleString());
    console.log('');

    // 查询本月订单
    const [monthlyOrdersData] = await connection.query(
      `SELECT total_amount as totalAmount, status, mark_type as markType
       FROM orders
       WHERE created_at >= ? AND created_at <= ?`,
      [monthStart, todayEnd]
    );

    // 查询上月订单
    const [lastMonthOrdersData] = await connection.query(
      `SELECT total_amount as totalAmount, status, mark_type as markType
       FROM orders
       WHERE created_at >= ? AND created_at <= ?`,
      [lastMonthStart, lastMonthEnd]
    );

    // 过滤有效订单
    const isValidForOrderPerformance = (order) => {
      const excludedStatuses = [
        'pending_cancel', 'cancelled', 'audit_rejected',
        'logistics_returned', 'logistics_cancelled', 'refunded'
      ];
      return !excludedStatuses.includes(order.status);
    };

    const validMonthlyOrders = monthlyOrdersData.filter(o => isValidForOrderPerformance(o));
    const validLastMonthOrders = lastMonthOrdersData.filter(o => isValidForOrderPerformance(o));

    const monthlyOrders = validMonthlyOrders.length;
    const monthlyRevenue = validMonthlyOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);

    const lastMonthOrders = validLastMonthOrders.length;
    const lastMonthRevenue = validLastMonthOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);

    console.log('本月订单数:', monthlyOrders);
    console.log('本月业绩:', monthlyRevenue);
    console.log('上月订单数:', lastMonthOrders);
    console.log('上月业绩:', lastMonthRevenue);
    console.log('');

    // 计算环比
    const calculateChange = (current, previous) => {
      if (previous === 0) {
        if (current > 0) return { change: 100, trend: 'up' };
        return { change: 0, trend: 'stable' };
      }
      if (current === 0) return { change: -100, trend: 'down' };

      const rawChange = ((current - previous) / previous) * 100;
      let change = Number(rawChange.toFixed(1));

      if (Math.abs(change) < 0.1) {
        change = 0;
      }

      const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
      return { change, trend };
    };

    const monthlyOrdersChange = calculateChange(monthlyOrders, lastMonthOrders);
    const monthlyRevenueChange = calculateChange(monthlyRevenue, lastMonthRevenue);

    console.log('=== 环比计算结果 ===');
    console.log('本月订单环比:', monthlyOrdersChange);
    console.log('本月业绩环比:', monthlyRevenueChange);
    console.log('');

    console.log('=== 模拟API返回数据 ===');
    const apiResponse = {
      monthlyOrders,
      monthlyOrdersChange: monthlyOrdersChange.change,
      monthlyOrdersTrend: monthlyOrdersChange.trend,
      monthlyRevenue,
      monthlyRevenueChange: monthlyRevenueChange.change,
      monthlyRevenueTrend: monthlyRevenueChange.trend
    };
    console.log(JSON.stringify(apiResponse, null, 2));

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await connection.end();
  }
}

testDashboardMetrics();
