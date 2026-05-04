-- ============================================================
-- 小程序客户资料收集功能 - 数据库迁移SQL
-- 兼容: MySQL 5.7+ / 8.0 / phpMyAdmin 4.5+
-- 说明: 所有ALTER TABLE使用条件判断，列已存在时自动跳过
-- 执行前请先备份数据库
-- ============================================================

SET NAMES utf8mb4;

-- -------------------------------------------------------
-- 1. wecom_suite_configs 表：新增小程序相关字段
--    (列已存在则跳过，幂等可重复执行)
-- -------------------------------------------------------

-- 1.1 小程序 AppID
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME = 'mp_app_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_app_id` VARCHAR(50) DEFAULT NULL COMMENT ''关联的微信小程序AppID''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.2 小程序 AppSecret
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME = 'mp_app_secret');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_app_secret` VARCHAR(255) DEFAULT NULL COMMENT ''微信小程序AppSecret(加密存储)''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.3 表单签名密钥
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME = 'mp_form_secret');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_form_secret` VARCHAR(100) DEFAULT NULL COMMENT ''表单签名密钥''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.4 是否启用小程序
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME = 'mp_enabled');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_enabled` TINYINT(1) DEFAULT 0 COMMENT ''是否启用小程序资料收集''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.5 小程序扩展配置(JSON)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME = 'mp_config');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_config` TEXT DEFAULT NULL COMMENT ''小程序扩展配置(JSON)''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- -------------------------------------------------------
-- 2. tenant_settings 表：确保表存在
--    (此表使用 key-value 存储，不需要加字段)
--    小程序相关 settingKey:
--      - mp_card_title     : 卡片标题 (string)
--      - mp_card_cover_url : 卡片封面图URL (string)
--      - mp_poster_url     : 海报模板URL (string)
--      - mp_phone_quota    : 手机号获取额度 (json)
--      - mp_builtin_apps   : 内置应用启用配置 (json)
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenant_settings (
  id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NULL,
  setting_type VARCHAR(20) DEFAULT 'string',
  description VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tenant_setting (tenant_id, setting_key),
  KEY idx_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='租户个性化配置(key-value)';

-- -------------------------------------------------------
-- 3. 小程序表单提交记录表 (如需要)
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS mp_form_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
  member_id VARCHAR(36) NULL COMMENT '发送卡片的企微成员ID',
  external_user_id VARCHAR(100) NULL COMMENT '企微外部联系人ID',
  customer_name VARCHAR(100) NULL COMMENT '客户填写的姓名',
  customer_phone VARCHAR(20) NULL COMMENT '客户手机号',
  customer_gender VARCHAR(10) NULL COMMENT '性别',
  customer_age INT NULL COMMENT '年龄',
  province VARCHAR(50) NULL COMMENT '省',
  city VARCHAR(50) NULL COMMENT '市',
  district VARCHAR(50) NULL COMMENT '区',
  detail_address VARCHAR(500) NULL COMMENT '详细地址',
  custom_fields TEXT NULL COMMENT '自定义字段数据(JSON)',
  phone_source VARCHAR(20) DEFAULT 'manual' COMMENT '手机号来源: wechat_auth / manual',
  form_sign VARCHAR(64) NULL COMMENT '表单签名',
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  synced_to_crm TINYINT(1) DEFAULT 0 COMMENT '是否已同步到CRM',
  synced_at DATETIME NULL COMMENT '同步时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant (tenant_id),
  KEY idx_member (member_id),
  KEY idx_phone (customer_phone),
  KEY idx_submitted (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='小程序表单提交记录';

-- -------------------------------------------------------
-- 4. 小程序卡片发送记录表
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS mp_card_send_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
  member_id VARCHAR(36) NOT NULL COMMENT '发送者企微成员ID',
  external_user_id VARCHAR(100) NULL COMMENT '接收者外部联系人ID',
  card_title VARCHAR(200) NULL COMMENT '卡片标题',
  card_path VARCHAR(500) NULL COMMENT '小程序路径',
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  KEY idx_tenant (tenant_id),
  KEY idx_member (member_id),
  KEY idx_sent (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='小程序卡片发送日志';

-- -------------------------------------------------------
-- 完成
-- -------------------------------------------------------
SELECT '小程序相关数据库迁移SQL执行完成' AS result;
