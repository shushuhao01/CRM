/**
 * 执行价格档位系统迁移
 * 本地开发环境：crm_local
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
  host: 'localhost',
  user: 'abc789',
  password: 'YtZWJPF2bpsCscHX',
  database: 'crm_local',
  multipleStatements: true
};

async function executeSql() {
  let connection;

  try {
    console.log('🔌 连接数据库...');
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功\n');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'database-migrations', 'create-price-tier-system.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 执行价格档位系统迁移...\n');

    // 执行SQL
    const [results] = await connection.query(sql);

    console.log('✅ SQL执行成功\n');

    // 显示结果
    if (Array.isArray(results)) {
      results.forEach((result, index) => {
        if (Array.isArray(result) && result.length > 0) {
          console.log(`\n结果集 ${index + 1}:`);
          console.table(result);
        }
      });
    }

    console.log('\n✅ 价格档位系统迁移完成！');

  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

executeSql();
