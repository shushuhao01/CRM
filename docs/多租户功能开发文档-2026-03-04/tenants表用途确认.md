# Tenants表用途确认

## ✅ 核实结果

### 1. 数据库中的tenants表

**数据库**: `crm_local`  
**表名**: `tenants`  
**状态**: ✅ 存在  
**数据**: 空表（0条数据）  
**创建时间**: 2026-01-05  
**字段数**: 21个字段

### 2. 表结构特征

**核心字段**:
- 基础信息: id, name, code, status
- 授权管理: license_key, license_status, activated_at
- 套餐管理: package_id
- 联系信息: contact, phone, email
- 资源限制: max_users, max_storage_gb
- 资源使用: user_count, used_storage_mb
- 过期管理: expire_date
- 扩展功能: features (JSON), database_name, remark

**索引**:
- PRIMARY KEY (id)
- UNIQUE KEY uk_code (code)

**相关表**:
- ✅ tenant_license_logs (授权日志表) - 存在
- ✅ tenant_settings (租户配置表) - 存在
- ❌ packages (套餐表) - 不存在

---

## 🎯 表的用途确认

### Admin后台管理系统

**用途**: ✅ **租户客户管理**

**功能模块**:
1. **租户列表** (`admin/src/views/tenants/List.vue`)
   - 查看所有租户
   - 创建新租户
   - 编辑租户信息
   - 删除租户
   - 重新生成授权码
   - 租户续期
   - 暂停/恢复授权

2. **租户详情** (`admin/src/views/tenants/Detail.vue`)
   - 查看租户详细信息
   - 查看授权日志
   - 查看账单记录
   - 管理租户配置

3. **租户客户列表** (`admin/src/views/tenant-customers/List.vue`)
   - 另一个租户管理入口
   - 功能与租户列表类似

**API路由**:
```
GET    /admin/tenants              - 获取租户列表
POST   /admin/tenants              - 创建租户
GET    /admin/tenants/:id          - 获取租户详情
PUT    /admin/tenants/:id          - 更新租户
DELETE /admin/tenants/:id          - 删除租户
POST   /admin/tenants/:id/regenerate-license  - 重新生成授权码
POST   /admin/tenants/:id/renew    - 租户续期
POST   /admin/tenants/:id/suspend  - 暂停授权
POST   /admin/tenants/:id/resume   - 恢复授权
GET    /admin/tenants/:id/logs     - 获取授权日志
GET    /admin/tenants/:id/bills    - 获取账单记录
```

---

### CRM系统

**用途**: ❌ **不涉及**

**原因**:
- CRM系统是租户使用的业务系统
- CRM不需要管理租户信息
- CRM只需要知道当前登录用户属于哪个租户（通过JWT Token中的tenantId）
- CRM的数据通过tenant_id字段进行隔离

**CRM的多租户实现**:
```
用户登录 → JWT Token包含tenantId → 所有查询自动添加tenant_id过滤
```

---

### 官网系统

**用途**: ❌ **不涉及**

**原因**:
- 官网是公开展示系统
- 不需要租户管理功能
- 不需要访问tenants表

---

## 📊 三系统关系图

```
┌─────────────────────────────────────────────────────────────┐
│                     数据库 (crm_local)                       │
│                                                              │
│  ┌──────────────┐                                           │
│  │   tenants    │  ← Admin后台管理（创建、编辑、删除租户）    │
│  │  (租户表)     │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         │ tenant_id (外键关联)                               │
│         │                                                    │
│  ┌──────▼───────────────────────────────────────┐          │
│  │  业务表 (customers, orders, products...)     │          │
│  │  所有表都有 tenant_id 字段                    │  ← CRM系统使用 │
│  │  用于数据隔离                                 │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Admin后台    │     │  CRM系统      │     │  官网系统     │
│              │     │              │     │              │
│ 管理租户      │     │ 使用租户数据  │     │ 公开展示      │
│ 创建/编辑/删除│     │ 数据自动隔离  │     │ 不涉及租户    │
│              │     │              │     │              │
│ ✅ 使用tenants│     │ ❌ 不使用tenants│    │ ❌ 不使用tenants│
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 🔍 数据流向

### Admin后台 → tenants表
```
1. 超级管理员登录Admin后台
2. 创建新租户 → INSERT INTO tenants
3. 生成授权码 (license_key)
4. 租户信息保存到tenants表
```

### CRM系统 → 业务表
```
1. 租户用户使用license_key登录CRM
2. 验证license_key → 查询tenants表
3. 生成JWT Token (包含tenantId)
4. 所有业务操作自动添加tenant_id过滤
5. 数据写入业务表时自动设置tenant_id
```

### 官网系统
```
1. 公开访问，无需登录
2. 不涉及租户概念
3. 不访问tenants表
```

---

## ✅ 结论

### 1. tenants表的归属
- **所有者**: Admin后台管理系统
- **用途**: 管理SaaS平台的租户客户
- **访问权限**: 仅Admin后台可以增删改查

### 2. CRM系统的关系
- **不直接管理tenants表**
- **只读取tenants表**（登录时验证license_key）
- **主要使用tenant_id字段**（数据隔离）

### 3. 官网系统的关系
- **完全不涉及**
- **不访问tenants表**
- **不需要租户概念**

### 4. 我们的实现策略
- ✅ **使用现有tenants表结构**
- ✅ **Tenant实体已完全适配**
- ✅ **不影响Admin后台功能**
- ✅ **支持CRM多租户数据隔离**

---

## 📝 下一步行动

**确认无误，继续任务1.2：创建租户配置实体（TenantSettings Entity）**

**准备工作**:
1. ✅ tenants表已确认存在
2. ✅ tenant_settings表已确认存在
3. ✅ Tenant实体已创建并测试通过
4. ⏭️ 创建TenantSettings实体适配现有表

---

**确认人**: 用户  
**确认时间**: 待确认  
**状态**: ✅ 可以继续下一步
