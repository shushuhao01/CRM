/**
 * 修复订单的cod_amount字段
 * 将cod_amount设置为：total_amount - deposit_amount
 * 仅修复cod_status='pending'且cod_amount=0的订单
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixCodAmount() {
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

    // 查询需要修复的订单
    console.log('🔍 查询需要修复的订单...\n');
    const [orders] = await connection.execute(
      `SELECT
        id, order_number,
        total_amount, deposit_amount, cod_amount, cod_status
      FROM orders
      WHERE cod_status = 'pending'
        AND (cod_amount = 0 OR cod_amount IS NULL)
        AND total_amount > deposit_amount
      ORDER BY created_at DESC`
    );

    if (orders.length === 0) {
      console.log('✅ 没有需要修复的订单');
      return;
    }

    console.log(`📋 找到 ${orders.length} 个需要修复的订单:\n`);

    // 显示前10个订单
    const displayOrders = orders.slice(0, 10);
    displayOrders.forEach((order, index) => {
      const correctCodAmount = Number(order.total_amount) - Number(order.deposit_amount);
      console.log(`  ${index + 1}. ${order.order_number}`);
      console.log(`     总额: ¥${order.total_amount}, 定金: ¥${order.deposit_amount}`);
      console.log(`     当前代收: ¥${order.cod_amount} -> 应该是: ¥${correctCodAmount.toFixed(2)}`);
      console.log('');
    });

    if (orders.length > 10) {
      console.log(`  ... 还有 ${orders.length - 10} 个订单\n`);
    }

    // 执行修复
    console.log('🔧 开始修复...\n');

    let successCount = 0;
    let failCount = 0;

    for (const order of orders) {
      try {
        const correctCodAmount = Number(order.total_amount) - Number(order.deposit_amount);

        await connection.execute(
          `UPDATE orders
          SET cod_amount = ?
          WHERE id = ?`,
          [correctCodAmount, order.id]
        );

        successCount++;

        if (successCount <= 5) {
          console.log(`✅ ${order.order_number}: ¥${order.cod_amount} -> ¥${correctCodAmount.toFixed(2)}`);
        }
      } catch (error) {
        failCount++;
        console.error(`❌ ${order.order_number}: 修复失败 -`, error.message);
      }
    }

    if (successCount > 5) {
      console.log(`   ... 还有 ${successCount - 5} 个订单修复成功`);
    }

    console.log('');
    console.log('📊 修复结果:');
    console.log(`  ✅ 成功: ${successCount} 个`);
    console.log(`  ❌ 失败: ${failCount} 个`);
    console.log(`  📝 总计: ${orders.length} 个`);

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

fixCodAmount().catch(console.error);
