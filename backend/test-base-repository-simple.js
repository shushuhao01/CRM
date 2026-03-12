/**
 * BaseRepository 简化测试脚本
 * 测试租户数据隔离功能
 */

const { AppDataSource } = require('./dist/config/database');
const { Tenant } = require('./dist/entities/Tenant');
const { TenantSettings } = require('./dist/entities/TenantSettings');
const { BaseRepository } = require('./dist/repositories/BaseRepository');
const { TenantContextManager } = require('./dist/utils/tenantContext');
const { v4: uuidv4 } = require('uuid');

async function testBaseRepository() {
  console.log('========================================');
  console.log('开始测试 BaseRepository');
  console.log('========================================\n');

  let testTenant1 = null;
  let testTenant2 = null;
  let testSetting1 = null;
  let testSetting2 = null;
  let testSetting3 = null;

  try {
    // 初始化数据库连接
    console.log('1️⃣  初始化数据库连接...');
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 创建测试租户1
    console.log('2️⃣  创建测试租户1...');
    testTenant1 = new Tenant();
    testTenant1.id = uuidv4();
    testTenant1.name = '测试租户1-BaseRepository';
    testTenant1.code = `TEST_REPO1_${Date.now()}`;
    testTenant1.licenseKey = Tenant.generateLicenseKey();
    testTenant1.status = 'active';
    testTenant1.licenseStatus = 'active';
    testTenant1.expireDate = new Date('2027-12-31');
    testTenant1.maxUsers = 10;
    testTenant1.maxStorageGb = 5;

    await AppDataSource.manager.save(testTenant1);
    console.log('✅ 租户1创建成功:', testTenant1.id);
    console.log('');

    // 创建测试租户2
    console.log('3️⃣  创建测试租户2...');
    testTenant2 = new Tenant();
    testTenant2.id = uuidv4();
    testTenant2.name = '测试租户2-BaseRepository';
    testTenant2.code = `TEST_REPO2_${Date.now()}`;
    testTenant2.licenseKey = Tenant.generateLicenseKey();
    testTenant2.status = 'active';
    testTenant2.licenseStatus = 'active';
    testTenant2.expireDate = new Date('2027-12-31');
    testTenant2.maxUsers = 10;
    testTenant2.maxStorageGb = 5;

    await AppDataSource.manager.save(testTenant2);
    console.log('✅ 租户2创建成功:', testTenant2.id);
    console.log('');

    // 设置为SaaS模式
    process.env.DEPLOY_MODE = 'saas';

    // 测试1: 在租户1上下文中创建配置
    console.log('4️⃣  测试1: 在租户1上下文中创建配置...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const settingsRepo = new BaseRepository(TenantSettings);

      testSetting1 = settingsRepo.create({
        id: uuidv4(),
        settingKey: 'theme',
        settingValue: 'dark',
        settingType: 'string',
        description: '主题配置'
      });

      await settingsRepo.save(testSetting1);
      console.log('✅ 配置创建成功');
      console.log('   配置ID:', testSetting1.id);
      console.log('   配置键:', testSetting1.settingKey);
      console.log('   租户ID:', testSetting1.tenantId);

      if (testSetting1.tenantId === testTenant1.id) {
        console.log('✅ tenant_id 自动设置正确');
      } else {
        console.log('❌ tenant_id 设置错误，期望:', testTenant1.id, '实际:', testSetting1.tenantId);
      }
    });
    console.log('');

    // 测试2: 在租户2上下文中创建配置
    console.log('5️⃣  测试2: 在租户2上下文中创建配置...');
    await TenantContextManager.run({ tenantId: testTenant2.id }, async () => {
      const settingsRepo = new BaseRepository(TenantSettings);

      testSetting2 = settingsRepo.create({
        id: uuidv4(),
        settingKey: 'theme',
        settingValue: 'light',
        settingType: 'string',
        description: '主题配置'
      });

      await settingsRepo.save(testSetting2);
      console.log('✅ 配置创建成功');
      console.log('   配置ID:', testSetting2.id);
      console.log('   配置键:', testSetting2.settingKey);
      console.log('   租户ID:', testSetting2.tenantId);

      if (testSetting2.tenantId === testTenant2.id) {
        console.log('✅ tenant_id 自动设置正确');
      } else {
        console.log('❌ tenant_id 设置错误');
      }
    });
    console.log('');

    // 测试3: 在租户1上下文中再创建一个配置
    console.log('6️⃣  测试3: 在租户1上下文中再创建一个配置...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const settingsRepo = new BaseRepository(TenantSettings);

      testSetting3 = settingsRepo.create({
        id: uuidv4(),
        settingKey: 'logo',
        settingValue: 'https://example.com/logo.png',
        settingType: 'string',
        description: 'Logo URL'
      });

      await settingsRepo.save(testSetting3);
      console.log('✅ 配置创建成功:', testSetting3.settingKey);
    });
    console.log('');

    // 测试4: 在租户1上下文中查询配置（应该只能看到租户1的配置）
    console.log('7️⃣  测试4: 在租户1上下文中查询配置...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const settingsRepo = new BaseRepository(TenantSettings);
      const settings = await settingsRepo.find();

      console.log(`✅ 查询到 ${settings.length} 个配置`);

      const tenant1Settings = settings.filter(s => s.tenantId === testTenant1.id);
      const otherSettings = settings.filter(s => s.tenantId !== testTenant1.id);

      console.log(`   租户1的配置: ${tenant1Settings.length} 个`);
      console.log(`   其他租户的配置: ${otherSettings.length} 个`);

      if (otherSettings.length === 0 && tenant1Settings.length >= 2) {
        console.log('✅ 数据隔离正确：只能查询到租户1的配置');
      } else {
        console.log('❌ 数据隔离失败：查询到了其他租户的配置');
      }
    });
    console.log('');

    // 测试5: 在租户2上下文中查询配置（应该只能看到租户2的配置）
    console.log('8️⃣  测试5: 在租户2上下文中查询配置...');
    await TenantContextManager.run({ tenantId: testTenant2.id }, async () => {
      const settingsRepo = new BaseRepository(TenantSettings);
      const settings = await settingsRepo.find();

      console.log(`✅ 查询到 ${settings.length} 个配置`);

      const tenant2Settings = settings.filter(s => s.tenantId === testTenant2.id);
      const otherSettings = settings.filter(s => s.tenantId !== testTenant2.id);

      console.log(`   租户2的配置: ${tenant2Settings.length} 个`);
      console.log(`   其他租户的配置: ${otherSettings.length} 个`);

      if (otherSettings.length === 0 && tenant2Settings.length >= 1) {
        console.log('✅ 数据隔离正确：只能查询到租户2的配置');
      } else {
        console.log('❌ 数据隔离失败：查询到了其他租户的配置');
      }
    });
    console.log('');

    // 测试6: 在租户1上下文中根据ID查询配置
    console.log('9️⃣  测试6: 在租户1上下文中根据ID查询配置...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const settingsRepo = new BaseRepository(TenantSettings);

      // 查询租户1的配置（应该成功）
      const setting1 = await settingsRepo.findById(testSetting1.id);
      if (setting1) {
        console.log('✅ 成功查询到租户1的配置:', setting1.settingKey);
      } else {
        console.log('❌ 无法查询到租户1的配置');
      }

      // 尝试查询租户2的配置（应该失败）
      const setting2 = await settingsRepo.findById(testSetting2.id);
      if (!setting2) {
        console.log('✅ 正确阻止查询其他租户的配置');
      } else {
        console.log('❌ 错误：能够查询到其他租户的配置');
      }
    });
    console.log('');

    // 测试7: 在租户1上下文中更新配置
    console.log('🔟  测试7: 在租户1上下文中更新配置...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const settingsRepo = new BaseRepository(TenantSettings);

      // 更新租户1的配置（应该成功）
      await settingsRepo.update(testSetting1.id, { settingValue: 'dark-updated' });
      const updated = await settingsRepo.findById(testSetting1.id);

      if (updated && updated.settingValue === 'dark-updated') {
        console.log('✅ 成功更新租户1的配置');
      } else {
        console.log('❌ 更新租户1的配置失败');
      }

      // 尝试更新租户2的配置（应该失败，不影响）
      await settingsRepo.update(testSetting2.id, { settingValue: 'try-to-modify' });

      // 验证租户2的配置没有被修改
      const setting2Check = await AppDataSource.manager.findOne(TenantSettings, {
        where: { id: testSetting2.id }
      });

      if (setting2Check && setting2Check.settingValue === 'light') {
        console.log('✅ 正确阻止更新其他租户的配置');
      } else {
        console.log('❌ 错误：能够更新其他租户的配置');
      }
    });
    console.log('');

    // 测试8: 在租户1上下文中删除配置
    console.log('1️⃣1️⃣  测试8: 在租户1上下文中删除配置...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const settingsRepo = new BaseRepository(TenantSettings);

      // 删除租户1的配置（应该成功）
      await settingsRepo.delete(testSetting3.id);
      const deleted = await AppDataSource.manager.findOne(TenantSettings, {
        where: { id: testSetting3.id }
      });

      if (!deleted) {
        console.log('✅ 成功删除租户1的配置');
      } else {
        console.log('❌ 删除租户1的配置失败');
      }

      // 尝试删除租户2的配置（应该失败，不影响）
      await settingsRepo.delete(testSetting2.id);

      // 验证租户2的配置没有被删除
      const setting2Check = await AppDataSource.manager.findOne(TenantSettings, {
        where: { id: testSetting2.id }
      });

      if (setting2Check) {
        console.log('✅ 正确阻止删除其他租户的配置');
      } else {
        console.log('❌ 错误：能够删除其他租户的配置');
      }
    });
    console.log('');

    // 测试9: count 方法
    console.log('1️⃣2️⃣  测试9: count 方法...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const settingsRepo = new BaseRepository(TenantSettings);
      const count = await settingsRepo.count();

      console.log(`✅ 租户1的配置数量: ${count}`);

      if (count >= 1) {
        console.log('✅ count 方法正确应用租户过滤');
      } else {
        console.log('❌ count 方法未正确应用租户过滤');
      }
    });
    console.log('');

    console.log('========================================');
    console.log('✅ 所有测试完成！');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    // 清理测试数据
    console.log('1️⃣3️⃣  清理测试数据...');
    try {
      if (testSetting1) {
        await AppDataSource.manager.delete(TenantSettings, { id: testSetting1.id });
        console.log('✅ 已删除测试配置1');
      }
      if (testSetting2) {
        await AppDataSource.manager.delete(TenantSettings, { id: testSetting2.id });
        console.log('✅ 已删除测试配置2');
      }
      if (testSetting3) {
        // 可能已被删除
        await AppDataSource.manager.delete(TenantSettings, { id: testSetting3.id }).catch(() => {});
      }
      if (testTenant1) {
        await AppDataSource.manager.delete(Tenant, { id: testTenant1.id });
        console.log('✅ 已删除测试租户1');
      }
      if (testTenant2) {
        await AppDataSource.manager.delete(Tenant, { id: testTenant2.id });
        console.log('✅ 已删除测试租户2');
      }
    } catch (error) {
      console.error('清理测试数据失败:', error.message);
    }

    // 恢复环境变量
    delete process.env.DEPLOY_MODE;

    // 关闭数据库连接
    if (AppDataSource?.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ 数据库连接已关闭');
    }
  }
}

// 执行测试
testBaseRepository().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
