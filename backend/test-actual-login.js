/**
 * 测试实际登录后的数据隔离
 * 模拟登录"欢乐颂"租户，检查能看到哪些数据
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_local'
  });

  console.log('=== 测试实际登录数据隔离 ===\n');

  try {
    // 1. 获取"欢乐颂"租户信息
    console.log('1. 获取"欢乐颂"租户信息：');
    const [huanleTenants] = await connection.query(`
      SELECT id, name, code FROM tenants WHERE name = '欢乐颂'
    `);

    if (huanleTenants.length === 0) {
      console.log('❌ 未找到"欢乐颂"租户');
      return;
    }

    const huanleTenant = huanleTenants[0];
    console.log(`租户: ${huanleTenant.name} (${huanleTenant.code})`);
    console.log(`租户ID: ${huanleTenant.id}\n`);

    // 2. 获取"欢乐颂"租户的管理员用户
    console.log('2. "欢乐颂"租户的用户：');
    const [huanleUsers] = await connection.query(`
      SELECT id, username, real_name, role, phone
      FROM users
      WHERE tenant_id = ?
    `, [huanleTenant.id]);
    console.table(huanleUsers);

    // 3. 模拟登录后查询客户（不带tenant_id过滤）
    console.log('\n3. 查询所有客户（不带tenant_id过滤）：');
    const [allCustomers] = await connection.query(`
      SELECT id, name, phone, tenant_id,
        (SELECT name FROM tenants WHERE id = customers.tenant_id) as tenant_name
      FROM customers
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.table(allCustomers);

    // 4. 模拟正确的查询（带tenant_id过滤）
    console.log('\n4. 查询"欢乐颂"租户的客户（带tenant_id过滤）：');
    const [huanleCustomers] = await connection.query(`
      SELECT id, name, phone, tenant_id
      FROM customers
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `, [huanleTenant.id]);
    console.table(huanleCustomers);
    console.log(`"欢乐颂"租户应该有 ${huanleCustomers.length} 个客户\n`);

    // 5. 检查"天河佳信"租户的数据
    console.log('5. "天河佳信"租户的客户：');
    const [tianheCustomers] = await connection.query(`
      SELECT c.id, c.name, c.phone, c.tenant_id, t.name as tenant_name
      FROM customers c
      JOIN tenants t ON t.id = c.tenant_id
      WHERE t.name = '天河佳信'
      ORDER BY c.created_at DESC
    `);
    console.table(tianheCustomers);
    console.log(`"天河佳信"租户有 ${tianheCustomers.length} 个客户\n`);

    // 6. 检查订单数据
    console.log('6. 各租户的订单数量：');
    const [orderStats] = await connection.query(`
      SELECT
        t.name as tenant_name,
        t.code as tenant_code,
        COUNT(o.id) as order_count
      FROM tenants t
      LEFT JOIN orders o ON o.tenant_id = t.id
      GROUP BY t.id, t.name, t.code
      ORDER BY order_count DESC
    `);
    console.table(orderStats);

    // 7. 检查用户数据
    console.log('\n7. 各租户的用户数量：');
    const [userStats] = await connection.query(`
      SELECT
        t.name as tenant_name,
        t.code as tenant_code,
        COUNT(u.id) as user_count
      FROM tenants t
      LEFT JOIN users u ON u.tenant_id = t.id
      GROUP BY t.id, t.name, t.code
      ORDER BY user_count DESC
    `);
    console.table(userStats);

    // 8. 总结
    console.log('\n=== 问题诊断 ===');
    console.log('如果"欢乐颂"租户能看到"天河佳信"的数据，可能的原因：');
    console.log('1. 后端API没有正确使用tenant_id过滤');
    console.log('2. BaseRepository的tenant过滤没有生效');
    console.log('3. 租户中间件没有正确设置tenantContext');
    console.log('4. 某些API绕过了BaseRepository直接查询数据库');

  } catch (error) {
    console.error('测试失败:', error.message);
  } finally {
    await connection.end();
  }
}

test();
