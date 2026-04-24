-- ============================================
-- 生产环境：为 outsource_companies 表添加缺失字段
-- 执行时间: 2026-03-01
-- 说明: 添加 is_default 和 sort_order 字段，用于支持默认公司和排序功能
-- ============================================

USE crm_production;

-- 检查表是否存在
SELECT '检查 outsource_companies 表是否存在...' AS '';
SELECT COUNT(*) AS table_exists 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'crm_production' 
AND TABLE_NAME = 'outsource_companies';

-- ============================================
-- 1. 添加 is_default 字段
-- ============================================
SELECT '添加 is_default 字段...' AS '';

-- 检查字段是否已存在
SELECT COUNT(*) AS field_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'crm_production' 
AND TABLE_NAME = 'outsource_companies' 
AND COLUMN_NAME = 'is_default';

-- 如果字段不存在，则添加
ALTER TABLE outsource_companies 
ADD COLUMN IF NOT EXISTS is_default TINYINT DEFAULT 0 COMMENT '是否默认公司: 0-否, 1-是'
AFTER default_unit_price;

SELECT '✓ is_default 字段添加完成' AS '';

-- ============================================
-- 2. 添加 sort_order 字段
-- ============================================
SELECT '添加 sort_order 字段...' AS '';

-- 检查字段是否已存在
SELECT COUNT(*) AS field_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'crm_production' 
AND TABLE_NAME = 'outsource_companies' 
AND COLUMN_NAME = 'sort_order';

-- 如果字段不存在，则添加
ALTER TABLE outsource_companies 
ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 999 COMMENT '排序顺序'
AFTER is_default;

SELECT '✓ sort_order 字段添加完成' AS '';

-- ============================================
-- 3. 添加索引
-- ============================================
SELECT '添加 sort_order 索引...' AS '';

-- 检查索引是否已存在
SELECT COUNT(*) AS index_exists 
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'crm_production' 
AND TABLE_NAME = 'outsource_companies' 
AND INDEX_NAME = 'idx_sort_order';

-- 如果索引不存在，则添加
-- 注意：MySQL 不支持 CREATE INDEX IF NOT EXISTS，需要手动检查
-- 如果上面查询返回 0，则执行下面的语句
-- ALTER TABLE outsource_companies ADD INDEX idx_sort_order (sort_order);

-- 安全方式：先删除再创建（如果存在）
SET @exist := (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE TABLE_SCHEMA = 'crm_production' 
               AND TABLE_NAME = 'outsource_companies' 
               AND INDEX_NAME = 'idx_sort_order');
SET @sqlstmt := IF(@exist > 0, 'SELECT "索引已存在，跳过创建" AS message', 
                'ALTER TABLE outsource_companies ADD INDEX idx_sort_order (sort_order)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✓ sort_order 索引添加完成' AS '';

-- ============================================
-- 4. 更新现有数据的排序值
-- ============================================
SELECT '更新现有数据的排序值...' AS '';

-- 为现有公司设置排序值（按创建时间排序）
SET @row_number = 0;
UPDATE outsource_companies 
SET sort_order = (@row_number := @row_number + 1)
WHERE sort_order = 999
ORDER BY created_at ASC;

SELECT '✓ 排序值更新完成' AS '';

-- ============================================
-- 5. 验证结果
-- ============================================
SELECT '验证表结构...' AS '';

-- 查看表结构
SHOW COLUMNS FROM outsource_companies;

-- 查看索引
SHOW INDEX FROM outsource_companies;

-- 查看数据
SELECT '当前外包公司数据:' AS '';
SELECT 
  id,
  company_name,
  default_unit_price,
  is_default,
  sort_order,
  status,
  created_at
FROM outsource_companies
ORDER BY sort_order ASC, created_at ASC;

-- ============================================
-- 执行完成提示
-- ============================================
SELECT '
============================================
✓ 字段添加完成！

已添加字段:
  1. is_default (TINYINT) - 是否默认公司
  2. sort_order (INT) - 排序顺序

已添加索引:
  - idx_sort_order

已更新现有数据的排序值

请检查上面的验证结果确认无误
============================================
' AS '执行结果';
