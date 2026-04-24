const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'crm',
  });
  console.log('Connected to database');
  try {
    const [cols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'final_score'`
    );
    if (cols.length > 0) {
      console.log('Column final_score already exists, skipping');
    } else {
      await connection.query(`ALTER TABLE customers ADD COLUMN final_score INT DEFAULT 0 NULL COMMENT '综合评分(0-100)'`);
      console.log('Added final_score column to customers table');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  await connection.end();
  console.log('Done');
}
run();

