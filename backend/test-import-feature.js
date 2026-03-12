/**
 * 测试导入功能
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api/v1/admin';
let adminToken = '';
let testTenantId = '';

async function adminLogin() {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  adminToken = response.data.data.token;
  console.log('✅ 登录成功');
}

async function getTenant() {
  const response = await axios.get(`${BASE_URL}/tenants`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
    params: { page: 1, pageSize: 1 }
  });

  if (response.data.data.list.length > 0) {
    testTenantId = response.data.data.list[0].id;
    console.log(`✅ 使用租户: ${testTenantId}`);
    return true;
  }
  return false;
}

async function testImport() {
  console.log('\n📝 测试导入功能');
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

    const filePath = path.join(__dirname, 'test-import-data.json');
    fs.writeFileSync(filePath, JSON.stringify(testData, null, 2));

    // 创建导入任务
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('conflictStrategy', 'skip');

    const response = await axios.post(
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

    if (response.data.success) {
      console.log(`✅ 导入任务已创建: ${response.data.data.jobId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ 导入测试失败:', error.response?.data || error.message);
    return false;
  }
}

async function run() {
  console.log('\n🚀 测试导入功能');
  console.log('='.repeat(50));

  await adminLogin();
  const hasTenant = await getTenant();

  if (!hasTenant) {
    console.log('❌ 没有租户数据');
    return;
  }

  const success = await testImport();

  console.log('\n📊 测试结果');
  console.log('='.repeat(50));
  console.log(success ? '✅ 导入功能测试通过' : '❌ 导入功能测试失败');
}

run().catch(console.error);
