-- 为 users 表添加坐席状态字段（兼容已存在的情况）
-- 适用于 MySQL 5.7+ / MariaDB 10.2+
-- 可直接在 phpMyAdmin 中执行

SET @dbname = DATABASE();

-- 添加 agent_status 列
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'users' AND COLUMN_NAME = 'agent_status') = 0,
  "ALTER TABLE `users` ADD COLUMN `agent_status` VARCHAR(20) DEFAULT 'ready' COMMENT '坐席状态：ready-就绪，busy-忙碌，offline-离线'",
  "SELECT 'agent_status column already exists'"
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 status_changed_at 列
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status_changed_at') = 0,
  "ALTER TABLE `users` ADD COLUMN `status_changed_at` DATETIME NULL COMMENT '坐席状态变更时间'",
  "SELECT 'status_changed_at column already exists'"
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 status_reason 列
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status_reason') = 0,
  "ALTER TABLE `users` ADD COLUMN `status_reason` VARCHAR(200) NULL COMMENT '坐席状态变更原因'",
  "SELECT 'status_reason column already exists'"
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
