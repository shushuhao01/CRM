-- =====================================================
-- 回收站功能 - 软删除支持
-- 创建时间: 2026-04-02
-- 用途: 为 licenses 和 tenants 表添加软删除字段
-- =====================================================

-- 1. licenses 表添加 deleted_at 字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'licenses' AND COLUMN_NAME = 'deleted_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `licenses` ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL COMMENT ''软删除时间'' AFTER `updated_at`',
  'SELECT ''licenses.deleted_at already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. licenses 表添加 deleted_by 字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'licenses' AND COLUMN_NAME = 'deleted_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `licenses` ADD COLUMN `deleted_by` VARCHAR(36) NULL DEFAULT NULL COMMENT ''删除操作人'' AFTER `deleted_at`',
  'SELECT ''licenses.deleted_by already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. tenants 表添加 deleted_at 字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'deleted_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `tenants` ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL COMMENT ''软删除时间'' AFTER `updated_at`',
  'SELECT ''tenants.deleted_at already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. tenants 表添加 deleted_by 字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'deleted_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `tenants` ADD COLUMN `deleted_by` VARCHAR(36) NULL DEFAULT NULL COMMENT ''删除操作人'' AFTER `deleted_at`',
  'SELECT ''tenants.deleted_by already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. 添加索引
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'licenses' AND INDEX_NAME = 'idx_licenses_deleted_at');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `licenses` ADD INDEX `idx_licenses_deleted_at` (`deleted_at`)',
  'SELECT ''idx_licenses_deleted_at already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND INDEX_NAME = 'idx_tenants_deleted_at');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `tenants` ADD INDEX `idx_tenants_deleted_at` (`deleted_at`)',
  'SELECT ''idx_tenants_deleted_at already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 验证
SELECT 'licenses' as table_name, COLUMN_NAME, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'licenses' AND COLUMN_NAME IN ('deleted_at', 'deleted_by')
UNION ALL
SELECT 'tenants' as table_name, COLUMN_NAME, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME IN ('deleted_at', 'deleted_by');

