-- ============================================
-- CRM系统多租户支持 - 完整数据库迁移脚本
-- ============================================
-- 创建时间: 2026-03-02
-- 用途: 为CRM系统添加SaaS多租户支持（完整版 - 32个业务表）
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 第一步: 创建租户相关表
-- ============================================

-- 租户表
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `tenant_code` VARCHAR(50) NOT NULL COMMENT '租户代码（唯一标识）',
  `tenant_name` VARCHAR(200) NOT NULL COMMENT '租户名称',
  `license_key` VARCHAR(100) NOT NULL COMMENT '授权码',
  `contact_person` VARCHAR(50) NULL COMMENT '联系人',
  `contact_phone` VARCHAR(20) NULL COMMENT '联系电话',
  `contact_email` VARCHAR(100) NULL COMMENT '联系邮箱',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-启用, inactive-停用, expired-已过期',
  `package_type` VARCHAR(50) DEFAULT 'basic' COMMENT '套餐类型',
  `max_users` INT DEFAULT 10 COMMENT '最大用户数',
  `max_storage_gb` INT DEFAULT 10 COMMENT '最大存储空间(GB)',
  `expire_date` DATE NULL COMMENT '过期日期（NULL表示永久）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_code` (`tenant_code`),
  UNIQUE KEY `uk_license_key` (`license_key`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户表';

-- 租户配置表
CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id` VARCHAR(36) NOT NULL COMMENT '配置ID',
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `setting_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `setting_value` TEXT NULL COMMENT '配置值',
  `setting_type` VARCHAR(20) DEFAULT 'string' COMMENT '配置类型',
  `description` VARCHAR(500) NULL COMMENT '配置说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_setting` (`tenant_id`, `setting_key`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户配置表';

-- ============================================
-- 第二步: 为32个业务表添加 tenant_id 字段
-- ============================================

-- ========== 用户权限类（7个表）==========

-- 1. 用户表
ALTER TABLE `users` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID（NULL表示私有部署）' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 2. 角色表
ALTER TABLE `roles` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID（NULL表示系统角色）' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 3. 权限表
ALTER TABLE `permissions` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID（NULL表示系统权限）' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 4. 用户角色关联表
ALTER TABLE `user_roles` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 5. 角色权限关联表
ALTER TABLE `role_permissions` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 6. 部门表
ALTER TABLE `departments` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 7. 授权IP表
ALTER TABLE `authorized_ips` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- ========== 客户管理类（5个表）==========

-- 8. 客户表
ALTER TABLE `customers` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 9. 客户标签表
ALTER TABLE `customer_tags` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 10. 客户分组表
ALTER TABLE `customer_groups` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 11. 客户分享表
ALTER TABLE `customer_shares` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 12. 客户分配历史表
ALTER TABLE `customer_assignments` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- ========== 产品订单类（5个表）==========

-- 13. 产品分类表
ALTER TABLE `product_categories` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 14. 产品表
ALTER TABLE `products` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 15. 订单表
ALTER TABLE `orders` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 16. 订单项表
ALTER TABLE `order_items` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 17. 物流表
ALTER TABLE `logistics` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- ========== 财务增值类（6个表）==========

-- 18. 业绩表
ALTER TABLE `performance_records` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 19. 外包公司表
ALTER TABLE `outsource_companies` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 20. 价格档位配置表
ALTER TABLE `value_added_price_config` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 21. 增值订单表
ALTER TABLE `value_added_orders` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 22. 增值状态配置表
ALTER TABLE `value_added_status_configs` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 23. 增值备注预设表
ALTER TABLE `value_added_remark_presets` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- ========== 售后服务类（3个表）==========

-- 24. 售后服务表
ALTER TABLE `after_sales_services` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 25. 售后服务表（旧版）
ALTER TABLE `service_records` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 26. 代收取消申请表
ALTER TABLE `cod_cancel_applications` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- ========== 其他业务表（6个表）==========

-- 27. 资料表
ALTER TABLE `data_records` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 28. 操作日志表
ALTER TABLE `operation_logs` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 29. 消息通知表
ALTER TABLE `notifications` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 30. 通话记录表
ALTER TABLE `call_records` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 31. 跟进记录表
ALTER TABLE `follow_up_records` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- 32. 短信发送记录表
ALTER TABLE `sms_records` 
  ADD COLUMN IF NOT EXISTS `tenant_id` VARCHAR(36) NULL COMMENT '租户ID' AFTER `id`,
  ADD INDEX IF NOT EXISTS `idx_tenant_id` (`tenant_id`);

-- ============================================
-- 第三步: 修改唯一索引（支持租户隔离）
-- ============================================

-- 注意：如果索引不存在会报错，使用 IF EXISTS 避免错误
-- 如果数据库不支持 IF EXISTS，需要手动检查

-- users 表
ALTER TABLE `users` DROP INDEX IF EXISTS `username`;
ALTER TABLE `users` ADD UNIQUE KEY IF NOT EXISTS `uk_tenant_username` (`tenant_id`, `username`);

ALTER TABLE `users` DROP INDEX IF EXISTS `email`;
ALTER TABLE `users` ADD UNIQUE KEY IF NOT EXISTS `uk_tenant_email` (`tenant_id`, `email`);

-- roles 表
ALTER TABLE `roles` DROP INDEX IF EXISTS `name`;
ALTER TABLE `roles` ADD UNIQUE KEY IF NOT EXISTS `uk_tenant_role_name` (`tenant_id`, `name`);

ALTER TABLE `roles` DROP INDEX IF EXISTS `code`;
ALTER TABLE `roles` ADD UNIQUE KEY IF NOT EXISTS `uk_tenant_role_code` (`tenant_id`, `code`);

-- customers 表
ALTER TABLE `customers` DROP INDEX IF EXISTS `customer_no`;
ALTER TABLE `customers` ADD UNIQUE KEY IF NOT EXISTS `uk_tenant_customer_no` (`tenant_id`, `customer_no`);

-- products 表
ALTER TABLE `products` DROP INDEX IF EXISTS `sku`;
ALTER TABLE `products` ADD UNIQUE KEY IF NOT EXISTS `uk_tenant_sku` (`tenant_id`, `sku`);

-- orders 表
ALTER TABLE `orders` DROP INDEX IF EXISTS `uk_order_number`;
ALTER TABLE `orders` ADD UNIQUE KEY IF NOT EXISTS `uk_tenant_order_number` (`tenant_id`, `order_number`);

-- after_sales_services 表
ALTER TABLE `after_sales_services` DROP INDEX IF EXISTS `service_number`;
ALTER TABLE `after_sales_services` ADD UNIQUE KEY IF NOT EXISTS `uk_tenant_service_number` (`tenant_id`, `service_number`);

-- ============================================
-- 第四步: 创建复合索引（优化查询性能）
-- ============================================

-- 用户表
ALTER TABLE `users` ADD INDEX IF NOT EXISTS `idx_tenant_status` (`tenant_id`, `status`);

-- 客户表
ALTER TABLE `customers` ADD INDEX IF NOT EXISTS `idx_tenant_status` (`tenant_id`, `status`);
ALTER TABLE `customers` ADD INDEX IF NOT EXISTS `idx_tenant_sales` (`tenant_id`, `sales_user_id`);
ALTER TABLE `customers` ADD INDEX IF NOT EXISTS `idx_tenant_created` (`tenant_id`, `created_at`);

-- 订单表
ALTER TABLE `orders` ADD INDEX IF NOT EXISTS `idx_tenant_status` (`tenant_id`, `status`);
ALTER TABLE `orders` ADD INDEX IF NOT EXISTS `idx_tenant_customer` (`tenant_id`, `customer_id`);
ALTER TABLE `orders` ADD INDEX IF NOT EXISTS `idx_tenant_created` (`tenant_id`, `created_at`);

-- 产品表
ALTER TABLE `products` ADD INDEX IF NOT EXISTS `idx_tenant_status` (`tenant_id`, `status`);
ALTER TABLE `products` ADD INDEX IF NOT EXISTS `idx_tenant_category` (`tenant_id`, `category_id`);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 迁移完成提示
-- ============================================
SELECT '✅ 数据库迁移完成！已为32个业务表添加 tenant_id 字段' AS message;

