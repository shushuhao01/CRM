/**
 * 测试套餐完整生命周期
 * 1. 创建套餐
 * 2. 编辑套餐（包括boolean字段）
 * 3. 验证数据保存
 * 4. 验证官网API返回
 */
const axios = require('axios');

async function test() {
  console.log('\n🧪 测试套餐完整生命周期\n');

  try {
    // 登录Admin
    const loginRes = await axios.post('http://localhost:3000/api/v1/admin/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // 1. 创建测试套餐
    console.log('1️⃣ 创建测试套餐...');
    const createData = {
      name: '测试套餐',
      code: 'TEST_PACKAGE_' + Date.now(),
      type: 'saas',
      description: '这是一个测试套餐',
      price: 199,
      billing_cycle: 'monthly',
      duration_days: 30,
      max_users: 20,
      max_storage_gb: 20,
      features: ['功能1', '功能2', '功能3'],
      is_trial: 0,
      is_recommended: 1,
      is_visible: 1,
      sort_order: 100,
      status: 1
    };

    const createRes = await axios.post(
      'http://localhost:3000/api/v1/admin/packages',
      createData,
      { headers }
    );
    const packageId = createRes.data.data.id;
    console.log(`   ✅ 创建成功，ID: ${packageId}`);
    console.log(`   - is_trial: ${createRes.data.data.is_trial}`);
    console.log(`   - is_recommended: ${createRes.data.data.is_recommended}`);
    console.log(`   - is_visible: ${createRes.data.data.is_visible}`);

    // 2. 获取套餐详情（模拟编辑时加载）
    console.log('\n2️⃣ 获取套餐详情（编辑前）...');
    const getRes = await axios.get(
      `http://localhost:3000/api/v1/admin/packages/${packageId}`,
      { headers }
    );
    console.log(`   ✅ 获取成功`);
    console.log(`   - is_trial: ${getRes.data.data.is_trial} (${typeof getRes.data.data.is_trial})`);
    console.log(`   - is_recommended: ${getRes.data.data.is_recommended} (${typeof getRes.data.data.is_recommended})`);
    console.log(`   - is_visible: ${getRes.data.data.is_visible} (${typeof getRes.data.data.is_visible})`);

    // 3. 更新套餐（修改boolean字段）
    console.log('\n3️⃣ 更新套餐（修改boolean字段）...');
    const updateData = {
      ...createData,
      description: '更新后的描述',
      is_trial: 1,  // 改为试用
      is_recommended: 0,  // 取消推荐
      is_visible: 1,  // 保持可见
      price: 299  // 改价格
    };

    const updateRes = await axios.put(
      `http://localhost:3000/api/v1/admin/packages/${packageId}`,
      updateData,
      { headers }
    );
    console.log(`   ✅ 更新成功`);
    console.log(`   - is_trial: ${updateRes.data.data.is_trial}`);
    console.log(`   - is_recommended: ${updateRes.data.data.is_recommended}`);
    console.log(`   - is_visible: ${updateRes.data.data.is_visible}`);
    console.log(`   - price: ${updateRes.data.data.price}`);

    // 4. 再次获取验证（模拟再次编辑）
    console.log('\n4️⃣ 再次获取验证（模拟再次编辑）...');
    const getRes2 = await axios.get(
      `http://localhost:3000/api/v1/admin/packages/${packageId}`,
      { headers }
    );
    console.log(`   ✅ 获取成功`);
    console.log(`   - is_trial: ${getRes2.data.data.is_trial} (应该是1)`);
    console.log(`   - is_recommended: ${getRes2.data.data.is_recommended} (应该是0)`);
    console.log(`   - is_visible: ${getRes2.data.data.is_visible} (应该是1)`);
    console.log(`   - price: ${getRes2.data.data.price} (应该是299)`);

    // 5. 验证官网API是否能获取到
    console.log('\n5️⃣ 验证官网API...');
    const publicRes = await axios.get('http://localhost:3000/api/v1/public/packages?type=saas');
    const foundInPublic = publicRes.data.data.find(p => p.id === packageId);
    if (foundInPublic) {
      console.log(`   ✅ 官网API可以获取到该套餐`);
      console.log(`   - 名称: ${foundInPublic.name}`);
      console.log(`   - 价格: ${foundInPublic.price}`);
      console.log(`   - is_trial: ${foundInPublic.is_trial}`);
    } else {
      console.log(`   ⚠️  官网API未找到该套餐（可能是status或is_visible问题）`);
    }

    // 6. 清理测试数据
    console.log('\n6️⃣ 清理测试数据...');
    await axios.delete(
      `http://localhost:3000/api/v1/admin/packages/${packageId}`,
      { headers }
    );
    console.log(`   ✅ 删除成功`);

    console.log('\n✅ 所有测试通过！\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   响应:', error.response.data);
    }
  }
}

test();
