/**
 * 检查订单的代收状态
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkOrderCodStatus() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'crm_local'
    });

    console.log('✅ 数据库连接成功');
    console.log(`📊 数据库: ${process.env.DB_NAME || 'crm_local'}\n`);

    // 查询订单号
    const orderNumber = 'ORD20260225089307'; // 刚修复的订单
    console.log(`🔍 查询订单号: ${orderNumber}\n`);

    const [orders] = await connection.execute(
      `SELECT
        id, order_number, status,
        total_amount, deposit_amount, cod_amount,
        cod_status, cod_returned_amount, cod_returned_at, cod_cancelled_at,
        tracking_number, express_company, shipped_at
      FROM orders
      WHERE order_number = ?`,
      [orderNumber]
    );

    console.log(`📊 查询结果数量: ${orders.length}\n`);

    if (orders.length === 0) {
      console.log(`❌ 未找到订单号为 ${orderNumber} 的订单`);

      // 尝试查询所有已发货的订单
      console.log('\n📋 查询最近10个已发货的订单:');
      const [recentOrders] = await connection.execute(
        `SELECT order_number, status, cod_status, cod_amount, total_amount, deposit_amount
        FROM orders
        WHERE status IN ('shipped', 'delivered', 'completed')
        ORDER BY created_at DESC
        LIMIT 10`
      );

      if (recentOrders.length > 0) {
        recentOrders.forEach((o, i) => {
          const codAmt = o.cod_amount !== null ? Number(o.cod_amount) : (Number(o.total_amount) - Number(o.deposit_amount));
          console.log(`  ${i + 1}. ${o.order_number} - 状态:${o.status} - 代收状态:${o.cod_status} - 代收:¥${codAmt.toFixed(2)}`);
        });
      } else {
        console.log('  无已发货订单');
      }

      return;
    }

    const order = orders[0];
    console.log('📦 订单信息:');
    console.log('  订单号:', order.order_number);
    console.log('  订单状态:', order.status);
    console.log('  总金额:', order.total_amount);
    console.log('  定金:', order.deposit_amount);
    console.log('  代收金额:', order.cod_amount);
    console.log('  代收状态:', order.cod_status);
    console.log('  已返款金额:', order.cod_returned_amount);
    console.log('  返款时间:', order.cod_returned_at);
    console.log('  取消代收时间:', order.cod_cancelled_at);
    console.log('  物流单号:', order.tracking_number);
    console.log('  快递公司:', order.express_company);
    console.log('  发货时间:', order.shipped_at);
    console.log('');

    // 检查是否有待审核的代收取消申请
    const [applications] = await connection.execute(
      `SELECT id, status, modified_cod_amount, cancel_reason, created_at
      FROM cod_cancel_applications
      WHERE order_id = ?
      ORDER BY created_at DESC`,
      [order.id]
    );

    console.log('📝 代收取消申请记录:');
    if (applications.length === 0) {
      console.log('  无申请记录');
    } else {
      applications.forEach((app, index) => {
        console.log(`  申请${index + 1}:`);
        console.log('    ID:', app.id);
        console.log('    状态:', app.status);
        console.log('    修改后金额:', app.modified_cod_amount);
        console.log('    取消原因:', app.cancel_reason);
        console.log('    创建时间:', app.created_at);
        console.log('');
      });
    }

    // 分析按钮禁用原因
    console.log('🔍 改代收按钮状态分析:');
    const shippedStatuses = ['shipped', 'delivered', 'completed'];
    const isShipped = shippedStatuses.includes(order.status);
    const codAmount = order.cod_amount !== null ? Number(order.cod_amount) : (Number(order.total_amount) - Number(order.deposit_amount));
    const hasPendingApp = applications.some(app => app.status === 'pending');

    console.log('  1. 订单已发货?', isShipped ? '✅ 是' : '❌ 否', `(状态: ${order.status})`);
    console.log('  2. 代收状态是pending?', order.cod_status === 'pending' ? '✅ 是' : '❌ 否', `(状态: ${order.cod_status})`);
    console.log('  3. 有代收金额?', codAmount > 0 ? '✅ 是' : '❌ 否', `(金额: ${codAmount})`);
    console.log('  4. 无待审核申请?', !hasPendingApp ? '✅ 是' : '❌ 否', `(待审核: ${hasPendingApp})`);
    console.log('');

    const canApply = isShipped && order.cod_status === 'pending' && codAmount > 0 && !hasPendingApp;
    console.log('✨ 最终结果:', canApply ? '✅ 按钮应该可用' : '❌ 按钮应该禁用');

    if (!canApply) {
      console.log('');
      console.log('🚫 禁用原因:');
      if (!isShipped) {
        console.log('  - 订单未发货');
      }
      if (order.cod_status !== 'pending') {
        if (order.cod_status === 'cancelled') {
          console.log(`  - 已改代收为 ¥${codAmount.toFixed(2)}`);
        } else if (order.cod_status === 'returned') {
          console.log('  - 已返款');
        }
      }
      if (codAmount <= 0) {
        console.log('  - 无代收金额');
      }
      if (hasPendingApp) {
        console.log('  - 已有待审核的申请');
      }
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ 数据库连接已关闭');
    }
  }
}

checkOrderCodStatus().catch(console.error);
