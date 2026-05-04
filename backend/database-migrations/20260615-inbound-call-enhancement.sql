-- =============================================
-- 呼入功能增强 - 数据库迁移脚本
-- 版本: 1.8.0
-- 日期: 2026-06-15
-- 兼容: MySQL 5.7+ / phpMyAdmin
-- 说明: 为CRM呼入功能新增坐席状态字段、通话记录增强字段、呼入路由配置表
-- =============================================

-- =============================================
-- 1. users 表新增坐席状态字段
-- =============================================

-- 1.1 坐席状态字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'agent_status');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `agent_status` VARCHAR(20) DEFAULT ''ready'' COMMENT ''坐席状态：ready-就绪，busy-忙碌，offline-离线''',
  'SELECT ''Column agent_status already exists in users''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.2 坐席状态变更时间
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status_changed_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `status_changed_at` DATETIME NULL COMMENT ''坐席状态变更时间''',
  'SELECT ''Column status_changed_at already exists in users''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.3 坐席状态变更原因
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status_reason');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `status_reason` VARCHAR(200) NULL COMMENT ''坐席状态变更原因''',
  'SELECT ''Column status_reason already exists in users''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================
-- 2. call_records 表新增呼入增强字段
-- =============================================

-- 2.1 呼叫方向
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'call_direction');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `call_records` ADD COLUMN `call_direction` VARCHAR(10) DEFAULT NULL COMMENT ''呼叫方向：in-呼入，out-呼出''',
  'SELECT ''Column call_direction already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.2 振铃时长
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'ring_duration');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `call_records` ADD COLUMN `ring_duration` INT DEFAULT 0 COMMENT ''振铃时长(秒)''',
  'SELECT ''Column ring_duration already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.3 排队等待时长
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'queue_time');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `call_records` ADD COLUMN `queue_time` INT DEFAULT 0 COMMENT ''排队等待时长(秒)''',
  'SELECT ''Column queue_time already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.4 转接来源坐席ID
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'transfer_from');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `call_records` ADD COLUMN `transfer_from` VARCHAR(100) DEFAULT NULL COMMENT ''转接来源坐席ID''',
  'SELECT ''Column transfer_from already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.5 转接目标坐席ID
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'transfer_to');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `call_records` ADD COLUMN `transfer_to` VARCHAR(100) DEFAULT NULL COMMENT ''转接目标坐席ID''',
  'SELECT ''Column transfer_to already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.6 呼入路由ID
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'inbound_route_id');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `call_records` ADD COLUMN `inbound_route_id` VARCHAR(50) DEFAULT NULL COMMENT ''呼入路由ID''',
  'SELECT ''Column inbound_route_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.7 呼入来源
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'inbound_source');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `call_records` ADD COLUMN `inbound_source` VARCHAR(50) DEFAULT NULL COMMENT ''呼入来源：sip-SIP分机，mobile-工作手机，voip-网络电话，pbx-PBX系统''',
  'SELECT ''Column inbound_source already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.8 新增索引（忽略重复索引错误）
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND INDEX_NAME = 'idx_call_direction');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `call_records` ADD INDEX `idx_call_direction` (`call_direction`)',
  'SELECT ''Index idx_call_direction already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND INDEX_NAME = 'idx_inbound_route_id');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `call_records` ADD INDEX `idx_inbound_route_id` (`inbound_route_id`)',
  'SELECT ''Index idx_inbound_route_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND INDEX_NAME = 'idx_inbound_source');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `call_records` ADD INDEX `idx_inbound_source` (`inbound_source`)',
  'SELECT ''Index idx_inbound_source already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.9 回填已有呼入记录的 call_direction 字段
UPDATE `call_records` SET `call_direction` = 'in' WHERE `call_type` = 'inbound' AND `call_direction` IS NULL;
UPDATE `call_records` SET `call_direction` = 'out' WHERE `call_type` = 'outbound' AND `call_direction` IS NULL;

-- =============================================
-- 3. 创建呼入路由配置表
-- =============================================
CREATE TABLE IF NOT EXISTS `inbound_routes` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '路由ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '路由名称',
  `description` VARCHAR(500) NULL COMMENT '路由描述',
  `did_number` VARCHAR(20) NOT NULL COMMENT 'DID号码/被叫号码',
  `route_type` VARCHAR(20) DEFAULT 'direct' COMMENT '路由类型：direct-直接分配，queue-排队分配，ivr-IVR转接，ring_group-振铃组',
  `target_user_id` VARCHAR(100) NULL COMMENT '目标坐席ID（direct模式）',
  `target_group` JSON NULL COMMENT '振铃组成员（ring_group模式，JSON数组）',
  `queue_strategy` VARCHAR(20) DEFAULT 'round_robin' COMMENT '排队策略：round_robin-轮询，least_calls-最少通话，random-随机，priority-优先级',
  `max_wait_time` INT DEFAULT 60 COMMENT '最大等待时间(秒)',
  `overflow_action` VARCHAR(20) DEFAULT 'voicemail' COMMENT '溢出动作：voicemail-语音留言，transfer-转接，hangup-挂断',
  `overflow_target` VARCHAR(100) NULL COMMENT '溢出转接目标',
  `welcome_message` VARCHAR(500) NULL COMMENT '欢迎语/IVR提示语',
  `business_hours` JSON NULL COMMENT '工作时间配置（JSON格式）',
  `after_hours_action` VARCHAR(20) DEFAULT 'voicemail' COMMENT '非工作时间动作',
  `priority` INT DEFAULT 0 COMMENT '路由优先级（越大越优先）',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `created_by` VARCHAR(100) NULL COMMENT '创建者',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_inbound_routes_tenant` (`tenant_id`),
  INDEX `idx_inbound_routes_did` (`did_number`),
  INDEX `idx_inbound_routes_enabled` (`is_enabled`),
  UNIQUE INDEX `uk_tenant_did` (`tenant_id`, `did_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='呼入路由配置表';

-- =============================================
-- 迁移完成
-- =============================================
-- 验证：
-- SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'agent_status';
-- SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'inbound_source';
-- SHOW TABLES LIKE 'inbound_routes';
