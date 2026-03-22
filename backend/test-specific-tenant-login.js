/**
 * 测试特定租户登录
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testLogin() {
  try {
    console.log('🧪 测试租户登录...\n');

    // 测试欢乐颂租户
    const tenantId = '83a25b14-1aae-4183-affb-8e0240a8e6a5';
    const username = '15815897364';
    const password = 'Aa123456';

    console.log(`租户ID: ${tenantId}`);
    console.log(`用户名: ${username}`);
    console.log(`密码: ${password}\n`);

    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username,
      password,
      tenantId
    });

    if (loginRes.data.success) {
      console.log('✅ 登录成功!');
      console.log('\n返回数据:');
      console.log(JSON.stringify(loginRes.data, null, 2));
    } else {
      console.log('❌ 登录失败:', loginRes.data.message);
    }
  } catch (error) {
    if (error.response) {
      console.log('❌ 登录失败:');
      console.log('状态码:', error.response.status);
      console.log('错误信息:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ 请求失败:', error.message);
    }
  }
}

testLogin();
