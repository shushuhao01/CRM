/**
 * 版本管理API完整测试脚本
 * 测试所有版本管理和更新日志相关的API接口
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';
let authToken = '';
let testVersionId = null;
let testChangelogId = null;

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

// 1. 登录
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
      return true;
    }
  } catch (error) {
    log(`✗ 登录失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 2. 获取版本列表
async function getVersions() {
  try {
    log('\n========== 2. 获取版本列表 ==========', 'blue');
    const response = await axios.get(`${BASE_URL}/versions`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const { list, total } = response.data.data;
      log(`✓ 获取成功，共 ${total} 个版本`, 'green');
      list.forEach(v => {
        log(`  - ${v.version} (${v.platform}) - ${v.status}`, 'yellow');
      });
      return true;
    }
  } catch (error) {
    log(`✗ 获取失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 3. 创建测试版本
async function createVersion() {
  try {
    log('\n========== 3. 创建测试版本 ==========', 'blue');
    const versionData = {
      version: '2.0.0',
      releaseType: 'major',
      platform: 'all',
      changelog: '重大版本更新，全新界面设计',
      minVersion: '1.0.0',
      isForceUpdate: false
    };

    const response = await axios.post(`${BASE_URL}/versions`, versionData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      testVersionId = response.data.data.id;
      log('✓ 创建成功', 'green');
      log(`  版本ID: ${testVersionId}`, 'yellow');
      log(`  版本号: ${response.data.data.version}`, 'yellow');
      log(`  版本代码: ${response.data.data.versionCode}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 创建失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 4. 获取版本详情
async function getVersionDetail() {
  try {
    log('\n========== 4. 获取版本详情 ==========', 'blue');
    const response = await axios.get(`${BASE_URL}/versions/${testVersionId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const v = response.data.data;
      log('✓ 获取成功', 'green');
      log(`  版本号: ${v.version}`, 'yellow');
      log(`  平台: ${v.platform}`, 'yellow');
      log(`  状态: ${v.status}`, 'yellow');
      log(`  更新说明: ${v.changelog}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 获取失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 5. 添加更新日志
async function addChangelog() {
  try {
    log('\n========== 5. 添加更新日志 ==========', 'blue');
    const changelogData = {
      type: 'feature',
      content: '新增用户权限管理功能',
      sortOrder: 1
    };

    const response = await axios.post(`${BASE_URL}/versions/${testVersionId}/changelogs`, changelogData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      testChangelogId = response.data.data.id;
      log('✓ 添加成功', 'green');
      log(`  日志ID: ${testChangelogId}`, 'yellow');
      log(`  类型: ${response.data.data.type}`, 'yellow');
      log(`  内容: ${response.data.data.content}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 添加失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 6. 批量添加更新日志
async function addChangelogsBatch() {
  try {
    log('\n========== 6. 批量添加更新日志 ==========', 'blue');
    const changelogs = [
      { type: 'bugfix', content: '修复订单列表加载缓慢问题', sortOrder: 2 },
      { type: 'improvement', content: '优化数据导出性能', sortOrder: 3 },
      { type: 'security', content: '加强密码安全策略', sortOrder: 4 }
    ];

    const response = await axios.post(`${BASE_URL}/versions/${testVersionId}/changelogs/batch`,
      { changelogs },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (response.data.success) {
      log(`✓ 批量添加成功，共添加 ${response.data.data.length} 条`, 'green');
      response.data.data.forEach(item => {
        log(`  - [${item.type}] ${item.content}`, 'yellow');
      });
      return true;
    }
  } catch (error) {
    log(`✗ 批量添加失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 7. 获取更新日志列表
async function getChangelogs() {
  try {
    log('\n========== 7. 获取更新日志列表 ==========', 'blue');
    const response = await axios.get(`${BASE_URL}/versions/${testVersionId}/changelogs`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const changelogs = response.data.data;
      log(`✓ 获取成功，共 ${changelogs.length} 条日志`, 'green');
      changelogs.forEach(item => {
        log(`  - [${item.type}] ${item.content}`, 'yellow');
      });
      return true;
    }
  } catch (error) {
    log(`✗ 获取失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 8. 更新版本
async function updateVersion() {
  try {
    log('\n========== 8. 更新版本 ==========', 'blue');
    const updateData = {
      downloadUrl: 'https://example.com/downloads/v2.0.0.zip',
      fileSize: '125.5MB',
      fileHash: 'abc123def456'
    };

    const response = await axios.put(`${BASE_URL}/versions/${testVersionId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      log('✓ 更新成功', 'green');
      log(`  下载地址: ${response.data.data.downloadUrl}`, 'yellow');
      log(`  文件大小: ${response.data.data.fileSize}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 更新失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 9. 发布版本
async function publishVersion() {
  try {
    log('\n========== 9. 发布版本 ==========', 'blue');
    const response = await axios.post(`${BASE_URL}/versions/${testVersionId}/publish`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      log('✓ 发布成功', 'green');
      log(`  状态: ${response.data.data.status}`, 'yellow');
      log(`  发布时间: ${response.data.data.publishedAt}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 发布失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 10. 获取最新版本
async function getLatestVersion() {
  try {
    log('\n========== 10. 获取最新版本 ==========', 'blue');
    const response = await axios.get(`${BASE_URL}/versions/latest`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const v = response.data.data;
      log('✓ 获取成功', 'green');
      log(`  版本号: ${v.version}`, 'yellow');
      log(`  下载地址: ${v.downloadUrl}`, 'yellow');
      log(`  更新日志数量: ${v.changelogs?.length || 0}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 获取失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 11. 增加下载次数
async function incrementDownload() {
  try {
    log('\n========== 11. 增加下载次数 ==========', 'blue');
    const response = await axios.post(`${BASE_URL}/versions/${testVersionId}/download`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      log('✓ 下载次数已更新', 'green');
      return true;
    }
  } catch (error) {
    log(`✗ 更新失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 12. 废弃版本
async function deprecateVersion() {
  try {
    log('\n========== 12. 废弃版本 ==========', 'blue');
    const response = await axios.post(`${BASE_URL}/versions/${testVersionId}/deprecate`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      log('✓ 已废弃', 'green');
      log(`  状态: ${response.data.data.status}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`✗ 废弃失败: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

// 13. 删除更新日志
async function deleteChangelog() {
  try {
    log('\n========== 13. 删除更新日志 ==========', 'blue');
    const response = await axios.delete(`${BASE_URL}/versions/${testVersionId}/changelogs/${testChangelogId}`, {
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

// 14. 删除版本
async function deleteVersion() {
  try {
    log('\n========== 14. 删除版本 ==========', 'blue');
    const response = await axios.delete(`${BASE_URL}/versions/${testVersionId}`, {
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
  log('║   版本管理API完整测试 - 开始测试       ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  const tests = [
    { name: '登录', fn: login },
    { name: '获取版本列表', fn: getVersions },
    { name: '创建测试版本', fn: createVersion },
    { name: '获取版本详情', fn: getVersionDetail },
    { name: '添加更新日志', fn: addChangelog },
    { name: '批量添加更新日志', fn: addChangelogsBatch },
    { name: '获取更新日志列表', fn: getChangelogs },
    { name: '更新版本', fn: updateVersion },
    { name: '发布版本', fn: publishVersion },
    { name: '获取最新版本', fn: getLatestVersion },
    { name: '增加下载次数', fn: incrementDownload },
    { name: '废弃版本', fn: deprecateVersion },
    { name: '删除更新日志', fn: deleteChangelog },
    { name: '删除版本', fn: deleteVersion }
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
    log('\n🎉 所有测试通过！版本管理API工作正常！', 'green');
  } else {
    log('\n⚠️  部分测试失败，请检查错误信息', 'red');
  }
}

// 执行测试
runAllTests().catch(error => {
  log(`\n✗ 测试执行出错: ${error.message}`, 'red');
  process.exit(1);
});
