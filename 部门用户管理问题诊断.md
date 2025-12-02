# 部门用户管理问题诊断与修复

## 当前状态
✅ 后端服务正常运行（健康检查通过）
✅ 数据库连接正常
❌ 部门列表/用户列表获取失败（Token问题）

## 问题原因
前端请求时 Token 缺失或无效，导致后端返回 `TOKEN_MISSING` 错误。

## 快速修复步骤

### 1. 清除浏览器缓存并重新登录

在浏览器控制台执行：
```javascript
// 清除所有本地存储
localStorage.clear()
sessionStorage.clear()

// 刷新页面
location.reload()
```

然后重新登录系统。

### 2. 检查 Token 是否正确保存

登录成功后，在浏览器控制台执行：
```javascript
// 检查 Token
console.log('Token:', localStorage.getItem('auth_token'))

// 如果有 Token，测试API
fetch('/api/v1/system/departments', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
  }
}).then(r => r.json()).then(console.log)
```

### 3. 如果还是失败，检查后端日志

在服务器执行：
```bash
pm2 logs abc789.cn-backend --lines 50
```

查看是否有认证相关的错误。

### 4. 检查 JWT 配置

在服务器检查 JWT 密钥：
```bash
cd /www/wwwroot/abc789.cn/backend
cat .env | grep JWT_SECRET
```

确保 JWT_SECRET 已设置且不为空。

## 可能的问题

### 问题1：Token 过期
**症状**：登录后一段时间无法访问
**解决**：重新登录

### 问题2：JWT_SECRET 不匹配
**症状**：登录成功但所有API都返回 TOKEN_MISSING
**解决**：
```bash
# 在服务器上
cd /www/wwwroot/abc789.cn/backend
# 确保 .env 中有 JWT_SECRET
grep JWT_SECRET .env

# 如果没有，添加：
echo "JWT_SECRET=your_secret_key_here_change_this_in_production" >> .env

# 重启服务
pm2 restart abc789.cn-backend
```

### 问题3：CORS 配置问题
**症状**：浏览器控制台显示 CORS 错误
**解决**：检查后端 .env 中的 CORS_ORIGIN 配置

### 问题4：Nginx 配置问题
**症状**：请求返回 502 或 504
**解决**：检查 Nginx 反向代理配置

## 测试步骤

### 1. 测试登录API
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"super123456"}'
```

应该返回包含 token 的 JSON。

### 2. 使用返回的 Token 测试部门API
```bash
TOKEN="从上一步获取的token"
curl http://localhost:3000/api/v1/system/departments \
  -H "Authorization: Bearer $TOKEN"
```

应该返回部门列表。

## 如果以上都不行

可能是数据库中没有初始化数据。在服务器执行：

```bash
cd /www/wwwroot/abc789.cn/backend

# 检查数据库表
mysql -u abc789 -p abc789 -e "SHOW TABLES;"

# 检查用户表
mysql -u abc789 -p abc789 -e "SELECT id, username, role FROM users LIMIT 5;"

# 检查部门表
mysql -u abc789 -p abc789 -e "SELECT id, name, code FROM departments LIMIT 5;"
```

如果表为空，需要重新初始化数据库。

## 联系信息
如果问题仍未解决，请提供：
1. 浏览器控制台完整错误信息
2. 后端日志（pm2 logs）
3. 数据库查询结果
