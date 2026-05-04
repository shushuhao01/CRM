-- =====================================================
-- 微信小程序配置字段迁移脚本
-- 版本: v4.2.0
-- 日期: 2026-05-04
-- 说明: 为 wecom_suite_configs 表新增小程序相关配置字段
-- 兼容: MySQL 5.7+ / phpMyAdmin
-- =====================================================

-- 检查并添加 mp_app_id 字段
SET @db_name = DATABASE();
SET @tbl = 'wecom_suite_configs';

SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = @tbl AND COLUMN_NAME = 'mp_app_id';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_app_id` VARCHAR(50) DEFAULT NULL COMMENT ''关联的微信小程序AppID''',
  'SELECT ''mp_app_id already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 mp_app_secret 字段
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = @tbl AND COLUMN_NAME = 'mp_app_secret';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_app_secret` VARCHAR(255) DEFAULT NULL COMMENT ''微信小程序AppSecret(加密存储)''',
  'SELECT ''mp_app_secret already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 mp_form_secret 字段
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = @tbl AND COLUMN_NAME = 'mp_form_secret';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_form_secret` VARCHAR(100) DEFAULT NULL COMMENT ''表单签名密钥''',
  'SELECT ''mp_form_secret already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 mp_enabled 字段
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = @tbl AND COLUMN_NAME = 'mp_enabled';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_enabled` TINYINT(1) DEFAULT 0 COMMENT ''是否启用小程序资料收集''',
  'SELECT ''mp_enabled already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 mp_config 字段
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = @tbl AND COLUMN_NAME = 'mp_config';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_config` TEXT DEFAULT NULL COMMENT ''小程序扩展配置(JSON)''',
  'SELECT ''mp_config already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 验证结果
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME LIKE 'mp_%'
ORDER BY ORDINAL_POSITION;
