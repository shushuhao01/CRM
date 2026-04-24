-- 话术表和分类表增加缺失字段（兼容 MySQL 5.x/8.x）
-- 执行方式：逐条执行，已存在的列会报 Duplicate column 错误可忽略
-- 注意：created_by 必须为 VARCHAR 类型，因为 users.id 是 UUID

-- 话术分类表增加缺失列
ALTER TABLE `wecom_script_categories` ADD COLUMN `color` VARCHAR(100) NULL COMMENT '颜色标识';
ALTER TABLE `wecom_script_categories` ADD COLUMN `scope` VARCHAR(100) NULL DEFAULT 'public' COMMENT '范围：public/personal';
ALTER TABLE `wecom_script_categories` ADD COLUMN `created_by` VARCHAR(100) NULL COMMENT '创建人ID(UUID)';
ALTER TABLE `wecom_script_categories` ADD COLUMN `sort_order` INT DEFAULT 0 COMMENT '排序';

-- 话术表增加缺失列
ALTER TABLE `wecom_scripts` ADD COLUMN `scope` VARCHAR(100) NULL DEFAULT 'public' COMMENT '范围：public/personal';
ALTER TABLE `wecom_scripts` ADD COLUMN `created_by` VARCHAR(100) NULL COMMENT '创建人ID(UUID)';
ALTER TABLE `wecom_scripts` ADD COLUMN `created_by_name` VARCHAR(100) NULL COMMENT '创建人名称';
ALTER TABLE `wecom_scripts` ADD COLUMN `color` VARCHAR(100) NULL COMMENT '颜色标识';
ALTER TABLE `wecom_scripts` ADD COLUMN `sort_order` INT DEFAULT 0 COMMENT '排序';

-- 如果 created_by 已存在但类型为 INT，需要修改为 VARCHAR：
ALTER TABLE `wecom_scripts` MODIFY COLUMN `created_by` VARCHAR(100) NULL;
ALTER TABLE `wecom_script_categories` MODIFY COLUMN `created_by` VARCHAR(100) NULL;

-- 注意：如果列已存在会报 "Duplicate column name" 错误，这是正常的，可以忽略。
