/**
 * 测试数据看板API返回的数据
 */
const axios = require('axios');

async function testDashboardAPI() {
  try {
    console.log('=== 测试数据看板API响应 ===\n');

    // 先登录获取token
    console.log('正在登录...');
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.data.token;
    console.log('登录成功，获取到token\n');

    // 调用API
    const response = await axios.get('http://localhost:3000/api/v1/dashboard/metrics', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('API响应状态:', response.status);
    console.log('');

    const data = response.data.data;

    console.log('=== 本月业绩指标 ===');
    console.log('本月订单数:', data.monthlyOrders);
    console.log('本月订单环比:', data.monthlyOrdersChange, '%');
    console.log('本月订单趋势:', data.monthlyOrdersTrend);
    console.log('');

    console.log('本月业绩:', data.monthlyRevenue);
    console.log('本月业绩环比:', data.monthlyRevenueChange, '%');
    console.log('本月业绩趋势:', data.monthlyRevenueTrend);
    console.log('');

    console.log('=== 今日业绩指标 ===');
    console.log('今日订单数:', data.todayOrders);
    console.log('今日订单环比:', data.todayOrdersChange, '%');
    console.log('今日订单趋势:', data.todayOrdersTrend);
    console.log('');

    console.log('今日业绩:', data.todayRevenue);
    console.log('今日业绩环比:', data.todayRevenueChange, '%');
    console.log('今日业绩趋势:', data.todayRevenueTrend);
    console.log('');

    console.log('=== 签收业绩指标 ===');
    console.log('本月签收单数:', data.monthlyDeliveredCount);
    console.log('本月签收单数环比:', data.monthlyDeliveredCountChange, '%');
    console.log('本月签收单数趋势:', data.monthlyDeliveredCountTrend);
    console.log('');

    console.log('本月签收业绩:', data.monthlyDeliveredAmount);
    console.log('本月签收业绩环比:', data.monthlyDeliveredAmountChange, '%');
    console.log('本月签收业绩趋势:', data.monthlyDeliveredAmountTrend);
    console.log('');

    console.log('=== 完整响应数据 ===');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testDashboardAPI();
