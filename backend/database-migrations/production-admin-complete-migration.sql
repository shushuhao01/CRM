-- =====================================================
-- Admin后台完整数据库迁移脚本 - 生产环境版本
-- 创建时间: 2026-03-05
-- 用途: 同步开发环境的所有Admin后台相关表结构到生产环境
-- 执行环境: 生产环境数据库
-- =====================================================

-- 注意事项:
-- 1. 执行前请务必备份数据库
-- 2. 建议在低峰期执行
-- 3. 逐段执行并检查结果
-- 4. 如遇错误请记录并联系开发人员

-- =====================================================
-- 第一部分: 创建Admin后台核心表
-- =====================================================

-- 1.1 创建Admin用户表
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT 'Admin用户ID',
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（加密）',
  `real_name` VARCHAR(50) COMMENT '真实姓名',
  `email` VARCHAR(100) COMMENT '邮箱',
  `phone` VARCHAR(20) COMMENT '手机号',
  `role` ENUM('super_admin', 'admin', 'operator') DEFAULT 'operator' COMMENT '角色',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `last_login_at` DATETIME COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(50) COMMENT '最后登录IP',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_username` (`username`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin后台用户表';

-- 1.2 创建Admin操作日志表
CREATE TABLE IF NOT EXISTS `admin_operation_logs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
  `admin_user_id` VARCHAR(36) COMMENT 'Admin用户ID',
  `username` VARCHAR(50) COMMENT '用户名',
  `action` VARCHAR(100) COMMENT '操作类型',
  `module` VARCHAR(50) COMMENT '模块',
  `description` TEXT COMMENT '操作描述',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` TEXT COMMENT 'User-Agent',
  `request_data` JSON COMMENT '请求数据',
  `response_data` JSON COMMENT '响应数据',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_admin_user_id` (`admin_user_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_module` (`module`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin操作日志表';

-- =====================================================
-- 第二部分: 创建租户管理表
-- =====================================================

-- 2.1 创建租户表
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '租户ID',
  `name` VARCHAR(200) NOT NULL COMMENT '租户名称',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT '租户代码',
  `package_id` VARCHAR(36) COMMENT '套餐ID',
  `contact` VARCHAR(100) COMMENT '联系人',
  `phone` VARCHAR(20) COMMENT '联系电话',
  `email` VARCHAR(100) COMMENT '邮箱',
  `max_users` INT DEFAULT 10 COMMENT '最大用户数',
  `max_storage_gb` INT DEFAULT 5 COMMENT '最大存储空间(GB)',
  `user_count` INT DEFAULT 0 COMMENT '当前用户数',
  `used_storage_mb` DECIMAL(10, 2) DEFAULT 0 COMMENT '已使用存储(MB)',
  `expire_date` DATE COMMENT '过期时间',
  `license_key` VARCHAR(100) COMMENT '授权码',
  `license_status` VARCHAR(20) DEFAULT 'pending' COMMENT '授权状态',
  `activated_at` DATETIME COMMENT '激活时间',
  `features` JSON COMMENT '功能特性',
  `database_name` VARCHAR(100) COMMENT '数据库名称',
  `remark` TEXT COMMENT '备注',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户表';

-- 2.2 创建租户设置表
CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '设置ID',
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `setting_key` VARCHAR(100) NOT NULL COMMENT '设置键',
  `setting_value` TEXT COMMENT '设置值',
  `setting_type` VARCHAR(20) DEFAULT 'string' COMMENT '值类型',
  `description` VARCHAR(500) COMMENT '描述',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY `uk_tenant_key` (`tenant_id`, `setting_key`),
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户设置表';

-- 2.3 创建租户日志表
CREATE TABLE IF NOT EXISTS `tenant_logs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `action` VARCHAR(100) COMMENT '操作类型',
  `description` TEXT COMMENT '操作描述',
  `operator_id` VARCHAR(36) COMMENT '操作人ID',
  `operator_name` VARCHAR(100) COMMENT '操作人姓名',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户操作日志表';

-- =====================================================
-- 第三部分: 创建套餐管理表
-- =====================================================

-- 3.1 创建套餐表
CREATE TABLE IF NOT EXISTS `packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '套餐ID',
  `name` VARCHAR(100) NOT NULL COMMENT '套餐名称',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT '套餐代码',
  `type` ENUM('saas', 'private') NOT NULL DEFAULT 'saas' COMMENT '套餐类型',
  `description` TEXT COMMENT '套餐描述',
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '价格',
  `original_price` DECIMAL(10, 2) COMMENT '原价',
  `billing_cycle` ENUM('monthly', 'yearly', 'once') NOT NULL DEFAULT 'monthly' COMMENT '计费周期',
  `yearly_discount_rate` DECIMAL(5, 2) DEFAULT 0.00 COMMENT '年付折扣率',
  `yearly_bonus_months` INT DEFAULT 0 COMMENT '年付赠送月数',
  `yearly_price` DECIMAL(10, 2) COMMENT '年付价格',
  `duration_days` INT NOT NULL DEFAULT 30 COMMENT '有效期(天)',
  `max_users` INT NOT NULL DEFAULT 10 COMMENT '最大用户数',
  `max_storage_gb` INT NOT NULL DEFAULT 5 COMMENT '最大存储空间(GB)',
  `features` JSON COMMENT '功能特性',
  `is_trial` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否试用套餐',
  `is_recommended` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否推荐',
  `is_visible` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否显示',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐管理表';

-- =====================================================
-- 第四部分: 创建授权管理表
-- =====================================================

-- 4.1 创建授权记录表
CREATE TABLE IF NOT EXISTS `licenses` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '授权ID',
  `license_key` VARCHAR(255) NOT NULL UNIQUE COMMENT '授权码',
  `customer_name` VARCHAR(100) NOT NULL COMMENT '客户名称',
  `customer_contact` VARCHAR(100) COMMENT '联系人',
  `customer_phone` VARCHAR(20) COMMENT '联系电话',
  `customer_email` VARCHAR(100) COMMENT '邮箱',
  `customer_type` VARCHAR(20) DEFAULT 'private' COMMENT '客户类型',
  `private_customer_id` VARCHAR(36) COMMENT '私有客户ID',
  `tenant_id` VARCHAR(36) COMMENT '租户ID',
  `license_type` ENUM('trial', 'perpetual', 'annual', 'monthly') DEFAULT 'trial' COMMENT '授权类型',
  `max_users` INT DEFAULT 10 COMMENT '最大用户数',
  `max_storage_gb` INT DEFAULT 5 COMMENT '最大存储空间(GB)',
  `features` JSON COMMENT '功能模块',
  `machine_id` VARCHAR(255) COMMENT '机器码',
  `status` ENUM('active', 'expired', 'revoked', 'pending') DEFAULT 'pending' COMMENT '状态',
  `activated_at` DATETIME COMMENT '激活时间',
  `expires_at` DATETIME COMMENT '到期时间',
  `notes` TEXT COMMENT '备注',
  `created_by` VARCHAR(36) COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_customer_type` (`customer_type`),
  INDEX `idx_private_customer_id` (`private_customer_id`),
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授权记录表';

-- 4.2 创建授权日志表
CREATE TABLE IF NOT EXISTS `license_logs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
  `license_id` VARCHAR(36) COMMENT '授权ID',
  `license_key` VARCHAR(255) COMMENT '授权码',
  `action` ENUM('verify', 'activate', 'renew', 'revoke', 'expire') COMMENT '操作类型',
  `machine_id` VARCHAR(255) COMMENT '机器码',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` TEXT COMMENT 'User-Agent',
  `result` ENUM('success', 'failed') COMMENT '结果',
  `message` TEXT COMMENT '消息',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_license_id` (`license_id`),
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授权验证日志表';

-- =====================================================
-- 第五部分: 创建私有客户管理表
-- =====================================================

-- 5.1 创建私有客户表
CREATE TABLE IF NOT EXISTS `private_customers` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '客户ID',
  `customer_name` VARCHAR(200) NOT NULL COMMENT '客户名称',
  `contact_person` VARCHAR(100) COMMENT '联系人',
  `contact_phone` VARCHAR(50) COMMENT '联系电话',
  `contact_email` VARCHAR(100) COMMENT '联系邮箱',
  `company_address` VARCHAR(500) COMMENT '公司地址',
  `industry` VARCHAR(100) COMMENT '所属行业',
  `company_size` VARCHAR(50) COMMENT '公司规模',
  `deployment_type` VARCHAR(50) DEFAULT 'on-premise' COMMENT '部署类型',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `notes` TEXT COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_customer_name` (`customer_name`),
  INDEX `idx_status` (`status`),
  INDEX `idx_industry` (`industry`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私有部署客户表';

-- =====================================================
-- 第六部分: 创建版本管理表
-- =====================================================

-- 6.1 创建版本表
CREATE TABLE IF NOT EXISTS `versions` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '版本ID',
  `version` VARCHAR(20) NOT NULL UNIQUE COMMENT '版本号',
  `version_code` INT NOT NULL COMMENT '版本代码',
  `release_type` ENUM('major', 'minor', 'patch', 'beta', 'alpha') NOT NULL DEFAULT 'minor' COMMENT '发布类型',
  `platform` ENUM('windows', 'macos', 'linux', 'android', 'ios', 'web', 'all') NOT NULL DEFAULT 'all' COMMENT '适用平台',
  `changelog` TEXT COMMENT '更新日志',
  `download_url` VARCHAR(500) COMMENT '下载地址',
  `file_size` BIGINT COMMENT '文件大小(字节)',
  `file_hash` VARCHAR(64) COMMENT '文件哈希(SHA256)',
  `download_count` INT NOT NULL DEFAULT 0 COMMENT '下载次数',
  `status` ENUM('draft', 'published', 'archived') DEFAULT 'draft' COMMENT '状态',
  `is_published` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已发布',
  `published_at` DATETIME COMMENT '发布时间',
  `created_by` VARCHAR(36) COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_version` (`version`),
  INDEX `idx_status` (`status`),
  INDEX `idx_platform` (`platform`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='版本管理表';

-- 6.2 创建更新日志表
CREATE TABLE IF NOT EXISTS `changelogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  `version_id` VARCHAR(36) NOT NULL COMMENT '版本ID',
  `type` ENUM('feature', 'bugfix', 'improvement', 'security', 'breaking') NOT NULL DEFAULT 'feature' COMMENT '类型',
  `content` TEXT NOT NULL COMMENT '更新内容',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_version_id` (`version_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='版本更新日志表';

-- =====================================================
-- 第七部分: 创建支付订单表（如果不存在）
-- =====================================================

-- 7.1 检查并创建支付订单表
CREATE TABLE IF NOT EXISTS `payment_orders` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '订单ID',
  `order_no` VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
  `tenant_id` VARCHAR(36) COMMENT '租户ID',
  `tenant_name` VARCHAR(200) COMMENT '租户名称',
  `package_id` VARCHAR(36) COMMENT '套餐ID',
  `package_name` VARCHAR(200) COMMENT '套餐名称',
  `amount` DECIMAL(10, 2) NOT NULL COMMENT '金额',
  `pay_type` VARCHAR(20) COMMENT '支付方式: wechat/alipay/bank',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态: pending/paid/refunded/closed',
  `billing_cycle` VARCHAR(20) DEFAULT 'monthly' COMMENT '计费周期: monthly/yearly/once',
  `bonus_months` INT DEFAULT 0 COMMENT '赠送月数',
  `contact_name` VARCHAR(100) COMMENT '联系人姓名',
  `contact_phone` VARCHAR(50) COMMENT '联系电话',
  `contact_email` VARCHAR(100) COMMENT '联系邮箱',
  `trade_no` VARCHAR(100) COMMENT '第三方交易号',
  `qr_code` TEXT COMMENT '支付二维码',
  `pay_url` TEXT COMMENT '支付链接',
  `expire_time` DATETIME COMMENT '订单过期时间',
  `paid_at` DATETIME COMMENT '支付时间',
  `refund_amount` DECIMAL(10, 2) COMMENT '退款金额',
  `refund_at` DATETIME COMMENT '退款时间',
  `refund_reason` TEXT COMMENT '退款原因',
  `refunded_by` VARCHAR(100) COMMENT '退款操作人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_order_no` (`order_no`),
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_pay_type` (`pay_type`),
  INDEX `idx_billing_cycle` (`billing_cycle`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付订单表';

-- 7.2 创建支付日志表
CREATE TABLE IF NOT EXISTS `payment_logs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
  `order_id` VARCHAR(36) COMMENT '订单ID',
  `order_no` VARCHAR(50) COMMENT '订单号',
  `action` VARCHAR(50) COMMENT '操作类型: create/notify/refund/close',
  `pay_type` VARCHAR(20) COMMENT '支付方式',
  `request_data` JSON COMMENT '请求数据',
  `response_data` JSON COMMENT '响应数据',
  `result` VARCHAR(20) COMMENT '结果: success/fail',
  `error_msg` TEXT COMMENT '错误信息',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_order_no` (`order_no`),
  INDEX `idx_action` (`action`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付日志表';

-- 7.3 创建支付配置表
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
-- 第八部分: 添加缺失字段（如果表已存在）
-- =====================================================

-- 8.1 为payment_orders表添加字段（如果不存在）
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payment_orders'
  AND COLUMN_NAME = 'billing_cycle';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `payment_orders` ADD COLUMN `billing_cycle` VARCHAR(20) DEFAULT ''monthly'' COMMENT ''计费周期'' AFTER `amount`',
  'SELECT ''billing_cycle字段已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payment_orders'
  AND COLUMN_NAME = 'bonus_months';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `payment_orders` ADD COLUMN `bonus_months` INT DEFAULT 0 COMMENT ''赠送月数'' AFTER `billing_cycle`',
  'SELECT ''bonus_months字段已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8.2 为packages表添加年付配置字段（如果不存在）
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'packages'
  AND COLUMN_NAME = 'yearly_discount_rate';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `packages` ADD COLUMN `yearly_discount_rate` DECIMAL(5, 2) DEFAULT 0.00 COMMENT ''年付折扣率'' AFTER `billing_cycle`',
  'SELECT ''yearly_discount_rate字段已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'packages'
  AND COLUMN_NAME = 'yearly_bonus_months';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `packages` ADD COLUMN `yearly_bonus_months` INT DEFAULT 0 COMMENT ''年付赠送月数'' AFTER `yearly_discount_rate`',
  'SELECT ''yearly_bonus_months字段已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'packages'
  AND COLUMN_NAME = 'yearly_price';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `packages` ADD COLUMN `yearly_price` DECIMAL(10, 2) COMMENT ''年付价格'' AFTER `yearly_bonus_months`',
  'SELECT ''yearly_price字段已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 第九部分: 验证表创建
-- =====================================================

-- 验证所有表是否创建成功
SELECT
  TABLE_NAME AS '表名',
  TABLE_COMMENT AS '说明',
  TABLE_ROWS AS '行数'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'admin_users', 'admin_operation_logs',
    'tenants', 'tenant_settings', 'tenant_logs',
    'packages', 'licenses', 'license_logs',
    'private_customers', 'versions', 'changelogs',
    'payment_orders'
  )
ORDER BY TABLE_NAME;

-- =====================================================
-- 执行完成
-- =====================================================
--
-- 执行说明:
-- 1. 本脚本已在开发环境测试通过
-- 2. 生产环境执行前请务必备份数据库
-- 3. 建议分段执行并检查每段结果
-- 4. 如遇错误请记录并联系开发人员
--
-- 执行方法（宝塔面板）:
-- 1. 登录宝塔面板
-- 2. 进入数据库管理
-- 3. 选择目标数据库
-- 4. 点击"SQL"标签
-- 5. 粘贴本脚本内容
-- 6. 点击"执行"按钮
-- 7. 检查执行结果
--
-- =====================================================
