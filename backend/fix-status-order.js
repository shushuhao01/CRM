/**
 * 修复状态配置的显示顺序
 */
const mysql = require('mysql2/promise');

async function fixStatusOrder() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('修复状态配置的显示顺序...\n');

    // 1. 添加 sort_order 字段（如果不存在）
    console.log('1. 检查并添加 sort_order 字段...');
    try {
      await connection.execute(`
        ALTER TABLE value_added_status_configs
        ADD COLUMN sort_order INT DEFAULT 999 COMMENT '排序顺序'
      `);
      console.log('✅ sort_order 字段已添加');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭️  sort_order 字段已存在');
      } else {
        throw e;
      }
    }

    // 2. 更新有效状态的排序
    console.log('\n2. 更新有效状态的排序...');
    const validStatusOrder = [
      { value: 'pending', order: 1 },
      { value: 'valid', order: 2 },
      { value: 'invalid', order: 3 },
      { value: 'supplemented', order: 4 }
    ];

    for (const status of validStatusOrder) {
      await connection.execute(
        'UPDATE value_added_status_configs SET sort_order = ? WHERE type = ? AND value = ?',
        [status.order, 'validStatus', status.value]
      );
      console.log(`  ✅ ${status.value} -> 排序 ${status.order}`);
    }

    // 3. 更新结算状态的排序
    console.log('\n3. 更新结算状态的排序...');
    const settlementStatusOrder = [
      { value: 'unsettled', order: 1 },
      { value: 'settled', order: 2 }
    ];

    for (const status of settlementStatusOrder) {
      await connection.execute(
        'UPDATE value_added_status_configs SET sort_order = ? WHERE type = ? AND value = ?',
        [status.order, 'settlementStatus', status.value]
      );
      console.log(`  ✅ ${status.value} -> 排序 ${status.order}`);
    }

    // 4. 验证结果
    console.log('\n4. 验证结果:');
    const [configs] = await connection.execute(`
      SELECT type, value, label, sort_order
      FROM value_added_status_configs
      ORDER BY type, sort_order
    `);

    console.log('\n有效状态配置（按排序）:');
    configs.filter(c => c.type === 'validStatus').forEach(c => {
      console.log(`  ${c.sort_order}. ${c.label} (${c.value})`);
    });

    console.log('\n结算状态配置（按排序）:');
    configs.filter(c => c.type === 'settlementStatus').forEach(c => {
      console.log(`  ${c.sort_order}. ${c.label} (${c.value})`);
    });

    console.log('\n✅ 修复完成！');

  } finally {
    await connection.end();
  }
}

fixStatusOrder().catch(console.error);
