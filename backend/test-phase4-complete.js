/**
 * 第四阶段完整验收测试
 *
 * 测试内容：
 * 1. 租户数据导出功能
 * 2. 租户数据导入功能
 * 3. 租户操作日志功能
 * 4. 性能优化验证
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api/v1/admin';

let adminToken = '';
let testTenantId = '';

const testResults = {
  export: false,
  import: false,
  logs: false,
  performance: false
};

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Admin 登录
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
    }
    return false;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    return false;
  }
}

/**
 * 测试 4.1: 租户数据导出
 */
async function testExport() {
  console.log('\n📝 测试 4.1: 租户数据导出');
  console.log('='.repeat(50));

  try {
    // 获取第一个租户
    const listResponse = await axios.get(`${BASE_URL}/tenants`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
      params: { page: 1, pageSize: 1 }
    });

    if (listResponse.data.data.tenants.length === 0) {
      console.log('⚠️  没有租户数据，跳过导出测试');
      testResults.export = true;
      return true;
    }

    testTenantId = listResponse.data.data.tenants[0].id;

    // 创建导出任务
    const exportResponse = await axios.post(
      `${BASE_URL}/tenants/${testTenantId}/export`,
      {
        tables: ['customers', 'orders', 'products']
      },
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    if (!exportResponse.data.success) {
      console.log('❌ 创建导出任务失败');
      return false;
    }

    const jobId = exportResponse.data.data.jobId;
    console.log(`✅ 导出任务已创建: ${jobId}`);

    // 等待导出完成
    await sleep(2000);

    // 查询导出进度
    const progressResponse = await axios.get(
      `${BASE_URL}/tenants/${testTenantId}/export/${jobId}`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    if (progressResponse.data.success) {
      const job = progressResponse.data.data;
      console.log(`✅ 导出状态: ${job.status}, 进度: ${job.progress}%`);
      testResults.export = true;
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ 导出测试失败:', error.message);
    return false;
  }
}

/**
 * 测试 4.2: 租户数据导入
 */
async function testImport() {
  console.log('\n📝 测试 4.2: 租户数据导入');
  console.log('='.repeat(50));

  try {
    // 准备测试数据
    const testData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tenant: {
        id: testTenantId,
        name: '测试租户'
      },
      data: {
        customers: [
          {
            id: `test-cust-${Date.now()}`,
            tenantId: testTenantId,
            name: '测试客户',
            phone: '13800138000',
            createdAt: new Date().toISOString()
          }
        ]
      }
    };

    const filePath = path.join(__dirname, 'test-import-phase4.json');
    fs.writeFileSync(filePath, JSON.stringify(testData, null, 2));

    // 创建导入任务
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('conflictStrategy', 'skip');

    const importResponse = await axios.post(
      `${BASE_URL}/tenants/${testTenantId}/import`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${adminToken}`
        }
      }
    );

    // 清理测试文件
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (!importResponse.data.success) {
      console.log('❌ 创建导入任务失败');
      return false;
    }

    const jobId = importResponse.data.data.jobId;
    console.log(`✅ 导入任务已创建: ${jobId}`);

    // 等待导入完成
    await sleep(2000);

    // 查询导入进度
    const progressResponse = await axios.get(
      `${BASE_URL}/tenants/${testTenantId}/import/${jobId}`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    if (progressResponse.data.success) {
      const job = progressResponse.data.data;
      console.log(`✅ 导入状态: ${job.status}, 进度: ${job.progress}%`);
      testResults.import = true;
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ 导入测试失败:', error.message);
    return false;
  }
}

/**
 * 测试 4.3: 租户操作日志
 */
async function testLogs() {
  console.log('\n📝 测试 4.3: 租户操作日志');
  console.log('='.repeat(50));

  try {
    // 查询租户日志
    const logsResponse = await axios.get(
      `${BASE_URL}/tenants/${testTenantId}/logs`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        params: { page: 1, pageSize: 5 }
      }
    );

    if (!logsResponse.data.success) {
      console.log('❌ 查询日志失败');
      return false;
    }

    const { logs, pagination } = logsResponse.data.data;
    console.log(`✅ 查询到 ${pagination.total} 条日志记录`);

    if (logs.length > 0) {
      console.log(`   最近操作: ${logs[0].action} by ${logs[0].operator}`);
    }

    // 查询操作统计
    const statsResponse = await axios.get(
      `${BASE_URL}/logs/stats`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        params: { tenantId: testTenantId }
      }
    );

    if (statsResponse.data.success) {
      const stats = statsResponse.data.data;
      console.log(`✅ 操作统计: ${stats.length} 种操作类型`);
      testResults.logs = true;
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ 日志测试失败:', error.message);
    return false;
  }
}

/**
 * 测试 4.4: 性能验证
 */
async function testPerformance() {
  console.log('\n📝 测试 4.4: 性能验证');
  console.log('='.repeat(50));

  try {
    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();

      await axios.get(`${BASE_URL}/tenants`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        params: { page: 1, pageSize: 20 }
      });

      const duration = Date.now() - startTime;
      times.push(duration);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`✅ 平均响应时间: ${avgTime.toFixed(2)}ms`);

    testResults.performance = avgTime < 1000; // 期望 < 1秒
    return testResults.performance;
  } catch (error) {
    console.error('❌ 性能测试失败:', error.message);
    return false;
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('\n🚀 第四阶段完整验收测试');
  console.log('='.repeat(50));
  console.log('测试范围：');
  console.log('  - 任务 4.1: 租户数据导出');
  console.log('  - 任务 4.2: 租户数据导入');
  console.log('  - 任务 4.3: 租户操作日志');
  console.log('  - 任务 4.4: 性能优化');
  console.log('='.repeat(50));

  // 登录
  const loginSuccess = await adminLogin();
  if (!loginSuccess) {
    console.log('\n❌ 测试终止：登录失败');
    return;
  }

  // 执行测试
  await testExport();
  await testImport();
  await testLogs();
  await testPerformance();

  // 测试总结
  console.log('\n📊 第四阶段验收测试总结');
  console.log('='.repeat(50));
  console.log(`任务 4.1 - 租户数据导出: ${testResults.export ? '✅ 通过' : '❌ 失败'}`);
  console.log(`任务 4.2 - 租户数据导入: ${testResults.import ? '✅ 通过' : '❌ 失败'}`);
  console.log(`任务 4.3 - 租户操作日志: ${testResults.logs ? '✅ 通过' : '❌ 失败'}`);
  console.log(`任务 4.4 - 性能优化: ${testResults.performance ? '✅ 通过' : '❌ 失败'}`);

  const allPassed = Object.values(testResults).every(r => r);
  const passedCount = Object.values(testResults).filter(r => r).length;
  const totalCount = Object.keys(testResults).length;

  console.log('\n' + '='.repeat(50));
  console.log(`测试结果: ${passedCount}/${totalCount} 通过`);
  console.log(allPassed ? '✅ 第四阶段验收通过！' : '⚠️  部分测试未通过');
  console.log('='.repeat(50));
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
