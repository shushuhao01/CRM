/**
 * 诊断生产环境roles表结构
 * 检查缺失的字段
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.production' });

async function diagnoseRolesTable() {
  console.log('========================================');
  console.log('诊断生产环境roles表结构');
  console.log('========================================\n');

  let connection;
  try {
    // 连接数据库
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE
    });

    console.log('✅ 数据库连接成功\n');

    // 查询roles表结构
    console.log('📋 查询roles表结构:');
    console.log('-----------------------------------');
    const [columns] = await connection.query(`
      SELECT
        COLUMN_NAME as field,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_DEFAULT as defaultValue,
        COLUMN_KEY as key_type
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'roles'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_DATABASE]);

    console.log('当前字段:');
    columns.forEach(col => {
      console.log(`  - ${col.field} (${col.type}) ${col.nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.key_type ? `[${col.key_type}]` : ''}`);
    });

    // 检查缺失的字段
    console.log('\n📋 检查必需字段:');
    console.log('-----------------------------------');
    const requiredFields = [
      { name: 'code', type: 'varchar(50)', nullable: false },
      { name: 'status', type: 'varchar(20)', nullable: false, default: 'active' },
      { name: 'level', type: 'int(11)', nullable: false, default: 0 },
      { name: 'color', type: 'varchar(20)', nullable: true },
      { name: 'permissions', type: 'json', nullable: true },
      { name: 'roleType', type: 'varchar(20)', nullable: true },
      { name: 'data_scope', type: 'varchar(20)', nullable: true }
    ];

    const existingFields = columns.map(col => col.field);
    const missingFields = [];

    requiredFields.forEach(field => {
      if (existingFields.includes(field.name)) {
        console.log(`  ✅ ${field.name} - 存在`);
      } else {
        console.log(`  ❌ ${field.name} - 缺失`);
        missingFields.push(field);
      }
    });

    // 生成修复SQL
    if (missingFields.length > 0) {
      console.log('\n📝 生成修复SQL:');
      console.log('-----------------------------------');
      console.log('-- 添加缺失字段到roles表');
      console.log('ALTER TABLE `roles`');

      const alterStatements = missingFields.map((field, index) => {
        let sql = `  ADD COLUMN \`${field.name}\` ${field.type}`;
        if (!field.nullable) {
          sql += ' NOT NULL';
        }
        if (field.default !== undefined) {
          if (typeof field.default === 'string') {
            sql += ` DEFAULT '${field.default}'`;
          } else {
            sql += ` DEFAULT ${field.default}`;
          }
        }
        if (index < missingFields.length - 1) {
          sql += ',';
        } else {
          sql += ';';
        }
        return sql;
      });

      alterStatements.forEach(stmt => console.log(stmt));

      console.log('\n⚠️  注意: 请在宝塔数据库管理中执行上述SQL');
    } else {
      console.log('\n✅ 所有必需字段都存在');
    }

    // 查询roles表数据
    console.log('\n📋 查询roles表数据:');
    console.log('-----------------------------------');
    const [roles] = await connection.query('SELECT * FROM roles LIMIT 5');
    console.log(`总记录数: ${roles.length}`);
    if (roles.length > 0) {
      console.log('示例数据:');
      roles.forEach(role => {
        console.log(`  - ID: ${role.id}, Name: ${role.name}, Display: ${role.display_name}`);
      });
    }

  } catch (error) {
    console.error('\n❌ 诊断失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ 数据库连接已关闭');
    }
  }

  console.log('\n========================================');
  console.log('诊断完成');
  console.log('========================================');
}

// 运行诊断
diagnoseRolesTable().catch(console.error);
