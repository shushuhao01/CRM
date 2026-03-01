# 宝塔SQL执行详细指南 - 增值管理系统 V2

## 问题说明

之前的SQL脚本在宝塔phpMyAdmin中执行失败，可能的原因：
1. 使用了 `DROP TABLE IF EXISTS` 可能导致权限问题
2. 使用了 `INSERT IGNORE` 语法在某些MySQL版本中不兼容
3. 一次性执行太多语句导致超时

## 新方案：超级简化版

使用 `CREATE TABLE IF NOT EXISTS` 和 `INSERT ... SELECT ... WHERE NOT EXISTS` 语法，更加兼容和安全。

## 执行步骤

### 方法1：一次性执行（推荐）

1. **打开宝塔phpMyAdmin**
   - 登录宝塔面板
   - 点击"数据库"
   - 找到 `abc789_cn` 数据库
   - 点击"管理"进入phpMyAdmin

2. **选择数据库**
   - 在左侧列表中点击 `abc789_cn`

3. **执行SQL**
   - 点击顶部"SQL"标签
   - 打开文件：`backend/database-migrations/production-baota-simple-v2.sql`
   - 复制全部内容
   - 粘贴到SQL输入框
   - 点击"执行"

4. **查看结果**
   - 如果成功，会显示：
     ```
     外包公司表: 0
     费用配置表: 1
     增值订单表: 0
     状态配置表: 6
     ```

### 方法2：分步执行（如果方法1失败）

如果一次性执行失败，可以分步执行：

#### 第1步：创建外包公司表

```sql
CREATE TABLE IF NOT EXISTS `outsource_companies` (
  `id` varchar(50) NOT NULL,
  `company_name` varchar(200) NOT NULL,
  `contact_person` varchar(50) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `default_unit_price` decimal(10,2) DEFAULT 0.00,
  `total_orders` int(11) DEFAULT 0,
  `valid_orders` int(11) DEFAULT 0,
  `invalid_orders` int(11) DEFAULT 0,
  `total_amount` decimal(12,2) DEFAULT 0.00,
  `settled_amount` decimal(12,2) DEFAULT 0.00,
  `remark` text,
  `created_by` varchar(50) DEFAULT NULL,
  `created_by_name` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 第2步：创建费用配置表

```sql
CREATE TABLE IF NOT EXISTS `value_added_price_config` (
  `id` varchar(50) NOT NULL,
  `config_name` varchar(100) NOT NULL,
  `company_id` varchar(50) DEFAULT NULL,
  `company_name` varchar(200) DEFAULT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `conditions` text,
  `status` varchar(20) DEFAULT 'active',
  `remark` text,
  `created_by` varchar(50) DEFAULT NULL,
  `created_by_name` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 第3步：创建增值订单表

```sql
CREATE TABLE IF NOT EXISTS `value_added_orders` (
  `id` varchar(50) NOT NULL,
  `order_id` varchar(50) DEFAULT NULL,
  `order_number` varchar(50) DEFAULT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `order_status` varchar(20) DEFAULT NULL,
  `order_date` datetime DEFAULT NULL,
  `company_id` varchar(50) NOT NULL,
  `company_name` varchar(200) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `settlement_status` varchar(20) DEFAULT 'unsettled',
  `settlement_amount` decimal(10,2) DEFAULT 0.00,
  `settlement_date` date DEFAULT NULL,
  `settlement_batch` varchar(50) DEFAULT NULL,
  `invalid_reason` varchar(500) DEFAULT NULL,
  `supplement_order_id` varchar(50) DEFAULT NULL,
  `export_date` date DEFAULT NULL,
  `export_batch` varchar(50) DEFAULT NULL,
  `remark` text,
  `operator_id` varchar(50) DEFAULT NULL,
  `operator_name` varchar(50) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_by_name` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_status` (`status`),
  KEY `idx_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 第4步：创建状态配置表

```sql
CREATE TABLE IF NOT EXISTS `value_added_status_configs` (
  `id` varchar(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `value` varchar(100) NOT NULL,
  `label` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_value` (`type`,`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 第5步：插入默认数据

```sql
-- 默认费用配置
INSERT INTO `value_added_price_config` 
(`id`, `config_name`, `unit_price`, `status`, `remark`, `created_by_name`, `created_at`, `updated_at`) 
SELECT 'default-config-001', '默认费用配置', 900.00, 'active', '系统默认配置', '系统', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_price_config` WHERE `id` = 'default-config-001');

-- 有效状态配置
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `created_at`) 
SELECT 'vs-pending-001', 'validStatus', 'pending', '待处理', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_status_configs` WHERE `id` = 'vs-pending-001');

INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `created_at`) 
SELECT 'vs-valid-001', 'validStatus', 'valid', '有效', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_status_configs` WHERE `id` = 'vs-valid-001');

INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `created_at`) 
SELECT 'vs-invalid-001', 'validStatus', 'invalid', '无效', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_status_configs` WHERE `id` = 'vs-invalid-001');

INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `created_at`) 
SELECT 'vs-supplemented-001', 'validStatus', 'supplemented', '已补单', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_status_configs` WHERE `id` = 'vs-supplemented-001');

-- 结算状态配置
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `created_at`) 
SELECT 'ss-unsettled-001', 'settlementStatus', 'unsettled', '未结算', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_status_configs` WHERE `id` = 'ss-unsettled-001');

INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `created_at`) 
SELECT 'ss-settled-001', 'settlementStatus', 'settled', '已结算', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_status_configs` WHERE `id` = 'ss-settled-001');
```

#### 第6步：验证

```sql
SELECT '外包公司表' as 表名, COUNT(*) as 记录数 FROM outsource_companies
UNION ALL
SELECT '费用配置表', COUNT(*) FROM value_added_price_config
UNION ALL
SELECT '增值订单表', COUNT(*) FROM value_added_orders
UNION ALL
SELECT '状态配置表', COUNT(*) FROM value_added_status_configs;
```

## 常见错误处理

### 错误1：Table already exists
**原因**：表已经存在  
**解决**：这是正常的，`CREATE TABLE IF NOT EXISTS` 会跳过已存在的表

### 错误2：Duplicate entry
**原因**：数据已经存在  
**解决**：这是正常的，`WHERE NOT EXISTS` 会跳过已存在的数据

### 错误3：Access denied
**原因**：数据库用户权限不足  
**解决**：
1. 检查数据库用户是否有 CREATE、INSERT 权限
2. 在宝塔面板中重新设置数据库权限

### 错误4：Syntax error
**原因**：MySQL版本不兼容  
**解决**：
1. 检查MySQL版本（需要 >= 5.7）
2. 如果版本较低，将 `datetime DEFAULT CURRENT_TIMESTAMP` 改为 `datetime DEFAULT NULL`

## 执行后验证

### 1. 检查表是否创建成功

```sql
SHOW TABLES LIKE '%value_added%';
SHOW TABLES LIKE 'outsource_companies';
```

应该看到4张表：
- outsource_companies
- value_added_price_config
- value_added_orders
- value_added_status_configs

### 2. 检查表结构

```sql
DESC outsource_companies;
DESC value_added_price_config;
DESC value_added_orders;
DESC value_added_status_configs;
```

### 3. 检查默认数据

```sql
SELECT * FROM value_added_price_config;
SELECT * FROM value_added_status_configs;
```

应该看到：
- 1条默认费用配置
- 6条状态配置（4个有效状态 + 2个结算状态）

## 后续步骤

### 1. 重启后端服务

在宝塔面板或SSH中执行：

```bash
pm2 restart crm-backend
```

或者：

```bash
cd /www/wwwroot/your-project/backend
pm2 restart ecosystem.config.js
```

### 2. 测试前端功能

1. 打开浏览器，访问前端地址
2. 登录系统
3. 进入"财务管理" → "增值管理"
4. 检查页面是否正常加载
5. 测试以下功能：
   - 统计卡片显示
   - 筛选器工作
   - 标签页切换
   - 外包公司管理
   - 费用配置
   - 状态配置

### 3. 检查后端日志

```bash
pm2 logs crm-backend
```

查看是否有错误信息。

## 如果还是不行

### 检查清单

1. **数据库连接**
   - 检查 `.env.production` 中的数据库配置
   - 确认数据库名称、用户名、密码正确

2. **后端路由**
   - 确认 `backend/src/app.ts` 中已注册 `valueAddedRoutes`
   - 检查路由路径是否正确：`/api/v1/value-added`

3. **前端API**
   - 检查 `src/api/valueAdded.ts` 中的API地址
   - 确认请求地址正确

4. **网络请求**
   - 打开浏览器开发者工具（F12）
   - 查看Network标签
   - 检查API请求是否成功
   - 查看返回的错误信息

5. **后端日志**
   - 查看 `backend/logs/error.log`
   - 查看 `backend/logs/combined.log`
   - 查找相关错误信息

## 联系支持

如果以上步骤都无法解决问题，请提供以下信息：

1. 宝塔phpMyAdmin执行SQL时的完整错误信息
2. 浏览器开发者工具中的Network请求错误
3. 后端日志中的错误信息
4. MySQL版本号
5. 数据库表列表截图

## 相关文件

- **SQL脚本**: `backend/database-migrations/production-baota-simple-v2.sql`
- **后端路由**: `backend/src/routes/valueAdded.ts`
- **前端页面**: `src/views/Finance/ValueAddedManage.vue`
- **前端API**: `src/api/valueAdded.ts`
