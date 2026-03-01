/**
 * 恢复有效状态配置（使用英文值）
 */
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function restoreValidStatusConfigs() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('恢复有效状态配置...\n');

    const validStatuses = [
      { value: 'pending', label: '待处理' },
      { value: 'valid', label: '有效' },
      { value: 'invalid', label: '无效' },
      { value: 'supplemented', label: '已补单' }
    ];

    for (const status of validStatuses) {
      // 检查是否已存在
      const [existing] = await connection.execute(
        'SELECT id FROM value_added_status_configs WHERE type = ? AND value = ?',
        ['validStatus', status.value]
      );

      if (existing.length === 0) {
        // 插入新配置
        await connection.execute(
          'INSERT INTO value_added_status_configs (id, type, value, label, created_at) VALUES (?, ?, ?, ?, NOW())',
          [uuidv4(), 'validStatus', status.value, status.label]
        );
        console.log(`✅ 添加: ${status.value} -> ${status.label}`);
      } else {
        console.log(`⏭️  跳过: ${status.value} (已存在)`);
      }
    }

    // 查看最终配置
    console.log('\n最终的状态配置:');
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

    console.log('\n✅ 恢复完成！');

  } finally {
    await connection.end();
  }
}

restoreValidStatusConfigs().catch(console.error);
