/**
 * 数据库迁移：添加 custom_fields 列到 customers 表
 * 修复客户列表500错误：Unknown column 'customer.custom_fields' in 'field list'
 * 日期: 2026-04-19
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm'
  });

  try {
    console.log('检查 customers 表是否存在 custom_fields 列...');

    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'custom_fields'`,
      [process.env.DB_DATABASE || process.env.DB_NAME || 'crm']
    );

    if (columns.length === 0) {
      console.log('custom_fields 列不存在，正在添加...');
      await connection.execute(
        `ALTER TABLE customers ADD COLUMN custom_fields JSON NULL COMMENT '自定义字段数据'`
      );
      console.log('✅ custom_fields 列添加成功！');
    } else {
      console.log('✅ custom_fields 列已存在，无需迁移。');
    }
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();

