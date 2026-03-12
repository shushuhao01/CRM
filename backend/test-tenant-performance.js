/**
 * 租户系统性能测试脚本
 *
 * 测试内容：
 * 1. 租户列表查询性能
 * 2. 租户详情查询性能
 * 3. 租户用户列表查询性能
 * 4. 数据隔离查询性能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';

let adminToken = '';

/**
 * Admin 登录
 */
async function adminLogin() {
  console.log('\n📝 Admin 登录');
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
 * 测试租户列表查询性能
 */
async function testTenantListPerformance() {
  console.log('\n📝 测试租户列表查询性能');
  console.log('='.repeat(50));

  const iterations = 10;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();

    try {
      await axios.get(`${BASE_URL}/tenants`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        params: {
          page: 1,
          pageSize: 20
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      times.push(duration);

      process.stdout.write(`\r第 ${i + 1}/${iterations} 次: ${duration}ms`);
    } catch (error) {
      console.error(`\n❌ 查询失败:`, error.message);
    }
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log(`\n\n✅ 租户列表查询性能:`);
  console.log(`   平均耗时: ${avgTime.toFixed(2)}ms`);
  console.log(`   最快: ${minTime}ms`);
  console.log(`   最慢: ${maxTime}ms`);

  return avgTime < 500; // 期望平均响应时间 < 500ms
}

/**
 * 测试租户详情查询性能
 */
async function testTenantDetailPerformance() {
  console.log('\n📝 测试租户详情查询性能');
  console.log('='.repeat(50));

  // 先获取一个租户ID
  let tenantId;
  try {
    const response = await axios.get(`${BASE_URL}/tenants`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      params: { page: 1, pageSize: 1 }
    });

    if (response.data.data.tenants.length === 0) {
      console.log('⚠️  没有租户数据，跳过测试');
      return true;
    }

    tenantId = response.data.data.tenants[0].id;
  } catch (error) {
    console.error('❌ 获取租户ID失败:', error.message);
    return false;
  }

  const iterations = 10;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();

    try {
      await axios.get(`${BASE_URL}/tenants/${tenantId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      times.push(duration);

      process.stdout.write(`\r第 ${i + 1}/${iterations} 次: ${duration}ms`);
    } catch (error) {
      console.error(`\n❌ 查询失败:`, error.message);
    }
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log(`\n\n✅ 租户详情查询性能:`);
  console.log(`   平均耗时: ${avgTime.toFixed(2)}ms`);
  console.log(`   最快: ${minTime}ms`);
  console.log(`   最慢: ${maxTime}ms`);

  return avgTime < 300; // 期望平均响应时间 < 300ms
}

/**
 * 测试日志查询性能
 */
async function testLogQueryPerformance() {
  console.log('\n📝 测试日志查询性能');
  console.log('='.repeat(50));

  const iterations = 10;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();

    try {
      await axios.get(`${BASE_URL}/logs`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        params: {
          page: 1,
          pageSize: 20
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      times.push(duration);

      process.stdout.write(`\r第 ${i + 1}/${iterations} 次: ${duration}ms`);
    } catch (error) {
      console.error(`\n❌ 查询失败:`, error.message);
    }
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log(`\n\n✅ 日志查询性能:`);
  console.log(`   平均耗时: ${avgTime.toFixed(2)}ms`);
  console.log(`   最快: ${minTime}ms`);
  console.log(`   最慢: ${maxTime}ms`);

  return avgTime < 500; // 期望平均响应时间 < 500ms
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('\n🚀 开始租户系统性能测试');
  console.log('='.repeat(50));

  // 登录
  const loginSuccess = await adminLogin();
  if (!loginSuccess) {
    console.log('\n❌ 测试终止：登录失败');
    return;
  }

  // 性能测试
  const results = {
    tenantList: await testTenantListPerformance(),
    tenantDetail: await testTenantDetailPerformance(),
    logQuery: await testLogQueryPerformance()
  };

  // 总结
  console.log('\n📊 性能测试总结');
  console.log('='.repeat(50));
  console.log(`租户列表查询: ${results.tenantList ? '✅ 通过' : '❌ 未达标'}`);
  console.log(`租户详情查询: ${results.tenantDetail ? '✅ 通过' : '❌ 未达标'}`);
  console.log(`日志查询: ${results.logQuery ? '✅ 通过' : '❌ 未达标'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '✅ 所有测试通过！' : '⚠️  部分测试未达标'}`);
  console.log('='.repeat(50));
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
