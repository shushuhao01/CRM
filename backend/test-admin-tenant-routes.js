/**
 * 测试Admin租户路由是否正确加载
 */

const express = require('express');
const path = require('path');

// 模拟加载路由
async function testRoutes() {
  console.log('=== 检查Admin租户路由 ===\n');

  try {
    // 1. 检查路由文件是否存在
    const fs = require('fs');
    const tenantsRoutePath = path.join(__dirname, 'src/routes/admin/tenants.ts');
    const adminIndexPath = path.join(__dirname, 'src/routes/admin/index.ts');

    console.log('1. 检查路由文件...');
    console.log(`   tenants.ts: ${fs.existsSync(tenantsRoutePath) ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`   index.ts: ${fs.existsSync(adminIndexPath) ? '✅ 存在' : '❌ 不存在'}`);
    console.log('');

    // 2. 读取路由文件内容
    console.log('2. 检查路由定义...');
    const tenantsContent = fs.readFileSync(tenantsRoutePath, 'utf-8');

    const routes = [
      { path: '/enable', method: 'POST', handler: 'enableTenant' },
      { path: '/disable', method: 'POST', handler: 'disableTenant' },
      { path: '/suspend', method: 'POST', handler: 'suspendTenant' },
      { path: '/resume', method: 'POST', handler: 'resumeTenant' },
      { path: '/renew', method: 'POST', handler: 'renewTenant' }
    ];

    routes.forEach(route => {
      const hasRoute = tenantsContent.includes(`'/:id${route.path}'`) ||
                       tenantsContent.includes(`"/:id${route.path}"`);
      const hasHandler = tenantsContent.includes(route.handler);
      console.log(`   ${route.method} /:id${route.path}`);
      console.log(`      路由定义: ${hasRoute ? '✅' : '❌'}`);
      console.log(`      处理函数: ${hasHandler ? '✅' : '❌'}`);
    });
    console.log('');

    // 3. 检查控制器
    console.log('3. 检查控制器函数...');
    const controllerPath = path.join(__dirname, 'src/controllers/admin/TenantController.ts');
    const controllerContent = fs.readFileSync(controllerPath, 'utf-8');

    const handlers = ['enableTenant', 'disableTenant', 'suspendTenant', 'resumeTenant', 'renewTenant'];
    handlers.forEach(handler => {
      const exists = controllerContent.includes(`export const ${handler}`);
      console.log(`   ${handler}: ${exists ? '✅' : '❌'}`);
    });
    console.log('');

    // 4. 检查admin路由注册
    console.log('4. 检查admin路由注册...');
    const adminIndexContent = fs.readFileSync(adminIndexPath, 'utf-8');
    const hasTenantsImport = adminIndexContent.includes('tenantsRouter');
    const hasTenantsUse = adminIndexContent.includes("use('/tenants'");
    console.log(`   导入tenantsRouter: ${hasTenantsImport ? '✅' : '❌'}`);
    console.log(`   注册/tenants路由: ${hasTenantsUse ? '✅' : '❌'}`);
    console.log('');

    console.log('✅ 所有路由检查完成');
    console.log('\n提示: 如果路由都正确，请确保：');
    console.log('1. 后端服务已重启');
    console.log('2. 前端请求的baseURL正确: /api/v1/admin');
    console.log('3. 前端有正确的认证token');

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

testRoutes();
