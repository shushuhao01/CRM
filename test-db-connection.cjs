const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './backend/.env' });

async function testConnection() {
  console.log('=== 测试数据库连接 ===\n');

  console.log('环境变量:');
  console.log('DB_TYPE:', process.env.DB_TYPE);
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_PORT:', process.env.DB_PORT);
  console.log('DB_DATABASE:', process.env.DB_DATABASE);
  console.log('DB_USERNAME:', process.env.DB_USERNAME);
  console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');
  console.log('');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'crm'
    });

    console.log('✅ MySQL 连接成功!\n');

    // 查询 admin 用户
    const [rows] = await connection.execute(
      'SELECT id, username, password, status, loginFailCount FROM users WHERE username = ?',
      ['admin']
    );

    if (rows.length === 0) {
      console.log('❌ 未找到 admin 用户');
      await connection.end();
      return;
    }

    const user = rows[0];
    console.log('用户信息:');
    console.log('ID:', user.id);
    console.log('用户名:', user.username);
    console.log('状态:', user.status);
    console.log('登录失败次数:', user.loginFailCount);
    console.log('密码哈希:', user.password);
    console.log('');

    // 测试密码验证
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, user.password);

    console.log(`测试密码 "${testPassword}":`, isValid ? '✅ 正确' : '❌ 错误');
    console.log('');

    // 如果密码错误，生成新密码
    if (!isValid) {
      console.log('生成新的密码哈希...');
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('新密码哈希:', newHash);
      console.log('');
      console.log('执行以下SQL更新密码:');
      console.log(`UPDATE users SET password = '${newHash}', status = 'active', loginFailCount = 0 WHERE username = 'admin';`);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testConnection();
