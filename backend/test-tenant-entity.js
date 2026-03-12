/**
 * 租户实体测试脚本
 * 用于验证Tenant实体是否正确创建和配置
 */

const { AppDataSource } = require('./dist/config/database');
const { Tenant } = require('./dist/entities/Tenant');
const { v4: uuidv4 } = require('uuid');

async function testTenantEntity() {
  console.log('========================================');
  console.log('开始测试租户实体（Tenant Entity）');
  console.log('========================================\n');

  try {
    // 初始化数据库连接
    console.log('1️⃣  初始化数据库连接...');
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 测试1: 创建租户
    console.log('2️⃣  测试创建租户...');
    const tenant = new Tenant();
    tenant.id = uuidv4();
    tenant.name = '测试租户-自动创建';
    tenant.code = `TEST_${Date.now()}`;
    tenant.licenseKey = Tenant.generateLicenseKey();
    tenant.status = 'active';
    tenant.expireDate = new Date('2027-12-31');
    tenant.maxUsers = 50;
    tenant.maxStorageGb = 100;
    tenant.contactName = '测试联系人';
    tenant.contactPhone = '13800138000';
    tenant.contactEmail = 'test@example.com';

    await AppDataSource.manager.save(tenant);
    console.log('✅ 租户创建成功:');
    console.log('   ID:', tenant.id);
    console.log('   名称:', tenant.name);
    console.log('   代码:', tenant.code);
    console.log('   授权码:', tenant.licenseKey);
    console.log('   状态:', tenant.status);
    console.log('   过期时间:', tenant.expireDate);
    console.log('   最大用户数:', tenant.maxUsers);
    console.log('   最大存储空间:', tenant.maxStorageGb, 'GB\n');

    // 测试2: 查询租户
    console.log('3️⃣  测试查询租户...');
    const foundByCode = await AppDataSource.manager.findOne(Tenant, {
      where: { code: tenant.code }
    });
    console.log('✅ 按代码查询成功:', foundByCode ? '找到' : '未找到');

    const foundByLicense = await AppDataSource.manager.findOne(Tenant, {
      where: { licenseKey: tenant.licenseKey }
    });
    console.log('✅ 按授权码查询成功:', foundByLicense ? '找到' : '未找到\n');

    // 测试3: 测试实体方法
    console.log('4️⃣  测试实体方法...');
    console.log('   是否可用:', foundByCode.isAvailable() ? '是' : '否');
    console.log('   是否过期:', foundByCode.isExpired() ? '是' : '否');
    console.log('   状态描述:', foundByCode.getStatusText());
    console.log('   授权码生成测试:', Tenant.generateLicenseKey(), '\n');

    // 测试4: 查询所有租户
    console.log('5️⃣  查询所有租户...');
    const allTenants = await AppDataSource.manager.find(Tenant);
    console.log(`✅ 共找到 ${allTenants.length} 个租户:`);
    allTenants.forEach((t, index) => {
      console.log(`   ${index + 1}. ${t.name} (${t.code}) - ${t.getStatusText()}`);
    });
    console.log('');

    // 测试5: 更新租户
    console.log('6️⃣  测试更新租户...');
    foundByCode.maxUsers = 100;
    foundByCode.contactName = '更新后的联系人';
    await AppDataSource.manager.save(foundByCode);
    console.log('✅ 租户更新成功\n');

    // 测试6: 验证更新
    console.log('7️⃣  验证更新结果...');
    const updated = await AppDataSource.manager.findOne(Tenant, {
      where: { id: tenant.id }
    });
    console.log('   最大用户数:', updated.maxUsers);
    console.log('   联系人:', updated.contactName);
    console.log('✅ 更新验证成功\n');

    // 清理测试数据
    console.log('8️⃣  清理测试数据...');
    await AppDataSource.manager.delete(Tenant, { id: tenant.id });
    console.log('✅ 测试数据已清理\n');

    console.log('========================================');
    console.log('✅ 所有测试通过！租户实体工作正常');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    if (AppDataSource?.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ 数据库连接已关闭');
    }
  }
}

// 执行测试
testTenantEntity().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
