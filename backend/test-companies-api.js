/**
 * 测试外包公司API
 */
const axios = require('axios');

async function testCompaniesAPI() {
  try {
    console.log('测试外包公司API...');

    // 先登录获取token
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginRes.data.data.token;
    console.log('✅ 登录成功，获取到token');

    // 测试获取公司列表
    const companiesRes = await axios.get('http://localhost:3000/api/v1/value-added/companies', {
      params: { page: 1, pageSize: 10 },
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ 获取公司列表成功');
    console.log('公司数量:', companiesRes.data.data.list.length);
    console.log('公司列表:', JSON.stringify(companiesRes.data.data.list, null, 2));

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
      console.error('错误详情:', error.response.data.message);
    }
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
  }
}

testCompaniesAPI();
