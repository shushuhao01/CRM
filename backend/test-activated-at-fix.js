/**
 * 测试激活时间修复
 * 验证：
 * 1. 新创建的租户应该有 activatedAt
 * 2. 授权状态为 active 的租户应该显示激活时间
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
      params: { page: 1, pageSize: 10 }
    });

    if (response.data.success && response.data.data.list.length > 0) {
      const tenants = response.data.data.list;
      console.log(`✓ 获取到 ${tenants.length} 个租户\n`);

      console.log('租户激活状态检查：');
      console.log('='.repeat(80));
      tenants.forEach((tenant, index) => {
        console.log(`${index + 1}. ${tenant.name}`);
        console.log(`   授权状态: ${tenant.licenseStatus}`);
        console.log(`   激活时间: ${tenant.activatedAt || '未设置'}`);

        // 检查矛盾
        if (tenant.licenseStatus === 'active' && !tenant.activatedAt) {
          console.log('   ⚠️  警告：授权状态为已激活，但激活时间未设置（矛盾）');
        } else if (tenant.licenseStatus === 'active' && tenant.activatedAt) {
          console.log('   ✓ 正常：授权状态和激活时间一致');
        }
        console.log('');
      });

      return tenants[0].id;
    }
  } catch (error) {
    console.error('✗ 获取租户列表失败:', error.response?.data || error.message);
    return null;
  }
}

async function getTenantDetail(tenantId) {
  try {
    console.log('3. 获取租户详情...');
    const response = await axios.get(`${BASE_URL}/tenants/${tenantId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      const detail = response.data.data;
      console.log('✓ 获取租户详情成功');
      console.log('='.repeat(80));
      console.log(`租户名称: ${detail.name}`);
      console.log(`授权状态: ${detail.licenseStatus}`);
      console.log(`激活时间: ${detail.activatedAt || '未设置'}`);
      console.log(`账号状态: ${detail.status}`);
      console.log(`创建时间: ${detail.createdAt}`);
      console.log('='.repeat(80));

      // 检查矛盾
      if (detail.licenseStatus === 'active' && !detail.activatedAt) {
        console.log('\n⚠️  发现问题：授权状态为已激活，但激活时间未设置');
        return { hasIssue: true, detail };
      } else if (detail.licenseStatus === 'active' && detail.activatedAt) {
        console.log('\n✓ 验证通过：授权状态和激活时间一致');
        return { hasIssue: false, detail };
      }

      return { hasIssue: false, detail };
    }
  } catch (error) {
    console.error('✗ 获取租户详情失败:', error.response?.data || error.message);
    return null;
  }
}

async function createTestTenant() {
  try {
    console.log('\n4. 创建测试租户（验证新租户是否有激活时间）...');
    const response = await axios.post(`${BASE_URL}/tenants`, {
      name: `测试租户-${Date.now()}`,
      maxUsers: 10,
      maxStorageGb: 5,
      contact: '测试联系人',
      phone: '13800138000',
      email: 'test@example.com'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      const tenant = response.data.data;
      console.log('✓ 创建租户成功');
      console.log('='.repeat(80));
      console.log(`租户名称: ${tenant.name}`);
      console.log(`授权状态: ${tenant.licenseStatus}`);
      console.log(`激活时间: ${tenant.activatedAt || '未设置'}`);
      console.log('='.repeat(80));

      if (tenant.licenseStatus === 'active' && !tenant.activatedAt) {
        console.log('\n✗ 测试失败：新创建的租户没有激活时间');
        return { success: false, tenantId: tenant.id };
      } else if (tenant.licenseStatus === 'active' && tenant.activatedAt) {
        console.log('\n✓ 测试通过：新创建的租户有激活时间');
        return { success: true, tenantId: tenant.id };
      }
    }
  } catch (error) {
    console.error('✗ 创建租户失败:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('激活时间修复验证测试');
  console.log('='.repeat(80));
  console.log('');

  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n测试终止：登录失败');
    return;
  }

  // 获取租户列表并检查
  const tenantId = await getTenantList();
  if (!tenantId) {
    console.log('\n测试终止：无可用租户');
    return;
  }

  // 获取租户详情
  const detailResult = await getTenantDetail(tenantId);

  // 创建新租户测试
  const createResult = await createTestTenant();

  console.log('\n' + '='.repeat(80));
  console.log('测试总结');
  console.log('='.repeat(80));

  if (detailResult && !detailResult.hasIssue && createResult && createResult.success) {
    console.log('✓ 所有测试通过');
    console.log('  - 现有租户的激活时间显示正常');
    console.log('  - 新创建的租户自动设置激活时间');
  } else {
    console.log('⚠️  部分测试未通过');
    if (detailResult && detailResult.hasIssue) {
      console.log('  - 现有租户存在激活时间未设置的问题');
    }
    if (createResult && !createResult.success) {
      console.log('  - 新创建的租户没有自动设置激活时间');
    }
  }

  console.log('\n前端显示优化：');
  console.log('  - 如果 activatedAt 有值：显示具体时间');
  console.log('  - 如果 licenseStatus 为 active 但 activatedAt 为空：显示"已激活（时间未记录）"');
  console.log('  - 如果 licenseStatus 不是 active：显示"未激活"');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行出错:', error);
  process.exit(1);
});
