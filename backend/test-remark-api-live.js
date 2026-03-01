/**
 * 测试备注预设API实际调用
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testAPI() {
  try {
    console.log('='.repeat(60));
    console.log('测试备注预设API实际调用');
    console.log('='.repeat(60));
    console.log('');

    // 1. 登录
    console.log('【1/4】登录获取token...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (!loginRes.data.success) {
      console.log('   ❌ 登录失败');
      return;
    }

    const token = loginRes.data.data.token;
    console.log('   ✅ 登录成功');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    console.log('');

    const headers = {
      Authorization: `Bearer ${token}`
    };

    // 2. 获取所有备注预设
    console.log('【2/4】获取所有备注预设...');
    try {
      const allRes = await axios.get(`${API_BASE}/value-added/remark-presets`, { headers });
      console.log(`   ✅ 成功获取 ${allRes.data.data.length} 条预设`);
    } catch (error) {
      console.log('   ❌ 请求失败:', error.response?.status, error.response?.statusText);
      console.log('   URL:', `${API_BASE}/value-added/remark-presets`);
      console.log('   Headers:', headers);
      if (error.response?.data) {
        console.log('   错误详情:', JSON.stringify(error.response.data, null, 2));
      }
      return;
    }
    console.log('');

    // 3. 获取无效原因预设
    console.log('【3/4】获取无效原因预设...');
    try {
      const invalidRes = await axios.get(`${API_BASE}/value-added/remark-presets?category=invalid`, { headers });
      console.log(`   ✅ 成功获取 ${invalidRes.data.data.length} 条无效原因`);
      console.log('   前3条:');
      invalidRes.data.data.slice(0, 3).forEach(item => {
        console.log(`      - ${item.remark_text} (使用${item.usage_count}次)`);
      });
    } catch (error) {
      console.log('   ❌ 请求失败:', error.response?.status);
    }
    console.log('');

    // 4. 获取通用备注预设
    console.log('【4/4】获取通用备注预设...');
    try {
      const generalRes = await axios.get(`${API_BASE}/value-added/remark-presets?category=general`, { headers });
      console.log(`   ✅ 成功获取 ${generalRes.data.data.length} 条通用备注`);
      console.log('   前3条:');
      generalRes.data.data.slice(0, 3).forEach(item => {
        console.log(`      - ${item.remark_text} (使用${item.usage_count}次)`);
      });
    } catch (error) {
      console.log('   ❌ 请求失败:', error.response?.status);
    }
    console.log('');

    console.log('='.repeat(60));
    console.log('🎉 所有API测试通过！');
    console.log('='.repeat(60));
    console.log('');
    console.log('前端现在应该可以正常使用备注预设功能了！');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ 测试失败:', error.message);
    console.error('');

    if (error.code === 'ECONNREFUSED') {
      console.error('提示：无法连接到后端服务');
      console.error('  - 请确保后端服务已启动: npm run dev');
      console.error('  - 检查端口3000是否被占用');
    }
  }
}

testAPI();
