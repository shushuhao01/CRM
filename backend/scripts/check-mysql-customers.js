const mysql = require('mysql2/promise');

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  console.log('=== 检查MySQL数据库 crm_local ===\n');

  try {
    // 1. 检查customers表结构
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'crm_local' AND TABLE_NAME = 'customers'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('customers表结构:');
    console.table(columns);

    // 2. 查询最近的客户记录
    const [customers] = await connection.query(`
      SELECT id, name, phone, sales_person_id, created_by, created_at
      FROM customers
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n最近10条客户记录:');
    if (customers.length > 0) {
      console.table(customers);

      console.log('\n客户ID格式分析:');
      customers.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id} (类型: ${typeof row.id})`);
        console.log(`   姓名: ${row.name}`);
        console.log(`   格式: ${String(row.id).includes('-') ? 'UUID' : 'INTEGER/其他'}`);
        console.log('');
      });
    } else {
      console.log('没有客户记录');
    }

    // 3. 检查客户总数
    const [countResult] = await connection.query('SELECT COUNT(*) as total FROM customers');
    console.log(`客户总数: ${countResult[0].total}`);

    // 4. 检查customer_shares表是否存在
    const [tables] = await connection.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'crm_local' AND TABLE_NAME = 'customer_shares'
    `);

    if (tables.length > 0) {
      console.log('\n✓ customer_shares表存在');

      // 查看表结构
      const [shareColumns] = await connection.query(`
        SELECT COLUMN_NAME, DATA_TYPE, COLUMN_KEY, EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'crm_local' AND TABLE_NAME = 'customer_shares'
        ORDER BY ORDINAL_POSITION
      `);

      console.log('\ncustomer_shares表结构:');
      console.table(shareColumns);

      // 查询分享记录
      const [shares] = await connection.query(`
        SELECT * FROM customer_shares
        ORDER BY created_at DESC
        LIMIT 5
      `);

      console.log(`\n分享记录数: ${shares.length}`);
      if (shares.length > 0) {
        console.table(shares);
      }
    } else {
      console.log('\n⚠️  customer_shares表不存在！');
      console.log('这就是为什么分享功能报错"客户不存在"的原因！');
      console.log('需要创建customer_shares表。');
    }

  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await connection.end();
    console.log('\n=== 查询完成 ===');
  }
}

checkDatabase();
