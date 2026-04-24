-- ============================================================
-- 公告系统数据库迁移 - 生产环境可执行SQL
-- 兼容 phpMyAdmin 直接执行（无需修改）
-- 创建日期：2026-03-25
-- 说明：创建 announcements 和 announcement_reads 表，
--       并从旧 system_announcements 表迁移数据
-- ============================================================

-- -----------------------------------------------
-- 第1步：创建公告表（如果不存在）
-- -----------------------------------------------
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

-- -----------------------------------------------
-- 第2步：创建公告阅读记录表（如果不存在）
-- -----------------------------------------------
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

-- -----------------------------------------------
-- 第3步：兼容性补丁 - 先为已存在的表添加缺失字段
-- （必须在数据迁移之前执行，否则INSERT会因缺少列而报错）
-- -----------------------------------------------

-- 3a. 添加 tenant_id 列
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'announcements' AND column_name = 'tenant_id');
SET @alter_sql = IF(@col_exists = 0, 'ALTER TABLE `announcements` ADD COLUMN `tenant_id` VARCHAR(36) NULL DEFAULT NULL COMMENT ''租户ID'' AFTER `id`', 'SELECT 1');
PREPARE alter_stmt FROM @alter_sql;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 3b. 添加 tenant_id 索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'announcements' AND index_name = 'idx_announcements_tenant_id');
SET @idx_sql = IF(@idx_exists = 0, 'ALTER TABLE `announcements` ADD INDEX `idx_announcements_tenant_id` (`tenant_id`)', 'SELECT 1');
PREPARE idx_stmt FROM @idx_sql;
EXECUTE idx_stmt;
DEALLOCATE PREPARE idx_stmt;

-- 3c. 添加 source 列
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'announcements' AND column_name = 'source');
SET @alter_sql = IF(@col_exists = 0, 'ALTER TABLE `announcements` ADD COLUMN `source` VARCHAR(20) NOT NULL DEFAULT ''company'' COMMENT ''公告来源'' AFTER `tenant_id`', 'SELECT 1');
PREPARE alter_stmt FROM @alter_sql;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 3d. 添加 source 索引
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'announcements' AND index_name = 'idx_announcements_source');
SET @idx_sql = IF(@idx_exists = 0, 'ALTER TABLE `announcements` ADD INDEX `idx_announcements_source` (`source`)', 'SELECT 1');
PREPARE idx_stmt FROM @idx_sql;
EXECUTE idx_stmt;
DEALLOCATE PREPARE idx_stmt;

-- 3e. 添加 target_tenants 列
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'announcements' AND column_name = 'target_tenants');
SET @alter_sql = IF(@col_exists = 0, 'ALTER TABLE `announcements` ADD COLUMN `target_tenants` JSON NULL DEFAULT NULL COMMENT ''目标租户列表'' AFTER `target_departments`', 'SELECT 1');
PREPARE alter_stmt FROM @alter_sql;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 3f. 添加 is_marquee 列
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'announcements' AND column_name = 'is_marquee');
SET @alter_sql = IF(@col_exists = 0, 'ALTER TABLE `announcements` ADD COLUMN `is_marquee` TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''是否横幅滚动'' AFTER `is_popup`', 'SELECT 1');
PREPARE alter_stmt FROM @alter_sql;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 3g. 添加 view_count 列
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'announcements' AND column_name = 'view_count');
SET @alter_sql = IF(@col_exists = 0, 'ALTER TABLE `announcements` ADD COLUMN `view_count` INT NOT NULL DEFAULT 0 COMMENT ''查看次数'' AFTER `is_marquee`', 'SELECT 1');
PREPARE alter_stmt FROM @alter_sql;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 3h. 添加 created_by_name 列
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'announcements' AND column_name = 'created_by_name');
SET @alter_sql = IF(@col_exists = 0, 'ALTER TABLE `announcements` ADD COLUMN `created_by_name` VARCHAR(100) NULL DEFAULT NULL COMMENT ''创建者姓名'' AFTER `created_by`', 'SELECT 1');
PREPARE alter_stmt FROM @alter_sql;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 3i. 添加 published_at 列
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'announcements' AND column_name = 'published_at');
SET @alter_sql = IF(@col_exists = 0, 'ALTER TABLE `announcements` ADD COLUMN `published_at` TIMESTAMP NULL DEFAULT NULL COMMENT ''发布时间'' AFTER `created_by_name`', 'SELECT 1');
PREPARE alter_stmt FROM @alter_sql;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- -----------------------------------------------
-- 第4步：从旧表迁移数据（仅当 system_announcements 表存在时执行）
-- -----------------------------------------------
SET @old_table_exists = (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = DATABASE() AND table_name = 'system_announcements'
);

SET @migrate_sql = IF(@old_table_exists > 0,
  CONCAT(
    'INSERT IGNORE INTO `announcements` ',
    '(`id`, `tenant_id`, `source`, `title`, `content`, `type`, `priority`, `status`, ',
    '`target_roles`, `target_departments`, `target_tenants`, ',
    '`start_time`, `end_time`, `is_pinned`, `is_popup`, `is_marquee`, ',
    '`view_count`, `created_by`, `created_by_name`, `published_at`, ',
    '`created_at`, `updated_at`) ',
    'SELECT `id`, NULL, ''system'', `title`, `content`, ',
    'CASE `type` ',
      'WHEN ''system'' THEN ''notice'' ',
      'WHEN ''maintenance'' THEN ''maintenance'' ',
      'WHEN ''update'' THEN ''update'' ',
      'WHEN ''notice'' THEN ''notice'' ',
      'ELSE ''notice'' END, ',
    '`priority`, `status`, `target_roles`, `target_departments`, NULL, ',
    '`publish_time`, `expire_time`, ',
    'IFNULL(`is_top`, 0), IFNULL(`is_popup`, 0), 1, ',
    'IFNULL(`read_count`, 0), ',
    '`created_by`, `created_by_name`, `publish_time`, ',
    '`created_at`, `updated_at` ',
    'FROM `system_announcements`'
  ),
  'SELECT ''旧表 system_announcements 不存在，跳过数据迁移'' AS message'
);

PREPARE migrate_stmt FROM @migrate_sql;
EXECUTE migrate_stmt;
DEALLOCATE PREPARE migrate_stmt;

-- ============================================================
-- 执行完成！验证：
-- SELECT COUNT(*) FROM announcements;
-- SELECT COUNT(*) FROM announcement_reads;
-- DESCRIBE announcements;
-- ============================================================
