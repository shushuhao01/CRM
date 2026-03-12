/**
 * 执行私有客户表迁移脚本
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function executeMigration() {
  let connection;

  try {
    console.log('========================================');
    console.log('执行私有客户表迁移');
    console.log('========================================\n');

    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm_local',
      multipleStatements: true
    });

    console.log('✅ 数据库连接成功');
    console.log(`   数据库: ${process.env.DB_DATABASE || 'crm_local'}\n`);

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'database-migrations', 'create-private-customers-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 执行迁移脚本...\n');

    // 分步执行SQL，容忍字段已存在的错误
    const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;

      try {
        await connection.query(trimmed);
        console.log('✅', trimmed.substring(0, 60) + '...');
      } catch (error) {
        // 忽略字段已存在、索引已存在等错误
        if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
          console.log('⚠️ ', trimmed.substring(0, 60) + '... (已存在，跳过)');
        } else {
          throw error;
        }
      }
    }

    console.log('✅ 迁移脚本执行成功\n');

    // 验证表是否创建成功
    const [tables] = await connection.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'private_customers'
    `, [process.env.DB_DATABASE || 'crm_local']);

    if (tables.length > 0) {
      console.log('✅ private_customers 表创建成功');
    } else {
      console.log('❌ private_customers 表创建失败');
    }

    // 检查licenses表的新字段
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'licenses'
      AND COLUMN_NAME IN ('customer_type', 'private_customer_id', 'tenant_id')
    `, [process.env.DB_DATABASE || 'crm_local']);

    console.log(`✅ licenses 表新增字段: ${columns.map(c => c.COLUMN_NAME).join(', ')}\n`);

    console.log('========================================');
    console.log('迁移完成！');
    console.log('========================================');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

executeMigration();
