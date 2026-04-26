-- =====================================================
-- Admin后台表结构补充脚本
-- 用于补充到 database/schema.sql 文件中
-- 创建时间: 2026-03-05
-- =====================================================

-- =====================================================
-- Admin后台管理表
-- =====================================================

-- Admin用户表
DROP TABLE IF EXISTS `admin_users`;
CREATE TABLE `admin_users` (
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

-- Admin操作日志表
DROP TABLE IF EXISTS `admin_operation_logs`;
CREATE TABLE `admin_operation_logs` (
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
-- 租户管理表
-- =====================================================

-- 租户表
DROP TABLE IF EXISTS `tenants`;
CREATE TABLE `tenants` (
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

-- 租户设置表
DROP TABLE IF NOT EXISTS `tenant_settings`;
CREATE TABLE `tenant_settings` (
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

-- 租户日志表
DROP TABLE IF EXISTS `tenant_logs`;
CREATE TABLE `tenant_logs` (
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
-- 套餐管理表
-- =====================================================

-- 套餐表
DROP TABLE IF EXISTS `packages`;
CREATE TABLE `packages` (
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
  `user_limit_mode` ENUM('total', 'online', 'both') NOT NULL DEFAULT 'total' COMMENT '用户限制模式: total=限注册数, online=限在线席位, both=双模式',
  `max_online_seats` INT NOT NULL DEFAULT 0 COMMENT '最大在线席位数',
  `modules` JSON COMMENT '授权CRM模块列表',
  `features` JSON COMMENT '功能特性',
  `subscription_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否支持订阅自动续费',
  `subscription_channels` ENUM('wechat', 'alipay', 'all') DEFAULT 'all' COMMENT '订阅支付渠道',
  `subscription_billing_cycle` ENUM('monthly', 'yearly', 'both') DEFAULT 'monthly' COMMENT '订阅计费周期',
  `subscription_discount_rate` DECIMAL(5, 2) DEFAULT 0.00 COMMENT '订阅折扣率',
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
-- 授权管理表
-- =====================================================

-- 授权记录表
DROP TABLE IF EXISTS `licenses`;
CREATE TABLE `licenses` (
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
  `user_limit_mode` ENUM('total', 'online', 'both') DEFAULT 'total' COMMENT '用户限制模式',
  `max_online_seats` INT DEFAULT 0 COMMENT '最大在线席位数',
  `modules` JSON COMMENT '授权CRM模块列表',
  `features` JSON COMMENT '功能模块',
  `machine_id` VARCHAR(255) COMMENT '机器码',
  `status` ENUM('active', 'expired', 'revoked', 'pending') DEFAULT 'pending' COMMENT '状态',
  `activated_at` DATETIME COMMENT '激活时间',
  `expires_at` DATETIME COMMENT '到期时间',
  `notes` TEXT COMMENT '备注',
  `created_by` VARCHAR(36) COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` DATETIME DEFAULT NULL COMMENT '软删除时间',
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_customer_type` (`customer_type`),
  INDEX `idx_private_customer_id` (`private_customer_id`),
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授权记录表';

-- 授权日志表
DROP TABLE IF EXISTS `license_logs`;
CREATE TABLE `license_logs` (
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
-- 私有客户管理表
-- =====================================================

-- 私有客户表
DROP TABLE IF EXISTS `private_customers`;
CREATE TABLE `private_customers` (
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
-- 版本管理表
-- =====================================================

-- 版本表
DROP TABLE IF EXISTS `versions`;
CREATE TABLE `versions` (
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

-- 更新日志表
DROP TABLE IF EXISTS `changelogs`;
CREATE TABLE `changelogs` (
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
-- 支付订单表补充字段
-- =====================================================

-- 注意：如果payment_orders表已存在，只添加缺失字段
-- 如果表不存在，请参考完整的表创建脚本

-- 添加billing_cycle字段
ALTER TABLE `payment_orders`
ADD COLUMN IF NOT EXISTS `billing_cycle` VARCHAR(20) DEFAULT 'monthly' COMMENT '计费周期' AFTER `amount`;

-- 添加bonus_months字段
ALTER TABLE `payment_orders`
ADD COLUMN IF NOT EXISTS `bonus_months` INT DEFAULT 0 COMMENT '赠送月数' AFTER `billing_cycle`;

-- 添加索引
ALTER TABLE `payment_orders`
ADD INDEX IF NOT EXISTS `idx_billing_cycle` (`billing_cycle`);

-- =====================================================
-- 企微服务商通知模板配置表
-- =====================================================

CREATE TABLE IF NOT EXISTS `wecom_notification_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `template_id` VARCHAR(200) NOT NULL COMMENT '企微消息模板ID',
  `template_name` VARCHAR(200) NOT NULL COMMENT '模板名称(自定义标签)',
  `template_type` VARCHAR(50) NOT NULL COMMENT '模板类型: order/customer/follow_up/payment/approval/system/custom',
  `description` TEXT NULL COMMENT '模板用途描述',
  `template_content` TEXT NULL COMMENT '模板内容/变量说明(JSON)',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_template_type` (`template_type`),
  INDEX `idx_is_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微服务商应用通知模板配置';

-- =====================================================
-- 说明
-- =====================================================
--
-- 本脚本包含Admin后台所有相关表的完整定义
-- 可以直接追加到 database/schema.sql 文件末尾
--
-- 执行顺序:
-- 1. 先执行核心CRM表（schema.sql原有内容）
-- 2. 再执行本补充脚本
--
-- =====================================================
