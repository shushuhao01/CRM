/**
 * 任务3.2 - 租户配置API测试
 *
 * 测试目标：
 * 1. 验证租户配置查询接口
 * 2. 验证租户配置更新接口
 * 3. 验证租户配置重置接口
 * 4. 验证单个配置项操作
 */

require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

console.log('='.repeat(80));
console.log('任务3.2 - 租户配置API测试');
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
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: 'admin',
        password: 'admin123'
      });

      if (loginResponse.data.success) {
        adminToken = loginResponse.data.data.token || loginResponse.data.data.tokens?.accessToken;

        if (adminToken) {
          recordTest('获取Admin Token', true, `Token获取成功`);
        } else {
          recordTest('获取Admin Token', false, '登录成功但未找到Token');
          process.exit(1);
        }
      } else {
        recordTest('获取Admin Token', false, '登录失败');
        process.exit(1);
      }
    } catch (error) {
      recordTest('获取Admin Token', false, error.response?.data?.message || error.message);
      process.exit(1);
    }

    // ========================================
    // 测试2: 创建测试租户
    // ========================================
    console.log('\n📋 测试组2: 创建测试租户');
    console.log('-'.repeat(80));

    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/tenants`,
        {
          name: `配置测试租户-${Date.now()}`,
          code: `CFGTEST${Date.now()}`,
          expireDate: '2027-12-31',
          maxUsers: 50,
          maxStorageGb: 100
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success && response.data.data) {
        testTenantId = response.data.data.id;
        recordTest('创建测试租户', true, `租户ID: ${testTenantId}`);
      } else {
        recordTest('创建测试租户', false, '创建失败');
        process.exit(1);
      }
    } catch (error) {
      recordTest('创建测试租户', false, error.response?.data?.message || error.message);
      process.exit(1);
    }

    // ========================================
    // 测试3: 获取租户配置（初始为空）
    // ========================================
    console.log('\n📋 测试组3: 获取租户配置');
    console.log('-'.repeat(80));

    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/tenants/${testTenantId}/settings`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success && response.data.data) {
        recordTest('获取租户配置', true, `配置项数: ${Object.keys(response.data.data.settings).length}`);
      } else {
        recordTest('获取租户配置', false, '获取失败');
      }
    } catch (error) {
      recordTest('获取租户配置', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试4: 更新租户配置
    // ========================================
    console.log('\n📋 测试组4: 更新租户配置');
    console.log('-'.repeat(80));

    try {
      const settingsData = {
        settings: {
          theme: {
            value: { primaryColor: '#1890ff', mode: 'light' },
            description: '主题配置'
          },
          features: {
            value: {
              enableCustomerManagement: true,
              enableOrderManagement: true,
              enableProductManagement: false
            },
            description: '功能开关'
          },
          notifications: {
            value: {
              enableEmail: true,
              enableSms: true,
              enableWebhook: false
            },
            description: '通知配置'
          }
        }
      };

      const response = await axios.put(
        `${API_BASE_URL}/admin/tenants/${testTenantId}/settings`,
        settingsData,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success) {
        recordTest('更新租户配置', true, `更新了${response.data.data.updatedCount}个配置项`);
      } else {
        recordTest('更新租户配置', false, '更新失败');
      }
    } catch (error) {
      recordTest('更新租户配置', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试5: 验证配置已更新
    // ========================================
    console.log('\n📋 测试组5: 验证配置已更新');
    console.log('-'.repeat(80));

    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/tenants/${testTenantId}/settings`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success && response.data.data) {
        const settings = response.data.data.settings;
        recordTest('配置项数量正确',
          Object.keys(settings).length === 3,
          `配置项数: ${Object.keys(settings).length}`);

        recordTest('主题配置存在',
          settings.theme !== undefined,
          '主题配置已保存');

        recordTest('功能开关存在',
          settings.features !== undefined,
          '功能开关已保存');

        recordTest('通知配置存在',
          settings.notifications !== undefined,
          '通知配置已保存');
      } else {
        recordTest('验证配置已更新', false, '获取失败');
      }
    } catch (error) {
      recordTest('验证配置已更新', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试6: 获取单个配置项
    // ========================================
    console.log('\n📋 测试组6: 获取单个配置项');
    console.log('-'.repeat(80));

    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/tenants/${testTenantId}/settings/theme`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success && response.data.data) {
        recordTest('获取单个配置项', true, `配置键: ${response.data.data.key}`);
        recordTest('配置值正确',
          response.data.data.value.primaryColor === '#1890ff',
          `主题色: ${response.data.data.value.primaryColor}`);
      } else {
        recordTest('获取单个配置项', false, '获取失败');
      }
    } catch (error) {
      recordTest('获取单个配置项', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试7: 删除配置项
    // ========================================
    console.log('\n📋 测试组7: 删除配置项');
    console.log('-'.repeat(80));

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/admin/tenants/${testTenantId}/settings/notifications`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success) {
        recordTest('删除配置项', true, '删除成功');

        // 验证配置项已删除
        const getResponse = await axios.get(
          `${API_BASE_URL}/admin/tenants/${testTenantId}/settings`,
          {
            headers: { Authorization: `Bearer ${adminToken}` }
          }
        );

        recordTest('验证配置项已删除',
          !getResponse.data.data.settings.notifications,
          '配置项不存在');
      } else {
        recordTest('删除配置项', false, '删除失败');
      }
    } catch (error) {
      recordTest('删除配置项', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 测试8: 重置租户配置
    // ========================================
    console.log('\n📋 测试组8: 重置租户配置');
    console.log('-'.repeat(80));

    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/tenants/${testTenantId}/settings/reset`,
        {},
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      if (response.data.success) {
        recordTest('重置租户配置', true, `重置了${response.data.data.settingsCount}个配置项`);

        // 验证配置已重置
        const getResponse = await axios.get(
          `${API_BASE_URL}/admin/tenants/${testTenantId}/settings`,
          {
            headers: { Authorization: `Bearer ${adminToken}` }
          }
        );

        const settings = getResponse.data.data.settings;
        recordTest('验证配置已重置',
          Object.keys(settings).length === 3,
          `配置项数: ${Object.keys(settings).length}`);
      } else {
        recordTest('重置租户配置', false, '重置失败');
      }
    } catch (error) {
      recordTest('重置租户配置', false, error.response?.data?.message || error.message);
    }

    // ========================================
    // 清理：删除测试租户
    // ========================================
    console.log('\n📋 清理测试数据');
    console.log('-'.repeat(80));

    try {
      await axios.delete(
        `${API_BASE_URL}/admin/tenants/${testTenantId}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      console.log('✅ 已删除测试租户');
    } catch (error) {
      console.log('⚠️  删除测试租户失败:', error.message);
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
      console.log('\n🎉 所有测试通过！租户配置API正常工作。');
      console.log('\n验证结果：');
      console.log('✅ 租户配置查询接口正常');
      console.log('✅ 租户配置更新接口正常');
      console.log('✅ 租户配置重置接口正常');
      console.log('✅ 单个配置项操作正常');
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
