/**
 * 测试从Admin后台到官网的完整流程
 */
const axios = require('axios');

async function test() {
  console.log('\n🔄 测试Admin后台到官网的完整流程\n');

  try {
    // 1. 登录Admin
    console.log('1️⃣ 登录Admin后台...');
    const loginRes = await axios.post('http://localhost:3000/api/v1/admin/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('   ✅ 登录成功');

    // 2. 查看当前所有套餐
    console.log('\n2️⃣ 查看当前所有套餐...');
    const allRes = await axios.get('http://localhost:3000/api/v1/admin/packages', { headers });
    console.log(`   共 ${allRes.data.data.list.length} 个套餐:`);
    allRes.data.data.list.forEach(pkg => {
      console.log(`   - ${pkg.name}: status=${pkg.status}, visible=${pkg.is_visible}`);
    });

    // 3. 查看官网API返回的套餐
    console.log('\n3️⃣ 查看官网API返回的套餐...');
    const publicRes = await axios.get('http://localhost:3000/api/v1/public/packages');
    console.log(`   官网显示 ${publicRes.data.data.length} 个套餐:`);
    publicRes.data.data.forEach(pkg => {
      console.log(`   - ${pkg.name} (${pkg.type}): ¥${pkg.price}`);
    });

    // 4. 分析差异
    console.log('\n4️⃣ 分析差异...');
    const adminCount = allRes.data.data.list.length;
    const publicCount = publicRes.data.data.length;
    console.log(`   Admin后台: ${adminCount} 个套餐`);
    console.log(`   官网显示: ${publicCount} 个套餐`);

    if (adminCount > publicCount) {
      console.log(`\n   ⚠️  有 ${adminCount - publicCount} 个套餐未在官网显示`);
      console.log('   可能原因:');
      allRes.data.data.list.forEach(pkg => {
        const inPublic = publicRes.data.data.find(p => p.id === pkg.id);
        if (!inPublic) {
          const reasons = [];
          if (!pkg.status || pkg.status === 0) reasons.push('未启用');
          if (!pkg.is_visible || pkg.is_visible === 0) reasons.push('未设置官网显示');
          console.log(`   - ${pkg.name}: ${reasons.join(', ')}`);
        }
      });
    }

    // 5. 测试创建并立即在官网显示
    console.log('\n5️⃣ 测试创建套餐并立即在官网显示...');
    const testPkg = {
      name: '官网测试套餐',
      code: 'WEBSITE_TEST_' + Date.now(),
      type: 'saas',
      description: '测试官网显示',
      price: 399,
      billing_cycle: 'monthly',
      duration_days: 30,
      max_users: 30,
      max_storage_gb: 30,
      features: ['测试功能1', '测试功能2'],
      is_trial: 0,
      is_recommended: 1,
      is_visible: 1,  // 官网显示
      sort_order: 999,
      status: 1  // 启用
    };

    const createRes = await axios.post(
      'http://localhost:3000/api/v1/admin/packages',
      testPkg,
      { headers }
    );
    const newPkgId = createRes.data.data.id;
    console.log(`   ✅ 创建成功，ID: ${newPkgId}`);

    // 6. 立即检查官网API
    console.log('\n6️⃣ 检查官网API是否立即显示...');
    const publicRes2 = await axios.get('http://localhost:3000/api/v1/public/packages?type=saas');
    const found = publicRes2.data.data.find(p => p.id === newPkgId);

    if (found) {
      console.log(`   ✅ 成功！官网API立即返回了新套餐`);
      console.log(`   - 名称: ${found.name}`);
      console.log(`   - 价格: ¥${found.price}`);
      console.log(`   - 推荐: ${found.is_recommended ? '是' : '否'}`);
    } else {
      console.log(`   ❌ 失败！官网API未返回新套餐`);
    }

    // 7. 清理测试数据
    console.log('\n7️⃣ 清理测试数据...');
    await axios.delete(
      `http://localhost:3000/api/v1/admin/packages/${newPkgId}`,
      { headers }
    );
    console.log(`   ✅ 删除成功`);

    console.log('\n✅ 测试完成！\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   响应:', error.response.data);
    }
  }
}

test();
