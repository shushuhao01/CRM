/**
 * 执行计费周期数据库迁移
 * 添加 billing_cycle 和 bonus_months 字段到 payment_orders 表
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

  console.log('📦 开始执行计费周期数据库迁移...\n');

  try {
    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'database-migrations', 'add-billing-cycle-to-payment-orders.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // 执行SQL
    console.log('执行SQL迁移脚本...');
    await connection.query(sql);

    console.log('✅ 数据库迁移执行成功\n');

    // 验证字段
    console.log('验证新增字段:');
    const [columns] = await connection.execute(`
      SELECT
        COLUMN_NAME,
        COLUMN_TYPE,
        COLUMN_DEFAULT,
        IS_NULLABLE,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payment_orders'
        AND COLUMN_NAME IN ('billing_cycle', 'bonus_months')
      ORDER BY COLUMN_NAME
    `);

    columns.forEach(col => {
      console.log(`  ✓ ${col.COLUMN_NAME}`);
      console.log(`    类型: ${col.COLUMN_TYPE}`);
      console.log(`    默认值: ${col.COLUMN_DEFAULT}`);
      console.log(`    可空: ${col.IS_NULLABLE}`);
      console.log(`    注释: ${col.COLUMN_COMMENT}`);
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
