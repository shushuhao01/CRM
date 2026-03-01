/**
 * 测试取消默认公司
 */
const axios = require('axios');

async function testCancelDefault() {
  try {
    // 先登录获取token
    console.log('正在登录...');
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginRes.data.data?.tokens?.accessToken || loginRes.data.data?.token || loginRes.data.token;
    if (!token) {
      throw new Error('未获取到token');
    }
    console.log('登录成功');

    // 测试取消默认
    console.log('\n测试取消默认公司...');
    const cancelRes = await axios.put(
      'http://localhost:3000/api/v1/value-added/companies/none/set-default',
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('取消成功:');
    console.log(JSON.stringify(cancelRes.data, null, 2));

    // 验证结果
    console.log('\n验证结果...');
    const companiesRes = await axios.get('http://localhost:3000/api/v1/value-added/companies', {
      params: { pageSize: 1000 },
      headers: { Authorization: `Bearer ${token}` }
    });

    const companies = companiesRes.data.data?.list || companiesRes.data.list || [];
    const defaultCompany = companies.find(c => c.isDefault === 1);

    if (defaultCompany) {
      console.log('❌ 还有默认公司:', defaultCompany.companyName);
    } else {
      console.log('✅ 已成功取消所有默认公司');
    }

  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

testCancelDefault();
