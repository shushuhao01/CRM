-- =============================================
-- CRM 多租户改造 - 生产环境安全 SQL 脚本
-- 生成时间：2026-03-29
-- 兼容：MySQL 8.0+ / phpMyAdmin / 宝塔面板
-- 特性：幂等安全，已存在的列/索引自动跳过
--       无存储过程，使用 PREPARE/EXECUTE
-- =============================================

SET NAMES utf8mb4;

-- ▶ after_sales_services
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'after_sales_services') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'after_sales_services' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `after_sales_services` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'after_sales_services') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'after_sales_services' AND INDEX_NAME = 'idx_after_sales_services_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `after_sales_services` ADD INDEX `idx_after_sales_services_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ announcement_reads
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcement_reads') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcement_reads' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `announcement_reads` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcement_reads') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'announcement_reads' AND INDEX_NAME = 'idx_announcement_reads_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `announcement_reads` ADD INDEX `idx_announcement_reads_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ call_records
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `call_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND INDEX_NAME = 'idx_call_records_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `call_records` ADD INDEX `idx_call_records_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ commission_ladder
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_ladder') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_ladder' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `commission_ladder` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_ladder') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_ladder' AND INDEX_NAME = 'idx_commission_ladder_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `commission_ladder` ADD INDEX `idx_commission_ladder_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ commission_setting
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_setting') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_setting' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `commission_setting` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_setting') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commission_setting' AND INDEX_NAME = 'idx_commission_setting_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `commission_setting` ADD INDEX `idx_commission_setting_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ customer_assignments
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_assignments') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_assignments' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `customer_assignments` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_assignments') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_assignments' AND INDEX_NAME = 'idx_customer_assignments_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `customer_assignments` ADD INDEX `idx_customer_assignments_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ customer_groups
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_groups') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_groups' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `customer_groups` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_groups') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_groups' AND INDEX_NAME = 'idx_customer_groups_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `customer_groups` ADD INDEX `idx_customer_groups_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ customer_shares
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_shares') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_shares' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `customer_shares` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_shares') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_shares' AND INDEX_NAME = 'idx_customer_shares_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `customer_shares` ADD INDEX `idx_customer_shares_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ customer_tags
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_tags') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_tags' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `customer_tags` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_tags') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_tags' AND INDEX_NAME = 'idx_customer_tags_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `customer_tags` ADD INDEX `idx_customer_tags_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ data_records
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'data_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'data_records' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `data_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'data_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'data_records' AND INDEX_NAME = 'idx_data_records_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `data_records` ADD INDEX `idx_data_records_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ department_subscription_configs
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_subscription_configs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_subscription_configs' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `department_subscription_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_subscription_configs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'department_subscription_configs' AND INDEX_NAME = 'idx_department_subscription_configs_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `department_subscription_configs` ADD INDEX `idx_department_subscription_configs_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ departments
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `departments` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND INDEX_NAME = 'idx_departments_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `departments` ADD INDEX `idx_departments_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ device_bindlogs
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'device_bindlogs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'device_bindlogs' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `device_bindlogs` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'device_bindlogs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'device_bindlogs' AND INDEX_NAME = 'idx_device_bindlogs_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `device_bindlogs` ADD INDEX `idx_device_bindlogs_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ follow_up_records
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'follow_up_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'follow_up_records' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `follow_up_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'follow_up_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'follow_up_records' AND INDEX_NAME = 'idx_follow_up_records_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `follow_up_records` ADD INDEX `idx_follow_up_records_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ logistics
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics' AND INDEX_NAME = 'idx_logistics_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics` ADD INDEX `idx_logistics_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ logistics_exceptions
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_exceptions') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_exceptions' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics_exceptions` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_exceptions') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_exceptions' AND INDEX_NAME = 'idx_logistics_exceptions_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics_exceptions` ADD INDEX `idx_logistics_exceptions_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ logistics_status
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics_status` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status' AND INDEX_NAME = 'idx_logistics_status_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics_status` ADD INDEX `idx_logistics_status_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ logistics_status_history
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status_history') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status_history' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics_status_history` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status_history') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_status_history' AND INDEX_NAME = 'idx_logistics_status_history_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics_status_history` ADD INDEX `idx_logistics_status_history_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ logistics_todos
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_todos') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_todos' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics_todos` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_todos') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_todos' AND INDEX_NAME = 'idx_logistics_todos_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics_todos` ADD INDEX `idx_logistics_todos_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ logistics_traces
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_traces') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_traces' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics_traces` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_traces') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_traces' AND INDEX_NAME = 'idx_logistics_traces_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics_traces` ADD INDEX `idx_logistics_traces_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ logistics_tracking
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_tracking') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_tracking' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics_tracking` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_tracking') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logistics_tracking' AND INDEX_NAME = 'idx_logistics_tracking_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logistics_tracking` ADD INDEX `idx_logistics_tracking_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ logs
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logs' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logs` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'logs' AND INDEX_NAME = 'idx_logs_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `logs` ADD INDEX `idx_logs_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ message_read_status
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_read_status') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_read_status' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `message_read_status` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_read_status') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_read_status' AND INDEX_NAME = 'idx_message_read_status_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `message_read_status` ADD INDEX `idx_message_read_status_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ message_subscriptions
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_subscriptions') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_subscriptions' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `message_subscriptions` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_subscriptions') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'message_subscriptions' AND INDEX_NAME = 'idx_message_subscriptions_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `message_subscriptions` ADD INDEX `idx_message_subscriptions_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ messages
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `messages` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND INDEX_NAME = 'idx_messages_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `messages` ADD INDEX `idx_messages_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ notification_channels
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_channels') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_channels' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `notification_channels` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_channels') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_channels' AND INDEX_NAME = 'idx_notification_channels_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `notification_channels` ADD INDEX `idx_notification_channels_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ notification_logs
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_logs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_logs' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `notification_logs` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_logs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_logs' AND INDEX_NAME = 'idx_notification_logs_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `notification_logs` ADD INDEX `idx_notification_logs_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ notification_templates
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_templates') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_templates' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `notification_templates` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_templates') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_templates' AND INDEX_NAME = 'idx_notification_templates_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `notification_templates` ADD INDEX `idx_notification_templates_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ notifications
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `notifications` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND INDEX_NAME = 'idx_notifications_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `notifications` ADD INDEX `idx_notifications_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ operation_logs
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operation_logs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operation_logs' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `operation_logs` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operation_logs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operation_logs' AND INDEX_NAME = 'idx_operation_logs_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `operation_logs` ADD INDEX `idx_operation_logs_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ order_audits
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_audits') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_audits' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `order_audits` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_audits') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_audits' AND INDEX_NAME = 'idx_order_audits_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `order_audits` ADD INDEX `idx_order_audits_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ order_field_configs
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_field_configs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_field_configs' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `order_field_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_field_configs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_field_configs' AND INDEX_NAME = 'idx_order_field_configs_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `order_field_configs` ADD INDEX `idx_order_field_configs_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ order_items
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `order_items` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND INDEX_NAME = 'idx_order_items_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `order_items` ADD INDEX `idx_order_items_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ order_status_history
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_status_history') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_status_history' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `order_status_history` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_status_history') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_status_history' AND INDEX_NAME = 'idx_order_status_history_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `order_status_history` ADD INDEX `idx_order_status_history_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ performance_config
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_config') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_config' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_config` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_config') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_config' AND INDEX_NAME = 'idx_performance_config_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_config` ADD INDEX `idx_performance_config_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ performance_metrics
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_metrics') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_metrics' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_metrics` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_metrics') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_metrics' AND INDEX_NAME = 'idx_performance_metrics_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_metrics` ADD INDEX `idx_performance_metrics_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ performance_records
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_records' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_records' AND INDEX_NAME = 'idx_performance_records_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_records` ADD INDEX `idx_performance_records_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ performance_report_configs
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_configs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_configs' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_report_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_configs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_configs' AND INDEX_NAME = 'idx_performance_report_configs_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_report_configs` ADD INDEX `idx_performance_report_configs_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ performance_report_logs
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_logs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_logs' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_report_logs` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_logs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_report_logs' AND INDEX_NAME = 'idx_performance_report_logs_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_report_logs` ADD INDEX `idx_performance_report_logs_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ performance_share_members
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_share_members') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_share_members' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_share_members` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_share_members') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_share_members' AND INDEX_NAME = 'idx_performance_share_members_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_share_members` ADD INDEX `idx_performance_share_members_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ performance_shares
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_shares') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_shares' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_shares` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_shares') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'performance_shares' AND INDEX_NAME = 'idx_performance_shares_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `performance_shares` ADD INDEX `idx_performance_shares_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ permissions
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `permissions` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions' AND INDEX_NAME = 'idx_permissions_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `permissions` ADD INDEX `idx_permissions_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ product_categories
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_categories') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_categories' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `product_categories` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_categories') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_categories' AND INDEX_NAME = 'idx_product_categories_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `product_categories` ADD INDEX `idx_product_categories_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ products
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `products` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'idx_products_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `products` ADD INDEX `idx_products_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ roles
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `roles` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND INDEX_NAME = 'idx_roles_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `roles` ADD INDEX `idx_roles_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ service_follow_up_records
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_follow_up_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_follow_up_records' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `service_follow_up_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_follow_up_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_follow_up_records' AND INDEX_NAME = 'idx_service_follow_up_records_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `service_follow_up_records` ADD INDEX `idx_service_follow_up_records_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ service_operation_logs
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_operation_logs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_operation_logs' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `service_operation_logs` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_operation_logs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_operation_logs' AND INDEX_NAME = 'idx_service_operation_logs_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `service_operation_logs` ADD INDEX `idx_service_operation_logs_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ service_records
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_records' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `service_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_records' AND INDEX_NAME = 'idx_service_records_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `service_records` ADD INDEX `idx_service_records_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ sms_records
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `sms_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records' AND INDEX_NAME = 'idx_sms_records_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `sms_records` ADD INDEX `idx_sms_records_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ sms_templates
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_templates') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_templates' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `sms_templates` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_templates') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_templates' AND INDEX_NAME = 'idx_sms_templates_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `sms_templates` ADD INDEX `idx_sms_templates_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ system_announcements
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_announcements') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_announcements' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `system_announcements` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_announcements') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_announcements' AND INDEX_NAME = 'idx_system_announcements_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `system_announcements` ADD INDEX `idx_system_announcements_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ system_messages
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_messages') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_messages' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `system_messages` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_messages') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_messages' AND INDEX_NAME = 'idx_system_messages_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `system_messages` ADD INDEX `idx_system_messages_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ system_settings
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_settings') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_settings' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `system_settings` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_settings') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_settings' AND INDEX_NAME = 'idx_system_settings_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `system_settings` ADD INDEX `idx_system_settings_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ user_permissions
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_permissions') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_permissions' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `user_permissions` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_permissions') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_permissions' AND INDEX_NAME = 'idx_user_permissions_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `user_permissions` ADD INDEX `idx_user_permissions_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ wechat_official_account_config
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wechat_official_account_config') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wechat_official_account_config' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wechat_official_account_config` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wechat_official_account_config') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wechat_official_account_config' AND INDEX_NAME = 'idx_wechat_official_account_config_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wechat_official_account_config` ADD INDEX `idx_wechat_official_account_config_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ wecom_acquisition_links
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_acquisition_links') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_acquisition_links' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_acquisition_links` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_acquisition_links') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_acquisition_links' AND INDEX_NAME = 'idx_wecom_acquisition_links_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_acquisition_links` ADD INDEX `idx_wecom_acquisition_links_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ wecom_chat_records
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_chat_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_chat_records' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_chat_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_chat_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_chat_records' AND INDEX_NAME = 'idx_wecom_chat_records_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_chat_records` ADD INDEX `idx_wecom_chat_records_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ wecom_configs
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_configs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_configs' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_configs` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_configs') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_configs' AND INDEX_NAME = 'idx_wecom_configs_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_configs` ADD INDEX `idx_wecom_configs_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ wecom_customers
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_customers') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_customers' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_customers` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_customers') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_customers' AND INDEX_NAME = 'idx_wecom_customers_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_customers` ADD INDEX `idx_wecom_customers_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ wecom_payment_records
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_payment_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_payment_records' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_payment_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_payment_records') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_payment_records' AND INDEX_NAME = 'idx_wecom_payment_records_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_payment_records` ADD INDEX `idx_wecom_payment_records_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ wecom_service_accounts
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_service_accounts') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_service_accounts' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_service_accounts` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_service_accounts') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_service_accounts' AND INDEX_NAME = 'idx_wecom_service_accounts_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_service_accounts` ADD INDEX `idx_wecom_service_accounts_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ wecom_user_bindings
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_user_bindings') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_user_bindings' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_user_bindings` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_user_bindings') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_user_bindings' AND INDEX_NAME = 'idx_wecom_user_bindings_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `wecom_user_bindings` ADD INDEX `idx_wecom_user_bindings_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ role_permissions
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permissions') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permissions' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `role_permissions` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `roleId`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permissions') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permissions' AND INDEX_NAME = 'idx_role_permissions_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `role_permissions` ADD INDEX `idx_role_permissions_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ permissions_closure
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions_closure') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions_closure' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `permissions_closure` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id_ancestor`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions_closure') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions_closure' AND INDEX_NAME = 'idx_permissions_closure_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `permissions_closure` ADD INDEX `idx_permissions_closure_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ▶ cod_cancel_applications（生产环境有此表但schema.sql中缺失）
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cod_cancel_applications') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cod_cancel_applications' AND COLUMN_NAME = 'tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `cod_cancel_applications` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cod_cancel_applications') = 0
  OR (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cod_cancel_applications' AND INDEX_NAME = 'idx_cod_cancel_applications_tenant_id') > 0,
  'SELECT 1',
  'ALTER TABLE `cod_cancel_applications` ADD INDEX `idx_cod_cancel_applications_tenant_id` (`tenant_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- 完成！共处理 65 张表（已存在的自动跳过）
-- =============================================