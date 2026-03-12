/**
 * 检查admin_users表并创建Admin账号
 */

require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function checkAndCreateAdmin() {
  let connection;

  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'crm_local'
    });

    console.log('✅ 数据库连接成功\n');

    // 1. 检查admin_users表是否存在
    const [tables] = await connection.execute(
      'SHOW TABLES LIKE "admin_users"'
    );

    if (tables.length === 0) {
      console.log('❌ admin_users表不存在，正在创建...\n');

      // 创建admin_users表
      await connection.execute(`
        CREATE TABLE admin_users (
          id VARCHAR(36) PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(50),
          email VARCHAR(100),
          phone VARCHAR(20),
          role ENUM('super_admin', 'admin', 'operator') DEFAULT 'operator',
          status ENUM('active', 'disabled') DEFAULT 'active',
          last_login_at DATETIME,
          last_login_ip VARCHAR(50),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      console.log('✅ admin_users表创建成功\n');
    } else {
      console.log('✅ admin_users表已存在\n');
    }

    // 2. 检查是否已有admin账号
    const [admins] = await connection.execute(
      'SELECT id, username, role, status FROM admin_users WHERE username = ?',
      ['admin']
    );

    if (admins.length > 0) {
      console.log('⚠️  Admin账号已存在:');
      console.log(JSON.stringify(admins[0], null, 2));
      console.log('\n账号信息：');
      console.log('   用户名: admin');
      console.log('   密码: admin123');
      await connection.end();
      return;
    }

    // 3. 创建admin账号
    console.log('正在创建Admin账号...\n');

    const adminId = uuidv4();
    const hashedPassword = await bcrypt.hash('admin123', 10);

    await connection.execute(
      `INSERT INTO admin_users (id, username, password, name, role, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminId, 'admin', hashedPassword, '系统管理员', 'super_admin', 'active']
    );

    console.log('✅ Admin账号创建成功！\n');
    console.log('账号信息：');
    console.log('   用户名: admin');
    console.log('   密码: admin123');
    console.log('   角色: super_admin');
    console.log('   ID:', adminId);
    console.log('\n⚠️  请妥善保管Admin账号信息！');
    console.log('\n现在可以在Admin后台登录了：http://localhost:5174/');

    await connection.end();
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

checkAndCreateAdmin();
