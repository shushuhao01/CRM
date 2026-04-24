-- =============================================
-- 第一阶段 数据库性能紧急优化 生产环境SQL
-- 兼容 宝塔面板 phpMyAdmin / MySQL 8.0+
-- 日期 2026-03-30
--
-- 执行前请先备份数据库!
--
-- 使用方法:
--   1. 宝塔面板 phpMyAdmin 选择CRM数据库
--   2. 点SQL标签页
--   3. 全部粘贴到输入框
--   4. 点执行
--   5. 部分语句会提示 Duplicate column/key 这是正常的 说明已存在 自动跳过
--   6. 部分DROP语句会提示 check that key exists 这也是正常的 说明索引已删除
--
-- 重要: phpMyAdmin会逐条执行 某条报错不影响后续语句
-- =============================================


-- =============================================
-- 第1步 为核心表添加tenant_id列
-- 如果列已存在会提示Duplicate column name 忽略即可
-- =============================================

ALTER TABLE `customers` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `orders` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `products` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `product_categories` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `departments` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `roles` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `customer_tags` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `customer_groups` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `customer_shares` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `follow_up_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `call_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `after_sales_services` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `service_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `logistics` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `performance_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `operation_logs` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `data_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `notifications` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `sms_records` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `sms_templates` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `messages` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `order_items` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `order_status_history` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;
ALTER TABLE `performance_metrics` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;


-- =============================================
-- 第2步 添加tenant_id单列索引和复合索引
-- 如果索引已存在会提示Duplicate key name 忽略即可
-- =============================================

-- customers表
CREATE INDEX `idx_customers_tenant_id` ON `customers` (`tenant_id`);
CREATE INDEX `idx_customers_tenant_status` ON `customers` (`tenant_id`, `status`);
CREATE INDEX `idx_customers_tenant_sales` ON `customers` (`tenant_id`, `sales_person_id`);
CREATE INDEX `idx_customers_tenant_created_by` ON `customers` (`tenant_id`, `created_by`);
CREATE INDEX `idx_customers_tenant_created_at` ON `customers` (`tenant_id`, `created_at`);
CREATE INDEX `idx_customers_tenant_phone` ON `customers` (`tenant_id`, `phone`);
CREATE INDEX `idx_customers_tenant_name` ON `customers` (`tenant_id`, `name`);

-- orders表
CREATE INDEX `idx_orders_tenant_id` ON `orders` (`tenant_id`);
CREATE INDEX `idx_orders_tenant_status` ON `orders` (`tenant_id`, `status`);
CREATE INDEX `idx_orders_tenant_customer` ON `orders` (`tenant_id`, `customer_id`);
CREATE INDEX `idx_orders_tenant_created_by` ON `orders` (`tenant_id`, `created_by`);
CREATE INDEX `idx_orders_tenant_created_at` ON `orders` (`tenant_id`, `created_at`);
CREATE INDEX `idx_orders_tenant_status_created` ON `orders` (`tenant_id`, `status`, `created_at`);
CREATE INDEX `idx_orders_tenant_payment_status` ON `orders` (`tenant_id`, `payment_status`);
CREATE INDEX `idx_orders_updated_at` ON `orders` (`updated_at`);

-- users表
CREATE INDEX `idx_users_tenant_dept` ON `users` (`tenant_id`, `department_id`);
CREATE INDEX `idx_users_tenant_status` ON `users` (`tenant_id`, `status`);
CREATE INDEX `idx_users_tenant_role` ON `users` (`tenant_id`, `role`);

-- products表
CREATE INDEX `idx_products_tenant_id` ON `products` (`tenant_id`);
CREATE INDEX `idx_products_tenant_status` ON `products` (`tenant_id`, `status`);

-- product_categories表
CREATE INDEX `idx_product_categories_tenant_id` ON `product_categories` (`tenant_id`);

-- departments表
CREATE INDEX `idx_departments_tenant_id` ON `departments` (`tenant_id`);

-- roles表
CREATE INDEX `idx_roles_tenant_id` ON `roles` (`tenant_id`);

-- customer_tags表
CREATE INDEX `idx_customer_tags_tenant_id` ON `customer_tags` (`tenant_id`);

-- customer_groups表
CREATE INDEX `idx_customer_groups_tenant_id` ON `customer_groups` (`tenant_id`);

-- customer_shares表
CREATE INDEX `idx_customer_shares_tenant_id` ON `customer_shares` (`tenant_id`);
CREATE INDEX `idx_customer_shares_tenant_customer` ON `customer_shares` (`tenant_id`, `customer_id`);
CREATE INDEX `idx_customer_shares_tenant_shared_to` ON `customer_shares` (`tenant_id`, `shared_to`);

-- follow_up_records表
CREATE INDEX `idx_follow_up_records_tenant_id` ON `follow_up_records` (`tenant_id`);
CREATE INDEX `idx_follow_up_tenant_customer` ON `follow_up_records` (`tenant_id`, `customer_id`);

-- call_records表
CREATE INDEX `idx_call_records_tenant_id` ON `call_records` (`tenant_id`);
CREATE INDEX `idx_call_records_tenant_user` ON `call_records` (`tenant_id`, `user_id`);

-- after_sales_services表
CREATE INDEX `idx_after_sales_tenant_id` ON `after_sales_services` (`tenant_id`);

-- service_records表
CREATE INDEX `idx_service_records_tenant_id` ON `service_records` (`tenant_id`);

-- logistics表
CREATE INDEX `idx_logistics_tenant_id` ON `logistics` (`tenant_id`);

-- performance_records表
CREATE INDEX `idx_performance_records_tenant_id` ON `performance_records` (`tenant_id`);
CREATE INDEX `idx_performance_tenant_user` ON `performance_records` (`tenant_id`, `user_id`);
CREATE INDEX `idx_performance_tenant_date` ON `performance_records` (`tenant_id`, `date`);

-- operation_logs表
CREATE INDEX `idx_operation_logs_tenant_id` ON `operation_logs` (`tenant_id`);
CREATE INDEX `idx_operation_logs_tenant_created` ON `operation_logs` (`tenant_id`, `created_at`);

-- data_records表
CREATE INDEX `idx_data_records_tenant_id` ON `data_records` (`tenant_id`);

-- notifications表
CREATE INDEX `idx_notifications_tenant_id` ON `notifications` (`tenant_id`);
CREATE INDEX `idx_notifications_tenant_user` ON `notifications` (`tenant_id`, `user_id`);

-- sms_records表
CREATE INDEX `idx_sms_records_tenant_id` ON `sms_records` (`tenant_id`);

-- sms_templates表
CREATE INDEX `idx_sms_templates_tenant_id` ON `sms_templates` (`tenant_id`);

-- messages表
CREATE INDEX `idx_messages_tenant_id` ON `messages` (`tenant_id`);

-- order_items表
CREATE INDEX `idx_order_items_tenant_id` ON `order_items` (`tenant_id`);

-- order_status_history表
CREATE INDEX `idx_order_status_history_tenant_id` ON `order_status_history` (`tenant_id`);

-- performance_metrics表
CREATE INDEX `idx_performance_metrics_tenant_id` ON `performance_metrics` (`tenant_id`);


-- =============================================
-- 第3步 修复唯一索引为租户级唯一
-- 先删旧索引再建新索引
-- 如果旧索引不存在 DROP会报错 忽略即可
-- 如果新索引已存在 CREATE会报错 忽略即可
-- =============================================

-- customers表 customer_code改为租户级唯一
DROP INDEX `customer_code` ON `customers`;
DROP INDEX `idx_customer_code` ON `customers`;
CREATE UNIQUE INDEX `uk_tenant_customer_code` ON `customers` (`tenant_id`, `customer_code`);

-- orders表 order_number改为租户级唯一
DROP INDEX `order_number` ON `orders`;
DROP INDEX `idx_order_number` ON `orders`;
CREATE UNIQUE INDEX `uk_tenant_order_number` ON `orders` (`tenant_id`, `order_number`);


-- =============================================
-- 第4步 清理orders表冗余索引
-- 这些单列索引已被tenant_id复合索引覆盖 可安全删除
-- 如果索引不存在 DROP会报错 忽略即可
-- =============================================

-- 被复合索引覆盖的
DROP INDEX `idx_status` ON `orders`;
DROP INDEX `idx_customer` ON `orders`;
DROP INDEX `idx_created_by` ON `orders`;
DROP INDEX `idx_created_at` ON `orders`;
DROP INDEX `idx_payment_status` ON `orders`;

-- 低基数无效索引
DROP INDEX `idx_mark_type` ON `orders`;
DROP INDEX `idx_is_todo` ON `orders`;
DROP INDEX `idx_order_source` ON `orders`;
DROP INDEX `idx_shipping_time` ON `orders`;
DROP INDEX `idx_expected_delivery_date` ON `orders`;
DROP INDEX `idx_cod_returned_at` ON `orders`;

-- 清理重复旧命名索引
DROP INDEX `idx_tenant_created` ON `orders`;
DROP INDEX `idx_tenant_created` ON `customers`;


-- =============================================
-- 第5步 验证结果
-- =============================================
SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS, CASE NON_UNIQUE WHEN 0 THEN 'UNIQUE' ELSE 'INDEX' END AS TYPE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME LIKE '%tenant%' GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE ORDER BY TABLE_NAME, INDEX_NAME;
