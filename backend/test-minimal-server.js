/**
 * 最小化测试服务器
 * 用于验证基本的Express服务是否可以启动
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 测试路由
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: '服务正常运行',
    timestamp: new Date().toISOString()
  });
});

// Admin登录测试路由
app.post('/api/v1/admin/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      data: {
        token: 'test-token-' + Date.now(),
        user: {
          id: '1',
          username: 'admin'
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: '用户名或密码错误'
    });
  }
});

// 授权统计测试路由
app.get('/api/v1/admin/licenses/statistics', (req, res) => {
  res.json({
    success: true,
    data: {
      total: 0,
      active: 0,
      pending: 0,
      expired: 0,
      revoked: 0
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`✅ 测试服务器启动成功！`);
  console.log(`   地址: http://localhost:${PORT}`);
  console.log(`   健康检查: http://localhost:${PORT}/api/v1/health`);
  console.log(`\n可以运行测试脚本了: node test-admin-licenses-simple.js`);
});

// 错误处理
app.on('error', (error) => {
  console.error('❌ 服务器错误:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});
