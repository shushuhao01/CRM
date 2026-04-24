-- =============================================
-- 企微管理V2.0 数据库迁移SQL（生产环境）
-- 版本：V2.0
-- 日期：2026-04-13
-- 兼容：MySQL 8.0+ / phpMyAdmin
--
-- 内容：
-- 1. 扩展现有表：wecom_configs(+11字段), wecom_customers(+7字段),
--    wecom_chat_records(+3字段), customers(+1字段+唯一索引)
-- 2. 新建9张表：wecom_customer_groups, wecom_sensitive_words,
--    wecom_sensitive_hits, wecom_quality_rules, wecom_quality_inspections,
--    wecom_archive_settings(V2), wecom_archive_members,
--    wecom_vas_orders, wecom_vas_configs
--
-- 注意：
-- - 所有ALTER TABLE使用IF NOT EXISTS安全写法（通过IGNORE兼容重复执行）
-- - 新建表使用CREATE TABLE IF NOT EXISTS
-- - 可在phpMyAdmin中直接导入执行
-- =============================================

SET NAMES utf8mb4;
SET time_zone = '+08:00';

-- =============================================
-- 第一部分：扩展现有表 — wecom_configs 新增11个字段
-- =============================================

-- 逐字段添加，重复执行不会报错（利用存储过程安全添加）
DROP PROCEDURE IF EXISTS `_wecom_v2_add_column`;
DELIMITER $$
CREATE PROCEDURE `_wecom_v2_add_column`(
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

-- 1.1 wecom_configs 新增11个授权字段
CALL _wecom_v2_add_column('wecom_configs', 'auth_type', "VARCHAR(20) DEFAULT 'self_built' COMMENT '授权类型: third_party/self_built'");
CALL _wecom_v2_add_column('wecom_configs', 'permanent_code', "TEXT NULL COMMENT '第三方应用永久授权码(加密存储)'");
CALL _wecom_v2_add_column('wecom_configs', 'suite_id', "VARCHAR(50) NULL COMMENT '第三方应用SuiteID'");
CALL _wecom_v2_add_column('wecom_configs', 'auth_corp_info', "TEXT NULL COMMENT '授权方企业信息(JSON)'");
CALL _wecom_v2_add_column('wecom_configs', 'auth_user_info', "TEXT NULL COMMENT '授权管理员信息(JSON)'");
CALL _wecom_v2_add_column('wecom_configs', 'auth_scope', "TEXT NULL COMMENT '授权范围(JSON)'");
CALL _wecom_v2_add_column('wecom_configs', 'data_api_status', "TINYINT DEFAULT 0 COMMENT '数据API授权状态: 0未授权 1已授权 2已过期'");
CALL _wecom_v2_add_column('wecom_configs', 'data_api_expire_time', "DATETIME NULL COMMENT '数据API授权到期时间'");
CALL _wecom_v2_add_column('wecom_configs', 'vas_chat_archive', "BOOLEAN DEFAULT FALSE COMMENT '是否开通会话存档增值服务'");
CALL _wecom_v2_add_column('wecom_configs', 'vas_expire_date', "DATE NULL COMMENT '增值服务到期时间'");
CALL _wecom_v2_add_column('wecom_configs', 'vas_user_count', "INT DEFAULT 0 COMMENT '增值服务开通人数'");

-- 1.2 wecom_customers 新增7个字段
CALL _wecom_v2_add_column('wecom_customers', 'tag_names', "TEXT NULL COMMENT '客户标签名称列表(JSON)'");
CALL _wecom_v2_add_column('wecom_customers', 'phone', "VARCHAR(20) NULL COMMENT '手机号'");
CALL _wecom_v2_add_column('wecom_customers', 'state', "VARCHAR(100) NULL COMMENT '渠道来源标识'");
CALL _wecom_v2_add_column('wecom_customers', 'msg_sent_count', "INT DEFAULT 0 COMMENT '发送消息数'");
CALL _wecom_v2_add_column('wecom_customers', 'msg_recv_count', "INT DEFAULT 0 COMMENT '接收消息数'");
CALL _wecom_v2_add_column('wecom_customers', 'last_msg_time', "BIGINT NULL COMMENT '最后消息时间戳'");
CALL _wecom_v2_add_column('wecom_customers', 'active_days_7d', "INT DEFAULT 0 COMMENT '近7天活跃天数'");

-- 1.3 wecom_chat_records 新增3个字段
CALL _wecom_v2_add_column('wecom_chat_records', 'sender_type', "TINYINT NULL COMMENT '发送者类型: 1员工 2客户'");
CALL _wecom_v2_add_column('wecom_chat_records', 'receiver_type', "TINYINT NULL COMMENT '接收者类型: 1员工 2客户 3群聊'");
CALL _wecom_v2_add_column('wecom_chat_records', 'oss_path', "VARCHAR(256) NULL COMMENT 'OSS存储路径'");

-- 1.4 customers 新增 wecom_external_userid 字段
CALL _wecom_v2_add_column('customers', 'wecom_external_userid', "VARCHAR(100) NULL COMMENT '客户唯一企微编码(USID)'");

-- 清理存储过程
DROP PROCEDURE IF EXISTS `_wecom_v2_add_column`;

-- 1.5 customers 新增唯一索引（安全添加）
DROP PROCEDURE IF EXISTS `_wecom_v2_add_index`;
DELIMITER $$
CREATE PROCEDURE `_wecom_v2_add_index`()
BEGIN
  SET @idx_exists = 0;
  SELECT COUNT(*) INTO @idx_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customers'
      AND INDEX_NAME = 'uk_tenant_wecom_userid';
  IF @idx_exists = 0 THEN
    ALTER TABLE `customers` ADD UNIQUE INDEX `uk_tenant_wecom_userid` (`tenant_id`, `wecom_external_userid`);
  END IF;
END$$
DELIMITER ;
CALL _wecom_v2_add_index();
DROP PROCEDURE IF EXISTS `_wecom_v2_add_index`;

-- =============================================
-- 第二部分：新建9张表
-- =============================================

-- 2.1 企微客户群表
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

-- 2.2 敏感词表
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

-- 2.3 敏感词命中记录表
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

-- 2.4 质检规则表
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

-- 2.5 质检记录表
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

-- 2.6 会话存档设置表（V2.0版本，字段完全重构）
-- 注意：如果已存在旧版wecom_archive_settings表（含storage_type/oss_bucket等字段），
-- 此处使用IF NOT EXISTS不会覆盖，需要手动ALTER扩展。
-- 新安装环境请先 DROP TABLE IF EXISTS `wecom_archive_settings` 再执行。
CREATE TABLE IF NOT EXISTS `wecom_archive_settings_v2` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `fetch_interval` INT DEFAULT 5 COMMENT '拉取间隔(分钟)',
  `fetch_mode` VARCHAR(20) DEFAULT 'default' COMMENT '拉取模式: default/pre_page/adaptive',
  `retention_days` INT DEFAULT 180 COMMENT '保留天数',
  `media_storage` VARCHAR(20) DEFAULT 'local' COMMENT '媒体存储方式: local/oss',
  `auto_inspect` TINYINT(1) DEFAULT 0 COMMENT '是否自动质检',
  `member_scope` TEXT NULL COMMENT '存档成员范围(JSON)',
  `rsa_public_key` TEXT NULL COMMENT 'RSA公钥',
  `visibility` VARCHAR(20) DEFAULT 'all' COMMENT '成员可见性: self/department/all',
  `max_users` INT DEFAULT 0 COMMENT '购买的最大席位数',
  `used_users` INT DEFAULT 0 COMMENT '已使用席位数',
  `status` VARCHAR(20) DEFAULT 'inactive' COMMENT '状态: inactive/active/expired',
  `expire_date` DATE NULL COMMENT '到期日期',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_config` (`tenant_id`, `wecom_config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话存档设置表(V2.0)';

-- 为现有wecom_archive_settings表安全添加V2.0新字段
DROP PROCEDURE IF EXISTS `_wecom_v2_add_column_safe`;
DELIMITER $$
CREATE PROCEDURE `_wecom_v2_add_column_safe`(
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

CALL _wecom_v2_add_column_safe('wecom_archive_settings', 'wecom_config_id', "INT NULL COMMENT '企微配置ID' AFTER `tenant_id`");
CALL _wecom_v2_add_column_safe('wecom_archive_settings', 'fetch_interval', "INT DEFAULT 5 COMMENT '拉取间隔(分钟)'");
CALL _wecom_v2_add_column_safe('wecom_archive_settings', 'fetch_mode', "VARCHAR(20) DEFAULT 'default' COMMENT '拉取模式: default/pre_page/adaptive'");
CALL _wecom_v2_add_column_safe('wecom_archive_settings', 'media_storage', "VARCHAR(20) DEFAULT 'local' COMMENT '媒体存储方式: local/oss'");
CALL _wecom_v2_add_column_safe('wecom_archive_settings', 'auto_inspect', "TINYINT(1) DEFAULT 0 COMMENT '是否自动质检'");
CALL _wecom_v2_add_column_safe('wecom_archive_settings', 'member_scope', "TEXT NULL COMMENT '存档成员范围(JSON)'");
CALL _wecom_v2_add_column_safe('wecom_archive_settings', 'rsa_public_key', "TEXT NULL COMMENT 'RSA公钥'");
CALL _wecom_v2_add_column_safe('wecom_archive_settings', 'visibility', "VARCHAR(20) DEFAULT 'all' COMMENT '成员可见性: self/department/all'");

DROP PROCEDURE IF EXISTS `_wecom_v2_add_column_safe`;

-- 2.7 存档生效成员表
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

-- 2.8 企微增值服务订单表（SaaS专属）
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

-- 2.9 企微增值服务配置表（Admin专属）
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

-- 2.10 企微客服会话表（V2.0新增）
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

-- 2.11 企微快捷回复表（V2.0新增）
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

-- =============================================
-- 迁移完成
-- =============================================

-- 清理临时V2表（如果不需要）
DROP TABLE IF EXISTS `wecom_archive_settings_v2`;

SELECT '✅ 企微V2.0迁移完成！' AS message;
SELECT '扩展4张表: wecom_configs(+11), wecom_customers(+7), wecom_chat_records(+3), customers(+1)' AS extended;
SELECT '新建9+2张表: customer_groups, sensitive_words, sensitive_hits, quality_rules, quality_inspections, archive_members, vas_orders, vas_configs, kf_sessions, quick_replies' AS created;

