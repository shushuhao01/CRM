-- ============================================
-- 生产环境：修复 outsource_companies 表的排序值
-- 执行时间: 2026-03-01
-- 说明: 将排序值从999更新为正确的序号（1, 2, 3...）
-- ============================================

-- 更新排序值（按创建时间排序）
SET @row_number = 0;
UPDATE `outsource_companies` 
SET `sort_order` = (@row_number := @row_number + 1) 
ORDER BY `created_at` ASC;

-- 查看结果
SELECT `id`, `company_name`, `is_default`, `sort_order`, `status`, `created_at` 
FROM `outsource_companies` 
ORDER BY `sort_order` ASC;
