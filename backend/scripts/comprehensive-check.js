/**
 * 全面检查 - 检查所有实际存在的业务表
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'abc789',
  password: 'YtZWJPF2bpsCscHX',
  database: 'crm_local',
  charset: 'utf8mb4'
};

// 系统表（不需要tenant_id）
const systemTables = [
  'admin_users', 'admin_operation_logs',
  'tenants', 'tenant_settings', 'tenant_packages', 'tenant_license_logs',
  'system_configs', 'system_config', 'system_settings', 'system_license', 'system_announcements', 'system_messages',
  'versions', 'licenses', 'license_logs',
  'private_deployments',
  'api_interfaces', 'api_statistics', 'api_call_logs',
  'logs', 'message_cleanup_history'
];

// 可能需要tenant_id的业务表（根据实际表名）
const potentialBusinessTables = [
  // 用户权限
  'users', 'roles', 'permissions', 'permissions_closure', 'role_permissions', 'user_permissions', 'departments',
  // 客户管理
  'customers', 'customer_tags', 'customer_groups', 'customer_shares', 'customer_assignments',
  // 产品订单
  'product_categories', 'products', 'orders', 'order_items', 'order_status_history', 'order_audits', 'order_field_configs',
  // 物流
  'logistics', 'logistics_companies', 'logistics_api_configs', 'logistics_status', 'logistics_status_history',
  'logistics_exceptions', 'logistics_todos', 'logistics_traces', 'logistics_tracking',
  // 财务增值
  'performance_records', 'performance_config', 'performance_metrics', 'performance_report_configs', 'performance_report_logs',
  'performance_shares', 'performance_share_members',
  'outsource_companies', 'value_added_price_config', 'value_added_orders', 'value_added_status_configs', 'value_added_remark_presets',
  'commission_setting', 'commission_ladder',
  // 售后服务
  'after_sales_services', 'service_records', 'cod_cancel_applications', 'rejection_reasons',
  // 其他业务
  'data_records', 'operation_logs', 'notifications', 'notification_channels', 'message_subscriptions', 'message_read_status', 'messages',
  'call_records', 'call_recordings', 'call_lines', 'call_configs', 'global_call_config', 'phone_configs', 'phone_blacklist',
  'user_line_assignments', 'outbound_tasks', 'work_phones',
  'follow_up_records', 'sms_records', 'sms_templates',
  'device_bind_logs', 'device_bindlogs',
  'improvement_goals', 'timeout_reminder_configs',
  'module_schemes', 'module_status', 'department_subscription_configs',
  // 支付
  'payment_orders', 'payment_records', 'payment_configs', 'payment_logs',
  // 企业微信
  'wecom_configs', 'wecom_customers', 'wecom_user_bindings', 'wecom_service_accounts',
  'wecom_acquisition_links', 'wecom_chat_records', 'wecom_payment_records'
];

async function main() {
  let connection;

  try {
    console.log('⏳ 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');

    // 获取所有表
    const [allTables] = await connection.execute('SHOW TABLES');
    const allTableNames = allTables.map(row => Object.values(row)[0]);

    console.log(`数据库中共有 ${allTableNames.length} 个表\n`);

    // 获取已添加tenant_id的表
    const [tablesWithTenantId] = await connection.execute(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND COLUMN_NAME = 'tenant_id'
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);

    const tablesWithTenantIdSet = new Set(tablesWithTenantId.map(row => row.TABLE_NAME));

    console.log(`已添加 tenant_id 的表: ${tablesWithTenantIdSet.size} 个\n`);

    // 分类所有表
    const businessTablesNeedTenantId = [];
    const businessTablesHaveTenantId = [];
    const systemTablesFound = [];
    const unknownTables = [];

    allTableNames.forEach(table => {
      const hasTenantId = tablesWithTenantIdSet.has(table);

      if (systemTables.includes(table)) {
        systemTablesFound.push(table);
      } else if (potentialBusinessTables.includes(table)) {
        if (hasTenantId) {
          businessTablesHaveTenantId.push(table);
        } else {
          businessTablesNeedTenantId.push(table);
        }
      } else {
        // 未知表，需要判断
        if (hasTenantId) {
          businessTablesHaveTenantId.push(table);
        } else {
          unknownTables.push(table);
        }
      }
    });

    console.log('╔════════════════════════════════════════════╗');
    console.log('║   表分类统计                              ║');
    console.log('╚════════════════════════════════════════════╝\n');

    console.log(`系统表（不需要tenant_id）: ${systemTablesFound.length} 个`);
    console.log(`业务表（已添加tenant_id）: ${businessTablesHaveTenantId.length} 个`);
    console.log(`业务表（需要添加tenant_id）: ${businessTablesNeedTenantId.length} 个`);
    console.log(`未分类表: ${unknownTables.length} 个\n`);

    if (businessTablesNeedTenantId.length > 0) {
      console.log('⚠️  需要添加 tenant_id 的业务表：\n');
      businessTablesNeedTenantId.forEach((table, i) => {
        console.log(`   ${i + 1}. ${table}`);
      });
      console.log('');
    }

    if (unknownTables.length > 0) {
      console.log('❓ 未分类的表（需要人工判断）：\n');
      unknownTables.forEach((table, i) => {
        console.log(`   ${i + 1}. ${table}`);
      });
      console.log('');
    }

    // 生成补充SQL
    if (businessTablesNeedTenantId.length > 0) {
      console.log('\n=== 生成补充SQL ===\n');

      let sql = '-- 补充添加 tenant_id 到剩余业务表\n\n';
      sql += 'SET NAMES utf8mb4;\n\n';

      for (const table of businessTablesNeedTenantId) {
        // 检查表结构，确定插入位置
        const [columns] = await connection.execute(`SHOW COLUMNS FROM \`${table}\``);
        const hasIdColumn = columns.some(col => col.Field === 'id');

        sql += `-- ${table} 表\n`;
        sql += `ALTER TABLE \`${table}\` \n`;
        if (hasIdColumn) {
          sql += `  ADD COLUMN \`tenant_id\` VARCHAR(36) NULL COMMENT '租户ID' AFTER \`id\`,\n`;
        } else {
          sql += `  ADD COLUMN \`tenant_id\` VARCHAR(36) NULL COMMENT '租户ID' FIRST,\n`;
        }
        sql += `  ADD INDEX \`idx_tenant_id\` (\`tenant_id\`);\n\n`;
      }

      sql += `SELECT '✅ 补充完成！已为 ${businessTablesNeedTenantId.length} 个表添加 tenant_id' AS message;\n`;

      const fs = require('fs');
      const path = require('path');
      const sqlPath = path.join(__dirname, '../database-migrations/add-tenant-comprehensive.sql');
      fs.writeFileSync(sqlPath, sql, 'utf8');

      console.log(`📄 已生成补充SQL: ${sqlPath}\n`);
    }

    // 最终判断
    console.log('\n╔════════════════════════════════════════════╗');
    if (businessTablesNeedTenantId.length === 0) {
      console.log('║   ✅ 所有业务表都已添加 tenant_id！       ║');
    } else {
      console.log('║   ⚠️  还有业务表需要添加 tenant_id        ║');
    }
    console.log('╚════════════════════════════════════════════╝\n');

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
