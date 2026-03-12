/**
 * 在本地数据库执行Admin后台迁移
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'localhost',
  user: 'abc789',
  password: 'YtZWJPF2bpsCscHX',
  database: 'crm_local',
  multipleStatements: true
};

async function executeMigration() {
  console.log('开始执行Admin后台数据库迁移...\n');

  const connection = await mysql.createConnection(dbConfig);

  try {
    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'database-migrations', 'production-admin-complete-migration.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('执行SQL脚本...');
    await connection.query(sql);

    console.log('\n✅ 迁移执行成功！\n');

    // 验证表创建
    const [tables] = await connection.query(`
      SELECT
        TABLE_NAME AS table_name,
        TABLE_COMMENT AS table_comment,
        TABLE_ROWS AS table_rows
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (
          'admin_users', 'admin_operation_logs',
          'tenants', 'tenant_settings', 'tenant_logs',
          'packages', 'licenses', 'license_logs',
          'private_customers', 'versions', 'changelogs',
          'payment_orders'
        )
      ORDER BY TABLE_NAME
    `);

    console.log('已创建/更新的表:');
    console.table(tables);

  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

executeMigration().catch(console.error);
