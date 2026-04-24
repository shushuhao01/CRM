-- =============================================
-- 企微管理模块 - 子表补充 tenant_id 字段
-- 日期: 2026-04-10
-- 说明: 为6个子表添加 tenant_id 列和索引
--       提升查询性能，避免 JOIN wecom_configs
-- =============================================

-- 1. wecom_user_bindings
ALTER TABLE `wecom_user_bindings`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_wecom_user_bindings_tenant_id` (`tenant_id`);

-- 2. wecom_customers
ALTER TABLE `wecom_customers`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_wecom_customers_tenant_id` (`tenant_id`);

-- 3. wecom_acquisition_links
ALTER TABLE `wecom_acquisition_links`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_wecom_acquisition_links_tenant_id` (`tenant_id`);

-- 4. wecom_service_accounts
ALTER TABLE `wecom_service_accounts`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_wecom_service_accounts_tenant_id` (`tenant_id`);

-- 5. wecom_chat_records
ALTER TABLE `wecom_chat_records`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_wecom_chat_records_tenant_id` (`tenant_id`);

-- 6. wecom_payment_records
ALTER TABLE `wecom_payment_records`
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_wecom_payment_records_tenant_id` (`tenant_id`);

-- 回填 tenant_id（从 wecom_configs 表关联获取）
UPDATE `wecom_user_bindings` sub
  INNER JOIN `wecom_configs` cfg ON sub.wecom_config_id = cfg.id
  SET sub.tenant_id = cfg.tenant_id
  WHERE sub.tenant_id IS NULL AND cfg.tenant_id IS NOT NULL;

UPDATE `wecom_customers` sub
  INNER JOIN `wecom_configs` cfg ON sub.wecom_config_id = cfg.id
  SET sub.tenant_id = cfg.tenant_id
  WHERE sub.tenant_id IS NULL AND cfg.tenant_id IS NOT NULL;

UPDATE `wecom_acquisition_links` sub
  INNER JOIN `wecom_configs` cfg ON sub.wecom_config_id = cfg.id
  SET sub.tenant_id = cfg.tenant_id
  WHERE sub.tenant_id IS NULL AND cfg.tenant_id IS NOT NULL;

UPDATE `wecom_service_accounts` sub
  INNER JOIN `wecom_configs` cfg ON sub.wecom_config_id = cfg.id
  SET sub.tenant_id = cfg.tenant_id
  WHERE sub.tenant_id IS NULL AND cfg.tenant_id IS NOT NULL;

UPDATE `wecom_chat_records` sub
  INNER JOIN `wecom_configs` cfg ON sub.wecom_config_id = cfg.id
  SET sub.tenant_id = cfg.tenant_id
  WHERE sub.tenant_id IS NULL AND cfg.tenant_id IS NOT NULL;

UPDATE `wecom_payment_records` sub
  INNER JOIN `wecom_configs` cfg ON sub.wecom_config_id = cfg.id
  SET sub.tenant_id = cfg.tenant_id
  WHERE sub.tenant_id IS NULL AND cfg.tenant_id IS NOT NULL;

-- 验证
SELECT
  'wecom_user_bindings' AS table_name,
  COUNT(*) AS total,
  SUM(CASE WHEN tenant_id IS NOT NULL THEN 1 ELSE 0 END) AS has_tenant_id
FROM wecom_user_bindings
UNION ALL
SELECT 'wecom_customers', COUNT(*), SUM(CASE WHEN tenant_id IS NOT NULL THEN 1 ELSE 0 END)
FROM wecom_customers
UNION ALL
SELECT 'wecom_acquisition_links', COUNT(*), SUM(CASE WHEN tenant_id IS NOT NULL THEN 1 ELSE 0 END)
FROM wecom_acquisition_links
UNION ALL
SELECT 'wecom_service_accounts', COUNT(*), SUM(CASE WHEN tenant_id IS NOT NULL THEN 1 ELSE 0 END)
FROM wecom_service_accounts
UNION ALL
SELECT 'wecom_chat_records', COUNT(*), SUM(CASE WHEN tenant_id IS NOT NULL THEN 1 ELSE 0 END)
FROM wecom_chat_records
UNION ALL
SELECT 'wecom_payment_records', COUNT(*), SUM(CASE WHEN tenant_id IS NOT NULL THEN 1 ELSE 0 END)
FROM wecom_payment_records;

