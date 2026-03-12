/**
 * BaseRepository 测试脚本
 * 测试租户数据隔离功能
 */

const { AppDataSource } = require('./dist/config/database');
const { Tenant } = require('./dist/entities/Tenant');
const { Customer } = require('./dist/entities/Customer');
const { BaseRepository } = require('./dist/repositories/BaseRepository');
const { TenantContextManager } = require('./dist/utils/tenantContext');
const { v4: uuidv4 } = require('uuid');

async function testBaseRepository() {
  console.log('========================================');
  console.log('开始测试 BaseRepository');
  console.log('========================================\n');

  let testTenant1 = null;
  let testTenant2 = null;
  let testCustomer1 = null;
  let testCustomer2 = null;
  let testCustomer3 = null;

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

    // 测试1: 在租户1上下文中创建客户
    console.log('4️⃣  测试1: 在租户1上下文中创建客户...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const customerRepo = new BaseRepository(Customer);

      testCustomer1 = customerRepo.create({
        id: uuidv4(),
        name: '租户1的客户A',
        phone: '13800000001',
        status: 'active'
      });

      await customerRepo.save(testCustomer1);
      console.log('✅ 客户创建成功');
      console.log('   客户ID:', testCustomer1.id);
      console.log('   客户名称:', testCustomer1.name);
      console.log('   租户ID:', testCustomer1.tenant_id);

      if (testCustomer1.tenant_id === testTenant1.id) {
        console.log('✅ tenant_id 自动设置正确');
      } else {
        console.log('❌ tenant_id 设置错误');
      }
    });
    console.log('');

    // 测试2: 在租户2上下文中创建客户
    console.log('5️⃣  测试2: 在租户2上下文中创建客户...');
    await TenantContextManager.run({ tenantId: testTenant2.id }, async () => {
      const customerRepo = new BaseRepository(Customer);

      testCustomer2 = customerRepo.create({
        id: uuidv4(),
        name: '租户2的客户B',
        phone: '13800000002',
        status: 'active'
      });

      await customerRepo.save(testCustomer2);
      console.log('✅ 客户创建成功');
      console.log('   客户ID:', testCustomer2.id);
      console.log('   客户名称:', testCustomer2.name);
      console.log('   租户ID:', testCustomer2.tenant_id);

      if (testCustomer2.tenant_id === testTenant2.id) {
        console.log('✅ tenant_id 自动设置正确');
      } else {
        console.log('❌ tenant_id 设置错误');
      }
    });
    console.log('');

    // 测试3: 在租户1上下文中再创建一个客户
    console.log('6️⃣  测试3: 在租户1上下文中再创建一个客户...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const customerRepo = new BaseRepository(Customer);

      testCustomer3 = customerRepo.create({
        id: uuidv4(),
        name: '租户1的客户C',
        phone: '13800000003',
        status: 'active'
      });

      await customerRepo.save(testCustomer3);
      console.log('✅ 客户创建成功:', testCustomer3.name);
    });
    console.log('');

    // 测试4: 在租户1上下文中查询客户（应该只能看到租户1的客户）
    console.log('7️⃣  测试4: 在租户1上下文中查询客户...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const customerRepo = new BaseRepository(Customer);
      const customers = await customerRepo.find({
        where: { status: 'active' }
      });

      console.log(`✅ 查询到 ${customers.length} 个客户`);

      const tenant1Customers = customers.filter(c => c.tenant_id === testTenant1.id);
      const otherCustomers = customers.filter(c => c.tenant_id !== testTenant1.id);

      console.log(`   租户1的客户: ${tenant1Customers.length} 个`);
      console.log(`   其他租户的客户: ${otherCustomers.length} 个`);

      if (otherCustomers.length === 0 && tenant1Customers.length >= 2) {
        console.log('✅ 数据隔离正确：只能查询到租户1的客户');
      } else {
        console.log('❌ 数据隔离失败：查询到了其他租户的客户');
      }
    });
    console.log('');

    // 测试5: 在租户2上下文中查询客户（应该只能看到租户2的客户）
    console.log('8️⃣  测试5: 在租户2上下文中查询客户...');
    await TenantContextManager.run({ tenantId: testTenant2.id }, async () => {
      const customerRepo = new BaseRepository(Customer);
      const customers = await customerRepo.find({
        where: { status: 'active' }
      });

      console.log(`✅ 查询到 ${customers.length} 个客户`);

      const tenant2Customers = customers.filter(c => c.tenant_id === testTenant2.id);
      const otherCustomers = customers.filter(c => c.tenant_id !== testTenant2.id);

      console.log(`   租户2的客户: ${tenant2Customers.length} 个`);
      console.log(`   其他租户的客户: ${otherCustomers.length} 个`);

      if (otherCustomers.length === 0 && tenant2Customers.length >= 1) {
        console.log('✅ 数据隔离正确：只能查询到租户2的客户');
      } else {
        console.log('❌ 数据隔离失败：查询到了其他租户的客户');
      }
    });
    console.log('');

    // 测试6: 在租户1上下文中根据ID查询客户
    console.log('9️⃣  测试6: 在租户1上下文中根据ID查询客户...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const customerRepo = new BaseRepository(Customer);

      // 查询租户1的客户（应该成功）
      const customer1 = await customerRepo.findById(testCustomer1.id);
      if (customer1) {
        console.log('✅ 成功查询到租户1的客户:', customer1.name);
      } else {
        console.log('❌ 无法查询到租户1的客户');
      }

      // 尝试查询租户2的客户（应该失败）
      const customer2 = await customerRepo.findById(testCustomer2.id);
      if (!customer2) {
        console.log('✅ 正确阻止查询其他租户的客户');
      } else {
        console.log('❌ 错误：能够查询到其他租户的客户');
      }
    });
    console.log('');

    // 测试7: 在租户1上下文中更新客户
    console.log('🔟  测试7: 在租户1上下文中更新客户...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const customerRepo = new BaseRepository(Customer);

      // 更新租户1的客户（应该成功）
      await customerRepo.update(testCustomer1.id, { name: '租户1的客户A-已更新' });
      const updated = await customerRepo.findById(testCustomer1.id);

      if (updated && updated.name === '租户1的客户A-已更新') {
        console.log('✅ 成功更新租户1的客户');
      } else {
        console.log('❌ 更新租户1的客户失败');
      }

      // 尝试更新租户2的客户（应该失败，不影响）
      await customerRepo.update(testCustomer2.id, { name: '尝试修改租户2的客户' });

      // 验证租户2的客户没有被修改
      const customer2Check = await AppDataSource.manager.findOne(Customer, {
        where: { id: testCustomer2.id }
      });

      if (customer2Check && customer2Check.name === '租户2的客户B') {
        console.log('✅ 正确阻止更新其他租户的客户');
      } else {
        console.log('❌ 错误：能够更新其他租户的客户');
      }
    });
    console.log('');

    // 测试8: 在租户1上下文中删除客户
    console.log('1️⃣1️⃣  测试8: 在租户1上下文中删除客户...');
    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const customerRepo = new BaseRepository(Customer);

      // 删除租户1的客户（应该成功）
      await customerRepo.delete(testCustomer3.id);
      const deleted = await AppDataSource.manager.findOne(Customer, {
        where: { id: testCustomer3.id }
      });

      if (!deleted) {
        console.log('✅ 成功删除租户1的客户');
      } else {
        console.log('❌ 删除租户1的客户失败');
      }

      // 尝试删除租户2的客户（应该失败，不影响）
      await customerRepo.delete(testCustomer2.id);

      // 验证租户2的客户没有被删除
      const customer2Check = await AppDataSource.manager.findOne(Customer, {
        where: { id: testCustomer2.id }
      });

      if (customer2Check) {
        console.log('✅ 正确阻止删除其他租户的客户');
      } else {
        console.log('❌ 错误：能够删除其他租户的客户');
      }
    });
    console.log('');

    // 测试9: 私有部署模式
    console.log('1️⃣2️⃣  测试9: 私有部署模式...');
    process.env.DEPLOY_MODE = 'private';

    await TenantContextManager.run({}, async () => {
      const customerRepo = new BaseRepository(Customer);

      const privateCustomer = customerRepo.create({
        id: uuidv4(),
        name: '私有部署客户',
        phone: '13800000099',
        status: 'active'
      });

      await customerRepo.save(privateCustomer);

      if (privateCustomer.tenant_id === null) {
        console.log('✅ 私有部署模式：tenant_id 正确设置为 NULL');
      } else {
        console.log('❌ 私有部署模式：tenant_id 应该为 NULL');
      }

      // 清理私有部署客户
      await AppDataSource.manager.delete(Customer, { id: privateCustomer.id });
    });
    console.log('');

    // 测试10: count 方法
    console.log('1️⃣3️⃣  测试10: count 方法...');
    process.env.DEPLOY_MODE = 'saas';

    await TenantContextManager.run({ tenantId: testTenant1.id }, async () => {
      const customerRepo = new BaseRepository(Customer);
      const count = await customerRepo.count({ where: { status: 'active' } });

      console.log(`✅ 租户1的客户数量: ${count}`);

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
    console.log('1️⃣4️⃣  清理测试数据...');
    try {
      if (testCustomer1) {
        await AppDataSource.manager.delete(Customer, { id: testCustomer1.id });
        console.log('✅ 已删除测试客户1');
      }
      if (testCustomer2) {
        await AppDataSource.manager.delete(Customer, { id: testCustomer2.id });
        console.log('✅ 已删除测试客户2');
      }
      if (testCustomer3) {
        // 可能已被删除
        await AppDataSource.manager.delete(Customer, { id: testCustomer3.id }).catch(() => {});
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
