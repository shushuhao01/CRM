const mysql = require('mysql2/promise');

async function optimizeLocalDB() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  console.log('开始优化本地数据库 crm_local...\n');

  const sqls = [
    'ALTER TABLE `value_added_orders` ADD INDEX `idx_order_id` (`order_id`)',
    'ALTER TABLE `value_added_orders` ADD INDEX `idx_order_date` (`order_date`)',
    'ALTER TABLE `value_added_orders` ADD INDEX `idx_order_status` (`order_status`)',
    'ALTER TABLE `value_added_orders` ADD INDEX `idx_customer_name` (`customer_name`)',
    'ALTER TABLE `value_added_orders` ADD INDEX `idx_status_date` (`status`, `order_date`)',
    'ALTER TABLE `value_added_orders` ADD INDEX `idx_settlement_date` (`settlement_status`, `order_date`)',
    'ALTER TABLE `value_added_orders` ADD INDEX `idx_company_date` (`company_id`, `order_date`)',
    'ANALYZE TABLE `value_added_orders`'
  ];

  for (let i = 0; i < sqls.length; i++) {
    try {
      console.log(`执行 [${i+1}/${sqls.length}]: ${sqls[i].substring(0, 60)}...`);
      await connection.execute(sqls[i]);
      console.log('✅ 成功\n');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  索引已存在，跳过\n');
      } else {
        console.log('❌ 失败:', err.message, '\n');
      }
    }
  }

  // 查看索引
  console.log('查看当前索引：');
  const [indexes] = await connection.execute('SHOW INDEX FROM `value_added_orders`');
  console.log('索引数量:', indexes.length);
  indexes.forEach(idx => {
    console.log(`  - ${idx.Key_name} (${idx.Column_name})`);
  });

  await connection.end();
  console.log('\n✅ 本地数据库优化完成！');
}

optimizeLocalDB().catch(console.error);
