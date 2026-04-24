-- ============================================
-- 订单设置租户数据隔离修复迁移脚本
-- 创建日期：2026-03-25
-- 说明：修复以下问题：
--   1. department_order_limits 表缺少 tenant_id 列（导致保存500错误）
--   2. payment_method_options 表添加 tenant_id 和 is_system 列，并更新唯一索引
--   3. system_configs 表唯一索引不含 tenant_id（导致不同租户配置冲突）
-- ============================================

-- =============================================
-- 1. 修复 department_order_limits 表
-- =============================================

-- 1.1 添加 tenant_id 列（如不存在）
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_order_limits' AND COLUMN_NAME = 'tenant_id';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `department_order_limits` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`',
  'SELECT ''tenant_id column already exists in department_order_limits'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.2 删除旧的 department_id 唯一索引
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_order_limits' AND INDEX_NAME = 'idx_department_id';

SET @sql = IF(@idx_exists > 0,
  'DROP INDEX `idx_department_id` ON `department_order_limits`',
  'SELECT ''idx_department_id not found, skipping'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.3 创建新的联合唯一索引 (tenant_id, department_id)
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_order_limits' AND INDEX_NAME = 'idx_tenant_department';

SET @sql = IF(@idx_exists = 0,
  'CREATE UNIQUE INDEX `idx_tenant_department` ON `department_order_limits`(`tenant_id`, `department_id`)',
  'SELECT ''idx_tenant_department already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.4 添加 tenant_id 索引
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_order_limits' AND INDEX_NAME = 'idx_dol_tenant_id';

SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_dol_tenant_id` ON `department_order_limits`(`tenant_id`)',
  'SELECT ''idx_dol_tenant_id already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- 2. 修复 payment_method_options 表
-- =============================================

-- 2.1 添加 tenant_id 列（如不存在，可能已由 phase2 脚本添加）
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_method_options' AND COLUMN_NAME = 'tenant_id';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `payment_method_options` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID（NULL表示全局预设）'' AFTER `id`',
  'SELECT ''tenant_id column already exists in payment_method_options'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2.2 添加 is_system 列（如不存在）
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_method_options' AND COLUMN_NAME = 'is_system';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `payment_method_options` ADD COLUMN `is_system` TINYINT(1) DEFAULT 0 COMMENT ''是否系统预设（不可删除）'' AFTER `is_enabled`',
  'SELECT ''is_system column already exists in payment_method_options'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2.3 将预设支付方式标记为系统预设
UPDATE `payment_method_options`
SET `is_system` = 1, `tenant_id` = NULL
WHERE `id` IN ('pm_wechat', 'pm_alipay', 'pm_bank', 'pm_unionpay', 'pm_cod', 'pm_other');

-- 2.4 删除旧的 value 唯一索引
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_method_options' AND INDEX_NAME = 'idx_value';

SET @sql = IF(@idx_exists > 0,
  'DROP INDEX `idx_value` ON `payment_method_options`',
  'SELECT ''idx_value not found, skipping'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2.5 创建新的联合唯一索引 (tenant_id, value)
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_method_options' AND INDEX_NAME = 'idx_tenant_value';

SET @sql = IF(@idx_exists = 0,
  'CREATE UNIQUE INDEX `idx_tenant_value` ON `payment_method_options`(`tenant_id`, `value`)',
  'SELECT ''idx_tenant_value already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- 3. 修复 system_configs 表唯一索引
-- =============================================

-- 3.1 确保 tenant_id 列存在
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_configs' AND COLUMN_NAME = 'tenant_id';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `system_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`',
  'SELECT ''tenant_id column already exists in system_configs'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3.2 删除旧的唯一索引 (configKey, configGroup)
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_configs' AND INDEX_NAME = 'idx_config_key_group';

SET @sql = IF(@idx_exists > 0,
  'DROP INDEX `idx_config_key_group` ON `system_configs`',
  'SELECT ''idx_config_key_group not found, skipping'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3.3 创建新的联合唯一索引 (tenant_id, configKey, configGroup)
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_configs' AND INDEX_NAME = 'idx_tenant_config_key_group';

SET @sql = IF(@idx_exists = 0,
  'CREATE UNIQUE INDEX `idx_tenant_config_key_group` ON `system_configs`(`tenant_id`, `configKey`, `configGroup`)',
  'SELECT ''idx_tenant_config_key_group already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3.4 确保 tenant_id 索引存在
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_configs' AND INDEX_NAME = 'idx_system_configs_tenant_id';

SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_system_configs_tenant_id` ON `system_configs`(`tenant_id`)',
  'SELECT ''idx_system_configs_tenant_id already exists'' AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- 验证修复结果
-- =============================================
SELECT 'department_order_limits' AS table_name, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_order_limits' AND COLUMN_NAME = 'tenant_id';

SELECT 'payment_method_options' AS table_name, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_method_options' AND COLUMN_NAME IN ('tenant_id', 'is_system');

SELECT 'system_configs' AS table_name, INDEX_NAME, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_configs' AND INDEX_NAME LIKE '%tenant%';

SELECT '✅ 订单设置租户数据隔离修复完成' AS result;

