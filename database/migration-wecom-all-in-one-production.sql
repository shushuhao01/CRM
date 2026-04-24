-- =============================================
-- 企微管理模块 - 生产环境一键迁移SQL（完整合并版）
-- 版本: V2.0 All-In-One
-- 日期: 2026-04-13
-- 兼容: MySQL 8.0+ / phpMyAdmin
--
-- 本文件合并了以下所有迁移内容:
--   1. 8张V1基础表(含全部字段补丁)
--   2. system_config 管理后台配置表
--   3. V2.0扩展: wecom_configs(+11), wecom_customers(+7),
--      wecom_chat_records(+3), customers(+1)
--   4. V2.0新建11张表: wecom_customer_groups, wecom_sensitive_words,
--      wecom_sensitive_hits, wecom_quality_rules, wecom_quality_inspections,
--      wecom_archive_members, wecom_vas_orders, wecom_vas_configs,
--      wecom_kf_sessions, wecom_quick_replies, wecom_archive_settings_v2(临时)
--   5. 获客链接增强字段(weight_config, loss_count, daily_stats)
--   6. tenants/licenses 会话存档授权字段
--   7. modules 表插入企微管理模块记录
--   8. 性能优化索引
--
-- 特点:
--   - 全部使用 IF NOT EXISTS / 存储过程安全添加，可重复执行
--   - 在 phpMyAdmin 中"导入"此文件即可
--   - 执行前建议备份数据库!
-- =============================================

SET NAMES utf8mb4;
SET time_zone = '+08:00';

-- =============================================
-- 工具: 安全添加列的存储过程
-- =============================================
DROP PROCEDURE IF EXISTS `_wecom_safe_add_column`;
DELIMITER $$
CREATE PROCEDURE `_wecom_safe_add_column`(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  SET @col_exists = 0;
  SELECT COUNT(*) INTO @col_exists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column;
  IF @col_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- 工具: 安全添加索引的存储过程
DROP PROCEDURE IF EXISTS `_wecom_safe_add_index`;
DELIMITER $$
CREATE PROCEDURE `_wecom_safe_add_index`(
  IN p_table VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_index_type VARCHAR(10),
  IN p_columns TEXT
)
BEGIN
  SET @idx_exists = 0;
  SELECT COUNT(*) INTO @idx_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index_name;
  IF @idx_exists = 0 THEN
    IF p_index_type = 'UNIQUE' THEN
      SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD UNIQUE INDEX `', p_index_name, '` (', p_columns, ')');
    ELSE
      SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index_name, '` (', p_columns, ')');
    END IF;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;


-- ==========================================================
-- 第一部分: 创建基础表 (V1 + 全部字段补丁，使用最终完整定义)
-- ==========================================================

-- 1. system_config 管理后台配置表
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

-- 2. wecom_configs 企微配置表（含V2授权字段）
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
  KEY `idx_is_enabled` (`is_enabled`),
  KEY `idx_wecom_configs_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微配置表';

-- 3. wecom_user_bindings 企微用户绑定表
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

-- 4. wecom_customers 企微客户表
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
  KEY `idx_follow_user_id` (`follow_user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_wecom_customers_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客户表';

-- 5. wecom_acquisition_links 企微获客链接表
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

-- 6. wecom_service_accounts 企微客服账号表
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
  KEY `idx_wecom_config_id` (`wecom_config_id`),
  KEY `idx_wecom_service_accounts_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客服账号表';

-- 7. wecom_chat_records 企微会话存档表
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

-- 8. wecom_payment_records 企微收款记录表
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
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/paid/refunded',
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

-- 9. wecom_archive_settings 企微会话存档设置表
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


-- ==========================================================
-- 第二部分: 安全补全所有V1字段补丁 (已有表才需要)
-- ==========================================================

-- wecom_archive_settings 补充新字段
CALL _wecom_safe_add_column('wecom_archive_settings', 'package_type', "VARCHAR(30) NULL DEFAULT 'yearly' COMMENT '套餐类型: monthly/quarterly/yearly' AFTER `status`");
CALL _wecom_safe_add_column('wecom_archive_settings', 'last_cleanup_at', "DATETIME NULL COMMENT '最后清理时间' AFTER `package_type`");
CALL _wecom_safe_add_column('wecom_archive_settings', 'total_messages', "INT NOT NULL DEFAULT 0 COMMENT '累计消息数' AFTER `last_cleanup_at`");
CALL _wecom_safe_add_column('wecom_archive_settings', 'total_storage_mb', "DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '累计存储(MB)' AFTER `total_messages`");
CALL _wecom_safe_add_column('wecom_archive_settings', 'oss_endpoint', "VARCHAR(200) NULL COMMENT 'OSS Endpoint' AFTER `oss_prefix`");
CALL _wecom_safe_add_column('wecom_archive_settings', 'oss_access_key', "VARCHAR(200) NULL COMMENT 'OSS AccessKey' AFTER `oss_endpoint`");
CALL _wecom_safe_add_column('wecom_archive_settings', 'oss_secret_key', "VARCHAR(200) NULL COMMENT 'OSS SecretKey' AFTER `oss_access_key`");

-- wecom_chat_records 补充 file_name
CALL _wecom_safe_add_column('wecom_chat_records', 'file_name', "VARCHAR(255) NULL COMMENT '文件名' AFTER `media_url`");

-- wecom_payment_records 补充字段
CALL _wecom_safe_add_column('wecom_payment_records', 'payment_no', "VARCHAR(100) NULL COMMENT '支付单号' AFTER `trade_no`");
CALL _wecom_safe_add_column('wecom_payment_records', 'payer_name', "VARCHAR(100) NULL COMMENT '付款人姓名' AFTER `external_user_id`");

-- wecom_service_accounts 补充服务时间
CALL _wecom_safe_add_column('wecom_service_accounts', 'service_time_start', "VARCHAR(10) NULL COMMENT '服务开始时间' AFTER `is_enabled`");
CALL _wecom_safe_add_column('wecom_service_accounts', 'service_time_end', "VARCHAR(10) NULL COMMENT '服务结束时间' AFTER `service_time_start`");

-- wecom_acquisition_links 补充增强字段(weight_config, loss_count, daily_stats)
CALL _wecom_safe_add_column('wecom_acquisition_links', 'weight_config', "TEXT NULL COMMENT '成员权重配置(JSON: [{userId,weight}])'");
CALL _wecom_safe_add_column('wecom_acquisition_links', 'loss_count', "INT DEFAULT 0 COMMENT '流失数量'");
CALL _wecom_safe_add_column('wecom_acquisition_links', 'daily_stats', "TEXT NULL COMMENT '每日统计(JSON: [{date,click,add,loss}])'");


-- ==========================================================
-- 第三部分: V2.0 扩展 — 为现有4张表新增字段
-- ==========================================================

-- 3.1 wecom_configs 新增11个V2授权字段
CALL _wecom_safe_add_column('wecom_configs', 'auth_type', "VARCHAR(20) DEFAULT 'self_built' COMMENT '授权类型: third_party/self_built'");
CALL _wecom_safe_add_column('wecom_configs', 'permanent_code', "TEXT NULL COMMENT '第三方应用永久授权码(加密存储)'");
CALL _wecom_safe_add_column('wecom_configs', 'suite_id', "VARCHAR(50) NULL COMMENT '第三方应用SuiteID'");
CALL _wecom_safe_add_column('wecom_configs', 'auth_corp_info', "TEXT NULL COMMENT '授权方企业信息(JSON)'");
CALL _wecom_safe_add_column('wecom_configs', 'auth_user_info', "TEXT NULL COMMENT '授权管理员信息(JSON)'");
CALL _wecom_safe_add_column('wecom_configs', 'auth_scope', "TEXT NULL COMMENT '授权范围(JSON)'");
CALL _wecom_safe_add_column('wecom_configs', 'data_api_status', "TINYINT DEFAULT 0 COMMENT '数据API授权状态: 0未授权 1已授权 2已过期'");
CALL _wecom_safe_add_column('wecom_configs', 'data_api_expire_time', "DATETIME NULL COMMENT '数据API授权到期时间'");
CALL _wecom_safe_add_column('wecom_configs', 'vas_chat_archive', "BOOLEAN DEFAULT FALSE COMMENT '是否开通会话存档增值服务'");
CALL _wecom_safe_add_column('wecom_configs', 'vas_expire_date', "DATE NULL COMMENT '增值服务到期时间'");
CALL _wecom_safe_add_column('wecom_configs', 'vas_user_count', "INT DEFAULT 0 COMMENT '增值服务开通人数'");

-- 3.2 wecom_customers 新增7个V2字段
CALL _wecom_safe_add_column('wecom_customers', 'tag_names', "TEXT NULL COMMENT '客户标签名称列表(JSON)'");
CALL _wecom_safe_add_column('wecom_customers', 'phone', "VARCHAR(20) NULL COMMENT '手机号'");
CALL _wecom_safe_add_column('wecom_customers', 'state', "VARCHAR(100) NULL COMMENT '渠道来源标识'");
CALL _wecom_safe_add_column('wecom_customers', 'msg_sent_count', "INT DEFAULT 0 COMMENT '发送消息数'");
CALL _wecom_safe_add_column('wecom_customers', 'msg_recv_count', "INT DEFAULT 0 COMMENT '接收消息数'");
CALL _wecom_safe_add_column('wecom_customers', 'last_msg_time', "BIGINT NULL COMMENT '最后消息时间戳'");
CALL _wecom_safe_add_column('wecom_customers', 'active_days_7d', "INT DEFAULT 0 COMMENT '近7天活跃天数'");

-- 3.3 wecom_chat_records 新增3个V2字段
CALL _wecom_safe_add_column('wecom_chat_records', 'sender_type', "TINYINT NULL COMMENT '发送者类型: 1员工 2客户'");
CALL _wecom_safe_add_column('wecom_chat_records', 'receiver_type', "TINYINT NULL COMMENT '接收者类型: 1员工 2客户 3群聊'");
CALL _wecom_safe_add_column('wecom_chat_records', 'oss_path', "VARCHAR(256) NULL COMMENT 'OSS存储路径'");

-- 3.4 customers 表新增 wecom_external_userid 字段
CALL _wecom_safe_add_column('customers', 'wecom_external_userid', "VARCHAR(100) NULL COMMENT '客户唯一企微编码(USID)'");

-- 3.5 customers 唯一索引
CALL _wecom_safe_add_index('customers', 'uk_tenant_wecom_userid', 'UNIQUE', '`tenant_id`, `wecom_external_userid`');

-- 3.6 wecom_archive_settings V2 扩展字段
CALL _wecom_safe_add_column('wecom_archive_settings', 'wecom_config_id', "INT NULL COMMENT '企微配置ID' AFTER `tenant_id`");
CALL _wecom_safe_add_column('wecom_archive_settings', 'fetch_interval', "INT DEFAULT 5 COMMENT '拉取间隔(分钟)'");
CALL _wecom_safe_add_column('wecom_archive_settings', 'fetch_mode', "VARCHAR(20) DEFAULT 'default' COMMENT '拉取模式: default/pre_page/adaptive'");
CALL _wecom_safe_add_column('wecom_archive_settings', 'media_storage', "VARCHAR(20) DEFAULT 'local' COMMENT '媒体存储方式: local/oss'");
CALL _wecom_safe_add_column('wecom_archive_settings', 'auto_inspect', "TINYINT(1) DEFAULT 0 COMMENT '是否自动质检'");
CALL _wecom_safe_add_column('wecom_archive_settings', 'member_scope', "TEXT NULL COMMENT '存档成员范围(JSON)'");
CALL _wecom_safe_add_column('wecom_archive_settings', 'rsa_public_key', "TEXT NULL COMMENT 'RSA公钥'");
CALL _wecom_safe_add_column('wecom_archive_settings', 'visibility', "VARCHAR(20) DEFAULT 'all' COMMENT '成员可见性: self/department/all'");


-- ==========================================================
-- 第四部分: V2.0 新建11张表
-- ==========================================================

-- 4.1 企微客户群表
CREATE TABLE IF NOT EXISTS `wecom_customer_groups` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `chat_id` VARCHAR(100) NOT NULL COMMENT '群聊ID',
  `name` VARCHAR(200) NULL COMMENT '群名称',
  `owner_user_id` VARCHAR(100) NULL COMMENT '群主UserID',
  `owner_user_name` VARCHAR(100) NULL COMMENT '群主姓名',
  `member_count` INT DEFAULT 0 COMMENT '群成员数量',
  `today_msg_count` INT DEFAULT 0 COMMENT '今日消息数',
  `notice` TEXT NULL COMMENT '群公告',
  `create_time` DATETIME NULL COMMENT '群创建时间',
  `status` VARCHAR(20) DEFAULT 'normal' COMMENT '状态: normal/dismissed',
  `member_list` TEXT NULL COMMENT '群成员列表(JSON)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_config_chat` (`wecom_config_id`, `chat_id`),
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_owner` (`owner_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客户群表';

-- 4.2 敏感词表
CREATE TABLE IF NOT EXISTS `wecom_sensitive_words` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NULL COMMENT '企微配置ID(NULL表示全局)',
  `word` VARCHAR(200) NOT NULL COMMENT '敏感词',
  `group_name` VARCHAR(100) DEFAULT 'custom' COMMENT '分组: porn/politics/violence/competitor/custom',
  `level` VARCHAR(20) DEFAULT 'warning' COMMENT '级别: info/warning/danger/critical',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_by` VARCHAR(50) NULL COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_word` (`tenant_id`, `word`),
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_group` (`group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词表';

-- 4.3 敏感词命中记录表
CREATE TABLE IF NOT EXISTS `wecom_sensitive_hits` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `chat_record_id` INT NULL COMMENT '关联的聊天记录ID',
  `word_id` INT NOT NULL COMMENT '命中的敏感词ID',
  `word` VARCHAR(200) NOT NULL COMMENT '命中的敏感词内容',
  `context` TEXT NULL COMMENT '消息上下文',
  `from_user_id` VARCHAR(100) NULL COMMENT '发送者ID',
  `from_user_name` VARCHAR(100) NULL COMMENT '发送者姓名',
  `to_user_id` VARCHAR(100) NULL COMMENT '接收者ID',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/processed/ignored',
  `processed_by` VARCHAR(50) NULL COMMENT '处理人',
  `processed_at` DATETIME NULL COMMENT '处理时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词命中记录表';

-- 4.4 质检规则表
CREATE TABLE IF NOT EXISTS `wecom_quality_rules` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '规则名称',
  `rule_type` VARCHAR(30) NOT NULL COMMENT '规则类型: response_time/msg_count/keyword/emotion',
  `conditions` TEXT NOT NULL COMMENT '条件参数(JSON)',
  `score_value` INT DEFAULT 0 COMMENT '分值(正加负减)',
  `apply_scope` TEXT NULL COMMENT '适用范围(JSON: 部门/员工)',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_type` (`rule_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='质检规则表';

-- 4.5 质检记录表
CREATE TABLE IF NOT EXISTS `wecom_quality_inspections` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `session_key` VARCHAR(200) NULL COMMENT '会话标识',
  `from_user_id` VARCHAR(100) NULL COMMENT '员工UserID',
  `from_user_name` VARCHAR(100) NULL COMMENT '员工姓名',
  `to_user_id` VARCHAR(100) NULL COMMENT '对方UserID',
  `to_user_name` VARCHAR(100) NULL COMMENT '对方姓名',
  `room_id` VARCHAR(100) NULL COMMENT '群聊ID(群聊场景)',
  `message_count` INT DEFAULT 0 COMMENT '消息数量',
  `start_time` DATETIME NULL COMMENT '会话开始时间',
  `end_time` DATETIME NULL COMMENT '会话结束时间',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/normal/excellent/violation',
  `violation_type` TEXT NULL COMMENT '违规类型(JSON数组)',
  `score` INT NULL COMMENT '质检评分(0-100)',
  `remark` TEXT NULL COMMENT '质检备注',
  `inspector_id` VARCHAR(50) NULL COMMENT '质检员ID',
  `inspector_name` VARCHAR(100) NULL COMMENT '质检员姓名',
  `inspected_at` DATETIME NULL COMMENT '质检时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_from_user` (`from_user_id`),
  INDEX `idx_inspected` (`inspected_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='质检记录表';

-- 4.6 存档生效成员表
CREATE TABLE IF NOT EXISTS `wecom_archive_members` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(50) NULL COMMENT '租户ID',
  `wecom_user_id` VARCHAR(100) NOT NULL COMMENT '企微成员userId',
  `wecom_user_name` VARCHAR(200) NULL COMMENT '成员名称(冗余)',
  `crm_user_id` VARCHAR(50) NULL COMMENT '关联CRM用户ID',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用存档',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_user` (`tenant_id`, `wecom_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='存档生效成员表';

-- 4.7 企微增值服务订单表
CREATE TABLE IF NOT EXISTS `wecom_vas_orders` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `order_no` VARCHAR(32) NOT NULL COMMENT '订单号',
  `wecom_config_id` INT NULL COMMENT '企微配置ID',
  `service_type` VARCHAR(50) DEFAULT 'chat_archive' COMMENT '服务类型',
  `order_type` VARCHAR(20) DEFAULT 'new' COMMENT '订单类型: new/renew/upgrade/addon',
  `user_count` INT DEFAULT 0 COMMENT '开通/增购人数',
  `unit_price` DECIMAL(10,2) NULL COMMENT '单价',
  `total_amount` DECIMAL(10,2) NOT NULL COMMENT '总金额',
  `pay_type` VARCHAR(20) NULL COMMENT '支付方式: wechat/alipay/bank',
  `pay_status` TINYINT DEFAULT 0 COMMENT '0待支付 1已支付 2已取消 3已退款',
  `pay_time` DATETIME NULL COMMENT '支付时间',
  `transaction_id` VARCHAR(64) NULL COMMENT '第三方支付流水号',
  `start_date` DATE NULL COMMENT '服务开始日期',
  `end_date` DATE NULL COMMENT '服务到期日期',
  `detail` TEXT NULL COMMENT '订单详情(JSON)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_order_no` (`order_no`),
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_pay_status` (`pay_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微增值服务订单表';

-- 4.8 企微增值服务配置表（Admin管理后台专属）
CREATE TABLE IF NOT EXISTS `wecom_vas_configs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `service_type` VARCHAR(50) NOT NULL COMMENT '服务类型',
  `service_name` VARCHAR(100) NULL COMMENT '服务名称',
  `default_price` DECIMAL(10,2) NULL COMMENT '默认价格',
  `min_price` DECIMAL(10,2) NULL COMMENT '最低价格',
  `billing_unit` VARCHAR(20) DEFAULT 'per_user_year' COMMENT '计费单位',
  `trial_days` INT DEFAULT 7 COMMENT '试用天数',
  `tier_pricing` TEXT NULL COMMENT '阶梯定价(JSON)',
  `description` TEXT NULL COMMENT '服务说明',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_service_type` (`service_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微增值服务配置表';

-- 4.9 企微客服会话表
CREATE TABLE IF NOT EXISTS `wecom_kf_sessions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `open_kf_id` VARCHAR(100) NOT NULL COMMENT '客服账号ID',
  `external_userid` VARCHAR(100) NULL COMMENT '客户外部ID',
  `customer_name` VARCHAR(100) NULL COMMENT '客户名称',
  `servicer_userid` VARCHAR(100) NULL COMMENT '接待人员ID',
  `servicer_name` VARCHAR(100) NULL COMMENT '接待人员名称',
  `session_status` VARCHAR(20) DEFAULT 'open' COMMENT '会话状态: open/closed/timeout',
  `msg_count` INT DEFAULT 0 COMMENT '消息数量',
  `first_response_time` INT NULL COMMENT '首次响应时间(秒)',
  `avg_response_time` INT NULL COMMENT '平均响应时间(秒)',
  `satisfaction` TINYINT NULL COMMENT '满意度(1-5)',
  `last_msg_content` TEXT NULL COMMENT '最后消息内容',
  `last_msg_time` DATETIME NULL COMMENT '最后消息时间',
  `session_start_time` DATETIME NULL COMMENT '会话开始时间',
  `session_end_time` DATETIME NULL COMMENT '会话结束时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_open_kf_id` (`open_kf_id`),
  INDEX `idx_status` (`session_status`),
  INDEX `idx_start_time` (`session_start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客服会话表';

-- 4.10 企微快捷回复表
CREATE TABLE IF NOT EXISTS `wecom_quick_replies` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `category` VARCHAR(20) DEFAULT 'enterprise' COMMENT '类别: enterprise/personal',
  `group_name` VARCHAR(100) NULL COMMENT '分组名称',
  `title` VARCHAR(200) NOT NULL COMMENT '标题',
  `content` TEXT NOT NULL COMMENT '内容',
  `shortcut` VARCHAR(50) NULL COMMENT '快捷键',
  `use_count` INT DEFAULT 0 COMMENT '使用次数',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_by` VARCHAR(50) NULL COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_group` (`group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微快捷回复表';


-- ==========================================================
-- 第五部分: CRM现有表扩展（tenants / licenses / modules）
-- ==========================================================

-- 5.1 tenants 表添加会话存档授权字段
CALL _wecom_safe_add_column('tenants', 'wecom_chat_archive_auth', "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '会话存档增值服务授权: 0=未授权, 1=已授权'");

-- 5.2 licenses 表添加会话存档授权字段
CALL _wecom_safe_add_column('licenses', 'wecom_chat_archive_auth', "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '会话存档增值服务授权: 0=未授权, 1=已授权'");

-- 5.3 modules 表添加企微管理模块（安全插入）
DROP PROCEDURE IF EXISTS `_wecom_add_module`;
DELIMITER $$
CREATE PROCEDURE `_wecom_add_module`()
BEGIN
  DECLARE v_count INT DEFAULT 0;
  DECLARE v_max_sort INT DEFAULT 0;

  SELECT COUNT(*) INTO v_count FROM `modules` WHERE `code` = 'wecom_management';

  IF v_count = 0 THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_max_sort FROM `modules`;
    INSERT INTO `modules` (`id`, `name`, `code`, `description`, `icon`, `version`, `status`, `is_system`, `sort_order`, `created_at`, `updated_at`)
    VALUES (UUID(), '企微管理', 'wecom_management', '企业微信集成管理，包括企微应用配置、客户同步、会话存档等功能', 'ChatLineSquare', '2.0.0', 'enabled', 0, v_max_sort, NOW(), NOW());
  ELSE
    UPDATE `modules` SET `status` = 'enabled', `name` = '企微管理', `version` = '2.0.0' WHERE `code` = 'wecom_management';
  END IF;
END$$
DELIMITER ;
CALL _wecom_add_module();
DROP PROCEDURE IF EXISTS `_wecom_add_module`;


-- ==========================================================
-- 第六部分: 性能优化索引
-- ==========================================================

-- wecom_customers 索引
CALL _wecom_safe_add_index('wecom_customers', 'IDX_wecom_customers_config_follow_status', 'NORMAL', '`wecom_config_id`, `follow_user_id`, `status`');
CALL _wecom_safe_add_index('wecom_customers', 'IDX_wecom_customers_config_addtime', 'NORMAL', '`wecom_config_id`, `add_time`');
CALL _wecom_safe_add_index('wecom_customers', 'IDX_wecom_customers_crm_customer', 'NORMAL', '`crm_customer_id`');

-- wecom_chat_records 索引
CALL _wecom_safe_add_index('wecom_chat_records', 'IDX_wecom_chat_records_config_time', 'NORMAL', '`wecom_config_id`, `msg_time`');
CALL _wecom_safe_add_index('wecom_chat_records', 'IDX_wecom_chat_records_from_user', 'NORMAL', '`from_user_id`, `msg_time`');

-- wecom_payment_records 索引
CALL _wecom_safe_add_index('wecom_payment_records', 'IDX_wecom_payment_records_config_time', 'NORMAL', '`wecom_config_id`, `created_at`');


-- ==========================================================
-- 第七部分: tenant_id 回填（从 wecom_configs 关联获取）
-- ==========================================================

UPDATE `wecom_user_bindings` sub
  INNER JOIN `wecom_configs` cfg ON sub.wecom_config_id = cfg.id
  SET sub.tenant_id = cfg.tenant_id
  WHERE sub.tenant_id IS NULL AND cfg.tenant_id IS NOT NULL;

UPDATE `wecom_customers` sub
  INNER JOIN `wecom_configs` cfg ON sub.wecom_config_id = cfg.id
  SET sub.tenant_id = cfg.tenant_id
  WHERE sub.tenant_id IS NULL AND cfg.tenant_id IS NOT NULL;

UPDATE `wecom_acquisition_links` sub
  INNER JOIN `wecom_configs` cfg ON sub.wecom_config_id = cfg.id
  SET sub.tenant_id = cfg.tenant_id
  WHERE sub.tenant_id IS NULL AND cfg.tenant_id IS NOT NULL;

UPDATE `wecom_service_accounts` sub
  INNER JOIN `wecom_configs` cfg ON sub.wecom_config_id = cfg.id
  SET sub.tenant_id = cfg.tenant_id
  WHERE sub.tenant_id IS NULL AND cfg.tenant_id IS NOT NULL;

UPDATE `wecom_chat_records` sub
  INNER JOIN `wecom_configs` cfg ON sub.wecom_config_id = cfg.id
  SET sub.tenant_id = cfg.tenant_id
  WHERE sub.tenant_id IS NULL AND cfg.tenant_id IS NOT NULL;

UPDATE `wecom_payment_records` sub
  INNER JOIN `wecom_configs` cfg ON sub.wecom_config_id = cfg.id
  SET sub.tenant_id = cfg.tenant_id
  WHERE sub.tenant_id IS NULL AND cfg.tenant_id IS NOT NULL;


-- ==========================================================
-- 清理工具存储过程
-- ==========================================================
DROP PROCEDURE IF EXISTS `_wecom_safe_add_column`;
DROP PROCEDURE IF EXISTS `_wecom_safe_add_index`;


-- ==========================================================
-- 验证结果
-- ==========================================================
SELECT '========== 企微表清单 ==========' AS `_`;
SELECT TABLE_NAME, TABLE_COMMENT, TABLE_ROWS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND (TABLE_NAME LIKE 'wecom_%' OR TABLE_NAME = 'system_config')
ORDER BY TABLE_NAME;

SELECT '========== modules 企微记录 ==========' AS `_`;
SELECT id, name, code, status, version FROM modules WHERE code = 'wecom_management';

SELECT '========== tenants/licenses 新字段 ==========' AS `_`;
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND COLUMN_NAME = 'wecom_chat_archive_auth'
ORDER BY TABLE_NAME;

SELECT '========== customers 企微字段 ==========' AS `_`;
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'customers'
  AND COLUMN_NAME = 'wecom_external_userid';

SELECT '✅ 企微管理V2.0全量迁移完成！' AS message;
SELECT CONCAT('共涉及 wecom_ 表: ', COUNT(*), ' 张') AS summary
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'wecom_%';

