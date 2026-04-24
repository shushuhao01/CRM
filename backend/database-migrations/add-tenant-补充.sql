-- 补充添加 tenant_id 字段到剩余的表

SET NAMES utf8mb4;

-- 产品分类表
ALTER TABLE `product_categories` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 产品表
ALTER TABLE `products` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 订单表
ALTER TABLE `orders` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 订单项表
ALTER TABLE `order_items` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 操作日志表
ALTER TABLE `operation_logs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 代收取消申请表
ALTER TABLE `cod_cancel_applications` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 售后服务表
ALTER TABLE `after_sales_services` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 外包公司表
ALTER TABLE `outsource_companies` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 外包公司价格配置表
ALTER TABLE `value_added_price_config` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 增值订单表
ALTER TABLE `value_added_orders` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 增值管理备注预设表
ALTER TABLE `value_added_remark_presets` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 权限表
ALTER TABLE `permissions` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID（NULL表示系统权限）' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 角色权限关联表
ALTER TABLE `role_permissions` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 客户标签表
ALTER TABLE `customer_tags` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 客户分组表
ALTER TABLE `customer_groups` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 客户分享表
ALTER TABLE `customer_shares` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 客户分配历史表
ALTER TABLE `customer_assignments` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 物流表
ALTER TABLE `logistics` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 业绩表
ALTER TABLE `performance_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 增值状态配置表
ALTER TABLE `value_added_status_configs` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 售后服务表（旧版）
ALTER TABLE `service_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 资料表
ALTER TABLE `data_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 消息通知表
ALTER TABLE `notifications` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 通话记录表
ALTER TABLE `call_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 跟进记录表
ALTER TABLE `follow_up_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

-- 短信发送记录表
ALTER TABLE `sms_records` 
  ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX `idx_tenant_id` (`tenant_id`);

SELECT '✅ 补充迁移完成！' AS message;
