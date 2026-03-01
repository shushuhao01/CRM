/**
 * 测试状态配置接口
 */
const axios = require('axios');

async function testStatusConfigs() {
  try {
    // 先登录获取token
    console.log('正在登录...');
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginRes.data.data?.tokens?.accessToken || loginRes.data.data?.token || loginRes.data.token;
    if (!token) {
      console.error('登录响应:', JSON.stringify(loginRes.data, null, 2));
      throw new Error('未获取到token');
    }
    console.log('登录成功，Token:', token.substring(0, 20) + '...');

    // 测试获取状态配置
    console.log('\n测试获取状态配置...');
    const configRes = await axios.get('http://localhost:3000/api/v1/value-added/status-configs', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('\n状态配置返回:');
    console.log(JSON.stringify(configRes.data, null, 2));

    if (configRes.data.data) {
      console.log('\n有效状态列表:');
      configRes.data.data.validStatus.forEach(item => {
        console.log(`  - ${item.label} (${item.value})`);
      });

      console.log('\n结算状态列表:');
      configRes.data.data.settlementStatus.forEach(item => {
        console.log(`  - ${item.label} (${item.value})`);
      });
    }

  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testStatusConfigs();
