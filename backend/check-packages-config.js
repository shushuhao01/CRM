const { AppDataSource } = require('./src/config/database');
const { Package } = require('./src/entities/Package');

async function checkPackagesConfig() {
  try {
    await AppDataSource.initialize();
    console.log('=== 检查套餐配置 ===\n');

    const packageRepo = AppDataSource.getRepository(Package);
    const packages = await packageRepo.find({ order: { type: 'ASC', sort_order: 'ASC' } });

    console.log(`找到 ${packages.length} 个套餐:\n`);

    // 按类型分组
    const saasPackages = packages.filter(p => p.type === 'saas');
    const privatePackages = packages.filter(p => p.type === 'private');

    console.log('【SaaS云端版】');
    saasPackages.forEach(pkg => {
      console.log(`\n套餐: ${pkg.name} (${pkg.code})`);
      console.log(`  价格: ¥${pkg.price}`);
      console.log(`  计费周期: ${pkg.billing_cycle}`);
      console.log(`  有效期: ${pkg.duration_days}天`);
      console.log(`  是否试用: ${pkg.is_trial ? '是' : '否'}`);
      console.log(`  用户数: ${pkg.max_users}`);
      console.log(`  存储: ${pkg.max_storage_gb}GB`);
      console.log(`  状态: ${pkg.status ? '启用' : '禁用'}`);
    });

    console.log('\n\n【私有部署版】');
    privatePackages.forEach(pkg => {
      console.log(`\n套餐: ${pkg.name} (${pkg.code})`);
      console.log(`  价格: ¥${pkg.price}`);
      console.log(`  计费周期: ${pkg.billing_cycle}`);
      console.log(`  有效期: ${pkg.duration_days}天`);
      console.log(`  用户数: ${pkg.max_users > 10000 ? '不限' : pkg.max_users}`);
      console.log(`  存储: ${pkg.max_storage_gb}GB`);
      console.log(`  状态: ${pkg.status ? '启用' : '禁用'}`);
    });

    // 检查问题
    console.log('\n\n=== 问题检查 ===');

    // 1. 检查免费试用套餐
    const trialPackages = packages.filter(p => p.is_trial || p.price == 0);
    console.log(`\n1. 免费/试用套餐 (${trialPackages.length}个):`);
    trialPackages.forEach(pkg => {
      console.log(`   - ${pkg.name}: ${pkg.duration_days}天, is_trial=${pkg.is_trial}`);
      if (pkg.duration_days !== 7 && pkg.price == 0) {
        console.log(`     ⚠️  建议: 免费套餐应该是7天试用期,当前是${pkg.duration_days}天`);
      }
    });

    // 2. 检查是否有年付折扣配置字段
    console.log('\n2. 年付折扣配置:');
    console.log('   当前数据库没有年付折扣配置字段');
    console.log('   需要添加: yearly_discount_rate, yearly_bonus_months 等字段');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkPackagesConfig();
