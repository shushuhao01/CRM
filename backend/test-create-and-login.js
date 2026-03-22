/**
 * 完整测试：创建租户 + 登录
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testCreateAndLogin() {
  try {
    console.log('🧪 完整测试：创建租户 + 登录\n');

    // 1. 登录 Admin 后台
    console.log('1️⃣ 登录 Admin 后台...');
    const loginRes = await axios.post(`${API_BASE}/admin/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (!loginRes.data.success) {
      console.error('❌ 登录失败:', loginRes.data.message);
      return;
    }

    const token = loginRes.data.data.token;
    console.log('✅ 登录成功\n');

    // 2. 创建租户（使用唯一手机号）
    console.log('2️⃣ 创建租户...');
    const timestamp = Date.now().toString().slice(-8);
    const phone = `138${timestamp}`;

    const tenantData = {
      name: `测试租户-${timestamp}`,
      contact: '测试联系人',
      phone: phone,
      email: `test${timestamp}@example.com`,
      maxUsers: 10,
      maxStorageGb: 5,
      expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    console.log('📤 请求数据:', JSON.stringify(tenantData, null, 2));

    const createRes = await axios.post(`${API_BASE}/admin/tenants`, tenantData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!createRes.data.success) {
      console.error('❌ 创建失败:', createRes.data.message);
      return;
    }

    console.log('\n✅ 创建成功!');
    console.log('📥 响应数据:', JSON.stringify(createRes.data, null, 2));

    const { tenantCode, licenseKey, adminAccount } = createRes.data.data;
    const tenantId = createRes.data.data.id;

    // 3. 等待2秒确保数据写入
    console.log('\n⏳ 等待2秒...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. 测试登录
    console.log('\n3️⃣ 测试登录...');
    console.log(`用户名: ${adminAccount.username}`);
    console.log(`密码: ${adminAccount.password}`);
    console.log(`租户ID: ${tenantId}\n`);

    const userLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: adminAccount.username,
      password: adminAccount.password,
      tenantId: tenantId
    });

    if (userLoginRes.data.success) {
      console.log('✅ 登录成功!');
      console.log('\n返回数据:');
      console.log('- Token:', userLoginRes.data.data.token.substring(0, 50) + '...');
      console.log('- 用户信息:', {
        username: userLoginRes.data.data.user.username,
        realName: userLoginRes.data.data.user.realName,
        role: userLoginRes.data.data.user.role,
        tenantId: userLoginRes.data.data.user.tenantId
      });
      console.log('\n🎉 测试完全成功！');
    } else {
      console.log('❌ 登录失败:', userLoginRes.data.message);
    }

  } catch (error) {
    console.error('\n❌ 测试失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('错误:', error.message);
    }
  }
}

testCreateAndLogin();
