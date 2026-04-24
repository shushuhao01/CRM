-- =============================================
-- 企微管理模块增强 - 数据库迁移脚本
-- 日期: 2026-04-11
-- 说明:
--   1. 确保 system_config 表存在（管理后台使用）
--   2. 确保 wecom_archive_settings 表字段完整
--   3. 确保 wecom 相关表全部创建
--   4. 添加套餐包相关字段
-- 兼容性: 可在 phpMyAdmin 中直接执行
-- =============================================

-- 1. 创建 system_config 表（管理后台专用配置表，使用snake_case列名）
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` VARCHAR(36) NOT NULL,
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `config_value` TEXT COMMENT '配置值',
  `config_type` VARCHAR(50) DEFAULT 'string' COMMENT '配置类型: string/json/number/boolean/system',
  `config_group` VARCHAR(100) DEFAULT 'general' COMMENT '配置分组',
  `description` VARCHAR(255) DEFAULT NULL COMMENT '配置描述',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID（NULL表示全局配置）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key_tenant` (`config_key`, `tenant_id`),
  KEY `idx_config_key` (`config_key`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表（管理后台）';

-- 2. 确保 wecom_configs 表存在
CREATE TABLE IF NOT EXISTS `wecom_configs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '配置名称',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `corp_secret` VARCHAR(255) NOT NULL COMMENT '应用Secret',
  `agent_id` INT NULL COMMENT '应用AgentId',
  `callback_token` VARCHAR(100) NULL COMMENT '回调Token',
  `encoding_aes_key` VARCHAR(100) NULL COMMENT '消息加解密密钥',
  `callback_url` VARCHAR(500) NULL COMMENT '回调URL',
  `contact_secret` VARCHAR(255) NULL COMMENT '通讯录同步Secret',
  `external_contact_secret` VARCHAR(255) NULL COMMENT '客户联系Secret',
  `chat_archive_secret` VARCHAR(255) NULL COMMENT '会话存档Secret',
  `chat_archive_private_key` TEXT NULL COMMENT '会话存档私钥',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `connection_status` VARCHAR(20) DEFAULT 'pending' COMMENT '连接状态',
  `last_error` TEXT NULL COMMENT '最后错误信息',
  `last_api_call_time` DATETIME NULL COMMENT '最后API调用时间',
  `api_call_count` INT DEFAULT 0 COMMENT 'API调用次数',
  `bind_operator` VARCHAR(50) NULL COMMENT '绑定操作人',
  `bind_time` DATETIME NULL COMMENT '绑定时间',
  `remark` TEXT NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_corp_id` (`corp_id`),
  KEY `idx_is_enabled` (`is_enabled`),
  KEY `idx_wecom_configs_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微配置表';

-- 3. 确保 wecom_user_bindings 表存在
CREATE TABLE IF NOT EXISTS `wecom_user_bindings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `wecom_user_id` VARCHAR(100) NOT NULL COMMENT '企微成员UserID',
  `wecom_user_name` VARCHAR(100) NULL COMMENT '企微成员姓名',
  `wecom_avatar` VARCHAR(500) NULL COMMENT '企微成员头像',
  `wecom_department_ids` VARCHAR(500) NULL COMMENT '企微部门ID列表',
  `crm_user_id` VARCHAR(50) NOT NULL COMMENT 'CRM用户ID',
  `crm_user_name` VARCHAR(100) NULL COMMENT 'CRM用户姓名',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `bind_operator` VARCHAR(50) NULL COMMENT '绑定操作人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_config_wecom_user` (`wecom_config_id`, `wecom_user_id`),
  KEY `idx_crm_user_id` (`crm_user_id`),
  KEY `idx_wecom_user_bindings_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微用户绑定表';

-- 4. 确保 wecom_customers 表存在
CREATE TABLE IF NOT EXISTS `wecom_customers` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `external_user_id` VARCHAR(100) NOT NULL COMMENT '外部联系人ID',
  `name` VARCHAR(100) NULL COMMENT '客户名称',
  `avatar` VARCHAR(500) NULL COMMENT '客户头像',
  `type` INT DEFAULT 1 COMMENT '类型',
  `gender` INT DEFAULT 0 COMMENT '性别',
  `corp_name` VARCHAR(200) NULL COMMENT '客户企业名称',
  `position` VARCHAR(100) NULL COMMENT '职位',
  `follow_user_id` VARCHAR(100) NULL COMMENT '跟进成员UserID',
  `follow_user_name` VARCHAR(100) NULL COMMENT '跟进成员姓名',
  `remark` VARCHAR(500) NULL COMMENT '备注',
  `description` TEXT NULL COMMENT '描述',
  `add_time` DATETIME NULL COMMENT '添加时间',
  `add_way` INT NULL COMMENT '添加方式',
  `tag_ids` TEXT NULL COMMENT '标签ID列表(JSON)',
  `status` VARCHAR(20) DEFAULT 'normal' COMMENT '状态',
  `delete_time` DATETIME NULL COMMENT '删除时间',
  `is_dealt` TINYINT(1) DEFAULT 0 COMMENT '是否成交',
  `crm_customer_id` VARCHAR(50) NULL COMMENT '关联CRM客户ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_config_external_user` (`wecom_config_id`, `external_user_id`),
  KEY `idx_follow_user_id` (`follow_user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_wecom_customers_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客户表';

-- 5. 确保 wecom_chat_records 表存在
CREATE TABLE IF NOT EXISTS `wecom_chat_records` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `msg_id` VARCHAR(100) NOT NULL COMMENT '消息ID',
  `msg_type` VARCHAR(50) NOT NULL COMMENT '消息类型',
  `action` VARCHAR(20) NOT NULL COMMENT '消息动作',
  `from_user_id` VARCHAR(100) NOT NULL COMMENT '发送者ID',
  `from_user_name` VARCHAR(100) NULL COMMENT '发送者姓名',
  `to_user_ids` TEXT NULL COMMENT '接收者ID列表(JSON)',
  `room_id` VARCHAR(100) NULL COMMENT '群聊ID',
  `msg_time` BIGINT NOT NULL COMMENT '消息时间戳(毫秒)',
  `content` TEXT NULL COMMENT '消息内容(JSON)',
  `media_key` VARCHAR(255) NULL COMMENT '媒体文件ID',
  `media_url` VARCHAR(500) NULL COMMENT '媒体文件URL',
  `file_name` VARCHAR(255) NULL COMMENT '文件名',
  `audit_remark` TEXT NULL COMMENT '质检备注',
  `audit_by` VARCHAR(50) NULL COMMENT '质检人',
  `audit_time` DATETIME NULL COMMENT '质检时间',
  `is_sensitive` TINYINT(1) DEFAULT 0 COMMENT '是否标记敏感',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_corp_msg` (`corp_id`, `msg_id`),
  KEY `idx_wecom_config_id` (`wecom_config_id`),
  KEY `idx_from_user_id` (`from_user_id`),
  KEY `idx_msg_time` (`msg_time`),
  KEY `idx_wecom_chat_records_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微会话存档表';

-- 6. 确保 wecom_payment_records 表存在
CREATE TABLE IF NOT EXISTS `wecom_payment_records` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `trade_no` VARCHAR(100) NOT NULL COMMENT '交易单号',
  `payment_no` VARCHAR(100) NULL COMMENT '支付单号',
  `user_id` VARCHAR(100) NULL COMMENT '收款成员ID',
  `user_name` VARCHAR(100) NULL COMMENT '收款成员姓名',
  `external_user_id` VARCHAR(100) NULL COMMENT '付款客户ID',
  `payer_name` VARCHAR(100) NULL COMMENT '付款人姓名',
  `customer_name` VARCHAR(100) NULL COMMENT '付款客户名称',
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '收款金额(元)',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
  `pay_time` DATETIME NULL COMMENT '支付时间',
  `refund_time` DATETIME NULL COMMENT '退款时间',
  `remark` VARCHAR(500) NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_trade_no` (`trade_no`),
  KEY `idx_wecom_config_id` (`wecom_config_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_wecom_payment_records_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微收款记录表';

-- 7. 确保 wecom_acquisition_links 表存在
CREATE TABLE IF NOT EXISTS `wecom_acquisition_links` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `link_id` VARCHAR(100) NULL COMMENT '企微链接ID',
  `link_name` VARCHAR(200) NOT NULL COMMENT '链接名称',
  `link_url` VARCHAR(500) NULL COMMENT '链接地址',
  `welcome_msg` TEXT NULL COMMENT '欢迎语',
  `user_ids` TEXT NULL COMMENT '接待成员ID列表(JSON)',
  `department_ids` TEXT NULL COMMENT '接待部门ID列表(JSON)',
  `tag_ids` TEXT NULL COMMENT '自动打标签ID列表(JSON)',
  `click_count` INT DEFAULT 0 COMMENT '点击次数',
  `add_count` INT DEFAULT 0 COMMENT '添加次数',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_by` VARCHAR(50) NULL COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_wecom_config_id` (`wecom_config_id`),
  KEY `idx_wecom_acquisition_links_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微获客链接表';

-- 8. 确保 wecom_service_accounts 表存在
CREATE TABLE IF NOT EXISTS `wecom_service_accounts` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `open_kf_id` VARCHAR(100) NULL COMMENT '客服账号ID',
  `name` VARCHAR(100) NOT NULL COMMENT '客服名称',
  `avatar` VARCHAR(500) NULL COMMENT '客服头像',
  `kf_url` VARCHAR(500) NULL COMMENT '客服链接',
  `servicer_user_ids` TEXT NULL COMMENT '接待人员ID列表(JSON)',
  `welcome_msg` TEXT NULL COMMENT '欢迎语',
  `session_count` INT DEFAULT 0 COMMENT '会话数',
  `message_count` INT DEFAULT 0 COMMENT '消息数',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `service_time_start` VARCHAR(10) NULL COMMENT '服务开始时间',
  `service_time_end` VARCHAR(10) NULL COMMENT '服务结束时间',
  `created_by` VARCHAR(50) NULL COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_wecom_config_id` (`wecom_config_id`),
  KEY `idx_wecom_service_accounts_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客服账号表';

-- 9. 确保 wecom_archive_settings 表存在且字段完整
CREATE TABLE IF NOT EXISTS `wecom_archive_settings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `storage_type` VARCHAR(20) NOT NULL DEFAULT 'database' COMMENT '存储方式: database/oss',
  `oss_bucket` VARCHAR(200) NULL COMMENT 'OSS存储桶',
  `oss_prefix` VARCHAR(200) NULL COMMENT 'OSS前缀路径',
  `oss_endpoint` VARCHAR(200) NULL COMMENT 'OSS Endpoint',
  `oss_access_key` VARCHAR(200) NULL COMMENT 'OSS AccessKey',
  `oss_secret_key` VARCHAR(200) NULL COMMENT 'OSS SecretKey',
  `retention_days` INT NOT NULL DEFAULT 365 COMMENT '保留天数',
  `max_users` INT NOT NULL DEFAULT 10 COMMENT '开通人数上限',
  `used_users` INT NOT NULL DEFAULT 0 COMMENT '已使用人数',
  `expire_date` DATE NULL COMMENT '服务到期日期',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active/expired/disabled',
  `package_type` VARCHAR(30) NULL DEFAULT 'yearly' COMMENT '套餐类型: monthly/quarterly/yearly',
  `last_cleanup_at` DATETIME NULL COMMENT '最后清理时间',
  `total_messages` INT NOT NULL DEFAULT 0 COMMENT '累计消息数',
  `total_storage_mb` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '累计存储(MB)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_id` (`tenant_id`),
  KEY `idx_status` (`status`),
  KEY `idx_expire_date` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微会话存档设置表';

-- 10. 为 wecom_archive_settings 补充可能缺失的新字段（兼容已有表）
-- 以下使用 PROCEDURE 确保幂等，避免重复添加报错

DROP PROCEDURE IF EXISTS `_wecom_migration_2026_04_11`;

DELIMITER $$
CREATE PROCEDURE `_wecom_migration_2026_04_11`()
BEGIN
  -- 为 wecom_archive_settings 添加新字段（如不存在）
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_archive_settings' AND COLUMN_NAME = 'package_type') THEN
    ALTER TABLE `wecom_archive_settings` ADD COLUMN `package_type` VARCHAR(30) NULL DEFAULT 'yearly' COMMENT '套餐类型: monthly/quarterly/yearly' AFTER `status`;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_archive_settings' AND COLUMN_NAME = 'last_cleanup_at') THEN
    ALTER TABLE `wecom_archive_settings` ADD COLUMN `last_cleanup_at` DATETIME NULL COMMENT '最后清理时间' AFTER `package_type`;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_archive_settings' AND COLUMN_NAME = 'total_messages') THEN
    ALTER TABLE `wecom_archive_settings` ADD COLUMN `total_messages` INT NOT NULL DEFAULT 0 COMMENT '累计消息数' AFTER `last_cleanup_at`;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_archive_settings' AND COLUMN_NAME = 'total_storage_mb') THEN
    ALTER TABLE `wecom_archive_settings` ADD COLUMN `total_storage_mb` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '累计存储(MB)' AFTER `total_messages`;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_archive_settings' AND COLUMN_NAME = 'oss_endpoint') THEN
    ALTER TABLE `wecom_archive_settings` ADD COLUMN `oss_endpoint` VARCHAR(200) NULL COMMENT 'OSS Endpoint' AFTER `oss_prefix`;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_archive_settings' AND COLUMN_NAME = 'oss_access_key') THEN
    ALTER TABLE `wecom_archive_settings` ADD COLUMN `oss_access_key` VARCHAR(200) NULL COMMENT 'OSS AccessKey' AFTER `oss_endpoint`;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_archive_settings' AND COLUMN_NAME = 'oss_secret_key') THEN
    ALTER TABLE `wecom_archive_settings` ADD COLUMN `oss_secret_key` VARCHAR(200) NULL COMMENT 'OSS SecretKey' AFTER `oss_access_key`;
  END IF;

  -- 为 wecom_chat_records 添加 file_name 字段
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_chat_records' AND COLUMN_NAME = 'file_name') THEN
    ALTER TABLE `wecom_chat_records` ADD COLUMN `file_name` VARCHAR(255) NULL COMMENT '文件名' AFTER `media_url`;
  END IF;

  -- 为 wecom_payment_records 添加 payment_no 字段（如不存在）
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_payment_records' AND COLUMN_NAME = 'payment_no') THEN
    ALTER TABLE `wecom_payment_records` ADD COLUMN `payment_no` VARCHAR(100) NULL COMMENT '支付单号' AFTER `trade_no`;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_payment_records' AND COLUMN_NAME = 'payer_name') THEN
    ALTER TABLE `wecom_payment_records` ADD COLUMN `payer_name` VARCHAR(100) NULL COMMENT '付款人姓名' AFTER `external_user_id`;
  END IF;

  -- 为 wecom_service_accounts 添加服务时间字段
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_service_accounts' AND COLUMN_NAME = 'service_time_start') THEN
    ALTER TABLE `wecom_service_accounts` ADD COLUMN `service_time_start` VARCHAR(10) NULL COMMENT '服务开始时间' AFTER `is_enabled`;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_service_accounts' AND COLUMN_NAME = 'service_time_end') THEN
    ALTER TABLE `wecom_service_accounts` ADD COLUMN `service_time_end` VARCHAR(10) NULL COMMENT '服务结束时间' AFTER `service_time_start`;
  END IF;

  -- 确保 tenants 表有 wecom_chat_archive_auth 列
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'wecom_chat_archive_auth') THEN
    ALTER TABLE `tenants` ADD COLUMN `wecom_chat_archive_auth` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '会话存档增值服务授权: 0=未授权, 1=已授权';
  END IF;
END$$
DELIMITER ;

CALL `_wecom_migration_2026_04_11`();
DROP PROCEDURE IF EXISTS `_wecom_migration_2026_04_11`;

