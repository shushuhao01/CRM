-- =============================================
-- 生产环境 SaaS 升级迁移脚本 (简化版 - 适用于宝塔 phpMyAdmin)
-- 日期: 2026-04-04
-- 
-- 此脚本已去除所有 DECLARE / DELIMITER / 存储过程
-- 可以直接在宝塔 phpMyAdmin 的 SQL 标签页中执行
-- 
-- 建议分步执行：将每个 "步骤" 单独复制执行
-- 所有语句都做了幂等处理，可重复执行不会出错
-- =============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================
-- 步骤 1：创建缺失的平台管理表
-- 说明：这些表是 SaaS 模式所必需的
-- 可以直接全部复制执行，IF NOT EXISTS 保证安全
-- =============================================

SELECT '===== 步骤1：创建缺失的平台管理表 =====' AS `执行阶段`;

-- 1.1 租户表
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL COMMENT '租户名称',
  `code` VARCHAR(50) NOT NULL COMMENT '租户编码（唯一）',
  `package_id` VARCHAR(36) NULL COMMENT '套餐ID',
  `contact` VARCHAR(100) NULL COMMENT '联系人',
  `phone` VARCHAR(20) NULL COMMENT '联系电话',
  `email` VARCHAR(100) NULL COMMENT '邮箱',
  `max_users` INT DEFAULT 10 COMMENT '最大用户数',
  `max_storage_gb` INT DEFAULT 5 COMMENT '最大存储(GB)',
  `user_count` INT DEFAULT 0 COMMENT '当前用户数',
  `used_storage_mb` DECIMAL(10,2) DEFAULT 0 COMMENT '已用存储(MB)',
  `expire_date` DATE NULL COMMENT '到期日期',
  `license_key` VARCHAR(100) NULL COMMENT '授权码',
  `status` ENUM('active','suspended','expired','trial') DEFAULT 'active' COMMENT '状态',
  `modules` JSON NULL COMMENT '已开通模块',
  `logo` VARCHAR(500) NULL COMMENT '租户Logo',
  `custom_domain` VARCHAR(255) NULL COMMENT '自定义域名',
  `theme_color` VARCHAR(20) NULL COMMENT '主题色',
  `notes` TEXT NULL COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_code` (`code`),
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户表';

-- 1.2 租户套餐表
CREATE TABLE IF NOT EXISTS `tenant_packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '套餐名称',
  `code` VARCHAR(50) NOT NULL COMMENT '套餐代码',
  `type` ENUM('saas','private') DEFAULT 'saas' COMMENT '套餐类型',
  `description` TEXT NULL COMMENT '描述',
  `price` DECIMAL(10,2) DEFAULT 0 COMMENT '价格',
  `original_price` DECIMAL(10,2) NULL COMMENT '原价',
  `billing_cycle` ENUM('monthly','yearly','once') DEFAULT 'monthly' COMMENT '计费周期',
  `yearly_discount_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '年付折扣率',
  `yearly_bonus_months` INT DEFAULT 0 COMMENT '年付赠送月数',
  `yearly_price` DECIMAL(10,2) NULL COMMENT '年付价格',
  `duration_days` INT DEFAULT 30 COMMENT '有效期(天)',
  `max_users` INT DEFAULT 10 COMMENT '最大用户数',
  `max_storage_gb` INT DEFAULT 5 COMMENT '最大存储(GB)',
  `features` JSON NULL COMMENT '功能列表',
  `is_trial` TINYINT(1) DEFAULT 0 COMMENT '是否试用',
  `trial_days` INT DEFAULT 0 COMMENT '试用天数',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `status` ENUM('active','inactive') DEFAULT 'active' COMMENT '状态',
  `modules` JSON NULL COMMENT '包含模块',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户套餐表';

-- 1.3 租户配置表
CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `setting_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `setting_value` TEXT NULL COMMENT '配置值',
  `setting_type` VARCHAR(20) DEFAULT 'string' COMMENT '值类型',
  `description` VARCHAR(500) NULL COMMENT '描述',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `uk_tenant_setting` (`tenant_id`, `setting_key`),
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户配置表';

-- 1.4 租户日志表
CREATE TABLE IF NOT EXISTS `tenant_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(255) NOT NULL COMMENT '租户ID',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `operator` VARCHAR(100) NOT NULL COMMENT '操作人',
  `operator_id` VARCHAR(255) NOT NULL COMMENT '操作人ID',
  `details` TEXT NULL COMMENT '操作详情(JSON)',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(500) NULL COMMENT 'User Agent',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_tenant_created` (`tenant_id`, `created_at`),
  INDEX `idx_action` (`action`),
  INDEX `idx_operator_id` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户操作日志表';

-- 1.5 版本更新日志表
CREATE TABLE IF NOT EXISTS `changelogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `version_id` VARCHAR(36) NOT NULL COMMENT '版本ID',
  `type` ENUM('feature','bugfix','improvement','security','breaking') DEFAULT 'feature' COMMENT '类型',
  `content` TEXT NOT NULL COMMENT '内容',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_version_id` (`version_id`),
  CONSTRAINT `fk_changelog_version` FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='版本更新日志表';

-- 1.6 代收取消申请表
CREATE TABLE IF NOT EXISTS `cod_cancel_applications` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(50) NULL COMMENT '租户ID',
  `order_id` VARCHAR(36) NOT NULL COMMENT '订单ID',
  `order_no` VARCHAR(50) NULL COMMENT '订单编号',
  `applicant_id` VARCHAR(36) NOT NULL COMMENT '申请人ID',
  `applicant_name` VARCHAR(100) NULL COMMENT '申请人姓名',
  `reason` TEXT NULL COMMENT '取消原因',
  `status` ENUM('pending','approved','rejected') DEFAULT 'pending' COMMENT '状态',
  `reviewer_id` VARCHAR(36) NULL COMMENT '审核人ID',
  `reviewer_name` VARCHAR(100) NULL COMMENT '审核人姓名',
  `review_comment` TEXT NULL COMMENT '审核意见',
  `reviewed_at` TIMESTAMP NULL COMMENT '审核时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代收取消申请表';

-- 1.7 私有部署客户表
CREATE TABLE IF NOT EXISTS `private_customers` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `customer_name` VARCHAR(200) NOT NULL COMMENT '客户名称',
  `contact_person` VARCHAR(100) NULL COMMENT '联系人',
  `contact_phone` VARCHAR(50) NULL COMMENT '联系电话',
  `contact_email` VARCHAR(100) NULL COMMENT '联系邮箱',
  `company_address` VARCHAR(500) NULL COMMENT '公司地址',
  `industry` VARCHAR(100) NULL COMMENT '行业',
  `company_size` VARCHAR(50) NULL COMMENT '公司规模',
  `deployment_type` VARCHAR(50) DEFAULT 'on-premise' COMMENT '部署类型',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `notes` TEXT NULL COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私有部署客户表';

-- 1.8 Admin管理员表
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `name` VARCHAR(100) NULL COMMENT '姓名',
  `email` VARCHAR(100) NULL COMMENT '邮箱',
  `phone` VARCHAR(20) NULL COMMENT '手机号',
  `avatar` VARCHAR(500) NULL COMMENT '头像',
  `role` ENUM('super_admin','admin','operator') DEFAULT 'operator' COMMENT '角色',
  `status` ENUM('active','disabled') DEFAULT 'active' COMMENT '状态',
  `last_login_at` TIMESTAMP NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(50) NULL COMMENT '最后登录IP',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin管理员表';

-- 1.9 Admin操作日志表
CREATE TABLE IF NOT EXISTS `admin_operation_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `admin_id` VARCHAR(36) NOT NULL COMMENT '管理员ID',
  `admin_name` VARCHAR(100) NULL COMMENT '管理员名称',
  `module` VARCHAR(50) NULL COMMENT '操作模块',
  `action` VARCHAR(50) NOT NULL COMMENT '操作动作',
  `target_type` VARCHAR(50) NULL COMMENT '目标类型',
  `target_id` VARCHAR(36) NULL COMMENT '目标ID',
  `detail` TEXT NULL COMMENT '详细信息',
  `ip` VARCHAR(50) NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(500) NULL COMMENT 'User Agent',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_admin_id` (`admin_id`),
  INDEX `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin操作日志表';

-- 1.10 授权表
CREATE TABLE IF NOT EXISTS `licenses` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `license_key` VARCHAR(100) NOT NULL COMMENT '授权码',
  `type` ENUM('trial','standard','professional','enterprise') DEFAULT 'standard' COMMENT '类型',
  `package_id` INT NULL COMMENT '套餐ID',
  `package_name` VARCHAR(100) NULL COMMENT '套餐名称',
  `max_users` INT DEFAULT 10 COMMENT '最大用户数',
  `max_storage_gb` INT DEFAULT 5 COMMENT '最大存储(GB)',
  `features` JSON NULL COMMENT '功能列表',
  `status` ENUM('active','expired','revoked','suspended') DEFAULT 'active' COMMENT '状态',
  `activated_at` TIMESTAMP NULL COMMENT '激活时间',
  `expires_at` TIMESTAMP NULL COMMENT '过期时间',
  `domain` VARCHAR(255) NULL COMMENT '绑定域名',
  `ip_address` VARCHAR(50) NULL COMMENT '绑定IP',
  `hardware_id` VARCHAR(255) NULL COMMENT '硬件ID',
  `last_heartbeat` TIMESTAMP NULL COMMENT '最后心跳时间',
  `notes` TEXT NULL COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_license_key` (`license_key`),
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授权表';

-- 1.11 授权日志表
CREATE TABLE IF NOT EXISTS `license_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `license_id` VARCHAR(36) NOT NULL COMMENT '授权ID',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `operator` VARCHAR(100) NULL COMMENT '操作人',
  `details` TEXT NULL COMMENT '详情(JSON)',
  `ip_address` VARCHAR(50) NULL COMMENT 'IP地址',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_license_id` (`license_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授权日志表';

-- 1.12 版本表
CREATE TABLE IF NOT EXISTS `versions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `version` VARCHAR(20) NOT NULL COMMENT '版本号',
  `title` VARCHAR(200) NULL COMMENT '标题',
  `description` TEXT NULL COMMENT '描述',
  `release_date` DATE NULL COMMENT '发布日期',
  `is_published` TINYINT(1) DEFAULT 0 COMMENT '是否已发布',
  `download_url` VARCHAR(500) NULL COMMENT '下载地址',
  `release_notes` TEXT NULL COMMENT '发布说明',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_version` (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='版本表';

-- 1.13 模块表
CREATE TABLE IF NOT EXISTS `modules` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '模块名称',
  `code` VARCHAR(50) NOT NULL COMMENT '模块代码',
  `description` TEXT NULL COMMENT '描述',
  `icon` VARCHAR(100) NULL COMMENT '图标',
  `category` VARCHAR(50) NULL COMMENT '分类',
  `is_core` TINYINT(1) DEFAULT 0 COMMENT '是否核心模块',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认启用',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `status` ENUM('active','inactive') DEFAULT 'active' COMMENT '状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块表';

-- 1.14 模块配置表
CREATE TABLE IF NOT EXISTS `module_configs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `module_id` VARCHAR(36) NOT NULL COMMENT '模块ID',
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `config_value` TEXT NULL COMMENT '配置值',
  `config_type` VARCHAR(20) DEFAULT 'string' COMMENT '值类型',
  `description` VARCHAR(500) NULL COMMENT '描述',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_module_id` (`module_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块配置表';

-- 1.15 通知模板表
CREATE TABLE IF NOT EXISTS `notification_templates` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL COMMENT '模板代码',
  `name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `channel` VARCHAR(20) NOT NULL COMMENT '渠道(email/sms/wechat/system)',
  `subject` VARCHAR(200) NULL COMMENT '标题',
  `content` TEXT NOT NULL COMMENT '内容模板',
  `variables` JSON NULL COMMENT '可用变量(JSON)',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板表';

-- 1.16 API配置表
CREATE TABLE IF NOT EXISTS `api_configs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT 'API名称',
  `code` VARCHAR(50) NOT NULL COMMENT 'API代码',
  `description` TEXT NULL COMMENT '描述',
  `api_key` VARCHAR(100) NOT NULL COMMENT 'API密钥',
  `api_secret` VARCHAR(255) NOT NULL COMMENT 'API密钥(加密)',
  `status` ENUM('active','inactive') DEFAULT 'active' COMMENT '状态',
  `rate_limit` INT DEFAULT 1000 COMMENT '速率限制(次/小时)',
  `allowed_ips` TEXT NULL COMMENT '允许的IP(JSON)',
  `expires_at` TIMESTAMP NULL COMMENT '过期时间',
  `last_used_at` TIMESTAMP NULL COMMENT '最后使用时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_code` (`code`),
  UNIQUE INDEX `idx_api_key` (`api_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API配置表';

-- 1.17 API调用日志表
CREATE TABLE IF NOT EXISTS `api_call_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `api_config_id` VARCHAR(36) NULL COMMENT 'API配置ID',
  `api_key` VARCHAR(100) NULL COMMENT 'API密钥',
  `endpoint` VARCHAR(255) NOT NULL COMMENT '调用端点',
  `method` VARCHAR(10) NOT NULL COMMENT '请求方法',
  `request_params` TEXT NULL COMMENT '请求参数',
  `response_status` INT NULL COMMENT '响应状态码',
  `response_time` INT NULL COMMENT '响应时间(ms)',
  `ip_address` VARCHAR(50) NULL COMMENT 'IP地址',
  `user_agent` TEXT NULL COMMENT 'User Agent',
  `error_message` TEXT NULL COMMENT '错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_api_config_id` (`api_config_id`),
  INDEX `idx_api_key` (`api_key`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_endpoint` (`endpoint`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API调用日志表';

-- 1.18 支付配置表
CREATE TABLE IF NOT EXISTS `payment_configs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `payment_type` VARCHAR(50) NOT NULL COMMENT '支付类型',
  `config_data` JSON NULL COMMENT '配置数据(JSON)',
  `is_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否启用',
  `environment` ENUM('sandbox','production') DEFAULT 'sandbox' COMMENT '环境',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付配置表';

-- 1.19 支付日志表
CREATE TABLE IF NOT EXISTS `payment_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `payment_order_id` VARCHAR(36) NULL COMMENT '支付订单ID',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `detail` TEXT NULL COMMENT '详情',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付日志表';

-- 1.20 支付订单表
CREATE TABLE IF NOT EXISTS `payment_orders` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `package_id` INT NULL COMMENT '套餐ID',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '金额',
  `payment_method` VARCHAR(50) NULL COMMENT '支付方式',
  `status` ENUM('pending','paid','failed','refunded','cancelled') DEFAULT 'pending' COMMENT '状态',
  `billing_cycle` VARCHAR(20) NULL COMMENT '计费周期',
  `bonus_months` INT DEFAULT 0 COMMENT '赠送月数',
  `trade_no` VARCHAR(100) NULL COMMENT '交易号',
  `paid_at` TIMESTAMP NULL COMMENT '支付时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付订单表';

-- 其余平台管理表（如果不存在）...
CREATE TABLE IF NOT EXISTS `payment_records` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `order_id` VARCHAR(36) NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `method` VARCHAR(50) NULL,
  `status` VARCHAR(20) DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录表';

CREATE TABLE IF NOT EXISTS `admin_notifications` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NULL,
  `level` ENUM('info','warning','error','success') DEFAULT 'info',
  `is_read` TINYINT(1) DEFAULT 0,
  `admin_id` VARCHAR(36) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_admin_id` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin通知表';

CREATE TABLE IF NOT EXISTS `admin_notification_channels` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `config` JSON NULL,
  `is_enabled` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin通知渠道表';

CREATE TABLE IF NOT EXISTS `admin_notification_rules` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `event` VARCHAR(100) NOT NULL,
  `channel_id` VARCHAR(36) NULL,
  `condition_config` JSON NULL,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Admin通知规则表';

CREATE TABLE IF NOT EXISTS `tenant_license_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NOT NULL,
  `license_key` VARCHAR(100) NULL,
  `action` VARCHAR(50) NOT NULL,
  `detail` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户授权日志表';

CREATE TABLE IF NOT EXISTS `private_deployments` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `customer_id` VARCHAR(36) NOT NULL,
  `server_info` TEXT NULL,
  `version` VARCHAR(20) NULL,
  `status` VARCHAR(20) DEFAULT 'active',
  `deployed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私有部署记录表';

CREATE TABLE IF NOT EXISTS `system_license` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `license_key` VARCHAR(255) NOT NULL,
  `status` VARCHAR(20) DEFAULT 'active',
  `activated_at` TIMESTAMP NULL,
  `expires_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统授权表';

CREATE TABLE IF NOT EXISTS `module_status` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `module_id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) NULL,
  `is_enabled` TINYINT(1) DEFAULT 0,
  `config` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_module_id` (`module_id`),
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块状态表';

CREATE TABLE IF NOT EXISTS `module_schemes` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `modules` JSON NULL,
  `description` TEXT NULL,
  `tenant_id` VARCHAR(36) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块方案表';

CREATE TABLE IF NOT EXISTS `api_interfaces` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `api_config_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `path` VARCHAR(255) NOT NULL,
  `method` VARCHAR(10) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('active','inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_api_config_id` (`api_config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API接口表';

CREATE TABLE IF NOT EXISTS `api_statistics` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `api_config_id` VARCHAR(36) NOT NULL,
  `date` DATE NOT NULL,
  `total_calls` INT DEFAULT 0,
  `success_calls` INT DEFAULT 0,
  `error_calls` INT DEFAULT 0,
  `avg_response_time` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_api_date` (`api_config_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API统计表';

-- 企业微信表
CREATE TABLE IF NOT EXISTS `wecom_configs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `corp_id` VARCHAR(100) NULL,
  `agent_id` VARCHAR(100) NULL,
  `secret` VARCHAR(255) NULL,
  `token` VARCHAR(100) NULL,
  `encoding_aes_key` VARCHAR(255) NULL,
  `status` ENUM('active','inactive') DEFAULT 'inactive',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业微信配置表';

CREATE TABLE IF NOT EXISTS `wecom_user_bindings` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `wecom_user_id` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微用户绑定表';

CREATE TABLE IF NOT EXISTS `wecom_customers` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `external_userid` VARCHAR(100) NULL,
  `name` VARCHAR(100) NULL,
  `customer_id` VARCHAR(36) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客户表';

CREATE TABLE IF NOT EXISTS `wecom_acquisition_links` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `name` VARCHAR(100) NULL,
  `link_url` VARCHAR(500) NULL,
  `qr_code` VARCHAR(500) NULL,
  `status` VARCHAR(20) DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微获客链接表';

CREATE TABLE IF NOT EXISTS `wecom_service_accounts` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `name` VARCHAR(100) NULL,
  `wecom_user_id` VARCHAR(100) NULL,
  `status` VARCHAR(20) DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客服账号表';

CREATE TABLE IF NOT EXISTS `wecom_chat_records` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `from_user` VARCHAR(100) NULL,
  `to_user` VARCHAR(100) NULL,
  `content` TEXT NULL,
  `msg_type` VARCHAR(20) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微聊天记录表';

CREATE TABLE IF NOT EXISTS `wecom_payment_records` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `amount` DECIMAL(10,2) NULL,
  `status` VARCHAR(20) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微支付记录表';

-- 微信公众号表
CREATE TABLE IF NOT EXISTS `wechat_followers` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `openid` VARCHAR(100) NOT NULL,
  `nickname` VARCHAR(100) NULL,
  `subscribe` TINYINT(1) DEFAULT 1,
  `subscribe_time` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信关注者表';

CREATE TABLE IF NOT EXISTS `wechat_message_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `openid` VARCHAR(100) NULL,
  `msg_type` VARCHAR(20) NULL,
  `content` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信消息日志表';

CREATE TABLE IF NOT EXISTS `wechat_official_account_config` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `app_id` VARCHAR(100) NULL,
  `app_secret` VARCHAR(255) NULL,
  `token` VARCHAR(100) NULL,
  `encoding_aes_key` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信公众号配置表';

CREATE TABLE IF NOT EXISTS `wechat_qrcode_scenes` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `scene_str` VARCHAR(100) NOT NULL,
  `name` VARCHAR(100) NULL,
  `ticket` VARCHAR(500) NULL,
  `url` VARCHAR(500) NULL,
  `expire_seconds` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_scene_str` (`scene_str`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信二维码场景表';

-- 增值管理表
CREATE TABLE IF NOT EXISTS `outsource_companies` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(200) NOT NULL COMMENT '公司名称',
  `contact_person` VARCHAR(100) NULL COMMENT '联系人',
  `contact_phone` VARCHAR(20) NULL COMMENT '联系电话',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `default_unit_price` DECIMAL(10,2) NULL COMMENT '默认单价',
  `status` ENUM('active','inactive') DEFAULT 'active' COMMENT '状态',
  `notes` TEXT NULL COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL COMMENT '软删除',
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外包公司表';

CREATE TABLE IF NOT EXISTS `value_added_orders` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `order_no` VARCHAR(50) NULL COMMENT '订单编号',
  `company_id` VARCHAR(36) NULL COMMENT '外包公司ID',
  `status` VARCHAR(50) DEFAULT 'pending' COMMENT '状态',
  `total_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '总金额',
  `notes` TEXT NULL COMMENT '备注',
  `created_by` VARCHAR(36) NULL COMMENT '创建人',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL COMMENT '软删除',
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值订单表';

CREATE TABLE IF NOT EXISTS `value_added_price_config` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '配置名称',
  `min_quantity` INT DEFAULT 0 COMMENT '最小数量',
  `max_quantity` INT NULL COMMENT '最大数量',
  `unit_price` DECIMAL(10,2) NOT NULL COMMENT '单价',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值价格配置表';

CREATE TABLE IF NOT EXISTS `value_added_status_configs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `status_key` VARCHAR(50) NOT NULL COMMENT '状态键',
  `status_label` VARCHAR(100) NOT NULL COMMENT '状态标签',
  `color` VARCHAR(20) NULL COMMENT '颜色',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值状态配置表';

CREATE TABLE IF NOT EXISTS `value_added_remark_presets` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `category` VARCHAR(50) NOT NULL COMMENT '分类',
  `content` VARCHAR(500) NOT NULL COMMENT '内容',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值备注预设表';

SELECT '✅ 步骤1完成
：所有缺失表已创建' AS `执行结果`;

-- =============================================
-- 步骤 2：为所有业务表添加 tenant_id 字段
-- 说明：逐表检查并添加，不使用存储过程
-- 如果字段已存在会自动跳过（不报错）
-- =============================================

SELECT '===== 步骤2：为业务表添加 tenant_id =====' AS `执行阶段`;

-- users
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `users` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `users` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- roles
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `roles` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `roles` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- permissions
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `permissions` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `permissions` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- permissions_closure
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions_closure');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions_closure' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `permissions_closure` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions_closure' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `permissions_closure` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- departments
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `departments` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `departments` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- customers
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `customers` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `customers` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- customer_groups
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_groups');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_groups' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `customer_groups` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_groups' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `customer_groups` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- customer_tags
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_tags');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_tags' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `customer_tags` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_tags' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `customer_tags` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- customer_shares
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_shares');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_shares' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `customer_shares` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_shares' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `customer_shares` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- customer_assignments
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_assignments');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_assignments' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `customer_assignments` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_assignments' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `customer_assignments` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- customer_service_permissions
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_service_permissions');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_service_permissions' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `customer_service_permissions` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_service_permissions' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `customer_service_permissions` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- products
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `products` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `products` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- product_categories
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_categories');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_categories' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `product_categories` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_categories' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `product_categories` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- orders
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `orders` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `orders` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- order_items
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `order_items` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `order_items` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- order_status_history
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_status_history');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_status_history' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `order_status_history` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_status_history' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `order_status_history` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- order_audits
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_audits');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_audits' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `order_audits` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_audits' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `order_audits` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- order_field_configs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_field_configs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_field_configs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `order_field_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_field_configs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `order_field_configs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- follow_up_records
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'follow_up_records');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'follow_up_records' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `follow_up_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'follow_up_records' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `follow_up_records` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- after_sales_services
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'after_sales_services');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'after_sales_services' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `after_sales_services` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'after_sales_services' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `after_sales_services` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- service_records
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_records');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_records' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `service_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_records' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `service_records` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- service_follow_up_records
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_follow_up_records');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_follow_up_records' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `service_follow_up_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_follow_up_records' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `service_follow_up_records` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- service_operation_logs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_operation_logs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_operation_logs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `service_operation_logs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_operation_logs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `service_operation_logs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- data_records
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'data_records');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'data_records' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `data_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'data_records' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `data_records` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- logistics
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `logistics` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `logistics` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- logistics_status
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `logistics_status` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `logistics_status` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- logistics_traces
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_traces');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_traces' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `logistics_traces` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_traces' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `logistics_traces` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- logistics_tracking
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_tracking');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_tracking' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `logistics_tracking` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_tracking' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `logistics_tracking` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- logistics_companies
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_companies');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_companies' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `logistics_companies` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_companies' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `logistics_companies` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- logistics_api_configs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_api_configs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_api_configs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `logistics_api_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_api_configs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `logistics_api_configs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- logistics_exceptions
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_exceptions');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_exceptions' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `logistics_exceptions` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_exceptions' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `logistics_exceptions` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- logistics_status_history
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status_history');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status_history' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `logistics_status_history` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status_history' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `logistics_status_history` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- logistics_todos
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_todos');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_todos' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `logistics_todos` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_todos' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `logistics_todos` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- call_records
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `call_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `call_records` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- call_lines
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_lines');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_lines' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `call_lines` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_lines' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `call_lines` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- call_recordings
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_recordings');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_recordings' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `call_recordings` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_recordings' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `call_recordings` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- global_call_config
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'global_call_config');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'global_call_config' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `global_call_config` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'global_call_config' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `global_call_config` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- phone_configs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phone_configs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phone_configs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `phone_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phone_configs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `phone_configs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- phone_blacklist
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phone_blacklist');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phone_blacklist' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `phone_blacklist` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phone_blacklist' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `phone_blacklist` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- work_phones
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_phones');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_phones' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `work_phones` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_phones' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `work_phones` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- user_line_assignments
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_line_assignments');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_line_assignments' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `user_line_assignments` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_line_assignments' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `user_line_assignments` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- outbound_tasks
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outbound_tasks');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outbound_tasks' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `outbound_tasks` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outbound_tasks' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `outbound_tasks` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- device_bind_logs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'device_bind_logs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'device_bind_logs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `device_bind_logs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'device_bind_logs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `device_bind_logs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- device_bindlogs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'device_bindlogs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'device_bindlogs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `device_bindlogs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'device_bindlogs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `device_bindlogs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sms_templates
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_templates');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_templates' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `sms_templates` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_templates' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `sms_templates` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sms_records
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `sms_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `sms_records` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- messages
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `messages` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `messages` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- message_subscriptions
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_subscriptions');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_subscriptions' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `message_subscriptions` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_subscriptions' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `message_subscriptions` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- message_read_status
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_read_status');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_read_status' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `message_read_status` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_read_status' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `message_read_status` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- notifications
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `notifications` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `notifications` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- notification_channels
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_channels');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_channels' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `notification_channels` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_channels' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `notification_channels` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- notification_logs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_logs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_logs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `notification_logs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_logs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `notification_logs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- notification_templates
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_templates');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_templates' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `notification_templates` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_templates' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `notification_templates` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- announcements
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcements');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcements' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `announcements` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcements' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `announcements` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- announcement_reads
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcement_reads');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcement_reads' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `announcement_reads` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcement_reads' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `announcement_reads` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- system_messages
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_messages');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_messages' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `system_messages` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_messages' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `system_messages` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- system_configs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_configs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_configs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `system_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_configs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `system_configs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- operation_logs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operation_logs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operation_logs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `operation_logs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operation_logs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `operation_logs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- logs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `logs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `logs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- user_permissions
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_permissions');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_permissions' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `user_permissions` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_permissions' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `user_permissions` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- sensitive_info_permissions
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sensitive_info_permissions');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sensitive_info_permissions' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `sensitive_info_permissions` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sensitive_info_permissions' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `sensitive_info_permissions` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payment_method_options
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_method_options');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_method_options' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `payment_method_options` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_method_options' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `payment_method_options` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- department_order_limits
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_order_limits');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_order_limits' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `department_order_limits` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_order_limits' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `department_order_limits` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- department_subscription_configs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_subscription_configs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_subscription_configs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `department_subscription_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_subscription_configs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `department_subscription_configs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- improvement_goals
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'improvement_goals');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'improvement_goals' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `improvement_goals` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'improvement_goals' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `improvement_goals` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- rejection_reasons
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rejection_reasons');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rejection_reasons' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `rejection_reasons` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rejection_reasons' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `rejection_reasons` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- performance_records
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_records');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_records' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `performance_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_records' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `performance_records` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- performance_metrics
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_metrics');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_metrics' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `performance_metrics` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_metrics' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `performance_metrics` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- performance_shares
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_shares');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_shares' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `performance_shares` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_shares' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `performance_shares` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- performance_share_members
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_share_members');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_share_members' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `performance_share_members` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_share_members' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `performance_share_members` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- performance_config
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_config');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_config' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `performance_config` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_config' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `performance_config` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- performance_report_configs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_configs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_configs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `performance_report_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_configs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `performance_report_configs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- performance_report_logs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_logs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_logs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `performance_report_logs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_logs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `performance_report_logs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- commission_setting
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_setting');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_setting' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `commission_setting` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_setting' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `commission_setting` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- commission_ladder
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_ladder');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_ladder' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `commission_ladder` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_ladder' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `commission_ladder` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- outsource_companies
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outsource_companies');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outsource_companies' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `outsource_companies` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outsource_companies' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `outsource_companies` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- value_added_orders
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'value_added_orders');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'value_added_orders' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `value_added_orders` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'value_added_orders' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `value_added_orders` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- value_added_price_config
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'value_added_price_config');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'value_added_price_config' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `value_added_price_config` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'value_added_price_config' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `value_added_price_config` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- value_added_status_configs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'value_added_status_configs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'value_added_status_configs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `value_added_status_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'value_added_status_configs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `value_added_status_configs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- value_added_remark_presets
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'value_added_remark_presets');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'value_added_remark_presets' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `value_added_remark_presets` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'value_added_remark_presets' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `value_added_remark_presets` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- cod_cancel_applications
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cod_cancel_applications');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cod_cancel_applications' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `cod_cancel_applications` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cod_cancel_applications' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `cod_cancel_applications` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- wecom_configs
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_configs');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_configs' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `wecom_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_configs' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `wecom_configs` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- wecom_user_bindings
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_user_bindings');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_user_bindings' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `wecom_user_bindings` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_user_bindings' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `wecom_user_bindings` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- wecom_customers
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_customers');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_customers' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `wecom_customers` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_customers' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `wecom_customers` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- wecom_acquisition_links
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_acquisition_links');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_acquisition_links' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `wecom_acquisition_links` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_acquisition_links' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `wecom_acquisition_links` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- wecom_service_accounts
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_service_accounts');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_service_accounts' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `wecom_service_accounts` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_service_accounts' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `wecom_service_accounts` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- wecom_chat_records
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_chat_records');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_chat_records' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `wecom_chat_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_chat_records' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `wecom_chat_records` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- wecom_payment_records
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_payment_records');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_payment_records' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `wecom_payment_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_payment_records' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `wecom_payment_records` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- module_schemes
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'module_schemes');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'module_schemes' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `module_schemes` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'module_schemes' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `module_schemes` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- module_status
SET @tbl_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'module_status');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'module_status' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @col_exists = 0, 'ALTER TABLE `module_status` ADD COLUMN `tenant_id` VARCHAR(36) NULL  AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'module_status' AND INDEX_NAME = 'idx_tenant_id');
SET @sql = IF(@tbl_exists > 0 AND @idx_exists = 0 AND @col_exists = 0, 'ALTER TABLE `module_status` ADD INDEX `idx_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT '✅ 步骤2完成：所有业务表已添加 tenant_id 字段' AS `执行结果`;

-- =============================================
-- 步骤 3：创建默认租户并迁移现有数据
-- =============================================

SELECT '===== 步骤3：创建默认租户 & 迁移数据 =====' AS `执行阶段`;

-- 3.1 插入默认套餐
INSERT INTO `tenant_packages` (`name`, `code`, `type`, `description`, `price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `features`, `is_trial`, `sort_order`, `status`)
SELECT '企业版', 'enterprise', 'saas', '企业级CRM套餐', 0, 'yearly', 365, 100, 50, '["客户管理","订单管理","物流管理","售后管理","增值管理","通话管理","数据分析","企业微信"]', 0, 1, 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `tenant_packages` WHERE `code` = 'enterprise');

-- 3.2 创建默认租户
SET @DEFAULT_TENANT_ID = UUID();
SET @DEFAULT_TENANT_CODE = 'default';
SET @DEFAULT_TENANT_NAME = '默认租户';

INSERT INTO `tenants` (`id`, `name`, `code`, `contact`, `phone`, `email`, `max_users`, `max_storage_gb`, `expire_date`, `status`, `modules`)
SELECT @DEFAULT_TENANT_ID, @DEFAULT_TENANT_NAME, @DEFAULT_TENANT_CODE, '管理员', '', '', 100, 50, '2027-12-31', 'active',
  '["customer","order","logistics","afterSales","valueAdded","call","performance","wecom","sms","notification"]'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `tenants` WHERE `code` = @DEFAULT_TENANT_CODE);

-- 获取已存在的租户ID
SELECT @DEFAULT_TENANT_ID := `id` FROM `tenants` WHERE `code` = @DEFAULT_TENANT_CODE LIMIT 1;
SELECT CONCAT('默认租户ID: ', @DEFAULT_TENANT_ID) AS `租户信息`;

-- 3.3 将现有数据分配给默认租户（逐表更新）
UPDATE `users` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `roles` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `permissions` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `permissions_closure` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `departments` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `customers` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `customer_groups` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `customer_tags` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `customer_shares` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `customer_assignments` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `customer_service_permissions` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `products` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `product_categories` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `orders` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `order_items` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `order_status_history` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `order_audits` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `order_field_configs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `follow_up_records` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `after_sales_services` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `service_records` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `service_follow_up_records` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `service_operation_logs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `data_records` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `logistics` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `logistics_status` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `logistics_traces` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `logistics_tracking` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `logistics_companies` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `logistics_api_configs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `logistics_exceptions` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `logistics_status_history` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `logistics_todos` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `call_records` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `call_lines` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `call_recordings` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `global_call_config` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `phone_configs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `phone_blacklist` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `work_phones` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `user_line_assignments` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `outbound_tasks` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `device_bind_logs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `device_bindlogs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `sms_templates` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `sms_records` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `messages` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `message_subscriptions` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `message_read_status` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `notifications` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `notification_channels` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `notification_logs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `notification_templates` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `announcements` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `announcement_reads` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `system_messages` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `system_configs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `operation_logs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `logs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `user_permissions` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `sensitive_info_permissions` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `payment_method_options` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `department_order_limits` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `department_subscription_configs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `improvement_goals` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `rejection_reasons` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `performance_records` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `performance_metrics` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `performance_shares` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `performance_share_members` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `performance_config` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `performance_report_configs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `performance_report_logs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `commission_setting` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `commission_ladder` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `outsource_companies` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `value_added_orders` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `value_added_price_config` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `value_added_status_configs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `value_added_remark_presets` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `cod_cancel_applications` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `wecom_configs` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `wecom_user_bindings` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `wecom_customers` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `wecom_acquisition_links` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `wecom_service_accounts` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `wecom_chat_records` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `wecom_payment_records` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `module_schemes` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;
UPDATE `module_status` SET `tenant_id` = @DEFAULT_TENANT_ID WHERE `tenant_id` IS NULL;

SELECT '✅ 步骤3完成：现有数据已分配到默认租户' AS `执行结果`;

-- =============================================
-- 步骤 4：为 users/orders/customers/roles 补充缺失字段
-- =============================================

SELECT '===== 步骤4：补充缺失字段 =====' AS `执行阶段`;

-- users.deleted_at
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deleted_at') = 0,
  'ALTER TABLE `users` ADD COLUMN `deleted_at` TIMESTAMP NULL ',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users.employment_status
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'employment_status') = 0,
  'ALTER TABLE `users` ADD COLUMN `employment_status` ENUM(''active'',''resigned'',''suspended'') DEFAULT ''active'' ',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users.remarks
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'remarks') = 0,
  'ALTER TABLE `users` ADD COLUMN `remarks` TEXT NULL ',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- orders.deleted_at
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'deleted_at') = 0,
  'ALTER TABLE `orders` ADD COLUMN `deleted_at` TIMESTAMP NULL ',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- orders.express_company
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'express_company') = 0,
  'ALTER TABLE `orders` ADD COLUMN `express_company` VARCHAR(100) NULL ',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- customers.deleted_at
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'deleted_at') = 0,
  'ALTER TABLE `customers` ADD COLUMN `deleted_at` TIMESTAMP NULL ',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- roles.is_system
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'is_system') = 0,
  'ALTER TABLE `roles` ADD COLUMN `is_system` TINYINT(1) DEFAULT 0 ',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- roles.type
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'type') = 0,
  'ALTER TABLE `roles` ADD COLUMN `type` ENUM(''system'',''custom'') DEFAULT ''custom'' ',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT '✅ 步骤4完成：缺失字段已补充' AS `执行结果`;

-- =============================================
-- 步骤 5：添加多租户性能优化索引
-- =============================================

SELECT '===== 步骤5：添加性能优化索引 =====' AS `执行阶段`;

-- users.idx_tenant_status
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_tenant_status');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `users` ADD INDEX `idx_tenant_status` (`tenant_id`, `status`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users.idx_tenant_username
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_tenant_username');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `users` ADD INDEX `idx_tenant_username` (`tenant_id`, `username`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- customers.idx_tenant_status
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND INDEX_NAME = 'idx_tenant_status');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `customers` ADD INDEX `idx_tenant_status` (`tenant_id`, `status`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- customers.idx_tenant_name
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND INDEX_NAME = 'idx_tenant_name');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `customers` ADD INDEX `idx_tenant_name` (`tenant_id`, `name`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- orders.idx_tenant_status
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_tenant_status');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `orders` ADD INDEX `idx_tenant_status` (`tenant_id`, `status`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- orders.idx_tenant_created
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_tenant_created');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `orders` ADD INDEX `idx_tenant_created` (`tenant_id`, `created_at`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- products.idx_tenant_status
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'idx_tenant_status');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `products` ADD INDEX `idx_tenant_status` (`tenant_id`, `status`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- roles.idx_tenant_code
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND INDEX_NAME = 'idx_tenant_code');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `roles` ADD INDEX `idx_tenant_code` (`tenant_id`, `code`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- departments.idx_tenant_status
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND INDEX_NAME = 'idx_tenant_status');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `departments` ADD INDEX `idx_tenant_status` (`tenant_id`, `status`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT '✅ 步骤5完成：性能索引已添加' AS `执行结果`;

-- =============================================
-- 步骤 6：验证迁移结果
-- =============================================

SELECT '===== 步骤6：验证迁移结果 =====' AS `执行阶段`;

-- 6.1 检查租户
SELECT id AS `租户ID`, name AS `租户名`, code AS `租户编码`, status AS `状态`, expire_date AS `到期日期` FROM tenants;

-- 6.2 检查各表 tenant_id 填充情况
SELECT
  t.TABLE_NAME AS `表名`,
  t.TABLE_ROWS AS `总行数`,
  (SELECT COUNT(*) FROM information_schema.COLUMNS c WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = t.TABLE_NAME AND c.COLUMN_NAME = 'tenant_id') AS `有tenant_id`
FROM information_schema.TABLES t
WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_ROWS > 0
ORDER BY t.TABLE_ROWS DESC;

-- 6.3 抽查关键表是否还有 NULL 的 tenant_id
SELECT 'users' AS `表名`, COUNT(*) AS `NULL_tenant_id数` FROM `users` WHERE `tenant_id` IS NULL;
SELECT 'customers' AS `表名`, COUNT(*) AS `NULL_tenant_id数` FROM `customers` WHERE `tenant_id` IS NULL;
SELECT 'orders' AS `表名`, COUNT(*) AS `NULL_tenant_id数` FROM `orders` WHERE `tenant_id` IS NULL;
SELECT 'products' AS `表名`, COUNT(*) AS `NULL_tenant_id数` FROM `products` WHERE `tenant_id` IS NULL;
SELECT 'roles' AS `表名`, COUNT(*) AS `NULL_tenant_id数` FROM `roles` WHERE `tenant_id` IS NULL;
SELECT 'departments' AS `表名`, COUNT(*) AS `NULL_tenant_id数` FROM `departments` WHERE `tenant_id` IS NULL;

SELECT '✅ 步骤6完成：验证完毕' AS `执行结果`;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- 迁移完成！
-- 
-- 接下来：
-- 1. 修改 backend/.env 中 DEPLOY_MODE=saas
-- 2. 重启后端服务
-- 3. 在 Admin 后台验证租户管理功能
-- 
-- 回滚：将 DEPLOY_MODE 改回 private 即可
-- =============================================
SELECT '生产环境 SaaS 升级完成！请配置 .env 并重启服务' AS `最终结果`;
