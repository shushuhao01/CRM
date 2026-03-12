/**
 * 诊断套餐数据 - 使用TypeORM
 */
require('reflect-metadata');
const { AppDataSource } = require('./dist/config/database');
const { Package } = require('./dist/entities/Package');

async function diagnose() {
  console.log('\n🔍 诊断packages表数据\n');

  try {
    await AppDataSource.initialize();
    const packageRepo = AppDataSource.getRepository(Package);

    // 查询所有套餐
    const packages = await packageRepo.find({
      order: {
        sort_order: 'ASC',
        id: 'ASC'
      }
    });

    console.log(`找到 ${packages.length} 个套餐:\n`);

    packages.forEach(pkg => {
      const statusText = pkg.status ? '✅启用' : '❌禁用';
      const visibleText = pkg.is_visible ? '👁️显示' : '🙈隐藏';
      const recommendedText = pkg.is_recommended ? '⭐推荐' : '';
      const trialText = pkg.is_trial ? '🆓试用' : '';

      console.log(`${pkg.id}. ${pkg.name} (${pkg.code})`);
      console.log(`   类型: ${pkg.type}`);
      console.log(`   状态: ${statusText} | ${visibleText} ${recommendedText} ${trialText}`);
      console.log(`   status值: ${pkg.status} (${typeof pkg.status})`);
      console.log(`   is_visible值: ${pkg.is_visible} (${typeof pkg.is_visible})`);
      console.log(`   排序: ${pkg.sort_order}`);

      // 判断是否会在官网显示
      const willShow = pkg.status && pkg.is_visible;
      console.log(`   官网: ${willShow ? '✅ 会显示' : '❌ 不显示'}`);
      console.log('');
    });

    // 统计
    const enabled = packages.filter(p => p.status).length;
    const visible = packages.filter(p => p.is_visible).length;
    const willShow = packages.filter(p => p.status && p.is_visible).length;

    console.log('📊 统计:');
    console.log(`   总套餐数: ${packages.length}`);
    console.log(`   已启用: ${enabled}`);
    console.log(`   官网显示: ${visible}`);
    console.log(`   实际会显示: ${willShow}`);

    await AppDataSource.destroy();
  } catch (error) {
    console.error('错误:', error);
  }
}

diagnose();
