const mysql = require('mysql2/promise');

async function testPackagesWithYearly() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('📦 查询套餐数据（包含年付配置）...\n');

    const [packages] = await connection.execute(`
      SELECT
        id, name, code, type, price, billing_cycle,
        yearly_bonus_months, yearly_price,
        is_trial, is_visible, status
      FROM packages
      WHERE type = 'saas' AND status = 1
      ORDER BY sort_order
    `);

    packages.forEach(pkg => {
      console.log(`套餐: ${pkg.name} (${pkg.code})`);
      console.log(`  类型: ${pkg.type}`);
      console.log(`  月付价格: ¥${pkg.price}`);
      console.log(`  计费周期: ${pkg.billing_cycle}`);

      if (pkg.yearly_bonus_months > 0) {
        const yearlyPrice = pkg.yearly_price || pkg.price * (12 - pkg.yearly_bonus_months);
        const saveAmount = pkg.price * 12 - yearlyPrice;
        console.log(`  年付配置: 送${pkg.yearly_bonus_months}个月`);
        console.log(`  年付价格: ¥${yearlyPrice}`);
        console.log(`  节省金额: ¥${saveAmount}`);
      } else {
        console.log(`  年付配置: 无`);
      }

      console.log(`  试用套餐: ${pkg.is_trial ? '是' : '否'}`);
      console.log(`  官网显示: ${pkg.is_visible ? '是' : '否'}`);
      console.log('');
    });

    console.log('✅ 测试完成');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await connection.end();
  }
}

testPackagesWithYearly();
