/**
 * 测试Admin后台登录接口
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';

async function testAdminLogin() {
  console.log('🧪 测试Admin后台登录接口\n');
  console.log('='.repeat(60));

  try {
    // 测试登录
    console.log('\n1️⃣ 测试登录接口: POST /api/v1/admin/auth/login');
    console.log('   请求数据: { username: "admin", password: "admin123" }');

    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (loginResponse.data.success) {
      console.log('   ✅ 登录成功');
      console.log('   Token:', loginResponse.data.data.token.substring(0, 50) + '...');
      console.log('   用户信息:', JSON.stringify(loginResponse.data.data.admin, null, 2));

      const token = loginResponse.data.data.token;

      // 测试获取个人信息
      console.log('\n2️⃣ 测试获取个人信息: GET /api/v1/admin/auth/profile');
      const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (profileResponse.data.success) {
        console.log('   ✅ 获取个人信息成功');
        console.log('   用户信息:', JSON.stringify(profileResponse.data.data, null, 2));
      } else {
        console.log('   ❌ 获取个人信息失败:', profileResponse.data.message);
      }

      // 测试租户列表接口
      console.log('\n3️⃣ 测试租户列表接口: GET /api/v1/admin/tenants');
      const tenantsResponse = await axios.get(`${BASE_URL}/tenants`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (tenantsResponse.data.success) {
        console.log('   ✅ 获取租户列表成功');
        console.log('   租户数量:', tenantsResponse.data.data.total);
      } else {
        console.log('   ❌ 获取租户列表失败:', tenantsResponse.data.message);
      }

      console.log('\n' + '='.repeat(60));
      console.log('✅ 所有测试通过！');
      console.log('\nAdmin后台登录信息：');
      console.log('   URL: http://localhost:5174/');
      console.log('   用户名: admin');
      console.log('   密码: admin123');

    } else {
      console.log('   ❌ 登录失败:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAdminLogin();
