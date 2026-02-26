-- =============================================
-- 添加订单状态更新时间字段
-- 用于记录订单状态变更的时间（如签收、发货等）
-- 执行时间：2026-02-26
-- =============================================

-- 1. 为 orders 表添加 status_updated_at 字段
ALTER TABLE `orders` 
ADD COLUMN `status_updated_at` TIMESTAMP NULL COMMENT '状态更新时间（记录最后一次状态变更的时间）' AFTER `updated_at`;

-- 2. 添加索引以提升查询性能
ALTER TABLE `orders` 
ADD INDEX `idx_status_updated_at` (`status_updated_at`);

-- 3. 初始化现有数据的 status_updated_at
-- 对于已签收的订单，使用 delivered_at
UPDATE `orders` 
SET `status_updated_at` = `delivered_at` 
WHERE `delivered_at` IS NOT NULL;

-- 对于已发货但未签收的订单，使用 shipped_at
UPDATE `orders` 
SET `status_updated_at` = `shipped_at` 
WHERE `shipped_at` IS NOT NULL AND `delivered_at` IS NULL;

-- 对于其他订单，使用 updated_at
UPDATE `orders` 
SET `status_updated_at` = `updated_at` 
WHERE `status_updated_at` IS NULL;

-- 验证结果
SELECT 
    COUNT(*) as total_orders,
    COUNT(`status_updated_at`) as orders_with_status_time,
    COUNT(`delivered_at`) as delivered_orders,
    COUNT(`shipped_at`) as shipped_orders
FROM `orders`;

-- 查看示例数据
SELECT 
    id,
    order_number,
    status,
    shipped_at,
    delivered_at,
    status_updated_at,
    updated_at
FROM `orders`
ORDER BY updated_at DESC
LIMIT 10;
