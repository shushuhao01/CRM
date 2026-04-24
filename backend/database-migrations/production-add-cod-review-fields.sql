-- =====================================================
-- 生产环境：代收管理详情弹窗字段完善
-- 执行时间：2026-03-24
-- 说明：确保 cod_cancel_applications 表包含审核人和审核时间字段
-- =====================================================

-- 检查并添加 reviewer_id 字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'cod_cancel_applications' 
  AND COLUMN_NAME = 'reviewer_id';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `cod_cancel_applications` ADD COLUMN `reviewer_id` varchar(36) DEFAULT NULL COMMENT ''审核人ID'' AFTER `status`',
  'SELECT ''字段 reviewer_id 已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 reviewer_name 字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'cod_cancel_applications' 
  AND COLUMN_NAME = 'reviewer_name';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `cod_cancel_applications` ADD COLUMN `reviewer_name` varchar(50) DEFAULT NULL COMMENT ''审核人姓名（操作人）'' AFTER `reviewer_id`',
  'SELECT ''字段 reviewer_name 已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 review_remark 字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'cod_cancel_applications' 
  AND COLUMN_NAME = 'review_remark';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `cod_cancel_applications` ADD COLUMN `review_remark` text DEFAULT NULL COMMENT ''审核备注'' AFTER `reviewer_name`',
  'SELECT ''字段 review_remark 已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 reviewed_at 字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'cod_cancel_applications' 
  AND COLUMN_NAME = 'reviewed_at';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `cod_cancel_applications` ADD COLUMN `reviewed_at` datetime DEFAULT NULL COMMENT ''审核时间（处理时间）'' AFTER `review_remark`',
  'SELECT ''字段 reviewed_at 已存在'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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

-- 完成提示
SELECT '✅ 代收管理详情弹窗字段完善完成！' AS message;
SELECT '📝 新增字段说明：' AS message;
SELECT '  - reviewer_id: 审核人ID' AS message;
SELECT '  - reviewer_name: 审核人姓名（操作人）' AS message;
SELECT '  - review_remark: 审核备注' AS message;
SELECT '  - reviewed_at: 审核时间（处理时间）' AS message;
