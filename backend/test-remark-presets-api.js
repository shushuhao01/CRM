/**
 * 测试备注预设API
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

// 从环境变量或使用测试账号
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

async function testRemarkPresetsAPI() {
  try {
    console.log('=== 测试备注预设API ===');
    console.log('');

    // 1. 登录获取token
    console.log('1. 登录...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, TEST_USER);
    const token = loginRes.data.data.token;
    console.log('   ✅ 登录成功');
    console.log('');

    const headers = {
      Authorization: `Bearer ${token}`
    };

    // 2. 获取所有备注预设
    console.log('2. 获取所有备注预设...');
    const allRes = await axios.get(`${API_BASE}/value-added/remark-presets`, { headers });
    console.log('   ✅ 获取成功');
    console.log('   总数:', allRes.data.data.length);
    console.log('');

    // 3. 获取无效原因预设
    console.log('3. 获取无效原因预设...');
    const invalidRes = await axios.get(`${API_BASE}/value-added/remark-presets?category=invalid`, { headers });
    console.log('   ✅ 获取成功');
    console.log('   数量:', invalidRes.data.data.length);
    invalidRes.data.data.slice(0, 3).forEach(item => {
      console.log(`   - ${item.remark_text} (使用${item.usage_count}次)`);
    });
    console.log('');

    // 4. 获取通用备注预设
    console.log('4. 获取通用备注预设...');
    const generalRes = await axios.get(`${API_BASE}/value-added/remark-presets?category=general`, { headers });
    console.log('   ✅ 获取成功');
    console.log('   数量:', generalRes.data.data.length);
    generalRes.data.data.slice(0, 3).forEach(item => {
      console.log(`   - ${item.remark_text} (使用${item.usage_count}次)`);
    });
    console.log('');

    console.log('✅ 所有API测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.error('');
      console.error('提示：请确保后端服务已启动 (npm run dev)');
    }
  }
}

testRemarkPresetsAPI();
