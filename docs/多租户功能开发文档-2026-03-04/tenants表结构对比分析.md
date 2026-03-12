# Tenants表结构对比分析

## 📊 表结构对比

### 旧表结构（database/schema.sql - Admin后台用）
```sql
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `package_id` VARCHAR(36),                    -- 套餐ID
  `contact` VARCHAR(100),                      -- 联系人
  `phone` VARCHAR(20),                         -- 联系电话
  `email` VARCHAR(100),                        -- 邮箱
  `max_users` INT DEFAULT 10,
  `max_storage_gb` INT DEFAULT 5,
  `user_count` INT DEFAULT 0,                  -- 当前用户数
  `used_storage_mb` DECIMAL(10,2) DEFAULT 0,  -- 已使用存储
  `expire_date` DATE,
  `license_key` VARCHAR(100),
  `license_status` VARCHAR(20) DEFAULT 'pending',  -- 授权状态
  `activated_at` DATETIME,                     -- 激活时间
  `features` JSON,                             -- 功能模块
  `database_name` VARCHAR(100),                -- 数据库名称
  `remark` TEXT,                               -- 备注
  `status` VARCHAR(20) DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 新表结构（我们刚创建的 - CRM多租户用）
```sql
CREATE TABLE `tenants` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `status` ENUM('active', 'inactive', 'expired') DEFAULT 'active',
  `license_key` VARCHAR(100) NOT NULL UNIQUE,
  `expire_date` DATETIME NULL,
  `max_users` INT DEFAULT 10,
  `max_storage_gb` INT DEFAULT 10,
  `contact_name` VARCHAR(50) NULL,             -- 联系人姓名
  `contact_phone` VARCHAR(20) NULL,            -- 联系电话
  `contact_email` VARCHAR(100) NULL,           -- 联系邮箱
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔍 主要区别

### 1. 字段差异

| 字段 | 旧表 | 新表 | 说明 |
|------|------|------|------|
| **name** | VARCHAR(200) | VARCHAR(100) | 长度不同 |
| **status** | VARCHAR(20) | ENUM('active','inactive','expired') | 类型不同 |
| **license_key** | VARCHAR(100), 可NULL | VARCHAR(100) NOT NULL UNIQUE | 约束不同 |
| **expire_date** | DATE | DATETIME | 类型不同 |
| **max_storage_gb** | DEFAULT 5 | DEFAULT 10 | 默认值不同 |
| **contact** | VARCHAR(100) | - | 旧表有，新表拆分为3个字段 |
| **contact_name** | - | VARCHAR(50) | 新表独有 |
| **contact_phone** | phone | contact_phone | 字段名不同 |
| **contact_email** | email | contact_email | 字段名不同 |

### 2. 旧表独有字段（新表没有）
- `package_id` - 套餐ID
- `user_count` - 当前用户数
- `used_storage_mb` - 已使用存储
- `license_status` - 授权状态（pending/active等）
- `activated_at` - 激活时间
- `features` - 功能模块（JSON）
- `database_name` - 数据库名称
- `remark` - 备注

### 3. 新表独有特性
- `status` 使用 ENUM 类型（更严格）
- `license_key` 有 NOT NULL 和 UNIQUE 约束
- 联系人信息拆分为3个独立字段

---

## 💡 分析结论

### 表的来源
旧表来自 `database/schema.sql`，这是**Admin后台管理系统**用的表结构，用于管理租户客户（类似SaaS平台的客户管理）。

### 是否需要删除重建？

**建议：不删除，而是修改实体类适配旧表结构**

**原因**：
1. **旧表更完善**：包含更多有用的字段（package_id, user_count, features等）
2. **Admin后台可能在用**：删除可能影响Admin后台功能
3. **向后兼容**：保留旧表结构更安全

---

## ✅ 推荐方案：修改Tenant实体适配旧表

### 方案A：完全适配旧表（推荐）
修改 `backend/src/entities/Tenant.ts`，包含旧表的所有字段，这样：
- ✅ 兼容Admin后台
- ✅ 支持更多功能（套餐、功能模块等）
- ✅ 不需要修改数据库

### 方案B：只适配核心字段
只映射我们需要的字段，忽略其他字段：
- ✅ 简单快速
- ⚠️ 可能丢失一些有用信息
- ⚠️ 与Admin后台数据不完全同步

### 方案C：删除重建（不推荐）
删除旧表，创建新表：
- ❌ 可能破坏Admin后台功能
- ❌ 丢失现有设计
- ❌ 需要额外的迁移工作

---

## 🎯 建议行动

**立即执行：方案A - 修改Tenant实体适配旧表**

1. 修改 `backend/src/entities/Tenant.ts`，包含旧表所有字段
2. 调整字段映射（contact → contact_name, phone → contact_phone等）
3. 添加旧表独有字段（package_id, user_count, features等）
4. 重新编译和测试

这样可以：
- ✅ 保持与Admin后台的兼容性
- ✅ 利用现有的完善表结构
- ✅ 支持更多功能扩展
- ✅ 不需要修改数据库

---

## 📝 字段映射关系

| 实体属性 | 数据库字段 | 说明 |
|----------|-----------|------|
| id | id | UUID主键 |
| name | name | 租户名称 |
| code | code | 租户代码 |
| packageId | package_id | 套餐ID（新增） |
| contactName | contact | 联系人（字段名映射） |
| contactPhone | phone | 联系电话（字段名映射） |
| contactEmail | email | 联系邮箱（字段名映射） |
| maxUsers | max_users | 最大用户数 |
| maxStorageGb | max_storage_gb | 最大存储空间 |
| userCount | user_count | 当前用户数（新增） |
| usedStorageMb | used_storage_mb | 已使用存储（新增） |
| expireDate | expire_date | 过期时间 |
| licenseKey | license_key | 授权码 |
| licenseStatus | license_status | 授权状态（新增） |
| activatedAt | activated_at | 激活时间（新增） |
| features | features | 功能模块JSON（新增） |
| databaseName | database_name | 数据库名称（新增） |
| remark | remark | 备注（新增） |
| status | status | 状态 |
| createdAt | created_at | 创建时间 |
| updatedAt | updated_at | 更新时间 |

---

## ⚠️ 注意事项

1. **status字段类型**：旧表是VARCHAR(20)，不是ENUM，实体类需要调整
2. **license_key约束**：旧表可以为NULL，新实体类需要调整
3. **expire_date类型**：旧表是DATE，不是DATETIME
4. **contact字段**：旧表是单个字段，不是拆分的3个字段

确认后我立即修改实体类！
