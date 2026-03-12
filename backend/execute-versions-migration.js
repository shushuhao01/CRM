/**
 * 执行版本管理表迁移脚本
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
const mysql = require('mysql2/promise');
const fs = require('fs');

async function executeMigration() {
  let connection;

  try {
    console.log('正在连接数据库...');
    console.log(`数据库: ${process.env.DB_DATABASE || 'crm'}`);
    console.log(`主机: ${process.env.DB_HOST || 'localhost'}`);

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm',
      multipleStatements: true
    });

    console.log('✓ 数据库连接成功\n');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'database-migrations', 'improve-versions-and-changelogs.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('正在执行迁移脚本...');

    // 执行SQL
    await connection.query(sql);

    console.log('✓ 版本管理表完善成功');
    console.log('✓ 更新日志表创建成功');

    // 验证表结构
    const [versionColumns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'versions'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\nversions表字段:');
    versionColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.COLUMN_COMMENT})`);
    });

    const [changelogColumns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'changelogs'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\nchangelogs表字段:');
    changelogColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.COLUMN_COMMENT})`);
    });

    // 检查数据
    const [versionCount] = await connection.query('SELECT COUNT(*) as count FROM versions');
    console.log(`\n✓ versions表共有 ${versionCount[0].count} 条记录`);

    console.log('\n✅ 迁移完成！');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

executeMigration();
