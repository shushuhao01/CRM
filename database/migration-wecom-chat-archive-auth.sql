-- =============================================
-- 企微管理模块 - 会话存档增值服务授权字段
-- 日期: 2026-04-11
-- 说明: 为 tenants 表和 licenses 表添加 wecom_chat_archive_auth 列
--       用于管理后台控制会话存档增值服务的授权
-- =============================================

-- 1. tenants 表：SaaS租户的会话存档授权
ALTER TABLE `tenants`
  ADD COLUMN IF NOT EXISTS `wecom_chat_archive_auth` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '会话存档增值服务授权: 0=未授权, 1=已授权';

-- 2. licenses 表：私有部署客户的会话存档授权
ALTER TABLE `licenses`
  ADD COLUMN IF NOT EXISTS `wecom_chat_archive_auth` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '会话存档增值服务授权: 0=未授权, 1=已授权';

-- 验证 tenants 表
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tenants'
  AND COLUMN_NAME = 'wecom_chat_archive_auth';

-- 验证 licenses 表
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'licenses'
  AND COLUMN_NAME = 'wecom_chat_archive_auth';
