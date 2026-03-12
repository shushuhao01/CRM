/**
 * 测试 Admin 系统配置 API
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';

// 模拟管理员登录获取 token
async function getAdminToken() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    return response.data.data.token;
  } catch (error) {
    console.error('登录失败:', error.response?.data || error.message);
    return null;
  }
}

// 测试系统配置 API
async function testSystemConfigAPIs() {
  console.log('=== 测试 Admin 系统配置 API ===\n');

  const token = await getAdminToken();
  if (!token) {
    console.error('❌ 无法获取管理员 token，测试终止');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`
  };

  // 测试 1: 获取短信配置
  console.log('1. 测试获取短信配置');
  try {
    const response = await axios.get(`${BASE_URL}/system-config/sms`, { headers });
    console.log('✅ 短信配置 API 正常');
    console.log('   响应:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ 短信配置 API 失败');
    console.error('   错误:', error.response?.status, error.response?.data || error.message);
  }
  console.log('');

  // 测试 2: 获取邮件配置
  console.log('2. 测试获取邮件配置');
  try {
    const response = await axios.get(`${BASE_URL}/system/email-settings`, { headers });
    console.log('✅ 邮件配置 API 正常');
    console.log('   响应:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ 邮件配置 API 失败');
    console.error('   错误:', error.response?.status, error.response?.data || error.message);
  }
  console.log('');

  // 测试 3: 获取超时提醒配置
  console.log('3. 测试获取超时提醒配置');
  try {
    const response = await axios.get(`${BASE_URL}/timeout-reminder/config`, { headers });
    console.log('✅ 超时提醒配置 API 正常');
    console.log('   响应:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ 超时提醒配置 API 失败');
    console.error('   错误:', error.response?.status, error.response?.data || error.message);
  }
  console.log('');

  // 测试 4: 测试路由注册情况
  console.log('4. 测试所有可能的路径组合');
  const paths = [
    '/system-config/sms',
    '/admin/system-config/sms',
    '/system/email-settings',
    '/admin/system/email-settings',
    '/timeout-reminder/config',
    '/admin/timeout-reminder/config'
  ];

  for (const path of paths) {
    try {
      await axios.get(`${BASE_URL}${path}`, { headers });
      console.log(`✅ ${path} - 可访问`);
    } catch (error) {
      console.log(`❌ ${path} - ${error.response?.status || 'ERROR'}`);
    }
  }
}

testSystemConfigAPIs().catch(console.error);
