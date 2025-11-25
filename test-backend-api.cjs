const http = require('http');

// 测试后端API是否可访问
function testAPI() {
  const postData = JSON.stringify({
    username: 'admin',
    password: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('=== 测试后端API ===\n');
  console.log('请求地址:', `http://${options.hostname}:${options.port}${options.path}`);
  console.log('请求数据:', postData);
  console.log('');

  const req = http.request(options, (res) => {
    console.log('响应状态码:', res.statusCode);
    console.log('响应头:', JSON.stringify(res.headers, null, 2));
    console.log('');

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('响应内容:');
      try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));

        if (json.success) {
          console.log('\n✅ 登录成功！后端API工作正常');
        } else {
          console.log('\n❌ 登录失败:', json.message);
        }
      } catch (e) {
        console.log(data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ 请求失败:', e.message);
  });

  req.write(postData);
  req.end();
}

testAPI();
