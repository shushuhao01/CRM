/**
 * Admin前端登录功能测试
 * 测试前端通过Vite代理访问后端API
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:5174';
const API_BASE = '/api/v1/admin';

async function testFrontendLogin() {
  console.log('🧪 测试Admin前端登录功能\n');
  console.log('============================================================\n');

  try {
    // 1. 测试通过前端代理访问登录接口
    console.log('1️⃣ 测试前端代理登录: POST /api/v1/admin/auth/login');
    console.log(`   前端地址: ${FRONTEND_URL}`);
    console.log(`   API路径: ${API_BASE}/auth/login`);
    console.log('   请求数据: { username: "admin", password: "admin123" }\n');

    const loginResponse = await axios.post(
      `${FRONTEND_URL}${API_BASE}/auth/login`,
      {
        username: 'admin',
        password: 'admin123'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (loginResponse.data.success) {
      console.log('   ✅ 前端代理登录成功');
      console.log(`   Token: ${loginResponse.data.data.token.substring(0, 50)}...`);
      console.log('   用户信息:', JSON.stringify(loginResponse.data.data.admin, null, 2));
      console.log('');

      const token = loginResponse.data.data.token;

      // 2. 测试通过前端代理获取个人信息
      console.log('2️⃣ 测试前端代理获取个人信息: GET /api/v1/admin/auth/profile\n');

      const profileResponse = await axios.get(
        `${FRONTEND_URL}${API_BASE}/auth/profile`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (profileResponse.data.success) {
        console.log('   ✅ 获取个人信息成功');
        console.log('   用户信息:', JSON.stringify(profileResponse.data.data, null, 2));
        console.log('');
      }

      // 3. 测试通过前端代理获取租户列表
      console.log('3️⃣ 测试前端代理获取租户列表: GET /api/v1/admin/tenants\n');

      const tenantsResponse = await axios.get(
        `${FRONTEND_URL}${API_BASE}/tenants?page=1&pageSize=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (tenantsResponse.data.success) {
        console.log('   ✅ 获取租户列表成功');
        console.log(`   租户数量: ${tenantsResponse.data.data.total}`);
        console.log('');
      }

      console.log('============================================================');
      console.log('✅ 所有前端代理测试通过！\n');
      console.log('Admin管理后台访问信息：');
      console.log(`   URL: ${FRONTEND_URL}`);
      console.log('   用户名: admin');
      console.log('   密码: admin123');
      console.log('');
      console.log('💡 提示：');
      console.log('   1. 前端已启动在 http://localhost:5174');
      console.log('   2. 后端已启动在 http://localhost:3000');
      console.log('   3. Vite代理配置正确，/api/v1/admin 请求会转发到后端');
      console.log('   4. 现在可以在浏览器中访问 http://localhost:5174 进行登录');

    } else {
      console.log('   ❌ 登录失败:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('\n❌ 测试失败:');
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   连接被拒绝，请确认：');
      console.error('   1. Admin前端服务是否已启动 (npm run dev in admin/)');
      console.error('   2. 后端服务是否已启动 (npm run dev in backend/)');
      console.error('   3. 端口5174和3000是否被占用');
    } else {
      console.error('   错误信息:', error.message);
    }
    process.exit(1);
  }
}

testFrontendLogin();
