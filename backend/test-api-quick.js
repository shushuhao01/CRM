const axios = require('axios');

async function testAPIs() {
  const BASE_URL = 'http://localhost:3000/api/v1/admin';

  // 先登录获取token
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.data.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    console.log('✅ 登录成功\n');

    // 测试邮件配置API
    console.log('测试: GET /system/email-settings');
    try {
      const res = await axios.get(`${BASE_URL}/system/email-settings`, { headers });
      console.log('✅ 邮件配置API正常\n');
    } catch (e) {
      console.log(`❌ 邮件配置API失败: ${e.response?.status} ${e.response?.data?.message || e.message}\n`);
    }

    // 测试超时提醒配置API
    console.log('测试: GET /timeout-reminder/config');
    try {
      const res = await axios.get(`${BASE_URL}/timeout-reminder/config`, { headers });
      console.log('✅ 超时提醒配置API正常\n');
    } catch (e) {
      console.log(`❌ 超时提醒配置API失败: ${e.response?.status} ${e.response?.data?.message || e.message}\n`);
    }

    // 测试短信配置API
    console.log('测试: GET /system-config/sms');
    try {
      const res = await axios.get(`${BASE_URL}/system-config/sms`, { headers });
      console.log('✅ 短信配置API正常\n');
    } catch (e) {
      console.log(`❌ 短信配置API失败: ${e.response?.status} ${e.response?.data?.message || e.message}\n`);
    }

  } catch (e) {
    console.log('❌ 登录失败:', e.message);
  }
}

testAPIs();
