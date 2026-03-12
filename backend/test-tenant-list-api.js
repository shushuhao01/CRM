/**
 * 测试租户列表API
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1/admin';

async function testTenantListAPI() {
  console.log('=== 测试租户列表API ===\n');

  try {
    // 1. 先登录获取token
    console.log('1. 登录获取token...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (!loginRes.data.success) {
      console.error('❌ 登录失败:', loginRes.data.message);
      return;
    }

    const token = loginRes.data.data.token;
    console.log('✅ 登录成功，token:', token.substring(0, 20) + '...\n');

    // 2. 测试获取租户列表
    console.log('2. 获取租户列表...');
    const listRes = await axios.get(`${API_BASE}/tenants`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 10
      }
    });

    console.log('✅ API响应成功');
    console.log('响应数据:', JSON.stringify(listRes.data, null, 2));

    if (listRes.data.success) {
      const { list, total } = listRes.data.data;
      console.log(`\n📊 租户总数: ${total}`);
      console.log(`📋 当前页数据: ${list.length} 条\n`);

      if (list.length > 0) {
        console.log('第一条租户数据:');
        console.log(JSON.stringify(list[0], null, 2));
      } else {
        console.log('⚠️  数据库中没有租户数据');
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testTenantListAPI();
