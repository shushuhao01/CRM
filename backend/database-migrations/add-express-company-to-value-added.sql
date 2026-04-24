-- =============================================
-- 为增值订单表添加物流公司字段
-- =============================================

-- 添加 express_company 字段（物流公司）
ALTER TABLE `value_added_orders` 
ADD COLUMN `express_company` VARCHAR(50) NULL COMMENT '物流公司' 
AFTER `tracking_number`;

-- 添加 order_status 字段（订单状态）如果不存在
-- ALTER TABLE `value_added_orders` 
-- ADD COLUMN `order_status` VARCHAR(20) NULL COMMENT '订单状态' 
-- AFTER `express_company`;

-- 添加 order_date 字段（下单日期）如果不存在
-- ALTER TABLE `value_added_orders` 
-- ADD COLUMN `order_date` DATETIME NULL COMMENT '下单日期' 
-- AFTER `order_status`;

-- 从关联的订单表更新物流公司信息
UPDATE `value_added_orders` vo
INNER JOIN `orders` o ON vo.order_id = o.id
SET vo.express_company = o.express_company
WHERE vo.order_id IS NOT NULL 
  AND o.express_company IS NOT NULL;

-- =============================================
-- 执行完成！
-- =============================================
