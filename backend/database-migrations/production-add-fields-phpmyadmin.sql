-- ============================================
-- phpMyAdmin 专用：为 outsource_companies 表添加字段
-- 说明：在phpMyAdmin中，先在左侧选择 crm_production 数据库，然后执行以下SQL
-- ============================================

-- 添加 is_default 字段
ALTER TABLE `outsource_companies` ADD `is_default` TINYINT NOT NULL DEFAULT '0' COMMENT '是否默认公司' ;

-- 添加 sort_order 字段
ALTER TABLE `outsource_companies` ADD `sort_order` INT NOT NULL DEFAULT '999' COMMENT '排序顺序' ;

-- 添加索引
ALTER TABLE `outsource_companies` ADD INDEX `idx_sort_order` (`sort_order`) ;

-- 更新排序值
SET @row_number = 0;
UPDATE `outsource_companies` SET `sort_order` = (@row_number := @row_number + 1) WHERE `sort_order` = 999 ORDER BY `created_at` ASC;

-- 查看结果
SELECT `id`, `company_name`, `is_default`, `sort_order`, `status`, `created_at` FROM `outsource_companies` ORDER BY `sort_order` ASC;
