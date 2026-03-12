const axios = require('axios');

async function testFinanceModuleDisable() {
  try {
    // Login
    const loginRes = await axios.post('http://localhost:3000/api/v1/admin/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginRes.data.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log('✅ 登录成功\n');

    // Get finance module
    const modulesRes = await axios.get('http://localhost:3000/api/v1/admin/modules', { headers });
    const financeModule = modulesRes.data.data.find(m => m.code === 'finance_management');

    console.log('财务管理模块信息:');
    console.log(`  - 名称: ${financeModule.name}`);
    console.log(`  - 代码: ${financeModule.code}`);
    console.log(`  - 状态: ${financeModule.is_enabled ? '启用' : '禁用'}`);
    console.log(`  - 系统模块: ${financeModule.is_system ? '是' : '否'}`);
    console.log();

    // Try to disable
    console.log('尝试禁用财务管理模块...');
    const disableRes = await axios.put(
      `http://localhost:3000/api/v1/admin/modules/${financeModule.id}/disable`,
      {},
      { headers }
    );

    console.log('✅ 禁用成功');
    console.log(`  - 消息: ${disableRes.data.message}`);
    console.log();

    // Enable it back
    console.log('恢复启用财务管理模块...');
    await axios.put(
      `http://localhost:3000/api/v1/admin/modules/${financeModule.id}/enable`,
      {},
      { headers }
    );
    console.log('✅ 已恢复启用');

  } catch (error) {
    console.error('❌ 错误:', error.response?.data || error.message);
  }
}

testFinanceModuleDisable();
