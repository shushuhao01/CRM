-- =============================================
-- 第一阶段：数据库性能紧急优化 — 索引迁移脚本
-- 日期：2026-03-30
-- 任务：1.1 + 1.2 + 1.3（tenant_id列、单列/复合索引、唯一索引修复）
--
-- ⚠️ 注意：请先备份数据库再执行！
-- 备份命令：mysqldump -u root -p crm_database > backup_20260330.sql
--
-- 特性：
--   - 使用 IF NOT EXISTS 确保幂等，可重复执行
--   - 使用存储过程安全创建索引（避免已存在报错）
--   - 分三步执行：添加列 → 创建索引 → 修复唯一约束
-- =============================================

-- =============================================
-- 第一步：为核心表添加 tenant_id 列（如果不存在）
-- 涉及24张核心业务表
-- =============================================

-- customers 表
ALTER TABLE `customers`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- orders 表
ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- products 表
ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- product_categories 表
ALTER TABLE `product_categories`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- departments 表
ALTER TABLE `departments`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- roles 表
ALTER TABLE `roles`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- customer_tags 表
ALTER TABLE `customer_tags`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- customer_groups 表
ALTER TABLE `customer_groups`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- customer_shares 表
ALTER TABLE `customer_shares`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- follow_up_records 表
ALTER TABLE `follow_up_records`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- call_records 表
ALTER TABLE `call_records`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- after_sales_services 表
ALTER TABLE `after_sales_services`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- service_records 表
ALTER TABLE `service_records`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- logistics 表
ALTER TABLE `logistics`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- performance_records 表
ALTER TABLE `performance_records`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- operation_logs 表
ALTER TABLE `operation_logs`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- data_records 表
ALTER TABLE `data_records`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- notifications 表
ALTER TABLE `notifications`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- sms_records 表
ALTER TABLE `sms_records`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- sms_templates 表
ALTER TABLE `sms_templates`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- messages 表
ALTER TABLE `messages`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- order_items 表
ALTER TABLE `order_items`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- order_status_history 表
ALTER TABLE `order_status_history`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;

-- performance_metrics 表
ALTER TABLE `performance_metrics`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`;


-- =============================================
-- 第二步：创建安全索引创建存储过程
-- =============================================

DELIMITER //
CREATE PROCEDURE IF NOT EXISTS safe_create_index(
  IN p_table VARCHAR(100),
  IN p_index VARCHAR(100),
  IN p_columns VARCHAR(500)
)
BEGIN
  DECLARE index_exists INT DEFAULT 0;
  SELECT COUNT(*) INTO index_exists
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = p_table
    AND INDEX_NAME = p_index;

  IF index_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_columns, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;


-- =============================================
-- 第三步：添加 tenant_id 单列索引（任务1.1）
-- =============================================

CALL safe_create_index('customers', 'idx_customers_tenant_id', '`tenant_id`');
CALL safe_create_index('orders', 'idx_orders_tenant_id', '`tenant_id`');
CALL safe_create_index('products', 'idx_products_tenant_id', '`tenant_id`');
CALL safe_create_index('product_categories', 'idx_product_categories_tenant_id', '`tenant_id`');
CALL safe_create_index('departments', 'idx_departments_tenant_id', '`tenant_id`');
CALL safe_create_index('roles', 'idx_roles_tenant_id', '`tenant_id`');
CALL safe_create_index('customer_tags', 'idx_customer_tags_tenant_id', '`tenant_id`');
CALL safe_create_index('customer_groups', 'idx_customer_groups_tenant_id', '`tenant_id`');
CALL safe_create_index('customer_shares', 'idx_customer_shares_tenant_id', '`tenant_id`');
CALL safe_create_index('follow_up_records', 'idx_follow_up_records_tenant_id', '`tenant_id`');
CALL safe_create_index('call_records', 'idx_call_records_tenant_id', '`tenant_id`');
CALL safe_create_index('after_sales_services', 'idx_after_sales_tenant_id', '`tenant_id`');
CALL safe_create_index('service_records', 'idx_service_records_tenant_id', '`tenant_id`');
CALL safe_create_index('logistics', 'idx_logistics_tenant_id', '`tenant_id`');
CALL safe_create_index('performance_records', 'idx_performance_records_tenant_id', '`tenant_id`');
CALL safe_create_index('operation_logs', 'idx_operation_logs_tenant_id', '`tenant_id`');
CALL safe_create_index('data_records', 'idx_data_records_tenant_id', '`tenant_id`');
CALL safe_create_index('notifications', 'idx_notifications_tenant_id', '`tenant_id`');
CALL safe_create_index('sms_records', 'idx_sms_records_tenant_id', '`tenant_id`');
CALL safe_create_index('sms_templates', 'idx_sms_templates_tenant_id', '`tenant_id`');
CALL safe_create_index('messages', 'idx_messages_tenant_id', '`tenant_id`');
CALL safe_create_index('order_items', 'idx_order_items_tenant_id', '`tenant_id`');
CALL safe_create_index('order_status_history', 'idx_order_status_history_tenant_id', '`tenant_id`');
CALL safe_create_index('performance_metrics', 'idx_performance_metrics_tenant_id', '`tenant_id`');


-- =============================================
-- 第四步：添加复合索引（tenant_id + 业务字段）（任务1.2）
-- =============================================

-- ---- customers 表复合索引（6个）----
CALL safe_create_index('customers', 'idx_customers_tenant_status', '`tenant_id`, `status`');
CALL safe_create_index('customers', 'idx_customers_tenant_sales', '`tenant_id`, `sales_person_id`');
CALL safe_create_index('customers', 'idx_customers_tenant_created_by', '`tenant_id`, `created_by`');
CALL safe_create_index('customers', 'idx_customers_tenant_created_at', '`tenant_id`, `created_at`');
CALL safe_create_index('customers', 'idx_customers_tenant_phone', '`tenant_id`, `phone`');
CALL safe_create_index('customers', 'idx_customers_tenant_name', '`tenant_id`, `name`');

-- ---- orders 表复合索引（7个）----
CALL safe_create_index('orders', 'idx_orders_tenant_status', '`tenant_id`, `status`');
CALL safe_create_index('orders', 'idx_orders_tenant_customer', '`tenant_id`, `customer_id`');
CALL safe_create_index('orders', 'idx_orders_tenant_created_by', '`tenant_id`, `created_by`');
CALL safe_create_index('orders', 'idx_orders_tenant_created_at', '`tenant_id`, `created_at`');
CALL safe_create_index('orders', 'idx_orders_tenant_status_created', '`tenant_id`, `status`, `created_at`');
CALL safe_create_index('orders', 'idx_orders_tenant_payment_status', '`tenant_id`, `payment_status`');
CALL safe_create_index('orders', 'idx_orders_updated_at', '`updated_at`');

-- ---- users 表复合索引（3个）----
CALL safe_create_index('users', 'idx_users_tenant_dept', '`tenant_id`, `department_id`');
CALL safe_create_index('users', 'idx_users_tenant_status', '`tenant_id`, `status`');
CALL safe_create_index('users', 'idx_users_tenant_role', '`tenant_id`, `role`');

-- ---- customer_shares 表复合索引（2个）----
CALL safe_create_index('customer_shares', 'idx_customer_shares_tenant_customer', '`tenant_id`, `customer_id`');
CALL safe_create_index('customer_shares', 'idx_customer_shares_tenant_shared_to', '`tenant_id`, `shared_to`');

-- ---- follow_up_records 表复合索引（1个）----
CALL safe_create_index('follow_up_records', 'idx_follow_up_tenant_customer', '`tenant_id`, `customer_id`');

-- ---- call_records 表复合索引（1个）----
CALL safe_create_index('call_records', 'idx_call_records_tenant_user', '`tenant_id`, `user_id`');

-- ---- performance_records 表复合索引（2个）----
CALL safe_create_index('performance_records', 'idx_performance_tenant_user', '`tenant_id`, `user_id`');
CALL safe_create_index('performance_records', 'idx_performance_tenant_date', '`tenant_id`, `date`');

-- ---- notifications 表复合索引（1个）----
CALL safe_create_index('notifications', 'idx_notifications_tenant_user', '`tenant_id`, `user_id`');

-- ---- products 表复合索引（1个）----
CALL safe_create_index('products', 'idx_products_tenant_status', '`tenant_id`, `status`');

-- ---- operation_logs 表复合索引（1个）----
CALL safe_create_index('operation_logs', 'idx_operation_logs_tenant_created', '`tenant_id`, `created_at`');


-- =============================================
-- 第五步：修复唯一索引为租户级唯一（任务1.3）
-- =============================================

-- ---- 步骤5.1：修复 customers.customer_code 唯一约束 ----
-- 先删除旧的全局唯一索引（可能有多种名称）
ALTER TABLE `customers` DROP INDEX IF EXISTS `customer_code`;
ALTER TABLE `customers` DROP INDEX IF EXISTS `idx_customer_code`;
ALTER TABLE `customers` DROP INDEX IF EXISTS `UQ_customers_customer_code`;
-- 创建新的租户级唯一索引
-- 注意：使用safe_create_index的方式无法创建UNIQUE索引，这里用IF NOT EXISTS检查
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS safe_create_unique_index(
  IN p_table VARCHAR(100),
  IN p_index VARCHAR(100),
  IN p_columns VARCHAR(500)
)
BEGIN
  DECLARE index_exists INT DEFAULT 0;
  SELECT COUNT(*) INTO index_exists
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = p_table
    AND INDEX_NAME = p_index;

  IF index_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD UNIQUE INDEX `', p_index, '` (', p_columns, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL safe_create_unique_index('customers', 'uk_tenant_customer_code', '`tenant_id`, `customer_code`');

-- ---- 步骤5.2：修复 orders.order_number 唯一约束 ----
ALTER TABLE `orders` DROP INDEX IF EXISTS `order_number`;
ALTER TABLE `orders` DROP INDEX IF EXISTS `idx_order_number`;
ALTER TABLE `orders` DROP INDEX IF EXISTS `UQ_orders_order_number`;

CALL safe_create_unique_index('orders', 'uk_tenant_order_number', '`tenant_id`, `order_number`');


-- =============================================
-- 第六步：验证索引创建结果
-- =============================================

-- 查看所有包含 tenant 关键字的索引
SELECT
  TABLE_NAME AS '表名',
  INDEX_NAME AS '索引名',
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS '索引列',
  CASE NON_UNIQUE WHEN 0 THEN 'UNIQUE' ELSE 'INDEX' END AS '索引类型'
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME LIKE '%tenant%'
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;

-- 统计每张表的索引数量
SELECT
  TABLE_NAME AS '表名',
  COUNT(DISTINCT INDEX_NAME) AS '索引数量'
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'customers', 'orders', 'products', 'product_categories', 'departments',
    'roles', 'customer_tags', 'customer_groups', 'customer_shares',
    'follow_up_records', 'call_records', 'after_sales_services', 'service_records',
    'logistics', 'performance_records', 'operation_logs', 'data_records',
    'notifications', 'sms_records', 'sms_templates', 'messages',
    'order_items', 'order_status_history', 'performance_metrics', 'users'
  )
GROUP BY TABLE_NAME
ORDER BY COUNT(DISTINCT INDEX_NAME) DESC;


-- =============================================
-- 清理：删除辅助存储过程
-- =============================================
DROP PROCEDURE IF EXISTS safe_create_index;
DROP PROCEDURE IF EXISTS safe_create_unique_index;


-- =============================================
-- 执行完成提示
-- =============================================
-- 本脚本已完成：
-- ✅ 任务1.1：24张核心表添加 tenant_id 列和单列索引
-- ✅ 任务1.2：添加 23 个复合索引（tenant_id + 业务字段）
-- ✅ 任务1.3：修复 customer_code 和 order_number 唯一约束为租户级唯一
--
-- 下一步：
-- 1. 检查验证查询结果，确认所有索引已创建
-- 2. 执行 20260330-phase1-cleanup-orders-indexes.sql 清理冗余索引（任务1.4）

