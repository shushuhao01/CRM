/**
 * 模块管理API测试脚本
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';
let authToken = '';

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

// 测试获取模块列表
async function testGetModules() {
  console.log('【测试1】获取模块列表');
  try {
    const api = getAxios();
    const response = await api.get('/modules');
    console.log('✅ 成功');
    console.log(`   - 总数: ${response.data.data.total}`);
    console.log(`   - 列表: ${response.data.data.list.length} 条`);
    if (response.data.data.list.length > 0) {
      console.log(`   - 第一个: ${response.data.data.list[0].name} (${response.data.data.list[0].code})`);
    }
    return response.data.data.list[0]?.id;
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试获取模块详情
async function testGetModuleById(id) {
  console.log('【测试2】获取模块详情');
  try {
    const api = getAxios();
    const response = await api.get(`/modules/${id}`);
    console.log('✅ 成功');
    console.log(`   - 名称: ${response.data.data.name}`);
    console.log(`   - 代码: ${response.data.data.code}`);
    console.log(`   - 状态: ${response.data.data.status}`);
    console.log(`   - 系统模块: ${response.data.data.isSystem ? '是' : '否'}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试创建模块
async function testCreateModule() {
  console.log('【测试3】创建模块');
  try {
    const api = getAxios();
    const response = await api.post('/modules', {
      name: '测试模块',
      code: 'test_module',
      description: '这是一个测试模块',
      icon: 'el-icon-star',
      version: '1.0.0',
      sortOrder: 100
    });
    console.log('✅ 成功');
    console.log(`   - ID: ${response.data.data.id}`);
    console.log(`   - 名称: ${response.data.data.name}`);
    return response.data.data.id;
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试更新模块
async function testUpdateModule(id) {
  console.log('【测试4】更新模块');
  try {
    const api = getAxios();
    const response = await api.put(`/modules/${id}`, {
      name: '测试模块（已更新）',
      description: '这是一个更新后的测试模块'
    });
    console.log('✅ 成功');
    console.log(`   - 名称: ${response.data.data.name}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试禁用模块
async function testDisableModule(id) {
  console.log('【测试5】禁用模块');
  try {
    const api = getAxios();
    const response = await api.post(`/modules/${id}/disable`);
    console.log('✅ 成功');
    console.log(`   - 消息: ${response.data.message}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试启用模块
async function testEnableModule(id) {
  console.log('【测试6】启用模块');
  try {
    const api = getAxios();
    const response = await api.post(`/modules/${id}/enable`);
    console.log('✅ 成功');
    console.log(`   - 消息: ${response.data.message}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试获取模块配置
async function testGetModuleConfig(id) {
  console.log('【测试7】获取模块配置');
  try {
    const api = getAxios();
    const response = await api.get(`/modules/${id}/config`);
    console.log('✅ 成功');
    console.log(`   - 配置项数: ${Object.keys(response.data.data).length}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试更新模块配置
async function testUpdateModuleConfig(id) {
  console.log('【测试8】更新模块配置');
  try {
    const api = getAxios();
    const response = await api.put(`/modules/${id}/config`, {
      enabled: true,
      maxUsers: 100,
      features: ['feature1', 'feature2']
    });
    console.log('✅ 成功');
    console.log(`   - 消息: ${response.data.message}`);
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
  console.log('');
}

// 测试删除模块
async function testDeleteModule(id) {
  console.log('【测试9】删除模块');
  try {
    const api = getAxios();
    const response = await api.delete(`/modules/${id}`);
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
  console.log('模块管理API测试');
  console.log('='.repeat(60));
  console.log('');

  await login();

  // 测试获取列表
  const firstModuleId = await testGetModules();

  if (firstModuleId) {
    // 测试获取详情
    await testGetModuleById(firstModuleId);
  }

  // 测试创建
  const newModuleId = await testCreateModule();

  if (newModuleId) {
    // 测试更新
    await testUpdateModule(newModuleId);

    // 测试禁用
    await testDisableModule(newModuleId);

    // 测试启用
    await testEnableModule(newModuleId);

    // 测试配置
    await testGetModuleConfig(newModuleId);
    await testUpdateModuleConfig(newModuleId);

    // 测试删除
    await testDeleteModule(newModuleId);
  }

  console.log('='.repeat(60));
  console.log('测试完成！');
  console.log('='.repeat(60));
}

runTests().catch(console.error);
