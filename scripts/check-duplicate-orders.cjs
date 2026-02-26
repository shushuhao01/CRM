/**
 * 检查数据库中是否有重复的订单记录
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env.local' });

async function checkDuplicateOrders() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  });

  try {
    console.log('🔍 检查取消相关订单...\n');

    // 查询所有取消相关的订单
    const [orders] = await connection.execute(`
      SELECT
        id,
        order_number,
        customer_name,
        status,
        total_amount,
        remark,
        created_at,
        updated_at
      FROM orders
      WHERE status IN ('pending_cancel', 'cancelled', 'cancel_failed')
      ORDER BY order_number, updated_at DESC
    `);

    console.log(`找到 ${orders.length} 条取消相关订单\n`);

    // 按订单号分组
    const ordersByNumber = {};
    orders.forEach(order => {
      if (!ordersByNumber[order.order_number]) {
        ordersByNumber[order.order_number] = [];
      }
      ordersByNumber[order.order_number].push(order);
    });

    // 检查是否有重复的订单号
    let hasDuplicates = false;
    for (const [orderNumber, orderList] of Object.entries(ordersByNumber)) {
      if (orderList.length > 1) {
        hasDuplicates = true;
        console.log(`❌ 订单号 ${orderNumber} 有 ${orderList.length} 条记录：`);
        orderList.forEach((order, index) => {
          console.log(`  ${index + 1}. ID: ${order.id}, 状态: ${order.status}, 更新时间: ${order.updated_at}`);
        });
        console.log('');
      }
    }

    if (!hasDuplicates) {
      console.log('✅ 没有发现重复的订单号');
    }

    // 查询订单号为 ORD20260226203E47 的所有记录
    console.log('\n🔍 查询订单号 ORD20260226203E47 的详细信息：\n');
    const [specificOrders] = await connection.execute(`
      SELECT
        id,
        order_number,
        customer_name,
        status,
        total_amount,
        remark,
        created_at,
        updated_at
      FROM orders
      WHERE order_number = 'ORD20260226203E47'
      ORDER BY updated_at DESC
    `);

    if (specificOrders.length > 0) {
      console.log(`找到 ${specificOrders.length} 条记录：`);
      specificOrders.forEach((order, index) => {
        console.log(`\n记录 ${index + 1}:`);
        console.log(`  ID: ${order.id}`);
        console.log(`  订单号: ${order.order_number}`);
        console.log(`  客户: ${order.customer_name}`);
        console.log(`  状态: ${order.status}`);
        console.log(`  金额: ${order.total_amount}`);
        console.log(`  备注: ${order.remark}`);
        console.log(`  创建时间: ${order.created_at}`);
        console.log(`  更新时间: ${order.updated_at}`);
      });
    } else {
      console.log('未找到该订单');
    }

  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkDuplicateOrders();
