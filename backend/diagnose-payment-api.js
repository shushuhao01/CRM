/**
 * 诊断支付API问题
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1/admin';

async function diagnose() {
  console.log('='.repeat(60));
  console.log('支付API诊断');
  console.log('='.repeat(60));

  try {
    // 1. 测试登录
    console.log('\n1. 测试登录...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (!loginRes.data.success) {
      console.log('❌ 登录失败');
      return;
    }

    const token = loginRes.data.data.token;
    console.log('✅ 登录成功');

    const api = axios.create({
      baseURL: API_BASE,
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // 2. 测试支付订单列表
    console.log('\n2. 测试支付订单列表...');
    try {
      const ordersRes = await api.get('/payment/orders', {
        params: { page: 1, pageSize: 10 }
      });
      console.log('✅ 订单列表请求成功');
      console.log('   返回数据:', JSON.stringify(ordersRes.data, null, 2));
    } catch (error) {
      console.log('❌ 订单列表请求失败');
      console.log('   状态码:', error.response?.status);
      console.log('   错误信息:', error.response?.data);
      console.log('   完整错误:', error.message);
    }

    // 3. 测试支付统计
    console.log('\n3. 测试支付统计...');
    try {
      const statsRes = await api.get('/payment/stats');
      console.log('✅ 统计请求成功');
      console.log('   返回数据:', JSON.stringify(statsRes.data, null, 2));
    } catch (error) {
      console.log('❌ 统计请求失败');
      console.log('   状态码:', error.response?.status);
      console.log('   错误信息:', error.response?.data);
    }

    // 4. 测试统计API
    console.log('\n4. 测试统计API...');
    try {
      const dashboardRes = await api.get('/statistics/dashboard');
      console.log('✅ 仪表盘统计请求成功');
      console.log('   返回数据:', JSON.stringify(dashboardRes.data, null, 2));
    } catch (error) {
      console.log('❌ 仪表盘统计请求失败');
      console.log('   状态码:', error.response?.status);
      console.log('   错误信息:', error.response?.data);
    }

  } catch (error) {
    console.error('\n诊断过程出错:', error.message);
  }
}

diagnose();
