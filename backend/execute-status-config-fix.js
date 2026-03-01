/**
 * 执行状态配置修复SQL
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
    const sqlFile = path.join(__dirname, 'database-migrations', 'fix-status-configs-safe.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 执行SQL脚本...\n');

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

    // 验证最终结果
    console.log('\n📊 验证状态配置：\n');

    const [validStatus] = await connection.query(
      'SELECT type, value, label, sort_order FROM value_added_status_configs WHERE type = "validStatus" ORDER BY sort_order'
    );
    console.log('有效状态配置:');
    console.table(validStatus);

    const [settlementStatus] = await connection.query(
      'SELECT type, value, label, sort_order FROM value_added_status_configs WHERE type = "settlementStatus" ORDER BY sort_order'
    );
    console.log('\n结算状态配置:');
    console.table(settlementStatus);

    console.log('\n✅ 所有操作完成！');

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
