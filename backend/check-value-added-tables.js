const mysql = require('mysql2/promise');

async function checkTables() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: 'localhost',
      user: 'abc789',
      password: 'YtZWJPF2bpsCscHX',
      database: 'crm_local'
    });

    console.log('✅ 数据库连接成功\n');

    // 检查增值管理相关表
    const [tables1] = await conn.query("SHOW TABLES LIKE '%value_added%'");
    console.log('📊 增值管理相关表:');
    tables1.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`  - ${tableName}`);
    });

    // 检查外包公司表
    const [tables2] = await conn.query("SHOW TABLES LIKE 'outsource_companies'");
    console.log('\n📊 外包公司表:');
    tables2.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`  - ${tableName}`);
    });

    // 检查数据
    console.log('\n📈 数据统计:');

    try {
      const [configs] = await conn.query('SELECT COUNT(*) as count FROM value_added_price_config');
      console.log(`  - 费用配置: ${configs[0].count} 条`);
    } catch (e) {
      console.log('  - 费用配置表不存在');
    }

    try {
      const [statusConfigs] = await conn.query('SELECT COUNT(*) as count FROM value_added_status_configs');
      console.log(`  - 状态配置: ${statusConfigs[0].count} 条`);
    } catch (e) {
      console.log('  - 状态配置表不存在');
    }

    try {
      const [orders] = await conn.query('SELECT COUNT(*) as count FROM value_added_orders');
      console.log(`  - 增值订单: ${orders[0].count} 条`);
    } catch (e) {
      console.log('  - 增值订单表不存在');
    }

    try {
      const [companies] = await conn.query('SELECT COUNT(*) as count FROM outsource_companies');
      console.log(`  - 外包公司: ${companies[0].count} 条`);
    } catch (e) {
      console.log('  - 外包公司表不存在');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    if (conn) await conn.end();
  }
}

checkTables();
