-- =============================================
-- CRM系统 v1.8.0 虚拟商品功能 - 数据库迁移脚本
-- 适用于：MySQL 8.0+ / phpMyAdmin
-- 执行前请备份数据库！
-- 日期：2026-04-20
-- =============================================

-- -----------------------------------------------
-- 1. products表新增虚拟商品字段（兼容MySQL 8.0）
-- -----------------------------------------------
DROP PROCEDURE IF EXISTS `add_virtual_product_columns`;
DELIMITER $$
CREATE PROCEDURE `add_virtual_product_columns`()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'product_type') THEN
        ALTER TABLE `products` ADD COLUMN `product_type` VARCHAR(20) DEFAULT 'physical' COMMENT '商品类型: physical-普通商品, virtual-虚拟商品';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'virtual_delivery_type') THEN
        ALTER TABLE `products` ADD COLUMN `virtual_delivery_type` VARCHAR(20) DEFAULT NULL COMMENT '虚拟发货方式: none-无需发货, card_key-卡密发货, resource_link-网盘资源';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'card_key_template') THEN
        ALTER TABLE `products` ADD COLUMN `card_key_template` TEXT DEFAULT NULL COMMENT '卡密模板说明';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'resource_link_template') THEN
        ALTER TABLE `products` ADD COLUMN `resource_link_template` TEXT DEFAULT NULL COMMENT '资源链接模板';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'virtual_content_encrypt') THEN
        ALTER TABLE `products` ADD COLUMN `virtual_content_encrypt` TINYINT(1) DEFAULT 0 COMMENT '虚拟内容是否加密显示';
    END IF;
END$$
DELIMITER ;
CALL `add_virtual_product_columns`();
DROP PROCEDURE IF EXISTS `add_virtual_product_columns`;

-- -----------------------------------------------
-- 2. orders表新增虚拟订单字段
-- -----------------------------------------------
DROP PROCEDURE IF EXISTS `add_virtual_order_columns`;
DELIMITER $$
CREATE PROCEDURE `add_virtual_order_columns`()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'order_product_type') THEN
        ALTER TABLE `orders` ADD COLUMN `order_product_type` VARCHAR(20) DEFAULT 'physical' COMMENT '订单商品类型: physical-普通, virtual-虚拟, mixed-混合';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'completion_source') THEN
        ALTER TABLE `orders` ADD COLUMN `completion_source` VARCHAR(30) DEFAULT NULL COMMENT '完成来源: audit_auto_complete/virtual_delivery/logistics_delivery';
    END IF;
END$$
DELIMITER ;
CALL `add_virtual_order_columns`();
DROP PROCEDURE IF EXISTS `add_virtual_order_columns`;

-- -----------------------------------------------
-- 3. 卡密库存表
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS `card_key_inventory` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(36) NOT NULL COMMENT '关联商品ID',
  `card_key` VARCHAR(255) NOT NULL COMMENT '卡密编码',
  `status` VARCHAR(20) DEFAULT 'unused' COMMENT '状态: unused-未使用, reserved-已预占, used-已使用, claimed-已领取, expired-已过期, voided-已作废',
  `order_id` VARCHAR(36) DEFAULT NULL COMMENT '关联订单ID（发货后填充）',
  `reserved_order_id` VARCHAR(36) DEFAULT NULL COMMENT '预占订单ID（下单时填充）',
  `claim_token` VARCHAR(100) DEFAULT NULL COMMENT '客户领取令牌',
  `claim_method` VARCHAR(20) DEFAULT NULL COMMENT '领取方式: customer_self/member_send/email_send',
  `claimed_at` DATETIME DEFAULT NULL COMMENT '客户领取时间',
  `usage_instructions` TEXT DEFAULT NULL COMMENT '使用说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tenant_card_key` (`tenant_id`, `card_key`),
  KEY `idx_product_status` (`product_id`, `status`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_claim_token` (`claim_token`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='卡密库存表';

-- -----------------------------------------------
-- 4. 网盘资源库存表
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS `resource_inventory` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(36) NOT NULL COMMENT '关联商品ID',
  `resource_link` VARCHAR(500) NOT NULL COMMENT '资源链接',
  `resource_password` VARCHAR(100) DEFAULT NULL COMMENT '提取码',
  `resource_description` TEXT DEFAULT NULL COMMENT '资源说明',
  `status` VARCHAR(20) DEFAULT 'unused' COMMENT '状态: unused/reserved/used/claimed/expired/voided',
  `order_id` VARCHAR(36) DEFAULT NULL COMMENT '关联订单ID',
  `reserved_order_id` VARCHAR(36) DEFAULT NULL COMMENT '预占订单ID',
  `claim_token` VARCHAR(100) DEFAULT NULL COMMENT '客户领取令牌',
  `claim_method` VARCHAR(20) DEFAULT NULL COMMENT '领取方式',
  `claimed_at` DATETIME DEFAULT NULL COMMENT '客户领取时间',
  `usage_instructions` TEXT DEFAULT NULL COMMENT '使用说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_status` (`product_id`, `status`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_claim_token` (`claim_token`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网盘资源库存表';

-- -----------------------------------------------
-- 5. 虚拟商品发货记录表
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS `virtual_delivery_records` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `order_id` VARCHAR(36) NOT NULL COMMENT '订单ID',
  `delivery_type` VARCHAR(20) NOT NULL COMMENT '发货类型: none/card_key/resource_link',
  `card_key_content` TEXT DEFAULT NULL COMMENT '卡密内容',
  `resource_link` VARCHAR(500) DEFAULT NULL COMMENT '资源链接',
  `resource_password` VARCHAR(100) DEFAULT NULL COMMENT '提取码',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `operator_id` VARCHAR(36) NOT NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
  `delivered_at` DATETIME NOT NULL COMMENT '发货时间',
  `email_sent` TINYINT(1) DEFAULT 0 COMMENT '是否已发送邮件',
  `email_sent_at` DATETIME DEFAULT NULL COMMENT '邮件发送时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='虚拟商品发货记录表';

-- -----------------------------------------------
-- 6. 虚拟商品领取配置表
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS `virtual_claim_settings` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `delivery_mode` VARCHAR(20) DEFAULT 'link' COMMENT '发货方式: link/manual',
  `claim_link_expiry_days` INT DEFAULT 30 COMMENT '领取链接有效天数',
  `login_methods` VARCHAR(50) DEFAULT 'password' COMMENT '登录方式: sms/password/sms,password',
  `initial_password` VARCHAR(255) DEFAULT '123456' COMMENT '初始登录密码',
  `claim_page_notice` TEXT DEFAULT NULL COMMENT '领取页面提示语',
  `email_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否开启邮件发送',
  `email_source` VARCHAR(20) DEFAULT 'official' COMMENT '邮箱来源: official/custom',
  `email_content_mode` VARCHAR(20) DEFAULT 'link' COMMENT '邮件模式: link/content/both',
  `email_auto_send` TINYINT(1) DEFAULT 0 COMMENT '自动发送邮件',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='虚拟商品领取配置表';

-- -----------------------------------------------
-- 7. 租户自定义邮箱配置表
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS `tenant_email_config` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `smtp_host` VARCHAR(200) NOT NULL COMMENT 'SMTP服务器',
  `smtp_port` INT DEFAULT 465 COMMENT 'SMTP端口',
  `encryption` VARCHAR(10) DEFAULT 'ssl' COMMENT '加密方式: ssl/tls/none',
  `sender_email` VARCHAR(200) NOT NULL COMMENT '发件邮箱',
  `sender_password` VARCHAR(500) NOT NULL COMMENT '邮箱密码（加密存储）',
  `sender_name` VARCHAR(100) DEFAULT '' COMMENT '发件人名称',
  `is_verified` TINYINT(1) DEFAULT 0 COMMENT '是否已验证',
  `verified_at` DATETIME DEFAULT NULL COMMENT '验证时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户自定义邮箱配置表';

-- =============================================
-- 迁移完成
-- =============================================
SELECT 'v1.8.0 虚拟商品功能数据库迁移完成！' AS message;
