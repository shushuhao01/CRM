/**
 * 添加缺失的字段到outsource_companies表
 */
const mysql = require('mysql2/promise');

async function addMissingColumns() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'abc789',
      password: 'YtZWJPF2bpsCscHX',
      database: 'crm_local'
    });

    console.log('✅ 数据库连接成功\n');

    // 检查并添加 is_default 字段
    try {
      await connection.query(`
        ALTER TABLE outsource_companies
        ADD COLUMN is_default TINYINT DEFAULT 0 COMMENT '是否默认公司: 0-否, 1-是'
        AFTER default_unit_price
      `);
      console.log('✅ 添加 is_default 字段成功');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  is_default 字段已存在');
      } else {
        throw err;
      }
    }

    // 检查并添加 sort_order 字段
    try {
      await connection.query(`
        ALTER TABLE outsource_companies
        ADD COLUMN sort_order INT DEFAULT 999 COMMENT '排序顺序'
        AFTER is_default
      `);
      console.log('✅ 添加 sort_order 字段成功');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  sort_order 字段已存在');
      } else {
        throw err;
      }
    }

    // 添加索引
    try {
      await connection.query(`
        ALTER TABLE outsource_companies
        ADD INDEX idx_sort_order (sort_order)
      `);
      console.log('✅ 添加 sort_order 索引成功');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  sort_order 索引已存在');
      } else {
        throw err;
      }
    }

    // 查看最终表结构
    const [columns] = await connection.query(
      "SHOW COLUMNS FROM outsource_companies"
    );
    console.log('\n最终表结构:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Default !== null ? `[默认: ${col.Default}]` : ''}`);
    });

    // 查看数据
    const [rows] = await connection.query(
      "SELECT id, company_name, is_default, sort_order FROM outsource_companies"
    );
    console.log(`\n当前数据 (${rows.length} 条):`);
    rows.forEach(row => {
      console.log(`  - ${row.company_name} (is_default: ${row.is_default}, sort_order: ${row.sort_order})`);
    });

    console.log('\n✅ 字段添加完成！');

  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addMissingColumns();
