const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkOrdersCodFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  });

  try {
    console.log('检查 orders 表的代收相关字段...\n');

    // 查询代收相关字段
    const [fields] = await connection.execute(`
      SELECT
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND COLUMN_NAME LIKE '%cod%'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('代收相关字段：');
    console.log('='.repeat(80));
    fields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.COLUMN_NAME}`);
      console.log(`   类型: ${field.COLUMN_TYPE}`);
      console.log(`   可空: ${field.IS_NULLABLE}`);
      console.log(`   默认值: ${field.COLUMN_DEFAULT || 'NULL'}`);
      console.log(`   注释: ${field.COLUMN_COMMENT || '无'}`);
      console.log('');
    });

    console.log(`总共 ${fields.length} 个代收相关字段\n`);

    // 检查是否缺少操作人字段
    const fieldNames = fields.map(f => f.COLUMN_NAME);
    const missingFields = [];

    if (!fieldNames.includes('cod_cancelled_by')) {
      missingFields.push('cod_cancelled_by - 改代收操作人ID');
    }
    if (!fieldNames.includes('cod_cancelled_by_name')) {
      missingFields.push('cod_cancelled_by_name - 改代收操作人姓名');
    }
    if (!fieldNames.includes('cod_returned_by')) {
      missingFields.push('cod_returned_by - 返款操作人ID');
    }
    if (!fieldNames.includes('cod_returned_by_name')) {
      missingFields.push('cod_returned_by_name - 返款操作人姓名');
    }

    if (missingFields.length > 0) {
      console.log('⚠️  缺少以下字段：');
      missingFields.forEach(field => console.log(`   - ${field}`));
      console.log('\n需要执行 production-add-cod-operator-fields.sql');
    } else {
      console.log('✅ 所有操作人字段都已存在');
    }

  } catch (error) {
    console.error('检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkOrdersCodFields();
