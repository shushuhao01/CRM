/**
 * 检查订单状态值
 */
const mysql = require('mysql2/promise');

async function checkOrderStatus() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('检查增值订单的状态值...\n');

    // 查询订单状态
    const [orders] = await connection.execute(`
      SELECT id, order_number, status, settlement_status
      FROM value_added_orders
      LIMIT 10
    `);

    console.log('订单状态值:');
    orders.forEach(order => {
      console.log(`订单: ${order.order_number}`);
      console.log(`  有效状态: ${order.status}`);
      console.log(`  结算状态: ${order.settlement_status}`);
      console.log('');
    });

    // 查询状态配置
    console.log('\n状态配置表:');
    const [configs] = await connection.execute(`
      SELECT type, value, label
      FROM value_added_status_configs
      ORDER BY type, created_at
    `);

    console.log('\n有效状态配置:');
    configs.filter(c => c.type === 'validStatus').forEach(c => {
      console.log(`  value: "${c.value}" -> label: "${c.label}"`);
    });

    console.log('\n结算状态配置:');
    configs.filter(c => c.type === 'settlementStatus').forEach(c => {
      console.log(`  value: "${c.value}" -> label: "${c.label}"`);
    });

  } finally {
    await connection.end();
  }
}

checkOrderStatus().catch(console.error);
