/**
 * 检查 users 表结构
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkUsersTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  });

  try {
    console.log('📊 检查 users 表结构...\n');

    const [columns] = await connection.query('DESCRIBE users');
    console.log('当前字段:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });

    // 检查是否有 salt 字段
    const hasSalt = columns.some(col => col.Field === 'salt');
    console.log(`\n✅ salt 字段: ${hasSalt ? '存在' : '❌ 不存在'}`);

    if (!hasSalt) {
      console.log('\n🔧 需要添加 salt 字段');
      console.log('执行以下 SQL:');
      console.log('ALTER TABLE users ADD COLUMN salt VARCHAR(255) NULL AFTER password;');
    }

  } finally {
    await connection.end();
  }
}

checkUsersTable().catch(console.error);
