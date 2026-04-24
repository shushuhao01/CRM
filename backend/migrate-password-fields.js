// 迁移脚本：为users表添加密码安全策略字段
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  const [cols] = await conn.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='users' AND COLUMN_NAME IN ('password_last_changed','need_change_password')",
    [process.env.DB_DATABASE]
  );
  console.log('Already existing columns:', cols.map(c => c.COLUMN_NAME));

  if (!cols.find(c => c.COLUMN_NAME === 'password_last_changed')) {
    await conn.query("ALTER TABLE users ADD COLUMN password_last_changed DATETIME NULL COMMENT '密码最后修改时间'");
    console.log('Added: password_last_changed');
  } else {
    console.log('Skipped: password_last_changed (already exists)');
  }

  if (!cols.find(c => c.COLUMN_NAME === 'need_change_password')) {
    await conn.query("ALTER TABLE users ADD COLUMN need_change_password TINYINT(1) DEFAULT 1 COMMENT '是否需要修改密码: 0=否, 1=是'");
    console.log('Added: need_change_password');
  } else {
    console.log('Skipped: need_change_password (already exists)');
  }

  await conn.end();
  console.log('Migration complete!');
})().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});

