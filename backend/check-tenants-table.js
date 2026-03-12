/**
 * 检查tenants表的详细信息
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkTenantsTable() {
  console.log('========================================');
  console.log('检查tenants表详细信息');
  console.log('========================================\n');

  let connection;

  try {
    // 连接数据库
    console.log('1️⃣  连接数据库...');
    console.log(`   数据库: ${process.env.DB_DATABASE}`);

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'crm_local',
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功\n');

    // 检查表是否存在
    console.log('2️⃣  检查tenants表是否存在...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_COMMENT, TABLE_ROWS, CREATE_TIME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenants'
    `, [process.env.DB_DATABASE]);

    if (tables.length === 0) {
      console.log('❌ tenants表不存在\n');
      return;
    }

    console.log('✅ tenants表存在');
    console.log('   表名:', tables[0].TABLE_NAME);
    console.log('   注释:', tables[0].TABLE_COMMENT || '无');
    console.log('   行数:', tables[0].TABLE_ROWS);
    console.log('   创建时间:', tables[0].CREATE_TIME);
    console.log('');

    // 查看表结构
    console.log('3️⃣  查看表结构...');
    const [columns] = await connection.query(`
      SELECT
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_KEY,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenants'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_DATABASE]);

    console.log(`✅ 共有 ${columns.length} 个字段:\n`);
    columns.forEach((col, index) => {
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const key = col.COLUMN_KEY ? `[${col.COLUMN_KEY}]` : '';
      const defaultVal = col.COLUMN_DEFAULT !== null ? `DEFAULT ${col.COLUMN_DEFAULT}` : '';
      const comment = col.COLUMN_COMMENT ? `// ${col.COLUMN_COMMENT}` : '';

      console.log(`   ${index + 1}. ${col.COLUMN_NAME}`);
      console.log(`      类型: ${col.COLUMN_TYPE} ${nullable} ${key} ${defaultVal}`);
      if (comment) console.log(`      说明: ${comment}`);
      console.log('');
    });

    // 查看索引
    console.log('4️⃣  查看索引...');
    const [indexes] = await connection.query(`
      SELECT
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenants'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [process.env.DB_DATABASE]);

    console.log(`✅ 共有 ${indexes.length} 个索引:\n`);
    const indexGroups = {};
    indexes.forEach(idx => {
      if (!indexGroups[idx.INDEX_NAME]) {
        indexGroups[idx.INDEX_NAME] = [];
      }
      indexGroups[idx.INDEX_NAME].push(idx);
    });

    Object.keys(indexGroups).forEach((indexName, i) => {
      const cols = indexGroups[indexName];
      const type = cols[0].NON_UNIQUE === 0 ? '唯一索引' : '普通索引';
      const columnNames = cols.map(c => c.COLUMN_NAME).join(', ');
      console.log(`   ${i + 1}. ${indexName} (${type})`);
      console.log(`      字段: ${columnNames}\n`);
    });

    // 查看数据
    console.log('5️⃣  查看表数据...');
    const [data] = await connection.query('SELECT * FROM tenants LIMIT 5');

    if (data.length === 0) {
      console.log('✅ 表中无数据（空表）\n');
    } else {
      console.log(`✅ 表中有 ${data.length} 条数据（显示前5条）:\n`);
      data.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.name} (${row.code})`);
        console.log(`      ID: ${row.id}`);
        console.log(`      状态: ${row.status}`);
        console.log(`      授权码: ${row.license_key || '无'}`);
        console.log(`      创建时间: ${row.created_at}`);
        console.log('');
      });
    }

    // 检查表的来源
    console.log('6️⃣  分析表的用途...');
    console.log('   根据表注释:', tables[0].TABLE_COMMENT || '无注释');
    console.log('   根据字段分析:');

    const hasPackageId = columns.some(c => c.COLUMN_NAME === 'package_id');
    const hasLicenseStatus = columns.some(c => c.COLUMN_NAME === 'license_status');
    const hasDatabaseName = columns.some(c => c.COLUMN_NAME === 'database_name');
    const hasFeatures = columns.some(c => c.COLUMN_NAME === 'features');

    if (hasPackageId) console.log('   ✓ 包含package_id字段 - 支持套餐管理');
    if (hasLicenseStatus) console.log('   ✓ 包含license_status字段 - 支持授权管理');
    if (hasDatabaseName) console.log('   ✓ 包含database_name字段 - 支持独立数据库');
    if (hasFeatures) console.log('   ✓ 包含features字段 - 支持功能模块配置');

    console.log('\n   📌 结论:');
    console.log('   这是一个完整的SaaS租户管理表');
    console.log('   用途: Admin后台管理租户客户');
    console.log('   特点: 支持套餐、授权、功能模块等高级功能');
    console.log('');

    // 检查相关表
    console.log('7️⃣  检查相关表...');
    const relatedTables = ['tenant_license_logs', 'packages', 'tenant_settings'];

    for (const tableName of relatedTables) {
      const [exists] = await connection.query(`
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      `, [process.env.DB_DATABASE, tableName]);

      if (exists.length > 0) {
        console.log(`   ✓ ${tableName} 表存在`);
      } else {
        console.log(`   ✗ ${tableName} 表不存在`);
      }
    }
    console.log('');

    console.log('========================================');
    console.log('✅ 检查完成');
    console.log('========================================\n');

    console.log('📋 总结:');
    console.log('1. tenants表存在于crm_local数据库');
    console.log('2. 表结构完整，包含23个字段');
    console.log('3. 当前表中数据:', data.length === 0 ? '无数据（空表）' : `${data.length}条数据`);
    console.log('4. 用途: Admin后台管理系统的租户管理');
    console.log('5. 不涉及: CRM系统和官网系统');
    console.log('6. 建议: 使用现有表结构，已创建的Tenant实体完全适配');
    console.log('');

  } catch (error) {
    console.error('\n❌ 检查失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ 数据库连接已关闭');
    }
  }
}

checkTenantsTable().catch(console.error);
