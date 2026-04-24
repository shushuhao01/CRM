-- 补充添加 tenant_id 到剩余业务表

SET NAMES utf8mb4;

-- call_lines 表
ALTER TABLE `call_lines` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- call_recordings 表
ALTER TABLE `call_recordings` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- commission_ladder 表
ALTER TABLE `commission_ladder` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- commission_setting 表
ALTER TABLE `commission_setting` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- department_subscription_configs 表
ALTER TABLE `department_subscription_configs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- device_bind_logs 表
ALTER TABLE `device_bind_logs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- device_bindlogs 表
ALTER TABLE `device_bindlogs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- global_call_config 表
ALTER TABLE `global_call_config` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- improvement_goals 表
ALTER TABLE `improvement_goals` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- logistics_api_configs 表
ALTER TABLE `logistics_api_configs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- logistics_companies 表
ALTER TABLE `logistics_companies` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- logistics_exceptions 表
ALTER TABLE `logistics_exceptions` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- logistics_status 表
ALTER TABLE `logistics_status` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- logistics_status_history 表
ALTER TABLE `logistics_status_history` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- logistics_todos 表
ALTER TABLE `logistics_todos` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- logistics_traces 表
ALTER TABLE `logistics_traces` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- logistics_tracking 表
ALTER TABLE `logistics_tracking` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- message_read_status 表
ALTER TABLE `message_read_status` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- message_subscriptions 表
ALTER TABLE `message_subscriptions` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- messages 表
ALTER TABLE `messages` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- module_schemes 表
ALTER TABLE `module_schemes` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- module_status 表
ALTER TABLE `module_status` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- notification_channels 表
ALTER TABLE `notification_channels` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- order_audits 表
ALTER TABLE `order_audits` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- order_field_configs 表
ALTER TABLE `order_field_configs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- order_status_history 表
ALTER TABLE `order_status_history` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- outbound_tasks 表
ALTER TABLE `outbound_tasks` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- payment_configs 表
ALTER TABLE `payment_configs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- payment_logs 表
ALTER TABLE `payment_logs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- performance_config 表
ALTER TABLE `performance_config` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- performance_metrics 表
ALTER TABLE `performance_metrics` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- performance_report_configs 表
ALTER TABLE `performance_report_configs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- performance_report_logs 表
ALTER TABLE `performance_report_logs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- performance_share_members 表
ALTER TABLE `performance_share_members` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- performance_shares 表
ALTER TABLE `performance_shares` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- permissions_closure 表
ALTER TABLE `permissions_closure` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' FIRST,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- phone_blacklist 表
ALTER TABLE `phone_blacklist` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- phone_configs 表
ALTER TABLE `phone_configs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- rejection_reasons 表
ALTER TABLE `rejection_reasons` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- sms_templates 表
ALTER TABLE `sms_templates` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- timeout_reminder_configs 表
ALTER TABLE `timeout_reminder_configs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- user_line_assignments 表
ALTER TABLE `user_line_assignments` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- user_permissions 表
ALTER TABLE `user_permissions` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- wecom_acquisition_links 表
ALTER TABLE `wecom_acquisition_links` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- wecom_chat_records 表
ALTER TABLE `wecom_chat_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- wecom_configs 表
ALTER TABLE `wecom_configs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- wecom_customers 表
ALTER TABLE `wecom_customers` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- wecom_payment_records 表
ALTER TABLE `wecom_payment_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- wecom_service_accounts 表
ALTER TABLE `wecom_service_accounts` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- wecom_user_bindings 表
ALTER TABLE `wecom_user_bindings` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- work_phones 表
ALTER TABLE `work_phones` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

SELECT '✅ 补充完成！已为 51 个表添加 tenant_id' AS message;
