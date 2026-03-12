/**
 * 第四阶段快速验收测试
 * 先创建测试租户，再测试功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';
let adminToken = '';
let testTenantId = '';

/**
 * Admin 登录
 */
async function adminLogin() {
  console.log('\n📝 步骤 1: Admin 登录');
  console.log('='.repeat(50));

  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.success) {
      adminToken = response.data.data.token;
      console.log('✅ 登录成功');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    return false;
  }
}

/**
 * 创建测试租户
 */
async function createTestTenant() {
  console.log('\n📝 步骤 2: 创建测试租户');
  console.log('='.repeat(50));

  try {
    const response = await axios.post(
      `${BASE_URL}/tenants`,
      {
        name: '测试租户-Phase4',
        code: 'TEST_P4',
        maxUsers: 10,
        maxStorageGb: 5,
        contact: '测试联系人',
        phone: '13800138000',
        email: 'test@example.com'
      },
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      testTenantId = response.data.data.id;
      console.log(`✅ 测试租户已创建: ${testTenantId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 创建租户失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试导出功能
 */
async function testExport() {
  console.log('\n📝 步骤 3: 测试导出功能');
  console.log('='.repeat(50));

  try {
    const response = await axios.post(
      `${BASE_URL}/tenants/${testTenantId}/export`,
      {
        tables: ['customers', 'orders']
      },
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      console.log(`✅ 导出任务已创建: ${response.data.data.jobId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 导出测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 测试日志功能
 */
async function testLogs() {
  console.log('\n📝 步骤 4: 测试日志功能');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(
      `${BASE_URL}/tenants/${testTenantId}/logs`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        params: { page: 1, pageSize: 5 }
      }
    );

    if (response.data.success) {
      const { logs, pagination } = response.data.data;
      console.log(`✅ 查询到 ${pagination.total} 条日志记录`);
      if (logs.length > 0) {
        console.log(`   最近操作: ${logs[0].action} by ${logs[0].operator}`);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 日志测试失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('\n🚀 第四阶段快速验收测试');
  console.log('='.repeat(50));

  // 登录
  const loginSuccess = await adminLogin();
  if (!loginSuccess) {
    console.log('\n❌ 测试终止：登录失败');
    return;
  }

  // 创建测试租户
  const createSuccess = await createTestTenant();
  if (!createSuccess) {
    console.log('\n❌ 测试终止：创建租户失败');
    return;
  }

  // 测试导出
  const exportSuccess = await testExport();

  // 测试日志
  const logsSuccess = await testLogs();

  // 总结
  console.log('\n📊 测试总结');
  console.log('='.repeat(50));
  console.log(`导出功能: ${exportSuccess ? '✅ 通过' : '❌ 失败'}`);
  console.log(`日志功能: ${logsSuccess ? '✅ 通过' : '❌ 失败'}`);

  const allPassed = exportSuccess && logsSuccess;
  console.log('\n' + '='.repeat(50));
  console.log(allPassed ? '✅ 验收通过！' : '⚠️  部分测试未通过');
  console.log('='.repeat(50));
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
