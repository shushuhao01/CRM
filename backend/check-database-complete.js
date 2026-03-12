require('dotenv').config({ path: '.env.local' });
const { DataSource } = require('typeorm');

// 检查多个数据库文件
const databases = [
  { name: 'crm.db', path: './data/crm.db' },
  { name: 'crm_dev.db', path: './data/crm_dev.db' },
  { name: 'crm_local.db', path: './data/crm_local.db' },
  { name: 'crm_dev.sqlite', path: './database/crm_dev.sqlite' }
];

let AppDataSource = null;
let selectedDb = null;

// 选择第一个非空的数据库
const fs = require('fs');
for (const db of databases) {
  try {
    const stats = fs.statSync(db.path);
    if (stats.size > 0) {
      console.log(`使用数据库: ${db.name} (${stats.size} 字节)`);
      selectedDb = db;
      AppDataSource = new DataSource({
        type: 'sqlite',
        database: db.path,
        synchronize: false,
        logging: false
      });
      break;
    }
  } catch (error) {
    // 文件不存在，继续
  }
}

if (!AppDataSource) {
  console.error('错误：找不到有效的数据库文件！');
  process.exit(1);
}

async function checkDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('='.repeat(80));
    console.log('数据库完整性检查报告');
    console.log('='.repeat(80));
    console.log();

    // 1. 检查所有表
    console.log('1. 数据库表列表：');
    console.log('-'.repeat(80));
    const tables = await AppDataSource.query(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      ORDER BY name
    `);

    console.log(`共有 ${tables.length} 个表：`);
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.name}`);
    });
    console.log();

    // 2. 检查 user_roles 表
    console.log('2. user_roles 表检查：');
    console.log('-'.repeat(80));
    try {
      const userRolesInfo = await AppDataSource.query(`PRAGMA table_info(user_roles)`);
      if (userRolesInfo.length > 0) {
        console.log('✓ user_roles 表存在');
        console.log('  字段列表：');
        userRolesInfo.forEach(col => {
          console.log(`    - ${col.name} (${col.type})`);
        });

        const userRolesCount = await AppDataSource.query(`SELECT COUNT(*) as count FROM user_roles`);
        console.log(`  数据行数: ${userRolesCount[0].count}`);
      }
    } catch (error) {
      console.log('✗ user_roles 表不存在或有错误:', error.message);
    }
    console.log();

    // 3. 检查 authorized_ips 表
    console.log('3. authorized_ips 表检查：');
    console.log('-'.repeat(80));
    try {
      const authorizedIpsInfo = await AppDataSource.query(`PRAGMA table_info(authorized_ips)`);
      if (authorizedIpsInfo.length > 0) {
        console.log('✓ authorized_ips 表存在');
        console.log('  字段列表：');
        authorizedIpsInfo.forEach(col => {
          console.log(`    - ${col.name} (${col.type})`);
        });

        const authorizedIpsCount = await AppDataSource.query(`SELECT COUNT(*) as count FROM authorized_ips`);
        console.log(`  数据行数: ${authorizedIpsCount[0].count}`);
      }
    } catch (error) {
      console.log('✗ authorized_ips 表不存在或有错误:', error.message);
    }
    console.log();

    // 4. 检查核心业务表
    console.log('4. 核心业务表检查：');
    console.log('-'.repeat(80));
    const coreTables = [
      'users',
      'roles',
      'permissions',
      'user_roles',
      'role_permissions',
      'departments',
      'customers',
      'products',
      'product_categories',
      'orders',
      'order_items',
      'system_configs',
      'operation_logs',
      'cod_cancel_applications',
      'after_sales_services',
      'outsource_companies',
      'value_added_price_config',
      'value_added_orders',
      'value_added_status_configs',
      'value_added_remark_presets'
    ];

    const missingTables = [];
    const existingTables = [];

    for (const tableName of coreTables) {
      try {
        const info = await AppDataSource.query(`PRAGMA table_info(${tableName})`);
        if (info.length > 0) {
          existingTables.push(tableName);
          console.log(`✓ ${tableName}`);
        } else {
          missingTables.push(tableName);
          console.log(`✗ ${tableName} (表为空)`);
        }
      } catch (error) {
        missingTables.push(tableName);
        console.log(`✗ ${tableName} (不存在)`);
      }
    }
    console.log();

    // 5. 检查关键字段
    console.log('5. 关键字段检查：');
    console.log('-'.repeat(80));

    // 检查 orders 表的关键字段
    console.log('orders 表关键字段：');
    try {
      const ordersFields = await AppDataSource.query(`PRAGMA table_info(orders)`);
      const requiredFields = [
        'cod_amount',
        'cod_status',
        'cod_returned_amount',
        'cod_returned_at',
        'cod_cancelled_at',
        'cod_remark',
        'performance_status',
        'performance_coefficient',
        'performance_remark',
        'estimated_commission'
      ];

      requiredFields.forEach(field => {
        const exists = ordersFields.find(f => f.name === field);
        if (exists) {
          console.log(`  ✓ ${field}`);
        } else {
          console.log(`  ✗ ${field} (缺失)`);
        }
      });
    } catch (error) {
      console.log(`  ✗ 无法检查 orders 表: ${error.message}`);
    }
    console.log();

    // 检查 outsource_companies 表的关键字段
    console.log('outsource_companies 表关键字段：');
    try {
      const companyFields = await AppDataSource.query(`PRAGMA table_info(outsource_companies)`);
      const requiredFields = [
        'sort_order',
        'total_orders',
        'valid_orders',
        'invalid_orders',
        'total_amount',
        'settled_amount'
      ];

      requiredFields.forEach(field => {
        const exists = companyFields.find(f => f.name === field);
        if (exists) {
          console.log(`  ✓ ${field}`);
        } else {
          console.log(`  ✗ ${field} (缺失)`);
        }
      });
    } catch (error) {
      console.log(`  ✗ 无法检查 outsource_companies 表: ${error.message}`);
    }
    console.log();

    // 检查 value_added_orders 表的关键字段
    console.log('value_added_orders 表关键字段：');
    try {
      const valueAddedFields = await AppDataSource.query(`PRAGMA table_info(value_added_orders)`);
      const requiredFields = [
        'order_id',
        'order_number',
        'tracking_number',
        'express_company',
        'order_status',
        'order_date',
        'company_id',
        'unit_price',
        'status',
        'settlement_status'
      ];

      requiredFields.forEach(field => {
        const exists = valueAddedFields.find(f => f.name === field);
        if (exists) {
          console.log(`  ✓ ${field}`);
        } else {
          console.log(`  ✗ ${field} (缺失)`);
        }
      });
    } catch (error) {
      console.log(`  ✗ 无法检查 value_added_orders 表: ${error.message}`);
    }
    console.log();

    // 6. 检查索引
    console.log('6. 索引检查：');
    console.log('-'.repeat(80));
    const indexTables = ['orders', 'value_added_orders', 'outsource_companies'];
    for (const tableName of indexTables) {
      try {
        const indexes = await AppDataSource.query(`PRAGMA index_list(${tableName})`);
        console.log(`${tableName} 表索引 (${indexes.length}个):`);
        indexes.forEach(idx => {
          console.log(`  - ${idx.name}`);
        });
      } catch (error) {
        console.log(`  ✗ 无法检查 ${tableName} 表索引`);
      }
    }
    console.log();

    // 7. 总结
    console.log('='.repeat(80));
    console.log('检查总结：');
    console.log('='.repeat(80));
    console.log(`✓ 存在的核心表: ${existingTables.length}/${coreTables.length}`);
    if (missingTables.length > 0) {
      console.log(`✗ 缺失的表: ${missingTables.join(', ')}`);
    } else {
      console.log('✓ 所有核心表都已存在！');
    }

    // 8. user_roles 和 authorized_ips 分析
    console.log();
    console.log('特殊表分析：');
    console.log('-'.repeat(80));
    console.log('user_roles 表：');
    console.log('  用途: 用户和角色的多对多关联表');
    console.log('  状态: 应该存在（RBAC权限系统必需）');
    console.log('  影响: 如果缺失，用户无法分配角色，权限系统无法工作');
    console.log();
    console.log('authorized_ips 表：');
    console.log('  用途: IP白名单管理（如果系统有IP限制功能）');
    console.log('  状态: 可选表（取决于是否启用IP白名单功能）');
    console.log('  影响: 如果缺失且未使用IP限制功能，无影响');
    console.log();

    await AppDataSource.destroy();
    console.log('检查完成！');

  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkDatabase();
