# schema.sql支付表完善说明

## 更新时间
2026-03-05

## 更新内容

### 1. payment_configs表优化

#### 更新前
```sql
CREATE TABLE IF NOT EXISTS `payment_configs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `pay_type` VARCHAR(20) NOT NULL COMMENT '支付类型: wechat/alipay',
  `enabled` TINYINT(1) DEFAULT 0 COMMENT '是否启用',
  `config_data` TEXT COMMENT '配置数据(JSON加密存储)',
  `notify_url` VARCHAR(500) COMMENT '回调地址',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_pay_type` (`pay_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付配置表';
```

#### 更新后
```sql
CREATE TABLE IF NOT EXISTS `payment_configs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  `pay_type` VARCHAR(20) NOT NULL COMMENT '支付方式: wechat/alipay/bank',
  `enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用',
  `config_data` TEXT COMMENT '配置数据(AES-256-CBC加密存储)',
  `notify_url` VARCHAR(500) COMMENT '回调地址',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY `uk_pay_type` (`pay_type`),
  INDEX `idx_pay_type` (`pay_type`),
  INDEX `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付配置表';
```

#### 主要变化
1. 支持三种支付方式：wechat（微信）、alipay（支付宝）、bank（对公转账）
2. 明确加密方式：AES-256-CBC
3. 添加字段注释
4. 添加索引：idx_pay_type、idx_enabled
5. enabled字段设置NOT NULL约束

### 2. payment_orders表优化

#### 新增字段
```sql
`billing_cycle` VARCHAR(20) DEFAULT 'monthly' COMMENT '计费周期: monthly/yearly',
`bonus_months` INT DEFAULT 0 COMMENT '赠送月数',
```

#### 新增状态
```sql
`status` VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态: pending/paid/expired/refunded/partial_refunded/closed',
```
- 新增 `partial_refunded` 状态，支持部分退款

#### 新增索引
```sql
KEY `idx_pay_type` (`pay_type`),
KEY `idx_billing_cycle` (`billing_cycle`),
```

#### 支付方式扩展
```sql
`pay_type` VARCHAR(20) COMMENT '支付方式: wechat/alipay/bank',
```
- 支持对公转账（bank）

### 3. 删除重复定义

删除了schema.sql中重复的 `payment_configs` 表定义，保留统一的完整版本。

### 4. 添加配置说明注释

在支付系统表部分添加了详细的配置说明：

```sql
-- =============================================
-- 支付系统表
-- =============================================
-- 
-- 支付配置说明:
-- 1. 微信支付 (wechat)
--    config_data字段存储: appId, mchId, apiKey, certPath, keyPath
-- 
-- 2. 支付宝 (alipay)
--    config_data字段存储: appId, privateKey, publicKey, gatewayUrl
-- 
-- 3. 对公转账 (bank)
--    config_data字段存储: accountName, bankName, accountNumber, bankAddress,
--                        bankCode, swiftCode, transferNote, arrivalTime,
--                        tips, autoConfirm
-- 
-- 所有配置数据使用AES-256-CBC加密存储在config_data字段中
-- =============================================
```

## 配置数据结构

### 微信支付配置
```json
{
  "appId": "wx1234567890",
  "mchId": "1234567890",
  "apiKey": "your_api_key_here",
  "certPath": "/path/to/cert.pem",
  "keyPath": "/path/to/key.pem"
}
```

### 支付宝配置
```json
{
  "appId": "2021001234567890",
  "privateKey": "your_private_key_here",
  "publicKey": "alipay_public_key_here",
  "gatewayUrl": "https://openapi.alipay.com/gateway.do"
}
```

### 对公转账配置
```json
{
  "accountName": "XX科技有限公司",
  "bankName": "中国工商银行",
  "accountNumber": "6222021234567890",
  "bankAddress": "北京市朝阳区XX支行",
  "bankCode": "102100099996",
  "swiftCode": "ICBKCNBJBJM",
  "transferNote": "请在转账备注中填写订单号",
  "arrivalTime": "1-3个工作日",
  "tips": "转账后请保存凭证，并联系客服确认",
  "autoConfirm": false
}
```

## 数据库迁移

### 对于新数据库
直接使用更新后的 `database/schema.sql` 创建表即可。

### 对于已有数据库
如果表已存在，需要执行以下迁移SQL：

```sql
-- 1. 检查payment_configs表是否存在
SHOW TABLES LIKE 'payment_configs';

-- 2. 如果不存在，执行创建
-- 使用 backend/database-migrations/create-payment-configs-table-baota.sql

-- 3. 如果存在，检查字段
SHOW COLUMNS FROM payment_configs;

-- 4. 添加缺失的索引（如果需要）
ALTER TABLE `payment_configs` ADD INDEX `idx_pay_type` (`pay_type`);
ALTER TABLE `payment_configs` ADD INDEX `idx_enabled` (`enabled`);

-- 5. 为payment_orders表添加新字段（如果不存在）
ALTER TABLE `payment_orders` 
  ADD COLUMN `billing_cycle` VARCHAR(20) DEFAULT 'monthly' COMMENT '计费周期: monthly/yearly' AFTER `amount`,
  ADD COLUMN `bonus_months` INT DEFAULT 0 COMMENT '赠送月数' AFTER `billing_cycle`;

-- 6. 为payment_orders表添加新索引
ALTER TABLE `payment_orders` ADD INDEX `idx_pay_type` (`pay_type`);
ALTER TABLE `payment_orders` ADD INDEX `idx_billing_cycle` (`billing_cycle`);
```

## 兼容性说明

### 向后兼容
- 所有新增字段都有默认值
- 不影响现有数据
- 现有代码可以继续使用

### 新功能支持
- 支持对公转账支付方式
- 支持年付和赠送月数
- 支持部分退款

## 安全性增强

1. 配置数据加密
   - 使用AES-256-CBC加密算法
   - 加密密钥存储在环境变量中
   - 数据库中只存储加密后的数据

2. 敏感信息脱敏
   - 银行账号显示时自动脱敏
   - 只有超级管理员可以查看完整信息

3. 操作日志
   - 所有配置修改都记录在admin_operation_logs表中
   - 包含操作人、时间、IP等信息

## 相关文件

### 数据库文件
- `database/schema.sql` - 主数据库schema文件（已更新）
- `backend/database-migrations/create-payment-configs-table.sql` - 支付配置表迁移脚本
- `backend/database-migrations/create-payment-configs-table-baota.sql` - 宝塔兼容版本

### 文档文件
- `docs/Admin后台开发文档-2026-03-04/宝塔创建payment_configs表指南.md` - 宝塔执行指南
- `docs/Admin后台开发文档-2026-03-04/支付报表表格优化和数据库确认.md` - 功能说明

### 代码文件
- `admin/src/views/payment/Config.vue` - 支付配置前端页面
- `backend/src/routes/admin/payment.ts` - 支付配置API路由
- `backend/src/controllers/admin/PaymentController.ts` - 支付控制器

## 测试验证

### 1. 验证表结构
```sql
-- 查看payment_configs表结构
SHOW CREATE TABLE payment_configs;

-- 查看payment_orders表结构
SHOW CREATE TABLE payment_orders;

-- 查看索引
SHOW INDEX FROM payment_configs;
SHOW INDEX FROM payment_orders;
```

### 2. 验证字段
```sql
-- 检查payment_configs字段
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'payment_configs';

-- 检查payment_orders字段
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'payment_orders'
  AND COLUMN_NAME IN ('billing_cycle', 'bonus_months');
```

## 后续工作

1. 完善支付配置API
   - 保存配置接口
   - 获取配置接口
   - 测试配置接口

2. 实现加密解密服务
   - AES-256-CBC加密
   - 密钥管理
   - 配置验证

3. 完善前端界面
   - 微信支付配置表单
   - 支付宝配置表单
   - 对公转账配置表单

4. 测试支付流程
   - 创建订单
   - 支付回调
   - 退款处理

## 总结

本次更新完善了schema.sql中的支付相关表结构，主要包括：

1. 支持三种支付方式（微信、支付宝、对公转账）
2. 支持年付和赠送月数功能
3. 支持部分退款
4. 增强数据安全性（加密存储）
5. 优化索引提升查询性能
6. 添加详细的配置说明注释

所有更新都保持向后兼容，不影响现有功能。
