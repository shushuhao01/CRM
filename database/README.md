# 数据库说明文档

## 📋 概述

本目录包含 CRM 系统的数据库初始化脚本和相关文档。

## 📁 文件说明

### schema.sql（推荐使用）
- **最新版本**：1.8.0
- **更新时间**：2024-11-23
- **说明**：完整的数据库结构和初始化数据
- **包含内容**：
  - 15个核心数据表
  - 5个预设用户账号
  - 3个默认部门
  - 5个默认角色
  - 4个产品分类
  - 7个系统配置

### bt_panel_setup.sql（旧版本）
- **版本**：1.0
- **更新时间**：2024-01-15
- **说明**：旧版数据库脚本，仅供参考
- **不推荐使用**：数据结构已过时

---

## 🗄️ 数据库表结构

### 1. 核心表（5个）

#### departments - 部门表
```sql
- id: 部门ID (VARCHAR(50))
- name: 部门名称
- description: 部门描述
- parent_id: 上级部门ID
- manager_id: 部门经理ID
- level: 部门层级
- member_count: 成员数量
- status: 状态 (active/inactive)
```

#### roles - 角色表
```sql
- id: 角色ID (VARCHAR(50))
- name: 角色名称
- code: 角色代码 (唯一)
- description: 角色描述
- permissions: 权限列表 (JSON)
- user_count: 用户数量
- status: 状态
```

#### users - 用户表
```sql
- id: 用户ID (VARCHAR(50))
- username: 用户名 (唯一)
- password: 密码
- name: 姓名
- email: 邮箱
- phone: 手机号
- role: 角色
- role_id: 角色ID
- department_id: 部门ID
- position: 职位
- employee_number: 工号
- status: 状态
```

#### customers - 客户表
```sql
- id: 客户ID (VARCHAR(50))
- name: 客户姓名
- phone: 手机号
- wechat: 微信号
- email: 邮箱
- address: 地址
- level: 客户等级 (normal/silver/gold)
- status: 状态
- tags: 标签 (JSON)
- sales_person_id: 销售员ID
- order_count: 订单数量
- total_amount: 总消费金额
```

#### orders - 订单表
```sql
- id: 订单ID (VARCHAR(50))
- order_number: 订单号 (唯一)
- customer_id: 客户ID
- products: 商品列表 (JSON)
- total_amount: 订单总金额
- final_amount: 实付金额
- status: 订单状态
- payment_status: 支付状态
- shipping_address: 收货地址
```

### 2. 业务表（5个）

- **product_categories** - 产品分类表
- **products** - 产品表
- **logistics** - 物流表
- **service_records** - 售后服务表
- **data_records** - 资料表

### 3. 统计表（2个）

- **performance_records** - 业绩表
- **operation_logs** - 操作日志表

### 4. 配置表（3个）

- **customer_tags** - 客户标签表
- **customer_groups** - 客户分组表
- **system_configs** - 系统配置表

---

## 👥 预设账号

系统预设了 5 个测试账号，密码为明文存储（生产环境请修改）：

| 用户名 | 密码 | 角色 | 部门 | 说明 |
|--------|------|------|------|------|
| superadmin | super123456 | 超级管理员 | 系统管理部 | 拥有所有权限 |
| admin | admin123 | 管理员 | 管理部 | 拥有所有权限 |
| manager | manager123 | 部门经理 | 销售部 | 管理部门业务 |
| sales | sales123 | 销售员 | 销售部 | 客户和订单管理 |
| service | service123 | 客服 | 客服部 | 订单和售后处理 |

**安全提示**：
- 生产环境请立即修改所有预设账号的密码
- 密码应使用 bcrypt 加密存储
- 建议密码长度至少 8 位，包含大小写字母、数字和特殊字符

---

## 🏢 预设部门

| 部门ID | 部门名称 | 说明 | 成员数 |
|--------|----------|------|--------|
| dept_001 | 系统管理部 | 系统管理和维护 | 2 |
| dept_002 | 销售部 | 产品销售和客户维护 | 2 |
| dept_003 | 客服部 | 客户服务和售后支持 | 1 |

---

## 🎭 预设角色

| 角色ID | 角色名称 | 角色代码 | 权限范围 |
|--------|----------|----------|----------|
| super_admin | 超级管理员 | super_admin | 所有权限 (*) |
| admin | 管理员 | admin | 所有权限 (*) |
| department_manager | 部门经理 | department_manager | 部门业务管理 |
| sales_staff | 销售员 | sales_staff | 客户和订单管理 |
| customer_service | 客服 | customer_service | 订单和售后处理 |

---

## 📦 使用方法

### 方式一：宝塔面板导入（推荐）

1. 登录宝塔面板
2. 进入"数据库"
3. 选择你的数据库（如 `crm_db`）
4. 点击"管理"
5. 点击"导入"
6. 上传 `schema.sql` 文件
7. 点击"导入"按钮

### 方式二：命令行导入

```bash
# 方法1：使用 mysql 命令
mysql -u crm_user -p crm_db < database/schema.sql

# 方法2：登录后导入
mysql -u crm_user -p
use crm_db;
source /path/to/database/schema.sql;
```

### 方式三：phpMyAdmin 导入

1. 登录 phpMyAdmin
2. 选择数据库 `crm_db`
3. 点击"导入"标签
4. 选择 `schema.sql` 文件
5. 点击"执行"

---

## ⚙️ 数据库配置建议

### MySQL 配置优化

```ini
[mysqld]
# 字符集配置
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci

# 性能配置
innodb_buffer_pool_size=128M
max_connections=200
query_cache_size=32M

# 时区配置
default-time-zone='+08:00'

# 日志配置
slow_query_log=1
slow_query_log_file=/var/log/mysql/slow.log
long_query_time=2
```

### 宝塔面板配置

1. **字符集**：utf8mb4
2. **排序规则**：utf8mb4_unicode_ci
3. **时区**：Asia/Shanghai
4. **最大连接数**：200
5. **缓冲池大小**：128M（根据服务器内存调整）

---

## 🔒 安全建议

### 1. 数据库用户权限

```sql
-- 创建专用数据库用户（不要使用 root）
CREATE USER 'crm_user'@'localhost' IDENTIFIED BY '强密码';

-- 授予必要权限
GRANT SELECT, INSERT, UPDATE, DELETE ON crm_db.* TO 'crm_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;
```

### 2. 密码安全

- ✅ 使用强密码（至少 12 位）
- ✅ 定期更换密码
- ✅ 不要在代码中硬编码密码
- ✅ 使用环境变量存储密码

### 3. 访问控制

- ✅ 限制远程访问
- ✅ 使用防火墙规则
- ✅ 启用 SSL 连接
- ✅ 定期审查访问日志

---

## 💾 备份建议

### 自动备份配置

1. **备份频率**：每天凌晨 2:00
2. **保留天数**：30 天
3. **备份位置**：/www/backup/database/
4. **备份方式**：完整备份

### 手动备份命令

```bash
# 备份整个数据库
mysqldump -u crm_user -p crm_db > backup_$(date +%Y%m%d).sql

# 备份指定表
mysqldump -u crm_user -p crm_db users customers orders > backup_core_$(date +%Y%m%d).sql

# 压缩备份
mysqldump -u crm_user -p crm_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 恢复数据

```bash
# 恢复数据库
mysql -u crm_user -p crm_db < backup_20241123.sql

# 恢复压缩备份
gunzip < backup_20241123.sql.gz | mysql -u crm_user -p crm_db
```

---

## 🔧 维护命令

### 优化表

```sql
-- 优化所有表
OPTIMIZE TABLE customers, orders, products, users;

-- 分析表统计信息
ANALYZE TABLE customers, orders, products, users;

-- 检查表
CHECK TABLE customers, orders, products, users;

-- 修复表
REPAIR TABLE customers, orders, products, users;
```

### 查看表信息

```sql
-- 查看表大小
SELECT 
  table_name AS '表名',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS '大小(MB)'
FROM information_schema.TABLES 
WHERE table_schema = 'crm_db'
ORDER BY (data_length + index_length) DESC;

-- 查看表行数
SELECT 
  table_name AS '表名',
  table_rows AS '行数'
FROM information_schema.TABLES 
WHERE table_schema = 'crm_db'
ORDER BY table_rows DESC;

-- 查看索引使用情况
SHOW INDEX FROM customers;
```

---

## 📊 性能监控

### 慢查询监控

```sql
-- 查看慢查询日志
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- 查看当前连接
SHOW PROCESSLIST;

-- 查看表锁定情况
SHOW OPEN TABLES WHERE In_use > 0;
```

### 性能分析

```sql
-- 分析查询性能
EXPLAIN SELECT * FROM customers WHERE phone = '13800138000';

-- 查看查询缓存
SHOW STATUS LIKE 'Qcache%';

-- 查看 InnoDB 状态
SHOW ENGINE INNODB STATUS;
```

---

## 🆘 常见问题

### Q1: 导入失败，提示字符集错误？
**A**: 确保数据库字符集为 utf8mb4：
```sql
ALTER DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Q2: 导入失败，提示外键约束错误？
**A**: 脚本已包含 `SET FOREIGN_KEY_CHECKS = 0;`，如果还有问题，手动执行：
```sql
SET FOREIGN_KEY_CHECKS = 0;
SOURCE schema.sql;
SET FOREIGN_KEY_CHECKS = 1;
```

### Q3: 如何重置数据库？
**A**: 删除所有表后重新导入：
```sql
DROP DATABASE crm_db;
CREATE DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crm_db;
SOURCE schema.sql;
```

### Q4: 如何修改预设账号密码？
**A**: 
```sql
-- 在生产环境中，密码应该使用 bcrypt 加密
-- 这里仅作示例，实际应该通过应用程序修改
UPDATE users SET password = '新密码' WHERE username = 'admin';
```

---

## 📝 更新日志

### v1.8.0 (2024-11-23)
- ✅ 更新所有表结构，使用 VARCHAR(50) 作为主键
- ✅ 添加完整的预设账号（5个）
- ✅ 添加预设角色（5个）
- ✅ 添加预设部门（3个）
- ✅ 优化索引结构
- ✅ 添加 JSON 字段支持
- ✅ 完善注释说明

### v1.0 (2024-01-15)
- 初始版本

---

## 📞 技术支持

如遇到数据库相关问题，请提供：
1. MySQL 版本（`SELECT VERSION();`）
2. 错误信息
3. 操作步骤
4. 数据库配置

GitHub Issues: https://github.com/shushuhao01/CRM/issues
