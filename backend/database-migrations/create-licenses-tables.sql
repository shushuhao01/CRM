-- =====================================================
-- Admin后台 - 授权管理表创建脚本
-- 创建时间: 2026-03-04
-- 用途: 创建授权管理所需的数据库表
-- =====================================================

-- 1. 创建授权记录表
CREATE TABLE IF NOT EXISTS `licenses` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '授权ID',
  `license_key` VARCHAR(255) NOT NULL UNIQUE COMMENT '授权码',
  `customer_name` VARCHAR(100) NOT NULL COMMENT '客户名称',
  `customer_contact` VARCHAR(100) COMMENT '联系人',
  `customer_phone` VARCHAR(20) COMMENT '联系电话',
  `customer_email` VARCHAR(100) COMMENT '邮箱',
  `license_type` ENUM('trial', 'perpetual', 'annual', 'monthly') DEFAULT 'trial' COMMENT '授权类型: trial-试用版, perpetual-永久授权, annual-年度授权, monthly-月度授权',
  `max_users` INT DEFAULT 10 COMMENT '最大用户数',
  `max_storage_gb` INT DEFAULT 5 COMMENT '最大存储空间(GB)',
  `features` JSON COMMENT '开通的功能模块',
  `machine_id` VARCHAR(255) COMMENT '绑定的机器码',
  `status` ENUM('active', 'expired', 'revoked', 'pending') DEFAULT 'pending' COMMENT '状态: pending-待激活, active-已激活, expired-已过期, revoked-已撤销',
  `activated_at` DATETIME COMMENT '激活时间',
  `expires_at` DATETIME COMMENT '到期时间',
  `notes` TEXT COMMENT '备注',
  `created_by` VARCHAR(36) COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授权记录表（Admin后台-私有客户授权管理）';

-- 2. 创建授权验证日志表
CREATE TABLE IF NOT EXISTS `license_logs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
  `license_id` VARCHAR(36) COMMENT '授权ID',
  `license_key` VARCHAR(255) COMMENT '授权码',
  `action` ENUM('verify', 'activate', 'renew', 'revoke', 'expire') COMMENT '操作类型: verify-验证, activate-激活, renew-续期, revoke-撤销, expire-过期',
  `machine_id` VARCHAR(255) COMMENT '机器码',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` TEXT COMMENT 'User-Agent',
  `result` ENUM('success', 'failed') COMMENT '结果: success-成功, failed-失败',
  `message` TEXT COMMENT '消息',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_license_id` (`license_id`),
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授权验证日志表（Admin后台-授权操作记录）';

-- 3. 验证表创建
SELECT 
  'licenses' as table_name,
  COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'licenses'
UNION ALL
SELECT 
  'license_logs' as table_name,
  COUNT(*) as column_count
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'license_logs';

-- =====================================================
-- 执行说明:
-- 1. 开发环境: 直接执行此脚本
-- 2. 生产环境: 在宝塔面板的phpMyAdmin中执行
-- 3. 执行前请备份数据库
-- 4. 执行后检查验证结果
-- =====================================================
