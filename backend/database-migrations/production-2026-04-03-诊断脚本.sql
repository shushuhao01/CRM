-- =============================================
-- 生产环境数据库诊断脚本
-- 日期: 2026-04-03
-- 用途: 检查生产数据库缺失的表、字段、索引
-- 执行方式: 在宝塔 phpMyAdmin 中逐段执行
-- =============================================

SET NAMES utf8mb4;

-- =============================================
-- 第一部分：检查所有必需表是否存在
-- =============================================

SELECT '========== 第一部分：检查表是否存在 ==========' AS `诊断阶段`;

-- 将所有 schema.sql 中定义的 126 张表逐一检查
-- 结果：✓ 存在 / ✗ 不存在

SELECT
  t.table_name AS `表名`,
  CASE WHEN s.TABLE_NAME IS NOT NULL THEN '✓ 存在' ELSE '✗ 不存在' END AS `状态`
FROM (
  -- ===== CRM核心业务表 =====
  SELECT 'departments' AS table_name UNION ALL
  SELECT 'users' UNION ALL
  SELECT 'roles' UNION ALL
  SELECT 'role_permissions' UNION ALL
  SELECT 'permissions' UNION ALL
  SELECT 'permissions_closure' UNION ALL
  SELECT 'customers' UNION ALL
  SELECT 'customer_groups' UNION ALL
  SELECT 'customer_tags' UNION ALL
  SELECT 'customer_shares' UNION ALL
  SELECT 'customer_assignments' UNION ALL
  SELECT 'customer_service_permissions' UNION ALL
  SELECT 'products' UNION ALL
  SELECT 'product_categories' UNION ALL
  SELECT 'orders' UNION ALL
  SELECT 'order_items' UNION ALL
  SELECT 'order_status_history' UNION ALL
  SELECT 'order_audits' UNION ALL
  SELECT 'order_field_configs' UNION ALL
  SELECT 'follow_up_records' UNION ALL
  SELECT 'after_sales_services' UNION ALL
  SELECT 'service_records' UNION ALL
  SELECT 'service_follow_up_records' UNION ALL
  SELECT 'service_operation_logs' UNION ALL
  SELECT 'data_records' UNION ALL
  SELECT 'logistics' UNION ALL
  SELECT 'logistics_status' UNION ALL
  SELECT 'logistics_traces' UNION ALL
  SELECT 'logistics_tracking' UNION ALL
  SELECT 'logistics_companies' UNION ALL
  SELECT 'logistics_api_configs' UNION ALL
  SELECT 'logistics_exceptions' UNION ALL
  SELECT 'logistics_status_history' UNION ALL
  SELECT 'logistics_todos' UNION ALL
  -- ===== 通话管理 =====
  SELECT 'call_records' UNION ALL
  SELECT 'call_lines' UNION ALL
  SELECT 'call_recordings' UNION ALL
  SELECT 'global_call_config' UNION ALL
  SELECT 'phone_configs' UNION ALL
  SELECT 'phone_blacklist' UNION ALL
  SELECT 'work_phones' UNION ALL
  SELECT 'user_line_assignments' UNION ALL
  SELECT 'outbound_tasks' UNION ALL
  SELECT 'device_bind_logs' UNION ALL
  SELECT 'device_bindlogs' UNION ALL
  -- ===== 短信管理 =====
  SELECT 'sms_templates' UNION ALL
  SELECT 'sms_records' UNION ALL
  -- ===== 消息通知 =====
  SELECT 'messages' UNION ALL
  SELECT 'message_subscriptions' UNION ALL
  SELECT 'message_read_status' UNION ALL
  SELECT 'message_cleanup_history' UNION ALL
  SELECT 'notifications' UNION ALL
  SELECT 'notification_channels' UNION ALL
  SELECT 'notification_logs' UNION ALL
  SELECT 'notification_templates' UNION ALL
  SELECT 'announcements' UNION ALL
  SELECT 'announcement_reads' UNION ALL
  SELECT 'system_announcements' UNION ALL
  SELECT 'system_messages' UNION ALL
  -- ===== 系统配置 =====
  SELECT 'system_configs' UNION ALL
  SELECT 'system_settings' UNION ALL
  SELECT 'operation_logs' UNION ALL
  SELECT 'logs' UNION ALL
  SELECT 'user_permissions' UNION ALL
  SELECT 'sensitive_info_permissions' UNION ALL
  SELECT 'payment_method_options' UNION ALL
  SELECT 'department_order_limits' UNION ALL
  SELECT 'department_subscription_configs' UNION ALL
  SELECT 'improvement_goals' UNION ALL
  SELECT 'rejection_reasons' UNION ALL
  -- ===== 业绩管理 =====
  SELECT 'performance_records' UNION ALL
  SELECT 'performance_metrics' UNION ALL
  SELECT 'performance_shares' UNION ALL
  SELECT 'performance_share_members' UNION ALL
  SELECT 'performance_config' UNION ALL
  SELECT 'performance_report_configs' UNION ALL
  SELECT 'performance_report_logs' UNION ALL
  SELECT 'commission_setting' UNION ALL
  SELECT 'commission_ladder' UNION ALL
  -- ===== 增值管理 =====
  SELECT 'outsource_companies' UNION ALL
  SELECT 'value_added_orders' UNION ALL
  SELECT 'value_added_price_config' UNION ALL
  SELECT 'value_added_status_configs' UNION ALL
  SELECT 'value_added_remark_presets' UNION ALL
  -- ===== 代收管理 =====
  SELECT 'cod_cancel_applications' UNION ALL
  -- ===== 平台管理后台表 =====
  SELECT 'admin_users' UNION ALL
  SELECT 'admin_operation_logs' UNION ALL
  SELECT 'admin_notifications' UNION ALL
  SELECT 'admin_notification_channels' UNION ALL
  SELECT 'admin_notification_rules' UNION ALL
  SELECT 'tenants' UNION ALL
  SELECT 'tenant_packages' UNION ALL
  SELECT 'tenant_settings' UNION ALL
  SELECT 'tenant_logs' UNION ALL
  SELECT 'tenant_license_logs' UNION ALL
  SELECT 'licenses' UNION ALL
  SELECT 'license_logs' UNION ALL
  SELECT 'versions' UNION ALL
  SELECT 'changelogs' UNION ALL
  SELECT 'modules' UNION ALL
  SELECT 'module_configs' UNION ALL
  SELECT 'module_status' UNION ALL
  SELECT 'module_schemes' UNION ALL
  SELECT 'api_configs' UNION ALL
  SELECT 'api_call_logs' UNION ALL
  SELECT 'api_interfaces' UNION ALL
  SELECT 'api_statistics' UNION ALL
  SELECT 'private_customers' UNION ALL
  SELECT 'private_deployments' UNION ALL
  SELECT 'system_license' UNION ALL
  SELECT 'payment_configs' UNION ALL
  SELECT 'payment_logs' UNION ALL
  SELECT 'payment_orders' UNION ALL
  SELECT 'payment_records' UNION ALL
  -- ===== 企业微信 =====
  SELECT 'wecom_configs' UNION ALL
  SELECT 'wecom_user_bindings' UNION ALL
  SELECT 'wecom_customers' UNION ALL
  SELECT 'wecom_acquisition_links' UNION ALL
  SELECT 'wecom_service_accounts' UNION ALL
  SELECT 'wecom_chat_records' UNION ALL
  SELECT 'wecom_payment_records' UNION ALL
  -- ===== 微信公众号 =====
  SELECT 'wechat_followers' UNION ALL
  SELECT 'wechat_message_logs' UNION ALL
  SELECT 'wechat_official_account_config' UNION ALL
  SELECT 'wechat_qrcode_scenes'
) t
LEFT JOIN information_schema.TABLES s
  ON s.TABLE_SCHEMA = DATABASE() AND s.TABLE_NAME = t.table_name
ORDER BY
  CASE WHEN s.TABLE_NAME IS NULL THEN 0 ELSE 1 END,  -- 不存在的排前面
  t.table_name;


-- =============================================
-- 第二部分：检查所有核心业务表的 tenant_id 字段
-- =============================================

SELECT '========== 第二部分：检查 tenant_id 字段 ==========' AS `诊断阶段`;

-- 检查哪些业务表缺少 tenant_id 字段
SELECT
  t.table_name AS `表名`,
  CASE WHEN c.COLUMN_NAME IS NOT NULL THEN '✓ 已有 tenant_id' ELSE '✗ 缺少 tenant_id' END AS `tenant_id状态`,
  CASE WHEN i.INDEX_NAME IS NOT NULL THEN '✓ 有索引' ELSE '✗ 无索引' END AS `tenant_id索引`
FROM (
  -- 需要 tenant_id 的业务表列表（排除系统级共享表）
  SELECT 'users' AS table_name UNION ALL
  SELECT 'roles' UNION ALL
  SELECT 'permissions' UNION ALL
  SELECT 'departments' UNION ALL
  SELECT 'customers' UNION ALL
  SELECT 'customer_groups' UNION ALL
  SELECT 'customer_tags' UNION ALL
  SELECT 'customer_shares' UNION ALL
  SELECT 'customer_assignments' UNION ALL
  SELECT 'customer_service_permissions' UNION ALL
  SELECT 'products' UNION ALL
  SELECT 'product_categories' UNION ALL
  SELECT 'orders' UNION ALL
  SELECT 'order_items' UNION ALL
  SELECT 'order_status_history' UNION ALL
  SELECT 'order_audits' UNION ALL
  SELECT 'order_field_configs' UNION ALL
  SELECT 'follow_up_records' UNION ALL
  SELECT 'after_sales_services' UNION ALL
  SELECT 'service_records' UNION ALL
  SELECT 'service_follow_up_records' UNION ALL
  SELECT 'service_operation_logs' UNION ALL
  SELECT 'data_records' UNION ALL
  SELECT 'logistics' UNION ALL
  SELECT 'logistics_status' UNION ALL
  SELECT 'logistics_traces' UNION ALL
  SELECT 'logistics_tracking' UNION ALL
  SELECT 'logistics_companies' UNION ALL
  SELECT 'logistics_api_configs' UNION ALL
  SELECT 'logistics_exceptions' UNION ALL
  SELECT 'logistics_status_history' UNION ALL
  SELECT 'logistics_todos' UNION ALL
  SELECT 'call_records' UNION ALL
  SELECT 'call_lines' UNION ALL
  SELECT 'call_recordings' UNION ALL
  SELECT 'global_call_config' UNION ALL
  SELECT 'phone_configs' UNION ALL
  SELECT 'phone_blacklist' UNION ALL
  SELECT 'work_phones' UNION ALL
  SELECT 'user_line_assignments' UNION ALL
  SELECT 'outbound_tasks' UNION ALL
  SELECT 'device_bind_logs' UNION ALL
  SELECT 'device_bindlogs' UNION ALL
  SELECT 'sms_templates' UNION ALL
  SELECT 'sms_records' UNION ALL
  SELECT 'messages' UNION ALL
  SELECT 'message_subscriptions' UNION ALL
  SELECT 'message_read_status' UNION ALL
  SELECT 'notifications' UNION ALL
  SELECT 'notification_channels' UNION ALL
  SELECT 'notification_logs' UNION ALL
  SELECT 'notification_templates' UNION ALL
  SELECT 'announcements' UNION ALL
  SELECT 'announcement_reads' UNION ALL
  SELECT 'system_messages' UNION ALL
  SELECT 'system_configs' UNION ALL
  SELECT 'operation_logs' UNION ALL
  SELECT 'logs' UNION ALL
  SELECT 'user_permissions' UNION ALL
  SELECT 'sensitive_info_permissions' UNION ALL
  SELECT 'payment_method_options' UNION ALL
  SELECT 'department_order_limits' UNION ALL
  SELECT 'department_subscription_configs' UNION ALL
  SELECT 'improvement_goals' UNION ALL
  SELECT 'rejection_reasons' UNION ALL
  SELECT 'performance_records' UNION ALL
  SELECT 'performance_metrics' UNION ALL
  SELECT 'performance_shares' UNION ALL
  SELECT 'performance_share_members' UNION ALL
  SELECT 'performance_config' UNION ALL
  SELECT 'performance_report_configs' UNION ALL
  SELECT 'performance_report_logs' UNION ALL
  SELECT 'commission_setting' UNION ALL
  SELECT 'commission_ladder' UNION ALL
  SELECT 'outsource_companies' UNION ALL
  SELECT 'value_added_orders' UNION ALL
  SELECT 'value_added_price_config' UNION ALL
  SELECT 'value_added_status_configs' UNION ALL
  SELECT 'value_added_remark_presets' UNION ALL
  SELECT 'cod_cancel_applications' UNION ALL
  SELECT 'wecom_configs' UNION ALL
  SELECT 'wecom_user_bindings' UNION ALL
  SELECT 'wecom_customers' UNION ALL
  SELECT 'wecom_acquisition_links' UNION ALL
  SELECT 'wecom_service_accounts' UNION ALL
  SELECT 'wecom_chat_records' UNION ALL
  SELECT 'wecom_payment_records'
) t
LEFT JOIN information_schema.COLUMNS c
  ON c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = t.table_name AND c.COLUMN_NAME = 'tenant_id'
LEFT JOIN information_schema.STATISTICS i
  ON i.TABLE_SCHEMA = DATABASE() AND i.TABLE_NAME = t.table_name AND i.COLUMN_NAME = 'tenant_id'
GROUP BY t.table_name, c.COLUMN_NAME, i.INDEX_NAME
ORDER BY
  CASE WHEN c.COLUMN_NAME IS NULL THEN 0 ELSE 1 END,
  t.table_name;


-- =============================================
-- 第三部分：检查各表字段完整性（与 schema.sql 对比）
-- =============================================

SELECT '========== 第三部分：检查关键字段 ==========' AS `诊断阶段`;

-- 3.1 users 表关键字段检查
SELECT 'users' AS `表名`, GROUP_CONCAT(col.column_name SEPARATOR ', ') AS `缺失字段`
FROM (
  SELECT 'tenant_id' AS column_name UNION ALL
  SELECT 'username' UNION ALL
  SELECT 'password' UNION ALL
  SELECT 'name' UNION ALL
  SELECT 'email' UNION ALL
  SELECT 'phone' UNION ALL
  SELECT 'role_id' UNION ALL
  SELECT 'department_id' UNION ALL
  SELECT 'status' UNION ALL
  SELECT 'avatar' UNION ALL
  SELECT 'employment_status' UNION ALL
  SELECT 'remarks' UNION ALL
  SELECT 'deleted_at' UNION ALL
  SELECT 'last_login_time'
) col
WHERE col.column_name NOT IN (
  SELECT COLUMN_NAME FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
);

-- 3.2 orders 表关键字段检查
SELECT 'orders' AS `表名`, GROUP_CONCAT(col.column_name SEPARATOR ', ') AS `缺失字段`
FROM (
  SELECT 'tenant_id' AS column_name UNION ALL
  SELECT 'order_no' UNION ALL
  SELECT 'customer_id' UNION ALL
  SELECT 'status' UNION ALL
  SELECT 'total_amount' UNION ALL
  SELECT 'express_company' UNION ALL
  SELECT 'logistics_no' UNION ALL
  SELECT 'cod_amount' UNION ALL
  SELECT 'cod_status' UNION ALL
  SELECT 'deleted_at' UNION ALL
  SELECT 'created_by' UNION ALL
  SELECT 'created_by_department_id'
) col
WHERE col.column_name NOT IN (
  SELECT COLUMN_NAME FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
);

-- 3.3 customers 表关键字段检查
SELECT 'customers' AS `表名`, GROUP_CONCAT(col.column_name SEPARATOR ', ') AS `缺失字段`
FROM (
  SELECT 'tenant_id' AS column_name UNION ALL
  SELECT 'name' UNION ALL
  SELECT 'phone' UNION ALL
  SELECT 'email' UNION ALL
  SELECT 'status' UNION ALL
  SELECT 'source' UNION ALL
  SELECT 'assigned_to' UNION ALL
  SELECT 'deleted_at'
) col
WHERE col.column_name NOT IN (
  SELECT COLUMN_NAME FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers'
);

-- 3.4 roles 表关键字段检查
SELECT 'roles' AS `表名`, GROUP_CONCAT(col.column_name SEPARATOR ', ') AS `缺失字段`
FROM (
  SELECT 'tenant_id' AS column_name UNION ALL
  SELECT 'name' UNION ALL
  SELECT 'code' UNION ALL
  SELECT 'type' UNION ALL
  SELECT 'permissions' UNION ALL
  SELECT 'is_system' UNION ALL
  SELECT 'description'
) col
WHERE col.column_name NOT IN (
  SELECT COLUMN_NAME FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles'
);


-- =============================================
-- 第四部分：统计概览
-- =============================================

SELECT '========== 第四部分：数据库统计概览 ==========' AS `诊断阶段`;

-- 4.1 总表数量
SELECT COUNT(*) AS `数据库当前表总数`
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE();

-- 4.2 所有表的记录数
SELECT
  TABLE_NAME AS `表名`,
  TABLE_ROWS AS `大约行数`,
  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS `数据大小(MB)`,
  ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS `索引大小(MB)`
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_ROWS DESC;

-- 4.3 检查哪些表有数据（非空表）
SELECT
  TABLE_NAME AS `表名`,
  TABLE_ROWS AS `行数`
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_ROWS > 0
ORDER BY TABLE_ROWS DESC;

SELECT '✅ 诊断脚本执行完成！请根据以上结果执行对应的迁移脚本' AS `完成提示`;

