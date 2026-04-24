-- ============================================
-- 生产环境：为 outsource_companies 表添加缺失字段（简化版）
-- 执行时间: 2026-03-01
-- 说明: 添加 is_default 和 sort_order 字段
-- ============================================

-- 使用生产数据库
USE crm_production;

-- 1. 添加 is_default 字段（不指定位置，添加到表末尾）
ALTER TABLE outsource_companies 
ADD COLUMN is_default TINYINT DEFAULT 0 COMMENT '是否默认公司: 0-否, 1-是';

-- 2. 添加 sort_order 字段（不指定位置，添加到表末尾）
ALTER TABLE outsource_companies 
ADD COLUMN sort_order INT DEFAULT 999 COMMENT '排序顺序';

-- 3. 添加 sort_order 索引
ALTER TABLE outsource_companies 
ADD INDEX idx_sort_order (sort_order);

-- 4. 更新现有数据的排序值（按创建时间排序）
SET @row_number = 0;
UPDATE outsource_companies 
SET sort_order = (@row_number := @row_number + 1)
WHERE sort_order = 999
ORDER BY created_at ASC;

-- 5. 验证结果
SELECT 
  id,
  company_name,
  is_default,
  sort_order,
  status,
  created_at
FROM outsource_companies
ORDER BY sort_order ASC;
