const axios = require('axios');

async function testModulesStatusAPI() {
  try {
    console.log('========================================');
    console.log('测试模块状态API');
    console.log('========================================\n');

    // 1. 登录CRM系统
    console.log('1. 登录CRM系统...');
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginRes.data.data.tokens.accessToken;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('✅ 登录成功\n');

    // 2. 获取模块状态
    console.log('2. 获取模块状态...');
    const statusRes = await axios.get('http://localhost:3000/api/v1/system/modules/status', { headers });

    console.log('✅ 获取成功');
    console.log('启用的模块:', statusRes.data.data.enabledModules);
    console.log('模块数量:', statusRes.data.data.enabledModules.length);
    console.log();

    // 3. 在Admin后台禁用财务模块
    console.log('3. 在Admin后台禁用财务模块...');
    const adminLoginRes = await axios.post('http://localhost:3000/api/v1/admin/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const adminToken = adminLoginRes.data.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // 获取财务模块
    const modulesRes = await axios.get('http://localhost:3000/api/v1/admin/modules', { headers: adminHeaders });
    const modulesList = modulesRes.data.data.list || modulesRes.data.data;
    const financeModule = modulesList.find(m => m.code === 'finance_management');

    if (financeModule) {
      await axios.put(
        `http://localhost:3000/api/v1/admin/modules/${financeModule.id}/disable`,
        {},
        { headers: adminHeaders }
      );
      console.log('✅ 财务模块已禁用\n');

      // 4. 再次获取模块状态
      console.log('4. 再次获取模块状态（应该不包含finance）...');
      const statusRes2 = await axios.get('http://localhost:3000/api/v1/system/modules/status', { headers });

      console.log('✅ 获取成功');
      console.log('启用的模块:', statusRes2.data.data.enabledModules);
      console.log('模块数量:', statusRes2.data.data.enabledModules.length);
      console.log('包含finance?', statusRes2.data.data.enabledModules.includes('finance') ? '❌ 是（错误）' : '✅ 否（正确）');
      console.log();

      // 5. 恢复财务模块
      console.log('5. 恢复财务模块...');
      await axios.put(
        `http://localhost:3000/api/v1/admin/modules/${financeModule.id}/enable`,
        {},
        { headers: adminHeaders }
      );
      console.log('✅ 财务模块已恢复\n');

      // 6. 最后再次获取模块状态
      console.log('6. 最后再次获取模块状态（应该包含finance）...');
      const statusRes3 = await axios.get('http://localhost:3000/api/v1/system/modules/status', { headers });

      console.log('✅ 获取成功');
      console.log('启用的模块:', statusRes3.data.data.enabledModules);
      console.log('模块数量:', statusRes3.data.data.enabledModules.length);
      console.log('包含finance?', statusRes3.data.data.enabledModules.includes('finance') ? '✅ 是（正确）' : '❌ 否（错误）');
    }

    console.log('\n========================================');
    console.log('✅ 所有测试完成');
    console.log('========================================');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('详细错误:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testModulesStatusAPI();
