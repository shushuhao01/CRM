-- =========================================================
-- 生产环境迁移脚本：重建 api_call_logs 表
-- 日期：2026-04-04
-- 说明：api_call_logs 表结构与 ApiCallLog 实体不匹配，
--       需要重建以匹配后端 TypeORM 实体定义
-- 兼容：phpMyAdmin / MySQL 5.7+ / MySQL 8.0+
-- =========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 备份旧数据（可选，如需保留可取消注释）
-- CREATE TABLE IF NOT EXISTS api_call_logs_bak_20260404 AS SELECT * FROM api_call_logs;

-- 删除旧表
DROP TABLE IF EXISTS `api_call_logs`;

-- 创建新表（匹配 ApiCallLog 实体）
CREATE TABLE `api_call_logs` (
  `id` VARCHAR(36) NOT NULL COMMENT '日志ID',
  `api_config_id` VARCHAR(36) NULL COMMENT 'API配置ID',
  `api_key` VARCHAR(100) NULL COMMENT 'API密钥',
  `endpoint` VARCHAR(255) NOT NULL COMMENT '调用端点',
  `method` VARCHAR(10) NOT NULL COMMENT '请求方法',
  `request_params` TEXT NULL COMMENT '请求参数',
  `response_status` INT NULL COMMENT '响应状态码',
  `response_time` INT NULL COMMENT '响应时间(ms)',
  `ip_address` VARCHAR(50) NULL COMMENT 'IP地址',
  `user_agent` TEXT NULL COMMENT 'User Agent',
  `error_message` TEXT NULL COMMENT '错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_api_call_logs_api_config_id` (`api_config_id`),
  INDEX `idx_api_call_logs_api_key` (`api_key`),
  INDEX `idx_api_call_logs_created_at` (`created_at`),
  INDEX `idx_api_call_logs_endpoint` (`endpoint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API调用日志表';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'api_call_logs 表重建完成' AS result;

