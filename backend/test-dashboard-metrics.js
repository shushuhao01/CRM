/**
 * 测试数据看板环比计算
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
    console.log('=== 测试数据看板环比计算 ===\n');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    console.log('时间范围：');
    console.log('今天：', todayStart.toLocaleString(), '-', todayEnd.toLocaleString());
    console.log('昨天：', yesterdayStart.toLocaleString(), '-', yesterdayEnd.toLocaleString());
    console.log('本月：', monthStart.toLocaleString(), '-', todayEnd.toLocaleString());
    console.log('上月：', lastMonthStart.toLocaleString(), '-', lastMonthEnd.toLocaleString());
    console.log('');

    // 查询今日订单
    const [todayOrders] = await connection.query(
      `SELECT COUNT(*) as count, SUM(total_amount) as amount
       FROM orders
       WHERE created_at >= ? AND created_at <= ?
       AND status NOT IN ('cancelled', 'refunded')
       AND (mark_type IS NULL OR mark_type NOT IN ('invalid', 'test'))`,
      [todayStart, todayEnd]
    );

    // 查询昨日订单
    const [yesterdayOrders] = await connection.query(
      `SELECT COUNT(*) as count, SUM(total_amount) as amount
       FROM orders
       WHERE created_at >= ? AND created_at <= ?
       AND status NOT IN ('cancelled', 'refunded')
       AND (mark_type IS NULL OR mark_type NOT IN ('invalid', 'test'))`,
      [yesterdayStart, yesterdayEnd]
    );

    // 查询本月订单
    const [monthOrders] = await connection.query(
      `SELECT COUNT(*) as count, SUM(total_amount) as amount
       FROM orders
       WHERE created_at >= ? AND created_at <= ?
       AND status NOT IN ('cancelled', 'refunded')
       AND (mark_type IS NULL OR mark_type NOT IN ('invalid', 'test'))`,
      [monthStart, todayEnd]
    );

    // 查询上月订单
    const [lastMonthOrders] = await connection.query(
      `SELECT COUNT(*) as count, SUM(total_amount) as amount
       FROM orders
       WHERE created_at >= ? AND created_at <= ?
       AND status NOT IN ('cancelled', 'refunded')
       AND (mark_type IS NULL OR mark_type NOT IN ('invalid', 'test'))`,
      [lastMonthStart, lastMonthEnd]
    );

    console.log('=== 订单数据 ===');
    console.log('今日订单：', todayOrders[0].count, '单，金额：¥', todayOrders[0].amount || 0);
    console.log('昨日订单：', yesterdayOrders[0].count, '单，金额：¥', yesterdayOrders[0].amount || 0);
    console.log('本月订单：', monthOrders[0].count, '单，金额：¥', monthOrders[0].amount || 0);
    console.log('上月订单：', lastMonthOrders[0].count, '单，金额：¥', lastMonthOrders[0].amount || 0);
    console.log('');

    // 计算环比
    const calculateChange = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const todayOrdersChange = calculateChange(todayOrders[0].count, yesterdayOrders[0].count);
    const todayAmountChange = calculateChange(todayOrders[0].amount || 0, yesterdayOrders[0].amount || 0);
    const monthOrdersChange = calculateChange(monthOrders[0].count, lastMonthOrders[0].count);
    const monthAmountChange = calculateChange(monthOrders[0].amount || 0, lastMonthOrders[0].amount || 0);

    console.log('=== 环比计算 ===');
    console.log('今日订单环比：', todayOrdersChange, '%');
    console.log('今日金额环比：', todayAmountChange, '%');
    console.log('本月订单环比：', monthOrdersChange, '%');
    console.log('本月金额环比：', monthAmountChange, '%');
    console.log('');

    // 查询新增客户
    const [todayCustomers] = await connection.query(
      `SELECT COUNT(*) as count FROM customers WHERE created_at >= ? AND created_at <= ?`,
      [todayStart, todayEnd]
    );

    const [yesterdayCustomers] = await connection.query(
      `SELECT COUNT(*) as count FROM customers WHERE created_at >= ? AND created_at <= ?`,
      [yesterdayStart, yesterdayEnd]
    );

    console.log('=== 客户数据 ===');
    console.log('今日新增客户：', todayCustomers[0].count);
    console.log('昨日新增客户：', yesterdayCustomers[0].count);
    console.log('客户环比：', calculateChange(todayCustomers[0].count, yesterdayCustomers[0].count), '%');

  } catch (error) {
    console.error('测试失败：', error);
  } finally {
    await connection.end();
  }
}

testDashboardMetrics();
