/**
 * 调试Admin路由问题
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';

async function test() {
  try {
    // 1. 登录
    console.log('1. 登录...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginRes.data.data.token;
    console.log('✓ 登录成功，Token:', token.substring(0, 30) + '...');

    // 2. 测试邮件配置路由
    console.log('\n2. 测试邮件配置路由...');
    console.log('请求URL:', `${BASE_URL}/system/email-settings`);

    try {
      const emailRes = await axios.get(`${BASE_URL}/system/email-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✓ 邮件配置路由成功:', emailRes.data);
    } catch (error) {
      console.log('✗ 邮件配置路由失败');
      console.log('状态码:', error.response?.status);
      console.log('错误信息:', error.response?.data);
      console.log('请求路径:', error.config?.url);
    }

    // 3. 测试超时提醒路由
    console.log('\n3. 测试超时提醒路由...');
    console.log('请求URL:', `${BASE_URL}/timeout-reminder/config`);

    try {
      const timeoutRes = await axios.get(`${BASE_URL}/timeout-reminder/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✓ 超时提醒路由成功:', timeoutRes.data);
    } catch (error) {
      console.log('✗ 超时提醒路由失败');
      console.log('状态码:', error.response?.status);
      console.log('错误信息:', error.response?.data);
      console.log('请求路径:', error.config?.url);
    }

    // 4. 测试短信配置路由（已知可以工作）
    console.log('\n4. 测试短信配置路由（对照组）...');
    console.log('请求URL:', `${BASE_URL}/system-config/sms`);

    try {
      const smsRes = await axios.get(`${BASE_URL}/system-config/sms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✓ 短信配置路由成功:', smsRes.data);
    } catch (error) {
      console.log('✗ 短信配置路由失败');
      console.log('状态码:', error.response?.status);
      console.log('错误信息:', error.response?.data);
    }

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

test();
