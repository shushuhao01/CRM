/**
 * 测试套餐数据显示
 * 检查套餐数据是否正确返回给前端
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1/admin';

async function testPackagesDisplay() {
  console.log('\n🧪 测试套餐数据显示\n');
  console.log('============================================================\n');

  try {
    // 1. 登录
    console.log('1️⃣ 管理员登录...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (!loginRes.data.success) {
      throw new Error('登录失败');
    }

    const token = loginRes.data.data.token;
    console.log('   ✅ 登录成功\n');

    // 2. 获取SaaS套餐
    console.log('2️⃣ 获取SaaS套餐列表...');
    const saasRes = await axios.get(`${API_BASE}/packages`, {
      params: { type: 'saas' },
      headers: { Authorization: `Bearer ${token}` }
    });

    if (saasRes.data.success) {
      const saasPackages = saasRes.data.data.list || saasRes.data.data || [];
      console.log(`   ✅ 获取成功，共 ${saasPackages.length} 个套餐\n`);

      saasPackages.forEach(pkg => {
        console.log(`   📦 ${pkg.name}`);
        console.log(`      代码: ${pkg.code}`);
        console.log(`      价格: ¥${pkg.price}/${pkg.billing_cycle}`);
        console.log(`      状态: ${pkg.status}`);
        console.log(`      用户数: ${pkg.max_users}`);
        console.log(`      存储: ${pkg.max_storage_gb}GB`);
        console.log(`      功能: ${pkg.features?.length || 0} 项`);
        console.log(`      试用: ${pkg.is_trial ? '是' : '否'}`);
        console.log(`      推荐: ${pkg.is_recommended ? '是' : '否'}`);
        console.log(`      显示: ${pkg.is_visible ? '是' : '否'}`);
        console.log(`      排序: ${pkg.sort_order}`);
        console.log('');
      });
    }

    // 3. 获取私有部署套餐
    console.log('3️⃣ 获取私有部署套餐列表...');
    const privateRes = await axios.get(`${API_BASE}/packages`, {
      params: { type: 'private' },
      headers: { Authorization: `Bearer ${token}` }
    });

    if (privateRes.data.success) {
      const privatePackages = privateRes.data.data.list || privateRes.data.data || [];
      console.log(`   ✅ 获取成功，共 ${privatePackages.length} 个套餐\n`);

      privatePackages.forEach(pkg => {
        console.log(`   📦 ${pkg.name}`);
        console.log(`      代码: ${pkg.code}`);
        console.log(`      价格: ¥${pkg.price}/${pkg.billing_cycle}`);
        console.log(`      状态: ${pkg.status}`);
        console.log(`      用户数: ${pkg.max_users}`);
        console.log(`      功能: ${pkg.features?.length || 0} 项`);
        console.log(`      推荐: ${pkg.is_recommended ? '是' : '否'}`);
        console.log(`      显示: ${pkg.is_visible ? '是' : '否'}`);
        console.log(`      排序: ${pkg.sort_order}`);
        console.log('');
      });
    }

    // 4. 检查数据完整性
    console.log('4️⃣ 检查数据完整性...');
    const saasPackages = saasRes.data.data.list || saasRes.data.data || [];
    const privatePackages = privateRes.data.data.list || privateRes.data.data || [];
    const allPackages = [...saasPackages, ...privatePackages];

    const issues = [];
    allPackages.forEach(pkg => {
      if (!pkg.name) issues.push(`套餐 ${pkg.id} 缺少名称`);
      if (!pkg.code) issues.push(`套餐 ${pkg.id} 缺少代码`);
      if (pkg.price === undefined) issues.push(`套餐 ${pkg.id} 缺少价格`);
      if (!pkg.status) issues.push(`套餐 ${pkg.id} 状态为空或禁用`);
      if (!Array.isArray(pkg.features)) issues.push(`套餐 ${pkg.id} 功能特性不是数组`);
    });

    if (issues.length > 0) {
      console.log('   ⚠️  发现问题:');
      issues.forEach(issue => console.log(`      - ${issue}`));
    } else {
      console.log('   ✅ 数据完整性检查通过');
    }

    console.log('\n============================================================');
    console.log('✅ 测试完成\n');
    console.log('💡 提示:');
    console.log('   1. 如果套餐显示"禁用",请检查status字段');
    console.log('   2. 如果功能特性为空,请检查features字段');
    console.log('   3. 前端地址: http://localhost:5174');
    console.log('   4. 套餐管理页面: http://localhost:5174/tenant-customers/packages');

  } catch (error) {
    console.error('\n❌ 测试失败:');
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   响应:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   错误:', error.message);
    }
    process.exit(1);
  }
}

testPackagesDisplay();
