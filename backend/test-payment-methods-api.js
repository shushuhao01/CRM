const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

// 测试用户登录信息
const testUser = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 正在登录...');
    const response = await axios.post(`${API_BASE}/auth/login`, testUser);

    if (response.data.success && response.data.data.tokens?.accessToken) {
      authToken = response.data.data.tokens.accessToken;
      console.log('✅ 登录成功');
      console.log('Token:', authToken.substring(0, 20) + '...');
      return true;
    } else {
      console.error('❌ 登录失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.response?.data || error.message);
    return false;
  }
}

async function testGetPaymentMethods() {
  try {
    console.log('\n📋 测试获取支付方式列表...');
    const response = await axios.get(`${API_BASE}/system/payment-methods`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ 获取成功');
    console.log('支付方式数量:', response.data.data?.length || 0);
    console.log('支付方式列表:', JSON.stringify(response.data.data, null, 2));
    return response.data.data;
  } catch (error) {
    console.error('❌ 获取失败:', error.response?.data || error.message);
    return null;
  }
}

async function testAddPaymentMethod() {
  try {
    console.log('\n➕ 测试添加支付方式...');
    const newMethod = {
      label: '测试支付方式',
      value: 'test_payment_' + Date.now()
    };

    console.log('请求数据:', newMethod);

    const response = await axios.post(
      `${API_BASE}/system/payment-methods`,
      newMethod,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    console.log('✅ 添加成功');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    return response.data.data;
  } catch (error) {
    console.error('❌ 添加失败');
    console.error('状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data || error.message);
    console.error('完整错误:', JSON.stringify(error.response?.data, null, 2));
    return null;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('支付方式配置API测试');
  console.log('='.repeat(60));

  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ 登录失败，无法继续测试');
    return;
  }

  // 2. 获取现有支付方式
  await testGetPaymentMethods();

  // 3. 添加新支付方式
  const newMethod = await testAddPaymentMethod();

  // 4. 再次获取列表验证
  if (newMethod) {
    console.log('\n🔍 验证添加结果...');
    await testGetPaymentMethods();
  }

  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

runTests().catch(console.error);
