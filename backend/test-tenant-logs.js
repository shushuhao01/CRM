/**
 * 租户操作日志功能测试脚本
 *
 * 测试内容：
 * 1. 创建租户并记录日志
 * 2. 更新租户并记录日志
 * 3. 查询租户操作日志
 * 4. 查询所有日志
 * 5. 获取操作统计
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';

// 测试用的 Admin Token
let adminToken = '';
let testTenantId = '';

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 1. Admin 登录
 */
async function adminLogin() {
  console.log('\n📝 步骤 1: Admin 登录');
  console.log('='.repeat(50));

  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.success) {
      adminToken = response.data.data.token;
      console.log('✅ 登录成功');
      return true;
    } else {
      console.log('❌ 登录失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 2. 创建测试租户（会自动记录日志）
 */
async function createTestTenant() {
  console.log('\n📝 步骤 2: 创建测试租户');
  console.log('='.repeat(50));

  try {
    const response = await axios.post(
      `${BASE_URL}/tenants`,
      {
        name: '日志测试租户',
        code: `LOG_TEST_${Date.now()}`,
        maxUsers: 20,
        maxStorageGb: 50,
        contact: '测试联系人',
        phone: '13800138000',
        email: 'test@example.com'
      },
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      testTenantId = response.data.data.id;
      console.log('✅ 租户创建成功');
      console.log(`租户ID: ${testTenantId}`);
      return true;
    } else {
      console.log('❌ 创建失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 创建失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 3. 更新租户（会自动记录日志）
 */
async function updateTestTenant() {
  console.log('\n📝 步骤 3: 更新租户');
  console.log('='.repeat(50));

  try {
    const response = await axios.put(
      `${BASE_URL}/tenants/${testTenantId}`,
      {
        name: '日志测试租户（已更新）',
        maxUsers: 30
      },
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      console.log('✅ 租户更新成功');
      return true;
    } else {
      console.log('❌ 更新失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 更新失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 4. 暂停租户授权（会自动记录日志）
 */
async function suspendTestTenant() {
  console.log('\n📝 步骤 4: 暂停租户授权');
  console.log('='.repeat(50));

  try {
    const response = await axios.post(
      `${BASE_URL}/tenants/${testTenantId}/suspend`,
      {},
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      console.log('✅ 租户授权已暂停');
      return true;
    } else {
      console.log('❌ 暂停失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 暂停失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 5. 恢复租户授权（会自动记录日志）
 */
async function resumeTestTenant() {
  console.log('\n📝 步骤 5: 恢复租户授权');
  console.log('='.repeat(50));

  try {
    const response = await axios.post(
      `${BASE_URL}/tenants/${testTenantId}/resume`,
      {},
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      console.log('✅ 租户授权已恢复');
      return true;
    } else {
      console.log('❌ 恢复失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 恢复失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 6. 查询租户操作日志
 */
async function queryTenantLogs() {
  console.log('\n📝 步骤 6: 查询租户操作日志');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(
      `${BASE_URL}/tenants/${testTenantId}/logs`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        params: {
          page: 1,
          pageSize: 10
        }
      }
    );

    if (response.data.success) {
      const { logs, pagination } = response.data.data;
      console.log('✅ 查询成功');
      console.log(`总记录数: ${pagination.total}`);
      console.log('\n操作日志:');
      logs.forEach((log, index) => {
        console.log(`\n${index + 1}. ${log.action}`);
        console.log(`   操作人: ${log.operator}`);
        console.log(`   时间: ${log.createdAt}`);
        console.log(`   IP: ${log.ipAddress || 'N/A'}`);
        if (log.details) {
          console.log(`   详情: ${JSON.stringify(log.details)}`);
        }
      });
      return true;
    } else {
      console.log('❌ 查询失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 查询失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 7. 查询所有租户的操作日志
 */
async function queryAllLogs() {
  console.log('\n📝 步骤 7: 查询所有租户的操作日志');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(
      `${BASE_URL}/logs`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        params: {
          page: 1,
          pageSize: 5
        }
      }
    );

    if (response.data.success) {
      const { logs, pagination } = response.data.data;
      console.log('✅ 查询成功');
      console.log(`总记录数: ${pagination.total}`);
      console.log(`\n最近 ${logs.length} 条操作:`);
      logs.forEach((log, index) => {
        console.log(`${index + 1}. [${log.action}] ${log.operator} -> ${log.tenantId}`);
      });
      return true;
    } else {
      console.log('❌ 查询失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 查询失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 8. 获取操作统计
 */
async function getActionStats() {
  console.log('\n📝 步骤 8: 获取操作统计');
  console.log('='.repeat(50));

  try {
    const response = await axios.get(
      `${BASE_URL}/logs/stats`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        params: {
          tenantId: testTenantId
        }
      }
    );

    if (response.data.success) {
      const stats = response.data.data;
      console.log('✅ 查询成功');
      console.log('\n操作统计:');
      stats.forEach(stat => {
        console.log(`  ${stat.action}: ${stat.count} 次`);
      });
      return true;
    } else {
      console.log('❌ 查询失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 查询失败:', error.response?.data || error.message);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('\n🚀 开始测试租户操作日志功能');
  console.log('='.repeat(50));

  // 1. 登录
  const loginSuccess = await adminLogin();
  if (!loginSuccess) {
    console.log('\n❌ 测试终止：登录失败');
    return;
  }

  // 2. 创建租户
  await createTestTenant();
  await sleep(500);

  // 3. 更新租户
  await updateTestTenant();
  await sleep(500);

  // 4. 暂停授权
  await suspendTestTenant();
  await sleep(500);

  // 5. 恢复授权
  await resumeTestTenant();
  await sleep(500);

  // 6. 查询租户日志
  await queryTenantLogs();

  // 7. 查询所有日志
  await queryAllLogs();

  // 8. 获取操作统计
  await getActionStats();

  console.log('\n✅ 所有测试完成！');
  console.log('='.repeat(50));
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
