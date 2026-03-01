/**
 * 执行备注预设表迁移脚本 (MySQL版本)
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

async function executeMigration() {
  let connection;

  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'crm_local',
      multipleStatements: true
    });

    console.log('开始执行备注预设表迁移 (MySQL)...');
    console.log('数据库:', process.env.DB_DATABASE || 'crm_local');
    console.log('');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'database-migrations', 'add-value-added-remark-presets.sql');
    let sql = fs.readFileSync(sqlFile, 'utf8');

    // 分割SQL语句
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .filter(s => !s.startsWith('--'))
      .filter(s => !s.match(/^(SELECT|SHOW)/i));

    console.log('1. 执行迁移脚本...');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await connection.query(statement);

        if (statement.includes('CREATE TABLE')) {
          console.log('   ✅ 创建表成功');
        } else if (statement.includes('ALTER TABLE')) {
          console.log('   ✅ 添加字段成功');
        } else if (statement.includes('INSERT INTO')) {
          console.log('   ✅ 插入数据成功');
        }
      } catch (error) {
        // 忽略已存在的错误
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('   ⚠️  表已存在，跳过创建');
        } else if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('   ⚠️  字段已存在，跳过添加');
        } else if (error.code === 'ER_DUP_ENTRY') {
          console.log('   ⚠️  数据已存在，跳过插入');
        } else {
          throw error;
        }
      }
    }

    console.log('');

    // 验证结果
    console.log('2. 验证迁移结果...');

    // 检查表是否存在
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'value_added_remark_presets'"
    );
    console.log('   - value_added_remark_presets 表:', tables.length > 0 ? '✅ 存在' : '❌ 不存在');

    // 检查字段是否存在
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM value_added_orders LIKE 'remark'"
    );
    console.log('   - value_added_orders.remark 字段:', columns.length > 0 ? '✅ 存在' : '❌ 不存在');

    // 检查预设数据
    const [countResult] = await connection.query(
      'SELECT COUNT(*) as count FROM value_added_remark_presets'
    );
    console.log('   - 预设数据总数:', countResult[0].count);

    // 按分类统计
    const [categoryResult] = await connection.query(
      'SELECT category, COUNT(*) as count FROM value_added_remark_presets GROUP BY category'
    );
    categoryResult.forEach(row => {
      console.log(`     ${row.category}: ${row.count}条`);
    });

    console.log('');
    console.log('✅ 备注预设表迁移完成！');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

executeMigration().catch(console.error);
