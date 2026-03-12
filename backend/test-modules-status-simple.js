const axios = require('axios');

async function testModulesStatusAPI() {
  try {
    console.log('========================================');
    console.log('测试模块状态API - 简化版');
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

    console.log('========================================');
    console.log('✅ 测试完成');
    console.log('========================================');
    console.log();
    console.log('说明:');
    console.log('- 此接口返回CRM前端应该显示的菜单ID列表');
    console.log('- 在Admin后台禁用模块后,该列表会自动更新');
    console.log('- CRM前端会根据此列表过滤菜单显示');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testModulesStatusAPI();
