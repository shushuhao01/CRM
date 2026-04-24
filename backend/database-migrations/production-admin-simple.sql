-- Admin后台完整迁移脚本 - 生产环境简洁版
-- 执行前请务必备份数据库！

-- Admin用户表
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `real_name` VARCHAR(50),
  `email` VARCHAR(100),
  `phone` VARCHAR(20),
  `role` ENUM('super_admin', 'admin', 'operator') DEFAULT 'operator',
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `last_login_at` DATETIME,
  `last_login_ip` VARCHAR(50),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin操作日志表
CREATE TABLE IF NOT EXISTS `admin_operation_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `admin_user_id` VARCHAR(36),
  `username` VARCHAR(50),
  `action` VARCHAR(100),
  `module` VARCHAR(50),
  `description` TEXT,
  `ip_address` VARCHAR(50),
  `user_agent` TEXT,
  `request_data` JSON,
  `response_data` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_admin_user_id` (`admin_user_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_module` (`module`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 租户表
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `package_id` VARCHAR(36),
  `contact` VARCHAR(100),
  `phone` VARCHAR(20),
  `email` VARCHAR(100),
  `max_users` INT DEFAULT 10,
  `max_storage_gb` INT DEFAULT 5,
  `user_count` INT DEFAULT 0,
  `used_storage_mb` DECIMAL(10, 2) DEFAULT 0,
  `expire_date` DATE,
  `license_key` VARCHAR(100),
  `license_status` VARCHAR(20) DEFAULT 'pending',
  `activated_at` DATETIME,
  `features` JSON,
  `database_name` VARCHAR(100),
  `remark` TEXT,
  `status` VARCHAR(20) DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_code` (`code`),
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 租户设置表
CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id` VARCHAR(36) PRIMARY KEY,
  `tenant_id` VARCHAR(36) NOT NULL,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT,
  `setting_type` VARCHAR(20) DEFAULT 'string',
  `description` VARCHAR(500),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_key` (`tenant_id`, `setting_key`),
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 租户日志表
CREATE TABLE IF NOT EXISTS `tenant_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `tenant_id` VARCHAR(36) NOT NULL,
  `action` VARCHAR(100),
  `description` TEXT,
  `operator_id` VARCHAR(36),
  `operator_name` VARCHAR(100),
  `ip_address` VARCHAR(50),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 套餐表
CREATE TABLE IF NOT EXISTS `packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `type` ENUM('saas', 'private') NOT NULL DEFAULT 'saas',
  `description` TEXT,
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `original_price` DECIMAL(10, 2),
  `billing_cycle` ENUM('monthly', 'yearly', 'once') NOT NULL DEFAULT 'monthly',
  `yearly_discount_rate` DECIMAL(5, 2) DEFAULT 0.00,
  `yearly_bonus_months` INT DEFAULT 0,
  `yearly_price` DECIMAL(10, 2),
  `duration_days` INT NOT NULL DEFAULT 30,
  `max_users` INT NOT NULL DEFAULT 10,
  `max_storage_gb` INT NOT NULL DEFAULT 5,
  `features` JSON,
  `is_trial` TINYINT(1) NOT NULL DEFAULT 0,
  `is_recommended` TINYINT(1) NOT NULL DEFAULT 0,
  `is_visible` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `status` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_code` (`code`),
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 授权记录表
CREATE TABLE IF NOT EXISTS `licenses` (
  `id` VARCHAR(36) PRIMARY KEY,
  `license_key` VARCHAR(255) NOT NULL UNIQUE,
  `customer_name` VARCHAR(100) NOT NULL,
  `customer_contact` VARCHAR(100),
  `customer_phone` VARCHAR(20),
  `customer_email` VARCHAR(100),
  `customer_type` VARCHAR(20) DEFAULT 'private',
  `private_customer_id` VARCHAR(36),
  `tenant_id` VARCHAR(36),
  `license_type` ENUM('trial', 'perpetual', 'annual', 'monthly') DEFAULT 'trial',
  `max_users` INT DEFAULT 10,
  `max_storage_gb` INT DEFAULT 5,
  `features` JSON,
  `machine_id` VARCHAR(255),
  `status` ENUM('active', 'expired', 'revoked', 'pending') DEFAULT 'pending',
  `activated_at` DATETIME,
  `expires_at` DATETIME,
  `notes` TEXT,
  `created_by` VARCHAR(36),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_customer_type` (`customer_type`),
  INDEX `idx_private_customer_id` (`private_customer_id`),
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 授权日志表
CREATE TABLE IF NOT EXISTS `license_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `license_id` VARCHAR(36),
  `license_key` VARCHAR(255),
  `action` ENUM('verify', 'activate', 'renew', 'revoke', 'expire'),
  `machine_id` VARCHAR(255),
  `ip_address` VARCHAR(50),
  `user_agent` TEXT,
  `result` ENUM('success', 'failed'),
  `message` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_license_id` (`license_id`),
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 私有客户表
CREATE TABLE IF NOT EXISTS `private_customers` (
  `id` VARCHAR(36) PRIMARY KEY,
  `customer_name` VARCHAR(200) NOT NULL,
  `contact_person` VARCHAR(100),
  `contact_phone` VARCHAR(50),
  `contact_email` VARCHAR(100),
  `company_address` VARCHAR(500),
  `industry` VARCHAR(100),
  `company_size` VARCHAR(50),
  `deployment_type` VARCHAR(50) DEFAULT 'on-premise',
  `status` VARCHAR(20) DEFAULT 'active',
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_customer_name` (`customer_name`),
  INDEX `idx_status` (`status`),
  INDEX `idx_industry` (`industry`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 版本表
CREATE TABLE IF NOT EXISTS `versions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `version` VARCHAR(20) NOT NULL UNIQUE,
  `version_code` INT NOT NULL,
  `release_type` ENUM('major', 'minor', 'patch', 'beta', 'alpha') NOT NULL DEFAULT 'minor',
  `platform` ENUM('windows', 'macos', 'linux', 'android', 'ios', 'web', 'all') NOT NULL DEFAULT 'all',
  `changelog` TEXT,
  `download_url` VARCHAR(500),
  `file_size` BIGINT,
  `file_hash` VARCHAR(64),
  `download_count` INT NOT NULL DEFAULT 0,
  `status` ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  `is_published` TINYINT(1) NOT NULL DEFAULT 0,
  `published_at` DATETIME,
  `created_by` VARCHAR(36),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_version` (`version`),
  INDEX `idx_status` (`status`),
  INDEX `idx_platform` (`platform`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 更新日志表
CREATE TABLE IF NOT EXISTS `changelogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `version_id` VARCHAR(36) NOT NULL,
  `type` ENUM('feature', 'bugfix', 'improvement', 'security', 'breaking') NOT NULL DEFAULT 'feature',
  `content` TEXT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_version_id` (`version_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 支付订单表（如果不存在则创建）
CREATE TABLE IF NOT EXISTS `payment_orders` (
  `id` VARCHAR(36) PRIMARY KEY,
  `order_no` VARCHAR(50) NOT NULL UNIQUE,
  `tenant_id` VARCHAR(36),
  `package_id` INT,
  `amount` DECIMAL(10, 2) NOT NULL,
  `billing_cycle` VARCHAR(20) DEFAULT 'monthly',
  `bonus_months` INT DEFAULT 0,
  `payment_method` VARCHAR(50),
  `payment_status` VARCHAR(20) DEFAULT 'pending',
  `paid_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_order_no` (`order_no`),
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_payment_status` (`payment_status`),
  INDEX `idx_billing_cycle` (`billing_cycle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 为payment_orders表添加字段（如果不存在）
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'billing_cycle';
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `payment_orders` ADD COLUMN `billing_cycle` VARCHAR(20) DEFAULT ''monthly'' AFTER `amount`', 'SELECT ''billing_cycle已存在''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'bonus_months';
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `payment_orders` ADD COLUMN `bonus_months` INT DEFAULT 0 AFTER `billing_cycle`', 'SELECT ''bonus_months已存在''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 为packages表添加年付配置字段（如果不存在）
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'packages' AND COLUMN_NAME = 'yearly_discount_rate';
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `packages` ADD COLUMN `yearly_discount_rate` DECIMAL(5, 2) DEFAULT 0.00 AFTER `billing_cycle`', 'SELECT ''yearly_discount_rate已存在''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'packages' AND COLUMN_NAME = 'yearly_bonus_months';
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `packages` ADD COLUMN `yearly_bonus_months` INT DEFAULT 0 AFTER `yearly_discount_rate`', 'SELECT ''yearly_bonus_months已存在''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'packages' AND COLUMN_NAME = 'yearly_price';
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `packages` ADD COLUMN `yearly_price` DECIMAL(10, 2) AFTER `yearly_bonus_months`', 'SELECT ''yearly_price已存在''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
