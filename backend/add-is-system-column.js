const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  // 检查列是否已存在
  const [cols] = await conn.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'value_added_status_configs' AND COLUMN_NAME = 'is_system'",
    [process.env.DB_DATABASE]
  );

  if (cols.length === 0) {
    await conn.execute("ALTER TABLE value_added_status_configs ADD COLUMN is_system TINYINT DEFAULT 0 COMMENT '系统预设' AFTER sort_order");
    console.log('Added is_system column');
  } else {
    console.log('is_system column already exists');
  }

  // 标记系统默认预设
  const defs = [
    ['validStatus', 'pending'], ['validStatus', 'valid'],
    ['validStatus', 'invalid'], ['validStatus', 'supplemented'],
    ['settlementStatus', 'unsettled'], ['settlementStatus', 'settled']
  ];
  for (const [t, v] of defs) {
    await conn.execute('UPDATE value_added_status_configs SET is_system = 1 WHERE type = ? AND value = ?', [t, v]);
  }

  const [rows] = await conn.execute('SELECT type, value, label, is_system, tenant_id FROM value_added_status_configs ORDER BY type, sort_order');
  console.log('Total:', rows.length);
  rows.forEach(r => console.log(JSON.stringify(r)));

  await conn.end();
  console.log('Done');
}
migrate().catch(e => console.error(e.message));

