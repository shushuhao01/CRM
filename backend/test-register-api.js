const http = require('http');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function test() {
  console.log('=== 测试注册页面套餐集成 ===\n');

  try {
    const data = await httpGet('http://localhost:3000/api/v1/public/packages');

    if (data.code !== 0) {
      console.error('❌ 获取套餐失败:', data.message);
      return;
    }

    const packages = data.data;
    console.log(`✅ 成功获取 ${packages.length} 个套餐\n`);

    const saasPackages = packages.filter(p => p.type === 'saas');
    const privatePackages = packages.filter(p => p.type === 'private');

    console.log('SaaS套餐:');
    saasPackages.forEach(pkg => {
      console.log(`  - ${pkg.name} (${pkg.code}): ¥${pkg.price}/月`);
    });

    console.log('\n私有部署套餐:');
    privatePackages.forEach(pkg => {
      console.log(`  - ${pkg.name} (${pkg.code}): ¥${pkg.price.toLocaleString()}`);
    });

    console.log('\n✅ 测试完成');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

test();
