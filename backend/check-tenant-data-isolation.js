/**
 * 检查租户数据隔离情况
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

  console.log('=== 检查租户数据隔离情况 ===\n');

  try {
    // 1. 查看所有租户
    console.log('1. 当前租户列表：');
    const [tenants] = await connection.query(`
      SELECT id, name, code, created_at
      FROM tenants
      ORDER BY created_at DESC
    `);
    console.table(tenants);

    // 2. 查看用户的租户归属
    console.log('\n2. 用户的租户归属（最近10个）：');
    const [users] = await connection.query(`
      SELECT
        u.id, u.username, u.real_name, u.role, u.tenant_id,
        t.name as tenant_name, t.code as tenant_code
      FROM users u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE u.role != 'super_admin'
      ORDER BY u.created_at DESC
      LIMIT 10
    `);
    console.table(users);

    // 3. 检查没有tenant_id的用户（旧数据）
    console.log('\n3. 没有tenant_id的用户（旧数据）：');
    const [oldUsers] = await connection.query(`
      SELECT id, username, real_name, role, created_at
      FROM users
      WHERE tenant_id IS NULL AND role != 'super_admin'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    if (oldUsers.length > 0) {
      console.table(oldUsers);
      console.log(`⚠️  发现 ${oldUsers.length} 个用户没有tenant_id`);
    } else {
      console.log('✓ 所有用户都有tenant_id');
    }

    // 4. 检查客户的租户归属
    console.log('\n4. 客户的租户归属（最近10个）：');
    const [customers] = await connection.query(`
      SELECT
        c.id, c.name, c.phone, c.tenant_id,
        t.name as tenant_name, t.code as tenant_code,
        c.created_at
      FROM customers c
      LEFT JOIN tenants t ON t.id = c.tenant_id
      ORDER BY c.created_at DESC
      LIMIT 10
    `);
    console.table(customers);

    // 5. 检查没有tenant_id的客户（旧数据）
    console.log('\n5. 没有tenant_id的客户（旧数据）：');
    const [oldCustomers] = await connection.query(`
      SELECT COUNT(*) as count FROM customers WHERE tenant_id IS NULL
    `);
    const oldCustomerCount = oldCustomers[0].count;
    if (oldCustomerCount > 0) {
      console.log(`⚠️  发现 ${oldCustomerCount} 个客户没有tenant_id`);
      const [sampleOldCustomers] = await connection.query(`
        SELECT id, name, phone, created_at
        FROM customers
        WHERE tenant_id IS NULL
        ORDER BY created_at DESC
        LIMIT 5
      `);
      console.table(sampleOldCustomers);
    } else {
      console.log('✓ 所有客户都有tenant_id');
    }

    // 6. 检查订单的租户归属
    console.log('\n6. 订单的租户归属（最近10个）：');
    const [orders] = await connection.query(`
      SELECT
        o.id, o.order_number, o.tenant_id,
        t.name as tenant_name, t.code as tenant_code,
        o.created_at
      FROM orders o
      LEFT JOIN tenants t ON t.id = o.tenant_id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);
    console.table(orders);

    // 7. 检查没有tenant_id的订单（旧数据）
    console.log('\n7. 没有tenant_id的订单（旧数据）：');
    const [oldOrders] = await connection.query(`
      SELECT COUNT(*) as count FROM orders WHERE tenant_id IS NULL
    `);
    const oldOrderCount = oldOrders[0].count;
    if (oldOrderCount > 0) {
      console.log(`⚠️  发现 ${oldOrderCount} 个订单没有tenant_id`);
    } else {
      console.log('✓ 所有订单都有tenant_id');
    }

    // 8. 检查商品的租户归属
    console.log('\n8. 商品的租户归属（最近10个）：');
    const [products] = await connection.query(`
      SELECT
        p.id, p.name, p.tenant_id,
        t.name as tenant_name, t.code as tenant_code,
        p.created_at
      FROM products p
      LEFT JOIN tenants t ON t.id = p.tenant_id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    console.table(products);

    // 9. 检查没有tenant_id的商品（旧数据）
    console.log('\n9. 没有tenant_id的商品（旧数据）：');
    const [oldProducts] = await connection.query(`
      SELECT COUNT(*) as count FROM products WHERE tenant_id IS NULL
    `);
    const oldProductCount = oldProducts[0].count;
    if (oldProductCount > 0) {
      console.log(`⚠️  发现 ${oldProductCount} 个商品没有tenant_id`);
    } else {
      console.log('✓ 所有商品都有tenant_id');
    }

    // 10. 总结
    console.log('\n=== 数据隔离问题总结 ===');
    const issues = [];
    if (oldUsers.length > 0) issues.push(`${oldUsers.length} 个用户`);
    if (oldCustomerCount > 0) issues.push(`${oldCustomerCount} 个客户`);
    if (oldOrderCount > 0) issues.push(`${oldOrderCount} 个订单`);
    if (oldProductCount > 0) issues.push(`${oldProductCount} 个商品`);

    if (issues.length > 0) {
      console.log('⚠️  发现以下旧数据没有tenant_id：');
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('\n这些数据会被所有租户看到，需要进行数据迁移！');
    } else {
      console.log('✓ 所有数据都已正确标记tenant_id，数据隔离正常');
    }

  } catch (error) {
    console.error('检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

check();
