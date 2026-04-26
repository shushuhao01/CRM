-- =====================================================
-- 修复 payment_orders 表结构
-- 适用于：已有旧版 payment_orders 表（含 payment_method/payment_status 错误列名）
-- 创建时间: 2026-04-27
-- =====================================================

-- 1. 修复列名：payment_method → pay_type
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'payment_method';
SET @sql = IF(@col_exists > 0,
  'ALTER TABLE payment_orders CHANGE COLUMN payment_method pay_type VARCHAR(20) COMMENT ''支付方式: wechat/alipay/bank''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. 修复列名：payment_status → status
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'payment_status';
SET @col_exists2 = 0;
SELECT COUNT(*) INTO @col_exists2 FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'status';
SET @sql = IF(@col_exists > 0 AND @col_exists2 = 0,
  'ALTER TABLE payment_orders CHANGE COLUMN payment_status status VARCHAR(20) DEFAULT ''pending'' COMMENT ''订单状态''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. 添加缺失列
SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'tenant_name';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN tenant_name VARCHAR(200) COMMENT ''租户名称''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'package_name';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN package_name VARCHAR(200) COMMENT ''套餐名称''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'pay_type';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN pay_type VARCHAR(20) COMMENT ''支付方式''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'status';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN status VARCHAR(20) DEFAULT ''pending'' COMMENT ''订单状态''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'contact_name';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN contact_name VARCHAR(100) COMMENT ''联系人姓名''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'contact_phone';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN contact_phone VARCHAR(50) COMMENT ''联系电话''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'contact_email';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN contact_email VARCHAR(100) COMMENT ''联系邮箱''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'trade_no';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN trade_no VARCHAR(100) COMMENT ''第三方交易号''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'qr_code';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN qr_code TEXT COMMENT ''支付二维码''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'pay_url';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN pay_url TEXT COMMENT ''支付链接''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'expire_time';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN expire_time DATETIME COMMENT ''订单过期时间''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'refund_amount';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN refund_amount DECIMAL(10,2) COMMENT ''退款金额''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'refund_at';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN refund_at DATETIME COMMENT ''退款时间''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'refund_reason';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN refund_reason TEXT COMMENT ''退款原因''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = 0; SELECT COUNT(*) INTO @col FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'refunded_by';
SET @sql = IF(@col = 0, 'ALTER TABLE payment_orders ADD COLUMN refunded_by VARCHAR(100) COMMENT ''退款操作人''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. 创建 payment_logs 表（如不存在）
CREATE TABLE IF NOT EXISTS `payment_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `order_id` VARCHAR(36),
  `order_no` VARCHAR(50),
  `action` VARCHAR(50),
  `pay_type` VARCHAR(20),
  `request_data` JSON,
  `response_data` JSON,
  `result` VARCHAR(20),
  `error_msg` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_order_no` (`order_no`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付日志表';

-- 5. 创建 payment_configs 表（如不存在）
CREATE TABLE IF NOT EXISTS `payment_configs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `pay_type` VARCHAR(20) NOT NULL UNIQUE,
  `enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `config_data` TEXT,
  `notify_url` VARCHAR(500),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_pay_type` (`pay_type`),
  INDEX `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付配置表';

-- =====================================================
-- 验证修复结果
-- =====================================================
SELECT '=== payment_orders 表结构 ===' AS info;
SHOW COLUMNS FROM payment_orders;

SELECT '=== payment_logs 表结构 ===' AS info;
SHOW COLUMNS FROM payment_logs;

SELECT '=== payment_configs 表结构 ===' AS info;
SHOW COLUMNS FROM payment_configs;
