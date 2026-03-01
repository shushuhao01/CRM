/**
 * 测试批量搜索功能
 */
const axios = require('axios');

async function testBatchSearch() {
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

    // 测试批量搜索
    console.log('\n测试批量搜索...');
    const keywords = `ORD202603023297320
13570727366
SF7414G14519408`;

    console.log('搜索关键词:');
    console.log(keywords);

    const searchRes = await axios.get('http://localhost:3000/api/v1/value-added/orders', {
      params: {
        page: 1,
        pageSize: 10,
        keywords: keywords,
        tab: 'all',
        dateFilter: 'thisMonth'
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('\n搜索结果:');
    console.log(JSON.stringify(searchRes.data, null, 2));
    console.log(`\n找到 ${searchRes.data.data.total} 条记录`);

  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testBatchSearch();
