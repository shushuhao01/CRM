-- ============================================================
-- 修复生产环境缺失字段 - v1.8.0
-- 日期: 2026-04-26
-- 问题: schema.sql 缺少 customers.star_rating/final_score 和
--       orders.cod_returned_by/cod_returned_by_name/cod_cancelled_by/cod_cancelled_by_name
--       导致 API 返回 500 (QueryFailedError: Unknown column)
-- 用法: 在宝塔面板 phpMyAdmin 中直接执行（兼容 phpMyAdmin，无 DELIMITER）
-- ============================================================

-- ==================== customers 表 ====================
-- 添加 star_rating（手动星级评分）
ALTER TABLE `customers` ADD COLUMN `star_rating` INT DEFAULT 0 NULL COMMENT '手动星级评分(1-5)';

-- 添加 final_score（综合评分）
ALTER TABLE `customers` ADD COLUMN `final_score` INT DEFAULT 0 NULL COMMENT '综合评分(0-100)';

-- ==================== orders 表 ====================
-- 添加 cod_returned_by（返款操作人ID）
ALTER TABLE `orders` ADD COLUMN `cod_returned_by` VARCHAR(50) DEFAULT NULL COMMENT '返款操作人ID';

-- 添加 cod_returned_by_name（返款操作人姓名）
ALTER TABLE `orders` ADD COLUMN `cod_returned_by_name` VARCHAR(50) DEFAULT NULL COMMENT '返款操作人姓名';

-- 添加 cod_cancelled_by（取消代收操作人ID）
ALTER TABLE `orders` ADD COLUMN `cod_cancelled_by` VARCHAR(50) DEFAULT NULL COMMENT '取消代收操作人ID';

-- 添加 cod_cancelled_by_name（取消代收操作人姓名）
ALTER TABLE `orders` ADD COLUMN `cod_cancelled_by_name` VARCHAR(50) DEFAULT NULL COMMENT '取消代收操作人姓名';

-- ============================================================
-- 执行完毕后，在服务器上重启后端：pm2 restart crm-backend
-- ============================================================
