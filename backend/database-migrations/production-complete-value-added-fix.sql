-- ============================================
-- 生产环境：增值管理完整修复SQL
-- 执行时间: 2026-03-01
-- 说明: 添加缺失字段并修复排序值
-- ============================================

-- 第1步：添加 is_default 字段（如果不存在）
ALTER TABLE `outsource_companies` 
ADD COLUMN `is_default` TINYINT NOT NULL DEFAULT '0' COMMENT '是否默认公司';

-- 第2步：添加 sort_order 字段（如果不存在）
ALTER TABLE `outsource_companies` 
ADD COLUMN `sort_order` INT NOT NULL DEFAULT '999' COMMENT '排序顺序';

-- 第3步：添加索引（如果不存在）
ALTER TABLE `outsource_companies` 
ADD INDEX `idx_sort_order` (`sort_order`);

-- 第4步：更新排序值（按创建时间排序）
SET @row_number = 0;
UPDATE `outsource_companies` 
SET `sort_order` = (@row_number := @row_number + 1) 
ORDER BY `created_at` ASC;

-- 第5步：验证结果
SELECT 
  `id`, 
  `company_name`, 
  `default_unit_price`,
  `is_default`, 
  `sort_order`, 
  `status`, 
  `created_at` 
FROM `outsource_companies` 
ORDER BY `sort_order` ASC;
