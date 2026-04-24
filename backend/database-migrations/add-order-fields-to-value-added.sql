-- ============================================
-- 增值订单表添加订单状态和下单日期字段
-- 创建时间: 2026-02-28
-- 说明: 添加order_status和order_date字段
-- ============================================

SET NAMES utf8mb4;

-- 添加订单状态字段
ALTER TABLE `value_added_orders` 
ADD COLUMN `order_status` VARCHAR(20) NULL COMMENT '订单状态' AFTER `tracking_number`;

-- 添加下单日期字段
ALTER TABLE `value_added_orders` 
ADD COLUMN `order_date` DATETIME NULL COMMENT '下单日期' AFTER `order_status`;

-- 添加索引
ALTER TABLE `value_added_orders` 
ADD KEY `idx_order_status` (`order_status`),
ADD KEY `idx_order_date` (`order_date`);

-- ============================================
-- 迁移完成提示
-- ============================================
-- 已添加字段：
--   1. order_status - 订单状态
--   2. order_date - 下单日期
