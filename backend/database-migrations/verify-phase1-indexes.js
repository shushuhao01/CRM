/**
 * 数据库索引优化验证脚本
 *
 * 用途：在执行SQL迁移脚本后，验证索引是否已正确创建
 * 执行方式：node backend/database-migrations/verify-phase1-indexes.js
 *
 * 日期：2026-03-30
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// 如果.env.local不存在，尝试加载.env
if (!process.env.DB_HOST) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

async function verify() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm'
  });

  console.log('🔍 开始验证第一阶段索引优化结果...\n');

  // 1. 验证tenant_id列是否存在
  console.log('=== 验证 tenant_id 列 ===');
  const requiredTables = [
    'customers', 'orders', 'products', 'product_categories', 'departments',
    'roles', 'customer_tags', 'customer_groups', 'customer_shares',
    'follow_up_records', 'call_records', 'after_sales_services', 'service_records',
    'logistics', 'performance_records', 'operation_logs', 'data_records',
    'notifications', 'sms_records', 'sms_templates', 'messages',
    'order_items', 'order_status_history', 'performance_metrics'
  ];

  let columnOk = 0;
  let columnMissing = 0;

  for (const table of requiredTables) {
    try {
      const [rows] = await connection.execute(
        `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'tenant_id'`,
        [table]
      );
      if (rows[0].cnt > 0) {
        columnOk++;
      } else {
        columnMissing++;
        console.log(`  ❌ ${table} - 缺少 tenant_id 列`);
      }
    } catch (e) {
      console.log(`  ⚠️ ${table} - 表可能不存在: ${e.message}`);
    }
  }
  console.log(`  ✅ ${columnOk}/${requiredTables.length} 张表已有 tenant_id 列`);
  if (columnMissing > 0) {
    console.log(`  ❌ ${columnMissing} 张表缺少 tenant_id 列`);
  }

  // 2. 验证索引是否存在
  console.log('\n=== 验证 tenant_id 相关索引 ===');
  const [indexes] = await connection.execute(
    `SELECT TABLE_NAME, INDEX_NAME,
            GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS,
            NON_UNIQUE
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND INDEX_NAME LIKE '%tenant%'
     GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
     ORDER BY TABLE_NAME, INDEX_NAME`
  );

  console.log(`  共找到 ${indexes.length} 个 tenant 相关索引：`);
  for (const idx of indexes) {
    const type = idx.NON_UNIQUE === 0 ? 'UNIQUE' : 'INDEX';
    console.log(`  ✅ ${idx.TABLE_NAME}.${idx.INDEX_NAME} (${idx.COLUMNS}) [${type}]`);
  }

  // 3. 验证唯一索引修复
  console.log('\n=== 验证唯一索引修复 ===');

  // 检查customer_code唯一索引
  const [custUq] = await connection.execute(
    `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS, NON_UNIQUE
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers'
       AND INDEX_NAME LIKE '%customer_code%'
     GROUP BY INDEX_NAME, NON_UNIQUE`
  );
  if (custUq.length > 0) {
    for (const idx of custUq) {
      const type = idx.NON_UNIQUE === 0 ? 'UNIQUE' : 'INDEX';
      console.log(`  ${idx.COLUMNS.includes('tenant_id') ? '✅' : '❌'} customers.${idx.INDEX_NAME} (${idx.COLUMNS}) [${type}]`);
    }
  } else {
    console.log('  ⚠️ customers 表未找到 customer_code 相关索引');
  }

  // 检查order_number唯一索引
  const [ordUq] = await connection.execute(
    `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS, NON_UNIQUE
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
       AND INDEX_NAME LIKE '%order_number%'
     GROUP BY INDEX_NAME, NON_UNIQUE`
  );
  if (ordUq.length > 0) {
    for (const idx of ordUq) {
      const type = idx.NON_UNIQUE === 0 ? 'UNIQUE' : 'INDEX';
      console.log(`  ${idx.COLUMNS.includes('tenant_id') ? '✅' : '❌'} orders.${idx.INDEX_NAME} (${idx.COLUMNS}) [${type}]`);
    }
  } else {
    console.log('  ⚠️ orders 表未找到 order_number 相关索引');
  }

  // 4. 统计每张表索引数量
  console.log('\n=== 各表索引数量统计 ===');
  const [stats] = await connection.execute(
    `SELECT TABLE_NAME, COUNT(DISTINCT INDEX_NAME) as idx_count
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${requiredTables.map(t => `'${t}'`).join(',')}, 'users')
     GROUP BY TABLE_NAME
     ORDER BY idx_count DESC`
  );

  for (const row of stats) {
    const flag = row.idx_count > 20 ? '⚠️' : '✅';
    console.log(`  ${flag} ${row.TABLE_NAME}: ${row.idx_count} 个索引`);
  }

  // 5. 检查连接池配置
  console.log('\n=== 数据库连接池配置 ===');
  const [variables] = await connection.execute(
    `SHOW VARIABLES LIKE 'max_connections'`
  );
  for (const v of variables) {
    console.log(`  📊 ${v.Variable_name}: ${v.Value}`);
  }

  console.log('\n🏁 验证完成！');
  await connection.end();
}

verify().catch(err => {
  console.error('❌ 验证失败:', err.message);
  process.exit(1);
});

