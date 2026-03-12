/**
 * 执行套餐表迁移脚本
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
    const sqlFile = path.join(__dirname, 'database-migrations', 'create-packages-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('正在执行迁移脚本...');

    // 执行SQL
    await connection.query(sql);

    console.log('✓ 套餐表创建成功');

    // 验证数据
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM packages');
    console.log(`✓ 已插入 ${rows[0].count} 条默认套餐数据`);

    // 显示套餐列表
    const [packages] = await connection.query('SELECT id, name, code, type, price, billing_cycle FROM packages ORDER BY type, sort_order');
    console.log('\n套餐列表:');
    packages.forEach(pkg => {
      console.log(`  - ${pkg.name} (${pkg.code}) - ${pkg.type} - ¥${pkg.price}/${pkg.billing_cycle}`);
    });

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
