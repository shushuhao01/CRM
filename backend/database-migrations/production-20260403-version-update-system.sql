-- ============================================================
-- 版本更新系统 - 生产环境迁移脚本（宝塔phpMyAdmin兼容版）
-- 日期: 2026-04-04
-- 说明: 补全 versions 表字段、新建 update_tasks / migration_history / changelogs 表
--       清理系统自建的测试版本数据
-- 执行方式: 宝塔面板 → phpMyAdmin → SQL 页签 → 粘贴全部内容 → 点击执行
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- 第1步: 确保 versions 表存在（已存在则跳过）
-- ============================================================

CREATE TABLE IF NOT EXISTS `versions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `version` VARCHAR(20) NOT NULL UNIQUE COMMENT '版本号',
  `version_code` INT NOT NULL COMMENT '版本数字',
  `release_type` ENUM('major','minor','patch','beta') DEFAULT 'patch' COMMENT '发布类型',
  `platform` VARCHAR(50) DEFAULT 'all' COMMENT '平台',
  `changelog` TEXT COMMENT '更新日志',
  `release_notes_html` TEXT NULL COMMENT '富文本更新说明',
  `download_url` VARCHAR(500) NULL COMMENT '下载地址',
  `source_type` VARCHAR(20) DEFAULT 'url' COMMENT '更新源类型',
  `git_repo_url` VARCHAR(500) NULL COMMENT 'Git仓库地址',
  `git_branch` VARCHAR(100) DEFAULT 'main' COMMENT 'Git分支',
  `git_tag` VARCHAR(100) NULL COMMENT 'Git标签',
  `package_path` VARCHAR(500) NULL COMMENT '上传包路径',
  `target_audience` VARCHAR(20) DEFAULT 'all' COMMENT '目标受众',
  `file_size` VARCHAR(20) NULL COMMENT '文件大小',
  `file_hash` VARCHAR(64) NULL COMMENT '文件校验',
  `min_version` VARCHAR(20) NULL COMMENT '最低可升级版本',
  `is_force_update` TINYINT(1) DEFAULT 0 COMMENT '是否强制更新',
  `status` ENUM('draft','published','deprecated') DEFAULT 'draft' COMMENT '状态',
  `is_published` TINYINT(1) DEFAULT 0 COMMENT '是否已发布',
  `download_count` INT DEFAULT 0 COMMENT '下载次数',
  `published_at` DATETIME NULL COMMENT '发布时间',
  `created_by` VARCHAR(36) NULL COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_version` (`version`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='版本发布表';

-- ============================================================
-- 第2步: 安全补全 versions 表所有字段（已存在则跳过）
-- 不使用 AFTER 子句（避免引用不存在的列）
-- 使用 DATABASE() 内联（避免变量 collation 冲突）
-- 使用 CHAR(39) 生成单引号（避免 phpMyAdmin 转义问题）
-- ============================================================

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'platform');
SET @s = IF(@c=0, CONCAT('ALTER TABLE `versions` ADD COLUMN `platform` VARCHAR(50) DEFAULT ',CHAR(39),'all',CHAR(39)), 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'changelog');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `changelog` TEXT NULL', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'release_notes_html');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `release_notes_html` TEXT NULL', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'download_url');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `download_url` VARCHAR(500) NULL', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'source_type');
SET @s = IF(@c=0, CONCAT('ALTER TABLE `versions` ADD COLUMN `source_type` VARCHAR(20) DEFAULT ',CHAR(39),'url',CHAR(39)), 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'git_repo_url');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `git_repo_url` VARCHAR(500) NULL', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'git_branch');
SET @s = IF(@c=0, CONCAT('ALTER TABLE `versions` ADD COLUMN `git_branch` VARCHAR(100) DEFAULT ',CHAR(39),'main',CHAR(39)), 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'git_tag');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `git_tag` VARCHAR(100) NULL', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'package_path');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `package_path` VARCHAR(500) NULL', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'target_audience');
SET @s = IF(@c=0, CONCAT('ALTER TABLE `versions` ADD COLUMN `target_audience` VARCHAR(20) DEFAULT ',CHAR(39),'all',CHAR(39)), 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'file_size');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `file_size` VARCHAR(20) NULL', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'file_hash');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `file_hash` VARCHAR(64) NULL', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'min_version');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `min_version` VARCHAR(20) NULL', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'is_force_update');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `is_force_update` TINYINT(1) DEFAULT 0', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'is_published');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `is_published` TINYINT(1) DEFAULT 0', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'download_count');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `download_count` INT DEFAULT 0', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'published_at');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `published_at` DATETIME NULL', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'versions' AND COLUMN_NAME = 'created_by');
SET @s = IF(@c=0, 'ALTER TABLE `versions` ADD COLUMN `created_by` VARCHAR(36) NULL', 'SELECT 1');
PREPARE _stmt FROM @s; EXECUTE _stmt; DEALLOCATE PREPARE _stmt;

-- ============================================================
-- 第3步: 创建 update_tasks 表（已存在则跳过）
-- ============================================================

CREATE TABLE IF NOT EXISTS `update_tasks` (
  `id` VARCHAR(36) PRIMARY KEY,
  `version_id` VARCHAR(36) NOT NULL COMMENT '目标版本ID',
  `customer_id` VARCHAR(36) NULL COMMENT '私有客户ID',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '更新状态',
  `current_step` VARCHAR(50) NULL COMMENT '当前执行步骤',
  `progress` INT DEFAULT 0 COMMENT '进度百分比(0-100)',
  `logs` LONGTEXT NULL COMMENT '执行日志(JSON数组)',
  `backup_path` VARCHAR(500) NULL COMMENT '备份目录路径',
  `error_message` TEXT NULL COMMENT '错误信息',
  `from_version` VARCHAR(20) NULL COMMENT '更新前版本号',
  `to_version` VARCHAR(20) NULL COMMENT '目标版本号',
  `triggered_by` VARCHAR(36) NULL COMMENT '操作人ID',
  `started_at` DATETIME NULL COMMENT '开始时间',
  `completed_at` DATETIME NULL COMMENT '完成时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_update_tasks_version_id` (`version_id`),
  INDEX `idx_update_tasks_customer_id` (`customer_id`),
  INDEX `idx_update_tasks_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='版本更新任务记录';

-- ============================================================
-- 第4步: 创建 migration_history 表（已存在则跳过）
-- ============================================================

CREATE TABLE IF NOT EXISTS `migration_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `filename` VARCHAR(200) NOT NULL UNIQUE COMMENT '迁移文件名',
  `checksum` VARCHAR(64) NULL COMMENT '文件校验值',
  `execution_time` INT NULL COMMENT '执行耗时(ms)',
  `success` TINYINT DEFAULT 1 COMMENT '是否成功',
  `error_message` TEXT NULL COMMENT '错误信息',
  `executed_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库迁移历史';

-- ============================================================
-- 第5步: 创建 changelogs 表（已存在则跳过）
-- ============================================================

CREATE TABLE IF NOT EXISTS `changelogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  `version_id` VARCHAR(36) NOT NULL COMMENT '版本ID',
  `type` ENUM('feature','bugfix','improvement','security','breaking') DEFAULT 'feature' COMMENT '类型',
  `content` TEXT NOT NULL COMMENT '更新内容',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_changelogs_version_id` (`version_id`),
  INDEX `idx_changelogs_type` (`type`),
  INDEX `idx_changelogs_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='版本更新日志表';

-- ============================================================
-- 第6步: 清理系统自建的测试版本（非实际发布的版本）
-- 先用变量取ID，再逐表删除，避免子查询 collation 冲突
-- ============================================================

SELECT @vid := `id` FROM `versions` WHERE `version` = '1.0.0' AND `published_at` IS NULL LIMIT 1;
DELETE FROM `changelogs` WHERE @vid IS NOT NULL AND `version_id` = (@vid COLLATE utf8mb4_unicode_ci);
DELETE FROM `update_tasks` WHERE @vid IS NOT NULL AND `version_id` = (@vid COLLATE utf8mb4_unicode_ci);
DELETE FROM `versions` WHERE `version` = '1.0.0' AND `published_at` IS NULL;

-- ============================================================
-- 完成
-- ============================================================
SELECT '迁移执行完成' AS message;
