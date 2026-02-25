/**
 * 手动修复订单的代收状态
 */

const mysql = require('mysql2/promise');

const orderNumber = process.argv[2] || 'ORD20260225262567';

const config = {
  host: 'localhost',
  port: 3306,
  user: 'abc789',
  password: 'YtZWJPF2bpsCscHX',
  database: 'crm_local'
};

async function fixOrder() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('查询订单:', orderNumber);

    // 查询订单
    const [rows] = await connection.execute(
      'SELECT * FROM orders WHERE order_number = ?',
      [orderNumber]
    );

    if (rows.length === 0) {
      console.log('订单不存在');
      return;
    }

    const order = rows[0];
    console.log('\n修复前:');
    console.log('  cod_amount:', order.cod_amount);
    console.log('  cod_status:', order.cod_status);
    console.log('  cod_cancelled_at:', order.cod_cancelled_at);

    // 根据cod_amount决定状态
    let newStatus, newCancelledAt;
    if (parseFloat(order.cod_amount) === 0) {
      newStatus = 'cancelled';
      newCancelledAt = new Date();
      console.log('\n修复操作: cod_amount为0，设置为cancelled状态');
    } else {
      newStatus = 'pending';
      newCancelledAt = null;
      console.log('\n修复操作: cod_amount>0，设置为pending状态');
    }

    // 更新订单
    await connection.execute(
      'UPDATE orders SET cod_status = ?, cod_cancelled_at = ? WHERE order_number = ?',
      [newStatus, newCancelledAt, orderNumber]
    );

    console.log('\n修复后:');
    console.log('  cod_status:', newStatus);
    console.log('  cod_cancelled_at:', newCancelledAt);
    console.log('\n✅ 订单状态已修复！');

    // 验证
    const [verify] = await connection.execute(
      'SELECT cod_amount, cod_status, cod_cancelled_at FROM orders WHERE order_number = ?',
      [orderNumber]
    );

    console.log('\n数据库验证:');
    console.log('  cod_amount:', verify[0].cod_amount);
    console.log('  cod_status:', verify[0].cod_status);
    console.log('  cod_cancelled_at:', verify[0].cod_cancelled_at);

  } finally {
    await connection.end();
  }
}

fixOrder().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
