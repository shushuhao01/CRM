const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './backend/.env' });

async function debugLogin() {
  console.log('=== 调试登录问题 ===\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm'
    });

    console.log('✅ MySQL 连接成功\n');

    // 查询admin用户的完整信息
    const [rows] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      ['admin']
    );

    if (rows.length === 0) {
      console.log('❌ 未找到 admin 用户');
      await connection.end();
      return;
    }

    const user = rows[0];
    console.log('数据库中的用户信息:');
    console.log('ID:', user.id);
    console.log('用户名:', user.username);
    console.log('密码哈希:', user.password);
    console.log('状态:', user.status);
    console.log('登录失败次数:', user.loginFailCount);
    console.log('锁定时间:', user.lockedAt);
    console.log('');

    // 测试密码
    const testPassword = 'admin123';
    console.log(`测试密码: "${testPassword}"`);

    // 方法1：直接比较
    const isValid1 = await bcrypt.compare(testPassword, user.password);
    console.log('方法1 (bcrypt.compare):', isValid1 ? '✅ 正确' : '❌ 错误');

    // 方法2：生成新哈希并比较
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log('新生成的哈希:', newHash);
    const isValid2 = await bcrypt.compare(testPassword, newHash);
    console.log('方法2 (新哈希验证):', isValid2 ? '✅ 正确' : '❌ 错误');

    // 检查密码哈希格式
    console.log('');
    console.log('密码哈希分析:');
    console.log('长度:', user.password.length);
    console.log('前缀:', user.password.substring(0, 7));
    console.log('是否以$2b$开头:', user.password.startsWith('$2b$'));

    // 如果密码错误，更新为正确的密码
    if (!isValid1) {
      console.log('');
      console.log('⚠️ 密码验证失败！生成新密码...');
      const correctHash = await bcrypt.hash(testPassword, 10);
      console.log('新密码哈希:', correctHash);
      console.log('');
      console.log('执行以下SQL更新密码:');
      console.log(`UPDATE users SET password = '${correctHash}', status = 'active', loginFailCount = 0, lockedAt = NULL WHERE username = 'admin';`);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

debugLogin();
