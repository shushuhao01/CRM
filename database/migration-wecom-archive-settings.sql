-- =============================================
-- 企微管理模块 - 会话存档增值服务 数据库迁移
-- 日期: 2026-04-11
-- 适用: 生产环境 MySQL 5.7+ / phpMyAdmin
-- 执行前请备份数据库！
-- 注意: 如果字段已存在会报 Duplicate column 错误，忽略即可
-- =============================================

-- Step 1: tenants 表添加字段（如已存在请忽略报错）
ALTER TABLE `tenants` ADD COLUMN `wecom_chat_archive_auth` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '会话存档增值服务授权: 0=未授权, 1=已授权';

-- Step 2: licenses 表添加字段（如已存在请忽略报错）
ALTER TABLE `licenses` ADD COLUMN `wecom_chat_archive_auth` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '会话存档增值服务授权: 0=未授权, 1=已授权';

-- Step 3: 创建 wecom_archive_settings 表
CREATE TABLE IF NOT EXISTS `wecom_archive_settings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `storage_type` VARCHAR(20) NOT NULL DEFAULT 'database' COMMENT '存储方式: database/oss',
  `oss_bucket` VARCHAR(200) NULL COMMENT 'OSS存储桶',
  `oss_prefix` VARCHAR(200) NULL COMMENT 'OSS前缀路径',
  `retention_days` INT NOT NULL DEFAULT 365 COMMENT '保留天数',
  `max_users` INT NOT NULL DEFAULT 10 COMMENT '开通人数上限',
  `used_users` INT NOT NULL DEFAULT 0 COMMENT '已使用人数',
  `expire_date` DATE NULL COMMENT '服务到期日期',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active/expired/disabled',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_id` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_expire_date` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微会话存档设置表';
