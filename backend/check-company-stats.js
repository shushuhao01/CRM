const mysql = require('mysql2/promise');

async function checkCompanyStats() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('连接数据库成功\n');

    // 查看公司列表及其统计数据
    const [companies] = await connection.query(`
      SELECT
        id,
        company_name,
        status,
        total_orders,
        valid_orders,
        invalid_orders,
        total_amount,
        settled_amount,
        sort_order
      FROM outsource_companies
      ORDER BY sort_order ASC, created_at DESC
    `);

    console.log('公司列表及统计数据:');
    console.table(companies);

    // 对每个公司，查询实际的订单统计
    console.log('\n验证统计数据准确性:');
    for (const company of companies) {
      const [actualStats] = await connection.query(`
        SELECT
          COUNT(*) as actual_total,
          SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) as actual_valid,
          SUM(CASE WHEN status = 'invalid' THEN 1 ELSE 0 END) as actual_invalid,
          SUM(unit_price) as actual_total_amount,
          SUM(CASE WHEN settlement_status = 'settled' THEN settlement_amount ELSE 0 END) as actual_settled_amount
        FROM value_added_orders
        WHERE company_id = ?
      `, [company.id]);

      const actual = actualStats[0];
      const match =
        company.total_orders === actual.actual_total &&
        company.valid_orders === actual.actual_valid &&
        company.invalid_orders === actual.actual_invalid &&
        parseFloat(company.total_amount) === parseFloat(actual.actual_total_amount || 0) &&
        parseFloat(company.settled_amount) === parseFloat(actual.actual_settled_amount || 0);

      console.log(`\n公司: ${company.company_name}`);
      console.log(`  数据库: 总订单=${company.total_orders}, 有效=${company.valid_orders}, 无效=${company.invalid_orders}, 总金额=${company.total_amount}, 已结算=${company.settled_amount}`);
      console.log(`  实际值: 总订单=${actual.actual_total}, 有效=${actual.actual_valid}, 无效=${actual.actual_invalid}, 总金额=${actual.actual_total_amount || 0}, 已结算=${actual.actual_settled_amount || 0}`);
      console.log(`  匹配: ${match ? '✓' : '✗'}`);

      if (!match) {
        console.log('  需要更新统计数据！');
      }
    }

  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await connection.end();
  }
}

checkCompanyStats();
