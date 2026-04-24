-- =============================================
-- 企微管理模块 - 数据库迁移脚本
-- 日期: 2026-04-10
-- 说明: 创建企微管理模块所需的7张数据表
-- 用法: 在MySQL中执行此脚本，或使用 backend/create-wecom-tables.js
-- =============================================

-- 企微配置表
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
  `contact_secret` VARCHAR(255) NULL COMMENT '通讯录同步Secret（用于获取部门和成员列表）',
  `external_contact_secret` VARCHAR(255) NULL COMMENT '客户联系Secret（用于获取外部联系人）',
  `chat_archive_secret` VARCHAR(255) NULL COMMENT '会话存档Secret',
  `chat_archive_private_key` TEXT NULL COMMENT '会话存档私钥',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `connection_status` VARCHAR(20) DEFAULT 'pending' COMMENT '连接状态: pending/connected/failed',
  `last_error` TEXT NULL COMMENT '最后错误信息',
  `last_api_call_time` DATETIME NULL COMMENT '最后API调用时间',
  `api_call_count` INT DEFAULT 0 COMMENT 'API调用次数',
  `bind_operator` VARCHAR(50) NULL COMMENT '绑定操作人',
  `bind_time` DATETIME NULL COMMENT '绑定时间',
  `remark` TEXT NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_corp_id` (`corp_id`),
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_wecom_configs_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微配置表';

-- 企微用户绑定表
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
  INDEX `idx_crm_user_id` (`crm_user_id`),
  INDEX `idx_corp_id` (`corp_id`),
  INDEX `idx_wecom_user_bindings_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微用户绑定表';

-- 企微客户表
CREATE TABLE IF NOT EXISTS `wecom_customers` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `external_user_id` VARCHAR(100) NOT NULL COMMENT '外部联系人ID',
  `name` VARCHAR(100) NULL COMMENT '客户名称',
  `avatar` VARCHAR(500) NULL COMMENT '客户头像',
  `type` INT DEFAULT 1 COMMENT '类型: 1微信用户 2企业微信用户',
  `gender` INT DEFAULT 0 COMMENT '性别: 0未知 1男 2女',
  `corp_name` VARCHAR(200) NULL COMMENT '客户企业名称',
  `position` VARCHAR(100) NULL COMMENT '职位',
  `follow_user_id` VARCHAR(100) NULL COMMENT '跟进成员UserID',
  `follow_user_name` VARCHAR(100) NULL COMMENT '跟进成员姓名',
  `remark` VARCHAR(500) NULL COMMENT '备注',
  `description` TEXT NULL COMMENT '描述',
  `add_time` DATETIME NULL COMMENT '添加时间',
  `add_way` INT NULL COMMENT '添加方式',
  `tag_ids` TEXT NULL COMMENT '标签ID列表(JSON)',
  `status` VARCHAR(20) DEFAULT 'normal' COMMENT '状态: normal/deleted',
  `delete_time` DATETIME NULL COMMENT '删除时间',
  `is_dealt` TINYINT(1) DEFAULT 0 COMMENT '是否成交',
  `crm_customer_id` VARCHAR(50) NULL COMMENT '关联CRM客户ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_config_external_user` (`wecom_config_id`, `external_user_id`),
  INDEX `idx_follow_user_id` (`follow_user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_add_time` (`add_time`),
  INDEX `idx_wecom_customers_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客户表';

-- 企微获客链接表
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
  INDEX `idx_wecom_config_id` (`wecom_config_id`),
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_wecom_acquisition_links_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微获客链接表';

-- 企微客服账号表
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
  `created_by` VARCHAR(50) NULL COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_wecom_config_id` (`wecom_config_id`),
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_wecom_service_accounts_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客服账号表';

-- 企微会话存档表
CREATE TABLE IF NOT EXISTS `wecom_chat_records` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `msg_id` VARCHAR(100) NOT NULL COMMENT '消息ID',
  `msg_type` VARCHAR(50) NOT NULL COMMENT '消息类型',
  `action` VARCHAR(20) NOT NULL COMMENT '消息动作: send/recall/switch',
  `from_user_id` VARCHAR(100) NOT NULL COMMENT '发送者ID',
  `from_user_name` VARCHAR(100) NULL COMMENT '发送者姓名',
  `to_user_ids` TEXT NULL COMMENT '接收者ID列表(JSON)',
  `room_id` VARCHAR(100) NULL COMMENT '群聊ID',
  `msg_time` BIGINT NOT NULL COMMENT '消息时间戳(毫秒)',
  `content` TEXT NULL COMMENT '消息内容(JSON)',
  `media_key` VARCHAR(255) NULL COMMENT '媒体文件ID',
  `media_url` VARCHAR(500) NULL COMMENT '媒体文件URL',
  `audit_remark` TEXT NULL COMMENT '质检备注',
  `audit_by` VARCHAR(50) NULL COMMENT '质检人',
  `audit_time` DATETIME NULL COMMENT '质检时间',
  `is_sensitive` TINYINT(1) DEFAULT 0 COMMENT '是否标记敏感',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_corp_msg` (`corp_id`, `msg_id`),
  INDEX `idx_wecom_config_id` (`wecom_config_id`),
  INDEX `idx_from_user_id` (`from_user_id`),
  INDEX `idx_msg_time` (`msg_time`),
  INDEX `idx_wecom_chat_records_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微会话存档表';

-- 企微收款记录表
CREATE TABLE IF NOT EXISTS `wecom_payment_records` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `trade_no` VARCHAR(100) NOT NULL COMMENT '交易单号',
  `user_id` VARCHAR(100) NULL COMMENT '收款成员ID',
  `user_name` VARCHAR(100) NULL COMMENT '收款成员姓名',
  `external_user_id` VARCHAR(100) NULL COMMENT '付款客户ID',
  `customer_name` VARCHAR(100) NULL COMMENT '付款客户名称',
  `amount` INT NOT NULL COMMENT '收款金额(分)',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/paid/refunded',
  `pay_time` DATETIME NULL COMMENT '支付时间',
  `refund_time` DATETIME NULL COMMENT '退款时间',
  `remark` VARCHAR(500) NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_trade_no` (`trade_no`),
  INDEX `idx_wecom_config_id` (`wecom_config_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_pay_time` (`pay_time`),
  INDEX `idx_wecom_payment_records_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微收款记录表';

-- 企微会话存档设置表（增值服务管理）
CREATE TABLE IF NOT EXISTS `wecom_archive_settings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `storage_type` VARCHAR(20) DEFAULT 'database' COMMENT '存储方式: database/oss',
  `retention_days` INT DEFAULT 365 COMMENT '保留天数',
  `max_users` INT DEFAULT 0 COMMENT '最大开通人数',
  `used_users` INT DEFAULT 0 COMMENT '实际使用人数',
  `status` VARCHAR(20) DEFAULT 'disabled' COMMENT '状态: disabled/active/expired',
  `expire_date` DATE NULL COMMENT '到期日期',
  `oss_bucket` VARCHAR(200) NULL COMMENT 'OSS存储桶名称',
  `oss_prefix` VARCHAR(200) NULL COMMENT 'OSS路径前缀',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微会话存档设置表';

-- 验证创建结果
SELECT TABLE_NAME, TABLE_COMMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME LIKE 'wecom_%'
ORDER BY TABLE_NAME;

