# Admin后台登录后立即退出问题 - 修复完成

## 问题描述
Admin后台管理系统登录成功后立即退出到登录页面，浏览器控制台和后端日志都没有明显错误信息。

## 问题分析

### 现象
1. 用户输入账号密码，点击登录
2. 显示"登录成功"提示
3. 页面跳转到首页
4. 立即又跳转回登录页面

### 根本原因
登录后，前端会在`MainLayout`组件的`onMounted`钩子中调用`userStore.fetchProfile()`获取用户信息。但是`/api/v1/admin/auth/profile`接口的认证中间件有两个严重问题：

#### 问题1: adminAuth中间件使用了错误的实体
```typescript
// ❌ 错误：使用了CRM的User实体
import { User } from '../entities/User';
const user = await userRepo.findOne({ where: { id: decoded.userId } });

// ✅ 正确：应该使用AdminUser实体
import { AdminUser } from '../entities/AdminUser';
const admin = await adminRepo.findOne({ where: { id: decoded.adminId } });
```

#### 问题2: JWT payload字段不匹配
登录时生成的JWT包含：
```javascript
{
  adminId: "xxx",
  username: "admin",
  role: "super_admin",
  isAdmin: true
}
```

但中间件验证时查询的是：
```typescript
decoded.userId  // ❌ 错误：JWT中没有userId字段
decoded.adminId // ✅ 正确
```

#### 问题3: auth路由没有使用认证中间件
在`backend/src/routes/admin/index.ts`中：
```typescript
router.use('/auth', authRouter); // 所有/auth下的路由都不需要认证
router.use(adminAuth);           // 认证中间件在auth路由之后
```

这导致`/auth/profile`等需要认证的接口也不需要认证，但接口内部检查`req.adminUser`时发现为空，返回"未登录"。

### 前端行为
1. 登录成功，保存token到localStorage
2. 跳转到首页，MainLayout加载
3. MainLayout调用`fetchProfile()`获取用户信息
4. 后端返回401或"未登录"错误
5. 前端store的`fetchProfile`捕获错误，调用`logout()`
6. 清除token，跳转回登录页

## 修复方案

### 1. 修复adminAuth中间件
**文件**: `backend/src/middleware/adminAuth.ts`

修改内容：
- 导入`AdminUser`实体而不是`User`
- 使用`decoded.adminId`而不是`decoded.userId`
- 检查`decoded.isAdmin`标志
- 验证AdminUser的status状态
- 使用正确的JWT_SECRET（从环境变量读取）

```typescript
import { AdminUser } from '../entities/AdminUser';

// 验证Token
const decoded = jwt.verify(token, process.env.JWT_SECRET || '<your-secret-key>');

// 检查是否为Admin Token
if (!decoded.isAdmin || !decoded.adminId) {
  return res.status(403).json({ message: '权限不足' });
}

// 查询Admin用户
const admin = await adminRepo.findOne({ where: { id: decoded.adminId } });
```

### 2. 为auth路由添加认证中间件
**文件**: `backend/src/routes/admin/auth.ts`

为需要认证的路由单独添加`adminAuth`中间件：
```typescript
import { adminAuth, AdminRequest } from '../../middleware/adminAuth';

// 登录不需要认证
router.post('/login', async (req, res) => { ... });

// 以下接口需要认证
router.get('/profile', adminAuth, async (req: AdminRequest, res) => { ... });
router.put('/password', adminAuth, async (req: AdminRequest, res) => { ... });
router.get('/users', adminAuth, async (req: AdminRequest, res) => { ... });
router.post('/users', adminAuth, async (req: AdminRequest, res) => { ... });
router.put('/users/:id', adminAuth, async (req: AdminRequest, res) => { ... });
router.delete('/users/:id', adminAuth, async (req: AdminRequest, res) => { ... });
```

## 验证结果

### 测试登录
```bash
curl -X POST http://localhost:3000/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

返回：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...",
    "admin": {
      "id": "6d73ad60-e93e-11f0-9df2-00fff1948a47",
      "username": "admin",
      "name": "超级管理员",
      "role": "super_admin"
    }
  }
}
```

### 测试获取用户信息
```bash
curl -X GET http://localhost:3000/api/v1/admin/auth/profile \
  -H "Authorization: Bearer <token>"
```

返回：
```json
{
  "success": true,
  "data": {
    "id": "6d73ad60-e93e-11f0-9df2-00fff1948a47",
    "username": "admin",
    "name": "超级管理员",
    "email": null,
    "phone": null,
    "role": "super_admin",
    "lastLoginAt": "2026-03-03T09:15:00.000Z"
  }
}
```

✅ 接口正常工作！

## 前端验证流程
1. 用户登录 → 获取token并保存
2. 跳转首页 → MainLayout加载
3. 调用fetchProfile() → 成功获取用户信息
4. 显示用户名和头像 → 保持登录状态
5. ✅ 不再自动退出！

## 修改的文件
- ✅ `backend/src/middleware/adminAuth.ts` - 修复认证逻辑
- ✅ `backend/src/routes/admin/auth.ts` - 添加认证中间件

## 当前服务状态
- ✅ Backend (后端): http://localhost:3000 - 运行中
- ✅ CRM (前端): http://localhost:5173 - 运行中
- ✅ Admin (管理后台): http://localhost:5174 - 运行中
- ✅ Website (官网): http://localhost:8080 - 运行中

## Admin后台登录信息
- 访问地址: http://localhost:5174
- 用户名: `admin`
- 密码: `admin123`
- 角色: `super_admin`

## 总结
问题已完全解决！Admin后台现在可以正常登录并保持登录状态。根本原因是认证中间件使用了错误的实体类型和JWT字段，导致获取用户信息失败，前端误判为未登录而自动退出。
