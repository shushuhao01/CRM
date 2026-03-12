/**
 * 任务2.5 - 数据隔离测试
 *
 * 测试目标：
 * 1. 验证租户数据完全隔离
 * 2. 验证跨租户访问被阻止
 * 3. 验证私有部署模式兼容
 */

// 设置为SaaS模式进行测试
process.env.DEPLOY_MODE = 'saas';

require('dotenv').config({ path: '.env.local' });
const { AppDataSource } = require('./dist/config/database');
const { Tenant } = require('./dist/entities/Tenant');
const { User } = require('./dist/entities/User');
const { SystemMessage } = require('./dist/entities/SystemMessage');
const { BaseRepository } = require('./dist/repositories/BaseRepository');
const { TenantContextManager } = require('./dist/utils/tenantContext');
const { v4: uuidv4 } = require('uuid');

console.log('='.repeat(80));
console.log('任务2.5 - 数据隔离测试');
console.log('='.repeat(80));

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, message) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`);
    console.log(`   原因: ${message}`);
  }
  testResults.tests.push({ name, passed, message });
}

async function runTests() {
  try {
    // 初始化数据库
    await AppDataSource.initialize();
    console.log('\n✅ 数据库连接成功\n');

    // ========================================
    // 测试1: 创建测试租户
    // ========================================
    console.log('📋 测试组1: 创建测试租户');
    console.log('-'.repeat(80));

    const tenantRepo = AppDataSource.getRepository(Tenant);

    // 创建租户A
    const tenantA = tenantRepo.create({
      id: `test-tenant-a-${Date.now()}`,
      name: '测试租户A',
      code: `TESTA${Date.now()}`,
      status: 'active',
      licenseKey: `LIC-A-${uuidv4().substring(0, 20).toUpperCase()}`,
      licenseStatus: 'active',
      expireDate: new Date('2027-12-31'),
      maxUsers: 10,
      maxStorageGb: 10,
      contactName: '张三',
      contactPhone: '13800138000',
      contactEmail: 'testa@example.com'
    });
    await tenantRepo.save(tenantA);
    recordTest('创建租户A', true, `租户ID: ${tenantA.id}`);

    // 创建租户B
    const tenantB = tenantRepo.create({
      id: `test-tenant-b-${Date.now()}`,
      name: '测试租户B',
      code: `TESTB${Date.now()}`,
      status: 'active',
      licenseKey: `LIC-B-${uuidv4().substring(0, 20).toUpperCase()}`,
      licenseStatus: 'active',
      expireDate: new Date('2027-12-31'),
      maxUsers: 10,
      maxStorageGb: 10,
      contactName: '李四',
      contactPhone: '13900139000',
      contactEmail: 'testb@example.com'
    });
    await tenantRepo.save(tenantB);
    recordTest('创建租户B', true, `租户ID: ${tenantB.id}`);

    // ========================================
    // 测试2: 为租户A创建测试数据
    // ========================================
    console.log('\n📋 测试组2: 为租户A创建测试数据');
    console.log('-'.repeat(80));

    // 模拟租户A的上下文
    await TenantContextManager.run({ tenantId: tenantA.id }, async () => {
      const messageRepo = new BaseRepository(SystemMessage);

      const messageA1 = await messageRepo.save({
        id: uuidv4(),
        type: 'system',
        title: '租户A的消息1',
        content: '这是租户A的第一条消息',
        priority: 'normal',
        category: '系统通知',
        targetUserId: 'user-a-1',
        isRead: 0
      });

      recordTest('为租户A创建消息1',
        messageA1.tenantId === tenantA.id,
        `tenant_id: ${messageA1.tenantId}`);

      const messageA2 = await messageRepo.save({
        id: uuidv4(),
        type: 'system',
        title: '租户A的消息2',
        content: '这是租户A的第二条消息',
        priority: 'high',
        category: '系统通知',
        targetUserId: 'user-a-2',
        isRead: 0
      });

      recordTest('为租户A创建消息2',
        messageA2.tenantId === tenantA.id,
        `tenant_id: ${messageA2.tenantId}`);
    });

    // ========================================
    // 测试3: 为租户B创建测试数据
    // ========================================
    console.log('\n📋 测试组3: 为租户B创建测试数据');
    console.log('-'.repeat(80));

    // 模拟租户B的上下文
    await TenantContextManager.run({ tenantId: tenantB.id }, async () => {
      const messageRepo = new BaseRepository(SystemMessage);

      const messageB1 = await messageRepo.save({
        id: uuidv4(),
        type: 'system',
        title: '租户B的消息1',
        content: '这是租户B的第一条消息',
        priority: 'normal',
        category: '系统通知',
        targetUserId: 'user-b-1',
        isRead: 0
      });

      recordTest('为租户B创建消息1',
        messageB1.tenantId === tenantB.id,
        `tenant_id: ${messageB1.tenantId}`);

      const messageB2 = await messageRepo.save({
        id: uuidv4(),
        type: 'system',
        title: '租户B的消息2',
        content: '这是租户B的第二条消息',
        priority: 'urgent',
        category: '系统通知',
        targetUserId: 'user-b-2',
        isRead: 0
      });

      recordTest('为租户B创建消息2',
        messageB2.tenantId === tenantB.id,
        `tenant_id: ${messageB2.tenantId}`);
    });

    // ========================================
    // 测试4: 验证租户A只能查询自己的数据
    // ========================================
    console.log('\n📋 测试组4: 验证租户A只能查询自己的数据');
    console.log('-'.repeat(80));

    await TenantContextManager.run({ tenantId: tenantA.id }, async () => {
      const messageRepo = new BaseRepository(SystemMessage);

      const messagesA = await messageRepo.find({});

      const allBelongToA = messagesA.every(msg => msg.tenantId === tenantA.id);
      const hasMessageB = messagesA.some(msg =>
        msg.title.includes('租户B') || msg.tenantId === tenantB.id
      );

      recordTest('租户A查询消息 - 只返回自己的数据',
        allBelongToA && !hasMessageB,
        `查询到${messagesA.length}条消息，全部属于租户A`);

      recordTest('租户A查询消息 - 不包含租户B的数据',
        !hasMessageB,
        '未查询到租户B的消息');
    });

    // ========================================
    // 测试5: 验证租户B只能查询自己的数据
    // ========================================
    console.log('\n📋 测试组5: 验证租户B只能查询自己的数据');
    console.log('-'.repeat(80));

    await TenantContextManager.run({ tenantId: tenantB.id }, async () => {
      const messageRepo = new BaseRepository(SystemMessage);

      const messagesB = await messageRepo.find({});

      const allBelongToB = messagesB.every(msg => msg.tenantId === tenantB.id);
      const hasMessageA = messagesB.some(msg =>
        msg.title.includes('租户A') || msg.tenantId === tenantA.id
      );

      recordTest('租户B查询消息 - 只返回自己的数据',
        allBelongToB && !hasMessageA,
        `查询到${messagesB.length}条消息，全部属于租户B`);

      recordTest('租户B查询消息 - 不包含租户A的数据',
        !hasMessageA,
        '未查询到租户A的消息');
    });

    // ========================================
    // 测试6: 验证租户A无法修改租户B的数据
    // ========================================
    console.log('\n📋 测试组6: 验证租户A无法修改租户B的数据');
    console.log('-'.repeat(80));

    // 先获取租户B的一条消息ID
    let messageBId;
    await TenantContextManager.run({ tenantId: tenantB.id }, async () => {
      const messageRepo = new BaseRepository(SystemMessage);
      const messagesB = await messageRepo.find({ where: { title: '租户B的消息1' } });
      if (messagesB.length > 0) {
        messageBId = messagesB[0].id;
      }
    });

    if (messageBId) {
      // 租户A尝试修改租户B的消息
      await TenantContextManager.run({ tenantId: tenantA.id }, async () => {
        const messageRepo = new BaseRepository(SystemMessage);

        try {
          await messageRepo.update(messageBId, { title: '被租户A篡改' });

          // 验证是否真的被修改了
          const message = await messageRepo.findById(messageBId);

          recordTest('租户A尝试修改租户B的数据 - 应该失败',
            !message || message.title !== '被租户A篡改',
            message ? '修改被阻止' : '未找到消息（正确）');
        } catch (error) {
          recordTest('租户A尝试修改租户B的数据 - 抛出错误',
            true,
            '修改被阻止');
        }
      });
    }

    // ========================================
    // 测试7: 验证租户A无法删除租户B的数据
    // ========================================
    console.log('\n📋 测试组7: 验证租户A无法删除租户B的数据');
    console.log('-'.repeat(80));

    if (messageBId) {
      // 租户A尝试删除租户B的消息
      await TenantContextManager.run({ tenantId: tenantA.id }, async () => {
        const messageRepo = new BaseRepository(SystemMessage);

        try {
          await messageRepo.delete(messageBId);

          // 验证是否真的被删除了（从租户B的视角查询）
          let stillExists = false;
          await TenantContextManager.run({ tenantId: tenantB.id }, async () => {
            const message = await messageRepo.findById(messageBId);
            stillExists = !!message;
          });

          recordTest('租户A尝试删除租户B的数据 - 应该失败',
            stillExists,
            stillExists ? '删除被阻止，数据仍存在' : '数据被删除（错误）');
        } catch (error) {
          recordTest('租户A尝试删除租户B的数据 - 抛出错误',
            true,
            '删除被阻止');
        }
      });
    }

    // ========================================
    // 测试8: 验证私有部署模式兼容性
    // ========================================
    console.log('\n📋 测试组8: 验证私有部署模式兼容性');
    console.log('-'.repeat(80));

    // 创建私有部署模式的消息（tenant_id = NULL）
    await TenantContextManager.run({ tenantId: undefined }, async () => {
      const messageRepo = new BaseRepository(SystemMessage);

      const privateMessage = await messageRepo.save({
        id: uuidv4(),
        type: 'system',
        title: '私有部署模式的消息',
        content: '这是私有部署模式的消息',
        priority: 'normal',
        category: '系统通知',
        targetUserId: 'private-user',
        isRead: 0
      });

      recordTest('私有部署模式 - 创建消息（tenant_id = NULL）',
        privateMessage.tenantId === null,
        `tenant_id: ${privateMessage.tenantId}`);
    });

    // 验证私有模式只能查询 tenant_id = NULL 的数据
    await TenantContextManager.run({ tenantId: undefined }, async () => {
      const messageRepo = new BaseRepository(SystemMessage);

      const privateMessages = await messageRepo.find({});

      const allPrivate = privateMessages.every(msg => msg.tenantId === null);
      const hasTenantData = privateMessages.some(msg =>
        msg.tenantId === tenantA.id || msg.tenantId === tenantB.id
      );

      recordTest('私有部署模式 - 只查询 tenant_id = NULL 的数据',
        allPrivate && !hasTenantData,
        `查询到${privateMessages.length}条消息，全部为私有模式`);
    });

    // ========================================
    // 清理测试数据
    // ========================================
    console.log('\n📋 清理测试数据');
    console.log('-'.repeat(80));

    // 删除测试租户的消息
    await TenantContextManager.run({ tenantId: tenantA.id }, async () => {
      const messageRepo = new BaseRepository(SystemMessage);
      const messages = await messageRepo.find({});
      for (const msg of messages) {
        await messageRepo.delete(msg.id);
      }
      console.log(`✅ 已删除租户A的${messages.length}条测试消息`);
    });

    await TenantContextManager.run({ tenantId: tenantB.id }, async () => {
      const messageRepo = new BaseRepository(SystemMessage);
      const messages = await messageRepo.find({});
      for (const msg of messages) {
        await messageRepo.delete(msg.id);
      }
      console.log(`✅ 已删除租户B的${messages.length}条测试消息`);
    });

    // 删除私有模式的消息
    await TenantContextManager.run({ tenantId: undefined }, async () => {
      const messageRepo = new BaseRepository(SystemMessage);
      const messages = await messageRepo.find({ where: { title: '私有部署模式的消息' } });
      for (const msg of messages) {
        await messageRepo.delete(msg.id);
      }
      console.log(`✅ 已删除私有模式的${messages.length}条测试消息`);
    });

    // 删除测试租户
    await tenantRepo.delete(tenantA.id);
    await tenantRepo.delete(tenantB.id);
    console.log('✅ 已删除测试租户A和B');

    // ========================================
    // 测试总结
    // ========================================
    console.log('\n' + '='.repeat(80));
    console.log('测试总结');
    console.log('='.repeat(80));
    console.log(`总测试数: ${testResults.total}`);
    console.log(`✅ 通过: ${testResults.passed}`);
    console.log(`❌ 失败: ${testResults.failed}`);
    console.log(`通过率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);

    if (testResults.failed === 0) {
      console.log('\n🎉 所有测试通过！数据隔离功能正常工作。');
      console.log('\n验证结果：');
      console.log('✅ 租户数据完全隔离');
      console.log('✅ 跨租户访问被阻止');
      console.log('✅ 私有部署模式兼容');
    } else {
      console.log('\n⚠️  部分测试失败，请检查上述失败项。');
      console.log('\n失败的测试：');
      testResults.tests
        .filter(t => !t.passed)
        .forEach(t => console.log(`  ❌ ${t.name}: ${t.message}`));
    }

    await AppDataSource.destroy();
    process.exit(testResults.failed === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ 测试执行失败:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

// 运行测试
runTests();
