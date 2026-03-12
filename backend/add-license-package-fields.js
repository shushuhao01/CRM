const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm'
  });

  try {
    await conn.execute("ALTER TABLE licenses ADD COLUMN package_id INT NULL COMMENT '关联套餐ID' AFTER features");
    console.log('Added package_id');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('package_id already exists');
    else throw e;
  }

  try {
    await conn.execute("ALTER TABLE licenses ADD COLUMN package_name VARCHAR(100) NULL COMMENT '套餐名称' AFTER package_id");
    console.log('Added package_name');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('package_name already exists');
    else throw e;
  }

  await conn.end();
  console.log('Done');
}

main().catch(console.error);
