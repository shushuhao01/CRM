/**
 * 测试设置默认公司
 */
const axios = require('axios');

async function testSetDefault() {
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

    // 先获取公司列表
    console.log('\n获取公司列表...');
    const companiesRes = await axios.get('http://localhost:3000/api/v1/value-added/companies', {
      params: { pageSize: 1000 },
      headers: { Authorization: `Bearer ${token}` }
    });

    const companies = companiesRes.data.data?.list || companiesRes.data.list || [];
    console.log(`找到 ${companies.length} 个公司`);

    if (companies.length > 0) {
      const company = companies[0];
      console.log(`\n测试设置公司为默认: ${company.companyName} (${company.id})`);

      try {
        const setDefaultRes = await axios.put(
          `http://localhost:3000/api/v1/value-added/companies/${company.id}/set-default`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log('\n设置成功:');
        console.log(JSON.stringify(setDefaultRes.data, null, 2));
      } catch (error) {
        console.error('\n设置失败:');
        console.error('状态码:', error.response?.status);
        console.error('错误信息:', error.response?.data);
        console.error('完整错误:', error.message);
      }
    }

  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSetDefault();
