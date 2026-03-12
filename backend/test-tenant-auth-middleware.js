/**
 * 租户认证中间件测试脚本
 */

const { AppDataSource } = require('./dist/config/database');
const { Tenant } = require('./dist/entities/Tenant');
const { tenantAuth, checkTenantLimits } = require('./dist/middleware/tenantAuth');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// 模拟Express的Request和Response对象
function createMockRequest(token, path = '/api/customers', method = 'GET') {
  return {
    headers: {
      authorization: token ? `Bearer ${token}` : undefined
    },
    path,
    method
  };
}

function createMockResponse() {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

function createMockNext() {
  let called = false;
  const next = () => {
    called = true;
  };
  next.wasCalled = () => called;
  return next;
}

async function testTenantAuthMiddleware() {
  console.log('========================================');
  console.log('开始测试租户认证中间件');
  console.log('========================================\n');

  let testTenant = null;
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  try {
    // 初始化数据库连接
    console.log('1️⃣  初始化数据库连接...');
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 创建测试租户
    console.log('2️⃣  创建测试租户...');
    testTenant = new Tenant();
    testTenant.id = uuidv4();
    testTenant.name = '测试租户-中间件测试';
    testTenant.code = `TEST_AUTH_${Date.now()}`;
    testTenant.licenseKey = Tenant.generateLicenseKey();
    testTenant.status = 'active';
    testTenant.licenseStatus = 'active';
    testTenant.expireDate = new Date('2027-12-31');
    testTenant.maxUsers = 10;
    testTenant.maxStorageGb = 5;
    testTenant.userCount = 5;
    testTenant.usedStorageMb = 1024; // 1GB

    await AppDataSource.manager.save(testTenant);
    console.log('✅ 测试租户创建成功');
    console.log('   租户ID:', testTenant.id);
    console.log('   租户名称:', testTenant.name);
    console.log('   状态:', testTenant.status);
    console.log('   授权状态:', testTenant.licenseStatus);
    console.log('');

    // 测试1: 无Token访问
    console.log('3️⃣  测试1: 无Token访问...');
    const req1 = createMockRequest(null);
    const res1 = createMockResponse();
    const next1 = createMockNext();

    await tenantAuth(req1, res1, next1);

    if (res1.statusCode === 401 && res1.jsonData.message === '未登录，请先登录') {
      console.log('✅ 测试通过：正确拒绝无Token请求');
    } else {
      console.log('❌ 测试失败：应该返回401');
    }
    console.log('');

    // 测试2: 有效Token + 有效租户（SaaS模式）
    console.log('4️⃣  测试2: 有效Token + 有效租户（SaaS模式）...');

    // 临时设置为SaaS模式
    process.env.DEPLOY_MODE = 'saas';

    const validToken = jwt.sign({
      userId: uuidv4(),
      tenantId: testTenant.id,
      username: 'testuser'
    }, JWT_SECRET);

    const req2 = createMockRequest(validToken);
    const res2 = createMockResponse();
    const next2 = createMockNext();

    await tenantAuth(req2, res2, next2);

    if (next2.wasCalled() && req2.tenantId === testTenant.id && req2.tenantInfo) {
      console.log('✅ 测试通过：成功验证租户');
      console.log('   租户ID:', req2.tenantId);
      console.log('   租户名称:', req2.tenantInfo.name);
    } else {
      console.log('❌ 测试失败：应该通过验证');
      console.log('   next被调用:', next2.wasCalled());
      console.log('   响应状态:', res2.statusCode);
      console.log('   响应数据:', res2.jsonData);
    }
    console.log('');

    // 测试3: Token中无租户ID
    console.log('5️⃣  测试3: Token中无租户ID（SaaS模式）...');
    const tokenWithoutTenant = jwt.sign({
      userId: uuidv4(),
      username: 'testuser'
    }, JWT_SECRET);

    const req3 = createMockRequest(tokenWithoutTenant);
    const res3 = createMockResponse();
    const next3 = createMockNext();

    await tenantAuth(req3, res3, next3);

    if (res3.statusCode === 403 && res3.jsonData.message === '租户信息缺失') {
      console.log('✅ 测试通过：正确拒绝无租户ID的Token');
    } else {
      console.log('❌ 测试失败：应该返回403');
    }
    console.log('');

    // 测试4: 不存在的租户
    console.log('6️⃣  测试4: 不存在的租户...');
    const tokenWithInvalidTenant = jwt.sign({
      userId: uuidv4(),
      tenantId: uuidv4(), // 不存在的租户ID
      username: 'testuser'
    }, JWT_SECRET);

    const req4 = createMockRequest(tokenWithInvalidTenant);
    const res4 = createMockResponse();
    const next4 = createMockNext();

    await tenantAuth(req4, res4, next4);

    if (res4.statusCode === 403 && res4.jsonData.message === '租户不存在') {
      console.log('✅ 测试通过：正确拒绝不存在的租户');
    } else {
      console.log('❌ 测试失败：应该返回403 - 租户不存在');
      console.log('   实际状态:', res4.statusCode);
      console.log('   实际消息:', res4.jsonData?.message);
    }
    console.log('');

    // 测试5: 已禁用的租户
    console.log('7️⃣  测试5: 已禁用的租户...');
    testTenant.status = 'inactive';
    await AppDataSource.manager.save(testTenant);

    const req5 = createMockRequest(validToken);
    const res5 = createMockResponse();
    const next5 = createMockNext();

    await tenantAuth(req5, res5, next5);

    if (res5.statusCode === 403 && res5.jsonData.message.includes('已被禁用')) {
      console.log('✅ 测试通过：正确拒绝已禁用的租户');
    } else {
      console.log('❌ 测试失败：应该返回403 - 租户已被禁用');
    }
    console.log('');

    // 恢复租户状态
    testTenant.status = 'active';
    await AppDataSource.manager.save(testTenant);

    // 测试6: 授权待激活的租户
    console.log('8️⃣  测试6: 授权待激活的租户...');
    testTenant.licenseStatus = 'pending';
    await AppDataSource.manager.save(testTenant);

    const req6 = createMockRequest(validToken);
    const res6 = createMockResponse();
    const next6 = createMockNext();

    await tenantAuth(req6, res6, next6);

    if (res6.statusCode === 403 && res6.jsonData.message.includes('待激活')) {
      console.log('✅ 测试通过：正确拒绝待激活的租户');
    } else {
      console.log('❌ 测试失败：应该返回403 - 租户授权待激活');
    }
    console.log('');

    // 恢复授权状态
    testTenant.licenseStatus = 'active';
    await AppDataSource.manager.save(testTenant);

    // 测试7: 已过期的租户
    console.log('9️⃣  测试7: 已过期的租户...');
    testTenant.expireDate = new Date('2020-01-01'); // 过去的日期
    await AppDataSource.manager.save(testTenant);

    const req7 = createMockRequest(validToken);
    const res7 = createMockResponse();
    const next7 = createMockNext();

    await tenantAuth(req7, res7, next7);

    if (res7.statusCode === 403 && res7.jsonData.message.includes('已过期')) {
      console.log('✅ 测试通过：正确拒绝已过期的租户');
    } else {
      console.log('❌ 测试失败：应该返回403 - 租户已过期');
    }
    console.log('');

    // 恢复过期时间
    testTenant.expireDate = new Date('2027-12-31');
    await AppDataSource.manager.save(testTenant);

    // 测试8: 私有部署模式
    console.log('🔟  测试8: 私有部署模式...');
    process.env.DEPLOY_MODE = 'private';

    const privateToken = jwt.sign({
      userId: uuidv4(),
      username: 'testuser'
    }, JWT_SECRET);

    const req8 = createMockRequest(privateToken);
    const res8 = createMockResponse();
    const next8 = createMockNext();

    await tenantAuth(req8, res8, next8);

    if (next8.wasCalled() && req8.tenantId === undefined) {
      console.log('✅ 测试通过：私有部署模式不需要租户ID');
    } else {
      console.log('❌ 测试失败：私有部署模式应该跳过租户验证');
    }
    console.log('');

    // 恢复SaaS模式
    process.env.DEPLOY_MODE = 'saas';

    // 测试9: 资源限制 - 用户数限制
    console.log('1️⃣1️⃣  测试9: 资源限制 - 用户数限制...');
    testTenant.userCount = 10; // 已达上限
    testTenant.maxUsers = 10;
    await AppDataSource.manager.save(testTenant);

    const req9 = createMockRequest(validToken, '/api/users', 'POST');
    req9.tenantInfo = testTenant;
    const res9 = createMockResponse();
    const next9 = createMockNext();

    await checkTenantLimits(req9, res9, next9);

    if (res9.statusCode === 403 && res9.jsonData.message.includes('用户数已达上限')) {
      console.log('✅ 测试通过：正确阻止超出用户数限制');
    } else {
      console.log('❌ 测试失败：应该返回403 - 用户数已达上限');
    }
    console.log('');

    // 测试10: 资源限制 - 存储空间限制
    console.log('1️⃣2️⃣  测试10: 资源限制 - 存储空间限制...');
    testTenant.usedStorageMb = 5115; // 已使用5115MB (接近5GB上限)
    testTenant.maxStorageGb = 5; // 最大5GB = 5120MB
    await AppDataSource.manager.save(testTenant);

    const req10 = createMockRequest(validToken, '/api/upload', 'POST');
    req10.tenantInfo = testTenant;
    req10.headers['content-length'] = '10485760'; // 10MB
    const res10 = createMockResponse();
    const next10 = createMockNext();

    await checkTenantLimits(req10, res10, next10);

    if (res10.statusCode === 403 && res10.jsonData.message.includes('存储空间不足')) {
      console.log('✅ 测试通过：正确阻止超出存储空间限制');
    } else {
      console.log('❌ 测试失败：应该返回403 - 存储空间不足');
      console.log('   实际状态:', res10.statusCode);
      console.log('   实际消息:', res10.jsonData?.message);
      console.log('   已使用:', testTenant.usedStorageMb, 'MB');
      console.log('   最大:', testTenant.maxStorageGb * 1024, 'MB');
      console.log('   上传文件:', 10, 'MB');
      console.log('   总计:', testTenant.usedStorageMb + 10, 'MB');
    }
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
      if (testTenant) {
        await AppDataSource.manager.delete(Tenant, { id: testTenant.id });
        console.log('✅ 已删除测试租户');
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
testTenantAuthMiddleware().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
