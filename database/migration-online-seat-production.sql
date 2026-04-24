-- ============================================================
-- 在线席位制（Online Seats）生产环境迁移脚本
-- 日期：2026-04-23
-- 兼容：MySQL 5.7+ / MariaDB 10.x / phpMyAdmin
-- 说明：逐条执行，已存在的列会报 Duplicate column 错误可忽略
-- ============================================================

-- 1. tenant_packages 表 —— 新增 user_limit_mode
ALTER TABLE `tenant_packages`
  ADD COLUMN `user_limit_mode` ENUM('total','online') NOT NULL DEFAULT 'total'
  COMMENT '用户限制模式：total-限制总注册数，online-限制同时在线数'
  AFTER `max_storage_gb`;

-- 2. tenant_packages 表 —— 新增 max_online_seats
ALTER TABLE `tenant_packages`
  ADD COLUMN `max_online_seats` INT NOT NULL DEFAULT 0
  COMMENT '最大在线席位数（user_limit_mode=online时生效）'
  AFTER `user_limit_mode`;

-- 3. tenants 表 —— 新增 user_limit_mode
ALTER TABLE `tenants`
  ADD COLUMN `user_limit_mode` ENUM('total','online') NOT NULL DEFAULT 'total'
  COMMENT '用户限制模式（继承自套餐，可单独覆盖）'
  AFTER `user_count`;

-- 4. tenants 表 —— 新增 max_online_seats
ALTER TABLE `tenants`
  ADD COLUMN `max_online_seats` INT NOT NULL DEFAULT 0
  COMMENT '最大在线席位数'
  AFTER `user_limit_mode`;

-- 5. tenants 表 —— 新增 extra_online_seats
ALTER TABLE `tenants`
  ADD COLUMN `extra_online_seats` INT NOT NULL DEFAULT 0
  COMMENT '额外增购的在线席位数'
  AFTER `max_online_seats`;

-- 6. tenants 表 —— 新增 current_online_seats
ALTER TABLE `tenants`
  ADD COLUMN `current_online_seats` INT NOT NULL DEFAULT 0
  COMMENT '当前在线席位数（定时任务同步）'
  AFTER `extra_online_seats`;

-- 7. licenses 表 —— 新增 user_limit_mode
ALTER TABLE `licenses`
  ADD COLUMN `user_limit_mode` ENUM('total','online') NOT NULL DEFAULT 'total'
  COMMENT '用户限制模式'
  AFTER `max_storage_gb`;

-- 8. licenses 表 —— 新增 max_online_seats
ALTER TABLE `licenses`
  ADD COLUMN `max_online_seats` INT NOT NULL DEFAULT 0
  COMMENT '最大在线席位数'
  AFTER `user_limit_mode`;

-- 9. 新建 user_sessions 表（在线席位追踪）
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `session_token` VARCHAR(64) NOT NULL COMMENT '会话标识（JWT hash）',
  `device_type` VARCHAR(20) NOT NULL DEFAULT 'web' COMMENT '设备类型：web/mobile/h5/app',
  `device_info` VARCHAR(500) NULL COMMENT '设备信息（User-Agent）',
  `ip_address` VARCHAR(45) NULL COMMENT '登录IP',
  `login_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
  `last_active_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后活跃时间',
  `status` ENUM('active','expired','kicked') NOT NULL DEFAULT 'active' COMMENT '会话状态',
  `kicked_by` VARCHAR(36) NULL COMMENT '被谁踢出（管理员ID）',
  `kicked_at` DATETIME NULL COMMENT '被踢出时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_active` (`tenant_id`, `status`, `last_active_at`),
  INDEX `idx_user_active` (`user_id`, `status`),
  INDEX `idx_session_token` (`session_token`),
  INDEX `idx_last_active` (`last_active_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户登录会话记录（在线席位追踪）';

-- ============================================================
-- 验证（可选，在phpMyAdmin的SQL标签页执行以确认）
-- ============================================================
-- SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_packages'
--   AND COLUMN_NAME IN ('user_limit_mode', 'max_online_seats');
--
-- SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants'
--   AND COLUMN_NAME IN ('user_limit_mode', 'max_online_seats', 'extra_online_seats', 'current_online_seats');
--
-- SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'licenses'
--   AND COLUMN_NAME IN ('user_limit_mode', 'max_online_seats');
--
-- SHOW CREATE TABLE user_sessions;
