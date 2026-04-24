-- =====================================================
-- 创建支付配置表 - 宝塔/phpMyAdmin兼容版本
-- 创建时间: 2026-03-05
-- 用途: 支持微信支付、支付宝、对公转账配置
-- =====================================================

-- 创建支付配置表
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

-- =====================================================
-- 验证表是否创建成功
-- =====================================================

-- 查看表结构
SHOW COLUMNS FROM `payment_configs`;

-- 查看表信息
SELECT 
  TABLE_NAME AS '表名',
  TABLE_COMMENT AS '说明',
  TABLE_ROWS AS '行数',
  CREATE_TIME AS '创建时间'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'payment_configs';

-- =====================================================
-- 执行说明
-- =====================================================
-- 
-- 支持的支付方式:
-- 1. wechat - 微信支付
--    配置字段: appId, mchId, apiKey, certPath, keyPath
-- 
-- 2. alipay - 支付宝
--    配置字段: appId, privateKey, publicKey, gatewayUrl
-- 
-- 3. bank - 对公转账
--    配置字段: accountName, bankName, accountNumber, bankAddress,
--             bankCode, swiftCode, transferNote, arrivalTime,
--             tips, autoConfirm
-- 
-- 配置数据使用AES-256-CBC加密存储在config_data字段中
-- 
-- =====================================================
-- 
-- 宝塔面板执行步骤:
-- 1. 登录宝塔面板
-- 2. 点击左侧"数据库"
-- 3. 找到你的数据库，点击"管理"
-- 4. 进入phpMyAdmin
-- 5. 选择数据库
-- 6. 点击顶部"SQL"标签
-- 7. 复制本文件的SQL语句（从CREATE TABLE开始到第一个分号结束）
-- 8. 粘贴到SQL输入框
-- 9. 点击"执行"按钮
-- 10. 查看执行结果
-- 
-- 注意: 如果表已存在，会自动跳过创建
-- 
-- =====================================================
