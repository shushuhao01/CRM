const mysql = require('mysql2/promise');

async function checkModulesDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('========== 检查模块数据库 ==========\n');

    // 1. 检查 modules 表
    console.log('1. 检查 modules 表:');
    const [modules] = await connection.query('SELECT * FROM modules ORDER BY id');
    console.log(`找到 ${modules.length} 个模块:\n`);
    modules.forEach(m => {
      console.log(`  - ${m.name} (${m.code})`);
      console.log(`    状态: ${m.status}`);
      console.log(`    是否系统模块: ${m.is_system}`);
      console.log(`    排序: ${m.sort_order}`);
      console.log('');
    });

    // 2. 检查 module_configs 表
    console.log('\n2. 检查 module_configs 表:');
    const [configs] = await connection.query('SELECT * FROM module_configs ORDER BY id');
    console.log(`找到 ${configs.length} 个配置:\n`);
    configs.forEach(c => {
      console.log(`  - ${c.module_name} (${c.module_key})`);
      console.log(`    是否启用: ${c.is_enabled}`);
      console.log(`    是否系统模块: ${c.is_system}`);
      console.log('');
    });

    // 3. 统计启用的模块
    console.log('\n3. 统计启用的模块:');
    const [enabledModules] = await connection.query(
      "SELECT code FROM modules WHERE status = 'enabled'"
    );
    console.log(`启用的模块 (${enabledModules.length}个):`);
    enabledModules.forEach(m => console.log(`  - ${m.code}`));

    // 4. 统计禁用的模块
    console.log('\n4. 统计禁用的模块:');
    const [disabledModules] = await connection.query(
      "SELECT code, name FROM modules WHERE status = 'disabled'"
    );
    console.log(`禁用的模块 (${disabledModules.length}个):`);
    disabledModules.forEach(m => console.log(`  - ${m.code} (${m.name})`));

    console.log('\n========== 检查完成 ==========');

  } catch (error) {
    console.error('检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkModulesDatabase();
