# 生产环境 SaaS 升级部署指南

**日期**: 2026-04-03  
**版本**: 2.0.0  
**目标**: 将现有私有部署 CRM 系统升级为 SaaS 多租户模式

---

## 📋 升级概览

### 现状
- 生产环境已有一个私有部署的 CRM 数据库（`abc789`）
- 数据库中已有业务数据（客户、订单、用户等）
- 后端使用 TypeORM + MySQL

### 目标
- 升级为 SaaS 多租户模式（共享数据库 + tenant_id 隔离）
- 现有数据归属到一个默认租户
- 支持未来创建新租户

### 架构方案
```
共享数据库 + 租户ID隔离（Shared Database）
├── 所有租户数据存在同一个数据库
├── 每个业务表都有 tenant_id 字段
├── 查询时自动添加 tenant_id 过滤
└── 系统级表（tenants/admin_users等）不需要 tenant_id
```

---

## 🔧 操作步骤

### 第一步：备份数据库 ⚠️ 最重要

```bash
# 方式1：在宝塔面板中备份
# 宝塔 → 数据库 → abc789 → 备份

# 方式2：命令行备份
mysqldump -u abc789 -p abc789 > /www/backup/abc789_backup_$(date +%Y%m%d_%H%M%S).sql
```

**确认备份文件大小合理，并下载一份到本地保存！**

---

### 第二步：诊断现有数据库

在宝塔 phpMyAdmin 中执行诊断脚本：

**文件**: `backend/database-migrations/production-2026-04-03-诊断脚本.sql`

这个脚本会检查：
1. ✅ 哪些表存在 / 不存在
2. ✅ 哪些表缺少 `tenant_id` 字段
3. ✅ 关键表的字段完整性
4. ✅ 各表的数据量统计

**执行方式**：
- 在 phpMyAdmin 中选择 `abc789` 数据库
- SQL 标签页 → 粘贴脚本 → 执行
- 建议分段执行（每个 `SELECT` 语句单独执行），方便查看结果

**记录结果**：把「✗ 不存在」的表和「✗ 缺少 tenant_id」的表记下来。

---

### 第三步：执行 SaaS 升级迁移

**文件**: `backend/database-migrations/production-2026-04-03-saas升级迁移.sql`

这个脚本包含 6 个步骤：

| 步骤 | 内容 | 说明 |
|------|------|------|
| 步骤1 | 创建缺失的平台管理表 | `CREATE TABLE IF NOT EXISTS`，安全幂等 |
| 步骤2 | 为业务表添加 tenant_id | 使用存储过程，已存在的字段自动跳过 |
| 步骤3 | 创建默认租户 & 迁移数据 | ⚠️ 需要修改租户信息 |
| 步骤4 | 补充缺失字段 | deleted_at、employment_status 等 |
| 步骤5 | 添加性能优化索引 | 多租户查询复合索引 |
| 步骤6 | 验证迁移结果 | 检查数据完整性 |

**⚠️ 重要：执行前请修改步骤3中的租户信息**：

```sql
SET @DEFAULT_TENANT_CODE = 'default';      -- 改为你的租户编码（如 'mycompany'）
SET @DEFAULT_TENANT_NAME = '默认租户';      -- 改为你的公司名称
```

**执行方式**：
- 建议按步骤分段执行（每个步骤之间有明确的 `SELECT` 分隔）
- 如果某条语句报错（如字段已存在），可以安全忽略继续执行
- 脚本设计为可重复执行（幂等性）

---

### 第四步：修改服务器环境配置

SSH 登录服务器，修改后端 `.env` 文件：

```bash
cd /www/wwwroot/your-project/backend

# 备份当前 .env
cp .env .env.backup.$(date +%Y%m%d)

# 编辑 .env
vi .env
```

**需要修改/添加的配置项**：

```env
# ===== 核心修改 =====
# 将部署模式改为 SaaS
DEPLOY_MODE=saas

# SaaS 平台许可证（如果有）
# 如果没有有效 Token，系统会自动降级为私有模式
SAAS_LICENSE_TOKEN=你的SaaS许可证Token

# ===== 确认以下配置正确 =====
NODE_ENV=production
DB_DATABASE=<你的数据库名>
DB_USERNAME=<你的数据库用户名>
DB_PASSWORD=<你的数据库密码>

# ===== 前端也需要对应修改（如果前端配置中有）=====
# 前端 .env.production 文件
VITE_DEPLOY_MODE=saas
```

---

### 第五步：重启后端服务

```bash
# 如果使用 PM2
pm2 restart all
pm2 logs --lines 50

# 如果使用宝塔 Node 项目管理
# 在宝塔面板中重启 Node 项目

# 验证启动日志中应该看到：
# ✅ 配置的部署模式: saas
# ✅ 实际生效模式: saas（或 private，如果 Token 验证未通过）
# ✅ 数据库连接成功
```

---

### 第六步：验证功能

1. **登录系统**：使用现有账号登录，确认数据正常显示
2. **检查数据隔离**：
   - 客户列表应该只显示当前租户的数据
   - 订单列表应该只显示当前租户的数据
3. **检查后端日志**：确认没有报错
4. **如果有 Admin 后台**：检查租户管理页面是否正常

---

## 📊 表分类说明

### 不需要 tenant_id 的系统级表（共享）

| 表名 | 说明 |
|------|------|
| `tenants` | 租户表本身 |
| `tenant_packages` | 套餐表（全局共享） |
| `admin_users` | Admin 管理员表 |
| `admin_operation_logs` | Admin 操作日志 |
| `admin_notifications` | Admin 通知 |
| `licenses` | 授权表 |
| `license_logs` | 授权日志 |
| `versions` | 版本表 |
| `changelogs` | 更新日志 |
| `private_customers` | 私有部署客户表 |
| `system_license` | 系统授权表 |
| `modules` | 模块定义表 |
| `api_configs` | API 配置表 |

### 需要 tenant_id 的业务表（隔离）

所有 CRM 业务表都需要 `tenant_id`，包括但不限于：
- 用户/角色/权限/部门
- 客户/订单/产品
- 物流/售后/增值
- 通话/短信/消息
- 业绩/配置等

---

## ⚡ 多租户工作原理

### 后端自动过滤

```typescript
// deploy.ts 配置
DEPLOY_MODE=saas  →  deployConfig.isSaaS() = true

// 中间件自动从 JWT Token 中提取 tenant_id
// 所有查询自动添加 WHERE tenant_id = '...'

// BaseRepository 自动过滤
if (deployConfig.isSaaS()) {
  query.andWhere('tenant_id = :tenantId', { tenantId });
}
```

### 私有模式兼容

```typescript
// 如果 DEPLOY_MODE=private 或 SaaS Token 验证失败
// 系统自动降级为私有模式
// 查询条件变为 WHERE tenant_id IS NULL
// 不影响现有功能
```

---

## 🔄 回滚方案

如果升级后出现问题，可以快速回滚：

```bash
# 1. 修改 .env
DEPLOY_MODE=private

# 2. 重启服务
pm2 restart all

# 3. 如果需要恢复数据库
mysql -u abc789 -p abc789 < /www/backup/abc789_backup_XXXXXXXX.sql
```

**回滚是安全的**：
- 私有模式下，系统忽略 `tenant_id` 字段（查询 `tenant_id IS NULL`）
- 新增的表和字段不会影响私有模式的使用
- 数据不会丢失

---

## ❓ 常见问题

### Q1: 执行 SQL 报「Duplicate column name 'tenant_id'」
**A**: 这意味着该字段已经存在，可以安全忽略。脚本中的存储过程会自动检查并跳过。

### Q2: 登录后看不到数据
**A**: 检查是否所有数据都已经分配了 `tenant_id`。执行验证脚本（步骤6）检查是否有 `NULL` 记录。

### Q3: 新创建的用户没有 tenant_id
**A**: 确认 `DEPLOY_MODE=saas` 已生效。SaaS 模式下，新建数据会自动附加当前用户的 `tenant_id`。

### Q4: Admin 后台无法访问
**A**: Admin 后台使用 `admin_users` 表，不依赖 `tenant_id`。确认 `admin_users` 表有管理员账号。

### Q5: 如何创建新租户？
**A**: 
- 通过 Admin 后台管理界面创建
- 或直接在数据库中插入 `tenants` 表记录
- 新租户需要初始化用户、角色、权限等基础数据

---

## 📝 文件清单

| 文件 | 用途 |
|------|------|
| `production-2026-04-03-诊断脚本.sql` | 检查数据库缺失表/字段 |
| `production-2026-04-03-saas升级迁移.sql` | 完整的 SaaS 升级迁移脚本 |
| `生产环境SaaS升级部署指南.md` | 本文档 |

---

**文档创建时间**: 2026-04-03  
**适用版本**: CRM 2.0.0  
**技术栈**: TypeORM + MySQL 8.0 + Node.js

