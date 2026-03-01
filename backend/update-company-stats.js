const mysql = require('mysql2/promise');

async function updateCompanyStats() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('连接数据库成功\n');

    // 获取所有公司
    const [companies] = await connection.query(`
      SELECT id, company_name FROM outsource_companies
    `);

    console.log(`找到 ${companies.length} 个公司，开始更新统计数据...\n`);

    for (const company of companies) {
      // 计算实际统计数据
      const [stats] = await connection.query(`
        SELECT
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) as valid_orders,
          SUM(CASE WHEN status = 'invalid' THEN 1 ELSE 0 END) as invalid_orders,
          SUM(unit_price) as total_amount,
          SUM(CASE WHEN settlement_status = 'settled' THEN settlement_amount ELSE 0 END) as settled_amount
        FROM value_added_orders
        WHERE company_id = ?
      `, [company.id]);

      const stat = stats[0];

      // 更新公司统计数据
      await connection.query(`
        UPDATE outsource_companies
        SET
          total_orders = ?,
          valid_orders = ?,
          invalid_orders = ?,
          total_amount = ?,
          settled_amount = ?
        WHERE id = ?
      `, [
        stat.total_orders || 0,
        stat.valid_orders || 0,
        stat.invalid_orders || 0,
        stat.total_amount || 0,
        stat.settled_amount || 0,
        company.id
      ]);

      console.log(`✓ ${company.company_name}: 总订单=${stat.total_orders || 0}, 有效=${stat.valid_orders || 0}, 无效=${stat.invalid_orders || 0}, 总金额=${stat.total_amount || 0}, 已结算=${stat.settled_amount || 0}`);
    }

    console.log('\n统计数据更新完成！');

    // 显示更新后的数据
    const [updated] = await connection.query(`
      SELECT
        company_name,
        status,
        total_orders,
        valid_orders,
        invalid_orders,
        total_amount,
        settled_amount
      FROM outsource_companies
      ORDER BY sort_order ASC, created_at DESC
    `);

    console.log('\n更新后的公司统计:');
    console.table(updated);

  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await connection.end();
  }
}

updateCompanyStats();
