/**
 * 添加客户星级评分字段 star_rating
 * 用于客户画像中的手动评分持久化
 *
 * 使用方式: node add-star-rating-column.js
 */
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
    // Check if column exists
    const [cols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'star_rating'`
    );
    if (cols.length > 0) {
      console.log('Column star_rating already exists, skipping');
    } else {
      await connection.query(`ALTER TABLE customers ADD COLUMN star_rating INT DEFAULT 0 NULL COMMENT '手动星级评分(1-5)'`);
      console.log('Added star_rating column to customers table');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }

  await connection.end();
  console.log('Done');
}

run();


