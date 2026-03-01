const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function executeMigration() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'abc789',
      password: 'YtZWJPF2bpsCscHX',
      database: 'crm_local',
      multipleStatements: true
    });

    console.log('✅ 数据库连接成功\n');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'database-migrations', 'production-baota-simple-v2.sql');
    let sql = fs.readFileSync(sqlFile, 'utf8');

    // 移除注释和USE语句
    sql = sql.replace(/^--.*$/gm, ''); // 移除单行注释
    sql = sql.replace(/USE\s+\w+;/gi, ''); // 移除USE语句
    sql = sql.trim();

    console.log('📄 开始执行SQL迁移脚本...\n');

    // 执行SQL
    const [results] = await conn.query(sql);

    console.log('✅ SQL执行成功\n');

    // 验证表创建
    const [tables1] = await conn.query("SHOW TABLES LIKE '%value_added%'");
    console.log('📊 增值管理相关表:');
    tables1.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`  ✓ ${tableName}`);
    });

    const [tables2] = await conn.query("SHOW TABLES LIKE 'outsource_companies'");
    console.log('\n📊 外包公司表:');
    tables2.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`  ✓ ${tableName}`);
    });

    // 检查数据
    console.log('\n📈 数据统计:');

    const [configs] = await conn.query('SELECT COUNT(*) as count FROM value_added_price_config');
    console.log(`  ✓ 费用配置: ${configs[0].count} 条`);

    const [statusConfigs] = await conn.query('SELECT COUNT(*) as count FROM value_added_status_configs');
    console.log(`  ✓ 状态配置: ${statusConfigs[0].count} 条`);

    const [orders] = await conn.query('SELECT COUNT(*) as count FROM value_added_orders');
    console.log(`  ✓ 增值订单: ${orders[0].count} 条`);

    const [companies] = await conn.query('SELECT COUNT(*) as count FROM outsource_companies');
    console.log(`  ✓ 外包公司: ${companies[0].count} 条`);

    console.log('\n🎉 本地数据库迁移完成！');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error(error);
  } finally {
    if (conn) await conn.end();
  }
}

executeMigration();
