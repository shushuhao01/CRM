const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkLicenseLogsStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local',
  });

  try {
    console.log('📋 检查 license_logs 表结构...\n');

    // 查看表结构
    const [columns] = await connection.query('DESCRIBE license_logs');
    console.log('当前字段列表:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 检查关键字段
    const requiredFields = ['details', 'ip_address'];
    console.log('\n检查必需字段:');
    requiredFields.forEach(field => {
      const exists = columns.some(col => col.Field === field);
      console.log(`  ${exists ? '✅' : '❌'} ${field}`);
    });

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkLicenseLogsStructure();
