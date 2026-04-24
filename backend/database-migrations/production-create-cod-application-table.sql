-- =====================================================
-- 生产环境：创建代收申请表并添加审核字段
-- 执行时间：2026-03-24
-- 说明：先创建表（如果不存在），再添加审核相关字段
-- =====================================================

-- 步骤1：创建代收取消申请表（如果不存在）
CREATE TABLE IF NOT EXISTS `cod_cancel_applications` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) NOT NULL COMMENT '订单ID',
  `order_number` varchar(50) DEFAULT NULL COMMENT '订单号',
  `customer_id` varchar(36) DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) DEFAULT NULL COMMENT '客户姓名',
  `original_cod_amount` decimal(10,2) DEFAULT 0.00 COMMENT '原代收金额',
  `new_cod_amount` decimal(10,2) DEFAULT 0.00 COMMENT '新代收金额',
  `reason` text COMMENT '申请原因',
  `status` varchar(20) DEFAULT 'pending' COMMENT '状态：pending-待审核, approved-已通过, rejected-已拒绝',
  `applicant_id` varchar(36) DEFAULT NULL COMMENT '申请人ID',
  `applicant_name` varchar(50) DEFAULT NULL COMMENT '申请人姓名',
  `applied_at` datetime DEFAULT NULL COMMENT '申请时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '租户ID',
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_status` (`status`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_applied_at` (`applied_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代收取消申请表';

-- 步骤2：检查并添加 reviewer_id 字段
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

-- 步骤3：检查并添加 reviewer_name 字段
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

-- 步骤4：检查并添加 review_remark 字段
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

-- 步骤5：检查并添加 reviewed_at 字段
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

-- 验证表结构
SELECT 
  COLUMN_NAME AS '字段名',
  COLUMN_TYPE AS '类型',
  IS_NULLABLE AS '可空',
  COLUMN_DEFAULT AS '默认值',
  COLUMN_COMMENT AS '注释'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'cod_cancel_applications'
ORDER BY ORDINAL_POSITION;
