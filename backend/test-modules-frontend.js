/**
 * 测试模块管理前端对接
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';

// 测试账号
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

// 登录获取token
async function login() {
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    if (res.data.success) {
      authToken = res.data.data.token;
      console.log('✅ 登录成功');
      return true;
    }
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

// 获取模块列表
async function getModules() {
  try {
    const res = await axios.get(`${BASE_URL}/modules`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('\n✅ 获取模块列表成功');
    const modules = res.data.data?.list || res.data.data || [];
    console.log('模块数量:', modules.length);
    if (modules.length > 0) {
      console.log('模块列表:');
      modules.forEach(m => {
        console.log(`  - ${m.name} (${m.code}): ${m.status}`);
      });
    }
    return modules;
  } catch (error) {
    console.error('❌ 获取模块列表失败:', error.response?.data || error.message);
    return [];
  }
}

// 启用/禁用模块
async function toggleModule(moduleId, enable) {
  try {
    const endpoint = enable ? 'enable' : 'disable';
    const res = await axios.post(`${BASE_URL}/modules/${moduleId}/${endpoint}`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`\n✅ ${enable ? '启用' : '禁用'}模块成功`);
    return true;
  } catch (error) {
    console.error(`❌ ${enable ? '启用' : '禁用'}模块失败:`, error.response?.data || error.message);
    return false;
  }
}

// 获取系统设置
async function getSystemSettings() {
  try {
    const res = await axios.get(`${BASE_URL}/system-settings`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('\n✅ 获取系统设置成功');
    console.log('设置数量:', Object.keys(res.data.data || {}).length);
    return res.data.data;
  } catch (error) {
    console.error('❌ 获取系统设置失败:', error.response?.data || error.message);
    return null;
  }
}

// 获取管理员列表
async function getAdminUsers() {
  try {
    const res = await axios.get(`${BASE_URL}/admin-users`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('\n✅ 获取管理员列表成功');
    const users = res.data.data?.list || res.data.data || [];
    console.log('管理员数量:', users.length);
    if (users.length > 0) {
      users.forEach(u => {
        console.log(`  - ${u.username} (${u.realName || '未设置'}): ${u.role} - ${u.status}`);
      });
    }
    return users;
  } catch (error) {
    console.error('❌ 获取管理员列表失败:', error.response?.data || error.message);
    return [];
  }
}

// 主测试流程
async function main() {
  console.log('========================================');
  console.log('模块管理前端对接测试');
  console.log('========================================\n');

  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ 测试终止：登录失败');
    return;
  }

  // 2. 测试模块管理
  console.log('\n--- 测试模块管理 ---');
  const modules = await getModules();

  if (modules.length > 0) {
    // 测试启用/禁用第一个非系统模块
    const testModule = modules.find(m => !m.isSystem);
    if (testModule) {
      console.log(`\n测试模块: ${testModule.name}`);
      const currentStatus = testModule.status === 'enabled';

      // 切换状态
      await toggleModule(testModule.id, !currentStatus);

      // 恢复状态
      await toggleModule(testModule.id, currentStatus);
    }
  }

  // 3. 测试系统设置
  console.log('\n--- 测试系统设置 ---');
  await getSystemSettings();

  // 4. 测试管理员管理
  console.log('\n--- 测试管理员管理 ---');
  await getAdminUsers();

  console.log('\n========================================');
  console.log('✅ 所有测试完成');
  console.log('========================================');
}

main().catch(console.error);
