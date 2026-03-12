/**
 * 测试Admin路由是否正确加载
 */

const express = require('express');
const adminRoutes = require('./dist/routes/admin/index').default;

const app = express();
app.use(express.json());

// 注册Admin路由
app.use('/api/v1/admin', adminRoutes);

// 测试路由
app.listen(3001, () => {
  console.log('✅ 测试服务器启动在端口 3001');
  console.log('测试路由: http://localhost:3001/api/v1/admin/auth/login');

  // 列出所有注册的路由
  console.log('\n注册的路由:');
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      console.log(`  ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          console.log(`  ${Object.keys(handler.route.methods)} ${handler.route.path}`);
        }
      });
    }
  });
});
