-- =============================================
-- 移动应用安装包管理 - 数据库迁移脚本
-- 适用版本：v4.1.0+
-- 执行环境：phpMyAdmin / MySQL CLI
-- 日期：2026-04-27
-- 说明：新增 mobile_app_packages 表，用于管理移动应用安装包配置
-- =============================================

-- 创建移动应用安装包管理表
CREATE TABLE IF NOT EXISTS `mobile_app_packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `platform` VARCHAR(20) NOT NULL COMMENT '平台: android/ios',
  `app_name` VARCHAR(100) DEFAULT '' COMMENT '应用名称',
  `version` VARCHAR(50) DEFAULT '' COMMENT '版本号',
  `package_url` VARCHAR(500) DEFAULT '' COMMENT '上传的安装包路径',
  `external_url` VARCHAR(500) DEFAULT '' COMMENT '外部下载地址',
  `file_size` BIGINT DEFAULT 0 COMMENT '文件大小(字节)',
  `file_hash` VARCHAR(64) DEFAULT '' COMMENT '文件SHA256哈希',
  `download_count` INT DEFAULT 0 COMMENT '下载次数',
  `is_enabled` TINYINT DEFAULT 1 COMMENT '是否启用: 1启用 0禁用',
  `description` TEXT COMMENT '版本说明',
  `uploaded_by` VARCHAR(100) DEFAULT '' COMMENT '上传者',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY `idx_platform` (`platform`),
  KEY `idx_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='移动应用安装包管理';
