/**
 * 检查刚创建的用户账号
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkCreatedUser() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  });

  try {
    console.log('🔍 检查最近创建的用户账号...\n');

    // 查询最近创建的用户
    const [users] = await connection.query(`
      SELECT id, tenant_id, username, password, salt, name, real_name,
             phone, email, role, role_id, status, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('最近创建的用户:');
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. 用户信息:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   租户ID: ${user.tenant_id || '(私有部署)'}`);
      console.log(`   用户名: ${user.username}`);
      console.log(`   手机号: ${user.phone}`);
      console.log(`   真实姓名: ${user.real_name}`);
      console.log(`   角色: ${user.role} (role_id: ${user.role_id})`);
      console.log(`   状态: ${user.status}`);
      console.log(`   密码哈希: ${user.password ? user.password.substring(0, 20) + '...' : '(空)'}`);
      console.log(`   Salt: ${user.salt ? user.salt.substring(0, 20) + '...' : '(空)'}`);
      console.log(`   创建时间: ${user.created_at}`);
    });

    // 检查是否有密码和salt
    const usersWithoutPassword = users.filter(u => !u.password);
    const usersWithoutSalt = users.filter(u => !u.salt);

    if (usersWithoutPassword.length > 0) {
      console.log('\n⚠️  警告: 以下用户没有密码:');
      usersWithoutPassword.forEach(u => console.log(`   - ${u.username} (${u.phone})`));
    }

    if (usersWithoutSalt.length > 0) {
      console.log('\n⚠️  警告: 以下用户没有salt:');
      usersWithoutSalt.forEach(u => console.log(`   - ${u.username} (${u.phone})`));
    }

    if (usersWithoutPassword.length === 0 && usersWithoutSalt.length === 0) {
      console.log('\n✅ 所有用户都有密码和salt');
    }

  } finally {
    await connection.end();
  }
}

checkCreatedUser().catch(console.error);
