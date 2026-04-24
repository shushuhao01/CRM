-- =============================================
-- 生产环境：检查增值管理相关表是否存在
-- 执行环境：宝塔 phpMyAdmin
-- 执行说明：逐条执行，查看结果
-- =============================================

-- 1. 检查外包公司表
SELECT 
  'outsource_companies' as table_name,
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 不存在' END as status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'outsource_companies';

-- 2. 检查增值订单表
SELECT 
  'value_added_orders' as table_name,
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 不存在' END as status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'value_added_orders';

-- 3. 检查价格档位表
SELECT 
  'value_added_price_config' as table_name,
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 不存在' END as status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'value_added_price_config';

-- 4. 检查状态配置表
SELECT 
  'value_added_status_configs' as table_name,
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 不存在' END as status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'value_added_status_configs';

-- 5. 检查备注预设表
SELECT 
  'value_added_remark_presets' as table_name,
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在' ELSE '✗ 不存在' END as status
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'value_added_remark_presets';

-- 6. 检查外包公司表的字段
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'outsource_companies'
ORDER BY ORDINAL_POSITION;

-- 7. 检查增值订单表的字段
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'value_added_orders'
ORDER BY ORDINAL_POSITION;

-- =============================================
-- 执行完成！查看结果判断缺失哪些表和字段
-- =============================================
