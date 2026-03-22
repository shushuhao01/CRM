/**
 * 添加 salt 字段到 users 表
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function addSaltColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  });

  try {
    console.log('🔧 添加 salt 字段到 users 表...\n');

    await connection.query('ALTER TABLE users ADD COLUMN salt VARCHAR(255) NULL AFTER password');

    console.log('✅ salt 字段添加成功!\n');

    // 验证
    const [columns] = await connection.query("DESCRIBE users");
    const saltField = columns.find(col => col.Field === 'salt');
    if (saltField) {
      console.log('✅ 验证成功: salt 字段已存在');
      console.log(`   类型: ${saltField.Type}`);
      console.log(`   允许NULL: ${saltField.Null}`);
    }

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  salt 字段已存在，无需添加');
    } else {
      throw error;
    }
  } finally {
    await connection.end();
  }
}

addSaltColumn().catch(console.error);
