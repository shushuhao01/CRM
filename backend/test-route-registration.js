/**
 * 测试路由注册情况
 */

const express = require('express');
const app = express();

// 模拟admin路由
const adminRouter = express.Router();

// 模拟systemConfig路由
const systemConfigRouter = express.Router();

// 添加路由
systemConfigRouter.get('/system/email-settings', (req, res) => {
  res.json({ message: 'Email settings route works!' });
});

systemConfigRouter.get('/timeout-reminder/config', (req, res) => {
  res.json({ message: 'Timeout reminder route works!' });
});

// 注册路由（模拟admin/index.ts的注册方式）
adminRouter.use('/', systemConfigRouter);

// 挂载到app
app.use('/api/v1/admin', adminRouter);

// 测试路由
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`测试服务器运行在 http://localhost:${PORT}`);
  console.log('\n测试以下路由:');
  console.log(`- http://localhost:${PORT}/api/v1/admin/system/email-settings`);
  console.log(`- http://localhost:${PORT}/api/v1/admin/timeout-reminder/config`);
});
