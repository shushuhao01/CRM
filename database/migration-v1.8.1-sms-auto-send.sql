-- =============================================
-- 短信自动发送模块修复 - 生产环境增量迁移SQL
-- 日期: 2026-04-11
-- 版本: v1.8.1
-- 说明: 兼容phpMyAdmin执行, 幂等安全(可重复执行)
-- 修复内容:
--   1. 创建缺失的 sms_auto_send_rules 表
--   2. sms_records 表补充4个缺失字段
-- =============================================

SET NAMES utf8mb4;

-- =============================================
-- 1. 创建 sms_auto_send_rules 表
-- =============================================
CREATE TABLE IF NOT EXISTS `sms_auto_send_rules` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '规则ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '规则名称',
  `template_id` VARCHAR(50) NOT NULL COMMENT '关联模板ID',
  `template_name` VARCHAR(100) NULL COMMENT '模板名称',
  `trigger_event` VARCHAR(50) NOT NULL COMMENT '触发事件类型',
  `effective_departments` JSON NULL COMMENT '生效部门IDs',
  `time_range_config` JSON NULL COMMENT '时间范围配置',
  `enabled` TINYINT DEFAULT 1 COMMENT '是否启用',
  `created_by` VARCHAR(50) NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) NULL COMMENT '创建人姓名',
  `stats_sent_count` INT DEFAULT 0 COMMENT '发送成功总数',
  `stats_fail_count` INT DEFAULT 0 COMMENT '发送失败总数',
  `last_triggered_at` TIMESTAMP NULL COMMENT '最后触发时间',
  `description` TEXT NULL COMMENT '规则描述',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_sms_auto_send_rules_tenant_id` (`tenant_id`),
  INDEX `idx_sms_auto_send_rules_trigger_event` (`trigger_event`),
  INDEX `idx_sms_auto_send_rules_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信自动发送规则表';

-- =============================================
-- 2. sms_records 表补充缺失字段(安全方式)
-- =============================================

-- 2.1 添加 sender_user_id 字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records' AND COLUMN_NAME = 'sender_user_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `sms_records` ADD COLUMN `sender_user_id` VARCHAR(50) NULL COMMENT ''发送人用户ID'' AFTER `sender_phone`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2.2 添加 sender_department_id 字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records' AND COLUMN_NAME = 'sender_department_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `sms_records` ADD COLUMN `sender_department_id` VARCHAR(100) NULL COMMENT ''发送人部门ID'' AFTER `sender_user_id`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2.3 添加 trigger_source 字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records' AND COLUMN_NAME = 'trigger_source');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `sms_records` ADD COLUMN `trigger_source` VARCHAR(20) NULL DEFAULT ''manual'' COMMENT ''触发来源: manual/auto'' AFTER `sender_department_id`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2.4 添加 auto_rule_id 字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records' AND COLUMN_NAME = 'auto_rule_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `sms_records` ADD COLUMN `auto_rule_id` VARCHAR(50) NULL COMMENT ''自动发送规则ID'' AFTER `trigger_source`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- 3. 添加索引(安全方式)
-- =============================================

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records' AND INDEX_NAME = 'idx_sms_records_sender_user');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `sms_records` ADD INDEX `idx_sms_records_sender_user` (`sender_user_id`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records' AND INDEX_NAME = 'idx_sms_records_sender_dept');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `sms_records` ADD INDEX `idx_sms_records_sender_dept` (`sender_department_id`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_records' AND INDEX_NAME = 'idx_sms_records_auto_rule');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `sms_records` ADD INDEX `idx_sms_records_auto_rule` (`auto_rule_id`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

