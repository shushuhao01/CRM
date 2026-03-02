-- =============================================
-- 添加 express_company 字段到 value_added_orders 表
-- 用于记录物流公司信息
-- =============================================

-- 检查字段是否已存在，如果不存在则添加
SET @dbname = DATABASE();
SET @tablename = 'value_added_orders';
SET @columnname = 'express_company';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1', -- 字段已存在，不执行任何操作
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` VARCHAR(50) NULL COMMENT ''物流公司'' AFTER `tracking_number`')
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 验证字段是否添加成功
SELECT 
  COLUMN_NAME, 
  COLUMN_TYPE, 
  IS_NULLABLE, 
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE 
  TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'value_added_orders'
  AND COLUMN_NAME = 'express_company';

-- =============================================
-- 执行完成！
-- 
-- 说明：
-- 1. 此脚本会自动检查字段是否存在
-- 2. 如果字段不存在，则添加
-- 3. 如果字段已存在，则跳过
-- 4. 最后会显示字段信息以确认
-- =============================================
