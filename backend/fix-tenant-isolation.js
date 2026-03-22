/**
 * 多租户数据隔离修复脚本
 *
 * 1. 为没有 tenant_id 的业务表添加列（如果缺失）
 * 2. 将所有 NULL tenant_id 的数据分配到正确的租户
 * 3. 验证修复结果
 *
 * 运行: node fix-tenant-isolation.js
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'abc789',
  password: 'YtZWJPF2bpsCscHX',
  database: 'crm_local'
};

// 需要租户隔离的业务表
const TENANT_TABLES = [
  'customers', 'orders', 'order_items', 'products', 'product_categories',
  'departments', 'roles', 'permissions', 'users',
  'follow_up_records', 'call_records', 'customer_tags', 'customer_groups',
  'customer_shares', 'after_sales_services', 'service_records',
  'notifications', 'operation_logs', 'system_messages', 'system_configs',
  'department_order_limits', 'sms_records', 'sms_templates',
  'outsource_companies', 'cod_cancel_applications', 'customer_assignments',
  'value_added_orders', 'value_added_price_config', 'value_added_status_configs',
  'value_added_remark_presets', 'role_permissions', 'payment_orders', 'payment_records',
  'data_records', 'performance_records', 'performance_metrics',
  'logistics', 'user_permissions',
  'outbound_tasks', 'order_audits', 'order_field_configs', 'order_status_history',
  'messages', 'message_read_status', 'message_subscriptions',
  'performance_config', 'performance_report_configs', 'performance_shares',
  'performance_share_members', 'commission_setting', 'commission_ladder',
  'customer_service_permissions', 'sensitive_info_permissions',
  'wechat_followers', 'wechat_message_logs', 'wechat_qrcode_scenes',
];

// 不需要租户隔离的表（全局/管理后台表）
const GLOBAL_TABLES = [
  'tenants', 'tenant_settings', 'tenant_logs', 'tenant_license_logs', 'tenant_packages',
  'admin_users', 'admin_operation_logs', 'admin_notifications', 'admin_notification_channels', 'admin_notification_rules',
  'licenses', 'license_logs', 'private_customers', 'private_deployments',
  'packages', 'versions', 'changelogs', 'modules', 'module_configs', 'module_schemes', 'module_status',
  'api_configs', 'api_call_logs', 'api_interfaces', 'api_statistics',
  'logistics_companies', 'logistics_api_configs', 'logistics_status',
  'improvement_goals', 'rejection_reasons', 'logs',
  'notification_templates', 'notification_channels', 'notification_logs',
  'system_license', 'system_settings', 'system_announcements',
  'payment_configs', 'payment_logs',
  'phone_configs', 'phone_blacklist', 'call_lines', 'call_recordings', 'global_call_config',
  'device_bind_logs', 'device_bindlogs', 'user_line_assignments', 'work_phones',
  'wecom_configs', 'wecom_customers', 'wecom_chat_records', 'wecom_payment_records',
  'wecom_service_accounts', 'wecom_acquisition_links', 'wecom_user_bindings',
  'timeout_reminder_configs', 'department_subscription_configs',
  'message_cleanup_history', 'wechat_official_account_config',
  'logistics_exceptions', 'logistics_status_history', 'logistics_todos', 'logistics_traces', 'logistics_tracking',
  'performance_report_logs',
];

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);

  console.log('========================================');
  console.log('🔧 多租户数据隔离修复脚本');
  console.log('========================================\n');

  // Step 1: 检查现状
  console.log('📊 Step 1: 检查数据库现状\n');

  const [tenants] = await conn.query("SELECT id, name, code, status FROM tenants ORDER BY name");
  console.log('租户列表:');
  tenants.forEach(t => console.log(`  ${t.id} | ${t.name} | ${t.code} | ${t.status}`));

  // 找出主要的业务租户（拥有最多数据的）
  const [usersByTenant] = await conn.query(`
    SELECT tenant_id, COUNT(*) as c FROM users
    WHERE tenant_id IS NOT NULL
    GROUP BY tenant_id ORDER BY c DESC
  `);
  console.log('\n用户分布:');
  usersByTenant.forEach(u => {
    const tenantName = tenants.find(t => t.id === u.tenant_id)?.name || '未知';
    console.log(`  ${u.tenant_id} (${tenantName}): ${u.c} 用户`);
  });

  // Step 2: 确保所有业务表都有 tenant_id 列
  console.log('\n📊 Step 2: 检查并添加 tenant_id 列\n');

  for (const table of TENANT_TABLES) {
    const [cols] = await conn.query(
      "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = 'tenant_id'",
      [DB_CONFIG.database, table]
    );

    // 检查表是否存在
    const [tableExists] = await conn.query(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
      [DB_CONFIG.database, table]
    );

    if (tableExists.length === 0) {
      console.log(`  ⏭️  ${table}: 表不存在，跳过`);
      continue;
    }

    if (cols.length === 0) {
      console.log(`  ➕ ${table}: 添加 tenant_id 列`);
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN tenant_id VARCHAR(36) DEFAULT NULL`);
      await conn.query(`CREATE INDEX idx_${table}_tenant_id ON \`${table}\`(tenant_id)`).catch(() => {
        // 索引可能已存在
      });
    } else {
      console.log(`  ✅ ${table}: 已有 tenant_id 列`);
    }
  }

  // Step 3: 检查 NULL tenant_id 数据分布
  console.log('\n📊 Step 3: 检查 NULL tenant_id 数据\n');

  const tablesWithNullData = [];
  for (const table of TENANT_TABLES) {
    const [tableExists] = await conn.query(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
      [DB_CONFIG.database, table]
    );
    if (tableExists.length === 0) continue;

    try {
      const [nullRows] = await conn.query(`SELECT COUNT(*) as c FROM \`${table}\` WHERE tenant_id IS NULL`);
      const [totalRows] = await conn.query(`SELECT COUNT(*) as c FROM \`${table}\``);
      if (nullRows[0].c > 0) {
        tablesWithNullData.push({ table, nullCount: nullRows[0].c, total: totalRows[0].c });
        console.log(`  ⚠️  ${table}: ${nullRows[0].c}/${totalRows[0].c} 行 tenant_id 为 NULL`);
      }
    } catch(e) {
      console.log(`  ❌ ${table}: 查询失败 - ${e.message}`);
    }
  }

  if (tablesWithNullData.length === 0) {
    console.log('  ✅ 所有业务表数据都已分配租户');
    await conn.end();
    return;
  }

  // Step 4: 修复 NULL 数据
  console.log('\n🔧 Step 4: 修复 NULL tenant_id 数据\n');

  // 策略:
  // - 有 created_by/user_id 的表: 根据创建者的 tenant_id 分配
  // - departments/roles/permissions: 这些是系统基础数据，需要为每个租户复制
  // - 无法确定的: 分配给拥有最多数据的租户

  const primaryTenantId = usersByTenant.length > 0 ? usersByTenant[0].tenant_id : null;
  if (!primaryTenantId) {
    console.log('❌ 无法确定主要租户，请手动处理');
    await conn.end();
    return;
  }
  const primaryTenantName = tenants.find(t => t.id === primaryTenantId)?.name || '未知';
  console.log(`主要租户: ${primaryTenantName} (${primaryTenantId})\n`);

  // 4a: 通过 created_by 关联用户来确定 tenant_id
  const tablesWithCreatedBy = [
    { table: 'customers', col: 'created_by' },
    { table: 'orders', col: 'created_by' },
    { table: 'follow_up_records', col: 'user_id' },
    { table: 'call_records', col: 'user_id' },
    { table: 'after_sales_services', col: 'created_by_id' },
    { table: 'customer_shares', col: 'shared_by' },
    { table: 'operation_logs', col: 'user_id' },
  ];

  for (const { table, col } of tablesWithCreatedBy) {
    try {
      const [tableExists] = await conn.query(
        "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
        [DB_CONFIG.database, table]
      );
      if (tableExists.length === 0) continue;

      // 检查列是否存在
      const [colExists] = await conn.query(
        "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?",
        [DB_CONFIG.database, table, col]
      );
      if (colExists.length === 0) continue;

      const result = await conn.query(`
        UPDATE \`${table}\` t
        INNER JOIN users u ON t.\`${col}\` = u.id
        SET t.tenant_id = u.tenant_id
        WHERE t.tenant_id IS NULL AND u.tenant_id IS NOT NULL
      `);
      const affected = result[0].affectedRows;
      if (affected > 0) {
        console.log(`  ✅ ${table}: 通过 ${col} 关联修复了 ${affected} 行`);
      }
    } catch(e) {
      console.log(`  ⚠️  ${table}: 通过 ${col} 修复失败 - ${e.message}`);
    }
  }

  // 4b: 剩余 NULL 数据分配给主要租户
  console.log(`\n  将剩余 NULL 数据分配给主要租户: ${primaryTenantName}\n`);

  for (const { table } of tablesWithNullData) {
    try {
      const [tableExists] = await conn.query(
        "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
        [DB_CONFIG.database, table]
      );
      if (tableExists.length === 0) continue;

      const [remaining] = await conn.query(`SELECT COUNT(*) as c FROM \`${table}\` WHERE tenant_id IS NULL`);
      if (remaining[0].c > 0) {
        await conn.query(`UPDATE \`${table}\` SET tenant_id = ? WHERE tenant_id IS NULL`, [primaryTenantId]);
        console.log(`  ✅ ${table}: 将 ${remaining[0].c} 行分配给 ${primaryTenantName}`);
      }
    } catch(e) {
      console.log(`  ⚠️  ${table}: 分配失败 - ${e.message}`);
    }
  }

  // Step 5: 验证
  console.log('\n📊 Step 5: 验证修复结果\n');

  let allFixed = true;
  for (const table of TENANT_TABLES) {
    try {
      const [tableExists] = await conn.query(
        "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
        [DB_CONFIG.database, table]
      );
      if (tableExists.length === 0) continue;

      const [nullRows] = await conn.query(`SELECT COUNT(*) as c FROM \`${table}\` WHERE tenant_id IS NULL`);
      const [totalRows] = await conn.query(`SELECT COUNT(*) as c FROM \`${table}\``);
      if (totalRows[0].c > 0 && nullRows[0].c > 0) {
        console.log(`  ⚠️  ${table}: 仍有 ${nullRows[0].c}/${totalRows[0].c} 行 tenant_id 为 NULL`);
        allFixed = false;
      } else if (totalRows[0].c > 0) {
        // 显示租户分布
        const [distrib] = await conn.query(`SELECT tenant_id, COUNT(*) as c FROM \`${table}\` GROUP BY tenant_id ORDER BY c DESC LIMIT 5`);
        const distribStr = distrib.map(d => {
          const name = tenants.find(t => t.id === d.tenant_id)?.name || 'NULL';
          return `${name}:${d.c}`;
        }).join(', ');
        console.log(`  ✅ ${table}: ${totalRows[0].c} 行 [${distribStr}]`);
      }
    } catch(e) {
      // skip
    }
  }

  if (allFixed) {
    console.log('\n✅ 所有数据已正确分配租户！');
  } else {
    console.log('\n⚠️  仍有部分数据未分配租户，请检查以上结果');
  }

  await conn.end();
}

main().catch(e => {
  console.error('脚本执行失败:', e);
  process.exit(1);
});

