-- =============================================
-- 迁移：微信小程序客户自助填写功能 - 数据库字段迁移
-- 版本：v1.8.0
-- 日期：2026-05-01
-- 兼容：MySQL 5.7+ / phpMyAdmin / 宝塔面板
-- 说明：为 wecom_suite_configs 表添加小程序配置字段
--       mp_app_id, mp_app_secret, mp_form_secret, mp_enabled, mp_config
-- 注意：此脚本可安全重复执行（幂等），已存在的列会自动跳过
-- =============================================

-- ── 1. 添加 mp_app_id 字段 ──
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'wecom_suite_configs'
    AND COLUMN_NAME = 'mp_app_id');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_app_id` VARCHAR(50) DEFAULT NULL COMMENT ''关联的微信小程序AppID'' AFTER `is_enabled`',
  'SELECT ''Column mp_app_id already exists, skipped.'' AS result');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 2. 添加 mp_app_secret 字段 ──
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'wecom_suite_configs'
    AND COLUMN_NAME = 'mp_app_secret');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_app_secret` VARCHAR(255) DEFAULT NULL COMMENT ''微信小程序AppSecret(加密存储)'' AFTER `mp_app_id`',
  'SELECT ''Column mp_app_secret already exists, skipped.'' AS result');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 3. 添加 mp_form_secret 字段 ──
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'wecom_suite_configs'
    AND COLUMN_NAME = 'mp_form_secret');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_form_secret` VARCHAR(100) DEFAULT NULL COMMENT ''表单签名密钥'' AFTER `mp_app_secret`',
  'SELECT ''Column mp_form_secret already exists, skipped.'' AS result');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 4. 添加 mp_enabled 字段 ──
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'wecom_suite_configs'
    AND COLUMN_NAME = 'mp_enabled');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_enabled` TINYINT(1) DEFAULT 0 COMMENT ''是否启用小程序资料收集'' AFTER `mp_form_secret`',
  'SELECT ''Column mp_enabled already exists, skipped.'' AS result');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 5. 添加 mp_config 字段 ──
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'wecom_suite_configs'
    AND COLUMN_NAME = 'mp_config');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `wecom_suite_configs` ADD COLUMN `mp_config` TEXT DEFAULT NULL COMMENT ''小程序扩展配置(JSON)'' AFTER `mp_enabled`',
  'SELECT ''Column mp_config already exists, skipped.'' AS result');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 6. 验证迁移结果 ──
SELECT
  COLUMN_NAME AS '字段名',
  COLUMN_TYPE AS '类型',
  IS_NULLABLE AS '允许NULL',
  COLUMN_DEFAULT AS '默认值',
  COLUMN_COMMENT AS '注释'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'wecom_suite_configs'
  AND COLUMN_NAME LIKE 'mp_%'
ORDER BY ORDINAL_POSITION;

-- =============================================
-- 迁移完成！
-- 如果上面查询返回5行（mp_app_id, mp_app_secret, mp_form_secret, mp_enabled, mp_config），
-- 说明迁移成功。
-- =============================================
