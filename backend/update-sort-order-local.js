/**
 * 更新本地数据库的排序值
 */
const mysql = require('mysql2/promise');

async function updateSortOrder() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'abc789',
      password: 'YtZWJPF2bpsCscHX',
      database: 'crm_local'
    });

    console.log('✅ 数据库连接成功\n');

    // 更新排序值
    await connection.query('SET @row_number = 0');
    await connection.query(`
      UPDATE outsource_companies
      SET sort_order = (@row_number := @row_number + 1)
      ORDER BY created_at ASC
    `);

    console.log('✅ 排序值更新成功\n');

    // 查看结果
    const [rows] = await connection.query(`
      SELECT id, company_name, is_default, sort_order, created_at
      FROM outsource_companies
      ORDER BY sort_order ASC
    `);

    console.log('当前数据:');
    rows.forEach(row => {
      console.log(`  - ${row.company_name} (sort_order: ${row.sort_order}, is_default: ${row.is_default})`);
    });

  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

updateSortOrder();
