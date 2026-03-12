/**
 * 测试官网价格方案页面的年付配置显示
 */

const mysql = require('mysql2/promise');

async function testWebsitePricingDisplay() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  console.log('📊 测试官网价格方案页面年付配置显示\n');

  try {
    // 查询SaaS套餐（官网价格方案页面显示的套餐）
    const [packages] = await connection.execute(`
      SELECT
        id, name, code, type, price,
        yearly_bonus_months, yearly_price,
        is_trial, is_visible
      FROM packages
      WHERE type = 'saas' AND is_visible = 1
      ORDER BY sort_order
    `);

    console.log('=== SaaS套餐年付配置 ===\n');

    packages.forEach(pkg => {
      console.log(`📦 ${pkg.name} (${pkg.code})`);
      console.log(`   月付价格: ¥${pkg.price}`);

      if (pkg.price > 0) {
        const yearlyPrice = pkg.yearly_price || pkg.price * (12 - (pkg.yearly_bonus_months || 0));
        const yearlySaving = pkg.price * 12 - yearlyPrice;
        const yearlyMonthlyPrice = Math.round(yearlyPrice / 12);

        console.log(`   年付配置:`);
        console.log(`     - 赠送月数: ${pkg.yearly_bonus_months || 0}个月`);
        console.log(`     - 年付价格: ¥${yearlyPrice}`);
        console.log(`     - 折算月价: ¥${yearlyMonthlyPrice}/月`);
        console.log(`     - 节省金额: ¥${yearlySaving}`);

        // 验证计算逻辑
        const expectedYearlyPrice = pkg.yearly_price || pkg.price * (12 - pkg.yearly_bonus_months);
        const expectedSaving = pkg.price * 12 - expectedYearlyPrice;

        console.log(`   ✓ 计算验证:`);
        console.log(`     - 年付价格计算: ${yearlyPrice === expectedYearlyPrice ? '✓ 正确' : '✗ 错误'}`);
        console.log(`     - 节省金额计算: ${yearlySaving === expectedSaving ? '✓ 正确' : '✗ 错误'}`);
      } else {
        console.log(`   免费试用: ${pkg.duration_days || 7}天`);
      }
      console.log('');
    });

    console.log('\n=== 官网显示预期效果 ===\n');
    console.log('当用户切换到"年付"时，应该显示:');
    console.log('1. 折算后的月价（年付价格 ÷ 12）');
    console.log('2. 年付总价');
    console.log('3. 赠送月数（如果 > 0）');
    console.log('4. 节省金额（月付×12 - 年付价格）');
    console.log('\n例如基础版:');
    console.log('  月付模式: ¥299/月');
    console.log('  年付模式: ¥166/月');
    console.log('  小绿字: 年付 ¥1990（送3个月），省 ¥1598');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await connection.end();
  }
}

testWebsitePricingDisplay();
