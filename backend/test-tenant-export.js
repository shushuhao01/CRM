/**
 * 测试租户数据导出功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';
let adminToken = '';

async function login() {
  try {
    console.log('1. 管理员登录...');
    const response = await axios.post('http://localhost:3000/api/v1/admin/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.success) {
      adminToken = response.data.data.token;
      console.log('✓ 登录成功\n');
      return true;
    }
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

async function getTenantList() {
  try {
    console.log('2. 获取租户列表...');
    const response = await axios.get(`${BASE_URL}/tenants`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { page: 1, pageSize: 1 }
    });

    if (response.data.success && response.data.data.list.length > 0) {
      const tenant = response.data.data.list[0];
      console.log(`✓ 获取到租户: ${tenant.name} (${tenant.id})\n`);
      return tenant.id;
    }
  } catch (error) {
    console.error('✗ 获取租户列表失败:', error.response?.data || error.message);
    return null;
  }
}

async function createExportJob(tenantId) {
  try {
    console.log('3. 创建导出任务...');
    const response = await axios.post(
      `${BASE_URL}/tenants/${tenantId}/export`,
      {
        tables: ['customers', 'orders', 'products']
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      const jobId = response.data.data.jobId;
      console.log(`✓ 导出任务已创建: ${jobId}`);
      console.log(`  状态: ${response.data.data.status}`);
      console.log(`  进度: ${response.data.data.progress}%\n`);
      return jobId;
    }
  } catch (error) {
    console.error('✗ 创建导出任务失败:', error.response?.data || error.message);
    return null;
  }
}

async function checkExportProgress(tenantId, jobId) {
  try {
    console.log('4. 查询导出进度...');

    let completed = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!completed && attempts < maxAttempts) {
      const response = await axios.get(
        `${BASE_URL}/tenants/${tenantId}/export/${jobId}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success) {
        const job = response.data.data;
        console.log(`  状态: ${job.status}, 进度: ${job.progress}%`);

        if (job.status === 'completed') {
          console.log(`✓ 导出完成！`);
          console.log(`  总记录数: ${job.totalRecords}`);
          console.log(`  已处理: ${job.processedRecords}`);
          console.log(`  完成时间: ${job.completedAt}\n`);
          completed = true;
          return true;
        } else if (job.status === 'failed') {
          console.error(`✗ 导出失败: ${job.error}\n`);
          return false;
        }
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    }

    if (!completed) {
      console.log('⚠️  导出任务超时\n');
      return false;
    }
  } catch (error) {
    console.error('✗ 查询导出进度失败:', error.response?.data || error.message);
    return false;
  }
}

async function downloadExportFile(tenantId, jobId) {
  try {
    console.log('5. 下载导出文件...');
    const response = await axios.get(
      `${BASE_URL}/tenants/${tenantId}/export/${jobId}/download`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        responseType: 'json'
      }
    );

    console.log('✓ 导出文件下载成功');
    console.log(`  文件大小: ${JSON.stringify(response.data).length} 字节`);
    console.log(`  数据版本: ${response.data.version}`);
    console.log(`  租户信息: ${response.data.tenant.name}`);
    console.log(`  导出时间: ${response.data.exportTime}`);
    console.log(`  数据表: ${Object.keys(response.data.data).join(', ')}\n`);

    return true;
  } catch (error) {
    console.error('✗ 下载导出文件失败:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('租户数据导出功能测试');
  console.log('='.repeat(60));
  console.log('');

  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试终止：登录失败');
    return;
  }

  // 获取租户
  const tenantId = await getTenantList();
  if (!tenantId) {
    console.log('\n测试终止：无可用租户');
    return;
  }

  // 创建导出任务
  const jobId = await createExportJob(tenantId);
  if (!jobId) {
    console.log('\n测试终止：创建导出任务失败');
    return;
  }

  // 查询导出进度
  const exportCompleted = await checkExportProgress(tenantId, jobId);
  if (!exportCompleted) {
    console.log('\n测试终止：导出未完成');
    return;
  }

  // 下载导出文件
  await downloadExportFile(tenantId, jobId);

  console.log('='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行出错:', error);
  process.exit(1);
});
