/**
 * 套餐管理API测试脚本
 * 测试所有套餐管理相关的API接口
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';
let authToken = '';
let testPackageId = null;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 1. 登录获取token
async function login() {
  try {
    log('\n========== 1. 管理员登录 ==========', 'blue');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.success) {
      authToken = response.data.data.token;
      log('✓ 登录成功', 'green');
      log(`Token: ${authToken.substring(0, 20)}...`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 登录失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 2. 获取套餐列表
async function getPackages() {
  try {
    log('\n========== 2. 获取套餐列表 ==========', 'blue');

    // 获取所有套餐
    const response = await axios.get(`${BASE_URL}/packages`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const { list, total } = response.data.data;
      log(`✓ 获取成功，共 ${total} 个套餐`, 'green');
      list.forEach(pkg => {
        log(`  - ${pkg.name} (${pkg.code}) - ${pkg.type} - ¥${pkg.price}/${pkg.billing_cycle}`, 'yellow');
      });
      return true;
    }
  } catch (error) {
    log(`✗ 获取失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 3. 按类型获取套餐
async function getPackagesByType() {
  try {
    log('\n========== 3. 按类型获取套餐 ==========', 'blue');

    // 获取SaaS套餐
    const saasResponse = await axios.get(`${BASE_URL}/packages?type=saas`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (saasResponse.data.success) {
      log(`✓ SaaS套餐: ${saasResponse.data.data.total} 个`, 'green');
    }

    // 获取私有部署套餐
    const privateResponse = await axios.get(`${BASE_URL}/packages?type=private`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (privateResponse.data.success) {
      log(`✓ 私有部署套餐: ${privateResponse.data.data.total} 个`, 'green');
    }

    return true;
  } catch (error) {
    log(`✗ 获取失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 4. 创建测试套餐
async function createPackage() {
  try {
    log('\n========== 4. 创建测试套餐 ==========', 'blue');

    const packageData = {
      name: '测试套餐',
      code: 'TEST_PACKAGE_' + Date.now(),
      type: 'saas',
      description: '这是一个测试套餐',
      price: 199.00,
      original_price: 299.00,
      billing_cycle: 'monthly',
      duration_days: 30,
      max_users: 20,
      max_storage_gb: 10,
      features: ['测试功能1', '测试功能2', '测试功能3'],
      is_trial: false,
      is_recommended: false,
      is_visible: true,
      sort_order: 99,
      status: true
    };

    const response = await axios.post(`${BASE_URL}/packages`, packageData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      testPackageId = response.data.data.id;
      log('✓ 创建成功', 'green');
      log(`  套餐ID: ${testPackageId}`, 'yellow');
      log(`  套餐名称: ${response.data.data.name}`, 'yellow');
      log(`  套餐代码: ${response.data.data.code}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 创建失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 5. 获取套餐详情
async function getPackageDetail() {
  try {
    log('\n========== 5. 获取套餐详情 ==========', 'blue');

    const response = await axios.get(`${BASE_URL}/packages/${testPackageId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const pkg = response.data.data;
      log('✓ 获取成功', 'green');
      log(`  套餐名称: ${pkg.name}`, 'yellow');
      log(`  套餐代码: ${pkg.code}`, 'yellow');
      log(`  套餐类型: ${pkg.type}`, 'yellow');
      log(`  价格: ¥${pkg.price}/${pkg.billing_cycle}`, 'yellow');
      log(`  用户数: ${pkg.max_users}`, 'yellow');
      log(`  存储空间: ${pkg.max_storage_gb}GB`, 'yellow');
      log(`  功能特性: ${pkg.features?.join(', ')}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 获取失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 6. 更新套餐
async function updatePackage() {
  try {
    log('\n========== 6. 更新套餐 ==========', 'blue');

    const updateData = {
      name: '测试套餐（已更新）',
      price: 299.00,
      max_users: 30,
      features: ['更新功能1', '更新功能2', '更新功能3', '新增功能4']
    };

    const response = await axios.put(`${BASE_URL}/packages/${testPackageId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      log('✓ 更新成功', 'green');
      log(`  新名称: ${response.data.data.name}`, 'yellow');
      log(`  新价格: ¥${response.data.data.price}`, 'yellow');
      log(`  新用户数: ${response.data.data.max_users}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 更新失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 7. 切换套餐状态
async function togglePackageStatus() {
  try {
    log('\n========== 7. 切换套餐状态 ==========', 'blue');

    const response = await axios.post(`${BASE_URL}/packages/${testPackageId}/toggle-status`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      log(`✓ ${response.data.message}`, 'green');
      log(`  当前状态: ${response.data.data.status ? '启用' : '禁用'}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 切换失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 8. 获取推荐套餐
async function getRecommendedPackages() {
  try {
    log('\n========== 8. 获取推荐套餐 ==========', 'blue');

    const response = await axios.get(`${BASE_URL}/packages/recommended`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const packages = response.data.data;
      log(`✓ 获取成功，共 ${packages.length} 个推荐套餐`, 'green');
      packages.forEach(pkg => {
        log(`  - ${pkg.name} (${pkg.type})`, 'yellow');
      });
      return true;
    }
  } catch (error) {
    log(`✗ 获取失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 9. 获取可见套餐
async function getVisiblePackages() {
  try {
    log('\n========== 9. 获取可见套餐（官网展示） ==========', 'blue');

    const response = await axios.get(`${BASE_URL}/packages/visible?type=saas`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const packages = response.data.data;
      log(`✓ 获取成功，共 ${packages.length} 个可见套餐`, 'green');
      packages.forEach(pkg => {
        log(`  - ${pkg.name} - ¥${pkg.price}/${pkg.billing_cycle}`, 'yellow');
      });
      return true;
    }
  } catch (error) {
    log(`✗ 获取失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 10. 删除测试套餐
async function deletePackage() {
  try {
    log('\n========== 10. 删除测试套餐 ==========', 'blue');

    const response = await axios.delete(`${BASE_URL}/packages/${testPackageId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      log('✓ 删除成功', 'green');
      return true;
    }
  } catch (error) {
    log(`✗ 删除失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║     套餐管理API测试 - 开始测试         ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  const tests = [
    { name: '登录', fn: login },
    { name: '获取套餐列表', fn: getPackages },
    { name: '按类型获取套餐', fn: getPackagesByType },
    { name: '创建测试套餐', fn: createPackage },
    { name: '获取套餐详情', fn: getPackageDetail },
    { name: '更新套餐', fn: updatePackage },
    { name: '切换套餐状态', fn: togglePackageStatus },
    { name: '获取推荐套餐', fn: getRecommendedPackages },
    { name: '获取可见套餐', fn: getVisiblePackages },
    { name: '删除测试套餐', fn: deletePackage }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
    // 等待一下，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║          测试结果统计                  ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');
  log(`总测试数: ${tests.length}`, 'yellow');
  log(`通过: ${passed}`, 'green');
  log(`失败: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`成功率: ${((passed / tests.length) * 100).toFixed(2)}%`, passed === tests.length ? 'green' : 'yellow');

  if (passed === tests.length) {
    log('\n🎉 所有测试通过！套餐管理API工作正常！', 'green');
  } else {
    log('\n⚠️  部分测试失败，请检查错误信息', 'red');
  }
}

// 执行测试
runAllTests().catch(error => {
  log(`\n✗ 测试执行出错: ${error.message}`, 'red');
  process.exit(1);
});
