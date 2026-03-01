const http = require('http');

// 从环境变量或配置中获取测试用户的token
// 你需要先登录获取token，或者使用一个已知的有效token
const TEST_TOKEN = process.argv[2] || '';

if (!TEST_TOKEN) {
  console.log('❌ 请提供测试token');
  console.log('用法: node test-value-added-with-auth.js <your-token>');
  console.log('\n如何获取token:');
  console.log('1. 打开浏览器开发者工具（F12）');
  console.log('2. 切换到Application标签');
  console.log('3. 在Storage > Local Storage中找到token');
  console.log('4. 或者在Network标签中查看请求头的Authorization字段');
  process.exit(1);
}

async function testAPI() {
  console.log('🧪 测试增值管理API（带认证）...\n');

  // 测试1: 获取状态配置
  console.log('1️⃣ 测试获取状态配置...');
  try {
    const response = await makeRequest('/api/v1/value-added/status-configs', TEST_TOKEN);
    console.log('   ✅ 状态配置API正常');
    console.log('   📊 返回数据:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.log('   ❌ 状态配置API失败:', error.message);
  }

  // 测试2: 获取外包公司列表
  console.log('\n2️⃣ 测试获取外包公司列表...');
  try {
    const response = await makeRequest('/api/v1/value-added/companies?pageSize=10', TEST_TOKEN);
    console.log('   ✅ 外包公司API正常');
    console.log('   📊 返回数据:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.log('   ❌ 外包公司API失败:', error.message);
  }

  // 测试3: 获取费用配置列表
  console.log('\n3️⃣ 测试获取费用配置列表...');
  try {
    const response = await makeRequest('/api/v1/value-added/price-configs?pageSize=10', TEST_TOKEN);
    console.log('   ✅ 费用配置API正常');
    console.log('   📊 返回数据:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.log('   ❌ 费用配置API失败:', error.message);
  }

  // 测试4: 获取增值订单列表
  console.log('\n4️⃣ 测试获取增值订单列表...');
  try {
    const response = await makeRequest('/api/v1/value-added/orders?page=1&pageSize=10&dateFilter=thisMonth', TEST_TOKEN);
    console.log('   ✅ 增值订单API正常');
    console.log('   📊 返回数据:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.log('   ❌ 增值订单API失败:', error.message);
    console.log('   📝 详细错误:', error);
  }

  // 测试5: 获取统计数据
  console.log('\n5️⃣ 测试获取统计数据...');
  try {
    const response = await makeRequest('/api/v1/value-added/stats?dateFilter=thisMonth', TEST_TOKEN);
    console.log('   ✅ 统计数据API正常');
    console.log('   📊 返回数据:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.log('   ❌ 统计数据API失败:', error.message);
  }

  console.log('\n🎉 API测试完成！');
}

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve(json);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${json.message || data}`));
          }
        } catch (e) {
          reject(new Error(`解析响应失败: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

testAPI();
