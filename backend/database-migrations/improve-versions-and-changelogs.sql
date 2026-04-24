-- 完善版本管理表和创建更新日志表
-- 创建时间: 2026-03-04

-- 1. 完善versions表 - 添加缺失字段

-- 检查并添加download_count字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'versions' 
  AND COLUMN_NAME = 'download_count';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE `versions` ADD COLUMN `download_count` INT NOT NULL DEFAULT 0 COMMENT ''下载次数'' AFTER `file_hash`',
  'SELECT ''download_count字段已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加is_published字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'versions' 
  AND COLUMN_NAME = 'is_published';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE `versions` ADD COLUMN `is_published` TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否已发布'' AFTER `status`',
  'SELECT ''is_published字段已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加platform字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'versions' 
  AND COLUMN_NAME = 'platform';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE `versions` ADD COLUMN `platform` ENUM(''windows'', ''macos'', ''linux'', ''android'', ''ios'', ''web'', ''all'') NOT NULL DEFAULT ''all'' COMMENT ''适用平台'' AFTER `release_type`',
  'SELECT ''platform字段已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 创建更新日志表
CREATE TABLE IF NOT EXISTS `changelogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  `version_id` VARCHAR(36) NOT NULL COMMENT '版本ID',
  `type` ENUM('feature', 'bugfix', 'improvement', 'security', 'breaking') NOT NULL DEFAULT 'feature' COMMENT '类型',
  `content` TEXT NOT NULL COMMENT '更新内容',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_version_id` (`version_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_sort_order` (`sort_order`),
  FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='版本更新日志表';

-- 3. 插入示例数据
INSERT INTO `versions` (`id`, `version`, `version_code`, `release_type`, `platform`, `changelog`, `status`, `is_published`, `download_count`, `created_at`)
SELECT * FROM (
  SELECT 
    UUID() as id,
    '1.0.0' as version,
    10000 as version_code,
    'major' as release_type,
    'all' as platform,
    '首个正式版本发布' as changelog,
    'published' as status,
    1 as is_published,
    0 as download_count,
    NOW() as created_at
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM `versions` WHERE `version` = '1.0.0');
