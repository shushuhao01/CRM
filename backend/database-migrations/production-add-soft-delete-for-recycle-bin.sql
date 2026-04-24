-- =====================================================
-- 回收站功能 - 生产环境迁移脚本（兼容 phpMyAdmin）
-- 创建时间: 2026-04-02
-- 用途: 为 licenses 和 tenants 表添加软删除字段
-- 执行方式: 在 phpMyAdmin 的 SQL 标签页中粘贴执行
-- =====================================================

-- 1. licenses 表添加 deleted_at 字段
ALTER TABLE `licenses`
  ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL COMMENT '软删除时间（回收站）' AFTER `updated_at`;

-- 2. licenses 表添加 deleted_by 字段
ALTER TABLE `licenses`
  ADD COLUMN `deleted_by` VARCHAR(36) NULL DEFAULT NULL COMMENT '删除操作人' AFTER `deleted_at`;

-- 3. licenses 表添加索引
ALTER TABLE `licenses`
  ADD INDEX `idx_licenses_deleted_at` (`deleted_at`);

-- 4. tenants 表添加 deleted_at 字段
ALTER TABLE `tenants`
  ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL COMMENT '软删除时间（回收站）' AFTER `updated_at`;

-- 5. tenants 表添加 deleted_by 字段
ALTER TABLE `tenants`
  ADD COLUMN `deleted_by` VARCHAR(36) NULL DEFAULT NULL COMMENT '删除操作人' AFTER `deleted_at`;

-- 6. tenants 表添加索引
ALTER TABLE `tenants`
  ADD INDEX `idx_tenants_deleted_at` (`deleted_at`);

