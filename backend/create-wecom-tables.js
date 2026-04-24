/**
 * 创建企微管理模块数据库表
 * 用法: cd backend && node create-wecom-tables.js
 * 日期: 2026-04-10
 */
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// 加载环境变量
const dotenv = require('dotenv');
const envLocalPath = path.join(__dirname, '.env.local');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('使用 .env.local 配置');
} else {
  dotenv.config({ path: envPath });
  console.log('使用 .env 配置');
}

async function main() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm',
    charset: 'utf8mb4',
    multipleStatements: true
  };

  console.log(`\n连接数据库: ${config.host}:${config.port}/${config.database}`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功\n');

    // 读取 SQL 文件
    const sqlPath = path.join(__dirname, '..', 'database', 'migration-wecom-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // 按分号分割并逐条执行（跳过空语句和注释）
    const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));

    let created = 0;
    let skipped = 0;

    for (const stmt of statements) {
      if (!stmt || stmt.length < 10) continue;

      try {
        const [result] = await connection.execute(stmt);

        if (stmt.includes('CREATE TABLE')) {
          const tableName = stmt.match(/`(\w+)`/)?.[1] || '未知';
          if (result.warningStatus === 0) {
            console.log(`  ✅ 创建表: ${tableName}`);
            created++;
          } else {
            console.log(`  ⏭️  表已存在: ${tableName}`);
            skipped++;
          }
        } else if (stmt.includes('SELECT TABLE_NAME')) {
          // 验证查询
          const [rows] = await connection.execute(stmt);
          console.log(`\n📊 验证结果: 找到 ${rows.length} 张 wecom 表`);
          rows.forEach(row => {
            console.log(`  - ${row.TABLE_NAME} (${row.TABLE_COMMENT})`);
          });
        }
      } catch (err) {
        // 忽略某些预期错误
        if (err.code === 'ER_TABLE_EXISTS_ERROR') {
          const tableName = stmt.match(/`(\w+)`/)?.[1] || '未知';
          console.log(`  ⏭️  表已存在: ${tableName}`);
          skipped++;
        } else {
          console.error(`  ❌ 执行失败: ${err.message}`);
          console.error(`  SQL: ${stmt.substring(0, 100)}...`);
        }
      }
    }

    console.log(`\n========================================`);
    console.log(`✅ 企微管理模块建表完成`);
    console.log(`   新建: ${created} 张表`);
    console.log(`   已存在: ${skipped} 张表`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('❌ 执行失败:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main();

