/**
 * 测试Admin后台基础配置API端点
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';

// 测试用的管理员账号
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

// 登录获取token
async function login() {
  try {
    console.log('\n=== 1. 管理员登录 ===');
    const response = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);

    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✓ 登录成功');
      console.log('Token:', authToken.substring(0, 20) + '...');
      return true;
    } else {
      console.log('✗ 登录失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('✗ 登录请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试短信配置API
async function testSmsConfig() {
  try {
    console.log('\n=== 2. 测试短信配置API ===');

    // 获取短信配置
    console.log('2.1 获取短信配置...');
    const getResponse = await axios.get(`${BASE_URL}/system-config/sms`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✓ 获取成功:', JSON.stringify(getResponse.data, null, 2));

    // 保存短信配置
    console.log('\n2.2 保存短信配置...');
    const saveResponse = await axios.post(`${BASE_URL}/system-config/sms`, {
      enabled: false,
      accessKeyId: 'test_key',
      accessKeySecret: 'test_secret',
      signName: '测试签名',
      templateCode: 'SMS_123456'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✓ 保存成功:', saveResponse.data.message);

  } catch (error) {
    console.log('✗ 短信配置API失败:', error.response?.data?.message || error.message);
    console.log('请求URL:', error.config?.url);
  }
}

// 测试邮件配置API
async function testEmailConfig() {
  try {
    console.log('\n=== 3. 测试邮件配置API ===');

    // 获取邮件配置
    console.log('3.1 获取邮件配置...');
    const getResponse = await axios.get(`${BASE_URL}/system/email-settings`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✓ 获取成功:', JSON.stringify(getResponse.data, null, 2));

    // 保存邮件配置
    console.log('\n3.2 保存邮件配置...');
    const saveResponse = await axios.put(`${BASE_URL}/system/email-settings`, {
      enabled: false,
      smtpHost: 'smtp.test.com',
      smtpPort: 465,
      senderEmail: 'test@test.com',
      senderName: '测试系统',
      emailPassword: 'test_password',
      enableSsl: true,
      enableTls: false,
      testEmail: 'test@example.com'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✓ 保存成功:', saveResponse.data.message);

  } catch (error) {
    console.log('✗ 邮件配置API失败:', error.response?.data?.message || error.message);
    console.log('请求URL:', error.config?.url);
  }
}

// 测试超时提醒配置API
async function testTimeoutConfig() {
  try {
    console.log('\n=== 4. 测试超时提醒配置API ===');

    // 获取超时提醒配置
    console.log('4.1 获取超时提醒配置...');
    const getResponse = await axios.get(`${BASE_URL}/timeout-reminder/config`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✓ 获取成功:', JSON.stringify(getResponse.data, null, 2));

    // 保存超时提醒配置
    console.log('\n4.2 保存超时提醒配置...');
    const saveResponse = await axios.put(`${BASE_URL}/timeout-reminder/config`, {
      enabled: false,
      orderAuditTimeout: 24,
      orderShipmentTimeout: 48,
      afterSalesTimeout: 48,
      orderFollowupDays: 3,
      checkIntervalMinutes: 30
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✓ 保存成功:', saveResponse.data.message);

    // 手动触发检测
    console.log('\n4.3 手动触发超时检测...');
    const checkResponse = await axios.post(`${BASE_URL}/timeout-reminder/check`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✓ 检测成功:', checkResponse.data.message);

  } catch (error) {
    console.log('✗ 超时提醒配置API失败:', error.response?.data?.message || error.message);
    console.log('请求URL:', error.config?.url);
  }
}

// 主测试流程
async function runTests() {
  console.log('========================================');
  console.log('Admin后台基础配置API测试');
  console.log('========================================');

  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n✗ 登录失败，无法继续测试');
    return;
  }

  // 测试各个API
  await testSmsConfig();
  await testEmailConfig();
  await testTimeoutConfig();

  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================\n');
}

// 运行测试
runTests().catch(error => {
  console.error('测试过程出错:', error);
  process.exit(1);
});
