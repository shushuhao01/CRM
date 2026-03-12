/**
 * 第一阶段授权管理模块 - 完整验收测试
 * 测试所有功能点，生成详细报告
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';
const VERIFY_URL = 'http://localhost:3000/api/v1/admin/verify';

// 测试配置
const config = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

let authToken = '';
let testLicenseId = '';
let testLicenseKey = '';

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// 记录测试结果
function recordTest(name, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`);
  }
  if (message) {
    console.log(`   ${message}`);
  }
  testResults.tests.push({ name, passed, message });
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     第一阶段授权管理模块 - 完整验收测试                   ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

// ========== 测试1: 管理员登录 ==========
async function test1_AdminLogin() {
  console.log('\n【测试1】管理员登录');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    }, config);

    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      recordTest('管理员登录', true, `Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      recordTest('管理员登录', false, '登录失败');
      return false;
    }
  } catch (error) {
    recordTest('管理员登录', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试2: 获取授权统计 ==========
async function test2_GetStatistics() {
  console.log('\n【测试2】获取授权统计');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.get(`${BASE_URL}/licenses/statistics`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const stats = response.data.data;
      recordTest('获取授权统计', true,
        `总数: ${stats.total}, 激活: ${stats.active}, 待激活: ${stats.pending}, 已过期: ${stats.expired}, 已停用: ${stats.revoked}`
      );
      return true;
    } else {
      recordTest('获取授权统计', false);
      return false;
    }
  } catch (error) {
    recordTest('获取授权统计', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试3: 获取授权列表（分页） ==========
async function test3_GetLicenseList() {
  console.log('\n【测试3】获取授权列表（分页）');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.get(`${BASE_URL}/licenses`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, pageSize: 10 }
    });

    if (response.data.success) {
      recordTest('获取授权列表', true,
        `总数: ${response.data.data.total}, 当前页: ${response.data.data.list.length} 条`
      );
      return true;
    } else {
      recordTest('获取授权列表', false);
      return false;
    }
  } catch (error) {
    recordTest('获取授权列表', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试4: 搜索授权（关键词） ==========
async function test4_SearchLicense() {
  console.log('\n【测试4】搜索授权（关键词）');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.get(`${BASE_URL}/licenses`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { keyword: '测试', page: 1, pageSize: 10 }
    });

    if (response.data.success) {
      recordTest('搜索授权', true, `找到 ${response.data.data.total} 条结果`);
      return true;
    } else {
      recordTest('搜索授权', false);
      return false;
    }
  } catch (error) {
    recordTest('搜索授权', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试5: 创建授权 ==========
async function test5_CreateLicense() {
  console.log('\n【测试5】创建授权');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365); // 1年后过期

    const response = await axios.post(`${BASE_URL}/licenses`, {
      customerName: '验收测试公司-' + Date.now(),
      customerContact: '张三',
      customerPhone: '13800138000',
      customerEmail: 'test@example.com',
      licenseType: 'annual', // 年付版
      maxUsers: 100,
      maxStorageGb: 50,
      features: ['订单管理', '客户管理', '财务管理', '数据分析'],
      expiresAt: expiresAt.toISOString(),
      notes: '第一阶段验收测试创建'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      testLicenseId = response.data.data.id;
      testLicenseKey = response.data.data.licenseKey;
      recordTest('创建授权', true,
        `授权ID: ${testLicenseId}\n   授权码: ${testLicenseKey}`
      );
      return true;
    } else {
      recordTest('创建授权', false);
      return false;
    }
  } catch (error) {
    recordTest('创建授权', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试6: 获取授权详情 ==========
async function test6_GetLicenseDetail() {
  console.log('\n【测试6】获取授权详情');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.get(`${BASE_URL}/licenses/${testLicenseId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const license = response.data.data;
      recordTest('获取授权详情', true,
        `客户: ${license.customerName}, 类型: ${license.licenseType}, 状态: ${license.status}`
      );
      return true;
    } else {
      recordTest('获取授权详情', false);
      return false;
    }
  } catch (error) {
    recordTest('获取授权详情', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试7: 验证授权（公开接口） ==========
async function test7_VerifyLicense() {
  console.log('\n【测试7】验证授权（公开接口）');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.post(`${VERIFY_URL}/license`, {
      licenseKey: testLicenseKey,
      machineId: 'TEST-MACHINE-' + Date.now()
    }, config);

    if (response.data.success && response.data.data.valid) {
      recordTest('验证授权', true,
        `验证成功, 类型: ${response.data.data.licenseType}, 最大用户数: ${response.data.data.maxUsers}`
      );
      return true;
    } else {
      recordTest('验证授权', false, response.data.message);
      return false;
    }
  } catch (error) {
    recordTest('验证授权', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试8: 更新授权信息 ==========
async function test8_UpdateLicense() {
  console.log('\n【测试8】更新授权信息');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.put(`${BASE_URL}/licenses/${testLicenseId}`, {
      maxUsers: 150,
      notes: '已更新最大用户数'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      recordTest('更新授权信息', true, '最大用户数已更新为 150');
      return true;
    } else {
      recordTest('更新授权信息', false);
      return false;
    }
  } catch (error) {
    recordTest('更新授权信息', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试9: 停用授权 ==========
async function test9_DeactivateLicense() {
  console.log('\n【测试9】停用授权');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.post(`${BASE_URL}/licenses/${testLicenseId}/deactivate`, {
      reason: '测试停用功能'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      recordTest('停用授权', true, '授权已停用');
      return true;
    } else {
      recordTest('停用授权', false);
      return false;
    }
  } catch (error) {
    recordTest('停用授权', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试10: 重新激活授权 ==========
async function test10_ReactivateLicense() {
  console.log('\n【测试10】重新激活授权');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.post(`${BASE_URL}/licenses/${testLicenseId}/activate`, {
      machineId: 'TEST-MACHINE-REACTIVATE'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      recordTest('重新激活授权', true, '授权已重新激活');
      return true;
    } else {
      recordTest('重新激活授权', false);
      return false;
    }
  } catch (error) {
    recordTest('重新激活授权', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试11: 续期授权 ==========
async function test11_RenewLicense() {
  console.log('\n【测试11】续期授权');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const newExpiresAt = new Date();
    newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 2); // 续期2年

    const response = await axios.post(`${BASE_URL}/licenses/${testLicenseId}/renew`, {
      expiresAt: newExpiresAt.toISOString()
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      recordTest('续期授权', true, `新过期时间: ${newExpiresAt.toISOString().split('T')[0]}`);
      return true;
    } else {
      recordTest('续期授权', false);
      return false;
    }
  } catch (error) {
    recordTest('续期授权', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试12: 获取授权日志 ==========
async function test12_GetLicenseLogs() {
  console.log('\n【测试12】获取授权日志');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.get(`${BASE_URL}/licenses/${testLicenseId}/logs`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, pageSize: 10 }
    });

    if (response.data.success) {
      recordTest('获取授权日志', true,
        `共 ${response.data.data.total} 条日志, 当前页: ${response.data.data.list.length} 条`
      );
      return true;
    } else {
      recordTest('获取授权日志', false);
      return false;
    }
  } catch (error) {
    recordTest('获取授权日志', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试13: 筛选授权（按状态） ==========
async function test13_FilterByStatus() {
  console.log('\n【测试13】筛选授权（按状态）');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.get(`${BASE_URL}/licenses`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { status: 'active', page: 1, pageSize: 10 }
    });

    if (response.data.success) {
      recordTest('筛选授权（按状态）', true, `找到 ${response.data.data.total} 条激活状态的授权`);
      return true;
    } else {
      recordTest('筛选授权（按状态）', false);
      return false;
    }
  } catch (error) {
    recordTest('筛选授权（按状态）', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试14: 筛选授权（按类型） ==========
async function test14_FilterByType() {
  console.log('\n【测试14】筛选授权（按类型）');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.get(`${BASE_URL}/licenses`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { licenseType: 'annual', page: 1, pageSize: 10 }
    });

    if (response.data.success) {
      recordTest('筛选授权（按类型）', true, `找到 ${response.data.data.total} 条年付版授权`);
      return true;
    } else {
      recordTest('筛选授权（按类型）', false);
      return false;
    }
  } catch (error) {
    recordTest('筛选授权（按类型）', false, error.response?.data?.message || error.message);
    return false;
  }
}

// ========== 测试15: 验证无效授权码 ==========
async function test15_VerifyInvalidLicense() {
  console.log('\n【测试15】验证无效授权码');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const response = await axios.post(`${VERIFY_URL}/license`, {
      licenseKey: 'INVALID-KEY-12345',
      machineId: 'TEST-MACHINE'
    }, config);

    // 应该返回失败
    if (!response.data.success || response.status === 404) {
      recordTest('验证无效授权码', true, '正确识别无效授权码');
      return true;
    } else {
      recordTest('验证无效授权码', false, '未能识别无效授权码');
      return false;
    }
  } catch (error) {
    // 404错误是预期的
    if (error.response?.status === 404) {
      recordTest('验证无效授权码', true, '正确识别无效授权码');
      return true;
    }
    recordTest('验证无效授权码', false, error.message);
    return false;
  }
}

// ========== 主测试流程 ==========
async function runAllTests() {
  console.log('开始时间:', new Date().toLocaleString());
  console.log('');

  // 执行所有测试
  await test1_AdminLogin();

  if (!authToken) {
    console.log('\n❌ 登录失败，无法继续测试');
    return;
  }

  await test2_GetStatistics();
  await test3_GetLicenseList();
  await test4_SearchLicense();
  await test5_CreateLicense();

  if (!testLicenseId) {
    console.log('\n❌ 创建授权失败，部分测试无法执行');
  } else {
    await test6_GetLicenseDetail();
    await test7_VerifyLicense();
    await test8_UpdateLicense();
    await test9_DeactivateLicense();
    await test10_ReactivateLicense();
    await test11_RenewLicense();
    await test12_GetLicenseLogs();
  }

  await test13_FilterByStatus();
  await test14_FilterByType();
  await test15_VerifyInvalidLicense();

  // 打印测试报告
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                      测试报告                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`总测试数: ${testResults.total}`);
  console.log(`通过: ${testResults.passed} ✅`);
  console.log(`失败: ${testResults.failed} ❌`);
  console.log(`通过率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  console.log('');
  console.log('结束时间:', new Date().toLocaleString());
  console.log('');

  if (testResults.failed === 0) {
    console.log('🎉 恭喜！所有测试通过！第一阶段授权管理模块验收成功！');
  } else {
    console.log('⚠️  部分测试失败，请检查失败的测试项');
    console.log('');
    console.log('失败的测试:');
    testResults.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.message}`);
    });
  }

  process.exit(testResults.failed === 0 ? 0 : 1);
}

// 运行测试
runAllTests().catch(error => {
  console.error('测试执行出错:', error);
  process.exit(1);
});
