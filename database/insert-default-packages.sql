-- =============================================
-- 云客CRM系统 - 默认套餐与增值服务数据插入
-- 数据库: crm_local
-- 创建日期: 2026-04-26
-- 说明: 补全管理后台所有默认套餐数据，包含：
--   1. CRM主套餐 (tenant_packages)
--   2. 企微管理授权套餐 (system_config -> wecom_pricing_config)
--   3. AI助手套餐 (system_config -> ai_packages_global)
--   4. 会话存档套餐 (wecom_vas_configs + system_config -> wecom_archive_pricing)
--   5. 获客助手套餐 (system_config -> wecom_acquisition_pricing)
--   6. 短信额度套餐 (sms_quota_packages)
-- =============================================

USE `crm_local`;

-- =============================================
-- 1. CRM主套餐 (tenant_packages)
-- 8个套餐：4个SaaS + 1个测试 + 3个私有部署
-- =============================================

INSERT INTO `tenant_packages` (`name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`, `features`, `modules`, `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`, `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`) VALUES
('7天免费试用', 'FREE_TRIAL', 'saas', '体验云客CRM全部基础功能', 0.00, NULL, 'monthly', 7, 3, 1, 'online', 5, '["客户管理", "订单管理", "基础报表", "数据导入导出"]', '["dashboard", "customer", "order", "service-management", "performance", "logistics", "service", "data", "finance", "product", "system"]', 1, 0, 1, 0, 1, 0.00, 0, NULL),
('基础版', 'SAAS_BASIC', 'saas', '适合小型团队起步', 199.00, NULL, 'monthly', 30, 10, 5, 'total', 0, '["客户管理", "订单管理", "基础报表", "数据导入导出", "物流跟踪"]', '["dashboard", "customer", "order", "service-management", "performance", "logistics", "service", "data", "finance", "product", "system"]', 0, 0, 1, 1, 1, 0.00, 2, NULL),
('专业版', 'SAAS_PRO', 'saas', '适合成长型团队', 299.00, NULL, 'monthly', 30, 50, 50, 'total', 0, '["客户管理", "订单管理", "基础报表", "数据导入导出", "物流跟踪", "高级报表分析", "API接口", "自定义字段"]', '["dashboard", "customer", "order", "service-management", "performance", "logistics", "service", "data", "finance", "product", "system"]', 0, 1, 1, 2, 1, 0.00, 2, NULL),
('企业版', 'SAAS_ENTERPRISE', 'saas', '适合大型销售团队', 599.00, NULL, 'monthly', 30, 200, 200, 'total', 0, '["客户管理", "订单管理", "基础报表", "数据导入导出", "物流跟踪", "高级报表分析", "API接口", "自定义字段", "电销外呼系统", "专属客户成功经理", "优先技术支持", "SLA保障"]', '["dashboard", "customer", "order", "service-management", "performance", "logistics", "service", "data", "finance", "product", "system", "wecom"]', 0, 0, 1, 3, 1, 0.00, 2, 5990.00),
('标准版', 'PRIVATE_STANDARD', 'private', '适合中小企业私有部署', 9800.00, NULL, 'once', 36500, 50, 0, 'total', 0, '["永久授权", "全部核心功能", "部署文档", "1年免费升级", "邮件技术支持"]', NULL, 0, 0, 1, 10, 1, 0.00, 0, 3700.00),
('专业版', 'PRIVATE_PRO', 'private', '适合中大型企业', 19800.00, NULL, 'once', 36500, 200, 0, 'total', 0, '["永久授权", "全部功能模块", "远程部署协助", "1年技术支持", "1年免费升级", "专属技术顾问"]', NULL, 0, 1, 1, 11, 1, 0.00, 0, 7500.00),
('企业版', 'PRIVATE_ENTERPRISE', 'private', '适合大型企业/集团', 39800.00, NULL, 'once', 36500, 99999, 0, 'total', 0, '["永久授权", "不限用户数", "全部功能模块", "现场部署支持", "专属技术顾问", "定制开发服务", "7x24技术支持"]', NULL, 0, 0, 1, 12, 1, 0.00, 0, 15100.00)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- =============================================
-- 2. 企微管理授权套餐 + AI助手套餐 + 会话存档套餐 + 获客助手套餐
--    统一存储在 system_config 的 wecom_pricing_config 键中
--    管理后台通过此配置统一管理所有企微增值服务定价
-- =============================================

INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `created_at`, `updated_at`)
VALUES (UUID(), 'wecom_pricing_config', JSON_OBJECT(
  'wecomPackages', JSON_ARRAY(
    JSON_OBJECT('name', '基础版', 'wecomQuota', 1, 'featureScope', '基础功能', 'yearlyPrice', 0, 'enabled', TRUE, 'recommended', FALSE, 'sortOrder', 0, 'archiveIncluded', 'none', 'aiQuotaIncluded', 0, 'acquisitionIncluded', FALSE, 'description', '免费体验企微基础管理功能', 'menuAddressBook', TRUE, 'menuCustomer', TRUE, 'menuCustomerGroup', FALSE, 'menuAcquisition', FALSE, 'menuContactWay', FALSE, 'menuChatArchive', FALSE, 'menuAiAssistant', FALSE, 'menuCustomerService', FALSE, 'menuSidebar', FALSE, 'menuPayment', FALSE),
    JSON_OBJECT('name', '企业版', 'wecomQuota', 3, 'featureScope', '标准功能', 'yearlyPrice', 2000, 'enabled', TRUE, 'recommended', TRUE, 'sortOrder', 1, 'archiveIncluded', '20', 'aiQuotaIncluded', 500, 'acquisitionIncluded', FALSE, 'description', '适合中小企业，含会话存档和AI额度', 'menuAddressBook', TRUE, 'menuCustomer', TRUE, 'menuCustomerGroup', TRUE, 'menuAcquisition', FALSE, 'menuContactWay', TRUE, 'menuChatArchive', TRUE, 'menuAiAssistant', TRUE, 'menuCustomerService', TRUE, 'menuSidebar', TRUE, 'menuPayment', TRUE),
    JSON_OBJECT('name', '旗舰版', 'wecomQuota', 10, 'featureScope', '全部功能', 'yearlyPrice', 8000, 'enabled', TRUE, 'recommended', FALSE, 'sortOrder', 2, 'archiveIncluded', '50', 'aiQuotaIncluded', 2000, 'acquisitionIncluded', TRUE, 'description', '全功能解锁，大型团队首选', 'menuAddressBook', TRUE, 'menuCustomer', TRUE, 'menuCustomerGroup', TRUE, 'menuAcquisition', TRUE, 'menuContactWay', TRUE, 'menuChatArchive', TRUE, 'menuAiAssistant', TRUE, 'menuCustomerService', TRUE, 'menuSidebar', TRUE, 'menuPayment', TRUE)
  ),
  'archivePricing', JSON_ARRAY(
    JSON_OBJECT('tierLabel', '1-5人', 'maxMembers', 5, 'officialPrice', 300, 'salePrice', 160, 'costPrice', 105, 'profitRate', 34),
    JSON_OBJECT('tierLabel', '6-20人', 'maxMembers', 20, 'officialPrice', 300, 'salePrice', 150, 'costPrice', 105, 'profitRate', 30),
    JSON_OBJECT('tierLabel', '21-50人', 'maxMembers', 50, 'officialPrice', 250, 'salePrice', 140, 'costPrice', 87, 'profitRate', 38),
    JSON_OBJECT('tierLabel', '51-200人', 'maxMembers', 200, 'officialPrice', 200, 'salePrice', 120, 'costPrice', 70, 'profitRate', 42)
  ),
  'archiveGlobalConfig', JSON_OBJECT('purchaseMode', 'both', 'seatServiceFee', 50),
  'aiPackages', JSON_ARRAY(
    JSON_OBJECT('id', 'trial', 'name', '体验包', 'calls', 100, 'price', 0, 'description', '免费体验100次AI调用', 'validity', 'forever', 'recommended', FALSE, 'freeTrialOnce', TRUE),
    JSON_OBJECT('id', 'basic', 'name', '基础包', 'calls', 1000, 'price', 99, 'description', '1000次AI调用，适合小团队', 'validity', '90', 'recommended', FALSE, 'freeTrialOnce', FALSE),
    JSON_OBJECT('id', 'standard', 'name', '标准包', 'calls', 5000, 'price', 399, 'description', '5000次AI调用，企业常用', 'validity', '365', 'recommended', TRUE, 'freeTrialOnce', FALSE),
    JSON_OBJECT('id', 'pro', 'name', '专业包', 'calls', 10000, 'price', 699, 'description', '10000次AI调用，专业版', 'validity', '365', 'recommended', FALSE, 'freeTrialOnce', FALSE),
    JSON_OBJECT('id', 'enterprise', 'name', '企业包', 'calls', 50000, 'price', 2999, 'description', '50000次AI调用，大型企业', 'validity', '365', 'recommended', FALSE, 'freeTrialOnce', FALSE)
  ),
  'acquisitionPricing', JSON_ARRAY(
    JSON_OBJECT('name', '基础版', 'price', 0, 'billingCycle', '月', 'maxChannels', 3, 'dashboardEnabled', TRUE, 'funnelEnabled', FALSE, 'profileEnabled', FALSE, 'recommended', FALSE, 'description', '免费使用基础获客管理功能'),
    JSON_OBJECT('name', '专业版', 'price', 299, 'billingCycle', '月', 'maxChannels', 50, 'dashboardEnabled', TRUE, 'funnelEnabled', TRUE, 'profileEnabled', TRUE, 'recommended', TRUE, 'description', '完整获客数据分析与转化追踪'),
    JSON_OBJECT('name', '企业版', 'price', 2999, 'billingCycle', '年', 'maxChannels', 0, 'dashboardEnabled', TRUE, 'funnelEnabled', TRUE, 'profileEnabled', TRUE, 'recommended', FALSE, 'description', '无限渠道，全功能解锁，年付更优惠')
  )
), 'json', NOW(), NOW())
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = NOW();

-- =============================================
-- 3. AI助手套餐全局配置（独立键，供CRM前端读取）
-- =============================================

INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `created_at`, `updated_at`)
VALUES (UUID(), 'ai_packages_global',
'[{"id":"trial","name":"体验包","calls":100,"price":0,"description":"免费体验100次AI调用","validity":"forever","recommended":false,"freeTrialOnce":true},{"id":"basic","name":"基础包","calls":1000,"price":99,"description":"1000次AI调用，适合小团队","validity":"90","recommended":false,"freeTrialOnce":false},{"id":"standard","name":"标准包","calls":5000,"price":399,"description":"5000次AI调用，企业常用","validity":"365","recommended":true,"freeTrialOnce":false},{"id":"pro","name":"专业包","calls":10000,"price":699,"description":"10000次AI调用，专业版","validity":"365","recommended":false,"freeTrialOnce":false},{"id":"enterprise","name":"企业包","calls":50000,"price":2999,"description":"50000次AI调用，大型企业","validity":"365","recommended":false,"freeTrialOnce":false}]',
'json', NOW(), NOW())
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = NOW();

-- =============================================
-- 4. 会话存档定价配置（独立键，供CRM前端存档设置读取）
-- =============================================

INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `created_at`, `updated_at`)
VALUES (UUID(), 'wecom_archive_pricing',
'[{"tierLabel":"1-5人","maxMembers":5,"officialPrice":300,"salePrice":160,"costPrice":105,"profitRate":34},{"tierLabel":"6-20人","maxMembers":20,"officialPrice":300,"salePrice":150,"costPrice":105,"profitRate":30},{"tierLabel":"21-50人","maxMembers":50,"officialPrice":250,"salePrice":140,"costPrice":87,"profitRate":38},{"tierLabel":"51-200人","maxMembers":200,"officialPrice":200,"salePrice":120,"costPrice":70,"profitRate":42}]',
'json', NOW(), NOW())
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = NOW();

-- =============================================
-- 5. 获客助手定价配置（独立键）
-- =============================================

INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `created_at`, `updated_at`)
VALUES (UUID(), 'wecom_acquisition_pricing',
'[{"name":"基础版","price":0,"billingCycle":"月","maxChannels":3,"dashboardEnabled":true,"funnelEnabled":false,"profileEnabled":false,"recommended":false,"description":"免费使用基础获客管理功能"},{"name":"专业版","price":299,"billingCycle":"月","maxChannels":50,"dashboardEnabled":true,"funnelEnabled":true,"profileEnabled":true,"recommended":true,"description":"完整获客数据分析与转化追踪"},{"name":"企业版","price":2999,"billingCycle":"年","maxChannels":0,"dashboardEnabled":true,"funnelEnabled":true,"profileEnabled":true,"recommended":false,"description":"无限渠道，全功能解锁，年付更优惠"}]',
'json', NOW(), NOW())
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = NOW();

-- =============================================
-- 6. 企微增值服务VAS配置（独立键，含会话存档阶梯定价+购买模式）
-- =============================================

INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `created_at`, `updated_at`)
VALUES (UUID(), 'wecom_vas_config',
'{"chatArchive":{"enabled":true,"defaultPrice":100,"minPrice":50,"billingUnit":"per_user_year","trialDays":7,"tierPricing":[{"min":1,"max":10,"price":100},{"min":11,"max":50,"price":90},{"min":51,"max":100,"price":80},{"min":101,"max":999999,"price":70}],"description":"企微会话存档增值服务，可查看员工与客户的聊天记录，支持敏感词检测和质检功能。","purchaseMode":"both","seatServiceFee":50}}',
'json', NOW(), NOW())
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = NOW();

-- =============================================
-- 7. 企微增值服务配置表 (wecom_vas_configs)
--    管理后台Admin专属，存储各增值服务的定价规则
-- =============================================

INSERT INTO `wecom_vas_configs` (`service_type`, `service_name`, `default_price`, `min_price`, `billing_unit`, `trial_days`, `tier_pricing`, `description`, `is_enabled`) VALUES
('chat_archive', '会话存档服务', 100.00, 50.00, 'per_user_year', 7,
 '[{"min":1,"max":10,"price":100},{"min":11,"max":50,"price":90},{"min":51,"max":100,"price":80},{"min":101,"max":999999,"price":70}]',
 '企微会话存档增值服务，可查看员工与客户的聊天记录，支持敏感词检测和质检功能。需企业在企微管理后台开通会话存档接口（企微官方收费）。', 1),

('ai_assistant', 'AI智能助手', 99.00, 0.00, 'per_package', 0,
 '[{"id":"trial","name":"体验包","calls":100,"price":0},{"id":"basic","name":"基础包","calls":1000,"price":99},{"id":"standard","name":"标准包","calls":5000,"price":399},{"id":"pro","name":"专业包","calls":10000,"price":699},{"id":"enterprise","name":"企业包","calls":50000,"price":2999}]',
 'AI智能助手服务，提供智能客服回复、会话质检、客户画像分析等AI能力。按调用次数计费。', 1),

('acquisition', '获客助手', 299.00, 0.00, 'monthly', 0,
 '[{"name":"基础版","price":0,"maxChannels":3},{"name":"专业版","price":299,"maxChannels":50},{"name":"企业版","price":2999,"maxChannels":0}]',
 '企微获客助手，提供智能获客链接、渠道活码、数据分析看板、转化漏斗等功能。基础版免费，高级版按月/年付费。', 1),

('wecom_auth', '企微管理授权', 0.00, 0.00, 'yearly', 0,
 '[{"name":"基础版","price":0,"wecomQuota":1},{"name":"企业版","price":2000,"wecomQuota":3},{"name":"旗舰版","price":8000,"wecomQuota":10}]',
 '企微管理授权套餐，授权企业微信接入CRM系统。基础版免费绑定1个企业，企业版和旗舰版支持多企业绑定和更多功能模块。', 1),

('sms_quota', '短信额度', 5.00, 5.00, 'per_package', 0,
 '[{"id":"pkg-sms-001","name":"体验包","sms_count":100,"price":5.00},{"id":"pkg-sms-002","name":"基础包","sms_count":500,"price":22.50},{"id":"pkg-sms-003","name":"标准包","sms_count":2000,"price":80.00},{"id":"pkg-sms-004","name":"旗舰包","sms_count":10000,"price":350.00}]',
 '短信额度套餐，用于发送短信通知、营销短信、验证码等。按条数购买，批量购买单价更优惠。', 1)

ON DUPLICATE KEY UPDATE
  `service_name` = VALUES(`service_name`),
  `default_price` = VALUES(`default_price`),
  `min_price` = VALUES(`min_price`),
  `billing_unit` = VALUES(`billing_unit`),
  `trial_days` = VALUES(`trial_days`),
  `tier_pricing` = VALUES(`tier_pricing`),
  `description` = VALUES(`description`),
  `is_enabled` = VALUES(`is_enabled`),
  `updated_at` = CURRENT_TIMESTAMP;

-- =============================================
-- 8. 短信额度套餐 (sms_quota_packages)
-- =============================================

INSERT INTO `sms_quota_packages` (`id`, `name`, `sms_count`, `price`, `unit_price`, `description`, `sort_order`, `is_enabled`) VALUES
('pkg-sms-001', '体验包', 100, 5.00, 0.0500, '适合小规模测试使用', 1, 1),
('pkg-sms-002', '基础包', 500, 22.50, 0.0450, '适合小团队日常使用', 2, 1),
('pkg-sms-003', '标准包', 2000, 80.00, 0.0400, '适合中型企业日常营销', 3, 1),
('pkg-sms-004', '旗舰包', 10000, 350.00, 0.0350, '适合大批量短信营销推广', 4, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `sms_count` = VALUES(`sms_count`),
  `price` = VALUES(`price`),
  `unit_price` = VALUES(`unit_price`),
  `description` = VALUES(`description`),
  `updated_at` = CURRENT_TIMESTAMP;

-- =============================================
-- 验证插入结果
-- =============================================

SELECT '=== CRM主套餐 (tenant_packages) ===' AS section;
SELECT id, name, code, type, price, billing_cycle, status FROM tenant_packages ORDER BY sort_order;

SELECT '=== 企微增值服务配置 (wecom_vas_configs) ===' AS section;
SELECT id, service_type, service_name, default_price, billing_unit, is_enabled FROM wecom_vas_configs;

SELECT '=== 短信额度套餐 (sms_quota_packages) ===' AS section;
SELECT id, name, sms_count, price, unit_price, is_enabled FROM sms_quota_packages ORDER BY sort_order;

SELECT '=== 定价配置 (system_config) ===' AS section;
SELECT config_key, LEFT(config_value, 100) AS config_preview, updated_at
FROM system_config
WHERE config_key IN ('wecom_pricing_config', 'ai_packages_global', 'wecom_archive_pricing', 'wecom_acquisition_pricing', 'wecom_vas_config');
