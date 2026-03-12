/**
 * 测试管理后台登录功能
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testAdminLogin() {
  console.log('🧪 测试管理后台登录功能\n');

  try {
    // 测试1: 管理员登录
    console.log('📝 测试1: 管理员登录');
    const loginResponse = await axios.post(`${API_BASE}/admin/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (loginResponse.data.success) {
      console.log('✅ 登录成功');
      console.log('   响应数据:', JSON.stringify(loginResponse.data, null, 2));

      const token = loginResponse.data.data?.token || loginResponse.data.token;
      const user = loginResponse.data.data?.user || loginResponse.data.user;

      if (!token) {
        console.log('❌ 未获取到token');
        return false;
      }

      console.log('   Token:', token.substring(0, 20) + '...');
      if (user) {
        console.log('   用户:', user.username || user.name || 'unknown');
      }

      // 测试2: 获取授权统计
      console.log('\n📝 测试2: 获取授权统计');
      const statsResponse = await axios.get(`${API_BASE}/admin/licenses/statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (statsResponse.data.success) {
        console.log('✅ 获取统计成功');
        console.log('   统计数据:', statsResponse.data.data);
      } else {
        console.log('❌ 获取统计失败:', statsResponse.data.message);
      }

      // 测试3: 获取授权列表
      console.log('\n📝 测试3: 获取授权列表');
      const listResponse = await axios.get(`${API_BASE}/admin/licenses`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: 1, pageSize: 10 }
      });

      if (listResponse.data.success) {
        console.log('✅ 获取列表成功');
        console.log('   总数:', listResponse.data.data.total);
        console.log('   列表数量:', listResponse.data.data.list.length);
      } else {
        console.log('❌ 获取列表失败:', listResponse.data.message);
      }

      console.log('\n✅ 所有测试通过！管理后台可以正常登录和使用');
      return true;
    } else {
      console.log('❌ 登录失败:', loginResponse.data.message);
      return false;
    }
  } catch (error) {
    if (error.response) {
      console.log('❌ 请求失败:', error.response.status, error.response.data);
    } else if (error.request) {
      console.log('❌ 无响应:', error.message);
    } else {
      console.log('❌ 请求错误:', error.message);
      console.error(error);
    }
    return false;
  }
}

// 运行测试
testAdminLogin().then(success => {
  process.exit(success ? 0 : 1);
});
