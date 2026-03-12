/**
 * 执行管理员用户和操作日志表创建迁移
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

  try {
    console.log('开始执行管理员管理表创建迁移...\n');

    const sqlFile = path.join(__dirname, 'database-migrations/create-admin-management-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    await connection.query(sql);
    console.log('✅ 管理员管理表创建成功');

    // 验证表是否创建成功
    const [logs] = await connection.query('SELECT COUNT(*) as count FROM admin_operation_logs');

    console.log(`\n📊 数据统计:`);
    console.log(`   - admin_operation_logs表: ${logs[0].count} 条记录`);

    // 检查admin_users表是否已存在
    const [tables] = await connection.query("SHOW TABLES LIKE 'admin_users'");
    if (tables.length > 0) {
      const [users] = await connection.query('SELECT COUNT(*) as count FROM admin_users');
      console.log(`   - admin_users表: ${users[0].count} 条记录（已存在）`);
    } else {
      console.log(`   - admin_users表: 未创建（将使用现有表）`);
    }

    console.log('\n✅ 迁移执行完成！');
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

executeMigration().catch(console.error);
