-- =============================================
-- Admin角色权限管理系统 - 生产环境迁移脚本
-- 适用于：phpMyAdmin / 宝塔面板 MySQL管理
-- 创建时间: 2026-04-04
-- 说明: 直接复制到phpMyAdmin的SQL标签页执行即可
-- =============================================

SET NAMES utf8mb4;

-- =============================================
-- 第1步：创建 admin_roles 角色表
-- =============================================

CREATE TABLE IF NOT EXISTS `admin_roles` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `permissions` TEXT NOT NULL COMMENT '权限码列表(JSON数组)',
  `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否系统内置角色(不可删除)',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active/disabled',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理后台角色表';

-- =============================================
-- 第2步：admin_users 表添加 role_id 字段
-- =============================================

-- 安全检查：如果 role_id 字段不存在才添加
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin_users'
    AND COLUMN_NAME = 'role_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `admin_users` ADD COLUMN `role_id` VARCHAR(36) DEFAULT NULL COMMENT ''关联角色ID(admin_roles表)'' AFTER `role`',
  'SELECT ''role_id字段已存在，跳过'' AS result'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- 第3步：插入默认系统角色
-- =============================================

-- 超级管理员（全部权限）
INSERT INTO `admin_roles` (`id`, `name`, `code`, `description`, `permissions`, `is_system`, `status`)
SELECT UUID(), '超级管理员', 'super_admin', '拥有所有权限，不可删除', '["*"]', 1, 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `admin_roles` WHERE `code` = 'super_admin');

-- 运营管理员
INSERT INTO `admin_roles` (`id`, `name`, `code`, `description`, `permissions`, `is_system`, `status`)
SELECT UUID(), '运营管理员', 'operation_admin', '负责日常运营管理，包括客户管理、支付管理等',
'["dashboard:view","customer-management:all:view","customer-management:all:edit","customer-management:renewal:view","private-customers:list:view","private-customers:list:edit","tenant-customers:list:view","tenant-customers:list:edit","tenant-customers:packages:view","payment:list:view","payment:reports:view","versions:list:view","versions:changelog:view","settings:operation-logs:view"]',
1, 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `admin_roles` WHERE `code` = 'operation_admin');

-- 销售员
INSERT INTO `admin_roles` (`id`, `name`, `code`, `description`, `permissions`, `is_system`, `status`)
SELECT UUID(), '销售员', 'sales', '仅可查看和管理客户信息',
'["dashboard:view","customer-management:all:view","customer-management:renewal:view","private-customers:list:view","tenant-customers:list:view"]',
1, 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `admin_roles` WHERE `code` = 'sales');

-- 技术支持
INSERT INTO `admin_roles` (`id`, `name`, `code`, `description`, `permissions`, `is_system`, `status`)
SELECT UUID(), '技术支持', 'tech_support', '负责版本管理、模块配置、接口管理等技术支持工作',
'["dashboard:view","modules:list:view","modules:list:edit","modules:config:view","modules:config:edit","modules:distribute:view","modules:distribute:edit","modules:message:view","versions:list:view","versions:upload:view","versions:upload:edit","versions:changelog:view","versions:changelog:edit","api:list:view","api:list:edit"]',
1, 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `admin_roles` WHERE `code` = 'tech_support');

-- =============================================
-- 执行完毕验证
-- =============================================
SELECT '✅ 迁移完成' AS status, COUNT(*) AS role_count FROM `admin_roles`;

