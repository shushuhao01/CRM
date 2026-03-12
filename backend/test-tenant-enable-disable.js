/**
 * 测试租户启用/禁用API
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';

// 从环境变量或命令行参数获取token
const token = process.env.ADMIN_TOKEN || 'your-admin-token-here';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

async function testEnableDisable() {
  console.log('=== 测试租户启用/禁用API ===\n');

  try {
    // 1. 获取租户列表
    console.log('1. 获取租户列表...');
    const listRes = await api.get('/tenants', {
      params: { page: 1, pageSize: 10 }
    });

    if (!listRes.data.success || !listRes.data.data.list.length) {
      console.log('❌ 没有找到租户数据');
      return;
    }

    const tenant = listRes.data.data.list[0];
    console.log(`✅ 找到租户: ${tenant.name} (ID: ${tenant.id})`);
    console.log(`   当前状态: ${tenant.status}`);
    console.log('');

    // 2. 测试禁用
    if (tenant.status === 'active') {
      console.log('2. 测试禁用租户...');
      try {
        const disableRes = await api.post(`/tenants/${tenant.id}/disable`);
        console.log('✅ 禁用成功:', disableRes.data);
      } catch (error) {
        console.log('❌ 禁用失败:', error.response?.data || error.message);
        console.log('   请求URL:', `${BASE_URL}/tenants/${tenant.id}/disable`);
      }
      console.log('');
    }

    // 3. 测试启用
    console.log('3. 测试启用租户...');
    try {
      const enableRes = await api.post(`/tenants/${tenant.id}/enable`);
      console.log('✅ 启用成功:', enableRes.data);
    } catch (error) {
      console.log('❌ 启用失败:', error.response?.data || error.message);
      console.log('   请求URL:', `${BASE_URL}/tenants/${tenant.id}/enable`);
    }
    console.log('');

    // 4. 验证状态
    console.log('4. 验证最终状态...');
    const verifyRes = await api.get(`/tenants/${tenant.id}`);
    console.log(`✅ 最终状态: ${verifyRes.data.data.status}`);

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n提示: 请设置正确的 ADMIN_TOKEN 环境变量');
      console.log('例如: ADMIN_TOKEN=your-token node test-tenant-enable-disable.js');
    }
  }
}

// 运行测试
testEnableDisable();
