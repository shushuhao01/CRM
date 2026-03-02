# CRM开发路线图 - 完整版

## 🎯 核心建议

**先开发租户版本(SaaS),再适配私有部署!** ⭐

### 为什么?

1. **租户版本包含私有部署的所有功能**
   - 租户版本 = 私有部署 + 租户隔离
   - 开发完租户版本,私有部署只需去掉租户隔离即可

2. **一次开发,两种模式**
   - 租户版本开发完成后
   - 设置 `DEPLOY_MODE=private` 就是私有部署
   - 不需要额外开发

3. **避免重复工作**
   - 如果先开发私有部署,后续还要加租户隔离
   - 如果先开发租户版本,私有部署自动完成

---

## 📅 完整开发路线图

### 阶段1: 租户版本基础架构(2周)⭐ 优先级最高

#### Week 1: 数据库改造
**目标**: 完成数据库租户隔离设计

**Day 1-2: 设计和规划**
- [ ] 确认需要添加tenant_id的表
- [ ] 确认不需要添加tenant_id的表
- [ ] 设计租户相关表结构
- [ ] 编写数据库迁移脚本

**Day 3-4: 执行迁移**
- [ ] 所有业务表添加tenant_id字段(可为NULL)
- [ ] 添加索引
- [ ] 修改唯一索引(添加tenant_id)
- [ ] 创建租户相关表

**Day 5: 测试验证**
- [ ] 测试迁移脚本
- [ ] 验证索引性能
- [ ] 备份数据

**交付物**:
```sql
-- 所有业务表已添加tenant_id
ALTER TABLE users ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE customers ADD COLUMN tenant_id VARCHAR(36) NULL;
-- ... 其他表

-- 租户相关表已创建
CREATE TABLE tenants (...);
CREATE TABLE tenant_settings (...);
```

#### Week 2: 后端租户隔离
**目标**: 实现租户认证和数据隔离

**Day 1-2: 租户认证**
- [ ] 实现租户登录接口
- [ ] 实现租户认证中间件
- [ ] 实现Token包含tenantId

**Day 3-4: 数据隔离**
- [ ] 创建BaseRepository(自动添加tenant_id)
- [ ] 修改所有Repository继承BaseRepository
- [ ] 实现智能查询(自动过滤tenant_id)

**Day 5: 测试**
- [ ] 单元测试
- [ ] 数据隔离测试
- [ ] 性能测试

**交付物**:
```typescript
// 租户认证中间件
export const tenantAuth = async (req, res, next) => {
  req.tenantId = decoded.tenantId
  next()
}

// 智能Repository
export class BaseRepository<T> {
  async find(options) {
    // 自动添加tenant_id过滤
  }
}
```

---

### 阶段2: 租户版本核心功能(2周)

#### Week 3: 租户管理
**目标**: 完成租户创建、初始化、管理

**Day 1-2: 租户创建**
- [ ] 实现租户创建接口
- [ ] 实现租户初始化(默认数据)
- [ ] 实现授权码生成

**Day 3-4: 租户管理**
- [ ] 实现租户列表查询
- [ ] 实现租户信息更新
- [ ] 实现租户状态管理(启用/禁用)

**Day 5: 租户配置**
- [ ] 实现租户配置管理
- [ ] 实现租户资源限制
- [ ] 测试

**交付物**:
- 租户CRUD接口
- 租户初始化逻辑
- 租户配置管理

#### Week 4: 前端适配
**目标**: 前端支持租户登录和数据隔离

**Day 1-2: 登录页面**
- [ ] 添加授权码输入框
- [ ] 实现租户登录逻辑
- [ ] 保存租户信息到localStorage

**Day 3-4: 请求处理**
- [ ] 修改请求拦截器(Token包含tenantId)
- [ ] 处理租户过期提示
- [ ] 处理租户禁用提示

**Day 5: 测试优化**
- [ ] 功能测试
- [ ] 用户体验优化
- [ ] Bug修复

**交付物**:
- 租户登录页面
- 请求拦截器
- 租户状态处理

---

### 阶段3: Admin后台核心功能(2周)

#### Week 5: Admin基础功能
**目标**: 完成Admin后台核心管理功能

**Day 1-2: 文件上传**
- [ ] 实现版本文件上传接口
- [ ] 支持大文件上传
- [ ] 文件存储方案

**Day 3-4: 权限控制**
- [ ] 实现权限表设计
- [ ] 实现权限中间件
- [ ] 实现操作日志

**Day 5: 数据导出**
- [ ] 实现Excel导出
- [ ] 实现CSV导出
- [ ] 自定义字段选择

**交付物**:
- 文件上传功能
- 权限控制系统
- 数据导出功能

#### Week 6: Admin完善功能
**目标**: 完善Admin后台功能

**Day 1-2: 接口管理**
- [ ] API列表展示
- [ ] API调用统计
- [ ] 性能监控

**Day 3-4: 高级功能**
- [ ] 高级搜索
- [ ] 批量操作
- [ ] 数据统计

**Day 5: 测试上线**
- [ ] 全面测试
- [ ] Bug修复
- [ ] 文档完善

**交付物**:
- 接口管理功能
- 高级搜索功能
- 批量操作功能

---

### 阶段4: 私有部署适配(1周)⭐ 最后完成

#### Week 7: 私有部署模式
**目标**: 支持私有部署模式

**Day 1-2: 配置和判断**
- [ ] 添加DEPLOY_MODE环境变量
- [ ] 实现模式判断逻辑
- [ ] 修改中间件支持两种模式

**Day 3-4: 授权验证**
- [ ] 实现私有部署授权激活
- [ ] 实现授权验证接口
- [ ] 实现授权过期检查

**Day 5: 测试**
- [ ] 测试私有部署模式
- [ ] 测试租户模式
- [ ] 测试模式切换

**交付物**:
```typescript
// 支持两种模式
if (deployConfig.isSaaS()) {
  // 租户模式逻辑
} else {
  // 私有部署模式逻辑
}
```

---

### 阶段5: 官网和支付(2周)

#### Week 8: 官网完善
**目标**: 完善官网功能

**Day 1-2: 套餐展示**
- [ ] 完善价格页面
- [ ] 套餐对比功能
- [ ] 在线咨询

**Day 3-5: 支付集成**
- [ ] 集成微信支付
- [ ] 集成支付宝
- [ ] 支付回调处理

**交付物**:
- 完善的官网
- 支付功能

#### Week 9: 测试和优化
**目标**: 全面测试和优化

**Day 1-3: 全面测试**
- [ ] 功能测试
- [ ] 性能测试
- [ ] 安全测试
- [ ] 数据隔离测试

**Day 4-5: 优化上线**
- [ ] 性能优化
- [ ] 用户体验优化
- [ ] 文档完善
- [ ] 部署上线

---

## 📋 详细任务清单

### 租户版本需要开发的功能

#### 1. 数据库改造 ⭐ 必须
```sql
-- 所有业务表添加tenant_id
ALTER TABLE users ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE customers ADD COLUMN tenant_id VARCHAR(36) NULL;
ALTER TABLE orders ADD COLUMN tenant_id VARCHAR(36) NULL;
-- ... 其他所有业务表

-- 添加索引
ALTER TABLE users ADD INDEX idx_tenant_id (tenant_id);
-- ... 其他表

-- 修改唯一索引
ALTER TABLE users DROP INDEX uk_username;
ALTER TABLE users ADD UNIQUE KEY uk_tenant_username (tenant_id, username);
-- ... 其他唯一索引

-- 创建租户相关表
CREATE TABLE tenants (...);
CREATE TABLE tenant_settings (...);
```

#### 2. 后端租户隔离 ⭐ 必须
```typescript
// 租户认证中间件
backend/src/middleware/tenantAuth.ts

// 租户Repository
backend/src/repositories/BaseRepository.ts

// 租户登录接口
backend/src/routes/tenantAuth.ts

// 租户管理接口
backend/src/routes/tenants.ts

// 租户初始化服务
backend/src/services/TenantService.ts
```

#### 3. 前端租户支持 ⭐ 必须
```typescript
// 租户登录页面
src/views/Login.vue (添加授权码输入)

// 租户配置
src/config/deploy.ts

// 租户API
src/api/tenant.ts

// 租户状态管理
src/stores/tenant.ts
```

#### 4. 租户资源限制 🟡 应该
```typescript
// 用户数限制
backend/src/middleware/tenantLimit.ts

// 存储空间限制
backend/src/middleware/storageLimit.ts

// 功能权限限制
backend/src/middleware/featureLimit.ts
```

#### 5. 租户数据隔离测试 ⭐ 必须
```typescript
// 数据隔离测试
backend/tests/tenant-isolation.test.ts

// 性能测试
backend/tests/tenant-performance.test.ts

// 安全测试
backend/tests/tenant-security.test.ts
```

---

### 私有部署需要开发的功能

#### 1. 模式判断 ⭐ 必须
```typescript
// 部署模式配置
backend/src/config/deploy.ts
src/config/deploy.ts

// 环境变量
DEPLOY_MODE=private  # 或 saas
```

#### 2. 授权验证 ⭐ 必须
```typescript
// 授权激活接口
backend/src/routes/license.ts
POST /api/v1/license/activate

// 授权验证接口
GET /api/v1/license/verify

// 授权信息查询
GET /api/v1/license/info
```

#### 3. 前端授权管理 🟡 应该
```vue
// 授权管理页面
src/views/System/License.vue

// 授权API
src/api/license.ts

// 授权状态管理
src/stores/license.ts
```

#### 4. 授权过期处理 🟡 应该
```typescript
// 授权过期检查
backend/src/middleware/licenseCheck.ts

// 授权过期提示
src/components/LicenseExpireNotice.vue

// 功能限制
backend/src/middleware/featureLimit.ts
```

---

## 🎯 开发优先级总结

### 第一优先级(必须完成)⭐
1. **数据库租户隔离** (1周)
2. **后端租户认证和隔离** (1周)
3. **前端租户登录** (3天)
4. **租户数据隔离测试** (2天)

### 第二优先级(应该完成)🟡
5. **Admin后台核心功能** (2周)
6. **租户资源限制** (3天)
7. **私有部署模式适配** (1周)

### 第三优先级(可选完成)🟢
8. **官网完善** (1周)
9. **支付集成** (1周)
10. **性能优化** (持续)

---

## 📊 时间估算

### 最小可用版本(MVP)
- **租户版本基础**: 2周
- **租户版本核心**: 2周
- **私有部署适配**: 1周
- **总计**: 5周

### 完整功能版本
- **租户版本**: 4周
- **Admin后台**: 2周
- **私有部署**: 1周
- **官网支付**: 2周
- **总计**: 9周

---

## 🔄 开发流程建议

### 第1步: 租户版本数据库改造(1周)
```
1. 设计租户表结构
2. 所有业务表添加tenant_id
3. 添加索引和修改唯一索引
4. 测试迁移脚本
```

### 第2步: 租户版本后端开发(1周)
```
1. 实现租户认证中间件
2. 实现BaseRepository
3. 实现租户登录接口
4. 实现租户管理接口
```

### 第3步: 租户版本前端开发(1周)
```
1. 修改登录页面
2. 实现租户登录逻辑
3. 修改请求拦截器
4. 测试租户功能
```

### 第4步: 租户版本测试(3天)
```
1. 数据隔离测试
2. 性能测试
3. 安全测试
4. Bug修复
```

### 第5步: Admin后台开发(2周)
```
1. 文件上传功能
2. 权限控制系统
3. 数据导出功能
4. 接口管理功能
```

### 第6步: 私有部署适配(1周)
```
1. 添加模式判断
2. 实现授权验证
3. 测试两种模式
4. 文档完善
```

---

## ✅ 检查清单

### 租户版本开发完成标准
- [ ] 所有业务表已添加tenant_id
- [ ] 租户认证中间件已实现
- [ ] BaseRepository已实现
- [ ] 租户登录接口已实现
- [ ] 租户管理接口已实现
- [ ] 前端租户登录已实现
- [ ] 数据隔离测试通过
- [ ] 性能测试通过
- [ ] 安全测试通过

### 私有部署适配完成标准
- [ ] DEPLOY_MODE环境变量已添加
- [ ] 模式判断逻辑已实现
- [ ] 授权激活接口已实现
- [ ] 授权验证接口已实现
- [ ] 两种模式测试通过
- [ ] 模式切换测试通过
- [ ] 文档已完善

---

## 🎯 总结

### 核心策略
**先开发租户版本,再适配私有部署** ⭐

### 原因
1. 租户版本包含私有部署的所有功能
2. 一次开发,两种模式
3. 避免重复工作

### 时间规划
- **最小可用版本**: 5周
- **完整功能版本**: 9周

### 下一步
1. 开始数据库租户隔离改造
2. 实现后端租户认证和隔离
3. 实现前端租户登录
4. 测试租户功能
5. 适配私有部署模式

---

**文档创建时间**: 2026-03-02  
**推荐策略**: 先租户版本,后私有部署 ⭐  
**预计时间**: 5-9周
