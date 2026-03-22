/**
 * 测试租户创建功能
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testTenantCreation() {
  try {
    console.log('🧪 测试租户创建功能...\n');

    // 1. 先登录获取 token
    console.log('1️⃣ 登录 Admin 后台...');
    const loginRes = await axios.post(`${API_BASE}/admin/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (!loginRes.data.success) {
      console.error('❌ 登录失败:', loginRes.data.message);
      return;
    }

    const token = loginRes.data.data.token;
    console.log('✅ 登录成功\n');

    // 2. 创建租户
    console.log('2️⃣ 创建租户...');
    const tenantData = {
      name: '测试租户公司',
      contact: '张三',
      phone: '13800138000',
      email: 'test@example.com',
      maxUsers: 10,
      maxStorageGb: 5,
      expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    console.log('📤 请求数据:', JSON.stringify(tenantData, null, 2));

    const createRes = await axios.post(`${API_BASE}/admin/tenants`, tenantData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ 创建成功!');
    console.log('📥 响应数据:', JSON.stringify(createRes.data, null, 2));

  } catch (error) {
    console.error('\n❌ 测试失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('错误:', error.message);
    }
  }
}

testTenantCreation();
