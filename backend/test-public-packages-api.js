/**
 * 测试公开套餐API
 */
const axios = require('axios');

async function test() {
  console.log('\n🧪 测试公开套餐API\n');

  try {
    // 1. 获取所有套餐
    console.log('1️⃣ 获取所有套餐...');
    const allRes = await axios.get('http://localhost:3000/api/v1/public/packages');
    console.log(`   ✅ 成功，共 ${allRes.data.data.length} 个套餐`);
    allRes.data.data.forEach(pkg => {
      console.log(`      - ${pkg.name} (${pkg.type}) - status: ${pkg.status}, visible: ${pkg.is_visible}`);
    });

    // 2. 获取SaaS套餐
    console.log('\n2️⃣ 获取SaaS套餐...');
    const saasRes = await axios.get('http://localhost:3000/api/v1/public/packages?type=saas');
    console.log(`   ✅ 成功，共 ${saasRes.data.data.length} 个SaaS套餐`);
    saasRes.data.data.forEach(pkg => {
      console.log(`      - ${pkg.name} - ¥${pkg.price}/${pkg.billing_cycle}`);
    });

    // 3. 获取私有部署套餐
    console.log('\n3️⃣ 获取私有部署套餐...');
    const privateRes = await axios.get('http://localhost:3000/api/v1/public/packages?type=private');
    console.log(`   ✅ 成功，共 ${privateRes.data.data.length} 个私有部署套餐`);
    privateRes.data.data.forEach(pkg => {
      console.log(`      - ${pkg.name} - ¥${pkg.price}`);
    });

    // 4. 根据代码获取套餐详情
    if (allRes.data.data.length > 0) {
      const firstPkg = allRes.data.data[0];
      console.log(`\n4️⃣ 获取套餐详情 (${firstPkg.code})...`);
      const detailRes = await axios.get(`http://localhost:3000/api/v1/public/packages/${firstPkg.code}`);
      console.log(`   ✅ 成功: ${detailRes.data.data.name}`);
      console.log(`      描述: ${detailRes.data.data.description || '无'}`);
      console.log(`      功能: ${detailRes.data.data.features?.length || 0} 项`);
    }

    console.log('\n✅ 所有测试通过！官网可以正常获取套餐数据了\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   响应:', error.response.data);
    }
  }
}

test();
