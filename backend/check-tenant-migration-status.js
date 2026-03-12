require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function checkTenantMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'abc789',
    password: process.env.DB_PASSWORD || 'YtZWJPF2bpsCscHX',
    database: process.env.DB_DATABASE || 'crm_local'
  });

  console.log('='.repeat(80));
  console.log('多租户改造状态检查报告');
  console.log('='.repeat(80));
  console.log();

  // 1. 检查 user_roles 表
  console.log('1. user_roles 表检查：');
  console.log('-'.repeat(80));
  try {
    const [tables] = await connection.query(`SHOW TABLES LIKE 'user_roles'`);
    if (tables.length > 0) {
      console.log('✓ user_roles 表存在');
      const [fields] = await connection.query(`DESCRIBE user_roles`);
      console.log('  字段列表：');
      fields.forEach(f => console.log(`    - ${f.Field} (${f.Type})`));

      const [count] = await connection.query(`SELECT COUNT(*) as count FROM user_roles`);
      console.log(`  数据行数: ${count[0].count}`);
      console.log('  用途: 用户和角色的多对多关联表（RBAC权限系统必需）');
      console.log('  影响: 如果缺失，用户无法分配角色，权限系统无法工作');
    } else {
      console.log('✗ user_roles 表不存在');
      console.log('  状态: 应该存在（RBAC权限系统必需）');
      console.log('  影响: 用户无法分配角色，权限系统无法工作');
    }
  } catch (error) {
    console.log('✗ 检查失败:', error.message);
  }
  console.log();

  // 2. 检查 authorized_ips 表
  console.log('2. authorized_ips 表检查：');
  console.log('-'.repeat(80));
  try {
    const [tables] = await connection.query(`SHOW TABLES LIKE 'authorized_ips'`);
    if (tables.length > 0) {
      console.log('✓ authorized_ips 表存在');
      const [fields] = await connection.query(`DESCRIBE authorized_ips`);
      console.log('  字段列表：');
      fields.forEach(f => console.log(`    - ${f.Field} (${f.Type})`));

      const [count] = await connection.query(`SELECT COUNT(*) as count FROM authorized_ips`);
      console.log(`  数据行数: ${count[0].count}`);
      console.log('  用途: IP白名单管理（可选功能）');
      console.log('  影响: 如果未使用IP限制功能，缺失无影响');
    } else {
      console.log('✗ authorized_ips 表不存在');
      console.log('  状态: 可选表（取决于是否启用IP白名单功能）');
      console.log('  影响: 如果未使用IP限制功能，缺失无影响');
    }
  } catch (error) {
    console.log('✗ 检查失败:', error.message);
  }
  console.log();

  // 3. 检查所有表的 tenant_id 字段
  console.log('3. tenant_id 字段迁移状态：');
  console.log('-'.repeat(80));

  const needTenantIdTables = [
    'users', 'roles', 'permissions', 'departments', 'customers',
    'products', 'product_categories', 'orders', 'order_items',
    'system_configs', 'operation_logs', 'cod_cancel_applications',
    'after_sales_services', 'outsource_companies', 'value_added_price_config',
    'value_added_orders', 'value_added_status_configs', 'value_added_remark_presets'
  ];

  const hasTenantId = [];
  const missingTenantId = [];
  const tableNotExists = [];

  for (const tableName of needTenantIdTables) {
    try {
      const [tables] = await connection.query(`SHOW TABLES LIKE '${tableName}'`);
      if (tables.length === 0) {
        tableNotExists.push(tableName);
        console.log(`✗ ${tableName} - 表不存在`);
        continue;
      }

      const [fields] = await connection.query(`DESCRIBE ${tableName}`);
      const hasTenant = fields.some(f => f.Field === 'tenant_id');

      if (hasTenant) {
        hasTenantId.push(tableName);
        console.log(`✓ ${tableName}`);
      } else {
        missingTenantId.push(tableName);
        console.log(`✗ ${tableName} - 缺少 tenant_id 字段`);
      }
    } catch (error) {
      console.log(`✗ ${tableName} - 检查失败: ${error.message}`);
    }
  }
  console.log();

  // 4. 检查核心业务表是否存在
  console.log('4. 核心业务表存在性检查：');
  console.log('-'.repeat(80));

  const coreTables = [
    'users', 'roles', 'permissions', 'user_roles', 'role_permissions',
    'departments', 'customers', 'products', 'product_categories',
    'orders', 'order_items', 'system_configs', 'operation_logs',
    'cod_cancel_applications', 'after_sales_services',
    'outsource_companies', 'value_added_price_config',
    'value_added_orders', 'value_added_status_configs',
    'value_added_remark_presets'
  ];

  const existingTables = [];
  const missingTables = [];

  for (const tableName of coreTables) {
    try {
      const [tables] = await connection.query(`SHOW TABLES LIKE '${tableName}'`);
      if (tables.length > 0) {
        existingTables.push(tableName);
        console.log(`✓ ${tableName}`);
      } else {
        missingTables.push(tableName);
        console.log(`✗ ${tableName}`);
      }
    } catch (error) {
      missingTables.push(tableName);
      console.log(`✗ ${tableName} - 检查失败`);
    }
  }
  console.log();

  // 5. 检查关键字段
  console.log('5. 关键字段检查：');
  console.log('-'.repeat(80));

  // 检查 orders 表的代收和绩效字段
  try {
    const [tables] = await connection.query(`SHOW TABLES LIKE 'orders'`);
    if (tables.length > 0) {
      console.log('orders 表关键字段：');
      const [fields] = await connection.query(`DESCRIBE orders`);
      const requiredFields = [
        'cod_amount', 'cod_status', 'cod_returned_amount',
        'performance_status', 'performance_coefficient'
      ];

      requiredFields.forEach(field => {
        const exists = fields.some(f => f.Field === field);
        console.log(`  ${exists ? '✓' : '✗'} ${field}`);
      });
    }
  } catch (error) {
    console.log('  ✗ 无法检查 orders 表');
  }
  console.log();

  // 6. 总结
  console.log('='.repeat(80));
  console.log('检查总结：');
  console.log('='.repeat(80));
  console.log(`✓ 存在的核心表: ${existingTables.length}/${coreTables.length}`);
  console.log(`✓ 已添加 tenant_id 的表: ${hasTenantId.length}/${needTenantIdTables.length}`);

  if (missingTables.length > 0) {
    console.log(`✗ 缺失的表: ${missingTables.join(', ')}`);
  }

  if (missingTenantId.length > 0) {
    console.log(`✗ 缺少 tenant_id 的表: ${missingTenantId.join(', ')}`);
  }

  if (tableNotExists.length > 0) {
    console.log(`✗ 不存在的表: ${tableNotExists.join(', ')}`);
  }

  console.log();
  console.log('关键问题回答：');
  console.log('-'.repeat(80));
  console.log('1. user_roles 表：');
  console.log('   - 应该存在：是（RBAC权限系统必需）');
  console.log('   - 如果缺失：用户无法分配角色，权限系统无法工作');
  console.log();
  console.log('2. authorized_ips 表：');
  console.log('   - 应该存在：可选（取决于是否使用IP白名单功能）');
  console.log('   - 如果缺失：如果不使用IP限制功能，无影响');
  console.log();

  await connection.end();
}

checkTenantMigration().catch(console.error);
