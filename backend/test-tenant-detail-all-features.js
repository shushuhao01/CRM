/**
 * 测试租户详情页面所有功能
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1/admin';

async function testAllFeatures() {
  console.log('=== 测试租户详情页面所有功能 ===\n');

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

    // 2. 获取租户ID
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
    const tenantId = tenant.id;
    console.log('✅ 获取到租户:', tenant.name);
    console.log('   ID:', tenantId);
    console.log('   当前用户数:', tenant.userCount, '/', tenant.maxUsers);
    console.log('   当前存储:', tenant.usedStorageMb, 'MB /', tenant.maxStorageGb, 'GB\n');

    // 3. 测试编辑租户信息
    console.log('3. 测试编辑租户信息...');
    try {
      const editRes = await axios.put(`${API_BASE}/tenants/${tenantId}`, {
        name: tenant.name,
        contact: '测试联系人',
        phone: '13800138000',
        email: 'test@example.com',
        remark: '测试备注'
      }, { headers });

      if (editRes.data.success) {
        console.log('✅ 编辑租户信息成功');
      }
    } catch (e) {
      console.error('❌ 编辑租户信息失败:', e.response?.data?.message || e.message);
    }
    console.log('');

    // 4. 测试调整用户数
    console.log('4. 测试调整用户数...');
    try {
      const newMaxUsers = (tenant.maxUsers || 10) + 5;
      const adjustUsersRes = await axios.put(`${API_BASE}/tenants/${tenantId}`, {
        maxUsers: newMaxUsers
      }, { headers });

      if (adjustUsersRes.data.success) {
        console.log('✅ 调整用户数成功');
        console.log('   新最大用户数:', newMaxUsers);

        // 恢复原值
        await axios.put(`${API_BASE}/tenants/${tenantId}`, {
          maxUsers: tenant.maxUsers
        }, { headers });
        console.log('✅ 已恢复原值');
      }
    } catch (e) {
      console.error('❌ 调整用户数失败:', e.response?.data?.message || e.message);
    }
    console.log('');

    // 5. 测试调整存储空间
    console.log('5. 测试调整存储空间...');
    try {
      const newMaxStorageGb = (tenant.maxStorageGb || 5) + 10;
      const adjustStorageRes = await axios.put(`${API_BASE}/tenants/${tenantId}`, {
        maxStorageGb: newMaxStorageGb
      }, { headers });

      if (adjustStorageRes.data.success) {
        console.log('✅ 调整存储空间成功');
        console.log('   新最大存储空间:', newMaxStorageGb, 'GB');

        // 恢复原值
        await axios.put(`${API_BASE}/tenants/${tenantId}`, {
          maxStorageGb: tenant.maxStorageGb
        }, { headers });
        console.log('✅ 已恢复原值');
      }
    } catch (e) {
      console.error('❌ 调整存储空间失败:', e.response?.data?.message || e.message);
    }
    console.log('');

    // 6. 测试重新生成授权码
    console.log('6. 测试重新生成授权码...');
    try {
      const regenerateRes = await axios.post(`${API_BASE}/tenants/${tenantId}/regenerate-license`, {}, { headers });

      if (regenerateRes.data.success) {
        console.log('✅ 重新生成授权码成功');
        console.log('   新授权码:', regenerateRes.data.data.licenseKey);
      }
    } catch (e) {
      console.error('❌ 重新生成授权码失败:', e.response?.data?.message || e.message);
    }
    console.log('');

    // 7. 测试续期
    console.log('7. 测试续期...');
    try {
      const renewRes = await axios.post(`${API_BASE}/tenants/${tenantId}/renew`, {
        months: 1
      }, { headers });

      if (renewRes.data.success) {
        console.log('✅ 续期成功');
        console.log('   新过期时间:', renewRes.data.data.expireDate);
      }
    } catch (e) {
      console.error('❌ 续期失败:', e.response?.data?.message || e.message);
    }
    console.log('');

    // 8. 测试暂停/恢复授权
    console.log('8. 测试暂停/恢复授权...');
    try {
      // 暂停
      const suspendRes = await axios.post(`${API_BASE}/tenants/${tenantId}/suspend`, {}, { headers });
      if (suspendRes.data.success) {
        console.log('✅ 暂停授权成功');
      }

      // 恢复
      const resumeRes = await axios.post(`${API_BASE}/tenants/${tenantId}/resume`, {}, { headers });
      if (resumeRes.data.success) {
        console.log('✅ 恢复授权成功');
      }
    } catch (e) {
      console.error('❌ 暂停/恢复授权失败:', e.response?.data?.message || e.message);
    }
    console.log('');

    console.log('🎉 所有功能测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testAllFeatures();
