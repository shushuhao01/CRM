# 生产环境 - 真实API配置说明

## ✅ 已完成的修复

### 1. 切换到真实后端API
- **修改前**：使用 `/mock-auth/login`（模拟API）
- **修改后**：使用 `/auth/login`（真实后端API）
- **位置**：`src/services/authApiService.ts`

### 2. TOKEN来源
- **Mock模式**：前端生成 `mock-token-${Date.now()}`
- **生产模式**：后端JWT生成真实TOKEN
- **存储位置**：`localStorage.getItem('auth_token')`

### 3. 用户数据来源
- **Mock模式**：从 `localStorage.getItem('crm_mock_users')` 读取
- **生产模式**：从数据库 `users` 表读取
- **验证方式**：后端bcrypt密码验证

## 🔧 系统配置

### 生产环境自动配置
```typescript
// src/api/mock.ts
export const shouldUseMockApi = (): boolean => {
  // 1. 检查localStorage强制设置
  if (localStorage.getItem('erp_mock_enabled') === 'true') {
    return true  // 强制使用Mock
  }

  // 2. 生产环境自动禁用Mock
  if (import.meta.env.PROD) {
    return false  // ✅ 生产环境使用真实API
  }

  // 3. 开发环境根据配置决定
  return !import.meta.env.VITE_API_BASE_URL
}
```

### 环境变量配置
```bash
# .env.production
VITE_API_BASE_URL=/api/v1
NODE_ENV=production
```

## 📊 数据流程

### 登录流程（生产环境）

1. **用户输入**
   - 用户名：数据库中的username
   - 密码：数据库中的password（bcrypt加密）

2. **前端请求**
   ```typescript
   POST /api/v1/auth/login
   {
     "username": "admin",
     "password": "admin123",
     "rememberMe": false
   }
   ```

3. **后端处理**
   - 查询数据库 `users` 表
   - 验证密码（bcrypt.compare）
   - 生成JWT TOKEN
   - 返回用户信息和TOKEN

4. **后端响应**
   ```json
   {
     "success": true,
     "message": "登录成功",
     "data": {
       "user": {
         "id": 1,
         "username": "admin",
         "realName": "系统管理员",
         "email": "admin@example.com",
         "role": "super_admin",
         "status": "active",
         ...
       },
       "tokens": {
         "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
         "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
       }
     }
   }
   ```

5. **前端处理**
   - `apiService.post()` 提取 `response.data.data`
   - `authApiService.login()` 返回 `{ user, tokens }`
   - `user.ts` 从 `response.tokens.accessToken` 提取TOKEN
   - 保存到 `localStorage.setItem('auth_token', token)`

## 🔐 TOKEN验证机制

### TOKEN生成（后端）
```typescript
// backend/src/config/jwt.ts
static generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',  // 7天有效期
    issuer: 'crm-system',
    audience: 'crm-users'
  })
}
```

### TOKEN使用（前端）
```typescript
// src/services/apiService.ts
private setupInterceptors(): void {
  this.axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })
}
```

### TOKEN验证（后端）
```typescript
// backend/src/middleware/auth.ts
export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const payload = JwtConfig.verifyAccessToken(token)
  req.currentUser = payload
  next()
}
```

## 📝 日志输出

### 登录成功日志
```
[Auth] 使用真实后端API登录: admin
[Auth] 真实API登录成功，TOKEN已获取
[Auth] 用户: 系统管理员
[Auth] TOKEN: eyJhbGciOiJIUzI1NiIsInR5cCI6...
[Auth] ========== 开始提取Token ==========
[Auth] response完整对象: { user: {...}, tokens: {...} }
[Auth] 提取的accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6...
[Auth] ✅ Token已设置: eyJhbGciOiJIUzI1NiIsInR5cCI6...
[Auth] ✅ localStorage已保存: eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

## ⚠️ 注意事项

### 1. 确保后端服务运行
```bash
# 检查后端服务状态
pm2 status

# 查看后端日志
pm2 logs crm-backend
```

### 2. 确保数据库连接正常
```bash
# 测试数据库连接
node test-db-connection.cjs
```

### 3. 确保用户数据存在
```sql
-- 查询用户表
SELECT id, username, realName, role, status FROM users;

-- 重置管理员密码（如果需要）
UPDATE users SET password = '$2a$10$...' WHERE username = 'admin';
```

### 4. 清除浏览器缓存
- 按 `Ctrl + Shift + Delete` 清除缓存
- 或按 `Ctrl + Shift + R` 强制刷新

### 5. 禁用Mock模式（如果被启用）
```javascript
// 在浏览器控制台执行
localStorage.removeItem('erp_mock_enabled')
location.reload()
```

## 🎯 验证步骤

1. **打开浏览器控制台**（F12）
2. **访问登录页面**
3. **输入数据库中的用户名密码**
4. **查看控制台日志**：
   - 应该看到 `[Auth] 使用真实后端API登录`
   - 应该看到 `[Auth] 真实API登录成功，TOKEN已获取`
   - 应该看到完整的TOKEN字符串
5. **查看Network标签**：
   - 请求URL应该是 `/api/v1/auth/login`
   - 响应应该包含 `user` 和 `tokens`
6. **查看Application标签**：
   - Local Storage应该有 `auth_token`
   - 值应该是JWT格式的长字符串

## 🚀 部署后检查清单

- [ ] 后端服务正常运行
- [ ] 数据库连接正常
- [ ] 用户数据存在且密码正确
- [ ] 前端构建成功
- [ ] 浏览器缓存已清除
- [ ] Mock模式已禁用
- [ ] 登录成功并获取TOKEN
- [ ] TOKEN保存到localStorage
- [ ] 后续API请求带上TOKEN

## 📞 问题排查

如果登录失败，请检查：

1. **控制台错误信息**
2. **Network标签的请求响应**
3. **后端日志**：`pm2 logs crm-backend`
4. **数据库用户数据**
5. **TOKEN是否正确保存**

所有问题都应该在控制台日志中有详细输出！
