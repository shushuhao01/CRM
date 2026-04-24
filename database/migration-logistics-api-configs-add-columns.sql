-- =============================================
-- CRM系统 - logistics_api_configs 表新增 support_create_order 字段
-- 适用于：MySQL 8.0+ / phpMyAdmin
-- 日期：2026-04-08
-- 说明：修复 "Unknown column 'support_create_order'" 报错
--       该字段用于标记物流公司是否支持自动生成运单号
-- =============================================

SET NAMES utf8mb4;

-- 安全添加字段（IF NOT EXISTS 需要 MySQL 8.0.30+）
-- 如果你的 MySQL 版本低于 8.0.30，请先检查字段是否存在再执行

-- 添加 support_create_order 字段
ALTER TABLE `logistics_api_configs`
  ADD COLUMN IF NOT EXISTS `support_create_order` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '是否支持下单生成运单号: 0=仅查询, 1=支持下单'
  AFTER `extra_config`;

-- 如果上面语法报错（低版本MySQL不支持 IF NOT EXISTS），使用下面的安全写法：
-- 先检查字段是否存在
-- SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
--   WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME = 'logistics_api_configs'
--   AND COLUMN_NAME = 'support_create_order');
-- SET @sql = IF(@column_exists = 0,
--   'ALTER TABLE `logistics_api_configs` ADD COLUMN `support_create_order` TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否支持下单生成运单号: 0=仅查询, 1=支持下单'' AFTER `extra_config`',
--   'SELECT ''Column already exists''');
-- PREPARE stmt FROM @sql;
-- EXECUTE stmt;
-- DEALLOCATE PREPARE stmt;

