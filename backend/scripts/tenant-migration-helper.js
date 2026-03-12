/**
 * 多租户迁移辅助脚本
 * 用于验证数据库迁移结果
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.development' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crm_dev',
  charset: 'utf8mb4'
};

async function checkTenantIdFields() {
  console.log('\n=== 检查 tenant_id 字段 ===\n');

  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute(`
      SELECT
        TABLE_NAME,
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND COLUMN_NAME = 'tenant_id'
      ORDER BY TABLE_NAME
    `, [dbConfig.database]);

    console.log(`✅ 找到 ${rows.length} 个表包含 tenant_id 字段：\n`);

    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.TABLE_NAME}`);
      console.log(`   类型: ${row.COLUMN_TYPE}`);
      console.log(`   允许NULL: ${row.IS_NULLABLE}`);
      console.log(`   注释: ${row.COLUMN_COMMENT}`);
      console.log('');
    });

    // 检查是否有32个业务表
    if (rows.length >= 32) {
      console.log('✅ 所有业务表已成功添加 tenant_id 字段！\n');
    } else {
      console.log(`⚠️  预期32个业务表，实际找到 ${rows.length} 个\n`);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

async function checkTenantTables() {
  console.log('\n=== 检查租户相关表 ===\n');

  const connection = await mysql.createConnection(dbConfig);

  try {
    // 检查 tenants 表
    const [tenants] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenants'
    `, [dbConfig.database]);

    if (tenants[0].count > 0) {
      console.log('✅ tenants 表已创建');
    } else {
      console.log('❌ tenants 表不存在');
    }

    // 检查 tenant_settings 表
    const [settings] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenant_settings'
    `, [dbConfig.database]);

    if (settings[0].count > 0) {
      console.log('✅ tenant_settings 表已创建');
    } else {
      console.log('❌ tenant_settings 表不存在');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

async function checkIndexes() {
  console.log('\n=== 检查索引 ===\n');

  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute(`
      SELECT
        TABLE_NAME,
        INDEX_NAME,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND COLUMN_NAME = 'tenant_id'
      GROUP BY TABLE_NAME, INDEX_NAME
      ORDER BY TABLE_NAME, INDEX_NAME
    `, [dbConfig.database]);

    console.log(`✅ 找到 ${rows.length} 个包含 tenant_id 的索引：\n`);

    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.TABLE_NAME}.${row.INDEX_NAME}`);
      console.log(`   列: ${row.COLUMNS}\n`);
    });

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

async function testQuery() {
  console.log('\n=== 测试查询功能 ===\n');

  const connection = await mysql.createConnection(dbConfig);

  try {
    // 测试查询用户
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`✅ 用户表查询成功，共 ${users[0].count} 条记录`);

    // 测试查询客户
    const [customers] = await connection.execute('SELECT COUNT(*) as count FROM customers');
    console.log(`✅ 客户表查询成功，共 ${customers[0].count} 条记录`);

    // 测试查询订单
    const [orders] = await connection.execute('SELECT COUNT(*) as count FROM orders');
    console.log(`✅ 订单表查询成功，共 ${orders[0].count} 条记录`);

    console.log('\n✅ 所有查询功能正常！\n');

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  } finally {
    await connection.end();
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   多租户数据库迁移验证工具                ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log(`数据库: ${dbConfig.database}`);
  console.log(`主机: ${dbConfig.host}`);
  console.log(`用户: ${dbConfig.user}\n`);

  try {
    await checkTenantTables();
    await checkTenantIdFields();
    await checkIndexes();
    await testQuery();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   ✅ 数据库迁移验证完成！                 ║');
    console.log('╚════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ 验证过程出错:', error.message);
    process.exit(1);
  }
}

main();
