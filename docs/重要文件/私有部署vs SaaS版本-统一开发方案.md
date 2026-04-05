# 私有部署 vs SaaS版本 - 统一开发方案

> **文档版本更新记录**
>
> | 版本 | 日期 | 摘要 | 重要程度 |
> |------|------|------|----------|
> | v1.0 | 2026-03-02 | 初版，确定统一代码+配置区分方案 | - |
> | v1.1 | 2026-04-02 | 补充SaaS守卫保护机制（RSA签名），deploy.ts effectiveMode改造 | ⭐⭐⭐ 极高 |

## 🎯 核心答案

**不需要分开开发!** ⭐

使用**同一套代码**,通过**配置和环境变量**区分私有部署和SaaS版本。

---

## 💡 为什么不需要分开开发?

### 1. 代码复用率高
- 90%的业务逻辑完全相同
- 只有10%的差异(主要是租户隔离)
- 分开开发会导致重复工作

### 2. 维护成本低
- 一套代码,一次修复
- Bug修复同时生效
- 功能更新同步

### 3. 测试成本低
- 只需要测试一套代码
- 减少测试工作量
- 降低出错概率

### 4. 行业标准做法
- Salesforce、Shopify、Slack都是这样做的
- 通过配置区分部署模式
- 成熟可靠

---

## 🔧 统一开发方案

### 方案: 同一套代码 + 配置区分

```
同一套CRM代码
    ↓
通过环境变量判断
    ↓
├─→ 私有部署模式 (DEPLOY_MODE=private)
│   - 不需要tenant_id
│   - 使用授权码激活
│   - 独立数据库
│
└─→ SaaS模式 (DEPLOY_MODE=saas)
    - 需要tenant_id隔离
    - 使用租户授权码登录
    - 共享数据库
```

---

## 📝 具体实现方案

### 1. 环境变量配置

#### .env文件
```bash
# 部署模式: private(私有部署) 或 saas(SaaS租户)
DEPLOY_MODE=private

# 私有部署配置
LICENSE_KEY=XXXX-XXXX-XXXX-XXXX
LICENSE_SERVER=https://admin.yourdomain.com

# SaaS配置
TENANT_ID=tenant-uuid
TENANT_LICENSE_KEY=TENANT-XXXX-XXXX-XXXX-XXXX
```

### 2. 后端实现

#### 配置文件
```typescript
// backend/src/config/deploy.ts
export const deployConfig = {
  mode: process.env.DEPLOY_MODE || 'private', // 'private' | 'saas'
  
  isPrivate: () => deployConfig.mode === 'private',
  isSaaS: () => deployConfig.mode === 'saas',
  
  // 私有部署配置
  private: {
    licenseKey: process.env.LICENSE_KEY,
    licenseServer: process.env.LICENSE_SERVER
  },
  
  // SaaS配置
  saas: {
    tenantId: process.env.TENANT_ID,
    tenantLicenseKey: process.env.TENANT_LICENSE_KEY
  }
}
```

#### 中间件 - 智能判断
```typescript
// backend/src/middleware/auth.ts
import { deployConfig } from '../config/deploy'

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    
    // 根据部署模式处理
    if (deployConfig.isSaaS()) {
      // SaaS模式: 提取租户ID
      req.tenantId = decoded.tenantId
      req.userId = decoded.userId
      
      // 验证租户状态
      const tenant = await Tenant.findOne({ id: req.tenantId })
      if (!tenant || tenant.status !== 'active') {
        return res.status(403).json({ message: '租户无效或已禁用' })
      }
    } else {
      // 私有部署模式: 不需要租户ID
      req.userId = decoded.userId
    }
    
    next()
  } catch (error) {
    res.status(401).json({ message: '认证失败' })
  }
}
```

#### Repository - 智能查询
```typescript
// backend/src/repositories/BaseRepository.ts
import { deployConfig } from '../config/deploy'

export class BaseRepository<T> {
  constructor(
    private repository: Repository<T>,
    private req: any
  ) {}

  // 智能查询 - 自动添加tenant_id过滤
  async find(options?: FindManyOptions<T>) {
    const where = options?.where || {}
    
    // SaaS模式: 自动添加tenant_id过滤
    if (deployConfig.isSaaS() && this.req.tenantId) {
      where['tenant_id'] = this.req.tenantId
    }
    
    return this.repository.find({
      ...options,
      where
    })
  }

  // 智能插入 - 自动添加tenant_id
  async create(data: any) {
    // SaaS模式: 自动添加tenant_id
    if (deployConfig.isSaaS() && this.req.tenantId) {
      data.tenant_id = this.req.tenantId
    }
    
    return this.repository.create(data).save()
  }
}
```

### 3. 前端实现

#### 配置文件
```typescript
// src/config/deploy.ts
export const deployConfig = {
  mode: import.meta.env.VITE_DEPLOY_MODE || 'private',
  
  isPrivate: () => deployConfig.mode === 'private',
  isSaaS: () => deployConfig.mode === 'saas'
}
```

#### 登录页面 - 智能显示
```vue
<!-- src/views/Login.vue -->
<template>
  <div class="login-container">
    <el-form>
      <!-- SaaS模式: 显示授权码输入 -->
      <el-form-item v-if="isSaaS" label="授权码">
        <el-input v-model="form.licenseKey" placeholder="请输入租户授权码" />
      </el-form-item>
      
      <el-form-item label="用户名">
        <el-input v-model="form.username" />
      </el-form-item>
      
      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" />
      </el-form-item>
      
      <el-button @click="handleLogin">登录</el-button>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { deployConfig } from '@/config/deploy'

const isSaaS = deployConfig.isSaaS()

const handleLogin = async () => {
  if (isSaaS) {
    // SaaS模式: 租户登录
    await api.post('/tenant-license/login', {
      licenseKey: form.licenseKey,
      username: form.username,
      password: form.password
    })
  } else {
    // 私有部署模式: 普通登录
    await api.post('/auth/login', {
      username: form.username,
      password: form.password
    })
  }
}
</script>
```

### 4. 数据库设计 - 兼容两种模式

#### 方案A: tenant_id可为NULL (推荐)
```sql
-- 所有业务表
CREATE TABLE customers (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,  -- ⭐ 可为NULL
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  -- ... 其他字段
  INDEX idx_tenant_id (tenant_id)
);

-- 私有部署: tenant_id = NULL
-- SaaS模式: tenant_id = 租户ID
```

**优点**:
- ✅ 同一套数据库结构
- ✅ 私有部署不需要tenant_id
- ✅ SaaS模式自动过滤tenant_id
- ✅ 迁移简单

#### 方案B: 使用默认tenant_id
```sql
-- 私有部署使用固定的tenant_id
-- tenant_id = 'default' 或 'private'

-- 优点: 查询逻辑统一
-- 缺点: 私有部署也有tenant_id(虽然没用)
```

---

## 📊 两种模式的差异对比

| 特性 | 私有部署模式 | SaaS模式 |
|------|-------------|---------|
| 部署方式 | 客户自己部署 | 你的服务器 |
| 数据库 | 客户独立数据库 | 共享数据库 |
| tenant_id | NULL 或不使用 | 必须使用 |
| 授权方式 | 授权码激活 | 租户授权码登录 |
| 登录页面 | 普通登录 | 需要输入授权码 |
| 数据隔离 | 天然隔离(独立数据库) | 通过tenant_id隔离 |
| 用户数限制 | 授权限制 | 套餐限制 |
| 存储空间 | 无限制 | 套餐限制 |
| 升级方式 | 客户自己升级 | 你统一升级 |

---

## 🔄 模式切换

### 私有部署 → SaaS (不常见)
```bash
# 1. 修改环境变量
DEPLOY_MODE=saas
TENANT_ID=new-tenant-uuid

# 2. 数据迁移
UPDATE customers SET tenant_id = 'new-tenant-uuid' WHERE tenant_id IS NULL;
UPDATE orders SET tenant_id = 'new-tenant-uuid' WHERE tenant_id IS NULL;
# ... 其他表

# 3. 重启服务
```

### SaaS → 私有部署 (常见,客户升级)
```bash
# 1. 导出租户数据
SELECT * FROM customers WHERE tenant_id = 'tenant-uuid';
SELECT * FROM orders WHERE tenant_id = 'tenant-uuid';
# ... 其他表

# 2. 导入到客户数据库
# 设置 tenant_id = NULL

# 3. 修改环境变量
DEPLOY_MODE=private
LICENSE_KEY=XXXX-XXXX-XXXX-XXXX

# 4. 重启服务
```

---

## 🎯 推荐的开发流程

### 第1步: 开发核心功能(不考虑模式)
```
开发订单管理、客户管理等核心功能
暂时不考虑私有部署还是SaaS
```

### 第2步: 添加租户隔离支持
```
1. 数据库表添加 tenant_id 字段(可为NULL)
2. 后端添加租户中间件
3. Repository添加智能查询
```

### 第3步: 添加模式判断
```
1. 添加环境变量配置
2. 根据模式调整登录流程
3. 根据模式调整授权验证
```

### 第4步: 测试两种模式
```
1. 测试私有部署模式
2. 测试SaaS模式
3. 测试模式切换
```

---

## 💻 代码示例

### 完整的Controller示例
```typescript
// backend/src/controllers/CustomerController.ts
import { deployConfig } from '../config/deploy'

export class CustomerController {
  // 获取客户列表
  async getCustomers(req: Request, res: Response) {
    const where: any = {}
    
    // SaaS模式: 添加租户过滤
    if (deployConfig.isSaaS()) {
      where.tenant_id = req.tenantId
    }
    // 私有部署模式: 不需要过滤
    
    const customers = await Customer.find({ where })
    res.json({ data: customers })
  }
  
  // 创建客户
  async createCustomer(req: Request, res: Response) {
    const data = req.body
    
    // SaaS模式: 自动添加tenant_id
    if (deployConfig.isSaaS()) {
      data.tenant_id = req.tenantId
    }
    // 私有部署模式: tenant_id = NULL
    
    const customer = await Customer.create(data).save()
    res.json({ data: customer })
  }
}
```

### 完整的前端API示例
```typescript
// src/api/customer.ts
import { deployConfig } from '@/config/deploy'

export const customerApi = {
  // 获取客户列表
  async getCustomers() {
    // 两种模式使用相同的API
    // 后端会根据模式自动处理
    return request.get('/api/v1/customers')
  },
  
  // 创建客户
  async createCustomer(data: any) {
    // 两种模式使用相同的API
    // 后端会根据模式自动添加tenant_id
    return request.post('/api/v1/customers', data)
  }
}
```

---

## 📋 需要注意的地方

### 1. 数据库迁移脚本
```sql
-- 添加tenant_id时设置为可NULL
ALTER TABLE customers ADD COLUMN tenant_id VARCHAR(36) NULL;

-- 不要设置NOT NULL,否则私有部署会报错
-- ❌ 错误
ALTER TABLE customers ADD COLUMN tenant_id VARCHAR(36) NOT NULL;
```

### 2. 唯一索引
```sql
-- 私有部署: 用户名唯一
-- SaaS模式: 租户内用户名唯一

-- 方案: 使用复合唯一索引,允许NULL
CREATE UNIQUE INDEX uk_tenant_username 
ON users (tenant_id, username);

-- MySQL允许多个NULL值,所以私有部署不受影响
```

### 3. 系统配置
```typescript
// 系统配置表不需要tenant_id
// 因为是全局配置

// ✅ 正确
CREATE TABLE system_config (
  id VARCHAR(36) PRIMARY KEY,
  config_key VARCHAR(100),
  config_value TEXT
  -- 不需要tenant_id
);
```

---

## 🎯 总结

### 核心原则
**一套代码,配置区分,智能判断**

### 优势
- ✅ 代码复用率高(90%+)
- ✅ 维护成本低(一次修复)
- ✅ 测试成本低(一套测试)
- ✅ 升级方便(同步更新)
- ✅ 灵活切换(配置即可)

### 实施建议
1. 先开发核心功能
2. 再添加租户隔离
3. 最后添加模式判断
4. 充分测试两种模式

### 关键代码
```typescript
// 判断部署模式
if (deployConfig.isSaaS()) {
  // SaaS模式逻辑
} else {
  // 私有部署模式逻辑
}
```

---

**结论**: 不需要分开开发,使用同一套代码,通过配置区分! ⭐

---

## 🔐 SaaS 模式防篡改保护（2026-04-02 新增）

### 问题
仅靠环境变量 `DEPLOY_MODE=saas` 控制，私有客户修改一行即可解锁多租户功能。

### 解决方案：RSA 签名守卫

SaaS 模式需要额外的 `SAAS_LICENSE_TOKEN`（RS256 签名 JWT），由平台运营方用 RSA 私钥签发，后端用硬编码的公钥验证。客户没有私钥，无法伪造。

```
DEPLOY_MODE=saas + 有效SAAS_LICENSE_TOKEN → SaaS模式正常运行
DEPLOY_MODE=saas + 无Token/伪造Token    → 自动降级为private模式
DEPLOY_MODE=private                     → 直接私有模式（无需Token）
```

### deploy.ts 改造

```typescript
// 原来（不安全）
isSaaS: () => deployConfig.mode === 'saas'

// 现在（安全）—— 基于验证后的 effectiveMode
isSaaS: () => deployConfig.effectiveMode === 'saas'
// effectiveMode 由 SaaSGuardService 验证通过后才为 'saas'
// 验证失败则被强制设为 'private'
```

### 相关文件
- `backend/src/services/SaaSGuardService.ts` — RSA公钥验证逻辑
- `backend/src/middleware/saasGuard.ts` — 路由级守卫中间件
- `backend/scripts/generate-saas-license.js` — 许可签发工具（含私钥，**绝不交付客户**）
- `docs/重要文件/部署模式许可证管理-运营方完整操作手册（机密）.md` — 完整操作手册

---

**文档创建时间**: 2026-03-02  
**最后更新时间**: 2026-04-02  
**推荐方案**: 统一开发 + 配置区分 + RSA签名守卫
