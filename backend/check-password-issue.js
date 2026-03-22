/**
 * 检查密码问题
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_local'
  });

  console.log('=== 检查密码加密问题 ===\n');

  try {
    // 查看被锁定账号的密码详情
    const [users] = await connection.query(`
      SELECT
        u.id, u.username, u.password, u.status, u.login_fail_count,
        t.name as tenant_name, t.code as tenant_code
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE u.username = '15815897364'
    `);

    if (users.length === 0) {
      console.log('未找到该用户');
      return;
    }

    const user = users[0];
    console.log('用户信息:');
    console.log('- 用户名:', user.username);
    console.log('- 租户:', user.tenant_name);
    console.log('- 状态:', user.status);
    console.log('- 登录失败次数:', user.login_fail_count);
    console.log('- 密码:', user.password);
    console.log('- 密码长度:', user.password.length);
    console.log('- 密码格式:', user.password.startsWith('$2') ? 'bcrypt' : '非bcrypt（错误）');

    // 测试密码验证
    console.log('\n测试密码验证:');
    const testPassword = 'Aa123456';
    console.log('测试密码:', testPassword);

    if (user.password.startsWith('$2')) {
      const isMatch = await bcrypt.compare(testPassword, user.password);
      console.log('bcrypt验证结果:', isMatch ? '✓ 匹配' : '✗ 不匹配');
    } else {
      console.log('✗ 密码格式错误，无法使用bcrypt验证');
      console.log('  这个密码可能是使用其他方式加密的（如pbkdf2）');
    }

    // 生成正确的bcrypt密码
    console.log('\n生成正确的bcrypt密码:');
    const correctHash = await bcrypt.hash(testPassword, 12);
    console.log('正确的bcrypt密码:', correctHash);
    console.log('长度:', correctHash.length);

    // 提供修复SQL
    console.log('\n修复SQL:');
    console.log(`UPDATE users SET password = '${correctHash}', status = 'active', login_fail_count = 0, locked_at = NULL WHERE id = '${user.id}';`);

  } catch (error) {
    console.error('检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

check();
