/**
 * 执行模块管理表创建迁移
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function executeMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local',
    multipleStatements: true
  });

  try {
    console.log('开始执行模块管理表创建迁移...\n');

    const sqlFile = path.join(__dirname, 'database-migrations/create-modules-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    await connection.query(sql);
    console.log('✅ 模块管理表创建成功');

    // 验证表是否创建成功
    const [modules] = await connection.query('SELECT COUNT(*) as count FROM modules');
    const [configs] = await connection.query('SELECT COUNT(*) as count FROM module_configs');

    console.log(`\n📊 数据统计:`);
    console.log(`   - modules表: ${modules[0].count} 条记录`);
    console.log(`   - module_configs表: ${configs[0].count} 条记录`);

    console.log('\n✅ 迁移执行完成！');
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

executeMigration().catch(console.error);
