-- ============================================================
-- 公告系统数据库迁移 - 创建 announcements 和 announcement_reads 表
-- 兼容 phpMyAdmin 执行
-- 创建日期：2026-03-25
-- ============================================================

-- 1. 创建公告表（如果不存在）
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` VARCHAR(36) NOT NULL COMMENT '公告ID',
  `tenant_id` VARCHAR(36) NULL DEFAULT NULL COMMENT '租户ID（公司公告属于租户，系统公告为NULL）',
  `source` VARCHAR(20) NOT NULL DEFAULT 'company' COMMENT '公告来源: system=系统公告, company=公司公告',
  `title` VARCHAR(200) NOT NULL COMMENT '公告标题',
  `content` TEXT NOT NULL COMMENT '公告内容',
  `type` VARCHAR(50) NOT NULL DEFAULT 'notice' COMMENT '公告类型: notice/update/maintenance/promotion',
  `priority` VARCHAR(20) NOT NULL DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态: draft/published/archived',
  `target_roles` JSON NULL DEFAULT NULL COMMENT '目标角色列表，为空表示所有人',
  `target_departments` JSON NULL DEFAULT NULL COMMENT '目标部门列表，为空表示所有部门',
  `target_tenants` JSON NULL DEFAULT NULL COMMENT '目标租户列表（系统公告用，NULL=全部租户）',
  `start_time` TIMESTAMP NULL DEFAULT NULL COMMENT '生效开始时间',
  `end_time` TIMESTAMP NULL DEFAULT NULL COMMENT '生效结束时间',
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶',
  `is_popup` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否弹窗显示',
  `is_marquee` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否横幅滚动',
  `view_count` INT NOT NULL DEFAULT 0 COMMENT '查看次数',
  `created_by` VARCHAR(36) NULL DEFAULT NULL COMMENT '创建者ID',
  `created_by_name` VARCHAR(100) NULL DEFAULT NULL COMMENT '创建者姓名',
  `published_at` TIMESTAMP NULL DEFAULT NULL COMMENT '发布时间',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_announcements_source` (`source`),
  INDEX `idx_announcements_status` (`status`),
  INDEX `idx_announcements_type` (`type`),
  INDEX `idx_announcements_created_at` (`created_at`),
  INDEX `idx_announcements_published_at` (`published_at`),
  INDEX `idx_announcements_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统公告表';

-- 2. 创建公告阅读记录表（如果不存在）
CREATE TABLE IF NOT EXISTS `announcement_reads` (
  `id` VARCHAR(36) NOT NULL COMMENT '记录ID',
  `announcement_id` VARCHAR(36) NOT NULL COMMENT '公告ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `read_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '阅读时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_announcement_user` (`announcement_id`, `user_id`),
  INDEX `idx_announcement_reads_announcement_id` (`announcement_id`),
  INDEX `idx_announcement_reads_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告阅读记录表';

-- 3. 从旧表 system_announcements 迁移数据到 announcements（如果旧表存在且有数据）
-- 注意：字段映射关系：
--   publish_time -> published_at
--   is_top -> is_pinned
--   expire_time -> end_time
--   read_count -> view_count
INSERT IGNORE INTO `announcements` (
  `id`, `tenant_id`, `source`, `title`, `content`, `type`, `priority`, `status`,
  `target_roles`, `target_departments`, `target_tenants`,
  `start_time`, `end_time`, `is_pinned`, `is_popup`, `is_marquee`,
  `view_count`, `created_by`, `created_by_name`, `published_at`,
  `created_at`, `updated_at`
)
SELECT
  `id`,
  NULL AS `tenant_id`,
  'system' AS `source`,
  `title`,
  `content`,
  CASE `type`
    WHEN 'system' THEN 'notice'
    WHEN 'maintenance' THEN 'maintenance'
    WHEN 'update' THEN 'update'
    WHEN 'notice' THEN 'notice'
    ELSE 'notice'
  END AS `type`,
  `priority`,
  `status`,
  `target_roles`,
  `target_departments`,
  NULL AS `target_tenants`,
  `publish_time` AS `start_time`,
  `expire_time` AS `end_time`,
  IFNULL(`is_top`, 0) AS `is_pinned`,
  IFNULL(`is_popup`, 0) AS `is_popup`,
  1 AS `is_marquee`,
  IFNULL(`read_count`, 0) AS `view_count`,
  `created_by`,
  `created_by_name`,
  `publish_time` AS `published_at`,
  `created_at`,
  `updated_at`
FROM `system_announcements`
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'system_announcements');

-- 4. 确保 announcements 表有 source 字段（兼容已有表但缺少该字段的情况）
-- 如果表已经存在但缺少 source/tenant_id/target_tenants 列，添加它们
SET @db_name = DATABASE();

-- 添加 tenant_id 列（如不存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db_name AND table_name = 'announcements' AND column_name = 'tenant_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `announcements` ADD COLUMN `tenant_id` VARCHAR(36) NULL DEFAULT NULL COMMENT ''租户ID'' AFTER `id`, ADD INDEX `idx_announcements_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 source 列（如不存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db_name AND table_name = 'announcements' AND column_name = 'source');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `announcements` ADD COLUMN `source` VARCHAR(20) NOT NULL DEFAULT ''company'' COMMENT ''公告来源'' AFTER `tenant_id`, ADD INDEX `idx_announcements_source` (`source`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 target_tenants 列（如不存在）
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db_name AND table_name = 'announcements' AND column_name = 'target_tenants');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE `announcements` ADD COLUMN `target_tenants` JSON NULL DEFAULT NULL COMMENT ''目标租户列表'' AFTER `target_departments`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

