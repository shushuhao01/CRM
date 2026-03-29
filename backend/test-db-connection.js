// 测试数据库连接
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('测试数据库连接...');
  console.log('配置:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME
  });

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    });

    console.log('✅ 数据库连接成功');

    const [rows] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log('✅ 查询测试成功，用户数:', rows[0].count);

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

testConnection();
