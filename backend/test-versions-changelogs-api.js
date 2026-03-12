/**
 * 测试版本管理和更新日志API
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';
let authToken = '';

// 测试配置
const testConfig = {
  adminUser: {
    username: 'admin',
    password: 'admin123'
  }
};

// 辅助函数
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000
});

api.interceptors.request.use(config => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// 测试函数
async function test1_Login() {
  console.log('\n========== 测试1: 管理员登录 ==========');
  try {
    const res = await api.post('/auth/login', testConfig.adminUser);
    authToken = res.data.data.token;
    console.log('✅ 登录成功');
    console.log('Token:', authToken.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('❌ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

async function test2_GetVersions() {
  console.log('\n========== 测试2: 获取版本列表 ==========');
  try {
    const res = await api.get('/versions', {
      params: { page: 1, pageSize: 10 }
    });
    console.log('✅ 获取版本列表成功');
    console.log('总数:', res.data.data.total);
    console.log('版本数:', res.data.data.items?.length || 0);
    if (res.data.data.items?.length > 0) {
      console.log('第一个版本:', {
        id: res.data.data.items[0].id,
        version_number: res.data.data.items[0].version_number,
        version_name: res.data.data.items[0].version_name,
        version_type: res.data.data.items[0].version_type
      });
    }
    return res.data.data.items?.[0]?.id;
  } catch (error) {
    console.error('❌ 获取版本列表失败:', error.response?.data || error.message);
    return null;
  }
}

async function test3_CreateVersion() {
  console.log('\n========== 测试3: 创建版本 ==========');
  try {
    const versionData = {
      version_number: '1.0.0-test',
      version_name: '测试版本',
      version_type: 'beta',
      platform: 'Windows',
      file_size: 1024000,
      download_url: 'http://example.com/test.zip',
      release_notes: '这是一个测试版本',
      is_force_update: false,
      is_published: false
    };

    const res = await api.post('/versions', versionData);
    console.log('✅ 创建版本成功');
    console.log('版本ID:', res.data.data.id);
    console.log('版本号:', res.data.data.version);
    return res.data.data.id;
  } catch (error) {
    console.error('❌ 创建版本失败:', error.response?.data || error.message);
    return null;
  }
}

async function test4_GetChangelogs(versionId) {
  console.log('\n========== 测试4: 获取更新日志列表 ==========');
  try {
    const res = await api.get('/changelogs', {
      params: { page: 1, pageSize: 10, version_id: versionId }
    });
    console.log('✅ 获取更新日志列表成功');
    console.log('总数:', res.data.data.total);
    console.log('日志数:', res.data.data.items?.length || 0);
    return true;
  } catch (error) {
    console.error('❌ 获取更新日志列表失败:', error.response?.data || error.message);
    return false;
  }
}

async function test5_CreateChangelog(versionId) {
  console.log('\n========== 测试5: 创建更新日志 ==========');
  try {
    const changelogData = {
      version_id: versionId,
      change_type: 'feature',
      content: '新增测试功能'
    };

    const res = await api.post('/changelogs', changelogData);
    console.log('✅ 创建更新日志成功');
    console.log('日志ID:', res.data.data.id);
    return res.data.data.id;
  } catch (error) {
    console.error('❌ 创建更新日志失败:', error.response?.data || error.message);
    return null;
  }
}

async function test6_UpdateChangelog(changelogId) {
  console.log('\n========== 测试6: 更新更新日志 ==========');
  try {
    const updateData = {
      change_type: 'improvement',
      content: '优化测试功能'
    };

    const res = await api.put(`/changelogs/${changelogId}`, updateData);
    console.log('✅ 更新更新日志成功');
    return true;
  } catch (error) {
    console.error('❌ 更新更新日志失败:', error.response?.data || error.message);
    return false;
  }
}

async function test7_DeleteChangelog(changelogId) {
  console.log('\n========== 测试7: 删除更新日志 ==========');
  try {
    const res = await api.delete(`/changelogs/${changelogId}`);
    console.log('✅ 删除更新日志成功');
    return true;
  } catch (error) {
    console.error('❌ 删除更新日志失败:', error.response?.data || error.message);
    return false;
  }
}

async function test8_DeleteVersion(versionId) {
  console.log('\n========== 测试8: 删除版本 ==========');
  try {
    const res = await api.delete(`/versions/${versionId}`);
    console.log('✅ 删除版本成功');
    return true;
  } catch (error) {
    console.error('❌ 删除版本失败:', error.response?.data || error.message);
    return false;
  }
}

// 主测试流程
async function runTests() {
  console.log('开始测试版本管理和更新日志API...\n');

  // 1. 登录
  const loginSuccess = await test1_Login();
  if (!loginSuccess) {
    console.log('\n❌ 登录失败,终止测试');
    return;
  }

  // 2. 获取版本列表
  const existingVersionId = await test2_GetVersions();

  // 3. 创建版本
  const newVersionId = await test3_CreateVersion();
  if (!newVersionId) {
    console.log('\n⚠️  创建版本失败,跳过后续测试');
    return;
  }

  // 4. 获取更新日志列表
  await test4_GetChangelogs(newVersionId);

  // 5. 创建更新日志
  const changelogId = await test5_CreateChangelog(newVersionId);
  if (changelogId) {
    // 6. 更新更新日志
    await test6_UpdateChangelog(changelogId);

    // 7. 删除更新日志
    await test7_DeleteChangelog(changelogId);
  }

  // 8. 删除版本
  await test8_DeleteVersion(newVersionId);

  console.log('\n========== 测试完成 ==========');
}

// 运行测试
runTests().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});
