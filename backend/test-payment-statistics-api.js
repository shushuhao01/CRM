/**
 * 第三阶段：支付和统计管理API测试
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1/admin';
let authToken = '';

// 测试结果统计
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// 记录测试结果
function recordTest(name, passed, message = '') {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.failed++;
    console.log(`❌ ${name}: ${message}`);
  }
  results.tests.push({ name, passed, message });
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
      recordTest('管理员登录', true);
      return true;
    } else {
      recordTest('管理员登录', false, '登录失败');
      return false;
    }
  } catch (error) {
    recordTest('管理员登录', false, error.message);
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

// 测试支付管理API
async function testPaymentAPI() {
  console.log('\n📦 测试支付管理API...\n');
  const api = getAxios();
  let orderId = '';

  try {
    // 1. 创建支付订单
    const createRes = await api.post('/payment/orders', {
      customerType: 'tenant',
      tenantName: '测试租户',
      packageName: '专业版',
      amount: 999.00,
      payType: 'wechat',
      contactName: '张三',
      contactPhone: '13800138000',
      remark: '测试订单'
    });

    if (createRes.data.success && createRes.data.data.id) {
      orderId = createRes.data.data.id;
      recordTest('创建支付订单', true);
    } else {
      recordTest('创建支付订单', false, '创建失败');
    }
  } catch (error) {
    recordTest('创建支付订单', false, error.message);
  }

  try {
    // 2. 获取订单列表
    const listRes = await api.get('/payment/orders', {
      params: { page: 1, pageSize: 10 }
    });

    if (listRes.data.success && Array.isArray(listRes.data.data.list)) {
      recordTest('获取支付订单列表', true);
    } else {
      recordTest('获取支付订单列表', false, '获取失败');
    }
  } catch (error) {
    recordTest('获取支付订单列表', false, error.message);
  }

  if (orderId) {
    try {
      // 3. 获取订单详情
      const detailRes = await api.get(`/payment/orders/${orderId}`);

      if (detailRes.data.success && detailRes.data.data.id === orderId) {
        recordTest('获取订单详情', true);
      } else {
        recordTest('获取订单详情', false, '获取失败');
      }
    } catch (error) {
      recordTest('获取订单详情', false, error.message);
    }

    try {
      // 4. 关闭订单
      const closeRes = await api.post(`/payment/orders/${orderId}/close`, {
        reason: '测试关闭'
      });

      if (closeRes.data.success) {
        recordTest('关闭订单', true);
      } else {
        recordTest('关闭订单', false, '关闭失败');
      }
    } catch (error) {
      recordTest('关闭订单', false, error.message);
    }
  }

  try {
    // 5. 获取支付统计
    const statsRes = await api.get('/payment/stats');

    if (statsRes.data.success && statsRes.data.data) {
      recordTest('获取支付统计', true);
    } else {
      recordTest('获取支付统计', false, '获取失败');
    }
  } catch (error) {
    recordTest('获取支付统计', false, error.message);
  }

  try {
    // 6. 获取支付日志
    const logsRes = await api.get('/payment/logs', {
      params: { page: 1, pageSize: 20 }
    });

    if (logsRes.data.success && Array.isArray(logsRes.data.data.list)) {
      recordTest('获取支付日志', true);
    } else {
      recordTest('获取支付日志', false, '获取失败');
    }
  } catch (error) {
    recordTest('获取支付日志', false, error.message);
  }

  try {
    // 7. 获取支付配置
    const configRes = await api.get('/payment/config');

    if (configRes.data.success && configRes.data.data) {
      recordTest('获取支付配置', true);
    } else {
      recordTest('获取支付配置', false, '获取失败');
    }
  } catch (error) {
    recordTest('获取支付配置', false, error.message);
  }
}

// 测试统计数据API
async function testStatisticsAPI() {
  console.log('\n📊 测试统计数据API...\n');
  const api = getAxios();

  try {
    // 1. 获取仪表盘统计
    const dashboardRes = await api.get('/statistics/dashboard');

    if (dashboardRes.data.success && dashboardRes.data.data) {
      const data = dashboardRes.data.data;
      const hasRequiredFields = data.tenants && data.licenses && data.revenue && data.orders;

      if (hasRequiredFields) {
        recordTest('获取仪表盘统计', true);
        console.log(`   - 租户总数: ${data.tenants.total}`);
        console.log(`   - 授权总数: ${data.licenses.total}`);
        console.log(`   - 总收入: ¥${data.revenue.total}`);
        console.log(`   - 订单总数: ${data.orders.total}`);
      } else {
        recordTest('获取仪表盘统计', false, '数据结构不完整');
      }
    } else {
      recordTest('获取仪表盘统计', false, '获取失败');
    }
  } catch (error) {
    recordTest('获取仪表盘统计', false, error.message);
  }

  try {
    // 2. 获取租户统计
    const tenantsRes = await api.get('/statistics/tenants');

    if (tenantsRes.data.success && tenantsRes.data.data) {
      recordTest('获取租户统计', true);
    } else {
      recordTest('获取租户统计', false, '获取失败');
    }
  } catch (error) {
    recordTest('获取租户统计', false, error.message);
  }

  try {
    // 3. 获取收入统计
    const revenueRes = await api.get('/statistics/revenue', {
      params: { groupBy: 'month' }
    });

    if (revenueRes.data.success && revenueRes.data.data) {
      recordTest('获取收入统计', true);
    } else {
      recordTest('获取收入统计', false, '获取失败');
    }
  } catch (error) {
    recordTest('获取收入统计', false, error.message);
  }

  try {
    // 4. 获取用户统计
    const usersRes = await api.get('/statistics/users');

    if (usersRes.data.success && usersRes.data.data) {
      recordTest('获取用户统计', true);
    } else {
      recordTest('获取用户统计', false, '获取失败');
    }
  } catch (error) {
    recordTest('获取用户统计', false, error.message);
  }

  try {
    // 5. 获取趋势分析
    const trendRes = await api.get('/statistics/trend', {
      params: { days: 30 }
    });

    if (trendRes.data.success && trendRes.data.data) {
      recordTest('获取趋势分析', true);
    } else {
      recordTest('获取趋势分析', false, '获取失败');
    }
  } catch (error) {
    recordTest('获取趋势分析', false, error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('='.repeat(60));
  console.log('第三阶段：支付和统计管理API测试');
  console.log('='.repeat(60));

  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ 登录失败，无法继续测试');
    return;
  }

  // 测试支付管理API
  await testPaymentAPI();

  // 测试统计数据API
  await testStatisticsAPI();

  // 输出测试结果
  console.log('\n' + '='.repeat(60));
  console.log('测试结果汇总');
  console.log('='.repeat(60));
  console.log(`总测试数: ${results.total}`);
  console.log(`✅ 通过: ${results.passed}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log(`通过率: ${((results.passed / results.total) * 100).toFixed(2)}%`);
  console.log('='.repeat(60));

  // 如果有失败的测试，显示详情
  if (results.failed > 0) {
    console.log('\n失败的测试详情:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
