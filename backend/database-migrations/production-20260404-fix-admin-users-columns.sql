-- =============================================
-- 修复 admin_users 表列名和枚举值
-- 创建时间: 2026-04-04
-- 说明:
--   1. 将 real_name 列重命名为 name (与代码一致)
--   2. 修复 status 枚举值为 ('active','inactive')
--   3. 确保 role_id 列存在
-- 直接在 phpMyAdmin 或宝塔面板执行即可
-- =============================================

SET NAMES utf8mb4;

-- =============================================
-- 第1步：修复 real_name → name 列名
-- =============================================

-- 检查是否存在 real_name 列（需要重命名）
SET @has_real_name = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin_users'
    AND COLUMN_NAME = 'real_name'
);

SET @has_name = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin_users'
    AND COLUMN_NAME = 'name'
);

-- 如果有 real_name 但没有 name，则重命名
SET @rename_sql = IF(@has_real_name > 0 AND @has_name = 0,
  'ALTER TABLE `admin_users` CHANGE COLUMN `real_name` `name` VARCHAR(50) DEFAULT NULL COMMENT ''姓名''',
  'SELECT ''name列已正确，跳过重命名'' AS result'
);

PREPARE stmt FROM @rename_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- 第2步：确保 role_id 列存在
-- =============================================

SET @has_role_id = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin_users'
    AND COLUMN_NAME = 'role_id'
);

SET @add_role_id_sql = IF(@has_role_id = 0,
  'ALTER TABLE `admin_users` ADD COLUMN `role_id` VARCHAR(36) DEFAULT NULL COMMENT ''关联角色ID(admin_roles表)'' AFTER `role`',
  'SELECT ''role_id列已存在，跳过'' AS result'
);

PREPARE stmt FROM @add_role_id_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- 第3步：修复 NULL status 的记录
-- =============================================

UPDATE `admin_users` SET `status` = 'active' WHERE `status` IS NULL;

-- =============================================
-- 第4步：确保 api_configs 表存在（接口管理功能）
-- =============================================

CREATE TABLE IF NOT EXISTS `api_configs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT 'API名称',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'API代码',
  `description` TEXT COMMENT 'API描述',
  `api_key` VARCHAR(100) NOT NULL UNIQUE COMMENT 'API密钥',
  `api_secret` VARCHAR(255) NOT NULL COMMENT 'API密钥（加密）',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `rate_limit` INT DEFAULT 1000 COMMENT '速率限制（次/小时）',
  `allowed_ips` TEXT COMMENT '允许的IP（JSON数组）',
  `expires_at` TIMESTAMP NULL COMMENT '过期时间',
  `last_used_at` TIMESTAMP NULL COMMENT '最后使用时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_api_key` (`api_key`),
  INDEX `idx_status` (`status`),
  INDEX `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API配置表';

-- =============================================
-- 第5步：确保 api_call_logs 表存在（接口调用日志）
-- =============================================

CREATE TABLE IF NOT EXISTS `api_call_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `api_config_id` VARCHAR(36) COMMENT 'API配置ID',
  `api_key` VARCHAR(100) COMMENT 'API密钥',
  `endpoint` VARCHAR(255) NOT NULL COMMENT '调用端点',
  `method` VARCHAR(10) NOT NULL COMMENT '请求方法',
  `request_params` TEXT COMMENT '请求参数',
  `response_status` INT COMMENT '响应状态码',
  `response_time` INT COMMENT '响应时间（ms）',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` TEXT COMMENT 'User Agent',
  `error_message` TEXT COMMENT '错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_api_config_id` (`api_config_id`),
  INDEX `idx_api_key` (`api_key`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_endpoint` (`endpoint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API调用日志表';

-- =============================================
-- 验证修复结果
-- =============================================

SELECT
  '✅ admin_users 表修复完成' AS status,
  (SELECT COUNT(*) FROM `admin_users`) AS total_users,
  (SELECT COUNT(*) FROM `admin_users` WHERE `status` = 'active') AS active_users;

