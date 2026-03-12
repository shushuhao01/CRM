/**
 * 测试租户详情页面完整功能
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1/admin';

async function testTenantDetailComplete() {
  console.log('=== 测试租户详情页面完整功能 ===\n');

  try {
    // 1. 登录
    console.log('1. 登录...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (!loginRes.data.success) {
      console.error('❌ 登录失败');
      return;
    }

    const token = loginRes.data.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ 登录成功\n');

    // 2. 获取租户列表（获取第一个租户ID）
    console.log('2. 获取租户列表...');
    const listRes = await axios.get(`${API_BASE}/tenants`, {
      headers,
      params: { page: 1, pageSize: 1 }
    });

    if (!listRes.data.success || listRes.data.data.list.length === 0) {
      console.error('❌ 没有租户数据');
      return;
    }

    const tenantId = listRes.data.data.list[0].id;
    const tenantName = listRes.data.data.list[0].name;
    console.log('✅ 获取到租户:', tenantName);
    console.log('   ID:', tenantId, '\n');

    // 3. 获取租户详情
    console.log('3. 获取租户详情...');
    const detailRes = await axios.get(`${API_BASE}/tenants/${tenantId}`, { headers });

    if (!detailRes.data.success) {
      console.error('❌ 获取详情失败');
      return;
    }

    const detail = detailRes.data.data;
    console.log('✅ 获取详情成功');
    console.log('   - 客户名称:', detail.name);
    console.log('   - 租户编码:', detail.code);
    console.log('   - 授权码:', detail.licenseKey);
    console.log('   - 授权状态:', detail.licenseStatus);
    console.log('   - 账号状态:', detail.status);
    console.log('   - 激活时间:', detail.activatedAt || '未激活');
    console.log('   - 用户数:', detail.userCount, '/', detail.maxUsers);
    console.log('   - 存储空间:', detail.usedStorageMb, 'MB /', detail.maxStorageGb, 'GB');
    console.log('');

    // 4. 测试获取用户列表
    console.log('4. 获取租户用户列表...');
    try {
      const usersRes = await axios.get(`${API_BASE}/tenants/${tenantId}/users`, { headers });

      if (usersRes.data.success) {
        const users = usersRes.data.data.list;
        console.log('✅ 获取用户列表成功');
        console.log('   用户总数:', usersRes.data.data.total);

        if (users.length > 0) {
          console.log('   第一个用户:');
          console.log('   - 用户名:', users[0].username);
          console.log('   - 姓名:', users[0].realName || users[0].name);
          console.log('   - 角色:', users[0].role);
          console.log('   - 状态:', users[0].status);
          console.log('   - 最后登录:', users[0].lastLoginAt || '从未登录');
        }
      }
    } catch (e) {
      console.log('⚠️  用户列表API可能未实现或无用户数据');
    }
    console.log('');

    // 5. 测试启用/禁用功能
    console.log('5. 测试启用/禁用功能...');
    const currentStatus = detail.status;
    const targetEndpoint = currentStatus === 'active' ? 'disable' : 'enable';

    const toggleRes = await axios.post(`${API_BASE}/tenants/${tenantId}/${targetEndpoint}`, {}, { headers });

    if (toggleRes.data.success) {
      console.log(`✅ ${targetEndpoint === 'enable' ? '启用' : '禁用'}成功`);

      // 恢复原状态
      const restoreEndpoint = currentStatus === 'active' ? 'enable' : 'disable';
      await axios.post(`${API_BASE}/tenants/${tenantId}/${restoreEndpoint}`, {}, { headers });
      console.log('✅ 已恢复原状态');
    }
    console.log('');

    // 6. 验证字段格式
    console.log('6. 验证字段格式...');
    const requiredFields = [
      'id', 'name', 'code', 'licenseKey', 'licenseStatus',
      'status', 'maxUsers', 'userCount', 'maxStorageGb', 'usedStorageMb',
      'activatedAt', 'createdAt', 'updatedAt'
    ];

    let allFieldsPresent = true;
    for (const field of requiredFields) {
      if (!(field in detail)) {
        console.error(`❌ 缺少字段: ${field}`);
        allFieldsPresent = false;
      }
    }

    if (allFieldsPresent) {
      console.log('✅ 所有必需字段都存在');
    }

    // 检查是否有 snake_case 字段
    const snakeCaseFields = ['license_key', 'license_status', 'user_count', 'activated_at'];
    let hasSnakeCase = false;
    for (const field of snakeCaseFields) {
      if (field in detail) {
        console.warn(`⚠️  发现 snake_case 字段: ${field}`);
        hasSnakeCase = true;
      }
    }

    if (!hasSnakeCase) {
      console.log('✅ 没有 snake_case 字段，格式正确');
    }
    console.log('');

    console.log('🎉 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testTenantDetailComplete();
