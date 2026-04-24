-- ============================================================
-- 第二部分: 加列（逐条执行，列已存在会报错可忽略）
-- 
-- ★★★ 使用方法 ★★★
-- 每条 ALTER TABLE 单独复制到 phpMyAdmin 执行
-- 如果报 "Duplicate column name" 说明列已存在，忽略即可
-- 如果报 "Unknown column 'xxx'" 说明 AFTER 指定的列不存在，
--   去掉 AFTER `xxx` 部分再执行即可
-- ============================================================

-- 2a. licenses 加 package_id（不指定位置，直接加到末尾）
ALTER TABLE `licenses` ADD COLUMN `package_id` INT NULL COMMENT '关联套餐ID';

-- 2b. licenses 加 package_name
ALTER TABLE `licenses` ADD COLUMN `package_name` VARCHAR(100) NULL COMMENT '套餐名称';

-- 2c. tenant_packages 加 modules
ALTER TABLE `tenant_packages` ADD COLUMN `modules` JSON NULL COMMENT '授权模块ID列表（JSON数组）';

-- 2d. tenants 加 modules
ALTER TABLE `tenants` ADD COLUMN `modules` JSON NULL COMMENT '授权模块ID列表（JSON数组）';

-- ★ 第二部分结束 ★
-- 每条如果报 Duplicate column name 就是已存在，跳过即可
