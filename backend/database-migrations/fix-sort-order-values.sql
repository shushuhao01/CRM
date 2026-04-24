-- 修复排序值（将999改为正确的序号）
-- 在phpMyAdmin中执行

SET @row_number = 0;
UPDATE `outsource_companies` 
SET `sort_order` = (@row_number := @row_number + 1) 
ORDER BY `created_at` ASC;

-- 查看结果
SELECT `id`, `company_name`, `is_default`, `sort_order`, `created_at` 
FROM `outsource_companies` 
ORDER BY `sort_order` ASC;
