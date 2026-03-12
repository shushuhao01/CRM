/**
 * 检查支付相关表是否存在
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkPaymentTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  try {
    console.log('检查支付相关表...\n');

    // 检查payment_orders表
    const [ordersRows] = await connection.query(
      "SHOW TABLES LIKE 'payment_orders'"
    );
    console.log('1. payment_orders表:', ordersRows.length > 0 ? '✅ 存在' : '❌ 不存在');

    if (ordersRows.length > 0) {
      const [columns] = await connection.query(
        "SHOW COLUMNS FROM payment_orders"
      );
      console.log('   字段数:', columns.length);
      console.log('   字段列表:', columns.map(c => c.Field).join(', '));
    }

    // 检查payment_logs表
    const [logsRows] = await connection.query(
      "SHOW TABLES LIKE 'payment_logs'"
    );
    console.log('\n2. payment_logs表:', logsRows.length > 0 ? '✅ 存在' : '❌ 不存在');

    if (logsRows.length > 0) {
      const [columns] = await connection.query(
        "SHOW COLUMNS FROM payment_logs"
      );
      console.log('   字段数:', columns.length);
    }

    // 检查payment_configs表
    const [configsRows] = await connection.query(
      "SHOW TABLES LIKE 'payment_configs'"
    );
    console.log('\n3. payment_configs表:', configsRows.length > 0 ? '✅ 存在' : '❌ 不存在');

    if (configsRows.length > 0) {
      const [columns] = await connection.query(
        "SHOW COLUMNS FROM payment_configs"
      );
      console.log('   字段数:', columns.length);

      // 检查是否有数据
      const [data] = await connection.query(
        "SELECT COUNT(*) as count FROM payment_configs"
      );
      console.log('   数据行数:', data[0].count);
    }

    // 检查payment_orders表数据
    if (ordersRows.length > 0) {
      const [orderData] = await connection.query(
        "SELECT COUNT(*) as count FROM payment_orders"
      );
      console.log('\n4. payment_orders数据行数:', orderData[0].count);
    }

  } catch (error) {
    console.error('检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkPaymentTables();
