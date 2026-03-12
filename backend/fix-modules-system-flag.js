const mysql = require('mysql2/promise');

async function fix() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  console.log('修复模块系统标记...\n');

  // 只有system_management是系统模块，其他都不是
  await conn.execute(`
    UPDATE modules
    SET is_system = 0
    WHERE code != 'system_management'
  `);

  console.log('✅ 已将非系统管理模块的is_system设置为0\n');

  // 确保system_management是系统模块
  await conn.execute(`
    UPDATE modules
    SET is_system = 1
    WHERE code = 'system_management'
  `);

  console.log('✅ 已确保系统管理模块的is_system为1\n');

  // 显示结果
  const [rows] = await conn.execute('SELECT name, code, is_system FROM modules ORDER BY sort_order');
  console.log('修复后的模块列表:');
  rows.forEach(r => {
    const flag = r.is_system ? '🔒 系统模块' : '✅ 可禁用';
    console.log(`  ${r.name} (${r.code}): ${flag}`);
  });

  await conn.end();
  console.log('\n✅ 修复完成！');
}

fix().catch(console.error);
