/**
 * 智能迁移旧数据到指定租户
 * - 删除旧的系统用户（admin, manager, sales, service）
 * - 迁移真实业务用户
 * - 迁移所有客户、订单、商品
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'crm_local'
  });

  console.log('=== 智能迁移旧数据到租户 ===\n');

  try {
    // 1. 找到天河佳信租户
    const [tenants] = await connection.query(`
      SELECT id, name, code FROM tenants WHERE name = '天河佳信'
    `);

    if (tenants.length === 0) {
      console.log('❌ 未找到"天河佳信"租户');
      return;
    }

    const targetTenant = tenants[0];
    console.log(`目标租户: ${targetTenant.name} (${targetTenant.code})\n`);

    // 2. 检查旧数据
    console.log('检查旧数据...');
    const [oldUsers] = await connection.query(`
      SELECT id, username, real_name, role
      FROM users
      WHERE tenant_id IS NULL AND role != 'super_admin'
    `);

    const [oldCustomers] = await connection.query(`
      SELECT COUNT(*) as count FROM customers WHERE tenant_id IS NULL
    `);

    const [oldOrders] = await connection.query(`
      SELECT COUNT(*) as count FROM orders WHERE tenant_id IS NULL
    `);

    const [oldProducts] = await connection.query(`
      SELECT COUNT(*) as count FROM products WHERE tenant_id IS NULL
    `);

    console.log(`- 用户: ${oldUsers.length} 个`);
    console.log(`- 客户: ${oldCustomers[0].count} 个`);
    console.log(`- 订单: ${oldOrders[0].count} 个`);
    console.log(`- 商品: ${oldProducts[0].count} 个\n`);

    // 3. 识别系统用户和业务用户
    const systemUsernames = ['admin', 'manager', 'sales', 'service'];
    const systemUsers = oldUsers.filter(u => systemUsernames.includes(u.username));
    const businessUsers = oldUsers.filter(u => !systemUsernames.includes(u.username));

    console.log('用户分类：');
    console.log(`- 系统用户（将删除）: ${systemUsers.length} 个`);
    if (systemUsers.length > 0) {
      systemUsers.forEach(u => console.log(`  * ${u.username} (${u.role})`));
    }
    console.log(`- 业务用户（将迁移）: ${businessUsers.length} 个`);
    if (businessUsers.length > 0) {
      businessUsers.forEach(u => console.log(`  * ${u.username} - ${u.real_name || '未命名'} (${u.role})`));
    }
    console.log();

    // 确认提示
    console.log('⚠️  即将执行以下操作：');
    console.log(`1. 删除 ${systemUsers.length} 个旧系统用户`);
    console.log(`2. 迁移 ${businessUsers.length} 个业务用户到 ${targetTenant.name}`);
    console.log(`3. 迁移 ${oldCustomers[0].count} 个客户到 ${targetTenant.name}`);
    console.log(`4. 迁移 ${oldOrders[0].count} 个订单到 ${targetTenant.name}`);
    console.log(`5. 迁移 ${oldProducts[0].count} 个商品到 ${targetTenant.name}`);
    console.log();

    const CONFIRM = true; // 设置为 true 执行迁移

    if (!CONFIRM) {
      console.log('❌ 未确认，取消迁移');
      console.log('如需执行，请将 CONFIRM 变量改为 true');
      return;
    }

    console.log('开始迁移...\n');

    // 4. 删除旧系统用户
    if (systemUsers.length > 0) {
      const systemUserIds = systemUsers.map(u => u.id);
      const placeholders = systemUserIds.map(() => '?').join(',');
      const result = await connection.query(
        `DELETE FROM users WHERE id IN (${placeholders})`,
        systemUserIds
      );
      console.log(`✓ 已删除 ${result[0].affectedRows} 个旧系统用户`);
    }

    // 5. 迁移业务用户
    if (businessUsers.length > 0) {
      const result = await connection.query(
        'UPDATE users SET tenant_id = ? WHERE tenant_id IS NULL AND role != "super_admin"',
        [targetTenant.id]
      );
      console.log(`✓ 已迁移 ${result[0].affectedRows} 个业务用户`);
    }

    // 6. 迁移客户
    if (oldCustomers[0].count > 0) {
      const result = await connection.query(
        'UPDATE customers SET tenant_id = ? WHERE tenant_id IS NULL',
        [targetTenant.id]
      );
      console.log(`✓ 已迁移 ${result[0].affectedRows} 个客户`);
    }

    // 7. 迁移订单
    if (oldOrders[0].count > 0) {
      const result = await connection.query(
        'UPDATE orders SET tenant_id = ? WHERE tenant_id IS NULL',
        [targetTenant.id]
      );
      console.log(`✓ 已迁移 ${result[0].affectedRows} 个订单`);
    }

    // 8. 迁移商品
    if (oldProducts[0].count > 0) {
      const result = await connection.query(
        'UPDATE products SET tenant_id = ? WHERE tenant_id IS NULL',
        [targetTenant.id]
      );
      console.log(`✓ 已迁移 ${result[0].affectedRows} 个商品`);
    }

    console.log('\n✓ 数据迁移完成！');
    console.log(`\n所有业务数据已归属到租户: ${targetTenant.name} (${targetTenant.code})`);
    console.log('\n建议：');
    console.log('1. 运行 node check-tenant-data-isolation.js 验证数据隔离');
    console.log('2. 登录不同租户测试数据隔离效果');

  } catch (error) {
    console.error('迁移失败:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

migrate();
