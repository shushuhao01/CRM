/**
 * 检查授权管理表是否存在
 * 用途: 验证licenses和license_logs表是否已创建
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkLicensesTables() {
  console.log('🔍 检查授权管理表...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  });

  try {
    // 检查licenses表
    console.log('1. 检查licenses表:');
    const [licensesExists] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'licenses'
    `);

    if (licensesExists[0].count > 0) {
      console.log('   ✅ licenses表已存在');

      // 获取字段信息
      const [licensesColumns] = await connection.query(`
        SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY, COLUMN_COMMENT
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'licenses'
        ORDER BY ORDINAL_POSITION
      `);

      console.log(`   📊 字段数量: ${licensesColumns.length}`);
      console.log('   📋 主要字段:');
      licensesColumns.slice(0, 10).forEach(col => {
        const key = col.COLUMN_KEY === 'PRI' ? ' [PK]' : col.COLUMN_KEY === 'UNI' ? ' [UNIQUE]' : '';
        console.log(`      - ${col.COLUMN_NAME} (${col.DATA_TYPE})${key}`);
      });

      // 获取索引信息
      const [licensesIndexes] = await connection.query(`
        SHOW INDEX FROM licenses
      `);
      console.log(`   🔑 索引数量: ${new Set(licensesIndexes.map(i => i.Key_name)).size}`);

      // 获取记录数
      const [licensesCount] = await connection.query('SELECT COUNT(*) as count FROM licenses');
      console.log(`   📈 记录数量: ${licensesCount[0].count}\n`);
    } else {
      console.log('   ❌ licenses表不存在\n');
    }

    // 检查license_logs表
    console.log('2. 检查license_logs表:');
    const [logsExists] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'license_logs'
    `);

    if (logsExists[0].count > 0) {
      console.log('   ✅ license_logs表已存在');

      // 获取字段信息
      const [logsColumns] = await connection.query(`
        SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY, COLUMN_COMMENT
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'license_logs'
        ORDER BY ORDINAL_POSITION
      `);

      console.log(`   📊 字段数量: ${logsColumns.length}`);
      console.log('   📋 主要字段:');
      logsColumns.forEach(col => {
        const key = col.COLUMN_KEY === 'PRI' ? ' [PK]' : '';
        console.log(`      - ${col.COLUMN_NAME} (${col.DATA_TYPE})${key}`);
      });

      // 获取索引信息
      const [logsIndexes] = await connection.query(`
        SHOW INDEX FROM license_logs
      `);
      console.log(`   🔑 索引数量: ${new Set(logsIndexes.map(i => i.Key_name)).size}`);

      // 获取记录数
      const [logsCount] = await connection.query('SELECT COUNT(*) as count FROM license_logs');
      console.log(`   📈 记录数量: ${logsCount[0].count}\n`);
    } else {
      console.log('   ❌ license_logs表不存在\n');
    }

    // 总结
    console.log('📊 检查总结:');
    const licensesOk = licensesExists[0].count > 0;
    const logsOk = logsExists[0].count > 0;

    if (licensesOk && logsOk) {
      console.log('✅ 所有授权管理表都已创建');
      console.log('✅ 可以开始API开发');
    } else {
      console.log('⚠️  部分表缺失，需要执行迁移脚本:');
      if (!licensesOk) console.log('   - licenses表');
      if (!logsOk) console.log('   - license_logs表');
      console.log('\n执行命令: mysql -u root -p crm_local < backend/database-migrations/create-licenses-tables.sql');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

// 执行检查
checkLicensesTables().catch(console.error);
