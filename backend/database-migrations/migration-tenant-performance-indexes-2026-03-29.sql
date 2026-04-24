-- =============================================
-- 多租户性能优化 - 索引迁移脚本
-- 日期：2026-03-29
-- 版本：1.8.0
-- 说明：为核心业务表添加 tenant_id 列（如不存在）和复合索引
-- 注意：请先备份数据库再执行！
-- =============================================

SET NAMES utf8mb4;

-- =============================================
-- 安全创建索引的存储过程
-- =============================================
DROP PROCEDURE IF EXISTS safe_create_index;
DELIMITER //
CREATE PROCEDURE safe_create_index(
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
    SELECT CONCAT('✅ 创建索引: ', p_table, '.', p_index) as result;
  ELSE
    SELECT CONCAT('⏭️ 索引已存在: ', p_table, '.', p_index) as result;
  END IF;
END //
DELIMITER ;

-- 安全添加列的存储过程
DROP PROCEDURE IF EXISTS safe_add_column;
DELIMITER //
CREATE PROCEDURE safe_add_column(
  IN p_table VARCHAR(100),
  IN p_column VARCHAR(100),
  IN p_definition VARCHAR(500)
)
BEGIN
  DECLARE col_exists INT DEFAULT 0;
  SELECT COUNT(*) INTO col_exists
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = p_table
    AND COLUMN_NAME = p_column;

  IF col_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    SELECT CONCAT('✅ 添加列: ', p_table, '.', p_column) as result;
  ELSE
    SELECT CONCAT('⏭️ 列已存在: ', p_table, '.', p_column) as result;
  END IF;
END //
DELIMITER ;

-- =============================================
-- 第一步：为核心表添加 tenant_id 列
-- =============================================

CALL safe_add_column('customers', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('orders', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('products', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('product_categories', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('departments', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('roles', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('customer_tags', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('customer_groups', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('customer_shares', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('follow_up_records', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('call_records', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('after_sales_services', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('service_records', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('logistics', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('performance_records', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('operation_logs', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('data_records', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('notifications', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('sms_records', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('sms_templates', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('messages', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('order_status_history', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('performance_metrics', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('performance_shares', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('performance_share_members', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('order_items', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");
CALL safe_add_column('logs', 'tenant_id', "VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`");

-- =============================================
-- 第二步：添加 tenant_id 单列索引和复合索引
-- =============================================

-- ========== customers 表 ==========
CALL safe_create_index('customers', 'idx_customers_tenant_id', '`tenant_id`');
CALL safe_create_index('customers', 'idx_customers_tenant_status', '`tenant_id`, `status`');
CALL safe_create_index('customers', 'idx_customers_tenant_sales', '`tenant_id`, `sales_person_id`');
CALL safe_create_index('customers', 'idx_customers_tenant_created_by', '`tenant_id`, `created_by`');
CALL safe_create_index('customers', 'idx_customers_tenant_created_at', '`tenant_id`, `created_at`');
CALL safe_create_index('customers', 'idx_customers_tenant_phone', '`tenant_id`, `phone`');
CALL safe_create_index('customers', 'idx_customers_tenant_name', '`tenant_id`, `name`');

-- ========== orders 表 ==========
CALL safe_create_index('orders', 'idx_orders_tenant_id', '`tenant_id`');
CALL safe_create_index('orders', 'idx_orders_tenant_status', '`tenant_id`, `status`');
CALL safe_create_index('orders', 'idx_orders_tenant_customer', '`tenant_id`, `customer_id`');
CALL safe_create_index('orders', 'idx_orders_tenant_created_by', '`tenant_id`, `created_by`');
CALL safe_create_index('orders', 'idx_orders_tenant_created_at', '`tenant_id`, `created_at`');
CALL safe_create_index('orders', 'idx_orders_tenant_status_created', '`tenant_id`, `status`, `created_at`');
CALL safe_create_index('orders', 'idx_orders_updated_at', '`updated_at`');

-- ========== products 表 ==========
CALL safe_create_index('products', 'idx_products_tenant_id', '`tenant_id`');
CALL safe_create_index('products', 'idx_products_tenant_status', '`tenant_id`, `status`');

-- ========== product_categories 表 ==========
CALL safe_create_index('product_categories', 'idx_product_categories_tenant_id', '`tenant_id`');

-- ========== departments 表 ==========
CALL safe_create_index('departments', 'idx_departments_tenant_id', '`tenant_id`');

-- ========== roles 表 ==========
CALL safe_create_index('roles', 'idx_roles_tenant_id', '`tenant_id`');

-- ========== customer_tags 表 ==========
CALL safe_create_index('customer_tags', 'idx_customer_tags_tenant_id', '`tenant_id`');

-- ========== customer_groups 表 ==========
CALL safe_create_index('customer_groups', 'idx_customer_groups_tenant_id', '`tenant_id`');

-- ========== customer_shares 表 ==========
CALL safe_create_index('customer_shares', 'idx_customer_shares_tenant_id', '`tenant_id`');
CALL safe_create_index('customer_shares', 'idx_customer_shares_tenant_customer', '`tenant_id`, `customer_id`');
CALL safe_create_index('customer_shares', 'idx_customer_shares_tenant_shared_to', '`tenant_id`, `shared_to`');

-- ========== follow_up_records 表 ==========
CALL safe_create_index('follow_up_records', 'idx_follow_up_records_tenant_id', '`tenant_id`');
CALL safe_create_index('follow_up_records', 'idx_follow_up_tenant_customer', '`tenant_id`, `customer_id`');

-- ========== call_records 表 ==========
CALL safe_create_index('call_records', 'idx_call_records_tenant_id', '`tenant_id`');
CALL safe_create_index('call_records', 'idx_call_records_tenant_user', '`tenant_id`, `user_id`');

-- ========== after_sales_services 表 ==========
CALL safe_create_index('after_sales_services', 'idx_after_sales_tenant_id', '`tenant_id`');

-- ========== service_records 表 ==========
CALL safe_create_index('service_records', 'idx_service_records_tenant_id', '`tenant_id`');

-- ========== logistics 表 ==========
CALL safe_create_index('logistics', 'idx_logistics_tenant_id', '`tenant_id`');

-- ========== performance_records 表 ==========
CALL safe_create_index('performance_records', 'idx_performance_records_tenant_id', '`tenant_id`');
CALL safe_create_index('performance_records', 'idx_performance_tenant_user', '`tenant_id`, `user_id`');
CALL safe_create_index('performance_records', 'idx_performance_tenant_date', '`tenant_id`, `date`');

-- ========== operation_logs 表 ==========
CALL safe_create_index('operation_logs', 'idx_operation_logs_tenant_id', '`tenant_id`');

-- ========== data_records 表 ==========
CALL safe_create_index('data_records', 'idx_data_records_tenant_id', '`tenant_id`');

-- ========== notifications 表 ==========
CALL safe_create_index('notifications', 'idx_notifications_tenant_id', '`tenant_id`');
CALL safe_create_index('notifications', 'idx_notifications_tenant_user', '`tenant_id`, `user_id`');

-- ========== sms_records 表 ==========
CALL safe_create_index('sms_records', 'idx_sms_records_tenant_id', '`tenant_id`');

-- ========== sms_templates 表 ==========
CALL safe_create_index('sms_templates', 'idx_sms_templates_tenant_id', '`tenant_id`');

-- ========== messages 表 ==========
CALL safe_create_index('messages', 'idx_messages_tenant_id', '`tenant_id`');

-- ========== order_status_history 表 ==========
CALL safe_create_index('order_status_history', 'idx_order_status_history_tenant_id', '`tenant_id`');

-- ========== performance_metrics 表 ==========
CALL safe_create_index('performance_metrics', 'idx_performance_metrics_tenant_id', '`tenant_id`');

-- ========== performance_shares 表 ==========
CALL safe_create_index('performance_shares', 'idx_performance_shares_tenant_id', '`tenant_id`');

-- ========== performance_share_members 表 ==========
CALL safe_create_index('performance_share_members', 'idx_performance_share_members_tenant_id', '`tenant_id`');

-- ========== order_items 表 ==========
CALL safe_create_index('order_items', 'idx_order_items_tenant_id', '`tenant_id`');

-- ========== logs 表 ==========
CALL safe_create_index('logs', 'idx_logs_tenant_id', '`tenant_id`');

-- ========== users 表（补充复合索引）==========
CALL safe_create_index('users', 'idx_users_tenant_dept', '`tenant_id`, `department_id`');
CALL safe_create_index('users', 'idx_users_tenant_status', '`tenant_id`, `status`');
CALL safe_create_index('users', 'idx_users_tenant_role', '`tenant_id`, `role`');

-- =============================================
-- 第三步：修复唯一索引为租户级唯一
-- =============================================

-- 说明：以下操作会修改唯一约束，如果存在跨租户的重复数据，需要先清理
-- customer_code 改为租户级唯一
-- 注意：执行前请确认没有跨租户的 customer_code 重复数据

-- 检查是否存在旧的 UNIQUE 约束
SET @old_idx_exists = 0;
SELECT COUNT(*) INTO @old_idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'customers'
  AND INDEX_NAME = 'customer_code';

-- 如果存在旧约束，删除并创建新的租户级唯一约束
-- 由于 IF NOT EXISTS 在DDL中支持有限，这里使用条件执行
-- 请手动执行以下语句（如果需要）：
-- ALTER TABLE `customers` DROP INDEX `customer_code`;
-- ALTER TABLE `customers` ADD UNIQUE INDEX `uk_tenant_customer_code` (`tenant_id`, `customer_code`);

-- ALTER TABLE `orders` DROP INDEX `order_number`;
-- ALTER TABLE `orders` ADD UNIQUE INDEX `uk_tenant_order_number` (`tenant_id`, `order_number`);

-- =============================================
-- 验证
-- =============================================

-- 查看所有 tenant 相关的索引
SELECT
  TABLE_NAME,
  INDEX_NAME,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS,
  CASE NON_UNIQUE WHEN 0 THEN 'UNIQUE' ELSE 'INDEX' END as INDEX_TYPE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME LIKE '%tenant%'
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;

-- =============================================
-- 清理
-- =============================================
DROP PROCEDURE IF EXISTS safe_create_index;
DROP PROCEDURE IF EXISTS safe_add_column;

SELECT '✅ 多租户性能优化索引脚本执行完成！' as final_result;

