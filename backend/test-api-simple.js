const axios = require('axios');

async function test() {
  try {
    // 登录
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    console.log('登录响应:', JSON.stringify(loginRes.data, null, 2));

    const token = loginRes.data.data?.tokens?.accessToken;
    if (!token) {
      console.log('未获取到token');
      return;
    }

    console.log('\n获取备注预设...');
    const res = await axios.get('http://localhost:3000/api/v1/value-added/remark-presets', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('成功！数量:', res.data.data.length);
    console.log('前3条:', res.data.data.slice(0, 3).map(r => r.remark_text));

  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
  }
}

test();
