-- =============================================
-- CRM系统 - 寄件人/退货地址表创建脚本
-- 适用于：MySQL 8.0+ / phpMyAdmin
-- 日期：2026-04-08
-- 说明：新增寄件人地址和退货地址管理功能
-- =============================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `sender_addresses` (
  `id` VARCHAR(50) NOT NULL COMMENT '地址ID',
  `tenant_id` VARCHAR(36) NULL DEFAULT NULL COMMENT '租户ID',
  `type` VARCHAR(20) NOT NULL DEFAULT 'sender' COMMENT '类型: sender=寄件人, return=退货地址',
  `name` VARCHAR(50) NOT NULL COMMENT '联系人姓名',
  `phone` VARCHAR(20) NOT NULL COMMENT '联系电话',
  `province` VARCHAR(50) NULL DEFAULT NULL COMMENT '省',
  `city` VARCHAR(50) NULL DEFAULT NULL COMMENT '市',
  `district` VARCHAR(50) NULL DEFAULT NULL COMMENT '区/县',
  `address` VARCHAR(500) NOT NULL COMMENT '详细地址',
  `full_address` VARCHAR(600) NULL DEFAULT NULL COMMENT '完整地址(省市区+详细)',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否默认: 0否 1是',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `remark` TEXT NULL DEFAULT NULL COMMENT '备注',
  `linked_service_types` JSON NULL DEFAULT NULL COMMENT '关联售后类型(退货地址用): ["return","exchange"]',
  `created_by` VARCHAR(50) NULL DEFAULT NULL COMMENT '创建人ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_sender_addresses_tenant_type` (`tenant_id`, `type`),
  INDEX `idx_sender_addresses_tenant_default` (`tenant_id`, `type`, `is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='寄件人/退货地址表';

