-- =============================================
-- 生产环境数据库迁移：users表添加tenant_id列（多租户支持）
-- phpMyAdmin兼容版 - 使用存储过程实现幂等
-- 执行时间：2026-03-21
-- =============================================

SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS `_migration_add_tenant_id`;

DELIMITER $$

CREATE PROCEDURE `_migration_add_tenant_id`()
BEGIN
    -- 1. 添加 tenant_id 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'tenant_id'
    ) THEN
        ALTER TABLE `users` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID（SaaS模式，私有部署为NULL）' AFTER `id`;
    END IF;

    -- 2. 添加 tenant_id 普通索引
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND INDEX_NAME = 'idx_users_tenant_id'
    ) THEN
        ALTER TABLE `users` ADD INDEX `idx_users_tenant_id` (`tenant_id`);
    END IF;

    -- 3. 添加 租户+用户名 复合唯一索引
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND INDEX_NAME = 'uk_tenant_username'
    ) THEN
        ALTER TABLE `users` ADD UNIQUE INDEX `uk_tenant_username` (`tenant_id`, `username`);
    END IF;
END$$

DELIMITER ;

CALL `_migration_add_tenant_id`();

DROP PROCEDURE IF EXISTS `_migration_add_tenant_id`;

SELECT 'users表 tenant_id 多租户迁移完成' AS migration_result;
