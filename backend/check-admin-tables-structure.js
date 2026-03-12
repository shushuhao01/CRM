/**
 * 检查admin相关表结构
 */
const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('检查admin_users表结构...\n');

    // 检查表是否存在
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'admin_users'"
    );

    if (tables.length === 0) {
      console.log('❌ admin_users表不存在');
      return;
    }

    console.log('✅ admin_users表存在\n');

    // 查看表结构
    const [columns] = await connection.query('DESCRIBE admin_users');
    console.log('表结构:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });

    // 查看数据
    const [users] = await connection.query('SELECT * FROM admin_users LIMIT 5');
    console.log(`\n数据记录: ${users.length} 条`);
    if (users.length > 0) {
      console.log('示例数据:');
      users.forEach(user => {
        console.log(`  - ${user.username} (${user.email || 'no email'})`);
      });
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkTables().catch(console.error);
