/**
 * 测试新创建的租户账号登录
 */
const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const API_BASE = 'http://localhost:3000/api/v1';

async function testNewTenantLogin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  });

  try {
    console.log('🔍 查找最近创建的租户和用户...\n');

    // 查找最近创建的租户
    const [tenants] = await connection.query(`
      SELECT id, code, name, license_key, contact, phone
      FROM tenants
      ORDER BY created_at DESC
      LIMIT 3
    `);

    if (tenants.length === 0) {
      console.log('❌ 没有找到租户');
      return;
    }

    console.log('最近创建的租户:');
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name} (${tenant.code})`);
      console.log(`   授权码: ${tenant.license_key}`);
      console.log(`   联系人: ${tenant.contact} (${tenant.phone})`);
    });

    // 选择第一个租户
    const tenant = tenants[0];
    console.log(`\n📋 测试租户: ${tenant.name} (${tenant.code})\n`);

    // 查找该租户的管理员账号
    const [users] = await connection.query(`
      SELECT id, username, phone, real_name, password, status, created_at
      FROM users
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `, [tenant.id]);

    if (users.length === 0) {
      console.log('❌ 该租户没有用户账号');
      return;
    }

    console.log('该租户的用户账号:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.real_name})`);
      console.log(`   状态: ${user.status}`);
      console.log(`   密码哈希: ${user.password.substring(0, 30)}...`);
      console.log(`   创建时间: ${user.created_at}`);
    });

    const user = users[0];
    console.log(`\n🧪 测试登录...\n`);
    console.log(`用户名: ${user.username}`);
    console.log(`密码: Aa123456`);
    console.log(`租户ID: ${tenant.id}\n`);

    // 测试登录
    try {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        username: user.username,
        password: 'Aa123456',
        tenantId: tenant.id
      });

      if (loginRes.data.success) {
        console.log('✅ 登录成功!');
        console.log('\n返回数据:');
        console.log('- Token:', loginRes.data.data.token.substring(0, 50) + '...');
        console.log('- 用户信息:', {
          username: loginRes.data.data.user.username,
          realName: loginRes.data.data.user.realName,
          role: loginRes.data.data.user.role,
          tenantId: loginRes.data.data.user.tenantId
        });
      } else {
        console.log('❌ 登录失败:', loginRes.data.message);
      }
    } catch (error) {
      if (error.response) {
        console.log('❌ 登录失败:');
        console.log('状态码:', error.response.status);
        console.log('错误信息:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('❌ 请求失败:', error.message);
      }
    }

  } finally {
    await connection.end();
  }
}

testNewTenantLogin().catch(console.error);
