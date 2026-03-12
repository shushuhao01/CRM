/**
 * 检查 payment_orders 表结构
 */

const mysql = require('mysql2/promise');

async function checkPaymentOrdersStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  console.log('📋 检查 payment_orders 表结构\n');

  try {
    // 检查表是否存在
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'payment_orders'"
    );

    if (tables.length === 0) {
      console.log('❌ payment_orders 表不存在');
      return;
    }

    console.log('✅ payment_orders 表存在\n');

    // 查看表结构
    const [columns] = await connection.execute(
      'DESCRIBE payment_orders'
    );

    console.log('=== 当前表结构 ===\n');
    columns.forEach(col => {
      console.log(`${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });

    // 检查是否有 billing_cycle 和 bonus_months 字段
    const hasBillingCycle = columns.some(col => col.Field === 'billing_cycle');
    const hasBonusMonths = columns.some(col => col.Field === 'bonus_months');

    console.log('\n=== 字段检查 ===\n');
    console.log(`billing_cycle: ${hasBillingCycle ? '✅ 已存在' : '❌ 不存在'}`);
    console.log(`bonus_months: ${hasBonusMonths ? '✅ 已存在' : '❌ 不存在'}`);

    if (!hasBillingCycle || !hasBonusMonths) {
      console.log('\n⚠️  需要执行数据库迁移添加缺失字段');
    }

    // 查看示例数据
    const [orders] = await connection.execute(
      'SELECT * FROM payment_orders LIMIT 3'
    );

    if (orders.length > 0) {
      console.log('\n=== 示例数据 ===\n');
      orders.forEach((order, index) => {
        console.log(`订单 ${index + 1}:`);
        console.log(`  订单号: ${order.order_no}`);
        console.log(`  套餐ID: ${order.package_id}`);
        console.log(`  金额: ¥${order.amount}`);
        console.log(`  状态: ${order.status}`);
        if (hasBillingCycle) {
          console.log(`  计费周期: ${order.billing_cycle || '未设置'}`);
        }
        if (hasBonusMonths) {
          console.log(`  赠送月数: ${order.bonus_months || 0}`);
        }
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkPaymentOrdersStructure();
