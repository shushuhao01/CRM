/**
 * 完整的授权管理测试服务器
 * 用于验收测试
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 模拟数据存储
const licenses = [];
const licenseLogs = [];
let adminToken = null;

// 生成授权密钥
function generateLicenseKey() {
  const segments = [];
  for (let i = 0; i < 5; i++) {
    const segment = crypto.randomBytes(2).toString('hex').toUpperCase();
    segments.push(segment);
  }
  return segments.join('-');
}

// 记录日志
function logAction(data) {
  const log = {
    id: uuidv4(),
    licenseId: data.licenseId,
    licenseKey: data.licenseKey,
    action: data.action,
    machineId: data.machineId,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    result: data.result,
    message: data.message,
    createdAt: new Date().toISOString()
  };
  licenseLogs.push(log);
  return log;
}

// 认证中间件
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || token !== adminToken) {
    return res.status(401).json({ success: false, message: '未授权' });
  }
  next();
}

// ========== 认证API ==========

// 管理员登录
app.post('/api/v1/admin/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin123') {
    adminToken = 'test-token-' + Date.now();
    res.json({
      success: true,
      data: {
        token: adminToken,
        user: { id: '1', username: 'admin' }
      }
    });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

// ========== 授权管理API ==========

// 获取授权统计
app.get('/api/v1/admin/licenses/statistics', authMiddleware, (req, res) => {
  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.status === 'active').length,
    pending: licenses.filter(l => l.status === 'pending').length,
    expired: licenses.filter(l => l.status === 'expired').length,
    revoked: licenses.filter(l => l.status === 'revoked').length
  };
  res.json({ success: true, data: stats });
});

// 验证授权
app.post('/api/v1/admin/licenses/verify', (req, res) => {
  const { licenseKey, machineId } = req.body;

  const license = licenses.find(l => l.licenseKey === licenseKey);

  if (!license) {
    logAction({
      licenseKey,
      action: 'verify',
      machineId,
      result: 'failed',
      message: '授权码不存在'
    });
    return res.json({
      success: true,
      data: { valid: false, message: '授权码不存在' }
    });
  }

  if (license.status !== 'active') {
    logAction({
      licenseId: license.id,
      licenseKey,
      action: 'verify',
      machineId,
      result: 'failed',
      message: `授权状态异常: ${license.status}`
    });
    return res.json({
      success: true,
      data: { valid: false, license, message: `授权状态异常: ${license.status}` }
    });
  }

  if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
    license.status = 'expired';
    logAction({
      licenseId: license.id,
      licenseKey,
      action: 'expire',
      machineId,
      result: 'failed',
      message: '授权已过期'
    });
    return res.json({
      success: true,
      data: { valid: false, license, message: '授权已过期' }
    });
  }

  logAction({
    licenseId: license.id,
    licenseKey,
    action: 'verify',
    machineId,
    result: 'success',
    message: '授权验证成功'
  });

  res.json({
    success: true,
    data: { valid: true, license, message: '授权验证成功' }
  });
});

// 创建授权
app.post('/api/v1/admin/licenses', authMiddleware, (req, res) => {
  const license = {
    id: uuidv4(),
    licenseKey: generateLicenseKey(),
    customerName: req.body.customerName,
    customerContact: req.body.customerContact,
    customerPhone: req.body.customerPhone,
    customerEmail: req.body.customerEmail,
    licenseType: req.body.licenseType,
    maxUsers: req.body.maxUsers || 10,
    maxStorageGb: req.body.maxStorageGb || 5,
    features: req.body.features,
    expiresAt: req.body.expiresAt,
    notes: req.body.notes,
    status: 'pending',
    activatedAt: null,
    machineId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  licenses.push(license);

  logAction({
    licenseId: license.id,
    licenseKey: license.licenseKey,
    action: 'verify',
    result: 'success',
    message: '授权创建成功'
  });

  res.json({ success: true, data: license });
});

// 获取授权列表
app.get('/api/v1/admin/licenses', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 20, keyword = '', status = '', licenseType = '' } = req.query;

  let filtered = licenses;

  if (keyword) {
    filtered = filtered.filter(l =>
      l.customerName.includes(keyword) ||
      l.licenseKey.includes(keyword) ||
      (l.customerContact && l.customerContact.includes(keyword))
    );
  }

  if (status) {
    filtered = filtered.filter(l => l.status === status);
  }

  if (licenseType) {
    filtered = filtered.filter(l => l.licenseType === licenseType);
  }

  const start = (page - 1) * pageSize;
  const end = start + parseInt(pageSize);
  const list = filtered.slice(start, end);

  res.json({
    success: true,
    data: {
      list,
      total: filtered.length
    }
  });
});

// 获取授权详情
app.get('/api/v1/admin/licenses/:id', authMiddleware, (req, res) => {
  const license = licenses.find(l => l.id === req.params.id);

  if (!license) {
    return res.status(404).json({ success: false, message: '授权不存在' });
  }

  res.json({ success: true, data: license });
});

// 更新授权
app.put('/api/v1/admin/licenses/:id', authMiddleware, (req, res) => {
  const license = licenses.find(l => l.id === req.params.id);

  if (!license) {
    return res.status(404).json({ success: false, message: '授权不存在' });
  }

  Object.assign(license, req.body, { updatedAt: new Date().toISOString() });

  logAction({
    licenseId: license.id,
    licenseKey: license.licenseKey,
    action: 'verify',
    result: 'success',
    message: '授权更新成功'
  });

  res.json({ success: true, data: license });
});

// 删除授权
app.delete('/api/v1/admin/licenses/:id', authMiddleware, (req, res) => {
  const index = licenses.findIndex(l => l.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: '授权不存在' });
  }

  const license = licenses[index];

  logAction({
    licenseId: license.id,
    licenseKey: license.licenseKey,
    action: 'revoke',
    result: 'success',
    message: '授权删除'
  });

  licenses.splice(index, 1);

  res.json({ success: true, message: '删除成功' });
});

// 激活授权
app.post('/api/v1/admin/licenses/:id/activate', authMiddleware, (req, res) => {
  const license = licenses.find(l => l.id === req.params.id);

  if (!license) {
    return res.status(404).json({ success: false, message: '授权不存在' });
  }

  if (license.status === 'active') {
    return res.status(400).json({ success: false, message: '授权已激活' });
  }

  license.status = 'active';
  license.activatedAt = new Date().toISOString();
  if (req.body.machineId) {
    license.machineId = req.body.machineId;
  }
  license.updatedAt = new Date().toISOString();

  logAction({
    licenseId: license.id,
    licenseKey: license.licenseKey,
    action: 'activate',
    machineId: req.body.machineId,
    result: 'success',
    message: '授权激活成功'
  });

  res.json({ success: true, data: license });
});

// 停用授权
app.post('/api/v1/admin/licenses/:id/deactivate', authMiddleware, (req, res) => {
  const license = licenses.find(l => l.id === req.params.id);

  if (!license) {
    return res.status(404).json({ success: false, message: '授权不存在' });
  }

  license.status = 'revoked';
  license.updatedAt = new Date().toISOString();

  logAction({
    licenseId: license.id,
    licenseKey: license.licenseKey,
    action: 'revoke',
    result: 'success',
    message: req.body.reason || '授权停用'
  });

  res.json({ success: true, data: license });
});

// 续期授权
app.post('/api/v1/admin/licenses/:id/renew', authMiddleware, (req, res) => {
  const license = licenses.find(l => l.id === req.params.id);

  if (!license) {
    return res.status(404).json({ success: false, message: '授权不存在' });
  }

  license.expiresAt = req.body.expiresAt;
  if (license.status === 'expired') {
    license.status = 'active';
  }
  license.updatedAt = new Date().toISOString();

  logAction({
    licenseId: license.id,
    licenseKey: license.licenseKey,
    action: 'renew',
    result: 'success',
    message: `授权续期至 ${new Date(req.body.expiresAt).toISOString().split('T')[0]}`
  });

  res.json({ success: true, data: license });
});

// 获取授权日志
app.get('/api/v1/admin/licenses/:id/logs', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;

  const filtered = licenseLogs.filter(log => log.licenseId === req.params.id);
  const start = (page - 1) * pageSize;
  const end = start + parseInt(pageSize);
  const list = filtered.slice(start, end);

  res.json({
    success: true,
    data: {
      list,
      total: filtered.length
    }
  });
});

// 健康检查
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: '服务正常运行',
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`✅ 授权管理测试服务器启动成功！`);
  console.log(`   地址: http://localhost:${PORT}`);
  console.log(`   健康检查: http://localhost:${PORT}/api/v1/health`);
  console.log(`\n📝 测试账号:`);
  console.log(`   用户名: admin`);
  console.log(`   密码: admin123`);
  console.log(`\n🚀 可以运行测试脚本了: node test-admin-licenses-simple.js`);
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
