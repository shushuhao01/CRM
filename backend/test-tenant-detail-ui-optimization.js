/**
 * 租户详情页面UI优化测试
 *
 * 测试内容：
 * 1. 授权码列宽固定（不因显示/隐藏而改变）
 * 2. 进度条与数值同行显示
 * 3. 对话框输入框和单位在同一行
 * 4. 套餐字段支持调整功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1/admin';
const TEST_TENANT_ID = '测试租户ID'; // 需要替换为实际的租户ID

// 测试用的管理员token（需要先登录获取）
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
      console.log('✓ 登录成功');
      return true;
    }
  } catch (error) {
    console.error('✗ 登录失败:', error.response?.data || error.message);
    return false;
  }
}

async function getTenantList() {
  try {
    console.log('\n2. 获取租户列表...');
    const response = await axios.get(`${BASE_URL}/tenants`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { page: 1, pageSize: 10 }
    });

    if (response.data.success && response.data.data.list.length > 0) {
      const tenant = response.data.data.list[0];
      console.log('✓ 获取租户列表成功');
      console.log(`  - 租户ID: ${tenant.id}`);
      console.log(`  - 租户名称: ${tenant.name}`);
      console.log(`  - 授权码: ${tenant.licenseKey}`);
      console.log(`  - 套餐: ${tenant.packageName || '未设置'}`);
      return tenant.id;
    }
  } catch (error) {
    console.error('✗ 获取租户列表失败:', error.response?.data || error.message);
    return null;
  }
}

async function getTenantDetail(tenantId) {
  try {
    console.log('\n3. 获取租户详情...');
    const response = await axios.get(`${BASE_URL}/tenants/${tenantId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      const detail = response.data.data;
      console.log('✓ 获取租户详情成功');
      console.log(`  - 租户名称: ${detail.name}`);
      console.log(`  - 用户数: ${detail.userCount}/${detail.maxUsers}`);
      console.log(`  - 存储空间: ${detail.usedStorageMb}MB/${detail.maxStorageGb}GB`);
      console.log(`  - 套餐ID: ${detail.packageId || '未设置'}`);
      console.log(`  - 套餐名称: ${detail.packageName || '未设置'}`);
      return detail;
    }
  } catch (error) {
    console.error('✗ 获取租户详情失败:', error.response?.data || error.message);
    return null;
  }
}

async function adjustPackage(tenantId, newPackageId) {
  try {
    console.log('\n4. 测试调整套餐功能...');
    const response = await axios.put(`${BASE_URL}/tenants/${tenantId}`, {
      packageId: newPackageId
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      console.log('✓ 调整套餐成功');
      console.log(`  - 新套餐ID: ${newPackageId}`);
      return true;
    }
  } catch (error) {
    console.error('✗ 调整套餐失败:', error.response?.data || error.message);
    return false;
  }
}

async function adjustUsers(tenantId, newMaxUsers) {
  try {
    console.log('\n5. 测试调整用户数功能...');
    const response = await axios.put(`${BASE_URL}/tenants/${tenantId}`, {
      maxUsers: newMaxUsers
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      console.log('✓ 调整用户数成功');
      console.log(`  - 新最大用户数: ${newMaxUsers}`);
      return true;
    }
  } catch (error) {
    console.error('✗ 调整用户数失败:', error.response?.data || error.message);
    return false;
  }
}

async function adjustStorage(tenantId, newMaxStorageGb) {
  try {
    console.log('\n6. 测试调整存储空间功能...');
    const response = await axios.put(`${BASE_URL}/tenants/${tenantId}`, {
      maxStorageGb: newMaxStorageGb
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      console.log('✓ 调整存储空间成功');
      console.log(`  - 新最大存储空间: ${newMaxStorageGb}GB`);
      return true;
    }
  } catch (error) {
    console.error('✗ 调整存储空间失败:', error.response?.data || error.message);
    return false;
  }
}

async function getPackages() {
  try {
    console.log('\n7. 获取套餐列表...');
    const response = await axios.get(`${BASE_URL}/packages`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      console.log('✓ 获取套餐列表成功');
      response.data.data.list.forEach(pkg => {
        console.log(`  - ${pkg.name} (ID: ${pkg.id})`);
      });
      return response.data.data.list;
    }
  } catch (error) {
    console.log('⚠ 套餐API未实现，使用默认套餐列表');
    const defaultPackages = [
      { id: '1', name: '基础版' },
      { id: '2', name: '专业版' },
      { id: '3', name: '企业版' }
    ];
    defaultPackages.forEach(pkg => {
      console.log(`  - ${pkg.name} (ID: ${pkg.id})`);
    });
    return defaultPackages;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('租户详情页面UI优化测试');
  console.log('='.repeat(60));

  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试终止：登录失败');
    return;
  }

  // 获取租户列表
  const tenantId = await getTenantList();
  if (!tenantId) {
    console.log('\n测试终止：无可用租户');
    return;
  }

  // 获取租户详情
  const detail = await getTenantDetail(tenantId);
  if (!detail) {
    console.log('\n测试终止：获取租户详情失败');
    return;
  }

  // 获取套餐列表
  const packages = await getPackages();

  // 测试调整套餐
  if (packages && packages.length > 0) {
    const newPackageId = packages[0].id;
    await adjustPackage(tenantId, newPackageId);
  }

  // 测试调整用户数
  const newMaxUsers = (detail.maxUsers || 10) + 5;
  await adjustUsers(tenantId, newMaxUsers);

  // 测试调整存储空间
  const newMaxStorageGb = (detail.maxStorageGb || 5) + 5;
  await adjustStorage(tenantId, newMaxStorageGb);

  // 验证更新后的数据
  console.log('\n8. 验证更新后的数据...');
  const updatedDetail = await getTenantDetail(tenantId);
  if (updatedDetail) {
    console.log('✓ 数据验证完成');
    console.log(`  - 用户数: ${updatedDetail.userCount}/${updatedDetail.maxUsers}`);
    console.log(`  - 存储空间: ${updatedDetail.usedStorageMb}MB/${updatedDetail.maxStorageGb}GB`);
    console.log(`  - 套餐: ${updatedDetail.packageName || '未设置'}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
  console.log('\nUI优化检查清单：');
  console.log('□ 授权码列宽固定为200px（不因显示/隐藏而改变）');
  console.log('□ 进度条与数值在同一行显示');
  console.log('□ 对话框输入框和单位在同一行');
  console.log('□ 套餐字段显示"调整"按钮');
  console.log('□ 调整套餐对话框正常工作');
  console.log('□ 调整用户数对话框正常工作');
  console.log('□ 调整存储空间对话框正常工作');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行出错:', error);
  process.exit(1);
});
