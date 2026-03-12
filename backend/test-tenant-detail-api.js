/**
 * 测试租户详情API
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1/admin';

async function testTenantDetailAPI() {
  console.log('=== 测试租户详情API ===\n');

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
    console.log('✅ 获取到租户ID:', tenantId, '\n');

    // 3. 获取租户详情
    console.log('3. 获取租户详情...');
    const detailRes = await axios.get(`${API_BASE}/tenants/${tenantId}`, { headers });

    if (!detailRes.data.success) {
      console.error('❌ 获取详情失败:', detailRes.data.message);
      return;
    }

    console.log('✅ 获取详情成功\n');
    console.log('详情数据:');
    console.log(JSON.stringify(detailRes.data.data, null, 2));

    // 4. 验证字段格式
    console.log('\n4. 验证字段格式...');
    const data = detailRes.data.data;
    const requiredFields = [
      'id', 'name', 'code', 'licenseKey', 'licenseStatus',
      'status', 'maxUsers', 'userCount', 'maxStorageGb', 'usedStorageMb'
    ];

    let allFieldsPresent = true;
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.error(`❌ 缺少字段: ${field}`);
        allFieldsPresent = false;
      }
    }

    if (allFieldsPresent) {
      console.log('✅ 所有必需字段都存在');
    }

    // 检查是否有 snake_case 字段（不应该有）
    const snakeCaseFields = ['license_key', 'license_status', 'user_count', 'max_users', 'created_at'];
    let hasSnakeCase = false;
    for (const field of snakeCaseFields) {
      if (field in data) {
        console.warn(`⚠️  发现 snake_case 字段: ${field}`);
        hasSnakeCase = true;
      }
    }

    if (!hasSnakeCase) {
      console.log('✅ 没有 snake_case 字段，格式正确');
    }

    console.log('\n🎉 测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testTenantDetailAPI();
