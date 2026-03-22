/**
 * 解锁账号并测试登录
 */
const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const API_BASE = 'http://localhost:3000/api/v1';

async function unlockAndTestLogin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  });

  try {
    console.log('🔓 解锁被锁定的账号...\n');

    // 查找被锁定的账号
    const [lockedUsers] = await connection.query(`
      SELECT id, username, phone, tenant_id, status, login_fail_count
      FROM users
      WHERE status = 'locked'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (lockedUsers.length === 0) {
      console.log('✅ 没有被锁定的账号');
    } else {
      console.log(`找到 ${lockedUsers.length} 个被锁定的账号:`);
      lockedUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.phone}) - 失败次数: ${user.login_fail_count}`);
      });

      // 解锁所有被锁定的账号
      await connection.query(`
        UPDATE users
        SET status = 'active', login_fail_count = 0, locked_at = NULL
        WHERE status = 'locked'
      `);
      console.log('\n✅ 已解锁所有账号\n');
    }

    // 测试登录
    console.log('🧪 测试登录功能...\n');

    // 获取最近创建的租户用户
    const [recentUsers] = await connection.query(`
      SELECT username, phone, tenant_id, password
      FROM users
      WHERE tenant_id IS NOT NULL
        AND phone IS NOT NULL
        AND password LIKE '$2a$%'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (recentUsers.length === 0) {
      console.log('❌ 没有找到可测试的用户');
      return;
    }

    const testUser = recentUsers[0];
    console.log(`测试用户: ${testUser.username}`);
    console.log(`租户ID: ${testUser.tenant_id}`);
    console.log(`密码哈希: ${testUser.password.substring(0, 20)}...`);
    console.log(`默认密码: Aa123456\n`);

    // 尝试登录
    try {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        username: testUser.username,
        password: 'Aa123456',
        tenantId: testUser.tenant_id
      });

      if (loginRes.data.success) {
        console.log('✅ 登录成功!');
        console.log('Token:', loginRes.data.data.token.substring(0, 50) + '...');
        console.log('用户信息:', {
          username: loginRes.data.data.user.username,
          realName: loginRes.data.data.user.realName,
          role: loginRes.data.data.user.role
        });
      } else {
        console.log('❌ 登录失败:', loginRes.data.message);
      }
    } catch (error) {
      if (error.response) {
        console.log('❌ 登录失败:');
        console.log('状态码:', error.response.status);
        console.log('错误信息:', error.response.data);
      } else {
        console.log('❌ 请求失败:', error.message);
      }
    }

  } finally {
    await connection.end();
  }
}

unlockAndTestLogin().catch(console.error);
