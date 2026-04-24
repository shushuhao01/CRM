-- ============================================
-- CRM系统多租户支持 - 数据库迁移脚本
-- ============================================
-- 创建时间: 2026-03-02
-- 用途: 为CRM系统添加SaaS多租户支持
-- 执行顺序: 
--   1. 先执行本脚本（添加tenant_id字段）
--   2. 再执行 create-tenant-tables.sql（创建租户相关表）
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 第一步: 创建租户相关表
-- ============================================

-- 租户表
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `tenant_code` VARCHAR(50) NOT NULL COMMENT '租户代码（唯一标识）',
  `tenant_name` VARCHAR(200) NOT NULL COMMENT '租户名称',
  `license_key` VARCHAR(100) NOT NULL COMMENT '授权码',
  `contact_person` VARCHAR(50) NULL COMMENT '联系人',
  `contact_phone` VARCHAR(20) NULL COMMENT '联系电话',
  `contact_email` VARCHAR(100) NULL COMMENT '联系邮箱',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-启用, inactive-停用, expired-已过期',
  `package_type` VARCHAR(50) DEFAULT 'basic' COMMENT '套餐类型: basic-基础版, standard-标准版, professional-专业版, enterprise-企业版',
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

-- 租户配置表
CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id` VARCHAR(36) NOT NULL COMMENT '配置ID',
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `setting_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `setting_value` TEXT NULL COMMENT '配置值',
  `setting_type` VARCHAR(20) DEFAULT 'string' COMMENT '配置类型: string, number, boolean, json',
  `description` VARCHAR(500) NULL COMMENT '配置说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_setting` (`tenant_id`, `setting_key`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_tenant_settings_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户配置表';

-- ============================================
-- 第二步: 为所有业务表添加 tenant_id 字段
-- ============================================

-- 用户表
ALTER TABLE `users` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID（NULL表示私有部署）' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 修改用户名唯一索引（支持租户隔离）
ALTER TABLE `users` DROP INDEX `username`;
ALTER TABLE `users` ADD UNIQUE KEY `uk_tenant_username` (`tenant_id`, `username`);

-- 修改邮箱唯一索引（支持租户隔离）
ALTER TABLE `users` DROP INDEX `email`;
ALTER TABLE `users` ADD UNIQUE KEY `uk_tenant_email` (`tenant_id`, `email`);

-- 角色表
ALTER TABLE `roles` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID（NULL表示系统角色）' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 修改角色名唯一索引（支持租户隔离）
ALTER TABLE `roles` DROP INDEX `name`;
ALTER TABLE `roles` ADD UNIQUE KEY `uk_tenant_role_name` (`tenant_id`, `name`);

-- 部门表
ALTER TABLE `departments` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 客户表
ALTER TABLE `customers` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 修改客户编号唯一索引（支持租户隔离）
ALTER TABLE `customers` DROP INDEX `customer_no`;
ALTER TABLE `customers` ADD UNIQUE KEY `uk_tenant_customer_no` (`tenant_id`, `customer_no`);

-- 产品分类表
ALTER TABLE `product_categories` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 产品表
ALTER TABLE `products` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 修改SKU唯一索引（支持租户隔离）
ALTER TABLE `products` DROP INDEX `sku`;
ALTER TABLE `products` ADD UNIQUE KEY `uk_tenant_sku` (`tenant_id`, `sku`);

-- 订单表
ALTER TABLE `orders` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 修改订单号唯一索引（支持租户隔离）
ALTER TABLE `orders` DROP INDEX `uk_order_number`;
ALTER TABLE `orders` ADD UNIQUE KEY `uk_tenant_order_number` (`tenant_id`, `order_number`);

-- 订单项表
ALTER TABLE `order_items` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 操作日志表
ALTER TABLE `operation_logs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 代收取消申请表
ALTER TABLE `cod_cancel_applications` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 售后服务表
ALTER TABLE `after_sales_services` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 外包公司表
ALTER TABLE `outsource_companies` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 外包公司价格配置表
ALTER TABLE `value_added_price_config` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 增值订单表
ALTER TABLE `value_added_orders` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 增值管理备注预设表
ALTER TABLE `value_added_remark_presets` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- ============================================
-- 第三步: 添加外键约束（可选，建议在测试通过后添加）
-- ============================================

-- 注意：外键约束会影响性能，建议在应用层保证数据一致性
-- 如果需要添加外键，取消下面的注释

-- ALTER TABLE `users` 
--   ADD CONSTRAINT `fk_users_tenant` 
--   FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

-- ALTER TABLE `roles` 
--   ADD CONSTRAINT `fk_roles_tenant` 
--   FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

-- ALTER TABLE `departments` 
--   ADD CONSTRAINT `fk_departments_tenant` 
--   FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

-- ALTER TABLE `customers` 
--   ADD CONSTRAINT `fk_customers_tenant` 
--   FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

-- ALTER TABLE `orders` 
--   ADD CONSTRAINT `fk_orders_tenant` 
--   FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

-- ============================================
-- 第四步: 创建复合索引（优化查询性能）
-- ============================================

-- 用户表复合索引
ALTER TABLE `users` ADD INDEX `idx_tenant_status` (`tenant_id`, `status`);

-- 客户表复合索引
ALTER TABLE `customers` ADD INDEX `idx_tenant_status` (`tenant_id`, `status`);
ALTER TABLE `customers` ADD INDEX `idx_tenant_sales` (`tenant_id`, `sales_user_id`);
ALTER TABLE `customers` ADD INDEX `idx_tenant_created` (`tenant_id`, `created_at`);

-- 订单表复合索引
ALTER TABLE `orders` ADD INDEX `idx_tenant_status` (`tenant_id`, `status`);
ALTER TABLE `orders` ADD INDEX `idx_tenant_customer` (`tenant_id`, `customer_id`);
ALTER TABLE `orders` ADD INDEX `idx_tenant_created` (`tenant_id`, `created_at`);
ALTER TABLE `orders` ADD INDEX `idx_tenant_payment` (`tenant_id`, `payment_status`);

-- 产品表复合索引
ALTER TABLE `products` ADD INDEX `idx_tenant_status` (`tenant_id`, `status`);
ALTER TABLE `products` ADD INDEX `idx_tenant_category` (`tenant_id`, `category_id`);

-- ============================================
-- 第五步: 数据验证查询
-- ============================================

-- 验证所有表是否已添加 tenant_id 字段
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND COLUMN_NAME = 'tenant_id'
ORDER BY TABLE_NAME;

-- 验证索引是否创建成功
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  COLUMN_NAME,
  SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND COLUMN_NAME = 'tenant_id'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 迁移完成提示
-- ============================================
-- 
-- ✅ 数据库迁移完成！
-- 
-- 已完成的操作：
-- 1. ✅ 创建租户表（tenants）
-- 2. ✅ 创建租户配置表（tenant_settings）
-- 3. ✅ 所有业务表已添加 tenant_id 字段
-- 4. ✅ 所有业务表已添加 tenant_id 索引
-- 5. ✅ 修改唯一索引支持租户隔离
-- 6. ✅ 创建复合索引优化查询性能
-- 
-- 下一步操作：
-- 1. 执行验证查询，确认所有表都已添加 tenant_id
-- 2. 测试私有部署模式（tenant_id = NULL）
-- 3. 测试SaaS模式（tenant_id = 租户ID）
-- 4. 实现后端租户认证中间件
-- 5. 实现BaseRepository自动过滤
-- 
-- 注意事项：
-- - tenant_id 字段允许为 NULL（支持私有部署模式）
-- - 私有部署模式：tenant_id = NULL
-- - SaaS模式：tenant_id = 租户UUID
-- - 唯一索引已修改为复合索引（tenant_id + 原字段）
-- - MySQL允许多个NULL值，不影响私有部署
-- 
-- ============================================
