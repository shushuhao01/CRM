/**
 * 执行第四阶段数据库迁移
 *
 * 包括：
 * 1. 创建 tenant_logs 表
 * 2. 添加性能优化索引
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function executeMigrations() {
  let connection;

  try {
    console.log('\n🚀 开始执行第四阶段数据库迁移');
    console.log('='.repeat(50));

    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm_local',
      multipleStatements: true
    });

    console.log('✅ 数据库连接成功');
    console.log(`   数据库: ${process.env.DB_DATABASE || 'crm_local'}`);

    // 1. 创建 tenant_logs 表
    console.log('\n📝 步骤 1: 创建 tenant_logs 表');
    console.log('-'.repeat(50));

    const createTableSQL = fs.readFileSync(
      path.join(__dirname, 'database-migrations/create-tenant-logs-table.sql'),
      'utf-8'
    );

    await connection.query(createTableSQL);
    console.log('✅ tenant_logs 表创建成功');

    // 2. 添加性能优化索引
    console.log('\n📝 步骤 2: 添加性能优化索引');
    console.log('-'.repeat(50));

    // 定义要添加的索引
    const indexes = [
      { table: 'tenants', name: 'idx_status_license', columns: '`status`, `license_status`' },
      { table: 'tenants', name: 'idx_expire_date', columns: '`expire_date`' },
      { table: 'tenants', name: 'idx_created_at', columns: '`created_at`' },
      { table: 'users', name: 'idx_tenant_status', columns: '`tenant_id`, `status`' },
      { table: 'customers', name: 'idx_tenant_created', columns: '`tenant_id`, `created_at`' },
      { table: 'orders', name: 'idx_tenant_status', columns: '`tenant_id`, `status`' },
      { table: 'orders', name: 'idx_tenant_created', columns: '`tenant_id`, `created_at`' },
      { table: 'products', name: 'idx_tenant_status', columns: '`tenant_id`, `status`' },
      { table: 'tenant_settings', name: 'idx_tenant_key', columns: '`tenant_id`, `key`' }
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const index of indexes) {
      try {
        // 检查索引是否已存在
        const [existing] = await connection.query(`
          SELECT COUNT(*) as count
          FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND INDEX_NAME = ?
        `, [index.table, index.name]);

        if (existing[0].count > 0) {
          console.log(`⏭️  跳过已存在的索引: ${index.table}.${index.name}`);
          skippedCount++;
          continue;
        }

        // 添加索引
        await connection.query(`
          ALTER TABLE \`${index.table}\`
          ADD INDEX \`${index.name}\` (${index.columns})
        `);
        console.log(`✅ 添加索引: ${index.table}.${index.name}`);
        addedCount++;
      } catch (error) {
        console.log(`⚠️  索引添加失败: ${index.table}.${index.name} - ${error.message}`);
      }
    }

    console.log(`\n索引添加完成: ${addedCount} 个新增, ${skippedCount} 个跳过`);

    // 分析表
    console.log('\n📝 步骤 3: 分析表以更新统计信息');
    console.log('-'.repeat(50));
    const tablesToAnalyze = ['tenants', 'users', 'customers', 'orders', 'products', 'tenant_settings', 'tenant_logs'];
    for (const tableName of tablesToAnalyze) {
      try {
        await connection.query(`ANALYZE TABLE \`${tableName}\``);
        console.log(`✅ 分析表: ${tableName}`);
      } catch (error) {
        console.log(`⚠️  分析表失败: ${tableName}`);
      }
    }

    // 4. 验证表是否创建成功
    console.log('\n📝 步骤 4: 验证表结构');
    console.log('-'.repeat(50));

    const [tableCheck] = await connection.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tenant_logs'
    `);

    if (tableCheck.length > 0) {
      console.log('✅ tenant_logs 表验证成功');

      // 查看表结构
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM tenant_logs
      `);

      console.log('\n表结构:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });

      // 查看索引
      const [indexList] = await connection.query(`
        SHOW INDEX FROM tenant_logs
      `);

      console.log('\n索引:');
      const uniqueIndexes = [...new Set(indexList.map(idx => idx.Key_name))];
      uniqueIndexes.forEach(idx => {
        console.log(`  - ${idx}`);
      });
    } else {
      console.log('❌ tenant_logs 表验证失败');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ 第四阶段数据库迁移完成！');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行迁移
executeMigrations();
