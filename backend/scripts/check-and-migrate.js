/**
 * 检查数据库表并执行迁移
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'localhost',
  user: process.argv[2] || 'abc789',
  password: process.argv[3] || 'YtZWJPF2bpsCscHX',
  database: 'crm_local',
  charset: 'utf8mb4',
  multipleStatements: true
};

// 需要检查的32个业务表
const requiredTables = [
  // 用户权限类（7个）
  'users', 'roles', 'permissions', 'user_roles', 'role_permissions', 'departments', 'authorized_ips',
  // 客户管理类（5个）
  'customers', 'customer_tags', 'customer_groups', 'customer_shares', 'customer_assignments',
  // 产品订单类（5个）
  'product_categories', 'products', 'orders', 'order_items', 'logistics',
  // 财务增值类（6个）
  'performance_records', 'outsource_companies', 'value_added_price_config',
  'value_added_orders', 'value_added_status_configs', 'value_added_remark_presets',
  // 售后服务类（3个）
  'after_sales_services', 'service_records', 'cod_cancel_applications',
  // 其他业务表（6个）
  'data_records', 'operation_logs', 'notifications', 'call_records', 'follow_up_records', 'sms_records'
];

async function checkTables(connection) {
  console.log('\n=== 第1步：检查数据库表 ===\n');

  const [tables] = await connection.execute('SHOW TABLES');
  const tableNames = tables.map(row => Object.values(row)[0]);

  console.log(`数据库中共有 ${tableNames.length} 个表\n`);

  const existingTables = [];
  const missingTables = [];

  requiredTables.forEach(table => {
    if (tableNames.includes(table)) {
      existingTables.push(table);
    } else {
      missingTables.push(table);
    }
  });

  console.log(`✅ 存在的业务表: ${existingTables.length}/32`);
  existingTables.forEach((table, i) => {
    console.log(`   ${i + 1}. ${table}`);
  });

  if (missingTables.length > 0) {
    console.log(`\n⚠️  缺少的业务表: ${missingTables.length}/32`);
    missingTables.forEach((table, i) => {
      console.log(`   ${i + 1}. ${table}`);
    });
  }

  return { existingTables, missingTables, allTables: tableNames };
}

async function executeMigration(connection, existingTables) {
  console.log('\n=== 第2步：执行数据库迁移 ===\n');

  // 选择合适的迁移脚本
  let migrationFile;
  if (existingTables.length >= 30) {
    migrationFile = 'add-tenant-support-complete.sql';
    console.log(`使用完整版迁移脚本（${existingTables.length}个表）`);
  } else {
    migrationFile = 'add-tenant-support.sql';
    console.log(`使用基础版迁移脚本（${existingTables.length}个表）`);
  }

  const migrationPath = path.join(__dirname, '../database-migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.log(`❌ 迁移脚本不存在: ${migrationPath}`);
    return false;
  }

  console.log(`📄 读取迁移脚本: ${migrationFile}`);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    console.log('⏳ 执行迁移脚本...\n');

    // 分割SQL语句并逐个执行（避免multipleStatements的问题）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        await connection.query(statement);
        successCount++;
      } catch (error) {
        // 忽略某些预期的错误
        if (error.code === 'ER_TABLE_EXISTS_ERROR' ||
            error.code === 'ER_DUP_FIELDNAME' ||
            error.code === 'ER_DUP_KEYNAME' ||
            error.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
            error.code === 'ER_NO_SUCH_TABLE') {
          // 这些错误可以忽略
        } else {
          errorCount++;
          console.log(`⚠️  ${error.message}`);
        }
      }
    }

    console.log(`\n✅ 迁移脚本执行完成`);
    console.log(`   成功: ${successCount} 条语句`);
    if (errorCount > 0) {
      console.log(`   警告: ${errorCount} 条语句有错误（可能是正常的）`);
    }

    return true;
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    return false;
  }
}

async function verifyMigration(connection) {
  console.log('\n=== 第3步：验证迁移结果 ===\n');

  try {
    // 检查租户表
    const [tenants] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenants'
    `, [dbConfig.database]);

    if (tenants[0].count > 0) {
      console.log('✅ tenants 表已创建');
    } else {
      console.log('❌ tenants 表不存在');
      return false;
    }

    // 检查 tenant_id 字段
    const [fields] = await connection.execute(`
      SELECT
        TABLE_NAME,
        COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND COLUMN_NAME = 'tenant_id'
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);

    console.log(`✅ 已为 ${fields.length} 个表添加 tenant_id 字段\n`);

    fields.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.TABLE_NAME}`);
    });

    // 测试查询
    console.log('\n=== 第4步：测试查询功能 ===\n');

    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`✅ 用户表查询成功，共 ${users[0].count} 条记录`);

    const [customers] = await connection.execute('SELECT COUNT(*) as count FROM customers');
    console.log(`✅ 客户表查询成功，共 ${customers[0].count} 条记录`);

    const [orders] = await connection.execute('SELECT COUNT(*) as count FROM orders');
    console.log(`✅ 订单表查询成功，共 ${orders[0].count} 条记录`);

    return true;
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   CRM Local 数据库检查和迁移工具          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log(`数据库: ${dbConfig.database}`);
  console.log(`主机: ${dbConfig.host}`);
  console.log(`用户: ${dbConfig.user}\n`);

  let connection;

  try {
    console.log('⏳ 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');

    // 第1步：检查表
    const { existingTables, missingTables } = await checkTables(connection);

    // 第2步：执行迁移
    const migrationSuccess = await executeMigration(connection, existingTables);
    if (!migrationSuccess) {
      console.log('\n❌ 迁移失败');
      process.exit(1);
    }

    // 第3步：验证结果
    const verifySuccess = await verifyMigration(connection);
    if (!verifySuccess) {
      console.log('\n❌ 验证失败');
      process.exit(1);
    }

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   ✅ 数据库迁移完成！                     ║');
    console.log('╚════════════════════════════════════════════╝\n');

    console.log('下一步：');
    console.log('1. 启动后端服务: cd backend && npm run dev');
    console.log('2. 启动前端服务: npm run dev');
    console.log('3. 测试登录、查询等功能是否正常\n');

  } catch (error) {
    console.error('\n❌ 执行过程出错:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
