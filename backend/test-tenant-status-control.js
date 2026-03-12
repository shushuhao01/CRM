/**
 * 测试租户状态控制功能
 *
 * 测试内容：
 * 1. 启用/禁用租户 (status: active <-> inactive)
 * 2. 暂停/恢复授权 (licenseStatus: active <-> suspended)
 * 3. 续期租户
 * 4. 状态组合验证
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:3000/api/v1/admin';
let adminToken = '';
let testTenantId = '';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// 管理员登录
async function adminLogin() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.success) {
      adminToken = response.data.data.token;
      log('✅ 管理员登录成功', 'green');
      return true;
    }
  } catch (error) {
    log('❌ 管理员登录失败: ' + error.message, 'red');
    return false;
  }
}

// 创建测试租户
async function createTestTenant() {
  try {
    const response = await axios.post(
      `${BASE_URL}/tenants`,
      {
        name: '状态控制测试租户',
        code: `TEST_STATUS_${Date.now()}`,
        maxUsers: 10,
        maxStorageGb: 5,
        expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1年后
        contact: '测试联系人',
        phone: '13800138000',
        email: 'test@example.com'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      testTenantId = response.data.data.id;
      log(`✅ 测试租户创建成功`, 'green');
      log(`   租户ID: ${testTenantId}`, 'blue');
      log(`   租户名称: ${response.data.data.name}`, 'blue');
      log(`   初始状态: status=${response.data.data.status}, licenseStatus=${response.data.data.licenseStatus}`, 'blue');
      return true;
    }
  } catch (error) {
    log('❌ 创建测试租户失败: ' + error.message, 'red');
    return false;
  }
}

// 获取租户详情
async function getTenantDetail() {
  try {
    const response = await axios.get(
      `${BASE_URL}/tenants/${testTenantId}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      const tenant = response.data.data;
      return {
        status: tenant.status,
        licenseStatus: tenant.licenseStatus,
        isAvailable: tenant.isAvailable,
        expireDate: tenant.expireDate
      };
    }
  } catch (error) {
    log('❌ 获取租户详情失败: ' + error.message, 'red');
    return null;
  }
}

// 测试1: 暂停和恢复授权
async function testSuspendResume() {
  section('【测试1】暂停和恢复授权 (licenseStatus)');

  // 1. 暂停授权
  try {
    log('\n1️⃣ 暂停租户授权...', 'yellow');
    const response = await axios.post(
      `${BASE_URL}/tenants/${testTenantId}/suspend`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log('✅ 授权暂停成功', 'green');
      const detail = await getTenantDetail();
      log(`   当前状态: status=${detail.status}, licenseStatus=${detail.licenseStatus}`, 'blue');
      log(`   是否可用: ${detail.isAvailable ? '是' : '否'}`, detail.isAvailable ? 'green' : 'red');
    }
  } catch (error) {
    log('❌ 暂停授权失败: ' + error.response?.data?.message || error.message, 'red');
  }

  // 2. 尝试重复暂停（应该失败）
  try {
    log('\n2️⃣ 尝试重复暂停（应该失败）...', 'yellow');
    await axios.post(
      `${BASE_URL}/tenants/${testTenantId}/suspend`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    log('❌ 应该失败但成功了', 'red');
  } catch (error) {
    if (error.response?.status === 400) {
      log('✅ 正确拒绝: ' + error.response.data.message, 'green');
    } else {
      log('❌ 错误类型不对: ' + error.message, 'red');
    }
  }

  // 3. 恢复授权
  try {
    log('\n3️⃣ 恢复租户授权...', 'yellow');
    const response = await axios.post(
      `${BASE_URL}/tenants/${testTenantId}/resume`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log('✅ 授权恢复成功', 'green');
      const detail = await getTenantDetail();
      log(`   当前状态: status=${detail.status}, licenseStatus=${detail.licenseStatus}`, 'blue');
      log(`   是否可用: ${detail.isAvailable ? '是' : '否'}`, detail.isAvailable ? 'green' : 'red');
    }
  } catch (error) {
    log('❌ 恢复授权失败: ' + error.response?.data?.message || error.message, 'red');
  }
}

// 测试2: 启用和禁用租户
async function testEnableDisable() {
  section('【测试2】启用和禁用租户 (status)');

  // 1. 禁用租户
  try {
    log('\n1️⃣ 禁用租户...', 'yellow');
    const response = await axios.post(
      `${BASE_URL}/tenants/${testTenantId}/disable`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log('✅ 租户禁用成功', 'green');
      const detail = await getTenantDetail();
      log(`   当前状态: status=${detail.status}, licenseStatus=${detail.licenseStatus}`, 'blue');
      log(`   是否可用: ${detail.isAvailable ? '是' : '否'}`, detail.isAvailable ? 'green' : 'red');
    }
  } catch (error) {
    log('❌ 禁用租户失败: ' + error.response?.data?.message || error.message, 'red');
  }

  // 2. 启用租户
  try {
    log('\n2️⃣ 启用租户...', 'yellow');
    const response = await axios.post(
      `${BASE_URL}/tenants/${testTenantId}/enable`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log('✅ 租户启用成功', 'green');
      const detail = await getTenantDetail();
      log(`   当前状态: status=${detail.status}, licenseStatus=${detail.licenseStatus}`, 'blue');
      log(`   是否可用: ${detail.isAvailable ? '是' : '否'}`, detail.isAvailable ? 'green' : 'red');
    }
  } catch (error) {
    log('❌ 启用租户失败: ' + error.response?.data?.message || error.message, 'red');
  }
}

// 测试3: 状态组合验证
async function testStatusCombinations() {
  section('【测试3】状态组合验证');

  const combinations = [
    { status: 'active', licenseStatus: 'active', expected: true, desc: '正常状态' },
    { status: 'active', licenseStatus: 'suspended', expected: false, desc: '授权暂停' },
    { status: 'inactive', licenseStatus: 'active', expected: false, desc: '租户禁用' },
    { status: 'inactive', licenseStatus: 'suspended', expected: false, desc: '双重禁用' }
  ];

  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];
    log(`\n${i + 1}️⃣ 测试组合: ${combo.desc}`, 'yellow');
    log(`   设置: status=${combo.status}, licenseStatus=${combo.licenseStatus}`, 'blue');

    try {
      // 设置状态
      if (combo.status === 'active') {
        await axios.post(`${BASE_URL}/tenants/${testTenantId}/enable`, {}, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
      } else {
        await axios.post(`${BASE_URL}/tenants/${testTenantId}/disable`, {}, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
      }

      if (combo.licenseStatus === 'active') {
        await axios.post(`${BASE_URL}/tenants/${testTenantId}/resume`, {}, {
          headers: { Authorization: `Bearer ${adminToken}` }
        }).catch(() => {}); // 可能已经是active
      } else {
        await axios.post(`${BASE_URL}/tenants/${testTenantId}/suspend`, {}, {
          headers: { Authorization: `Bearer ${adminToken}` }
        }).catch(() => {}); // 可能已经是suspended
      }

      // 验证结果
      const detail = await getTenantDetail();
      const isAvailable = detail.isAvailable;

      if (isAvailable === combo.expected) {
        log(`✅ 验证通过: 是否可用=${isAvailable}`, 'green');
      } else {
        log(`❌ 验证失败: 期望=${combo.expected}, 实际=${isAvailable}`, 'red');
      }
    } catch (error) {
      log(`❌ 测试失败: ${error.message}`, 'red');
    }
  }
}

// 测试4: 续期功能
async function testRenew() {
  section('【测试4】续期功能');

  try {
    log('\n1️⃣ 获取当前过期时间...', 'yellow');
    const beforeDetail = await getTenantDetail();
    log(`   当前过期时间: ${beforeDetail.expireDate}`, 'blue');

    log('\n2️⃣ 续期6个月...', 'yellow');
    const response = await axios.post(
      `${BASE_URL}/tenants/${testTenantId}/renew`,
      { months: 6 },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      log('✅ 续期成功', 'green');
      const afterDetail = await getTenantDetail();
      log(`   新过期时间: ${afterDetail.expireDate}`, 'blue');

      const beforeDate = new Date(beforeDetail.expireDate);
      const afterDate = new Date(afterDetail.expireDate);
      const diffMonths = Math.round((afterDate - beforeDate) / (30 * 24 * 60 * 60 * 1000));
      log(`   延长了约 ${diffMonths} 个月`, 'green');
    }
  } catch (error) {
    log('❌ 续期失败: ' + error.response?.data?.message || error.message, 'red');
  }
}

// 清理测试数据
async function cleanup() {
  section('【清理】删除测试数据');

  try {
    await axios.delete(
      `${BASE_URL}/tenants/${testTenantId}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    log('✅ 测试租户已删除', 'green');
  } catch (error) {
    log('❌ 删除测试租户失败: ' + error.message, 'red');
  }
}

// 主函数
async function main() {
  console.log('\n' + '='.repeat(60));
  log('租户状态控制功能测试', 'cyan');
  console.log('='.repeat(60));

  // 1. 管理员登录
  if (!await adminLogin()) {
    log('\n❌ 测试终止：管理员登录失败', 'red');
    return;
  }

  // 2. 创建测试租户
  if (!await createTestTenant()) {
    log('\n❌ 测试终止：创建测试租户失败', 'red');
    return;
  }

  // 3. 执行测试
  await testSuspendResume();
  await testEnableDisable();
  await testStatusCombinations();
  await testRenew();

  // 4. 清理
  await cleanup();

  // 5. 总结
  section('【完成】所有测试完成');
  log('\n测试说明：', 'cyan');
  log('• status (租户状态): active=启用, inactive=禁用', 'blue');
  log('• licenseStatus (授权状态): active=激活, suspended=暂停, pending=待激活, expired=已过期', 'blue');
  log('• 租户可用条件: status=active && licenseStatus=active && !isExpired()', 'blue');
  log('\n操作接口：', 'cyan');
  log('• POST /tenants/:id/enable   - 启用租户 (status: inactive -> active)', 'blue');
  log('• POST /tenants/:id/disable  - 禁用租户 (status: active -> inactive)', 'blue');
  log('• POST /tenants/:id/suspend  - 暂停授权 (licenseStatus: active -> suspended)', 'blue');
  log('• POST /tenants/:id/resume   - 恢复授权 (licenseStatus: suspended -> active)', 'blue');
  log('• POST /tenants/:id/renew    - 续期租户 (延长过期时间)', 'blue');
}

// 运行测试
main().catch(error => {
  log('\n❌ 测试过程出错: ' + error.message, 'red');
  console.error(error);
  process.exit(1);
});
