const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function executeCodOperatorFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  });

  try {
    console.log('开始为 orders 表添加代收操作人字段...\n');

    // 检查字段是否已存在
    const [existingFields] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND COLUMN_NAME IN ('cod_cancelled_by', 'cod_cancelled_by_name', 'cod_returned_by', 'cod_returned_by_name')
    `);

    const existingFieldNames = existingFields.map(f => f.COLUMN_NAME);

    // 添加 cod_cancelled_by
    if (!existingFieldNames.includes('cod_cancelled_by')) {
      console.log('添加字段: cod_cancelled_by');
      await connection.execute(`
        ALTER TABLE orders
        ADD COLUMN cod_cancelled_by varchar(36) DEFAULT NULL COMMENT '改代收操作人ID' AFTER cod_cancelled_at
      `);
      console.log('✅ cod_cancelled_by 添加成功\n');
    } else {
      console.log('⏭️  cod_cancelled_by 已存在，跳过\n');
    }

    // 添加 cod_cancelled_by_name
    if (!existingFieldNames.includes('cod_cancelled_by_name')) {
      console.log('添加字段: cod_cancelled_by_name');
      await connection.execute(`
        ALTER TABLE orders
        ADD COLUMN cod_cancelled_by_name varchar(50) DEFAULT NULL COMMENT '改代收操作人姓名' AFTER cod_cancelled_by
      `);
      console.log('✅ cod_cancelled_by_name 添加成功\n');
    } else {
      console.log('⏭️  cod_cancelled_by_name 已存在，跳过\n');
    }

    // 添加 cod_returned_by
    if (!existingFieldNames.includes('cod_returned_by')) {
      console.log('添加字段: cod_returned_by');
      await connection.execute(`
        ALTER TABLE orders
        ADD COLUMN cod_returned_by varchar(36) DEFAULT NULL COMMENT '返款操作人ID' AFTER cod_returned_at
      `);
      console.log('✅ cod_returned_by 添加成功\n');
    } else {
      console.log('⏭️  cod_returned_by 已存在，跳过\n');
    }

    // 添加 cod_returned_by_name
    if (!existingFieldNames.includes('cod_returned_by_name')) {
      console.log('添加字段: cod_returned_by_name');
      await connection.execute(`
        ALTER TABLE orders
        ADD COLUMN cod_returned_by_name varchar(50) DEFAULT NULL COMMENT '返款操作人姓名' AFTER cod_returned_by
      `);
      console.log('✅ cod_returned_by_name 添加成功\n');
    } else {
      console.log('⏭️  cod_returned_by_name 已存在，跳过\n');
    }

    // 验证所有字段
    console.log('验证字段添加结果...\n');
    const [fields] = await connection.execute(`
      SELECT
        COLUMN_NAME AS field_name,
        COLUMN_TYPE AS field_type,
        COLUMN_COMMENT AS field_comment
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'orders'
        AND COLUMN_NAME IN ('cod_cancelled_by', 'cod_cancelled_by_name', 'cod_returned_by', 'cod_returned_by_name')
      ORDER BY ORDINAL_POSITION
    `);

    console.log('代收操作人字段列表：');
    console.log('='.repeat(80));
    fields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.field_name}`);
      console.log(`   类型: ${field.field_type}`);
      console.log(`   注释: ${field.field_comment}`);
      console.log('');
    });

    if (fields.length === 4) {
      console.log('✅ 所有字段添加成功！');
    } else {
      console.log(`⚠️  只添加了 ${fields.length}/4 个字段`);
    }

  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

executeCodOperatorFields().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
