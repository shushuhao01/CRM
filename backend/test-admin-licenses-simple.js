/**
 * 授权管理API简单测试
 * 测试Admin后台授权管理功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';

// 测试配置
const config = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

let authToken = '';

console.log('授权管理API简单测试');
console.log('确保后端服务运行在 http://localhost:3000\n');

// 测试函数
async function testAdminLogin() {
  console.log('📝 测试: 管理员登录');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    }, config);

    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✅ 登录成功');
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      console.log('❌ 登录失败: 响应格式不正确');
      return false;
    }
  } catch (error) {
    console.log('❌ 登录失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetLicenseStatistics() {
  console.log('\n📝 测试: 获取授权统计');
  try {
    const response = await axios.get(`${BASE_URL}/licenses/statistics`, {
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      console.log('✅ 获取统计成功');
      console.log('   统计数据:', JSON.stringify(response.data.data, null, 2));
      return true;
    } else {
      console.log('❌ 获取统计失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 获取统计失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetLicenseList() {
  console.log('\n📝 测试: 获取授权列表');
  try {
    const response = await axios.get(`${BASE_URL}/licenses`, {
      ...config,
      params: { page: 1, pageSize: 10 },
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      console.log('✅ 获取列表成功');
      console.log(`   总数: ${response.data.data.total}`);
      console.log(`   当前页数据: ${response.data.data.list.length} 条`);
      return true;
    } else {
      console.log('❌ 获取列表失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 获取列表失败:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testCreateLicense() {
  console.log('\n📝 测试: 创建授权');
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const response = await axios.post(`${BASE_URL}/licenses`, {
      customerName: '测试公司-' + Date.now(),
      customerContact: '张三',
      customerPhone: '13800138000',
      customerEmail: 'test@example.com',
      licenseType: 'trial',
      maxUsers: 20,
      maxStorageGb: 10,
      features: ['订单管理', '客户管理'],
      expiresAt: expiresAt.toISOString(),
      notes: '自动化测试创建'
    }, {
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      console.log('✅ 创建授权成功');
      console.log(`   授权ID: ${response.data.data.id}`);
      console.log(`   授权码: ${response.data.data.licenseKey}`);
      return response.data.data;
    } else {
      console.log('❌ 创建授权失败');
      return null;
    }
  } catch (error) {
    console.log('❌ 创建授权失败:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testVerifyLicense(licenseKey) {
  console.log('\n📝 测试: 验证授权');
  try {
    // 注意：验证接口是公开的，路径是 /admin/verify/license
    const response = await axios.post(`http://localhost:3000/api/v1/admin/verify/license`, {
      licenseKey: licenseKey,
      machineId: 'TEST-MACHINE-001'
    }, config);

    if (response.data.success) {
      console.log('✅ 验证授权成功');
      console.log(`   验证结果: ${response.data.data.valid ? '有效' : '无效'}`);
      console.log(`   消息: ${response.data.message || '验证通过'}`);
      return true;
    } else {
      console.log('❌ 验证授权失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 验证授权失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 主测试流程
async function runTests() {
  console.log('🚀 开始测试授权管理API\n');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  // 测试1: 管理员登录
  totalTests++;
  if (await testAdminLogin()) {
    passedTests++;
  } else {
    console.log('\n❌ 登录失败，无法继续测试');
    process.exit(1);
  }

  // 测试2: 获取授权统计
  totalTests++;
  if (await testGetLicenseStatistics()) {
    passedTests++;
  }

  // 测试3: 获取授权列表
  totalTests++;
  if (await testGetLicenseList()) {
    passedTests++;
  }

  // 测试4: 创建授权
  totalTests++;
  const newLicense = await testCreateLicense();
  if (newLicense) {
    passedTests++;

    // 测试5: 验证授权
    totalTests++;
    if (await testVerifyLicense(newLicense.licenseKey)) {
      passedTests++;
    }
  }

  // 测试总结
  console.log('\n============================================================');
  console.log('\n📊 测试总结');
  console.log(`   总测试数: ${totalTests}`);
  console.log(`   通过: ${passedTests}`);
  console.log(`   失败: ${totalTests - passedTests}`);
  console.log(`   通过率: ${((passedTests / totalTests) * 100).toFixed(2)}%`);

  if (passedTests === totalTests) {
    console.log('\n✅ 所有测试通过！');
  } else {
    console.log('\n⚠️  部分测试失败');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('\n❌ 测试过程中出现错误:', error.message);
  process.exit(1);
});
