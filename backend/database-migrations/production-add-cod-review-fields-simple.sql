-- =====================================================
-- 生产环境：代收管理详情弹窗字段完善（简化版）
-- 执行时间：2026-03-24
-- 说明：为 cod_cancel_applications 表添加审核人和审核时间字段
-- 注意：如果字段已存在会报错，但不影响数据，可以忽略
-- =====================================================

-- 添加 reviewer_id 字段
ALTER TABLE `cod_cancel_applications` 
ADD COLUMN `reviewer_id` varchar(36) DEFAULT NULL COMMENT '审核人ID' AFTER `status`;

-- 添加 reviewer_name 字段
ALTER TABLE `cod_cancel_applications` 
ADD COLUMN `reviewer_name` varchar(50) DEFAULT NULL COMMENT '审核人姓名（操作人）' AFTER `reviewer_id`;

-- 添加 review_remark 字段
ALTER TABLE `cod_cancel_applications` 
ADD COLUMN `review_remark` text DEFAULT NULL COMMENT '审核备注' AFTER `reviewer_name`;

-- 添加 reviewed_at 字段
ALTER TABLE `cod_cancel_applications` 
ADD COLUMN `reviewed_at` datetime DEFAULT NULL COMMENT '审核时间（处理时间）' AFTER `review_remark`;

-- 验证字段是否添加成功
SELECT 
  COLUMN_NAME AS '字段名',
  COLUMN_TYPE AS '类型',
  IS_NULLABLE AS '可空',
  COLUMN_DEFAULT AS '默认值',
  COLUMN_COMMENT AS '注释'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'cod_cancel_applications'
  AND COLUMN_NAME IN ('reviewer_id', 'reviewer_name', 'review_remark', 'reviewed_at')
ORDER BY ORDINAL_POSITION;
