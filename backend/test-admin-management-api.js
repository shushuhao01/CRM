/**
 * 管理员用户和系统设置API测试脚本
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';
let authToken = '';
let testUserId = '';

// 登录获取token
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    authToken = response.data.data.token;
    console.log('✅ 登录成功\n');
    return authToken;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    process.exit(1);
  }
}

// 创建axios实例
function getAxios() {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
}

// 测试获取管理员列表
async function testGetAdminUsers() {
  console.log('【测试1】获取管理员列表');
  try {
    const api = getAxios();
    const response = await api.get('/admin-users');
    console.log('✅ 成功');
    console.log(`   - 总数: ${response.data.data.total}`);
    console.log(`   - 列表: ${response.data.data.list.length} 条`);
    if (response.data.data.list.length > 0) {
      console.log(`   - 第一个: ${response.data.data.list[0].username} (${response.data.data.list[0].role})`);
    }
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试创建管理员
async function testCreateAdminUser() {
  console.log('【测试2】创建管理员');
  try {
    const api = getAxios();
    const response = await api.post('/admin-users', {
      username: 'test_admin',
      password: 'test123456',
      email: 'test@example.com',
      realName: '测试管理员',
      role: 'admin',
      status: 'active'
    });
    console.log('✅ 成功');
    console.log(`   - ID: ${response.data.data.id}`);
    console.log(`   - 用户名: ${response.data.data.username}`);
    testUserId = response.data.data.id;
    return testUserId;
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试获取管理员详情
async function testGetAdminUserById(id) {
  console.log('【测试3】获取管理员详情');
  try {
    const api = getAxios();
    const response = await api.get(`/admin-users/${id}`);
    console.log('✅ 成功');
    console.log(`   - 用户名: ${response.data.data.username}`);
    console.log(`   - 角色: ${response.data.data.role}`);
    console.log(`   - 状态: ${response.data.data.status}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试更新管理员
async function testUpdateAdminUser(id) {
  console.log('【测试4】更新管理员');
  try {
    const api = getAxios();
    const response = await api.put(`/admin-users/${id}`, {
      realName: '测试管理员（已更新）',
      email: 'test_updated@example.com'
    });
    console.log('✅ 成功');
    console.log(`   - 真实姓名: ${response.data.data.realName}`);
    console.log(`   - 邮箱: ${response.data.data.email}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试锁定用户
async function testLockUser(id) {
  console.log('【测试5】锁定用户');
  try {
    const api = getAxios();
    const response = await api.post(`/admin-users/${id}/lock`);
    console.log('✅ 成功');
    console.log(`   - 消息: ${response.data.message}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试解锁用户
async function testUnlockUser(id) {
  console.log('【测试6】解锁用户');
  try {
    const api = getAxios();
    const response = await api.post(`/admin-users/${id}/unlock`);
    console.log('✅ 成功');
    console.log(`   - 消息: ${response.data.message}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试重置密码
async function testResetPassword(id) {
  console.log('【测试7】重置密码');
  try {
    const api = getAxios();
    const response = await api.post(`/admin-users/${id}/reset-password`, {
      newPassword: 'newpass123456'
    });
    console.log('✅ 成功');
    console.log(`   - 消息: ${response.data.message}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试删除管理员
async function testDeleteAdminUser(id) {
  console.log('【测试8】删除管理员');
  try {
    const api = getAxios();
    const response = await api.delete(`/admin-users/${id}`);
    console.log('✅ 成功');
    console.log(`   - 消息: ${response.data.message}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试获取操作日志
async function testGetOperationLogs() {
  console.log('【测试9】获取操作日志');
  try {
    const api = getAxios();
    const response = await api.get('/admin-users/logs/operations');
    console.log('✅ 成功');
    console.log(`   - 总数: ${response.data.data.total}`);
    console.log(`   - 列表: ${response.data.data.list.length} 条`);
    if (response.data.data.list.length > 0) {
      const log = response.data.data.list[0];
      console.log(`   - 最新操作: ${log.operation} by ${log.adminName}`);
    }
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试获取系统设置
async function testGetSettings() {
  console.log('【测试10】获取系统设置');
  try {
    const api = getAxios();
    const response = await api.get('/settings');
    console.log('✅ 成功');
    console.log(`   - 配置项数: ${Object.keys(response.data.data).length}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试更新系统设置
async function testUpdateSettings() {
  console.log('【测试11】更新系统设置');
  try {
    const api = getAxios();
    const response = await api.put('/settings', {
      category: 'system',
      settings: {
        test_setting_1: 'value1',
        test_setting_2: 123,
        test_setting_3: true
      }
    });
    console.log('✅ 成功');
    console.log(`   - 消息: ${response.data.message}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 主测试流程
async function runTests() {
  console.log('='.repeat(60));
  console.log('管理员用户和系统设置API测试');
  console.log('='.repeat(60));
  console.log('');

  await login();

  // 管理员用户管理测试
  await testGetAdminUsers();
  const userId = await testCreateAdminUser();

  if (userId) {
    await testGetAdminUserById(userId);
    await testUpdateAdminUser(userId);
    await testLockUser(userId);
    await testUnlockUser(userId);
    await testResetPassword(userId);
    await testDeleteAdminUser(userId);
  }

  await testGetOperationLogs();

  // 系统设置测试
  await testGetSettings();
  await testUpdateSettings();

  console.log('='.repeat(60));
  console.log('测试完成！');
  console.log('='.repeat(60));
}

runTests().catch(console.error);
