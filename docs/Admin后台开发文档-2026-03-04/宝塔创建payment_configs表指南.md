# 宝塔面板创建payment_configs表指南

## 问题说明

在phpMyAdmin中执行包含动态SQL的脚本会报错：
```
#1064 - Unknown table 'TENANT_CONFIGS' in information_schema
```

这是因为phpMyAdmin不支持 `SET @变量`, `PREPARE`, `EXECUTE` 等动态SQL语法。

## 解决方案

使用简化的SQL语句，只包含基本的CREATE TABLE语句。

## 执行步骤

### 方式1: 直接复制执行（推荐）

1. 登录宝塔面板
2. 点击左侧"数据库"菜单
3. 找到你的CRM数据库，点击"管理"按钮
4. 进入phpMyAdmin界面
5. 确认已选择正确的数据库（左侧数据库列表）
6. 点击顶部"SQL"标签
7. 复制下面的SQL语句：

```sql
CREATE TABLE IF NOT EXISTS `payment_configs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  `pay_type` VARCHAR(20) NOT NULL UNIQUE COMMENT '支付方式: wechat/alipay/bank',
  `enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用',
  `config_data` TEXT COMMENT '配置数据(加密存储)',
  `notify_url` VARCHAR(500) COMMENT '回调地址',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_pay_type` (`pay_type`),
  INDEX `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付配置表';
```

8. 粘贴到SQL输入框
9. 点击右下角"执行"按钮
10. 看到绿色提示"查询已成功执行"即表示成功

### 方式2: 使用SQL文件

1. 打开文件：`backend/database-migrations/create-payment-configs-table-baota.sql`
2. 复制CREATE TABLE语句部分
3. 按照方式1的步骤执行

## 验证表是否创建成功

执行以下SQL查看表结构：

```sql
SHOW COLUMNS FROM `payment_configs`;
```

应该看到7个字段：
- id
- pay_type
- enabled
- config_data
- notify_url
- created_at
- updated_at

## 查看表信息

```sql
SELECT 
  TABLE_NAME AS '表名',
  TABLE_COMMENT AS '说明',
  TABLE_ROWS AS '行数'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'payment_configs';
```

## 常见问题

### Q1: 提示"表已存在"
A: 这是正常的，说明表已经创建过了，不需要重复创建。

### Q2: 提示语法错误
A: 确保只复制了CREATE TABLE语句，不要包含注释和其他内容。

### Q3: 字符集问题
A: 确保数据库使用utf8mb4字符集，如果不是，需要先修改数据库字符集。

## 表结构说明

### 字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | VARCHAR(36) | 配置ID（主键） |
| pay_type | VARCHAR(20) | 支付方式：wechat/alipay/bank |
| enabled | TINYINT(1) | 是否启用：0=禁用，1=启用 |
| config_data | TEXT | 配置数据（加密存储） |
| notify_url | VARCHAR(500) | 支付回调地址 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 索引说明

- PRIMARY KEY: id
- UNIQUE KEY: pay_type（每种支付方式只能有一条配置）
- INDEX: idx_pay_type（支付方式索引）
- INDEX: idx_enabled（启用状态索引）

## 支付方式配置说明

### 1. 微信支付 (wechat)

config_data字段存储的JSON结构（加密前）：
```json
{
  "appId": "wx1234567890",
  "mchId": "1234567890",
  "apiKey": "your_api_key_here",
  "certPath": "/path/to/cert.pem",
  "keyPath": "/path/to/key.pem"
}
```

### 2. 支付宝 (alipay)

config_data字段存储的JSON结构（加密前）：
```json
{
  "appId": "2021001234567890",
  "privateKey": "your_private_key_here",
  "publicKey": "alipay_public_key_here",
  "gatewayUrl": "https://openapi.alipay.com/gateway.do"
}
```

### 3. 对公转账 (bank)

config_data字段存储的JSON结构（加密前）：
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

## 安全说明

1. config_data字段使用AES-256-CBC加密存储
2. 加密密钥存储在环境变量中，不在数据库中
3. 银行账号在前端显示时会自动脱敏（如：6222****7890）
4. 只有超级管理员可以查看和修改支付配置

## 后续工作

表创建完成后，需要：
1. 在Admin后台"支付管理"-"支付配置"页面配置各支付方式
2. 测试支付配置是否正确
3. 启用需要使用的支付方式

## 相关文档

- [支付报表表格优化和数据库确认.md](./支付报表表格优化和数据库确认.md)
- [支付配置和报表完善-完成总结.md](./支付配置和报表完善-完成总结.md)
