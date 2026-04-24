-- =============================================
-- 第一阶段：任务1.4 — 清理 orders 表冗余索引
-- 日期：2026-03-30
--
-- ⚠️ 注意：请先备份数据库再执行！
-- ⚠️ 注意：请在执行完 20260330-phase1-tenant-indexes-optimization.sql 之后再执行本脚本！
--
-- 背景：
--   orders 表当前有 27+ 个索引（含PK），严重影响写入性能
--   每次 INSERT/UPDATE 都需更新所有索引，占用大量磁盘空间
--
-- 策略：
--   1. 删除被 tenant_id 复合索引完全覆盖的单列索引
--   2. 删除极低基数（cardinality）的无效索引
--   3. 删除极少独立查询的索引
--   4. 目标：从 27 个降至约 16 个（含PK）
--
-- 预期效果：写入性能提升约 20-30%
-- =============================================


-- =============================================
-- 第一类：被复合索引完全覆盖的单列索引（5个）
-- 这些单列索引在有了 tenant_id 复合索引后完全冗余
-- =============================================

-- idx_status → 被 idx_orders_tenant_status (tenant_id, status) 覆盖
-- 多租户查询必带 tenant_id，单列 status 索引无法被利用
ALTER TABLE `orders` DROP INDEX IF EXISTS `idx_status`;

-- idx_customer → 被 idx_orders_tenant_customer (tenant_id, customer_id) 覆盖
ALTER TABLE `orders` DROP INDEX IF EXISTS `idx_customer`;

-- idx_created_by → 被 idx_orders_tenant_created_by (tenant_id, created_by) 覆盖
ALTER TABLE `orders` DROP INDEX IF EXISTS `idx_created_by`;

-- idx_created_at → 被 idx_orders_tenant_created_at (tenant_id, created_at) 覆盖
ALTER TABLE `orders` DROP INDEX IF EXISTS `idx_created_at`;

-- idx_order_number → 被 uk_tenant_order_number (tenant_id, order_number) UNIQUE 覆盖
-- 订单号查询几乎都在租户上下文中进行
ALTER TABLE `orders` DROP INDEX IF EXISTS `idx_order_number`;


-- =============================================
-- 第二类：被新增复合索引覆盖的单列索引（1个）
-- =============================================

-- idx_payment_status → 被 idx_orders_tenant_payment_status (tenant_id, payment_status) 覆盖
-- 财务模块查询支付状态时必然带租户条件
ALTER TABLE `orders` DROP INDEX IF EXISTS `idx_payment_status`;


-- =============================================
-- 第三类：极低基数或极少独立查询的索引（5个）
-- =============================================

-- idx_mark_type → 基数极低（normal/important/urgent 仅3个值），
-- 选择性不足5%，MySQL优化器大概率不会使用此索引
ALTER TABLE `orders` DROP INDEX IF EXISTS `idx_mark_type`;

-- idx_is_todo → 布尔值（0/1），基数仅2，索引几乎无效
ALTER TABLE `orders` DROP INDEX IF EXISTS `idx_is_todo`;

-- idx_order_source → 枚举值，基数很低（5-10种来源），独立查询极少
ALTER TABLE `orders` DROP INDEX IF EXISTS `idx_order_source`;

-- idx_shipping_time → VARCHAR字段存储发货时间字符串，
-- 极少作为独立查询条件，shipped_at(TIMESTAMP)更适合时间查询
ALTER TABLE `orders` DROP INDEX IF EXISTS `idx_shipping_time`;

-- idx_expected_delivery_date → 预计送达日期，独立查询频率很低
ALTER TABLE `orders` DROP INDEX IF EXISTS `idx_expected_delivery_date`;


-- =============================================
-- 验证：查看清理后的索引列表
-- =============================================
SELECT
  INDEX_NAME AS '索引名',
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS '索引列',
  CASE NON_UNIQUE WHEN 0 THEN 'UNIQUE' ELSE 'INDEX' END AS '类型'
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'orders'
GROUP BY INDEX_NAME, NON_UNIQUE
ORDER BY INDEX_NAME;

-- 统计最终索引数量
SELECT
  COUNT(DISTINCT INDEX_NAME) AS 'orders表最终索引数量'
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'orders';


-- =============================================
-- 清理结果说明
-- =============================================
-- 删除了 11 个冗余/低效索引：
--   ❌ idx_status (被 tenant_id+status 复合索引覆盖)
--   ❌ idx_customer (被 tenant_id+customer_id 复合索引覆盖)
--   ❌ idx_created_by (被 tenant_id+created_by 复合索引覆盖)
--   ❌ idx_created_at (被 tenant_id+created_at 复合索引覆盖)
--   ❌ idx_order_number (被 uk_tenant_order_number UNIQUE 覆盖)
--   ❌ idx_payment_status (被 tenant_id+payment_status 复合索引覆盖)
--   ❌ idx_mark_type (极低基数，无效索引)
--   ❌ idx_is_todo (布尔值，无效索引)
--   ❌ idx_order_source (低基数，独立查询极少)
--   ❌ idx_shipping_time (极少独立查询)
--   ❌ idx_expected_delivery_date (极少独立查询)
--
-- 保留的索引（约16个含PK）：
--   ✅ PRIMARY (id)
--   ✅ uk_tenant_order_number (tenant_id, order_number) — 唯一约束
--   ✅ idx_tracking_number (tracking_number) — 物流单号查询
--   ✅ idx_logistics_status (logistics_status) — 物流状态筛选
--   ✅ idx_todo_date (todo_date) — 待办日期查询
--   ✅ idx_shipped_at (shipped_at) — 发货时间查询
--   ✅ idx_delivered_at (delivered_at) — 签收时间查询
--   ✅ idx_performance_status (performance_status) — 业绩状态
--   ✅ idx_cod_status (cod_status) — 代收状态
--   ✅ idx_status_updated_at (status_updated_at) — 状态更新时间
--   ✅ idx_orders_tenant_id (tenant_id) — 基础租户过滤
--   ✅ idx_orders_tenant_status (tenant_id, status)
--   ✅ idx_orders_tenant_customer (tenant_id, customer_id)
--   ✅ idx_orders_tenant_created_by (tenant_id, created_by)
--   ✅ idx_orders_tenant_created_at (tenant_id, created_at)
--   ✅ idx_orders_tenant_status_created (tenant_id, status, created_at)
--   ✅ idx_orders_tenant_payment_status (tenant_id, payment_status)
--   ✅ idx_orders_updated_at (updated_at)

