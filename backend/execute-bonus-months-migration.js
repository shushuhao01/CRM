/**
 * 执行年付赠送月数字段迁移
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function executeMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local',
    multipleStatements: true
  });

  console.log('🚀 开始执行年付赠送月数字段迁移\n');

  try {
    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'database-migrations', 'add-bonus-months-to-payment-orders.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // 执行SQL
    console.log('📝 执行SQL迁移...');
    await connection.query(sql);
    console.log('✅ SQL执行成功\n');

    // 验证字段
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'crm_local'
         AND TABLE_NAME = 'payment_orders'
         AND COLUMN_NAME IN ('billing_cycle', 'bonus_months')`
    );

    console.log('=== 字段验证 ===\n');
    columns.forEach(col => {
      console.log(`${col.COLUMN_NAME}:`);
      console.log(`  类型: ${col.COLUMN_TYPE}`);
      console.log(`  默认值: ${col.COLUMN_DEFAULT}`);
      console.log(`  注释: ${col.COLUMN_COMMENT}`);
      console.log('');
    });

    console.log('✅ 迁移完成！');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

executeMigration().catch(console.error);
