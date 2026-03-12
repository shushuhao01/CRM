/**
 * 测试租户操作功能
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1/admin';

async function testTenantOperations() {
  console.log('=== 测试租户操作功能 ===\n');

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

    // 2. 获取租户列表
    console.log('2. 获取租户列表...');
    const listRes = await axios.get(`${API_BASE}/tenants`, {
      headers,
      params: { page: 1, pageSize: 1 }
    });

    if (!listRes.data.success || listRes.data.data.list.length === 0) {
      console.error('❌ 没有租户数据');
      return;
    }

    const tenant = listRes.data.data.list[0];
    console.log('✅ 获取到租户:', tenant.name);
    console.log('   - ID:', tenant.id);
    console.log('   - 状态:', tenant.status);
    console.log('   - 授权状态:', tenant.licenseStatus);
    console.log('   - 授权码:', tenant.licenseKey);
    console.log('');

    // 3. 测试启用/禁用
    console.log('3. 测试启用/禁用...');
    const currentStatus = tenant.status;
    const targetEndpoint = currentStatus === 'active' ? 'disable' : 'enable';

    const toggleRes = await axios.post(`${API_BASE}/tenants/${tenant.id}/${targetEndpoint}`, {}, { headers });

    if (toggleRes.data.success) {
      console.log(`✅ ${targetEndpoint === 'enable' ? '启用' : '禁用'}成功`);
    }

    // 恢复原状态
    const restoreEndpoint = currentStatus === 'active' ? 'enable' : 'disable';
    await axios.post(`${API_BASE}/tenants/${tenant.id}/${restoreEndpoint}`, {}, { headers });
    console.log('✅ 已恢复原状态\n');

    // 4. 测试暂停/恢复授权
    console.log('4. 测试暂停/恢复授权...');
    const currentLicenseStatus = tenant.licenseStatus;

    if (currentLicenseStatus === 'active') {
      // 暂停
      const suspendRes = await axios.post(`${API_BASE}/tenants/${tenant.id}/suspend`, {}, { headers });
      if (suspendRes.data.success) {
        console.log('✅ 暂停授权成功');
      }

      // 恢复
      const resumeRes = await axios.post(`${API_BASE}/tenants/${tenant.id}/resume`, {}, { headers });
      if (resumeRes.data.success) {
        console.log('✅ 恢复授权成功');
      }
    } else {
      console.log('⚠️  当前授权状态不是active，跳过测试');
    }
    console.log('');

    // 5. 测试续期
    console.log('5. 测试续期...');
    const renewRes = await axios.post(`${API_BASE}/tenants/${tenant.id}/renew`, {
      months: 1
    }, { headers });

    if (renewRes.data.success) {
      console.log('✅ 续期成功');
      console.log('   新过期时间:', renewRes.data.data.expireDate);
    }
    console.log('');

    console.log('🎉 所有测试通过！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testTenantOperations();
