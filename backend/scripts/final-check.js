/**
 * 最终检查脚本 - 确保所有表都已添加 tenant_id
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'abc789',
  password: 'YtZWJPF2bpsCscHX',
  database: 'crm_local',
  charset: 'utf8mb4'
};

// 根据方案，需要添加 tenant_id 的32个业务表
const requiredTables = {
  '用户权限类': ['users', 'roles', 'permissions', 'user_roles', 'role_permissions', 'departments', 'authorized_ips'],
  '客户管理类': ['customers', 'customer_tags', 'customer_groups', 'customer_shares', 'customer_assignments'],
  '产品订单类': ['product_categories', 'products', 'orders', 'order_items', 'logistics'],
  '财务增值类': ['performance_records', 'outsource_companies', 'value_added_price_config', 'value_added_orders', 'value_added_status_configs', 'value_added_remark_presets'],
  '售后服务类': ['after_sales_services', 'service_records', 'cod_cancel_applications'],
  '其他业务类': ['data_records', 'operation_logs', 'notifications', 'call_records', 'follow_up_records', 'sms_records']
};

async function checkAllTables(connection) {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   数据库表完整性检查                      ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // 获取所有表
  const [allTables] = await connection.execute('SHOW TABLES');
  const existingTableNames = allTables.map(row => Object.values(row)[0]);

  console.log(`数据库中共有 ${existingTableNames.length} 个表\n`);

  // 获取已添加 tenant_id 的表
  const [tablesWithTenantId] = await connection.execute(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND COLUMN_NAME = 'tenant_id'
    ORDER BY TABLE_NAME
  `, [dbConfig.database]);

  const tablesWithTenantIdNames = tablesWithTenantId.map(row => row.TABLE_NAME);

  console.log(`已添加 tenant_id 的表: ${tablesWithTenantIdNames.length} 个\n`);

  // 分类检查
  let totalRequired = 0;
  let totalAdded = 0;
  let totalMissing = 0;
  let totalNotExist = 0;

  const missingTables = [];
  const notExistTables = [];

  for (const [category, tables] of Object.entries(requiredTables)) {
    console.log(`\n=== ${category}（${tables.length}个表）===\n`);

    tables.forEach(table => {
      totalRequired++;
      const exists = existingTableNames.includes(table);
      const hasTenantId = tablesWithTenantIdNames.includes(table);

      if (!exists) {
        console.log(`❌ ${table} - 表不存在`);
        notExistTables.push(table);
        totalNotExist++;
      } else if (!hasTenantId) {
        console.log(`⚠️  ${table} - 表存在但未添加 tenant_id`);
        missingTables.push(table);
        totalMissing++;
      } else {
        console.log(`✅ ${table} - 已添加 tenant_id`);
        totalAdded++;
      }
    });
  }

  // 总结
  console.log('\n\n╔════════════════════════════════════════════╗');
  console.log('║   检查结果总结                            ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log(`应该添加 tenant_id 的表: ${totalRequired} 个`);
  console.log(`✅ 已成功添加: ${totalAdded} 个`);
  console.log(`⚠️  表存在但未添加: ${totalMissing} 个`);
  console.log(`❌ 表不存在: ${totalNotExist} 个\n`);

  if (missingTables.length > 0) {
    console.log('⚠️  需要补充添加 tenant_id 的表：');
    missingTables.forEach((table, i) => {
      console.log(`   ${i + 1}. ${table}`);
    });
    console.log('');
  }

  if (notExistTables.length > 0) {
    console.log('❌ 数据库中不存在的表（无需处理）：');
    notExistTables.forEach((table, i) => {
      console.log(`   ${i + 1}. ${table}`);
    });
    console.log('');
  }

  return { totalRequired, totalAdded, totalMissing, totalNotExist, missingTables, notExistTables };
}

async function generateMissingSQL(missingTables) {
  if (missingTables.length === 0) {
    return null;
  }

  console.log('\n=== 生成补充SQL脚本 ===\n');

  let sql = '-- 补充添加 tenant_id 字段\n\n';
  sql += 'SET NAMES utf8mb4;\n\n';

  missingTables.forEach(table => {
    sql += `-- ${table} 表\n`;
    sql += `ALTER TABLE \`${table}\` \n`;
    sql += `  ADD COLUMN \`tenant_id\` VARCHAR(36) NULL COMMENT '租户ID' AFTER \`id\`,\n`;
    sql += `  ADD INDEX \`idx_tenant_id\` (\`tenant_id\`);\n\n`;
  });

  sql += `SELECT '✅ 补充完成！已为 ${missingTables.length} 个表添加 tenant_id' AS message;\n`;

  return sql;
}

async function main() {
  let connection;

  try {
    console.log('⏳ 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');

    const { totalRequired, totalAdded, totalMissing, totalNotExist, missingTables, notExistTables } = await checkAllTables(connection);

    // 如果有缺失的表，生成补充SQL
    if (missingTables.length > 0) {
      const sql = await generateMissingSQL(missingTables);

      const fs = require('fs');
      const path = require('path');
      const sqlPath = path.join(__dirname, '../database-migrations/add-tenant-final-补充.sql');
      fs.writeFileSync(sqlPath, sql, 'utf8');

      console.log(`📄 已生成补充SQL脚本: ${sqlPath}`);
      console.log('\n执行命令：');
      console.log(`mysql -u abc789 -pYtZWJPF2bpsCscHX crm_local < backend/database-migrations/add-tenant-final-补充.sql\n`);
    }

    // 最终判断
    console.log('\n╔════════════════════════════════════════════╗');
    if (totalMissing === 0) {
      console.log('║   ✅ 数据库改造完成！                     ║');
      console.log('╚════════════════════════════════════════════╝\n');
      console.log(`所有存在的业务表（${totalAdded}个）都已成功添加 tenant_id 字段！`);
      console.log(`${totalNotExist}个表在数据库中不存在，无需处理。\n`);
    } else {
      console.log('║   ⚠️  数据库改造未完成                    ║');
      console.log('╚════════════════════════════════════════════╝\n');
      console.log(`还有 ${totalMissing} 个表需要添加 tenant_id 字段。`);
      console.log('请执行上面生成的补充SQL脚本。\n');
    }

  } catch (error) {
    console.error('\n❌ 检查失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
