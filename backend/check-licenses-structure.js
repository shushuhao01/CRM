const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkLicensesStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local',
  });

  try {
    console.log('📋 检查 licenses 表结构...\n');

    // 查看表结构
    const [columns] = await connection.query('DESCRIBE licenses');
    console.log('当前字段列表:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
    });

    // 检查关键字段
    const requiredFields = ['customer_type', 'private_customer_id', 'tenant_id'];
    console.log('\n检查必需字段:');
    requiredFields.forEach(field => {
      const exists = columns.some(col => col.Field === field);
      console.log(`  ${exists ? '✅' : '❌'} ${field}`);
    });

    // 检查 private_customers 表是否存在
    const [tables] = await connection.query("SHOW TABLES LIKE 'private_customers'");
    console.log(`\n${tables.length > 0 ? '✅' : '❌'} private_customers 表${tables.length > 0 ? '已存在' : '不存在'}`);

    if (tables.length > 0) {
      const [pcColumns] = await connection.query('DESCRIBE private_customers');
      console.log('\nprivate_customers 表字段:');
      pcColumns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });

      const [count] = await connection.query('SELECT COUNT(*) as count FROM private_customers');
      console.log(`\n记录数: ${count[0].count}`);
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkLicensesStructure();
