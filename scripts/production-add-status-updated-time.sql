-- =============================================
-- 生产环境：添加订单状态更新时间字段
-- 执行时间：2026-02-26
-- 数据库：crm (生产环境)
-- =============================================

USE crm;

-- 1. 添加 status_updated_at 字段
ALTER TABLE `orders` 
ADD COLUMN `status_updated_at` TIMESTAMP NULL COMMENT '状态更新时间（记录最后一次状态变更的时间）' AFTER `updated_at`;

-- 2. 添加索引
ALTER TABLE `orders` 
ADD INDEX `idx_status_updated_at` (`status_updated_at`);

-- 3. 初始化现有数据
-- 已签收的订单使用 delivered_at
UPDATE `orders` 
SET `status_updated_at` = `delivered_at` 
WHERE `delivered_at` IS NOT NULL;

-- 已发货但未签收的订单使用 shipped_at
UPDATE `orders` 
SET `status_updated_at` = `shipped_at` 
WHERE `shipped_at` IS NOT NULL AND `delivered_at` IS NULL;

-- 其他订单使用 updated_at
UPDATE `orders` 
SET `status_updated_at` = `updated_at` 
WHERE `status_updated_at` IS NULL;

-- 4. 验证结果
SELECT 
    '订单总数' as item,
    COUNT(*) as count
FROM `orders`
UNION ALL
SELECT 
    '有状态更新时间的订单',
    COUNT(`status_updated_at`)
FROM `orders`
UNION ALL
SELECT 
    '已签收订单',
    COUNT(`delivered_at`)
FROM `orders`
UNION ALL
SELECT 
    '已发货订单',
    COUNT(`shipped_at`)
FROM `orders`;

-- 5. 查看示例数据
SELECT 
    order_number as '订单号',
    status as '状态',
    DATE_FORMAT(shipped_at, '%Y-%m-%d %H:%i:%s') as '发货时间',
    DATE_FORMAT(delivered_at, '%Y-%m-%d %H:%i:%s') as '签收时间',
    DATE_FORMAT(status_updated_at, '%Y-%m-%d %H:%i:%s') as '状态更新时间'
FROM `orders`
WHERE status_updated_at IS NOT NULL
ORDER BY status_updated_at DESC
LIMIT 10;
