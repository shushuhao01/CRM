/**
 * 租户配置实体测试脚本
 */

const { AppDataSource } = require('./dist/config/database');
const { Tenant } = require('./dist/entities/Tenant');
const { TenantSettings } = require('./dist/entities/TenantSettings');
const { v4: uuidv4 } = require('uuid');

async function testTenantSettingsEntity() {
  console.log('========================================');
  console.log('开始测试租户配置实体（TenantSettings Entity）');
  console.log('========================================\n');

  let testTenant = null;
  let testSettings = [];

  try {
    // 初始化数据库连接
    console.log('1️⃣  初始化数据库连接...');
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 创建测试租户
    console.log('2️⃣  创建测试租户...');
    testTenant = new Tenant();
    testTenant.id = uuidv4();
    testTenant.name = '测试租户-配置测试';
    testTenant.code = `TEST_SETTINGS_${Date.now()}`;
    testTenant.licenseKey = Tenant.generateLicenseKey();
    testTenant.status = 'active';
    testTenant.licenseStatus = 'active';
    testTenant.expireDate = new Date('2027-12-31');
    testTenant.maxUsers = 50;
    testTenant.maxStorageGb = 100;

    await AppDataSource.manager.save(testTenant);
    console.log('✅ 测试租户创建成功');
    console.log('   租户ID:', testTenant.id);
    console.log('   租户名称:', testTenant.name);
    console.log('');

    // 测试1: 创建字符串类型配置
    console.log('3️⃣  测试创建字符串类型配置...');
    const stringSetting = new TenantSettings();
    stringSetting.id = uuidv4();
    stringSetting.tenantId = testTenant.id;
    stringSetting.settingKey = 'company_name';
    stringSetting.settingType = 'string';
    stringSetting.setValue('测试公司名称');
    stringSetting.description = '公司名称配置';

    await AppDataSource.manager.save(stringSetting);
    testSettings.push(stringSetting);
    console.log('✅ 字符串配置创建成功');
    console.log('   配置键:', stringSetting.settingKey);
    console.log('   配置值:', stringSetting.getValue());
    console.log('');

    // 测试2: 创建数字类型配置
    console.log('4️⃣  测试创建数字类型配置...');
    const numberSetting = new TenantSettings();
    numberSetting.id = uuidv4();
    numberSetting.tenantId = testTenant.id;
    numberSetting.settingKey = 'max_order_amount';
    numberSetting.settingType = 'number';
    numberSetting.setValue(10000);
    numberSetting.description = '最大订单金额';

    await AppDataSource.manager.save(numberSetting);
    testSettings.push(numberSetting);
    console.log('✅ 数字配置创建成功');
    console.log('   配置键:', numberSetting.settingKey);
    console.log('   配置值:', numberSetting.getValue());
    console.log('   类型:', typeof numberSetting.getValue());
    console.log('');

    // 测试3: 创建布尔类型配置
    console.log('5️⃣  测试创建布尔类型配置...');
    const booleanSetting = new TenantSettings();
    booleanSetting.id = uuidv4();
    booleanSetting.tenantId = testTenant.id;
    booleanSetting.settingKey = 'enable_notifications';
    booleanSetting.settingType = 'boolean';
    booleanSetting.setValue(true);
    booleanSetting.description = '是否启用通知';

    await AppDataSource.manager.save(booleanSetting);
    testSettings.push(booleanSetting);
    console.log('✅ 布尔配置创建成功');
    console.log('   配置键:', booleanSetting.settingKey);
    console.log('   配置值:', booleanSetting.getValue());
    console.log('   类型:', typeof booleanSetting.getValue());
    console.log('');

    // 测试4: 创建JSON类型配置
    console.log('6️⃣  测试创建JSON类型配置...');
    const jsonSetting = new TenantSettings();
    jsonSetting.id = uuidv4();
    jsonSetting.tenantId = testTenant.id;
    jsonSetting.settingKey = 'theme_config';
    jsonSetting.settingType = 'json';
    jsonSetting.setValue({
      primaryColor: '#409EFF',
      logo: 'https://example.com/logo.png',
      title: '我的CRM系统'
    });
    jsonSetting.description = '主题配置';

    await AppDataSource.manager.save(jsonSetting);
    testSettings.push(jsonSetting);
    console.log('✅ JSON配置创建成功');
    console.log('   配置键:', jsonSetting.settingKey);
    console.log('   配置值:', JSON.stringify(jsonSetting.getValue(), null, 2));
    console.log('');

    // 测试5: 创建数组类型配置
    console.log('7️⃣  测试创建数组类型配置...');
    const arraySetting = new TenantSettings();
    arraySetting.id = uuidv4();
    arraySetting.tenantId = testTenant.id;
    arraySetting.settingKey = 'enabled_features';
    arraySetting.settingType = 'array';
    arraySetting.setValue(['orders', 'customers', 'products', 'reports']);
    arraySetting.description = '启用的功能模块';

    await AppDataSource.manager.save(arraySetting);
    testSettings.push(arraySetting);
    console.log('✅ 数组配置创建成功');
    console.log('   配置键:', arraySetting.settingKey);
    console.log('   配置值:', arraySetting.getValue());
    console.log('');

    // 测试6: 查询租户的所有配置
    console.log('8️⃣  查询租户的所有配置...');
    const allSettings = await AppDataSource.manager.find(TenantSettings, {
      where: { tenantId: testTenant.id }
    });

    console.log(`✅ 共找到 ${allSettings.length} 个配置:\n`);
    allSettings.forEach((setting, index) => {
      console.log(`   ${index + 1}. ${setting.settingKey} (${setting.settingType})`);
      console.log(`      值: ${JSON.stringify(setting.getValue())}`);
      console.log(`      说明: ${setting.description || '无'}`);
      console.log('');
    });

    // 测试7: 按配置键查询
    console.log('9️⃣  测试按配置键查询...');
    const themeSetting = await AppDataSource.manager.findOne(TenantSettings, {
      where: {
        tenantId: testTenant.id,
        settingKey: 'theme_config'
      }
    });

    if (themeSetting) {
      console.log('✅ 查询成功');
      console.log('   配置键:', themeSetting.settingKey);
      console.log('   配置值:', JSON.stringify(themeSetting.getValue(), null, 2));
    }
    console.log('');

    // 测试8: 更新配置
    console.log('🔟  测试更新配置...');
    themeSetting.setValue({
      primaryColor: '#67C23A',
      logo: 'https://example.com/new-logo.png',
      title: '更新后的CRM系统'
    });
    await AppDataSource.manager.save(themeSetting);
    console.log('✅ 配置更新成功');
    console.log('   新配置值:', JSON.stringify(themeSetting.getValue(), null, 2));
    console.log('');

    // 测试9: 验证唯一约束
    console.log('1️⃣1️⃣  测试唯一约束（tenant_id + setting_key）...');
    try {
      const duplicateSetting = new TenantSettings();
      duplicateSetting.id = uuidv4();
      duplicateSetting.tenantId = testTenant.id;
      duplicateSetting.settingKey = 'theme_config'; // 重复的键
      duplicateSetting.settingType = 'string';
      duplicateSetting.setValue('test');

      await AppDataSource.manager.save(duplicateSetting);
      console.log('❌ 唯一约束验证失败：应该抛出错误');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('✅ 唯一约束验证成功：正确阻止了重复配置');
      } else {
        throw error;
      }
    }
    console.log('');

    // 测试10: 测试类型验证
    console.log('1️⃣2️⃣  测试类型验证...');
    const validSetting = new TenantSettings();
    validSetting.settingType = 'string';
    console.log('   string类型有效:', validSetting.isValidType());

    validSetting.settingType = 'invalid_type';
    console.log('   invalid_type类型有效:', validSetting.isValidType());
    console.log('✅ 类型验证测试完成\n');

    // 测试11: 测试关联查询
    console.log('1️⃣3️⃣  测试关联查询（包含租户信息）...');
    const settingWithTenant = await AppDataSource.manager.findOne(TenantSettings, {
      where: { id: stringSetting.id },
      relations: ['tenant']
    });

    if (settingWithTenant && settingWithTenant.tenant) {
      console.log('✅ 关联查询成功');
      console.log('   配置键:', settingWithTenant.settingKey);
      console.log('   所属租户:', settingWithTenant.tenant.name);
      console.log('   租户代码:', settingWithTenant.tenant.code);
    }
    console.log('');

    console.log('========================================');
    console.log('✅ 所有测试通过！租户配置实体工作正常');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    // 清理测试数据
    console.log('1️⃣4️⃣  清理测试数据...');
    try {
      if (testSettings.length > 0) {
        for (const setting of testSettings) {
          await AppDataSource.manager.delete(TenantSettings, { id: setting.id });
        }
        console.log(`✅ 已删除 ${testSettings.length} 个测试配置`);
      }

      if (testTenant) {
        await AppDataSource.manager.delete(Tenant, { id: testTenant.id });
        console.log('✅ 已删除测试租户');
      }
    } catch (error) {
      console.error('清理测试数据失败:', error.message);
    }

    // 关闭数据库连接
    if (AppDataSource?.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ 数据库连接已关闭');
    }
  }
}

// 执行测试
testTenantSettingsEntity().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
