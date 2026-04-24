-- 补充添加 tenant_id 字段

SET NAMES utf8mb4;

-- role_permissions 表
ALTER TABLE `role_permissions` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- customer_tags 表
ALTER TABLE `customer_tags` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- customer_groups 表
ALTER TABLE `customer_groups` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- customer_shares 表
ALTER TABLE `customer_shares` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- customer_assignments 表
ALTER TABLE `customer_assignments` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- logistics 表
ALTER TABLE `logistics` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- performance_records 表
ALTER TABLE `performance_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- value_added_status_configs 表
ALTER TABLE `value_added_status_configs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- service_records 表
ALTER TABLE `service_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- data_records 表
ALTER TABLE `data_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- notifications 表
ALTER TABLE `notifications` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- call_records 表
ALTER TABLE `call_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- follow_up_records 表
ALTER TABLE `follow_up_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- sms_records 表
ALTER TABLE `sms_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

SELECT '✅ 补充完成！已为 14 个表添加 tenant_id' AS message;
