# CRM Local 数据库迁移执行指南

## 🎯 数据库信息
- **数据库名**: crm_local
- **数据库类型**: MySQL
- **备份位置**: D:\kaifa\backup\crm_local_before_migration.sql

---

## 📋 执行步骤

### 方法A：使用自动化脚本（推荐）⭐

这个脚本会自动完成：检查备份 → 执行迁移 → 验证结果

```bash
# 在项目根目录执行
cd backend
node scripts/migrate-crm-local.js [MySQL密码]

# 例如，如果密码是 123456
node scripts/migrate-crm-local.js 123456

# 如果没有密码
node scripts/migrate-crm-local.js
```

脚本会自动执行以下步骤：
1. ✅ 检查备份文件是否存在
2. ✅ 执行数据库迁移脚本
3. ✅ 验证 tenants 和 tenant_settings 表
4. ✅ 验证 tenant_id 字段（应该有30+个表）
5. ✅ 验证索引创建
6. ✅ 测试查询功能

---

### 方法B：手动执行（如果脚本失败）

#### 第1步：验证备份文件
```bash
# 检查备份文件是否存在
dir D:\kaifa\backup\crm_local_before_migration.sql
```

如果不存在，先执行备份：
```bash
mysqldump -u root -p crm_local > D:\kaifa\backup\crm_local_before_migration.sql
```

#### 第2步：执行迁移脚本
```bash
mysql -u root -p crm_local < backend/database-migrations/add-tenant-support.sql
```

#### 第3步：验证结果
```bash
cd backend
node scripts/tenant-migration-helper.js
```

或者在 MySQL 中执行：
```sql
-- 检查有多少表添加了 tenant_id
SELECT 
  TABLE_NAME,
  COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'crm_local'
  AND COLUMN_NAME = 'tenant_id'
ORDER BY TABLE_NAME;
```

---

## ✅ 预期结果

### 成功标志
- ✅ 备份文件已存在（大小 > 0）
- ✅ tenants 表已创建
- ✅ tenant_settings 表已创建
- ✅ 至少30个表已添加 tenant_id 字段
- ✅ 索引已创建
- ✅ 查询功能正常

### 迁移完成后
所有表的 tenant_id 字段都是 NULL，这是正常的：
- 这是私有部署模式
- 现有功能不受影响
- 可以正常登录、查询、创建数据

---

## ⚠️ 如果迁移失败

### 快速恢复
```bash
# 1. 删除当前数据库
mysql -u root -p -e "DROP DATABASE crm_local;"

# 2. 重新创建数据库
mysql -u root -p -e "CREATE DATABASE crm_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. 恢复备份
mysql -u root -p crm_local < D:\kaifa\backup\crm_local_before_migration.sql
```

---

## 📊 迁移内容

### 创建的表
1. tenants（租户表）
2. tenant_settings（租户配置表）

### 修改的表（添加 tenant_id 字段）
- users（用户表）
- roles（角色表）
- departments（部门表）
- customers（客户表）
- products（产品表）
- orders（订单表）
- order_items（订单项表）
- outsource_companies（外包公司表）
- value_added_orders（增值订单表）
- ... 等32个业务表

### 修改的索引
- users: uk_tenant_username（租户+用户名唯一）
- customers: uk_tenant_customer_no（租户+客户编号唯一）
- products: uk_tenant_sku（租户+SKU唯一）
- orders: uk_tenant_order_number（租户+订单号唯一）
- ... 等8个唯一索引

---

## 🚀 下一步

迁移完成后：
1. 启动后端服务测试
2. 启动前端服务测试
3. 测试登录、查询、创建功能
4. 确认没有报错

---

**创建时间**: 2026-03-02  
**数据库**: crm_local  
**预计时间**: 5-10分钟
