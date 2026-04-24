-- ================================================================
-- 通话管理模块修复迁移 2026-04-09
-- 修复内容：
--   1. phone_blacklist UNIQUE(phone) → UNIQUE(phone, tenant_id)
--   2. global_call_config UNIQUE(config_key) → UNIQUE(config_key, tenant_id)
--   3. call_records 补充缺失字段 provider_call_id, hangup_cause
-- ================================================================

-- 1. 修复 phone_blacklist 唯一约束：改为租户级唯一
-- 先删除旧的全局唯一索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phone_blacklist' AND INDEX_NAME = 'idx_phone');
SET @sql = IF(@idx_exists > 0, 'ALTER TABLE `phone_blacklist` DROP INDEX `idx_phone`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 创建租户级唯一索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'phone_blacklist' AND INDEX_NAME = 'idx_phone_tenant');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `phone_blacklist` ADD UNIQUE INDEX `idx_phone_tenant` (`phone`, `tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. 修复 global_call_config 唯一约束：改为租户级唯一
-- 先删除旧的全局唯一索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'global_call_config' AND INDEX_NAME = 'config_key');
SET @sql = IF(@idx_exists > 0, 'ALTER TABLE `global_call_config` DROP INDEX `config_key`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 创建租户级唯一索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'global_call_config' AND INDEX_NAME = 'idx_config_key_tenant');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `global_call_config` ADD UNIQUE INDEX `idx_config_key_tenant` (`config_key`, `tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. call_records 补充缺失字段 provider_call_id
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'provider_call_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `call_records` ADD COLUMN `provider_call_id` VARCHAR(100) NULL COMMENT ''服务商通话ID'' AFTER `caller_number`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. call_records 补充缺失字段 hangup_cause
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'hangup_cause');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `call_records` ADD COLUMN `hangup_cause` VARCHAR(100) NULL COMMENT ''挂断原因'' AFTER `provider_call_id`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 完成
SELECT '通话管理模块修复迁移完成' AS result;

