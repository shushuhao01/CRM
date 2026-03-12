/**
 * 测试官网是否能正确调用API
 */
const axios = require('axios');

async function test() {
  console.log('\n🌐 测试官网API调用\n');

  try {
    // 1. 直接测试公开API
    console.log('1️⃣ 测试公开API（后端直接调用）...');
    const backendRes = await axios.get('http://localhost:3000/api/v1/public/packages');
    console.log(`   ✅ 后端API返回 ${backendRes.data.data.length} 个套餐`);
    backendRes.data.data.slice(0, 3).forEach(pkg => {
      console.log(`   - ${pkg.name}: ¥${pkg.price}`);
    });

    // 2. 模拟官网调用（通过代理）
    console.log('\n2️⃣ 测试官网代理（模拟浏览器调用）...');
    try {
      const websiteRes = await axios.get('http://localhost:8080/api/v1/public/packages');
      console.log(`   ✅ 官网代理返回 ${websiteRes.data.data.length} 个套餐`);
      websiteRes.data.data.slice(0, 3).forEach(pkg => {
        console.log(`   - ${pkg.name}: ¥${pkg.price}`);
      });
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('   ⚠️  官网服务未启动（端口8080）');
        console.log('   请运行: cd website && npm run dev');
      } else {
        throw error;
      }
    }

    // 3. 对比数据
    console.log('\n3️⃣ 数据对比...');
    console.log('   如果官网显示的套餐与后端API不同，可能原因：');
    console.log('   1. 浏览器缓存了旧页面 → 按Ctrl+Shift+R强制刷新');
    console.log('   2. 官网服务需要重启 → 重启官网开发服务器');
    console.log('   3. API调用失败但有fallback数据 → 检查浏览器控制台');

    console.log('\n✅ 测试完成\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

test();
