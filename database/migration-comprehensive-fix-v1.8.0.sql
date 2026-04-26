-- ============================================================
-- 综合修复生产环境 - v1.8.0 全面检查补丁
-- 日期: 2026-04-26
-- 用法: 在宝塔面板 phpMyAdmin 中直接执行（兼容 phpMyAdmin）
-- ============================================================
-- 本脚本包含以下修复：
--   1. tenant_packages 表：添加3个年付字段 + ENUM补充'both'
--   2. tenants 表：ENUM补充'both'
--   3. outsource_companies 表：添加8个缺失字段
--   4. modules 表：补充「数据看板」和「企微管理」
--   5. module_status 表：补充「wecom」
--   6. tenant_packages 表：插入7个默认套餐
--   7. 租户 features 补充 wecom 模块
-- ============================================================
-- 注意：所有 ALTER TABLE 使用 PREPARE/EXECUTE 方式安全执行
--       如果字段已存在会自动跳过，不会报错
-- ============================================================


-- ==================== 1. tenant_packages 表：添加缺失字段 ====================

-- 1a. 添加 yearly_discount_rate（年付折扣率）
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_packages' AND COLUMN_NAME = 'yearly_discount_rate') = 0,
  'ALTER TABLE `tenant_packages` ADD COLUMN `yearly_discount_rate` DECIMAL(5,2) DEFAULT 0 COMMENT ''年付折扣率''',
  'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1b. 添加 yearly_bonus_months（年付赠送月数）
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_packages' AND COLUMN_NAME = 'yearly_bonus_months') = 0,
  'ALTER TABLE `tenant_packages` ADD COLUMN `yearly_bonus_months` INT DEFAULT 0 COMMENT ''年付赠送月数''',
  'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1c. 添加 yearly_price（年付价格）
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_packages' AND COLUMN_NAME = 'yearly_price') = 0,
  'ALTER TABLE `tenant_packages` ADD COLUMN `yearly_price` DECIMAL(10,2) NULL COMMENT ''年付价格''',
  'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1d. user_limit_mode ENUM 添加 'both' 选项（MODIFY 可重复执行）
ALTER TABLE `tenant_packages` MODIFY COLUMN `user_limit_mode` ENUM('total','online','both') NOT NULL DEFAULT 'total' COMMENT '用户限制模式：total-限制总注册数，online-限制同时在线数，both-两种都支持';


-- ==================== 2. tenants 表：ENUM 补充 'both' ====================

ALTER TABLE `tenants` MODIFY COLUMN `user_limit_mode` ENUM('total','online','both') NOT NULL DEFAULT 'total' COMMENT '用户限制模式（继承自套餐，可单独覆盖）';


-- ==================== 3. outsource_companies 表：添加缺失字段 ====================

-- 3a. 总订单数
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outsource_companies' AND COLUMN_NAME = 'total_orders') = 0,
  'ALTER TABLE `outsource_companies` ADD COLUMN `total_orders` INT DEFAULT 0 COMMENT ''总订单数''',
  'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3b. 有效订单数
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outsource_companies' AND COLUMN_NAME = 'valid_orders') = 0,
  'ALTER TABLE `outsource_companies` ADD COLUMN `valid_orders` INT DEFAULT 0 COMMENT ''有效订单数''',
  'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3c. 无效订单数
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outsource_companies' AND COLUMN_NAME = 'invalid_orders') = 0,
  'ALTER TABLE `outsource_companies` ADD COLUMN `invalid_orders` INT DEFAULT 0 COMMENT ''无效订单数''',
  'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3d. 总金额
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outsource_companies' AND COLUMN_NAME = 'total_amount') = 0,
  'ALTER TABLE `outsource_companies` ADD COLUMN `total_amount` DECIMAL(12,2) DEFAULT 0 COMMENT ''总金额''',
  'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3e. 已结算金额
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outsource_companies' AND COLUMN_NAME = 'settled_amount') = 0,
  'ALTER TABLE `outsource_companies` ADD COLUMN `settled_amount` DECIMAL(12,2) DEFAULT 0 COMMENT ''已结算金额''',
  'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3f. 备注
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outsource_companies' AND COLUMN_NAME = 'remark') = 0,
  'ALTER TABLE `outsource_companies` ADD COLUMN `remark` TEXT NULL COMMENT ''备注''',
  'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3g. 创建人ID
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outsource_companies' AND COLUMN_NAME = 'created_by') = 0,
  'ALTER TABLE `outsource_companies` ADD COLUMN `created_by` VARCHAR(50) NULL COMMENT ''创建人ID''',
  'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3h. 创建人姓名
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outsource_companies' AND COLUMN_NAME = 'created_by_name') = 0,
  'ALTER TABLE `outsource_companies` ADD COLUMN `created_by_name` VARCHAR(50) NULL COMMENT ''创建人姓名''',
  'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ==================== 4. modules 表：补充缺失模块 ====================

-- 4a. 添加「数据看板」模块
INSERT INTO `modules` (`id`, `name`, `code`, `description`, `icon`, `version`, `status`, `is_system`, `sort_order`)
VALUES (UUID(), '数据看板', 'dashboard_management', '系统数据总览、趋势分析', 'Odometer', '1.0.0', 'enabled', 1, 0)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 4b. 添加「企微管理」模块
INSERT INTO `modules` (`id`, `name`, `code`, `description`, `icon`, `version`, `status`, `is_system`, `sort_order`)
VALUES (UUID(), '企微管理', 'wecom_management', '企业微信集成管理，包括企微应用配置、客户同步、会话存档等功能', 'ChatLineSquare', '1.0.0', 'enabled', 0, 11)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;


-- ==================== 5. module_status 表：补充企微管理 ====================

INSERT INTO `module_status` (`module_key`, `module_name`, `description`, `icon`, `is_enabled`, `sort_order`)
VALUES ('wecom', '企微管理', '企业微信集成管理，客户同步、会话存档', 'ChatLineSquare', 1, 12)
ON DUPLICATE KEY UPDATE `module_name` = VALUES(`module_name`), `updated_at` = CURRENT_TIMESTAMP;


-- ==================== 6. tenant_packages 表：插入默认套餐 ====================

INSERT INTO `tenant_packages` (`name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`, `features`, `modules`, `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`, `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`) VALUES
('7天免费试用', 'FREE_TRIAL', 'saas', '体验云客CRM全部基础功能', 0.00, NULL, 'monthly', 7, 3, 1, 'online', 5,
 '["客户管理", "订单管理", "基础报表", "数据导入导出"]',
 '["dashboard", "customer", "order", "service-management", "performance", "logistics", "service", "data", "finance", "product", "system"]',
 1, 0, 1, 0, 1, 0.00, 0, NULL)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `tenant_packages` (`name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`, `features`, `modules`, `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`, `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`) VALUES
('基础版', 'SAAS_BASIC', 'saas', '适合小型团队起步', 199.00, NULL, 'monthly', 30, 10, 5, 'total', 0,
 '["客户管理", "订单管理", "基础报表", "数据导入导出", "物流跟踪"]',
 '["dashboard", "customer", "order", "service-management", "performance", "logistics", "service", "data", "finance", "product", "system"]',
 0, 0, 1, 1, 1, 0.00, 2, NULL)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `tenant_packages` (`name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`, `features`, `modules`, `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`, `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`) VALUES
('专业版', 'SAAS_PRO', 'saas', '适合成长型团队', 299.00, NULL, 'monthly', 30, 50, 50, 'total', 0,
 '["客户管理", "订单管理", "基础报表", "数据导入导出", "物流跟踪", "高级报表分析", "API接口", "自定义字段"]',
 '["dashboard", "customer", "order", "service-management", "performance", "logistics", "service", "data", "finance", "product", "system"]',
 0, 1, 1, 2, 1, 0.00, 2, NULL)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `tenant_packages` (`name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`, `features`, `modules`, `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`, `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`) VALUES
('企业版', 'SAAS_ENTERPRISE', 'saas', '适合大型销售团队', 599.00, NULL, 'monthly', 30, 200, 200, 'total', 0,
 '["客户管理", "订单管理", "基础报表", "数据导入导出", "物流跟踪", "高级报表分析", "API接口", "自定义字段", "电销外呼系统", "专属客户成功经理", "优先技术支持", "SLA保障"]',
 '["dashboard", "customer", "order", "service-management", "performance", "logistics", "service", "data", "finance", "product", "system", "wecom"]',
 0, 0, 1, 3, 1, 0.00, 2, 5990.00)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `tenant_packages` (`name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`, `features`, `modules`, `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`, `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`) VALUES
('标准版', 'PRIVATE_STANDARD', 'private', '适合中小企业私有部署', 9800.00, NULL, 'once', 36500, 50, 0, 'total', 0,
 '["永久授权", "全部核心功能", "部署文档", "1年免费升级", "邮件技术支持"]',
 NULL, 0, 0, 1, 10, 1, 0.00, 0, 3700.00)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `tenant_packages` (`name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`, `features`, `modules`, `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`, `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`) VALUES
('专业版', 'PRIVATE_PRO', 'private', '适合中大型企业', 19800.00, NULL, 'once', 36500, 200, 0, 'total', 0,
 '["永久授权", "全部功能模块", "远程部署协助", "1年技术支持", "1年免费升级", "专属技术顾问"]',
 NULL, 0, 1, 1, 11, 1, 0.00, 0, 7500.00)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `tenant_packages` (`name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`, `features`, `modules`, `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`, `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`) VALUES
('企业版', 'PRIVATE_ENTERPRISE', 'private', '适合大型企业/集团', 39800.00, NULL, 'once', 36500, 99999, 0, 'total', 0,
 '["永久授权", "不限用户数", "全部功能模块", "现场部署支持", "专属技术顾问", "定制开发服务", "7x24技术支持"]',
 NULL, 0, 0, 1, 12, 1, 0.00, 0, 15100.00)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;


-- ==================== 7. 更新租户 features：确保包含 wecom ====================

-- 对已有 features 的租户补充 wecom 模块
UPDATE `tenants`
SET `features` = JSON_ARRAY_APPEND(`features`, '$', 'wecom')
WHERE `features` IS NOT NULL
  AND `features` != ''
  AND `features` != '[]'
  AND JSON_CONTAINS(`features`, '"wecom"') = 0;

-- 对 features 为空的租户设置完整默认模块
UPDATE `tenants`
SET `features` = '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system","wecom"]'
WHERE `features` IS NULL OR `features` = '' OR `features` = '[]';


-- ============================================================
-- 执行完毕后重启后端: pm2 restart crm-backend
-- ============================================================
