-- ================================================================
-- 迁移脚本：为租户和私有客户添加密码记录字段
-- 日期：2026-04-08
-- 说明：添加 member_password（会员中心密码）和 crm_password（CRM密码）字段
--       用于管理后台记录和查看客户系统密码
-- ================================================================

-- 1. tenants 表添加密码字段
ALTER TABLE `tenants`
ADD COLUMN IF NOT EXISTS `member_password` VARCHAR(255) NULL DEFAULT NULL COMMENT '会员中心密码' AFTER `email`,
ADD COLUMN IF NOT EXISTS `crm_password` VARCHAR(255) NULL DEFAULT NULL COMMENT 'CRM系统密码' AFTER `member_password`;

-- 2. licenses 表添加密码字段
ALTER TABLE `licenses`
ADD COLUMN IF NOT EXISTS `member_password` VARCHAR(255) NULL DEFAULT NULL COMMENT '会员中心密码' AFTER `customer_email`,
ADD COLUMN IF NOT EXISTS `crm_password` VARCHAR(255) NULL DEFAULT NULL COMMENT 'CRM系统密码' AFTER `member_password`;

-- 3. 为已有租户设置默认CRM密码（创建时的默认密码）
UPDATE `tenants` SET `crm_password` = 'Aa123456' WHERE `crm_password` IS NULL;

