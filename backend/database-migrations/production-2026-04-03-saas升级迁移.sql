-- =============================================
-- 生产环境 SaaS 升级迁移脚本
-- 日期: 2026-04-03
-- 用途: 将现有私有部署数据库升级为 SaaS 多租户模式
--
-- ⚠️ 重要提示：
--   1. 执行前务必备份整个数据库！
--   2. 建议在宝塔 phpMyAdmin 中分步执行
--   3. 每个步骤都可以单独执行，支持断点续做
--   4. 所有 ALTER TABLE 都使用 IF NOT EXISTS 检查，可重复执行
-- =============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================
-- 步骤 1：创建缺失的平台管理表
-- 说明：这些表是 SaaS 模式所必需的
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

SELECT '✅ 步骤1完成：所有缺失表已创建' AS `执行结果`;


-- =============================================
-- 步骤 2：为所有业务表添加 tenant_id 字段
-- 说明：使用存储过程安全添加，已存在的字段会跳过
-- =============================================

SELECT '===== 步骤2：为业务表添加 tenant_id =====' AS `执行阶段`;

-- 创建一个安全添加 tenant_id 的存储过程
DROP PROCEDURE IF EXISTS `safe_add_tenant_id`;
DELIMITER $$
CREATE PROCEDURE `safe_add_tenant_id`(IN tbl_name VARCHAR(100))
BEGIN
  DECLARE col_exists INT DEFAULT 0;
  DECLARE idx_exists INT DEFAULT 0;

  -- 检查表是否存在
  SELECT COUNT(*) INTO @tbl_exists
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl_name;

  IF @tbl_exists = 0 THEN
    SELECT CONCAT('⏭️ 跳过: 表 ', tbl_name, ' 不存在') AS result;
  ELSE
    -- 检查 tenant_id 字段是否已存在
    SELECT COUNT(*) INTO col_exists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl_name AND COLUMN_NAME = 'tenant_id';

    IF col_exists = 0 THEN
      -- 检查表是否有 id 列（决定 AFTER 位置）
      SELECT COUNT(*) INTO @has_id
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl_name AND COLUMN_NAME = 'id';

      IF @has_id > 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tbl_name, '` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
      ELSE
        SET @sql = CONCAT('ALTER TABLE `', tbl_name, '` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' FIRST');
      END IF;

      PREPARE stmt FROM @sql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
      SELECT CONCAT('✅ 已添加: ', tbl_name, '.tenant_id') AS result;
    ELSE
      SELECT CONCAT('⏭️ 已存在: ', tbl_name, '.tenant_id') AS result;
    END IF;

    -- 检查索引是否已存在
    SELECT COUNT(*) INTO idx_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl_name AND INDEX_NAME = 'idx_tenant_id';

    IF idx_exists = 0 AND col_exists = 0 THEN
      SET @sql = CONCAT('ALTER TABLE `', tbl_name, '` ADD INDEX `idx_tenant_id` (`tenant_id`)');
      PREPARE stmt FROM @sql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
    END IF;
  END IF;
END$$
DELIMITER ;

-- 为所有需要 tenant_id 的业务表执行
CALL safe_add_tenant_id('users');
CALL safe_add_tenant_id('roles');
CALL safe_add_tenant_id('permissions');
CALL safe_add_tenant_id('permissions_closure');
CALL safe_add_tenant_id('departments');
CALL safe_add_tenant_id('customers');
CALL safe_add_tenant_id('customer_groups');
CALL safe_add_tenant_id('customer_tags');
CALL safe_add_tenant_id('customer_shares');
CALL safe_add_tenant_id('customer_assignments');
CALL safe_add_tenant_id('customer_service_permissions');
CALL safe_add_tenant_id('products');
CALL safe_add_tenant_id('product_categories');
CALL safe_add_tenant_id('orders');
CALL safe_add_tenant_id('order_items');
CALL safe_add_tenant_id('order_status_history');
CALL safe_add_tenant_id('order_audits');
CALL safe_add_tenant_id('order_field_configs');
CALL safe_add_tenant_id('follow_up_records');
CALL safe_add_tenant_id('after_sales_services');
CALL safe_add_tenant_id('service_records');
CALL safe_add_tenant_id('service_follow_up_records');
CALL safe_add_tenant_id('service_operation_logs');
CALL safe_add_tenant_id('data_records');
CALL safe_add_tenant_id('logistics');
CALL safe_add_tenant_id('logistics_status');
CALL safe_add_tenant_id('logistics_traces');
CALL safe_add_tenant_id('logistics_tracking');
CALL safe_add_tenant_id('logistics_companies');
CALL safe_add_tenant_id('logistics_api_configs');
CALL safe_add_tenant_id('logistics_exceptions');
CALL safe_add_tenant_id('logistics_status_history');
CALL safe_add_tenant_id('logistics_todos');
CALL safe_add_tenant_id('call_records');
CALL safe_add_tenant_id('call_lines');
CALL safe_add_tenant_id('call_recordings');
CALL safe_add_tenant_id('global_call_config');
CALL safe_add_tenant_id('phone_configs');
CALL safe_add_tenant_id('phone_blacklist');
CALL safe_add_tenant_id('work_phones');
CALL safe_add_tenant_id('user_line_assignments');
CALL safe_add_tenant_id('outbound_tasks');
CALL safe_add_tenant_id('device_bind_logs');
CALL safe_add_tenant_id('device_bindlogs');
CALL safe_add_tenant_id('sms_templates');
CALL safe_add_tenant_id('sms_records');
CALL safe_add_tenant_id('messages');
CALL safe_add_tenant_id('message_subscriptions');
CALL safe_add_tenant_id('message_read_status');
CALL safe_add_tenant_id('notifications');
CALL safe_add_tenant_id('notification_channels');
CALL safe_add_tenant_id('notification_logs');
CALL safe_add_tenant_id('notification_templates');
CALL safe_add_tenant_id('announcements');
CALL safe_add_tenant_id('announcement_reads');
CALL safe_add_tenant_id('system_messages');
CALL safe_add_tenant_id('system_configs');
CALL safe_add_tenant_id('operation_logs');
CALL safe_add_tenant_id('logs');
CALL safe_add_tenant_id('user_permissions');
CALL safe_add_tenant_id('sensitive_info_permissions');
CALL safe_add_tenant_id('payment_method_options');
CALL safe_add_tenant_id('department_order_limits');
CALL safe_add_tenant_id('department_subscription_configs');
CALL safe_add_tenant_id('improvement_goals');
CALL safe_add_tenant_id('rejection_reasons');
CALL safe_add_tenant_id('performance_records');
CALL safe_add_tenant_id('performance_metrics');
CALL safe_add_tenant_id('performance_shares');
CALL safe_add_tenant_id('performance_share_members');
CALL safe_add_tenant_id('performance_config');
CALL safe_add_tenant_id('performance_report_configs');
CALL safe_add_tenant_id('performance_report_logs');
CALL safe_add_tenant_id('commission_setting');
CALL safe_add_tenant_id('commission_ladder');
CALL safe_add_tenant_id('outsource_companies');
CALL safe_add_tenant_id('value_added_orders');
CALL safe_add_tenant_id('value_added_price_config');
CALL safe_add_tenant_id('value_added_status_configs');
CALL safe_add_tenant_id('value_added_remark_presets');
CALL safe_add_tenant_id('cod_cancel_applications');
CALL safe_add_tenant_id('wecom_configs');
CALL safe_add_tenant_id('wecom_user_bindings');
CALL safe_add_tenant_id('wecom_customers');
CALL safe_add_tenant_id('wecom_acquisition_links');
CALL safe_add_tenant_id('wecom_service_accounts');
CALL safe_add_tenant_id('wecom_chat_records');
CALL safe_add_tenant_id('wecom_payment_records');
CALL safe_add_tenant_id('module_schemes');
CALL safe_add_tenant_id('module_status');

-- 清理存储过程
DROP PROCEDURE IF EXISTS `safe_add_tenant_id`;

SELECT '✅ 步骤2完成：所有业务表已添加 tenant_id 字段' AS `执行结果`;


-- =============================================
-- 步骤 3：创建默认租户并迁移现有数据
-- 说明：将你现有的私有数据归属到一个默认租户
-- ⚠️ 请修改下方的租户信息为你的实际信息！
-- =============================================

SELECT '===== 步骤3：创建默认租户 & 迁移数据 =====' AS `执行阶段`;

-- 3.1 插入默认套餐（如果不存在）
INSERT INTO `tenant_packages` (`name`, `code`, `type`, `description`, `price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `features`, `is_trial`, `sort_order`, `status`)
SELECT '企业版', 'enterprise', 'saas', '企业级CRM套餐，包含所有功能', 0, 'yearly', 365, 100, 50, '["客户管理","订单管理","物流管理","售后管理","增值管理","通话管理","数据分析","企业微信"]', 0, 1, 'active'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `tenant_packages` WHERE `code` = 'enterprise');

-- 3.2 创建你的默认租户
-- ⚠️⚠️⚠️ 请修改以下信息为你的实际信息 ⚠️⚠️⚠️
SET @DEFAULT_TENANT_ID = UUID();
SET @DEFAULT_TENANT_CODE = 'default';  -- 修改为你想要的租户编码
SET @DEFAULT_TENANT_NAME = '默认租户';  -- 修改为你的公司名称

INSERT INTO `tenants` (`id`, `name`, `code`, `contact`, `phone`, `email`, `max_users`, `max_storage_gb`, `expire_date`, `status`, `modules`)
SELECT @DEFAULT_TENANT_ID, @DEFAULT_TENANT_NAME, @DEFAULT_TENANT_CODE, '管理员', '', '', 100, 50, '2027-12-31', 'active',
  '["customer","order","logistics","afterSales","valueAdded","call","performance","wecom","sms","notification"]'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `tenants` WHERE `code` = @DEFAULT_TENANT_CODE);

-- 如果租户已存在，获取其ID
SELECT @DEFAULT_TENANT_ID := `id` FROM `tenants` WHERE `code` = @DEFAULT_TENANT_CODE LIMIT 1;

SELECT CONCAT('🏢 默认租户ID: ', @DEFAULT_TENANT_ID) AS `租户信息`;

-- 3.3 将所有现有数据（tenant_id 为 NULL 的）分配给默认租户
-- 创建一个批量更新的存储过程
DROP PROCEDURE IF EXISTS `assign_tenant_to_existing_data`;
DELIMITER $$
CREATE PROCEDURE `assign_tenant_to_existing_data`(IN tenant_id_val VARCHAR(36))
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE tbl_name VARCHAR(100);
  DECLARE affected INT DEFAULT 0;
  DECLARE total_affected INT DEFAULT 0;

  -- 获取所有有 tenant_id 字段的表
  DECLARE cur CURSOR FOR
    SELECT DISTINCT TABLE_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME = 'tenant_id'
      AND TABLE_NAME NOT IN ('tenants', 'tenant_packages', 'tenant_settings', 'tenant_logs',
                              'admin_users', 'admin_operation_logs', 'admin_notifications',
                              'admin_notification_channels', 'admin_notification_rules',
                              'licenses', 'license_logs', 'versions', 'changelogs',
                              'private_customers', 'private_deployments', 'system_license',
                              'tenant_license_logs', 'payment_configs', 'payment_logs',
                              'payment_orders', 'payment_records');
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;

  read_loop: LOOP
    FETCH cur INTO tbl_name;
    IF done THEN
      LEAVE read_loop;
    END IF;

    -- 更新所有 tenant_id 为 NULL 的记录
    SET @sql = CONCAT('UPDATE `', tbl_name, '` SET `tenant_id` = ''', tenant_id_val, ''' WHERE `tenant_id` IS NULL');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET affected = ROW_COUNT();
    SET total_affected = total_affected + affected;

    IF affected > 0 THEN
      SELECT CONCAT('✅ ', tbl_name, ': 更新 ', affected, ' 条记录') AS result;
    END IF;
  END LOOP;

  CLOSE cur;

  SELECT CONCAT('📊 总计更新 ', total_affected, ' 条记录') AS `汇总`;
END$$
DELIMITER ;

-- 执行数据迁移
CALL assign_tenant_to_existing_data(@DEFAULT_TENANT_ID);

-- 清理存储过程
DROP PROCEDURE IF EXISTS `assign_tenant_to_existing_data`;

SELECT '✅ 步骤3完成：现有数据已分配到默认租户' AS `执行结果`;


-- =============================================
-- 步骤 4：为 users 表关键字段补充（如果缺失）
-- =============================================

SELECT '===== 步骤4：补充缺失字段 =====' AS `执行阶段`;

-- 4.1 users 表 - deleted_at 软删除字段
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deleted_at') = 0,
  'ALTER TABLE `users` ADD COLUMN `deleted_at` TIMESTAMP NULL COMMENT ''软删除时间''',
  'SELECT ''users.deleted_at 已存在'' AS skip'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4.2 users 表 - employment_status 在职状态
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'employment_status') = 0,
  'ALTER TABLE `users` ADD COLUMN `employment_status` ENUM(''active'',''resigned'',''suspended'') DEFAULT ''active'' COMMENT ''在职状态''',
  'SELECT ''users.employment_status 已存在'' AS skip'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4.3 users 表 - remarks 备注
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'remarks') = 0,
  'ALTER TABLE `users` ADD COLUMN `remarks` TEXT NULL COMMENT ''备注''',
  'SELECT ''users.remarks 已存在'' AS skip'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4.4 orders 表 - deleted_at 软删除字段
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'deleted_at') = 0,
  'ALTER TABLE `orders` ADD COLUMN `deleted_at` TIMESTAMP NULL COMMENT ''软删除时间''',
  'SELECT ''orders.deleted_at 已存在'' AS skip'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4.5 orders 表 - express_company 快递公司
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'express_company') = 0,
  'ALTER TABLE `orders` ADD COLUMN `express_company` VARCHAR(100) NULL COMMENT ''快递公司''',
  'SELECT ''orders.express_company 已存在'' AS skip'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4.6 customers 表 - deleted_at 软删除字段
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'deleted_at') = 0,
  'ALTER TABLE `customers` ADD COLUMN `deleted_at` TIMESTAMP NULL COMMENT ''软删除时间''',
  'SELECT ''customers.deleted_at 已存在'' AS skip'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4.7 roles 表 - is_system 系统预设标记
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'is_system') = 0,
  'ALTER TABLE `roles` ADD COLUMN `is_system` TINYINT(1) DEFAULT 0 COMMENT ''是否系统预设角色''',
  'SELECT ''roles.is_system 已存在'' AS skip'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4.8 roles 表 - type 角色类型
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'type') = 0,
  'ALTER TABLE `roles` ADD COLUMN `type` ENUM(''system'',''custom'') DEFAULT ''custom'' COMMENT ''角色类型''',
  'SELECT ''roles.type 已存在'' AS skip'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ 步骤4完成：缺失字段已补充' AS `执行结果`;


-- =============================================
-- 步骤 5：添加多租户性能优化索引
-- =============================================

SELECT '===== 步骤5：添加性能优化索引 =====' AS `执行阶段`;

-- 复合索引：常用查询优化（tenant_id + 业务字段）
-- 安全添加索引的存储过程
DROP PROCEDURE IF EXISTS `safe_add_index`;
DELIMITER $$
CREATE PROCEDURE `safe_add_index`(IN tbl VARCHAR(100), IN idx_name VARCHAR(100), IN idx_cols VARCHAR(500))
BEGIN
  DECLARE idx_exists INT DEFAULT 0;

  SELECT COUNT(*) INTO idx_exists
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx_name;

  IF idx_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD INDEX `', idx_name, '` (', idx_cols, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- 核心业务表的复合索引
CALL safe_add_index('users', 'idx_tenant_status', '`tenant_id`, `status`');
CALL safe_add_index('users', 'idx_tenant_username', '`tenant_id`, `username`');
CALL safe_add_index('customers', 'idx_tenant_status', '`tenant_id`, `status`');
CALL safe_add_index('customers', 'idx_tenant_name', '`tenant_id`, `name`');
CALL safe_add_index('orders', 'idx_tenant_status', '`tenant_id`, `status`');
CALL safe_add_index('orders', 'idx_tenant_created', '`tenant_id`, `created_at`');
CALL safe_add_index('products', 'idx_tenant_status', '`tenant_id`, `status`');
CALL safe_add_index('roles', 'idx_tenant_code', '`tenant_id`, `code`');
CALL safe_add_index('departments', 'idx_tenant_status', '`tenant_id`, `status`');

DROP PROCEDURE IF EXISTS `safe_add_index`;

SELECT '✅ 步骤5完成：性能索引已添加' AS `执行结果`;


-- =============================================
-- 步骤 6：验证迁移结果
-- =============================================

SELECT '===== 步骤6：验证迁移结果 =====' AS `执行阶段`;

-- 6.1 检查租户是否创建成功
SELECT id AS `租户ID`, name AS `租户名`, code AS `租户编码`, status AS `状态`, expire_date AS `到期日期`
FROM tenants;

-- 6.2 检查各表的 tenant_id 填充情况
SELECT
  t.TABLE_NAME AS `表名`,
  t.TABLE_ROWS AS `总行数`,
  (SELECT COUNT(*) FROM information_schema.COLUMNS c
   WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = t.TABLE_NAME AND c.COLUMN_NAME = 'tenant_id') AS `有tenant_id`
FROM information_schema.TABLES t
WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_ROWS > 0
ORDER BY t.TABLE_ROWS DESC;

-- 6.3 检查是否还有 tenant_id 为 NULL 的业务数据
DROP PROCEDURE IF EXISTS `check_null_tenant_ids`;
DELIMITER $$
CREATE PROCEDURE `check_null_tenant_ids`()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE tbl_name VARCHAR(100);

  DECLARE cur CURSOR FOR
    SELECT DISTINCT TABLE_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME = 'tenant_id'
      AND TABLE_NAME NOT IN ('tenants', 'tenant_packages', 'admin_users',
                              'licenses', 'license_logs', 'versions', 'changelogs',
                              'private_customers', 'system_license');
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;

  read_loop: LOOP
    FETCH cur INTO tbl_name;
    IF done THEN
      LEAVE read_loop;
    END IF;

    SET @sql = CONCAT('SELECT ''', tbl_name, ''' AS `表名`, COUNT(*) AS `NULL_tenant_id记录数` FROM `', tbl_name, '` WHERE `tenant_id` IS NULL HAVING COUNT(*) > 0');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END LOOP;

  CLOSE cur;
END$$
DELIMITER ;

CALL check_null_tenant_ids();
DROP PROCEDURE IF EXISTS `check_null_tenant_ids`;

SELECT '✅ 步骤6完成：验证完毕' AS `执行结果`;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- 🎉 迁移完成！
--
-- 接下来需要在服务器上做以下配置：
-- 1. 修改 backend/.env 中的 DEPLOY_MODE=saas
-- 2. 配置 SAAS_LICENSE_TOKEN（如果有的话）
-- 3. 重启后端服务
-- 4. 在 Admin 后台验证租户管理功能
--
-- ⚠️ 回滚方案：
-- 如果需要回退，将 DEPLOY_MODE 改回 private 即可
-- 私有模式下系统会忽略 tenant_id，不影响使用
-- =============================================

SELECT '🎉 生产环境 SaaS 升级完成！请按文档配置 .env 并重启服务' AS `最终结果`;

