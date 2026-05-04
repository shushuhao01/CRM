-- ============================================================
-- 小程序客户资料收集功能 - 生产环境迁移SQL (phpMyAdmin兼容)
-- 兼容: MySQL 5.7+ / 8.0 / phpMyAdmin 4.5+
--
-- 使用方式:
--   phpMyAdmin → SQL 标签页 → 粘贴全部内容 → 点击「执行」
--   如遇 DELIMITER 问题, 请将下方"分隔符"(Delimiter)改为 $$
--
-- 说明: 使用存储过程实现条件ALTER TABLE，确保幂等无报错
-- 执行前请先备份数据库
-- ============================================================

SET NAMES utf8mb4;

-- -------------------------------------------------------
-- 第一步: 通过存储过程安全添加字段 (列存在则跳过)
-- -------------------------------------------------------

DROP PROCEDURE IF EXISTS `_mp_add_columns`;

DELIMITER $$

CREATE PROCEDURE `_mp_add_columns`()
BEGIN
  -- 1.1 mp_app_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME = 'mp_app_id'
  ) THEN
    ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_app_id` VARCHAR(50) DEFAULT NULL COMMENT '关联的微信小程序AppID';
  END IF;

  -- 1.2 mp_app_secret
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME = 'mp_app_secret'
  ) THEN
    ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_app_secret` VARCHAR(255) DEFAULT NULL COMMENT '微信小程序AppSecret(加密存储)';
  END IF;

  -- 1.3 mp_form_secret
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME = 'mp_form_secret'
  ) THEN
    ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_form_secret` VARCHAR(100) DEFAULT NULL COMMENT '表单签名密钥';
  END IF;

  -- 1.4 mp_enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME = 'mp_enabled'
  ) THEN
    ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否启用小程序资料收集';
  END IF;

  -- 1.5 mp_config
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME = 'mp_config'
  ) THEN
    ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_config` TEXT DEFAULT NULL COMMENT '小程序扩展配置(JSON)';
  END IF;
END$$

DELIMITER ;

-- 执行并清理
CALL `_mp_add_columns`();
DROP PROCEDURE IF EXISTS `_mp_add_columns`;

-- -------------------------------------------------------
-- 第二步: 创建新表 (IF NOT EXISTS，已存在则跳过)
-- -------------------------------------------------------

-- 租户配置表
CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id` VARCHAR(36) NOT NULL,
  `tenant_id` VARCHAR(36) NOT NULL,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NULL,
  `setting_type` VARCHAR(20) DEFAULT 'string',
  `description` VARCHAR(500) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_setting` (`tenant_id`, `setting_key`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='租户个性化配置(key-value)';

-- 小程序表单提交记录表
CREATE TABLE IF NOT EXISTS `mp_form_submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `member_id` VARCHAR(36) NULL COMMENT '发送卡片的企微成员ID',
  `external_user_id` VARCHAR(100) NULL COMMENT '企微外部联系人ID',
  `customer_name` VARCHAR(100) NULL COMMENT '客户填写的姓名',
  `customer_phone` VARCHAR(20) NULL COMMENT '客户手机号',
  `customer_gender` VARCHAR(10) NULL COMMENT '性别',
  `customer_age` INT NULL COMMENT '年龄',
  `province` VARCHAR(50) NULL COMMENT '省',
  `city` VARCHAR(50) NULL COMMENT '市',
  `district` VARCHAR(50) NULL COMMENT '区',
  `detail_address` VARCHAR(500) NULL COMMENT '详细地址',
  `custom_fields` TEXT NULL COMMENT '自定义字段数据(JSON)',
  `phone_source` VARCHAR(20) DEFAULT 'manual' COMMENT '手机号来源: wechat_auth / manual',
  `form_sign` VARCHAR(64) NULL COMMENT '表单签名',
  `submitted_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  `synced_to_crm` TINYINT(1) DEFAULT 0 COMMENT '是否已同步到CRM',
  `synced_at` DATETIME NULL COMMENT '同步时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_member` (`member_id`),
  KEY `idx_phone` (`customer_phone`),
  KEY `idx_submitted` (`submitted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='小程序表单提交记录';

-- 小程序卡片发送日志表
CREATE TABLE IF NOT EXISTS `mp_card_send_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `member_id` VARCHAR(36) NOT NULL COMMENT '发送者企微成员ID',
  `external_user_id` VARCHAR(100) NULL COMMENT '接收者外部联系人ID',
  `card_title` VARCHAR(200) NULL COMMENT '卡片标题',
  `card_path` VARCHAR(500) NULL COMMENT '小程序路径',
  `sent_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_member` (`member_id`),
  KEY `idx_sent` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='小程序卡片发送日志';

-- -------------------------------------------------------
-- 完成
-- -------------------------------------------------------
SELECT '小程序数据库迁移执行完成 ✓' AS result;
