/**
 * 检查租户和用户的关联关系
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkTenantUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  });

  try {
    console.log('🔍 检查租户和用户关联...\n');

    // 查找最近创建的租户
    const [tenants] = await connection.query(`
      SELECT id, code, name, phone, created_at
      FROM tenants
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('最近创建的租户:');
    for (const tenant of tenants) {
      console.log(`\n租户: ${tenant.name} (${tenant.code})`);
      console.log(`  ID: ${tenant.id}`);
      console.log(`  手机号: ${tenant.phone}`);
      console.log(`  创建时间: ${tenant.created_at}`);

      // 查找该租户的用户
      const [users] = await connection.query(`
        SELECT id, username, phone, real_name, status, created_at
        FROM users
        WHERE tenant_id = ?
      `, [tenant.id]);

      if (users.length === 0) {
        console.log(`  ❌ 没有用户账号`);
      } else {
        console.log(`  ✅ 用户账号 (${users.length}个):`);
        users.forEach(user => {
          console.log(`     - ${user.username} (${user.real_name}) - ${user.status}`);
        });
      }
    }

    // 查找所有使用 bcrypt 加密的用户（新创建的）
    console.log('\n\n🔐 使用 bcrypt 加密的用户:');
    const [bcryptUsers] = await connection.query(`
      SELECT id, tenant_id, username, phone, real_name, status, created_at
      FROM users
      WHERE password LIKE '$2a$%'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    bcryptUsers.forEach(user => {
      console.log(`\n用户: ${user.username} (${user.real_name})`);
      console.log(`  租户ID: ${user.tenant_id || '(无)'}`);
      console.log(`  手机号: ${user.phone}`);
      console.log(`  状态: ${user.status}`);
      console.log(`  创建时间: ${user.created_at}`);
    });

  } finally {
    await connection.end();
  }
}

checkTenantUsers().catch(console.error);
