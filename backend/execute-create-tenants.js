/**
 * 执行创建租户表的脚本
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function executeSQL() {
  console.log('========================================');
  console.log('开始创建租户表（tenants）');
  console.log('========================================\n');

  let connection;

  try {
    // 创建数据库连接
    console.log('1️⃣  连接数据库...');
    console.log(`   数据库: ${process.env.DB_DATABASE}`);
    console.log(`   地址: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   用户: ${process.env.DB_USERNAME}\n`);

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'crm_local',
      charset: 'utf8mb4'
    });

    console.log('✅ 数据库连接成功\n');

    // 读取SQL文件
    console.log('2️⃣  读取SQL文件...');
    const sqlFile = path.join(__dirname, 'database-migrations', 'create-tenants-table.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    console.log('✅ SQL文件读取成功\n');

    // 分割SQL语句（按分号分割，忽略注释）
    console.log('3️⃣  执行SQL语句...');
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await connection.query(statement);
          console.log(`   ✅ 语句 ${i + 1}/${statements.length} 执行成功`);
        } catch (error) {
          // 忽略"表已存在"的错误
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY') {
            console.log(`   ⚠️  语句 ${i + 1}/${statements.length} 跳过（数据已存在）`);
          } else {
            throw error;
          }
        }
      }
    }
    console.log('');

    // 验证表创建成功
    console.log('4️⃣  验证表创建...');
    const [tables] = await connection.query(`
      SELECT
        TABLE_NAME,
        TABLE_COMMENT,
        TABLE_ROWS
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'tenants'
    `, [process.env.DB_DATABASE]);

    if (tables.length > 0) {
      console.log('✅ 表创建成功:');
      console.log('   表名:', tables[0].TABLE_NAME);
      console.log('   注释:', tables[0].TABLE_COMMENT);
      console.log('   行数:', tables[0].TABLE_ROWS);
      console.log('');
    } else {
      throw new Error('表创建失败：未找到tenants表');
    }

    // 验证索引
    console.log('5️⃣  验证索引...');
    const [indexes] = await connection.query(`
      SELECT
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'tenants'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [process.env.DB_DATABASE]);

    console.log(`✅ 共创建 ${indexes.length} 个索引:`);
    indexes.forEach(idx => {
      const type = idx.NON_UNIQUE === 0 ? '唯一索引' : '普通索引';
      console.log(`   - ${idx.INDEX_NAME} (${idx.COLUMN_NAME}) - ${type}`);
    });
    console.log('');

    // 查看数据
    console.log('6️⃣  查看租户数据...');
    const [tenants] = await connection.query(`
      SELECT
        id,
        name,
        code,
        status,
        license_key,
        expire_date,
        max_users,
        max_storage_gb,
        created_at
      FROM tenants
    `);

    console.log(`✅ 共有 ${tenants.length} 个租户:`);
    tenants.forEach((t, index) => {
      console.log(`   ${index + 1}. ${t.name} (${t.code})`);
      console.log(`      授权码: ${t.license_key}`);
      console.log(`      状态: ${t.status}`);
      console.log(`      过期时间: ${t.expire_date || '永久'}`);
      console.log(`      最大用户数: ${t.max_users}`);
      console.log('');
    });

    console.log('========================================');
    console.log('✅ 租户表创建完成！');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ 数据库连接已关闭');
    }
  }
}

// 执行
executeSQL().catch(error => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});
