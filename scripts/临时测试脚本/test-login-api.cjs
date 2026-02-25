const axios = require('axios');

async function testLogin() {
  console.log('=== 测试后端登录API ===\n');

  const apiUrl = 'http://localhost:3000/api/v1/auth/login';
  const credentials = {
    username: 'admin',
    password: 'admin123'
  };

  console.log('API地址:', apiUrl);
  console.log('登录凭证:', credentials);
  console.log('');

  try {
    const response = await axios.post(apiUrl, credentials, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    console.log('✅ 登录成功！');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ 登录失败！');

    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('无响应，请求已发送但未收到响应');
      console.log('错误:', error.message);
    } else {
      console.log('请求配置错误:', error.message);
    }
  }
}

testLogin();
