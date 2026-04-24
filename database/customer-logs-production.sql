-- ============================================================
-- 客户操作日志表 - 生产环境SQL（兼容phpMyAdmin）
-- 适用于 CRM 1.8.0+
-- 执行日期: 2026-04-19
-- ============================================================

-- 创建客户操作日志表（审计追踪）
CREATE TABLE IF NOT EXISTS `customer_logs` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '日志ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `log_type` VARCHAR(30) NOT NULL COMMENT '操作类型: create/edit/delete/share/add_phone/edit_info/add_order/add_tag/remove_tag/add_followup/edit_followup/add_medical/edit_notes/view/other',
  `content` TEXT NOT NULL COMMENT '日志内容描述',
  `detail` JSON NULL COMMENT '详细变更数据(JSON)',
  `operator_id` VARCHAR(50) NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(100) NULL COMMENT '操作人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_customer_logs_tenant` (`tenant_id`),
  INDEX `idx_customer_logs_customer_time` (`customer_id`, `created_at` DESC),
  INDEX `idx_customer_logs_type` (`log_type`),
  INDEX `idx_customer_logs_operator` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户操作日志表（审计追踪）';

-- ============================================================
-- 执行完成后验证
-- ============================================================
SELECT COUNT(*) AS table_exists
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'customer_logs';

