-- ============================================
-- CRM系统多租户支持 - 数据库迁移脚本（安全版本）
-- ============================================
-- 创建时间: 2026-03-02
-- 用途: 为CRM系统添加SaaS多租户支持
-- 说明: 使用存储过程安全地添加字段和索引
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 创建辅助存储过程
-- ============================================

DELIMITER $$

-- 安全添加列的存储过程
DROP PROCEDURE IF EXISTS add_column_if_not_exists$$
CREATE PROCEDURE add_column_if_not_exists(
    IN tableName VARCHAR(128),
    IN columnName VARCHAR(128),
    IN columnDefinition VARCHAR(1000)
)
BEGIN
    DECLARE column_count INT;
    
    SELECT COUNT(*) INTO column_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND COLUMN_NAME = columnName;
    
    IF column_count = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

-- 安全删除索引的存储过程
DROP PROCEDURE IF EXISTS drop_index_if_exists$$
CREATE PROCEDURE drop_index_if_exists(
    IN tableName VARCHAR(128),
    IN indexName VARCHAR(128)
)
BEGIN
    DECLARE index_count INT;
    
    SELECT COUNT(*) INTO index_count
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND INDEX_NAME = indexName;
    
    IF index_count > 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` DROP INDEX `', indexName, '`');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

-- 安全添加索引的存储过程
DROP PROCEDURE IF EXISTS add_index_if_not_exists$$
CREATE PROCEDURE add_index_if_not_exists(
    IN tableName VARCHAR(128),
    IN indexName VARCHAR(128),
    IN indexDefinition VARCHAR(1000)
)
BEGIN
    DECLARE index_count INT;
    
    SELECT COUNT(*) INTO index_count
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tableName
      AND INDEX_NAME = indexName;
    
    IF index_count = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD ', indexDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- ============================================
-- 第一步: 创建租户相关表
-- ============================================

CREATE TABLE IF NOT EXISTS `tenants` (
  `id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `tenant_code` VARCHAR(50) NOT NULL COMMENT '租户代码（唯一标识）',
  `tenant_name` VARCHAR(200) NOT NULL COMMENT '租户名称',
  `license_key` VARCHAR(100) NOT NULL COMMENT '授权码',
  `contact_person` VARCHAR(50) NULL COMMENT '联系人',
  `contact_phone` VARCHAR(20) NULL COMMENT '联系电话',
  `contact_email` VARCHAR(100) NULL COMMENT '联系邮箱',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-启用, inactive-停用, expired-已过期',
  `package_type` VARCHAR(50) DEFAULT 'basic' COMMENT '套餐类型',
  `max_users` INT DEFAULT 10 COMMENT '最大用户数',
  `max_storage_gb` INT DEFAULT 10 COMMENT '最大存储空间(GB)',
  `expire_date` DATE NULL COMMENT '过期日期（NULL表示永久）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_code` (`tenant_code`),
  UNIQUE KEY `uk_license_key` (`license_key`),
  KEY `idx_status` (`status`),
  KEY `idx_expire_date` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户表';

CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id` VARCHAR(36) NOT NULL COMMENT '配置ID',
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `setting_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `setting_value` TEXT NULL COMMENT '配置值',
  `setting_type` VARCHAR(20) DEFAULT 'string' COMMENT '配置类型',
  `description` VARCHAR(500) NULL COMMENT '配置说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_setting` (`tenant_id`, `setting_key`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户配置表';

-- ============================================
-- 第二步: 为业务表添加 tenant_id 字段
-- ============================================

-- 用户表
CALL add_column_if_not_exists('users', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('users', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');
CALL drop_index_if_exists('users', 'username');
CALL add_index_if_not_exists('users', 'uk_tenant_username', 'UNIQUE KEY `uk_tenant_username` (`tenant_id`, `username`)');
CALL drop_index_if_exists('users', 'email');
CALL add_index_if_not_exists('users', 'uk_tenant_email', 'UNIQUE KEY `uk_tenant_email` (`tenant_id`, `email`)');

-- 角色表
CALL add_column_if_not_exists('roles', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('roles', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');
CALL drop_index_if_exists('roles', 'name');
CALL add_index_if_not_exists('roles', 'uk_tenant_role_name', 'UNIQUE KEY `uk_tenant_role_name` (`tenant_id`, `name`)');

-- 部门表
CALL add_column_if_not_exists('departments', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('departments', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');

-- 客户表
CALL add_column_if_not_exists('customers', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('customers', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');
CALL drop_index_if_exists('customers', 'customer_no');
CALL add_index_if_not_exists('customers', 'uk_tenant_customer_no', 'UNIQUE KEY `uk_tenant_customer_no` (`tenant_id`, `customer_no`)');

-- 产品分类表
CALL add_column_if_not_exists('product_categories', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('product_categories', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');

-- 产品表
CALL add_column_if_not_exists('products', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('products', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');
CALL drop_index_if_exists('products', 'sku');
CALL add_index_if_not_exists('products', 'uk_tenant_sku', 'UNIQUE KEY `uk_tenant_sku` (`tenant_id`, `sku`)');

-- 订单表
CALL add_column_if_not_exists('orders', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('orders', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');
CALL drop_index_if_exists('orders', 'uk_order_number');
CALL add_index_if_not_exists('orders', 'uk_tenant_order_number', 'UNIQUE KEY `uk_tenant_order_number` (`tenant_id`, `order_number`)');

-- 订单项表
CALL add_column_if_not_exists('order_items', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('order_items', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');

-- 操作日志表
CALL add_column_if_not_exists('operation_logs', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('operation_logs', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');

-- 代收取消申请表
CALL add_column_if_not_exists('cod_cancel_applications', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('cod_cancel_applications', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');

-- 售后服务表
CALL add_column_if_not_exists('after_sales_services', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('after_sales_services', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');

-- 外包公司表
CALL add_column_if_not_exists('outsource_companies', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('outsource_companies', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');

-- 外包公司价格配置表
CALL add_column_if_not_exists('value_added_price_config', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('value_added_price_config', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');

-- 增值订单表
CALL add_column_if_not_exists('value_added_orders', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('value_added_orders', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');

-- 增值管理备注预设表
CALL add_column_if_not_exists('value_added_remark_presets', 'tenant_id', 'VARCHAR(36) NULL COMMENT ''租户ID'' AFTER `id`');
CALL add_index_if_not_exists('value_added_remark_presets', 'idx_tenant_id', 'INDEX `idx_tenant_id` (`tenant_id`)');

-- ============================================
-- 第三步: 创建复合索引（优化查询性能）
-- ============================================

-- 用户表复合索引
CALL add_index_if_not_exists('users', 'idx_tenant_status', 'INDEX `idx_tenant_status` (`tenant_id`, `status`)');

-- 客户表复合索引
CALL add_index_if_not_exists('customers', 'idx_tenant_status', 'INDEX `idx_tenant_status` (`tenant_id`, `status`)');
CALL add_index_if_not_exists('customers', 'idx_tenant_sales', 'INDEX `idx_tenant_sales` (`tenant_id`, `sales_user_id`)');
CALL add_index_if_not_exists('customers', 'idx_tenant_created', 'INDEX `idx_tenant_created` (`tenant_id`, `created_at`)');

-- 订单表复合索引
CALL add_index_if_not_exists('orders', 'idx_tenant_status', 'INDEX `idx_tenant_status` (`tenant_id`, `status`)');
CALL add_index_if_not_exists('orders', 'idx_tenant_customer', 'INDEX `idx_tenant_customer` (`tenant_id`, `customer_id`)');
CALL add_index_if_not_exists('orders', 'idx_tenant_created', 'INDEX `idx_tenant_created` (`tenant_id`, `created_at`)');
CALL add_index_if_not_exists('orders', 'idx_tenant_payment', 'INDEX `idx_tenant_payment` (`tenant_id`, `payment_status`)');

-- 产品表复合索引
CALL add_index_if_not_exists('products', 'idx_tenant_status', 'INDEX `idx_tenant_status` (`tenant_id`, `status`)');
CALL add_index_if_not_exists('products', 'idx_tenant_category', 'INDEX `idx_tenant_category` (`tenant_id`, `category_id`)');

-- ============================================
-- 清理存储过程
-- ============================================

DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DROP PROCEDURE IF EXISTS drop_index_if_exists;
DROP PROCEDURE IF EXISTS add_index_if_not_exists;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 迁移完成
-- ============================================
SELECT '✅ 数据库迁移完成！' AS message;
