/**
 * 支付和统计API性能测试
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1/admin';
let authToken = '';

// 性能测试结果
const performanceResults = {
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    avgResponseTime: 0
  }
};

// 记录性能测试结果
function recordPerformance(name, responseTime, threshold, passed) {
  performanceResults.tests.push({
    name,
    responseTime,
    threshold,
    passed,
    status: passed ? '✅ 通过' : '❌ 超时'
  });

  performanceResults.summary.total++;
  if (passed) {
    performanceResults.summary.passed++;
  } else {
    performanceResults.summary.failed++;
  }
}

// 登录获取token
async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✅ 登录成功\n');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    return false;
  }
}

// 创建axios实例
function getAxios() {
  return axios.create({
    baseURL: API_BASE,
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
}

// 测试API性能
async function testAPIPerformance(name, apiCall, threshold) {
  const startTime = Date.now();

  try {
    await apiCall();
    const responseTime = Date.now() - startTime;
    const passed = responseTime < threshold;

    recordPerformance(name, responseTime, threshold, passed);

    if (passed) {
      console.log(`✅ ${name}: ${responseTime}ms (阈值: ${threshold}ms)`);
    } else {
      console.log(`❌ ${name}: ${responseTime}ms (阈值: ${threshold}ms) - 超时`);
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    recordPerformance(name, responseTime, threshold, false);
    console.log(`❌ ${name}: ${responseTime}ms - 错误: ${error.message}`);
  }
}

// 测试支付API性能
async function testPaymentAPIs() {
  console.log('📦 测试支付管理API性能...\n');
  const api = getAxios();

  await testAPIPerformance(
    '获取支付订单列表',
    () => api.get('/payment/orders', { params: { page: 1, pageSize: 10 } }),
    300 // 300ms阈值
  );

  await testAPIPerformance(
    '获取支付统计',
    () => api.get('/payment/stats'),
    500 // 500ms阈值
  );

  await testAPIPerformance(
    '获取支付日志',
    () => api.get('/payment/logs', { params: { page: 1, pageSize: 20 } }),
    300 // 300ms阈值
  );

  await testAPIPerformance(
    '获取支付报表',
    () => api.get('/payment/reports', { params: { groupBy: 'day' } }),
    800 // 800ms阈值
  );

  await testAPIPerformance(
    '获取支付配置',
    () => api.get('/payment/config'),
    200 // 200ms阈值
  );
}

// 测试统计API性能
async function testStatisticsAPIs() {
  console.log('\n📊 测试统计数据API性能...\n');
  const api = getAxios();

  // 第一次请求（无缓存）
  console.log('--- 第一次请求（无缓存） ---');
  await testAPIPerformance(
    '仪表盘统计（无缓存）',
    () => api.get('/statistics/dashboard'),
    1000 // 1000ms阈值
  );

  await testAPIPerformance(
    '租户统计（无缓存）',
    () => api.get('/statistics/tenants'),
    800 // 800ms阈值
  );

  await testAPIPerformance(
    '收入统计（无缓存）',
    () => api.get('/statistics/revenue', { params: { groupBy: 'month' } }),
    800 // 800ms阈值
  );

  // 第二次请求（有缓存）
  console.log('\n--- 第二次请求（有缓存） ---');
  await testAPIPerformance(
    '仪表盘统计（有缓存）',
    () => api.get('/statistics/dashboard'),
    100 // 100ms阈值
  );

  await testAPIPerformance(
    '租户统计（有缓存）',
    () => api.get('/statistics/tenants'),
    100 // 100ms阈值
  );

  await testAPIPerformance(
    '收入统计（有缓存）',
    () => api.get('/statistics/revenue', { params: { groupBy: 'month' } }),
    100 // 100ms阈值
  );

  await testAPIPerformance(
    '用户统计',
    () => api.get('/statistics/users'),
    500 // 500ms阈值
  );

  await testAPIPerformance(
    '趋势分析',
    () => api.get('/statistics/trend', { params: { days: 30 } }),
    1000 // 1000ms阈值
  );
}

// 并发测试
async function testConcurrency() {
  console.log('\n🔥 并发性能测试...\n');
  const api = getAxios();
  const concurrentRequests = 50;

  const startTime = Date.now();
  const promises = [];

  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(api.get('/statistics/dashboard'));
  }

  try {
    await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / concurrentRequests;
    const qps = (concurrentRequests / totalTime) * 1000;

    console.log(`✅ 并发测试完成:`);
    console.log(`   - 并发数: ${concurrentRequests}`);
    console.log(`   - 总耗时: ${totalTime}ms`);
    console.log(`   - 平均响应时间: ${avgTime.toFixed(2)}ms`);
    console.log(`   - QPS: ${qps.toFixed(2)}`);

    recordPerformance(
      `并发测试(${concurrentRequests}个请求)`,
      avgTime,
      200,
      avgTime < 200
    );
  } catch (error) {
    console.error('❌ 并发测试失败:', error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('='.repeat(60));
  console.log('支付和统计API性能测试');
  console.log('='.repeat(60));
  console.log();

  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ 登录失败，无法继续测试');
    return;
  }

  // 测试支付API
  await testPaymentAPIs();

  // 测试统计API
  await testStatisticsAPIs();

  // 并发测试
  await testConcurrency();

  // 输出测试结果
  console.log('\n' + '='.repeat(60));
  console.log('性能测试结果汇总');
  console.log('='.repeat(60));

  console.log('\n详细结果:');
  console.log('-'.repeat(60));
  performanceResults.tests.forEach(test => {
    console.log(`${test.status} ${test.name}`);
    console.log(`   响应时间: ${test.responseTime}ms | 阈值: ${test.threshold}ms`);
  });

  // 计算平均响应时间
  const totalResponseTime = performanceResults.tests.reduce((sum, test) => sum + test.responseTime, 0);
  performanceResults.summary.avgResponseTime = (totalResponseTime / performanceResults.tests.length).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log(`总测试数: ${performanceResults.summary.total}`);
  console.log(`✅ 通过: ${performanceResults.summary.passed}`);
  console.log(`❌ 失败: ${performanceResults.summary.failed}`);
  console.log(`平均响应时间: ${performanceResults.summary.avgResponseTime}ms`);
  console.log(`通过率: ${((performanceResults.summary.passed / performanceResults.summary.total) * 100).toFixed(2)}%`);
  console.log('='.repeat(60));

  // 性能评估
  console.log('\n性能评估:');
  const passRate = (performanceResults.summary.passed / performanceResults.summary.total) * 100;
  if (passRate >= 90) {
    console.log('🎉 优秀 - 性能表现出色！');
  } else if (passRate >= 70) {
    console.log('👍 良好 - 性能表现不错，有优化空间');
  } else if (passRate >= 50) {
    console.log('⚠️  一般 - 需要进行性能优化');
  } else {
    console.log('❌ 较差 - 需要重点优化性能');
  }

  process.exit(performanceResults.summary.failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
