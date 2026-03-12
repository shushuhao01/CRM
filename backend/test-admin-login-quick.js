/**
 * 快速测试Admin登录API
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';

async function testAdminLogin() {
  console.log('========== 测试Admin登录API ==========\n');

  try {
    console.log('请求地址:', `${BASE_URL}/auth/login`);
    console.log('请求数据:', { username: 'admin', password: 'admin123' });

    const res = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    console.log('\n✅ 登录成功!');
    console.log('响应数据:', JSON.stringify(res.data, null, 2));
    console.log('\nToken:', res.data.data?.token?.substring(0, 50) + '...');
  } catch (error) {
    console.error('\n❌ 登录失败!');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('无响应:', error.message);
      console.error('可能原因: 后端服务未启动或端口不正确');
    } else {
      console.error('错误:', error.message);
    }
  }
}

testAdminLogin();
