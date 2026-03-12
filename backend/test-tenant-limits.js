/**
 * 租户资源限制测试脚本
 *
 * 测试内容：
 * 1. 测试用户数限制检查
 * 2. 测试存储空间限制检查
 * 3. 测试资源统计更新
 * 4. 测试资源使用情况查询
 */

const { AppDataSource } = require('./dist/config/database');
const { Tenant } = require('./dist/entities/Tenant');
const { User } = require('./dist/entities/User');
const {
  updateTenantUserCount,
  decrementTenantUserCount,
  updateTenantStorage,
  decrementTenantStorage,
  getTenantResourceUsage
} = require('./dist/middleware/checkTenantLimits');
const { v4: uuidv4 } = require('uuid');

async function testTenantLimits() {
  try {
    console.log('========================================');
    console.log('开始测试租户资源限制功能');
    console.log('========================================\n');

    // 初始化数据库连接
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const tenantRepository = AppDataSource.getRepository(Tenant);
    const userRepository = AppDataSource.getRepository(User);

    // ========================================
    // 测试1: 创建测试租户
    // ========================================
    console.log('【测试1】创建测试租户');
    console.log('----------------------------------------');

    const testTenant = tenantRepository.create({
      id: uuidv4(),
      name: '测试租户-资源限制',
      code: 'TEST_LIMITS_' + Date.now(),
      status: 'active',
      licenseKey: Tenant.generateLicenseKey(),
      licenseStatus: 'active',
      expireDate: new Date('2027-12-31'),
      maxUsers: 5,  // 设置较小的限制便于测试
      maxStorageGb: 1,  // 1GB存储空间
      userCount: 0,
      usedStorageMb: 0,
      contact: '测试联系人',
      phone: '13800138000',
      email: 'test@example.com'
    });

    await tenantRepository.save(testTenant);
    console.log(`✅ 测试租户创建成功`);
    console.log(`   租户ID: ${testTenant.id}`);
    console.log(`   租户名称: ${testTenant.name}`);
    console.log(`   最大用户数: ${testTenant.maxUsers}`);
    console.log(`   最大存储空间: ${testTenant.maxStorageGb}GB\n`);

    // ========================================
    // 测试2: 测试用户数限制
    // ========================================
    console.log('【测试2】测试用户数限制');
    console.log('----------------------------------------');

    // 创建测试用户
    const testUsers = [];
    for (let i = 1; i <= 3; i++) {
      const user = userRepository.create({
        id: uuidv4(),
        username: `test_user_${i}_${Date.now()}`,
        password: 'test123',
        name: `测试用户${i}`,
        role: 'sales',
        roleId: 'role_sales',
        status: 'active',
        tenantId: testTenant.id
      });
      await userRepository.save(user);
      testUsers.push(user);
      console.log(`✅ 创建用户${i}: ${user.username}`);
    }

    // 更新租户用户数统计
    await updateTenantUserCount(testTenant.id, 3);

    // 查询更新后的租户信息
    const updatedTenant = await tenantRepository.findOne({
      where: { id: testTenant.id }
    });
    console.log(`✅ 租户用户数已更新: ${updatedTenant.userCount}/${updatedTenant.maxUsers}`);
    console.log(`   使用率: ${updatedTenant.getUserUsagePercent()}%`);
    console.log(`   是否可以添加用户: ${updatedTenant.canAddUser() ? '是' : '否'}\n`);

    // ========================================
    // 测试3: 测试存储空间限制
    // ========================================
    console.log('【测试3】测试存储空间限制');
    console.log('----------------------------------------');

    // 模拟上传文件
    const fileSizes = [100, 200, 150]; // MB
    for (let i = 0; i < fileSizes.length; i++) {
      await updateTenantStorage(testTenant.id, fileSizes[i]);
      console.log(`✅ 模拟上传文件${i + 1}: ${fileSizes[i]}MB`);
    }

    // 查询更新后的租户信息
    const tenantAfterUpload = await tenantRepository.findOne({
      where: { id: testTenant.id }
    });
    console.log(`✅ 租户存储空间已更新: ${tenantAfterUpload.usedStorageMb}MB / ${tenantAfterUpload.maxStorageGb}GB`);
    console.log(`   使用率: ${tenantAfterUpload.getStorageUsagePercent()}%`);
    console.log(`   剩余空间: ${((tenantAfterUpload.maxStorageGb * 1024) - tenantAfterUpload.usedStorageMb).toFixed(2)}MB\n`);

    // ========================================
    // 测试4: 测试资源使用情况查询
    // ========================================
    console.log('【测试4】测试资源使用情况查询');
    console.log('----------------------------------------');

    const resourceUsage = await getTenantResourceUsage(testTenant.id);
    console.log('✅ 资源使用情况:');
    console.log(JSON.stringify(resourceUsage, null, 2));
    console.log('');

    // ========================================
    // 测试5: 测试资源释放
    // ========================================
    console.log('【测试5】测试资源释放');
    console.log('----------------------------------------');

    // 删除一个用户
    await userRepository.remove(testUsers[0]);
    await decrementTenantUserCount(testTenant.id, 1);
    console.log(`✅ 删除用户: ${testUsers[0].username}`);

    // 模拟删除文件
    await decrementTenantStorage(testTenant.id, 100);
    console.log(`✅ 删除文件: 100MB`);

    // 查询更新后的资源使用情况
    const finalResourceUsage = await getTenantResourceUsage(testTenant.id);
    console.log('✅ 更新后的资源使用情况:');
    console.log(JSON.stringify(finalResourceUsage, null, 2));
    console.log('');

    // ========================================
    // 测试6: 测试超限检查
    // ========================================
    console.log('【测试6】测试超限检查');
    console.log('----------------------------------------');

    const finalTenant = await tenantRepository.findOne({
      where: { id: testTenant.id }
    });

    console.log(`当前用户数: ${finalTenant.userCount}/${finalTenant.maxUsers}`);
    console.log(`是否可以添加用户: ${finalTenant.canAddUser() ? '✅ 是' : '❌ 否'}`);

    console.log(`当前存储空间: ${finalTenant.usedStorageMb}MB / ${finalTenant.maxStorageGb}GB`);
    console.log(`是否有足够空间(500MB): ${finalTenant.hasEnoughStorage(500) ? '✅ 是' : '❌ 否'}`);
    console.log(`是否有足够空间(100MB): ${finalTenant.hasEnoughStorage(100) ? '✅ 是' : '❌ 否'}`);
    console.log('');

    // ========================================
    // 清理测试数据
    // ========================================
    console.log('【清理】删除测试数据');
    console.log('----------------------------------------');

    // 删除测试用户
    for (const user of testUsers) {
      try {
        await userRepository.remove(user);
      } catch (e) {
        // 用户可能已被删除
      }
    }
    console.log('✅ 测试用户已删除');

    // 删除测试租户
    await tenantRepository.remove(testTenant);
    console.log('✅ 测试租户已删除\n');

    console.log('========================================');
    console.log('✅ 所有测试完成！');
    console.log('========================================');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('\n数据库连接已关闭');
  }
}

// 运行测试
testTenantLimits();
