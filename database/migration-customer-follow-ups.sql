-- =============================================
-- 迁移脚本：新增客户跟进记录表 customer_follow_ups
-- 用途：管理后台客户管理模块（统一管理私有+租户客户的跟进记录）
-- 日期：2026-04-04
-- 兼容：MySQL 5.7+ / phpMyAdmin
-- 说明：使用 CREATE TABLE IF NOT EXISTS，可安全重复执行
-- =============================================

CREATE TABLE IF NOT EXISTS `customer_follow_ups` (
  `id` VARCHAR(36) NOT NULL,
  `customer_id` VARCHAR(36) NOT NULL COMMENT '客户ID（licenses.id 或 tenants.id）',
  `customer_type` ENUM('private', 'tenant') NOT NULL COMMENT '客户类型：private-私有客户，tenant-租户客户',
  `content` TEXT NOT NULL COMMENT '跟进内容',
  `operator_id` VARCHAR(36) DEFAULT NULL COMMENT '操作人ID（admin_users.id）',
  `operator_name` VARCHAR(100) DEFAULT NULL COMMENT '操作人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_customer` (`customer_id`, `customer_type`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户跟进记录表（管理后台专用）';

