-- ============================================================
-- 批量导入客户功能 - 生产环境SQL（兼容phpMyAdmin）
-- 适用于 CRM 1.8.0+
-- 执行日期: 2026-04-19
-- ============================================================

-- 注意：批量导入和批量分享功能不需要新建数据库表
-- 它们复用现有的 customers 和 customer_shares 表
-- 以下SQL仅用于确认表结构完整性

-- 1. 确认 customers 表存在 custom_fields 字段（用于存储自定义字段数据）
SELECT COUNT(*) AS has_custom_fields
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'customers'
  AND COLUMN_NAME = 'custom_fields';

-- 如果上面查询返回0，执行以下语句添加字段（一般已存在）：
-- ALTER TABLE `customers` ADD COLUMN `custom_fields` JSON DEFAULT NULL COMMENT '自定义字段数据' AFTER `other_goals`;

-- 2. 确认索引存在（提升批量导入时的手机号查重性能）
-- 如果 idx_customers_tenant_phone 索引不存在，执行：
-- CREATE INDEX `idx_customers_tenant_phone` ON `customers` (`tenant_id`, `phone`);

-- 3. 验证 customer_shares 表结构完整（批量分享功能依赖）
SELECT COUNT(*) AS shares_table_exists
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'customer_shares';

-- ============================================================
-- 无需执行任何DDL，所有表结构已在schema.sql中定义
-- 批量导入通过后端API /customers/batch-import 实现
-- 批量分享复用现有 /customer-share/share API 逐条执行
-- ============================================================

