/**
 * 将旧数据（没有tenant_id的数据）迁移到指定租户
 */
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_local'
  });

  console.log('=== 旧数据迁移到租户 ===\n');

  try {
    // 1. 列出所有租户，让用户选择
    console.log('1. 当前租户列表：');
    const [tenants] = await connection.query(`
      SELECT id, name, code, created_at
      FROM tenants
      ORDER BY created_at ASC
    `);

    console.table(tenants.map((t, index) => ({
      序号: index + 1,
      租户名称: t.name,
      租户编码: t.code,
      创建时间: t.created_at
    })));

    // 2. 检查旧数据数量
    console.log('\n2. 旧数据统计：');
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users WHERE tenant_id IS NULL AND role != "super_admin"');
    const [customerCount] = await connection.query('SELECT COUNT(*) as count FROM customers WHERE tenant_id IS NULL');
    const [orderCount] = await connection.query('SELECT COUNT(*) as count FROM orders WHERE tenant_id IS NULL');
    const [productCount] = await connection.query('SELECT COUNT(*) as count FROM products WHERE tenant_id IS NULL');

    console.log(`- 用户: ${userCount[0].count} 个`);
    console.log(`- 客户: ${customerCount[0].count} 个`);
    console.log(`- 订单: ${orderCount[0].count} 个`);
    console.log(`- 商品: ${productCount[0].count} 个`);

    if (userCount[0].count === 0 && customerCount[0].count === 0 &&
        orderCount[0].count === 0 && productCount[0].count === 0) {
      console.log('\n✓ 没有需要迁移的旧数据');
      return;
    }

    // 3. 选择目标租户 - 天河佳信
    const targetTenant = tenants.find(t => t.name === '天河佳信');
    if (!targetTenant) {
      console.log('\n❌ 未找到"天河佳信"租户');
      console.log('可用的租户：');
      tenants.forEach(t => console.log(`  - ${t.name} (${t.code})`));
      return;
    }

    console.log(`\n3. 目标租户: ${targetTenant.name} (${targetTenant.code})`);
    console.log('   将所有旧数据迁移到此租户\n');

    // 确认提示
    console.log('⚠️  警告：此操作将修改数据库，请确认：');
    console.log(`   - 将 ${userCount[0].count} 个用户迁移到 ${targetTenant.name}`);
    console.log(`   - 将 ${customerCount[0].count} 个客户迁移到 ${targetTenant.name}`);
    console.log(`   - 将 ${orderCount[0].count} 个订单迁移到 ${targetTenant.name}`);
    console.log(`   - 将 ${productCount[0].count} 个商品迁移到 ${targetTenant.name}`);
    console.log('\n如果确认，请修改脚本中的 CONFIRM 变量为 true\n');

    const CONFIRM = true; // 已确认迁移到天河佳信

    if (!CONFIRM) {
      console.log('❌ 未确认，取消迁移');
      console.log('\n如需执行迁移，请：');
      console.log('1. 检查上面的租户列表');
      console.log('2. 确认要迁移到哪个租户');
      console.log('3. 修改脚本中的 targetTenant 选择（如果需要）');
      console.log('4. 将 CONFIRM 变量改为 true');
      console.log('5. 重新运行脚本');
      return;
    }

    // 4. 开始迁移
    console.log('开始迁移...\n');

    // 迁移用户
    if (userCount[0].count > 0) {
      const result = await connection.query(
        'UPDATE users SET tenant_id = ? WHERE tenant_id IS NULL AND role != "super_admin"',
        [targetTenant.id]
      );
      console.log(`✓ 已迁移 ${result[0].affectedRows} 个用户`);
    }

    // 迁移客户
    if (customerCount[0].count > 0) {
      const result = await connection.query(
        'UPDATE customers SET tenant_id = ? WHERE tenant_id IS NULL',
        [targetTenant.id]
      );
      console.log(`✓ 已迁移 ${result[0].affectedRows} 个客户`);
    }

    // 迁移订单
    if (orderCount[0].count > 0) {
      const result = await connection.query(
        'UPDATE orders SET tenant_id = ? WHERE tenant_id IS NULL',
        [targetTenant.id]
      );
      console.log(`✓ 已迁移 ${result[0].affectedRows} 个订单`);
    }

    // 迁移商品
    if (productCount[0].count > 0) {
      const result = await connection.query(
        'UPDATE products SET tenant_id = ? WHERE tenant_id IS NULL',
        [targetTenant.id]
      );
      console.log(`✓ 已迁移 ${result[0].affectedRows} 个商品`);
    }

    console.log('\n✓ 数据迁移完成！');
    console.log(`\n所有旧数据已归属到租户: ${targetTenant.name} (${targetTenant.code})`);

  } catch (error) {
    console.error('迁移失败:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
