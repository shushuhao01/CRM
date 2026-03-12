const axios = require('axios');

(async () => {
  try {
    // 登录
    const loginRes = await axios.post('http://localhost:3000/api/v1/admin/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.data.token;
    console.log('✅ 登录成功');

    // 获取第一个租户
    const listRes = await axios.get('http://localhost:3000/api/v1/admin/tenants?page=1&pageSize=1', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tenantId = listRes.data.data.list[0].id;
    console.log(`✅ 获取租户ID: ${tenantId}`);

    // 测试导出
    const exportRes = await axios.post(
      `http://localhost:3000/api/v1/admin/tenants/${tenantId}/export`,
      { tables: ['customers'] },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    console.log('✅ 导出API响应:', JSON.stringify(exportRes.data, null, 2));

  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
  }
})();
