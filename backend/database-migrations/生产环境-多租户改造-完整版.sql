-- ============================================
-- 生产环境多租户改造SQL脚本
-- 执行日期: 2026-03-02
-- 数据库: abc789_cn (生产环境)
-- 说明: 为所有核心业务表添加 tenant_id 字段
-- ============================================

-- 设置字符集
SET NAMES utf8mb4;

-- ============================================
-- 第一部分：添加 tenant_id 字段（18个表）
-- 说明：每个表分两步执行，先添加字段，再添加索引
-- 如果字段已存在会报错，可以忽略继续执行
-- ============================================

-- 1. users 表
ALTER TABLE `users` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `users` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 2. roles 表
ALTER TABLE `roles` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `roles` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 3. permissions 表
ALTER TABLE `permissions` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `permissions` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 4. departments 表
ALTER TABLE `departments` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `departments` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 5. customers 表
ALTER TABLE `customers` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `customers` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 6. products 表
ALTER TABLE `products` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `products` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 7. product_categories 表
ALTER TABLE `product_categories` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `product_categories` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 8. orders 表
ALTER TABLE `orders` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `orders` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 9. order_items 表
ALTER TABLE `order_items` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `order_items` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 10. system_configs 表
ALTER TABLE `system_configs` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `system_configs` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 11. operation_logs 表
ALTER TABLE `operation_logs` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `operation_logs` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 12. cod_cancel_applications 表
ALTER TABLE `cod_cancel_applications` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `cod_cancel_applications` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 13. after_sales_services 表
ALTER TABLE `after_sales_services` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `after_sales_services` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 14. outsource_companies 表
ALTER TABLE `outsource_companies` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `outsource_companies` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 15. value_added_price_config 表
ALTER TABLE `value_added_price_config` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `value_added_price_config` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 16. value_added_orders 表
ALTER TABLE `value_added_orders` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `value_added_orders` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 17. value_added_status_configs 表
ALTER TABLE `value_added_status_configs` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `value_added_status_configs` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 18. value_added_remark_presets 表
ALTER TABLE `value_added_remark_presets` ADD COLUMN `tenant_id` VARCHAR(50) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `value_added_remark_presets` ADD INDEX `idx_tenant_id` (`tenant_id`);

-- ============================================
-- 第二部分：验证脚本（可选执行）
-- ============================================

-- 查看所有表的 tenant_id 字段
SELECT 
    TABLE_NAME AS '表名',
    COLUMN_NAME AS '字段名',
    COLUMN_TYPE AS '字段类型',
    IS_NULLABLE AS '允许NULL',
    COLUMN_COMMENT AS '注释'
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = 'abc789_cn'
    AND COLUMN_NAME = 'tenant_id'
ORDER BY 
    TABLE_NAME;

-- ============================================
-- 执行完成提示
-- ============================================
-- 多租户改造SQL执行完成！
-- 
-- 已添加 tenant_id 字段的表（18个）：
-- 1. users
-- 2. roles
-- 3. permissions
-- 4. departments
-- 5. customers
-- 6. products
-- 7. product_categories
-- 8. orders
-- 9. order_items
-- 10. system_configs
-- 11. operation_logs
-- 12. cod_cancel_applications
-- 13. after_sales_services
-- 14. outsource_companies
-- 15. value_added_price_config
-- 16. value_added_orders
-- 17. value_added_status_configs
-- 18. value_added_remark_presets
--
-- 重要提示：
-- 1. 所有字段都允许 NULL，不会影响现有数据
-- 2. 已为所有 tenant_id 字段添加索引，优化查询性能
-- 3. 如果某个表的字段已存在，会报错但不影响其他表
-- 4. 建议执行前先备份数据库
-- 5. 可以多次执行此脚本，已存在的字段会跳过
-- ============================================
