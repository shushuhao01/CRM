/**
 * 检查旧用户数据，看看有哪些用户需要迁移
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_local'
  });

  console.log('=== 检查旧用户数据 ===\n');

  try {
    // 1. 查看没有tenant_id的用户
    console.log('1. 没有tenant_id的用户：');
    const [oldUsers] = await connection.query(`
      SELECT id, username, real_name, role, phone, created_at
      FROM users
      WHERE tenant_id IS NULL AND role != 'super_admin'
      ORDER BY created_at ASC
    `);
    console.table(oldUsers);

    // 2. 查看天河佳信租户的用户
    console.log('\n2. 天河佳信租户的用户：');
    const [tianheUsers] = await connection.query(`
      SELECT u.id, u.username, u.real_name, u.role, u.phone, u.created_at
      FROM users u
      JOIN tenants t ON t.id = u.tenant_id
      WHERE t.name = '天河佳信'
      ORDER BY u.created_at ASC
    `);
    console.table(tianheUsers);

    // 3. 检查用户名冲突
    console.log('\n3. 检查用户名冲突：');
    const oldUsernames = oldUsers.map(u => u.username);
    const tianheUsernames = tianheUsers.map(u => u.username);
    const conflicts = oldUsernames.filter(name => tianheUsernames.includes(name));

    if (conflicts.length > 0) {
      console.log('⚠️  发现用户名冲突：');
      conflicts.forEach(name => console.log(`   - ${name}`));
      console.log('\n解决方案：');
      console.log('1. 删除旧的admin等系统用户（因为天河佳信已经有管理员了）');
      console.log('2. 或者重命名旧用户（如果需要保留）');
    } else {
      console.log('✓ 没有用户名冲突');
    }

  } catch (error) {
    console.error('检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

check();
