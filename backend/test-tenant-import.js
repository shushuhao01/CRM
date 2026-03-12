/**
 * 租户数据导入功能测试脚本
 *
 * 测试内容：
 * 1. 创建导入任务
 * 2. 查询导入进度
 * 3. 验证导入结果
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api/v1/admin';

// 测试用的 Admin Token（需要先登录获取）
let adminToken = '';

// 测试租户ID
const TEST_TENANT_ID = 'test-tenant-001';

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
      console.log(`Token: ${adminToken.substring(0, 20)}...`);
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
 * 2. 准备测试数据文件
 */
async function prepareTestData() {
  console.log('\n📝 步骤 2: 准备测试数据');
  console.log('='.repeat(50));

  const testData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    tenant: {
      id: TEST_TENANT_ID,
      name: '测试租户',
      code: 'TEST001'
    },
    data: {
      customers: [
        {
          id: 'cust-001',
          tenantId: TEST_TENANT_ID,
          name: '测试客户1',
          phone: '13800138001',
          address: '测试地址1',
          createdAt: new Date().toISOString()
        },
        {
          id: 'cust-002',
          tenantId: TEST_TENANT_ID,
          name: '测试客户2',
          phone: '13800138002',
          address: '测试地址2',
          createdAt: new Date().toISOString()
        }
      ],
      products: [
        {
          id: 'prod-001',
          tenantId: TEST_TENANT_ID,
          name: '测试商品1',
          price: 100,
          stock: 50,
          createdAt: new Date().toISOString()
        }
      ],
      orders: [
        {
          id: 'order-001',
          tenantId: TEST_TENANT_ID,
          orderNo: 'ORD20240301001',
          customerId: 'cust-001',
          totalAmount: 100,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ]
    }
  };

  const filePath = path.join(__dirname, 'test-import-data.json');
  fs.writeFileSync(filePath, JSON.stringify(testData, null, 2));

  console.log('✅ 测试数据文件已创建');
  console.log(`文件路径: ${filePath}`);
  console.log(`数据统计:`);
  console.log(`  - 客户: ${testData.data.customers.length} 条`);
  console.log(`  - 商品: ${testData.data.products.length} 条`);
  console.log(`  - 订单: ${testData.data.orders.length} 条`);

  return filePath;
}

/**
 * 3. 创建导入任务（skip 策略）
 */
async function testImportWithSkip(filePath) {
  console.log('\n📝 步骤 3: 测试导入（skip 策略）');
  console.log('='.repeat(50));

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('conflictStrategy', 'skip');

    const response = await axios.post(
      `${BASE_URL}/tenants/${TEST_TENANT_ID}/import`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${adminToken}`
        }
      }
    );

    if (response.data.success) {
      console.log('✅ 导入任务创建成功');
      console.log('任务信息:', JSON.stringify(response.data.data, null, 2));
      return response.data.data.jobId;
    } else {
      console.log('❌ 创建失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 创建失败:', error.response?.data || error.message);
    return null;
  }
}

/**
 * 4. 查询导入进度
 */
async function checkImportProgress(jobId) {
  console.log('\n📝 步骤 4: 查询导入进度');
  console.log('='.repeat(50));

  let completed = false;
  let attempts = 0;
  const maxAttempts = 30;

  while (!completed && attempts < maxAttempts) {
    try {
      const response = await axios.get(
        `${BASE_URL}/tenants/${TEST_TENANT_ID}/import/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        }
      );

      if (response.data.success) {
        const job = response.data.data;
        console.log(`\n进度: ${job.progress}% | 状态: ${job.status}`);
        console.log(`总记录: ${job.totalRecords} | 已处理: ${job.processedRecords} | 跳过: ${job.skippedRecords} | 错误: ${job.errorRecords}`);

        if (job.errors && job.errors.length > 0) {
          console.log('错误信息:', job.errors);
        }

        if (job.status === 'completed' || job.status === 'failed') {
          completed = true;
          console.log('\n✅ 导入任务完成');
          return job;
        }
      }

      await sleep(1000);
      attempts++;
    } catch (error) {
      console.error('❌ 查询失败:', error.response?.data || error.message);
      break;
    }
  }

  if (!completed) {
    console.log('⚠️  导入任务超时');
  }

  return null;
}

/**
 * 5. 测试导入（overwrite 策略）
 */
async function testImportWithOverwrite(filePath) {
  console.log('\n📝 步骤 5: 测试导入（overwrite 策略）');
  console.log('='.repeat(50));

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('conflictStrategy', 'overwrite');

    const response = await axios.post(
      `${BASE_URL}/tenants/${TEST_TENANT_ID}/import`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${adminToken}`
        }
      }
    );

    if (response.data.success) {
      console.log('✅ 导入任务创建成功（overwrite）');
      const jobId = response.data.data.jobId;

      // 等待完成
      await sleep(2000);
      await checkImportProgress(jobId);

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
 * 6. 测试无效文件
 */
async function testInvalidFile() {
  console.log('\n📝 步骤 6: 测试无效文件');
  console.log('='.repeat(50));

  const invalidData = {
    version: '2.0', // 不支持的版本
    data: {}
  };

  const filePath = path.join(__dirname, 'test-invalid-data.json');
  fs.writeFileSync(filePath, JSON.stringify(invalidData, null, 2));

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('conflictStrategy', 'skip');

    const response = await axios.post(
      `${BASE_URL}/tenants/${TEST_TENANT_ID}/import`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${adminToken}`
        }
      }
    );

    const jobId = response.data.data.jobId;
    await sleep(1000);

    const job = await checkImportProgress(jobId);

    if (job && job.status === 'failed') {
      console.log('✅ 正确识别了无效文件');
      return true;
    } else {
      console.log('❌ 未能识别无效文件');
      return false;
    }
  } catch (error) {
    console.log('✅ 正确拒绝了无效文件');
    return true;
  } finally {
    // 清理测试文件
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('\n🚀 开始测试租户数据导入功能');
  console.log('='.repeat(50));

  // 1. 登录
  const loginSuccess = await adminLogin();
  if (!loginSuccess) {
    console.log('\n❌ 测试终止：登录失败');
    return;
  }

  // 2. 准备测试数据
  const filePath = await prepareTestData();

  // 3. 测试 skip 策略
  const jobId = await testImportWithSkip(filePath);
  if (jobId) {
    await checkImportProgress(jobId);
  }

  // 4. 测试 overwrite 策略
  await testImportWithOverwrite(filePath);

  // 5. 测试无效文件
  await testInvalidFile();

  // 清理测试文件
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log('\n🗑️  测试文件已清理');
  }

  console.log('\n✅ 所有测试完成！');
  console.log('='.repeat(50));
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
