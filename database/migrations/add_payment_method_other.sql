-- =============================================
-- 添加支付方式其他说明字段
-- 版本：1.8.3
-- 更新时间：2024-12-09
-- 说明：为订单表添加 payment_method_other 字段
-- =============================================

SET NAMES utf8mb4;

-- 检查并添加 payment_method_other 字段
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'orders' 
    AND COLUMN_NAME = 'payment_method_other'
);
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE `orders` ADD COLUMN `payment_method_other` VARCHAR(100) NULL COMMENT ''其他支付方式说明'' AFTER `payment_method`',
    'SELECT ''payment_method_other already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 完成提示
SELECT '支付方式其他说明字段添加完成' AS message;
