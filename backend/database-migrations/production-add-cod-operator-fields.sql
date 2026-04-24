-- =====================================================
-- 生产环境：为orders表添加代收操作人字段
-- 执行时间：2026-03-24
-- 说明：添加改代收和改返款的操作人字段
-- =====================================================

-- 添加改代收操作人ID字段
ALTER TABLE `orders` 
ADD COLUMN `cod_cancelled_by` varchar(36) DEFAULT NULL COMMENT '改代收操作人ID' AFTER `cod_cancelled_at`;

-- 添加改代收操作人姓名字段
ALTER TABLE `orders` 
ADD COLUMN `cod_cancelled_by_name` varchar(50) DEFAULT NULL COMMENT '改代收操作人姓名' AFTER `cod_cancelled_by`;

-- 添加返款操作人ID字段
ALTER TABLE `orders` 
ADD COLUMN `cod_returned_by` varchar(36) DEFAULT NULL COMMENT '返款操作人ID' AFTER `cod_returned_at`;

-- 添加返款操作人姓名字段
ALTER TABLE `orders` 
ADD COLUMN `cod_returned_by_name` varchar(50) DEFAULT NULL COMMENT '返款操作人姓名' AFTER `cod_returned_by`;

-- 验证字段是否添加成功
SELECT 
  COLUMN_NAME AS '字段名',
  COLUMN_TYPE AS '类型',
  IS_NULLABLE AS '可空',
  COLUMN_DEFAULT AS '默认值',
  COLUMN_COMMENT AS '注释'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'orders'
  AND COLUMN_NAME IN ('cod_cancelled_by', 'cod_cancelled_by_name', 'cod_returned_by', 'cod_returned_by_name')
ORDER BY ORDINAL_POSITION;
