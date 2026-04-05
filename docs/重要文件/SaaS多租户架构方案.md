# SaaS多租户架构方案

> **文档版本更新记录**
>
> | 版本 | 日期 | 摘要 | 重要程度 |
> |------|------|------|----------|
> | v1.0 | 2026-03 | 初版，方案设计和对比 | - |
> | v1.1 | 2026-04-02 | 状态更新：多租户已完成实施，补充SaaS守卫保护、127表现状 | ⭐⭐ 高 |

## 📊 当前状态分析

### CRM私有部署版本
- ✅ 已完成
- ✅ 客户独立部署,独立数据库
- ✅ 使用授权码激活
- ✅ 无数据隔离问题

### CRM SaaS租户版本
- ✅ 多租户隔离已完成（共享数据库 + tenant_id 行级隔离）
- ✅ 127张表全面支持多租户
- ✅ 数据权限全链路过滤
- ✅ SaaS 模式受 RSA 签名守卫保护（防止私有客户擅自启用）
- ✅ 管理后台可管理租户、套餐、授权码

---

## 🎯 三种多租户方案对比

### 方案1: 独立数据库(Database per Tenant)
```
租户A → 数据库A (crm_tenant_a)
租户B → 数据库B (crm_tenant_b)
租户C → 数据库C (crm_tenant_c)
```

**优点**:
- ✅ 数据完全隔离,最安全
- ✅ 性能互不影响
- ✅ 备份恢复独立
- ✅ 可以单独迁移租户
- ✅ 符合某些行业合规要求

**缺点**:
- ❌ 数据库连接数消耗大
- ❌ 维护成本高(每个租户一个数据库)
- ❌ 升级麻烦(需要升级所有数据库)
- ❌ 成本高(数据库资源消耗大)

**适用场景**:
- 大客户(付费高)
- 对数据安全要求极高
- 需要独立备份和恢复
- 租户数量少(< 100)

---

### 方案2: 共享数据库+独立Schema(Schema per Tenant)
```
同一个MySQL服务器
├── Schema: tenant_a (租户A的所有表)
├── Schema: tenant_b (租户B的所有表)
└── Schema: tenant_c (租户C的所有表)
```

**优点**:
- ✅ 数据隔离较好
- ✅ 比独立数据库成本低
- ✅ 可以单独备份Schema
- ✅ 性能较好

**缺点**:
- ❌ MySQL的Schema就是数据库,和方案1类似
- ❌ 维护成本仍然较高
- ❌ 升级仍然麻烦

**适用场景**:
- 中等规模客户
- 对隔离有一定要求
- 租户数量中等(100-500)

---

### 方案3: 共享数据库+租户ID隔离(Shared Database)⭐ 推荐
```
同一个数据库,所有表添加 tenant_id 字段
├── users (tenant_id, ...)
├── customers (tenant_id, ...)
├── orders (tenant_id, ...)
└── ...
```

**优点**:
- ✅ 成本最低(共享资源)
- ✅ 维护简单(一个数据库)
- ✅ 升级方便(一次升级所有租户)
- ✅ 扩展性好(可支持大量租户)
- ✅ 资源利用率高

**缺点**:
- ⚠️ 需要严格的代码控制(防止数据泄露)
- ⚠️ 性能可能受其他租户影响
- ⚠️ 备份恢复需要特殊处理

**适用场景**:
- 小型客户(标准套餐)
- 租户数量多(> 500)
- 成本敏感
- **大多数SaaS产品的选择** ⭐

---

## 🎯 推荐方案: 共享数据库+租户ID隔离

### 为什么推荐这个方案?

1. **成本效益最高**: 一个数据库服务器可以支持数千个租户
2. **维护简单**: 只需要维护一个数据库
3. **升级方便**: 一次升级,所有租户受益
4. **行业标准**: Salesforce、Shopify、Slack等都用这个方案
5. **适合你的场景**: 你是刚开始做SaaS,租户数量会逐渐增长

### 你担心的问题如何解决?

#### 问题1: 数据冲突
**解决方案**: 所有查询都强制添加 `tenant_id` 过滤

```typescript
// ❌ 错误: 没有租户过滤
const customers = await Customer.find()

// ✅ 正确: 添加租户过滤
const customers = await Customer.find({ 
  where: { tenant_id: req.tenantId } 
})
```

#### 问题2: 租户管理员设置影响其他人
**解决方案**: 租户级别的配置表,通过 `tenant_id` 隔离

```sql
-- 租户配置表
CREATE TABLE tenant_settings (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,  -- 租户ID
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  UNIQUE KEY uk_tenant_setting (tenant_id, setting_key)
);

-- 租户A的设置
INSERT INTO tenant_settings VALUES 
('uuid1', 'tenant-a', 'order_prefix', 'A-');

-- 租户B的设置
INSERT INTO tenant_settings VALUES 
('uuid2', 'tenant-b', 'order_prefix', 'B-');
```

#### 问题3: 权限冲突
**解决方案**: 角色和权限也添加 `tenant_id`

```sql
-- 角色表
CREATE TABLE roles (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,  -- 租户ID
  name VARCHAR(50) NOT NULL,
  permissions JSON,
  UNIQUE KEY uk_tenant_role (tenant_id, name)
);

-- 用户表
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,  -- 租户ID
  username VARCHAR(50) NOT NULL,
  role_id VARCHAR(36),
  UNIQUE KEY uk_tenant_username (tenant_id, username)
);
```

---

## 🔧 技术实施方案

### 1. 数据库设计

#### 所有业务表添加 tenant_id
```sql
-- 示例: 客户表
CREATE TABLE customers (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,  -- ⭐ 租户ID
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  -- ... 其他字段
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_tenant_name (tenant_id, name)
);

-- 示例: 订单表
CREATE TABLE orders (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,  -- ⭐ 租户ID
  order_no VARCHAR(50) NOT NULL,
  customer_id VARCHAR(36),
  -- ... 其他字段
  INDEX idx_tenant_id (tenant_id),
  UNIQUE KEY uk_tenant_order_no (tenant_id, order_no)
);
```

#### 哪些表不需要 tenant_id?
```sql
-- 系统级别的表(所有租户共享)
- system_config      -- 系统配置
- system_license     -- 系统授权
- admin_users        -- Admin管理员
- tenants            -- 租户表本身
- tenant_packages    -- 套餐表
- versions           -- 版本表
```

### 2. 后端中间件实现

#### 租户识别中间件
```typescript
// backend/src/middleware/tenantAuth.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface TenantRequest extends Request {
  tenantId?: string
  tenantInfo?: any
}

export const tenantAuth = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. 从Token中提取租户ID
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ message: '未登录' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    req.tenantId = decoded.tenantId
    req.userId = decoded.userId

    // 2. 验证租户状态
    const tenant = await Tenant.findOne({ 
      where: { id: req.tenantId } 
    })
    
    if (!tenant) {
      return res.status(403).json({ message: '租户不存在' })
    }
    
    if (tenant.status !== 'active') {
      return res.status(403).json({ message: '租户已被禁用' })
    }
    
    if (tenant.expire_date && new Date(tenant.expire_date) < new Date()) {
      return res.status(403).json({ message: '租户已过期' })
    }

    req.tenantInfo = tenant
    next()
  } catch (error) {
    res.status(401).json({ message: '认证失败' })
  }
}
```

#### TypeORM全局过滤器
```typescript
// backend/src/config/database.ts
import { DataSource } from 'typeorm'

export const AppDataSource = new DataSource({
  // ... 其他配置
  
  // 全局查询过滤器
  subscribers: [TenantSubscriber]
})

// backend/src/subscribers/TenantSubscriber.ts
import { 
  EntitySubscriberInterface, 
  EventSubscriber, 
  LoadEvent 
} from 'typeorm'

@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  // 在查询前自动添加 tenant_id 过滤
  beforeQuery(event: any) {
    const tenantId = getCurrentTenantId() // 从上下文获取
    if (tenantId && event.metadata.tableName !== 'tenants') {
      event.query.andWhere('tenant_id = :tenantId', { tenantId })
    }
  }
}
```

### 3. 前端实现

#### 登录时保存租户信息
```typescript
// src/api/auth.ts
export const login = async (licenseKey: string, username: string, password: string) => {
  const res = await request.post('/api/v1/tenant-license/login', {
    licenseKey,
    username,
    password
  })
  
  // 保存租户信息
  localStorage.setItem('tenantId', res.data.tenantId)
  localStorage.setItem('tenantName', res.data.tenantName)
  localStorage.setItem('token', res.data.token)
  
  return res.data
}
```

#### 请求拦截器自动添加租户ID
```typescript
// src/api/request.ts
import axios from 'axios'

const request = axios.create({
  baseURL: '/api/v1'
})

// 请求拦截器
request.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Token中已包含tenantId,后端会自动提取
  return config
})

export default request
```

---

## 🔒 安全措施

### 1. 强制租户过滤
```typescript
// 创建一个基础Repository类
export class TenantRepository<T> {
  constructor(
    private repository: Repository<T>,
    private tenantId: string
  ) {}

  // 所有查询都自动添加tenant_id
  async find(options?: FindManyOptions<T>) {
    return this.repository.find({
      ...options,
      where: {
        ...options?.where,
        tenant_id: this.tenantId
      }
    })
  }

  async findOne(options: FindOneOptions<T>) {
    return this.repository.findOne({
      ...options,
      where: {
        ...options.where,
        tenant_id: this.tenantId
      }
    })
  }

  // ... 其他方法
}
```

### 2. 数据库索引优化
```sql
-- 所有业务表都添加 tenant_id 索引
ALTER TABLE customers ADD INDEX idx_tenant_id (tenant_id);
ALTER TABLE orders ADD INDEX idx_tenant_id (tenant_id);
ALTER TABLE products ADD INDEX idx_tenant_id (tenant_id);

-- 复合索引(tenant_id + 常用查询字段)
ALTER TABLE customers ADD INDEX idx_tenant_name (tenant_id, name);
ALTER TABLE orders ADD INDEX idx_tenant_date (tenant_id, created_at);
```

### 3. 代码审查检查清单
```
✅ 所有查询都包含 tenant_id 过滤
✅ 所有插入都包含 tenant_id
✅ 所有更新都包含 tenant_id 过滤
✅ 所有删除都包含 tenant_id 过滤
✅ 唯一索引包含 tenant_id
✅ 外键关联在同一租户内
```

---

## 📋 需要完善的功能

### 1. 租户登录流程 ⭐ 高优先级
```typescript
// 后端: backend/src/routes/tenantAuth.ts
router.post('/tenant-license/login', async (req, res) => {
  const { licenseKey, username, password } = req.body

  // 1. 验证授权码
  const tenant = await Tenant.findOne({ 
    where: { license_key: licenseKey } 
  })
  
  if (!tenant) {
    return res.status(404).json({ message: '授权码无效' })
  }
  
  if (tenant.status !== 'active') {
    return res.status(403).json({ message: '租户已被禁用' })
  }

  // 2. 验证用户名密码
  const user = await User.findOne({
    where: { 
      tenant_id: tenant.id,
      username 
    }
  })
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ message: '用户名或密码错误' })
  }

  // 3. 生成Token(包含tenantId)
  const token = jwt.sign(
    { 
      userId: user.id,
      tenantId: tenant.id,
      username: user.username
    },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  res.json({
    token,
    tenantId: tenant.id,
    tenantName: tenant.name,
    user: {
      id: user.id,
      username: user.username,
      name: user.name
    }
  })
})
```

### 2. 数据库迁移脚本 ⭐ 高优先级
```sql
-- backend/database-migrations/add-tenant-id-to-all-tables.sql

-- 1. 添加 tenant_id 字段到所有业务表
ALTER TABLE users ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE customers ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE orders ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE products ADD COLUMN tenant_id VARCHAR(36) AFTER id;
-- ... 其他所有业务表

-- 2. 添加索引
ALTER TABLE users ADD INDEX idx_tenant_id (tenant_id);
ALTER TABLE customers ADD INDEX idx_tenant_id (tenant_id);
ALTER TABLE orders ADD INDEX idx_tenant_id (tenant_id);
-- ... 其他所有业务表

-- 3. 修改唯一索引(添加tenant_id)
ALTER TABLE users DROP INDEX uk_username;
ALTER TABLE users ADD UNIQUE KEY uk_tenant_username (tenant_id, username);

ALTER TABLE orders DROP INDEX uk_order_no;
ALTER TABLE orders ADD UNIQUE KEY uk_tenant_order_no (tenant_id, order_no);
-- ... 其他唯一索引

-- 4. 添加外键约束
ALTER TABLE users 
  ADD CONSTRAINT fk_users_tenant 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id);
-- ... 其他表
```


### 3. 租户初始化 ⭐ 高优先级
```typescript
// backend/src/services/TenantService.ts
export class TenantService {
  // 创建租户时自动初始化数据
  async createTenant(data: CreateTenantDto) {
    const tenant = await Tenant.create(data).save()
    
    // 1. 创建默认管理员账号
    const adminUser = await User.create({
      tenant_id: tenant.id,
      username: 'admin',
      password: await bcrypt.hash('123456', 10),
      name: '管理员',
      role: 'admin',
      is_system: true
    }).save()
    
    // 2. 创建默认角色
    await Role.create({
      tenant_id: tenant.id,
      name: '管理员',
      permissions: ['*'],  // 所有权限
      is_system: true
    }).save()
    
    await Role.create({
      tenant_id: tenant.id,
      name: '销售',
      permissions: ['customer:*', 'order:*'],
      is_system: true
    }).save()
    
    // 3. 创建默认配置
    await TenantSetting.create({
      tenant_id: tenant.id,
      setting_key: 'order_prefix',
      setting_value: tenant.code + '-'
    }).save()
    
    return tenant
  }
}
```

### 4. 租户资源限制 ⭐ 中优先级
```typescript
// backend/src/middleware/tenantLimit.ts
export const checkTenantLimits = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  const tenant = req.tenantInfo
  
  // 1. 检查用户数限制
  if (req.path.includes('/users') && req.method === 'POST') {
    const userCount = await User.count({ 
      where: { tenant_id: tenant.id } 
    })
    
    if (userCount >= tenant.max_users) {
      return res.status(403).json({ 
        message: `用户数已达上限(${tenant.max_users})` 
      })
    }
  }
  
  // 2. 检查存储空间限制
  if (req.path.includes('/upload')) {
    const storageUsed = await getStorageUsed(tenant.id)
    const maxStorage = tenant.max_storage_gb * 1024 * 1024 * 1024
    
    if (storageUsed >= maxStorage) {
      return res.status(403).json({ 
        message: `存储空间已满(${tenant.max_storage_gb}GB)` 
      })
    }
  }
  
  next()
}
```

### 5. 租户数据备份 🟡 低优先级
```typescript
// backend/src/services/TenantBackupService.ts
export class TenantBackupService {
  // 备份单个租户的数据
  async backupTenant(tenantId: string) {
    const tables = [
      'users', 'customers', 'orders', 'products', 
      // ... 所有业务表
    ]
    
    const backupData: any = {}
    
    for (const table of tables) {
      const data = await db.query(
        `SELECT * FROM ${table} WHERE tenant_id = ?`,
        [tenantId]
      )
      backupData[table] = data
    }
    
    // 保存到文件
    const filename = `backup_${tenantId}_${Date.now()}.json`
    fs.writeFileSync(
      `./backups/${filename}`,
      JSON.stringify(backupData, null, 2)
    )
    
    return filename
  }
  
  // 恢复租户数据
  async restoreTenant(tenantId: string, backupFile: string) {
    const backupData = JSON.parse(
      fs.readFileSync(`./backups/${backupFile}`, 'utf-8')
    )
    
    // 先删除现有数据
    for (const table of Object.keys(backupData)) {
      await db.query(
        `DELETE FROM ${table} WHERE tenant_id = ?`,
        [tenantId]
      )
    }
    
    // 恢复数据
    for (const [table, data] of Object.entries(backupData)) {
      for (const row of data as any[]) {
        await db.query(
          `INSERT INTO ${table} SET ?`,
          [row]
        )
      }
    }
  }
}
```

### 6. 租户数据隔离测试 ⭐ 高优先级
```typescript
// backend/tests/tenant-isolation.test.ts
describe('租户数据隔离测试', () => {
  let tenantA: Tenant
  let tenantB: Tenant
  let userA: User
  let userB: User

  beforeAll(async () => {
    // 创建两个租户
    tenantA = await Tenant.create({ name: '租户A' }).save()
    tenantB = await Tenant.create({ name: '租户B' }).save()
    
    // 创建两个用户
    userA = await User.create({
      tenant_id: tenantA.id,
      username: 'userA'
    }).save()
    
    userB = await User.create({
      tenant_id: tenantB.id,
      username: 'userB'
    }).save()
  })

  it('租户A不能查询到租户B的数据', async () => {
    // 租户A创建客户
    const customerA = await Customer.create({
      tenant_id: tenantA.id,
      name: '客户A'
    }).save()
    
    // 租户B创建客户
    const customerB = await Customer.create({
      tenant_id: tenantB.id,
      name: '客户B'
    }).save()
    
    // 租户A查询客户
    const customersA = await Customer.find({
      where: { tenant_id: tenantA.id }
    })
    
    expect(customersA).toHaveLength(1)
    expect(customersA[0].name).toBe('客户A')
    expect(customersA.find(c => c.id === customerB.id)).toBeUndefined()
  })

  it('租户A不能修改租户B的数据', async () => {
    const customerB = await Customer.findOne({
      where: { tenant_id: tenantB.id }
    })
    
    // 尝试用租户A的身份修改租户B的客户
    const result = await Customer.update(
      { 
        id: customerB!.id,
        tenant_id: tenantA.id  // 错误的tenant_id
      },
      { name: '被修改的客户' }
    )
    
    expect(result.affected).toBe(0)  // 应该修改失败
  })
})
```

---

## 🚀 实施步骤

### 第一阶段: 数据库改造(1周)
1. **Day 1-2**: 设计租户表结构
   - 创建 `tenants` 表
   - 创建 `tenant_settings` 表
   - 创建 `tenant_packages` 表

2. **Day 3-4**: 修改现有表结构
   - 所有业务表添加 `tenant_id` 字段
   - 添加索引
   - 修改唯一索引

3. **Day 5**: 数据迁移脚本
   - 编写迁移脚本
   - 测试迁移脚本
   - 备份数据

### 第二阶段: 后端改造(1-2周)
1. **Week 1**: 核心功能
   - 实现租户认证中间件
   - 实现租户过滤
   - 实现租户登录接口
   - 实现租户初始化

2. **Week 2**: 完善功能
   - 实现资源限制
   - 实现租户管理接口
   - 编写单元测试
   - 编写集成测试

### 第三阶段: 前端改造(1周)
1. **Day 1-2**: 登录流程
   - 修改登录页面(添加授权码输入)
   - 实现租户登录逻辑
   - 保存租户信息

2. **Day 3-4**: 请求处理
   - 修改请求拦截器
   - 处理租户过期
   - 处理租户禁用

3. **Day 5**: 测试和优化
   - 功能测试
   - 性能测试
   - 用户体验优化

### 第四阶段: 测试和上线(1周)
1. **Day 1-3**: 全面测试
   - 数据隔离测试
   - 性能测试
   - 安全测试

2. **Day 4-5**: 上线准备
   - 编写部署文档
   - 准备回滚方案
   - 灰度发布

---

## 📊 方案对比总结

| 特性 | 独立数据库 | 独立Schema | 共享数据库+租户ID ⭐ |
|------|-----------|-----------|-------------------|
| 数据隔离 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 成本 | ⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 维护难度 | ⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 扩展性 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 性能 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 备份恢复 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 升级难度 | ⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 最终建议

### 推荐方案: 共享数据库+租户ID隔离

**理由**:
1. ✅ 你是刚开始做SaaS,租户数量会逐渐增长
2. ✅ 成本最低,维护最简单
3. ✅ 行业标准方案,成熟可靠
4. ✅ 扩展性好,可支持大量租户
5. ✅ 升级方便,一次升级所有租户受益

### 混合方案(可选)
```
- 小客户: 共享数据库+租户ID隔离
- 大客户: 独立数据库(额外收费)
```

这样可以满足不同客户的需求,同时保持灵活性。

---

## 📋 检查清单

### 开发前检查
- [ ] 确认租户表结构设计
- [ ] 确认需要添加tenant_id的表
- [ ] 确认不需要添加tenant_id的表
- [ ] 准备数据迁移脚本
- [ ] 准备回滚方案

### 开发中检查
- [ ] 所有查询都包含tenant_id过滤
- [ ] 所有插入都包含tenant_id
- [ ] 所有更新都包含tenant_id过滤
- [ ] 所有删除都包含tenant_id过滤
- [ ] 唯一索引包含tenant_id
- [ ] 编写单元测试
- [ ] 编写集成测试

### 上线前检查
- [ ] 数据隔离测试通过
- [ ] 性能测试通过
- [ ] 安全测试通过
- [ ] 备份方案准备完成
- [ ] 回滚方案准备完成
- [ ] 监控告警配置完成

---

## 🔗 相关文档

- `docs/Admin后台开发计划-完整版.md` - Admin后台开发计划
- `docs/Admin后台管理系统深度分析报告.md` - 系统分析报告
- `backend/database-schema.sql` - 数据库Schema

---

**文档创建时间**: 2026-03-02  
**文档版本**: v1.0  
**推荐方案**: 共享数据库+租户ID隔离 ⭐
