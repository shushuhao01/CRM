-- =============================================
-- 迁移：为服务商应用配置表添加全局RSA私钥字段
-- 用途：第三方模式下，所有授权企业共用此服务商级别的RSA私钥解密会话存档消息
-- 日期：2026-04-29
-- 兼容：MySQL 5.7+ / phpMyAdmin
-- =============================================

-- 先检查列是否已存在，避免重复执行报错
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'wecom_suite_configs'
    AND COLUMN_NAME = 'chat_archive_rsa_private_key');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `wecom_suite_configs` ADD COLUMN `chat_archive_rsa_private_key` TEXT DEFAULT NULL COMMENT ''会话存档RSA私钥(服务商级别，所有授权企业共用)'' AFTER `permissions`',
  'SELECT ''Column chat_archive_rsa_private_key already exists, skipped.'' AS result');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
