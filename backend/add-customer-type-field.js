const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function addCustomerTypeField() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local',
  });

  try {
    console.log('📋 添加 customer_type 字段到 licenses 表...\n');

    // 添加 customer_type 字段
    await connection.query(`
      ALTER TABLE licenses
      ADD COLUMN customer_type VARCHAR(20) DEFAULT 'private'
      COMMENT '客户类型: private-私有客户, saas-SaaS租户'
      AFTER customer_email
    `);
    console.log('✅ customer_type 字段添加成功');

    // 添加索引
    await connection.query(`
      ALTER TABLE licenses
      ADD INDEX idx_customer_type (customer_type)
    `);
    console.log('✅ customer_type 索引添加成功');

    // 验证
    const [columns] = await connection.query("DESCRIBE licenses");
    const customerTypeField = columns.find(col => col.Field === 'customer_type');

    if (customerTypeField) {
      console.log('\n✅ 验证成功！字段信息:');
      console.log(`   字段名: ${customerTypeField.Field}`);
      console.log(`   类型: ${customerTypeField.Type}`);
      console.log(`   默认值: ${customerTypeField.Default}`);
      console.log(`   索引: ${customerTypeField.Key}`);
    }

  } catch (error) {
    if (error.message.includes('Duplicate column name')) {
      console.log('⚠️  字段已存在，跳过添加');
    } else if (error.message.includes('Duplicate key name')) {
      console.log('⚠️  索引已存在，跳过添加');
    } else {
      console.error('❌ 错误:', error.message);
    }
  } finally {
    await connection.end();
  }
}

addCustomerTypeField();
