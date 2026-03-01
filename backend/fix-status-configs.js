/**
 * 修复状态配置 - 删除中文值的配置
 */
const mysql = require('mysql2/promise');

async function fixStatusConfigs() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('开始修复状态配置...\n');

    // 删除有效状态中value为中文的配置
    console.log('删除有效状态中value为中文的配置...');
    const [result1] = await connection.execute(`
      DELETE FROM value_added_status_configs
      WHERE type = 'validStatus'
      AND value IN ('待处理', '有效', '无效', '已补单')
    `);
    console.log(`删除了 ${result1.affectedRows} 条记录`);

    // 删除结算状态中value为中文的配置
    console.log('\n删除结算状态中value为中文的配置...');
    const [result2] = await connection.execute(`
      DELETE FROM value_added_status_configs
      WHERE type = 'settlementStatus'
      AND value IN ('待处理', '已结算', '未结算')
    `);
    console.log(`删除了 ${result2.affectedRows} 条记录`);

    // 查看剩余的配置
    console.log('\n剩余的状态配置:');
    const [configs] = await connection.execute(`
      SELECT type, value, label
      FROM value_added_status_configs
      ORDER BY type, created_at
    `);

    console.log('\n有效状态配置:');
    configs.filter(c => c.type === 'validStatus').forEach(c => {
      console.log(`  value: "${c.value}" -> label: "${c.label}"`);
    });

    console.log('\n结算状态配置:');
    configs.filter(c => c.type === 'settlementStatus').forEach(c => {
      console.log(`  value: "${c.value}" -> label: "${c.label}"`);
    });

    console.log('\n✅ 修复完成！');

  } finally {
    await connection.end();
  }
}

fixStatusConfigs().catch(console.error);
