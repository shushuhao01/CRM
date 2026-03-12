/**
 * 诊断packages表的数据
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function diagnose() {
  console.log('\n🔍 诊断packages表数据\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_local'
  });

  try {
    // 查询所有套餐
    const [rows] = await connection.execute(
      'SELECT id, name, code, type, status, is_visible, is_recommended, is_trial, sort_order FROM packages ORDER BY sort_order, id'
    );

    console.log(`找到 ${rows.length} 个套餐:\n`);

    rows.forEach(pkg => {
      const statusText = pkg.status === 1 ? '✅启用' : '❌禁用';
      const visibleText = pkg.is_visible === 1 ? '👁️显示' : '🙈隐藏';
      const recommendedText = pkg.is_recommended === 1 ? '⭐推荐' : '';
      const trialText = pkg.is_trial === 1 ? '🆓试用' : '';

      console.log(`${pkg.id}. ${pkg.name} (${pkg.code})`);
      console.log(`   类型: ${pkg.type}`);
      console.log(`   状态: ${statusText} | ${visibleText} ${recommendedText} ${trialText}`);
      console.log(`   排序: ${pkg.sort_order}`);

      // 判断是否会在官网显示
      const willShow = pkg.status === 1 && pkg.is_visible === 1;
      console.log(`   官网: ${willShow ? '✅ 会显示' : '❌ 不显示'}`);
      console.log('');
    });

    // 统计
    const [stats] = await connection.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as enabled,
        SUM(CASE WHEN is_visible = 1 THEN 1 ELSE 0 END) as visible,
        SUM(CASE WHEN status = 1 AND is_visible = 1 THEN 1 ELSE 0 END) as will_show
      FROM packages
    `);

    console.log('📊 统计:');
    console.log(`   总套餐数: ${stats[0].total}`);
    console.log(`   已启用: ${stats[0].enabled}`);
    console.log(`   官网显示: ${stats[0].visible}`);
    console.log(`   实际会显示: ${stats[0].will_show}`);

  } finally {
    await connection.end();
  }
}

diagnose().catch(console.error);
