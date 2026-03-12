/**
 * 任务3.1 - 租户管理API测试
 *
 * 测试目标：
 * 1. 验证租户CRUD接口
 * 2. 验证授权码生成和重新生成
 * 3. 验证租户状态管理
 * 4. 验证Admin权限验证
 */

require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

console.log('='.repeat(80));
console.log('任务3.1 - 租户管理API测试');
console.log('='.repeat(80));

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, message) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`);
    console.log(`   原因: ${message}`);
  }
  testResults.tests.push({ name, passed, message });
}

// 测试用的Admin Token（需要先登录获取）
let adminToken = '';
let testTenantId = '';

async function runTests() {
  try {
    // ========================================
    // 测试1: 获取Admin Token
    // ========================================
    console.log('\n📋 测试组1: 获取Admin Token');
    console.log('-'.repeat(80));

    try {
      // 注意：这里需要使用实际的Admin账号
      // 如果没有Admin账号，需要先在数据库中创建
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: 'admin',
        password: 'admin123'
      });

      console.log('登录响应:', JSON.stringify(loginResponse.data, null, 2));

      if (loginResponse.data.success) {
        // Token可能在data.token或data.tokens.accessToken
        adminToken = loginResponse.data.data.token || loginResponse.data.data.tokens?.accessToken;

        if (adminToken) {
          recordTest('获取Admin Token', true, `Token: ${adminToken.substring(0, 20)}...`);
        } else {
          recordTest('获取Admin Token', false, '登录成功但未找到Token');
          console.log('\n⚠️  响应数据:', JSON.stringify(loginResponse.data, null, 2));
          process.exit(1);
        }
      } else {
        recordTest('获取Admin Token', false, '登录失败: ' + JSON.stringify(loginResponse.data));
        console.log('\n⚠️  请确保数据库中存在Admin账号（username: admin, password: admin123, role: admin）');
        process.exit(1);
      }
    } catch (error) {
      console.log('登录错误详情:', error.response?.data || error.message);
      recordTest('获取Admin Token', false, error.response?.data?.message || error.message);
      console.log('\n⚠️  无法获取Admin Token，请检查：');
      console.log('1. 后端服务是否启动');
      console.log('2. 数据库中是否存在Admin账号');
      console.log('3. Admin账号的role字段是否为"admin"');
      process.exit(1);
    }

    // ========================================
    // 测试2: 创建租户
    // ========================================
    console.log('\n📋 测试组2: 创建租户');
    console.log('-'.repeat(80));

    const tenantData = {
      name: `测试租户-${Date.now()}`,
      code: `TEST${Date.now()}`,
      expireDate: '2027-12-31',
      maxUsers: 50,
      maxStorageGb: 100,
      contactName: '张三',
      contactPhone: '13800138000',
      contactEmail: 'test@example.com'
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/tenants`,
        tenantData,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success && response.data.data) {
        testTenantId = response.data.data.id;
        recordTest('创建租户', true, `租户ID: ${testTenantId}`);
        recordTest('授权码自动生成',
          response.data.data.licenseKey && response.data.data.licenseKey.startsWith('LIC-'),
          `授权码: ${response.data.data.licenseKey}`);
      } else {
        recordTest('创建租户', false, '创建失败');
      }
    } catch (error) {
      recordTest('创建租户', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试3: 获取租户列表
    // ========================================
    console.log('\n📋 测试组3: 获取租户列表');
    console.log('-'.repeat(80));

    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/tenants?page=1&pageSize=20`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success && response.data.data) {
        const { list, total, page, pageSize } = response.data.data;
        recordTest('获取租户列表', true, `共${total}个租户，当前第${page}页`);
        recordTest('租户列表包含测试租户',
          list.some(t => t.id === testTenantId),
          '找到测试租户');
      } else {
        recordTest('获取租户列表', false, '获取失败');
      }
    } catch (error) {
      recordTest('获取租户列表', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试4: 获取租户详情
    // ========================================
    console.log('\n📋 测试组4: 获取租户详情');
    console.log('-'.repeat(80));

    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/tenants/${testTenantId}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success && response.data.data) {
        const tenant = response.data.data;
        recordTest('获取租户详情', true, `租户名称: ${tenant.name}`);
        recordTest('租户详情包含统计数据',
          tenant.userCount !== undefined && tenant.storageUsedGb !== undefined,
          `用户数: ${tenant.userCount}, 存储: ${tenant.storageUsedGb}GB`);
      } else {
        recordTest('获取租户详情', false, '获取失败');
      }
    } catch (error) {
      recordTest('获取租户详情', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试5: 更新租户
    // ========================================
    console.log('\n📋 测试组5: 更新租户');
    console.log('-'.repeat(80));

    try {
      const updateData = {
        name: `测试租户-已更新-${Date.now()}`,
        maxUsers: 100
      };

      const response = await axios.put(
        `${API_BASE_URL}/admin/tenants/${testTenantId}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success && response.data.data) {
        recordTest('更新租户', true, `新名称: ${response.data.data.name}`);
        recordTest('更新租户资源限制',
          response.data.data.maxUsers === 100,
          `最大用户数: ${response.data.data.maxUsers}`);
      } else {
        recordTest('更新租户', false, '更新失败');
      }
    } catch (error) {
      recordTest('更新租户', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试6: 重新生成授权码
    // ========================================
    console.log('\n📋 测试组6: 重新生成授权码');
    console.log('-'.repeat(80));

    let oldLicenseKey = '';
    try {
      // 先获取当前授权码
      const detailResponse = await axios.get(
        `${API_BASE_URL}/admin/tenants/${testTenantId}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      oldLicenseKey = detailResponse.data.data.licenseKey;

      // 重新生成
      const response = await axios.post(
        `${API_BASE_URL}/admin/tenants/${testTenantId}/regenerate-license`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success && response.data.data) {
        const newLicenseKey = response.data.data.licenseKey;
        recordTest('重新生成授权码', true, `新授权码: ${newLicenseKey}`);
        recordTest('授权码已更新',
          newLicenseKey !== oldLicenseKey,
          `旧: ${oldLicenseKey}, 新: ${newLicenseKey}`);
      } else {
        recordTest('重新生成授权码', false, '生成失败');
      }
    } catch (error) {
      recordTest('重新生成授权码', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试7: 修改租户状态
    // ========================================
    console.log('\n📋 测试组7: 修改租户状态');
    console.log('-'.repeat(80));

    try {
      // 禁用租户
      const response = await axios.put(
        `${API_BASE_URL}/admin/tenants/${testTenantId}/status`,
        { status: 'inactive' },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success && response.data.data) {
        recordTest('禁用租户',
          response.data.data.status === 'inactive',
          `状态: ${response.data.data.status}`);
      } else {
        recordTest('禁用租户', false, '禁用失败');
      }

      // 启用租户
      const response2 = await axios.put(
        `${API_BASE_URL}/admin/tenants/${testTenantId}/status`,
        { status: 'active' },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response2.data.success && response2.data.data) {
        recordTest('启用租户',
          response2.data.data.status === 'active',
          `状态: ${response2.data.data.status}`);
      } else {
        recordTest('启用租户', false, '启用失败');
      }
    } catch (error) {
      recordTest('修改租户状态', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试8: 获取租户统计数据
    // ========================================
    console.log('\n📋 测试组8: 获取租户统计数据');
    console.log('-'.repeat(80));

    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/tenants/${testTenantId}/stats`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success && response.data.data) {
        const stats = response.data.data;
        recordTest('获取租户统计数据', true,
          `用户: ${stats.userCount}/${stats.maxUsers}, 存储: ${stats.storageUsedGb}/${stats.maxStorageGb}GB`);
        recordTest('统计数据包含使用率',
          stats.userUsagePercent !== undefined && stats.storageUsagePercent !== undefined,
          `用户使用率: ${stats.userUsagePercent.toFixed(2)}%, 存储使用率: ${stats.storageUsagePercent.toFixed(2)}%`);
      } else {
        recordTest('获取租户统计数据', false, '获取失败');
      }
    } catch (error) {
      recordTest('获取租户统计数据', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试9: 删除租户（软删除）
    // ========================================
    console.log('\n📋 测试组9: 删除租户');
    console.log('-'.repeat(80));

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/admin/tenants/${testTenantId}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success) {
        recordTest('删除租户', true, '删除成功');

        // 验证租户状态变为inactive
        const detailResponse = await axios.get(
          `${API_BASE_URL}/admin/tenants/${testTenantId}`,
          {
            headers: { Authorization: `Bearer ${adminToken}` }
          }
        );

        recordTest('软删除验证',
          detailResponse.data.data.status === 'inactive',
          `状态: ${detailResponse.data.data.status}`);
      } else {
        recordTest('删除租户', false, '删除失败');
      }
    } catch (error) {
      recordTest('删除租户', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试10: 权限验证（无Token访问）
    // ========================================
    console.log('\n📋 测试组10: 权限验证');
    console.log('-'.repeat(80));

    try {
      await axios.get(`${API_BASE_URL}/admin/tenants`);
      recordTest('无Token访问被拒绝', false, '应该返回401错误');
    } catch (error) {
      recordTest('无Token访问被拒绝',
        error.response?.status === 401,
        `返回状态码: ${error.response?.status}`);
    }

    // ========================================
    // 测试总结
    // ========================================
    console.log('\n' + '='.repeat(80));
    console.log('测试总结');
    console.log('='.repeat(80));
    console.log(`总测试数: ${testResults.total}`);
    console.log(`✅ 通过: ${testResults.passed}`);
    console.log(`❌ 失败: ${testResults.failed}`);
    console.log(`通过率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);

    if (testResults.failed === 0) {
      console.log('\n🎉 所有测试通过！租户管理API正常工作。');
      console.log('\n验证结果：');
      console.log('✅ 租户CRUD接口正常');
      console.log('✅ 授权码生成和重新生成正常');
      console.log('✅ 租户状态管理正常');
      console.log('✅ Admin权限验证正常');
    } else {
      console.log('\n⚠️  部分测试失败，请检查上述失败项。');
      console.log('\n失败的测试：');
      testResults.tests
        .filter(t => !t.passed)
        .forEach(t => console.log(`  ❌ ${t.name}: ${t.message}`));
    }

    process.exit(testResults.failed === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ 测试执行失败:', error);
    process.exit(1);
  }
}

// 运行测试
runTests();
