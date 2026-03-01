/**
 * 测试增值管理统计API
 */
const axios = require('axios');

async function testStatsAPI() {
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

    // 测试统计接口
    console.log('\n测试统计接口...');
    const statsRes = await axios.get('http://localhost:3000/api/v1/value-added/stats', {
      params: {
        dateFilter: 'thisMonth'
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('\n统计数据返回:');
    console.log(JSON.stringify(statsRes.data, null, 2));

    // 测试外包公司接口
    console.log('\n测试外包公司接口...');
    const companiesRes = await axios.get('http://localhost:3000/api/v1/value-added/companies', {
      params: {
        pageSize: 1000
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('\n外包公司数据返回:');
    console.log(JSON.stringify(companiesRes.data, null, 2));

  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testStatsAPI();
