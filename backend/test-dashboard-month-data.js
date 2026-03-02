/**
 * 测试数据看板本月数据查询
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function testDashboardMonthData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_local'
  });

  try {
    console.log('=== 测试数据看板本月数据查询 ===\n');

    const now = new Date();
    console.log('当前时间：', now.toLocaleString());
    console.log('');

    // 数据看板的本月范围（从本月1号到今天）
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    console.log('数据看板"本月"范围：');
    console.log('开始：', monthStart.toLocaleString());
    console.log('结束：', todayEnd.toLocaleString());
    console.log('');

    // 查询本月订单（数据看板的逻辑）
    const [monthOrders] = await connection.query(
      `SELECT COUNT(*) as count, SUM(total_amount) as amount
       FROM orders
       WHERE created_at >= ? AND created_at <= ?
       AND status NOT IN ('cancelled', 'refunded')
       AND (mark_type IS NULL OR mark_type NOT IN ('invalid', 'test'))`,
      [monthStart, todayEnd]
    );

    console.log('=== 数据看板"本月"数据（3月1日-今天）===');
    console.log('订单数：', monthOrders[0].count);
    console.log('业绩：¥', monthOrders[0].amount || 0);
    console.log('');

    // 查询整个3月的数据（团队业绩的逻辑）
    const marchStart = new Date(2026, 2, 1); // 3月1日
    const marchEnd = new Date(2026, 2, 31, 23, 59, 59); // 3月31日

    const [marchOrders] = await connection.query(
      `SELECT COUNT(*) as count, SUM(total_amount) as amount
       FROM orders
       WHERE created_at >= ? AND created_at <= ?
       AND status NOT IN ('cancelled', 'refunded')
       AND (mark_type IS NULL OR mark_type NOT IN ('invalid', 'test'))`,
      [marchStart, marchEnd]
    );

    console.log('=== 团队业绩"3月"数据（3月1日-3月31日）===');
    console.log('订单数：', marchOrders[0].count);
    console.log('业绩：¥', marchOrders[0].amount || 0);
    console.log('');

    // 查询2月的数据
    const febStart = new Date(2026, 1, 1); // 2月1日
    const febEnd = new Date(2026, 1, 28, 23, 59, 59); // 2月28日

    const [febOrders] = await connection.query(
      `SELECT COUNT(*) as count, SUM(total_amount) as amount
       FROM orders
       WHERE created_at >= ? AND created_at <= ?
       AND status NOT IN ('cancelled', 'refunded')
       AND (mark_type IS NULL OR mark_type NOT IN ('invalid', 'test'))`,
      [febStart, febEnd]
    );

    console.log('=== 上月"2月"数据（2月1日-2月28日）===');
    console.log('订单数：', febOrders[0].count);
    console.log('业绩：¥', febOrders[0].amount || 0);
    console.log('');

    // 计算环比
    const monthOrdersCount = monthOrders[0].count || 0;
    const lastMonthOrdersCount = febOrders[0].count || 0;
    const monthAmount = monthOrders[0].amount || 0;
    const lastMonthAmount = febOrders[0].amount || 0;

    const calculateChange = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      if (current === 0) {
        return -100;
      }
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    console.log('=== 环比计算 ===');
    console.log('本月订单环比：', calculateChange(monthOrdersCount, lastMonthOrdersCount), '%');
    console.log('本月业绩环比：', calculateChange(monthAmount, lastMonthAmount), '%');
    console.log('');

    console.log('=== 结论 ===');
    console.log('数据看板显示的是"本月至今"的数据，不是整月数据');
    console.log('团队业绩显示的是整月数据');
    console.log('这是正常的业务逻辑差异');

  } catch (error) {
    console.error('测试失败：', error);
  } finally {
    await connection.end();
  }
}

testDashboardMonthData();
