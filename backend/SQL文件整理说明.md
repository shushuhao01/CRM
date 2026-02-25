# Backend SQL文件整理说明

## 整理时间
2025-02-25

## 整理目标
- 合并临时SQL文件到主schema文件
- 清理重复的表定义
- 备份临时SQL文件
- 保持backend目录整洁

## 主要SQL文件

### database-schema.sql（主schema文件）
包含所有数据库表结构定义，用于初始化完整的数据库。

**包含的表：**
1. users - 用户表
2. roles - 角色表
3. permissions - 权限表
4. user_roles - 用户角色关联表
5. role_permissions - 角色权限关联表
6. departments - 部门表
7. customers - 客户表
8. product_categories - 产品分类表
9. products - 产品表
10. orders - 订单表
11. order_items - 订单项表
12. system_configs - 系统配置表
13. operation_logs - 操作日志表
14. **cod_cancel_applications** - 代收取消申请表（2026-02-25新增）
15. **after_sales_services** - 售后服务表（2026-02-25新增）

### database-init.sql（初始化数据文件）
包含初始化数据，如默认管理员账号、角色、权限等。

## 整理内容

### 1. 删除重复的表定义
- **问题**：`database-schema.sql` 中有两个重复的 `cod_cancel_applications` 表定义
- **解决**：删除第一个定义，保留最新的（2026-02-25版本）

### 2. 添加缺失的表
- **after_sales_services**：从 `database-create-after-sales.sql` 添加到主schema

### 3. 迁移临时SQL文件到备份目录

已迁移到 `backend/sql-backups/` 的文件：

#### 代收相关
- ✅ `cod-application-production.sql` - 生产环境代收申请表SQL
- ✅ `create-cod-application-table.sql` - SQLite版本的代收申请表
- ✅ `init-cod-application-table.sql` - 本地MySQL初始化SQL

#### 售后相关
- ✅ `database-create-after-sales.sql` - 售后服务表SQL

#### 客户相关
- ✅ `check-and-update-customers.sql` - 客户数据检查和更新
- ✅ `database-update-customers.sql` - 客户表更新SQL

## 临时测试脚本迁移

已迁移到 `scripts/临时测试脚本/` 的文件：

### Backend测试脚本
- ✅ `check-mysql-order.js` - MySQL订单检查
- ✅ `check-order-cod-status.js` - 订单代收状态检查
- ✅ `check-order-status.js` - 订单状态检查
- ✅ `diagnose.js` - 诊断脚本
- ✅ `fix-cod-amount.js` - 修复代收金额
- ✅ `fix-order-status.js` - 修复订单状态
- ✅ `test-cod-insert.js` - 测试代收插入

## Backend目录结构

```
backend/
├── sql-backups/                    # SQL备份文件
│   ├── check-and-update-customers.sql
│   ├── cod-application-production.sql
│   ├── create-cod-application-table.sql
│   ├── database-create-after-sales.sql
│   ├── database-update-customers.sql
│   └── init-cod-application-table.sql
├── database-schema.sql             # 主schema文件（已更新）
├── database-init.sql               # 初始化数据文件
├── src/                            # 源代码
├── dist/                           # 编译输出
├── node_modules/                   # 依赖包
├── package.json                    # 项目配置
└── SQL文件整理说明.md              # 本文档
```

## 使用说明

### 初始化新数据库

1. **创建数据库**
   ```sql
   CREATE DATABASE crm_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **导入schema**
   ```bash
   mysql -u root -p crm_local < backend/database-schema.sql
   ```

3. **导入初始数据**
   ```bash
   mysql -u root -p crm_local < backend/database-init.sql
   ```

### 更新现有数据库

如果需要添加新表（如代收申请表或售后服务表），可以从 `sql-backups/` 目录中找到对应的SQL文件单独执行。

**示例：添加代收申请表**
```bash
mysql -u root -p crm_local < backend/sql-backups/cod-application-production.sql
```

**示例：添加售后服务表**
```bash
mysql -u root -p crm_local < backend/sql-backups/database-create-after-sales.sql
```

## 注意事项

1. **主schema文件**：`database-schema.sql` 是最新最完整的schema，包含所有表定义
2. **备份文件**：`sql-backups/` 目录中的文件仅用于参考和单独更新
3. **测试脚本**：已迁移到 `scripts/临时测试脚本/`，如不再需要可以删除
4. **版本控制**：建议将 `sql-backups/` 和 `scripts/临时测试脚本/` 添加到 `.gitignore`

## 后续维护建议

1. **新表添加**：所有新表都应该直接添加到 `database-schema.sql`
2. **临时SQL**：开发过程中的临时SQL文件应该放在 `sql-backups/` 目录
3. **定期更新**：定期检查并更新主schema文件，确保包含所有最新的表结构
4. **文档同步**：每次修改schema后，更新本文档的表列表

## 表结构变更记录

### 2026-02-25
- ✅ 添加 `cod_cancel_applications` 表 - 代收取消申请功能
- ✅ 添加 `after_sales_services` 表 - 售后服务功能
- ✅ 删除重复的表定义
- ✅ 整理临时SQL文件到备份目录

### 历史变更
- 参考 `database-init.sql` 和各个备份SQL文件的注释
