-- =============================================
-- 企微管理V4.0 数据库迁移SQL（生产环境）
-- 版本：V4.0
-- 日期：2026-04-16
-- 兼容：MySQL 8.0+ / phpMyAdmin
--
-- 内容：
-- 1. 新建17张表（全部使用 CREATE TABLE IF NOT EXISTS，可重复执行）
-- 2. 扩展现有表字段（使用存储过程安全添加，列已存在则跳过）
--    - wecom_configs 新增 auth_mode, auth_corp_name, auth_admin_user_id, auth_time
--    - wecom_acquisition_links 新增 state, welcome_config, auto_tags, auto_group_config
--
-- 注意：
-- - 可在phpMyAdmin中直接导入执行，可重复执行不会报错
-- - 执行前请先执行 wecom-v2-migration.sql（如未执行过）
-- =============================================

SET NAMES utf8mb4;
SET time_zone = '+08:00';

-- =============================================
-- 第一部分：新建17张V4.0表
-- =============================================

-- 1. 自动匹配建议表
CREATE TABLE IF NOT EXISTS `wecom_auto_match_suggestions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `wecom_customer_id` INT NOT NULL COMMENT '企微客户ID',
  `crm_customer_id` VARCHAR(50) NOT NULL COMMENT 'CRM客户ID',
  `match_type` ENUM('phone', 'name') NOT NULL DEFAULT 'phone' COMMENT '匹配方式',
  `match_field` VARCHAR(100) NULL COMMENT '匹配的值(如手机号)',
  `confidence` ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium' COMMENT '置信度',
  `status` ENUM('pending', 'confirmed', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '状态',
  `confirmed_by` VARCHAR(50) NULL COMMENT '确认人',
  `confirmed_at` DATETIME NULL COMMENT '确认时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_wecom_crm` (`tenant_id`, `wecom_customer_id`, `crm_customer_id`),
  INDEX `idx_tenant_status` (`tenant_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微自动匹配建议表';

-- 2. 群模板表
CREATE TABLE IF NOT EXISTS `wecom_group_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `template_name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `group_name_prefix` VARCHAR(100) NULL COMMENT '群名前缀',
  `max_members` INT DEFAULT 200 COMMENT '最大成员数',
  `owner_user_id` VARCHAR(100) NULL COMMENT '群主UserID',
  `welcome_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否启用欢迎语',
  `welcome_text` TEXT NULL COMMENT '欢迎语内容',
  `welcome_media_type` ENUM('none','image','link','miniprogram') DEFAULT 'none' COMMENT '欢迎语附件类型',
  `welcome_media_content` JSON NULL COMMENT '欢迎语附件内容',
  `anti_spam_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否启用防骚扰',
  `anti_spam_rules` JSON NULL COMMENT '防骚扰规则',
  `notice_template` TEXT NULL COMMENT '群公告模板',
  `auto_tags` JSON NULL COMMENT '自动标签',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_config` (`tenant_id`, `wecom_config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微群模板表';

-- 3. 获客助手智能上下线规则表
CREATE TABLE IF NOT EXISTS `wecom_acquisition_smart_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `link_id` INT NOT NULL COMMENT '获客链接ID',
  `daily_limit_enabled` TINYINT(1) DEFAULT 0,
  `daily_limit_per_user` INT DEFAULT 50,
  `daily_limit_action` ENUM('offline','reduce_weight') DEFAULT 'offline',
  `work_time_enabled` TINYINT(1) DEFAULT 0,
  `work_time_start` VARCHAR(10) DEFAULT '09:00',
  `work_time_end` VARCHAR(10) DEFAULT '18:00',
  `work_days` JSON NULL COMMENT '工作日[1,2,3,4,5]',
  `slow_reply_enabled` TINYINT(1) DEFAULT 0,
  `slow_reply_minutes` INT DEFAULT 30,
  `slow_reply_action` ENUM('offline','reduce_weight') DEFAULT 'offline',
  `loss_rate_enabled` TINYINT(1) DEFAULT 0,
  `loss_rate_threshold` INT DEFAULT 30,
  `next_day_auto_online` TINYINT(1) DEFAULT 1,
  `next_day_online_time` VARCHAR(10) DEFAULT '09:00',
  `next_day_exclude_manual` TINYINT(1) DEFAULT 0,
  `next_day_exclude_loss_rate` TINYINT(1) DEFAULT 0,
  `schedule_enabled` TINYINT(1) DEFAULT 0,
  `schedule_config` JSON NULL COMMENT '排班配置',
  `dept_quota_enabled` TINYINT(1) DEFAULT 0,
  `dept_quotas` JSON NULL COMMENT '部门配额配置',
  `dept_overflow_enabled` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_link` (`tenant_id`, `link_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='获客助手智能上下线规则表';

-- 4. 活码表
CREATE TABLE IF NOT EXISTS `wecom_contact_ways` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `wecom_config_id` INT NOT NULL,
  `config_id` VARCHAR(100) NULL COMMENT '企微返回的config_id',
  `name` VARCHAR(200) NOT NULL COMMENT '活码名称',
  `type` INT DEFAULT 1 COMMENT '1=单人/多人 2=群聊',
  `scene` INT DEFAULT 2 COMMENT '1=小程序 2=二维码',
  `style` INT DEFAULT 0 COMMENT '样式0-3',
  `state` VARCHAR(100) NULL COMMENT '渠道标识',
  `remark` VARCHAR(500) NULL,
  `skip_verify` TINYINT(1) DEFAULT 1 COMMENT '跳过验证',
  `user_ids` JSON NULL COMMENT '接待成员列表',
  `party_ids` JSON NULL COMMENT '接待部门列表',
  `is_temp` TINYINT(1) DEFAULT 0 COMMENT '是否临时活码',
  `qr_code` VARCHAR(500) NULL COMMENT '二维码链接',
  `welcome_enabled` TINYINT(1) DEFAULT 0,
  `welcome_config` JSON NULL COMMENT '欢迎语配置',
  `auto_tags` JSON NULL COMMENT '自动标签',
  `weight_mode` ENUM('single','round_robin','weighted') DEFAULT 'single' COMMENT '分配模式',
  `user_weights` JSON NULL COMMENT '成员权重配置',
  `smart_rule_id` INT NULL COMMENT '智能规则ID',
  `auto_group_enabled` TINYINT(1) DEFAULT 0,
  `auto_group_config` JSON NULL COMMENT '自动建群配置',
  `total_add_count` INT DEFAULT 0 COMMENT '总添加数',
  `total_loss_count` INT DEFAULT 0 COMMENT '总流失数',
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_config` (`tenant_id`, `wecom_config_id`),
  INDEX `idx_config_id` (`config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微活码表';

-- 5. 活码每日统计表
CREATE TABLE IF NOT EXISTS `wecom_contact_way_daily_stats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `contact_way_id` INT NOT NULL COMMENT '活码ID',
  `stat_date` DATE NOT NULL COMMENT '统计日期',
  `add_count` INT DEFAULT 0 COMMENT '添加数',
  `loss_count` INT DEFAULT 0 COMMENT '流失数',
  `net_count` INT DEFAULT 0 COMMENT '净增数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_contact_date` (`tenant_id`, `contact_way_id`, `stat_date`),
  INDEX `idx_contact_way` (`contact_way_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活码每日统计表';

-- 6. 客户事件表
CREATE TABLE IF NOT EXISTS `wecom_customer_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `wecom_config_id` INT NOT NULL,
  `external_user_id` VARCHAR(100) NOT NULL,
  `event_type` ENUM('add','delete','tag','link','group_join','group_leave','crm_link') NOT NULL,
  `event_detail` JSON NULL COMMENT '事件详情',
  `operator_id` VARCHAR(100) NULL COMMENT '操作人',
  `event_time` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_external_time` (`tenant_id`, `external_user_id`, `event_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微客户事件表';

-- 7. AI模型配置表
CREATE TABLE IF NOT EXISTS `wecom_ai_models` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `model_name` VARCHAR(100) NOT NULL COMMENT '模型名称',
  `provider` ENUM('openai','azure','claude','deepseek','qwen','custom') NOT NULL DEFAULT 'openai',
  `api_url` VARCHAR(500) NULL COMMENT 'API地址',
  `api_key` VARCHAR(500) NULL COMMENT 'API密钥(加密)',
  `model_id` VARCHAR(100) NULL COMMENT '模型标识',
  `temperature` DECIMAL(3,2) DEFAULT 0.70,
  `max_tokens` INT DEFAULT 4096,
  `top_p` DECIMAL(3,2) DEFAULT 1.00,
  `is_default` TINYINT(1) DEFAULT 0,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `last_test_time` DATETIME NULL,
  `last_test_status` VARCHAR(20) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI模型配置表';

-- 8. AI智能体配置表
CREATE TABLE IF NOT EXISTS `wecom_ai_agents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `agent_name` VARCHAR(100) NOT NULL COMMENT '智能体名称',
  `usages` JSON NULL COMMENT '用途列表',
  `model_id` INT NULL COMMENT '关联AI模型ID',
  `knowledge_base_ids` JSON NULL COMMENT '关联知识库ID列表',
  `system_prompt` TEXT NULL COMMENT '系统提示词',
  `max_msg_per_analysis` INT DEFAULT 50,
  `context_window` INT DEFAULT 8000,
  `output_format` ENUM('json','text','markdown') DEFAULT 'json',
  `retry_count` INT DEFAULT 3,
  `timeout_seconds` INT DEFAULT 30,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI智能体配置表';

-- 9. AI质检策略表
CREATE TABLE IF NOT EXISTS `wecom_ai_inspect_strategies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `strategy_name` VARCHAR(100) NOT NULL,
  `detect_types` JSON NULL COMMENT '检测类型',
  `scope` VARCHAR(20) DEFAULT 'all' COMMENT '适用范围',
  `scope_config` JSON NULL COMMENT '范围配置',
  `max_score` INT DEFAULT 100,
  `deduct_rules` JSON NULL COMMENT '扣分规则',
  `risk_levels` JSON NULL COMMENT '风险等级配置',
  `ai_model_id` INT NULL COMMENT '关联AI模型ID',
  `prompt_template` TEXT NULL COMMENT '提示词模板',
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI质检策略表';

-- 10. AI质检结果表
CREATE TABLE IF NOT EXISTS `wecom_ai_inspect_results` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `strategy_id` INT NULL COMMENT '策略ID',
  `conversation_id` VARCHAR(100) NULL COMMENT '会话ID',
  `employee_user_id` VARCHAR(100) NULL,
  `employee_name` VARCHAR(100) NULL,
  `customer_user_id` VARCHAR(100) NULL,
  `customer_name` VARCHAR(100) NULL,
  `total_score` INT NULL COMMENT '总分',
  `dimension_scores` JSON NULL COMMENT '维度评分',
  `highlights` JSON NULL COMMENT '亮点',
  `improvements` JSON NULL COMMENT '待改进',
  `risks` JSON NULL COMMENT '风险',
  `ai_suggestion` TEXT NULL COMMENT 'AI建议',
  `risk_level` ENUM('excellent','pass','fail') NULL COMMENT '风险等级',
  `analyzed_msg_count` INT NULL,
  `analyzed_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_strategy` (`tenant_id`, `strategy_id`),
  INDEX `idx_tenant_employee` (`tenant_id`, `employee_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI质检结果表';

-- 11. 知识库表
CREATE TABLE IF NOT EXISTS `wecom_knowledge_bases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `document_count` INT DEFAULT 0,
  `entry_count` INT DEFAULT 0,
  `total_size` BIGINT DEFAULT 0,
  `index_status` ENUM('pending','indexing','indexed','failed') DEFAULT 'pending',
  `last_index_time` DATETIME NULL,
  `sync_crm_enabled` TINYINT(1) DEFAULT 0,
  `sync_crm_sources` JSON NULL,
  `sync_frequency` ENUM('daily','manual') DEFAULT 'manual',
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库表';

-- 12. 知识条目表
CREATE TABLE IF NOT EXISTS `wecom_knowledge_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `knowledge_base_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NULL,
  `tags` JSON NULL,
  `source_type` ENUM('manual','document','crm_sync') DEFAULT 'manual',
  `source_file` VARCHAR(500) NULL,
  `embedding` TEXT NULL,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_kb` (`tenant_id`, `knowledge_base_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识条目表';

-- 13. 话术分类表
CREATE TABLE IF NOT EXISTS `wecom_script_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `name` VARCHAR(100) NOT NULL,
  `sort_order` INT DEFAULT 0,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='话术分类表';

-- 14. 话术表
CREATE TABLE IF NOT EXISTS `wecom_scripts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `category_id` INT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NULL,
  `shortcut` VARCHAR(50) NULL COMMENT '快捷短语',
  `attachments` JSON NULL,
  `tags` JSON NULL,
  `use_count` INT DEFAULT 0,
  `ai_rewrite_enabled` TINYINT(1) DEFAULT 0,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_category` (`tenant_id`, `category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='话术表';

-- 15. AI调用日志表
CREATE TABLE IF NOT EXISTS `wecom_ai_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `agent_id` INT NULL,
  `agent_name` VARCHAR(100) NULL,
  `operation_type` VARCHAR(50) NULL COMMENT '操作类型',
  `target_description` VARCHAR(500) NULL COMMENT '目标描述',
  `input_tokens` INT DEFAULT 0,
  `output_tokens` INT DEFAULT 0,
  `total_tokens` INT DEFAULT 0,
  `duration_ms` INT DEFAULT 0,
  `status` ENUM('success','fail','timeout') DEFAULT 'success',
  `error_message` TEXT NULL,
  `request_payload` TEXT NULL,
  `response_payload` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_time` (`tenant_id`, `created_at`),
  INDEX `idx_tenant_agent` (`tenant_id`, `agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI调用日志表';

-- 16. 侧边栏授权码表
CREATE TABLE IF NOT EXISTS `wecom_sidebar_auth_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `code` VARCHAR(100) NOT NULL COMMENT '授权码',
  `code_type` ENUM('single','multi','permanent') DEFAULT 'single',
  `max_uses` INT DEFAULT 1,
  `used_count` INT DEFAULT 0,
  `expire_at` DATETIME NULL,
  `created_by` VARCHAR(50) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_code` (`code`),
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='侧边栏授权码表';

-- 17. 部门映射表
CREATE TABLE IF NOT EXISTS `wecom_department_mappings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `wecom_config_id` INT NOT NULL,
  `wecom_dept_id` INT NOT NULL COMMENT '企微部门ID',
  `wecom_dept_name` VARCHAR(200) NULL,
  `wecom_parent_id` INT NULL COMMENT '企微父部门ID',
  `crm_dept_id` VARCHAR(50) NULL COMMENT 'CRM部门ID',
  `crm_dept_name` VARCHAR(200) NULL,
  `member_count` INT DEFAULT 0,
  `last_sync_time` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_config_dept` (`tenant_id`, `wecom_config_id`, `wecom_dept_id`),
  INDEX `idx_tenant_config` (`tenant_id`, `wecom_config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='部门映射表';

-- =============================================
-- 第二部分：扩展现有表字段（安全添加）
-- =============================================

-- 创建安全添加列的存储过程
DROP PROCEDURE IF EXISTS `_wecom_v4_add_column`;
DELIMITER $$
CREATE PROCEDURE `_wecom_v4_add_column`(
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

-- 2.1 wecom_configs 新增4个字段
CALL _wecom_v4_add_column('wecom_configs', 'auth_mode', "VARCHAR(20) DEFAULT 'self_built' COMMENT '授权模式: third_party/self_built'");
CALL _wecom_v4_add_column('wecom_configs', 'auth_corp_name', "VARCHAR(200) NULL COMMENT '授权企业名称'");
CALL _wecom_v4_add_column('wecom_configs', 'auth_admin_user_id', "VARCHAR(100) NULL COMMENT '授权管理员UserID'");
CALL _wecom_v4_add_column('wecom_configs', 'auth_time', "DATETIME NULL COMMENT '授权时间'");

-- 2.2 wecom_acquisition_links 新增4个字段
CALL _wecom_v4_add_column('wecom_acquisition_links', 'welcome_config', "JSON NULL COMMENT '欢迎语配置'");
CALL _wecom_v4_add_column('wecom_acquisition_links', 'auto_tags', "JSON NULL COMMENT '自动标签配置'");
CALL _wecom_v4_add_column('wecom_acquisition_links', 'auto_group_config', "JSON NULL COMMENT '自动建群配置'");
CALL _wecom_v4_add_column('wecom_acquisition_links', 'state', "VARCHAR(100) NULL COMMENT '渠道标识'");

-- 清理存储过程
DROP PROCEDURE IF EXISTS `_wecom_v4_add_column`;

-- =============================================
-- 迁移完成
-- =============================================
SELECT '✅ 企微V4.0迁移完成！' AS message;
SELECT '新建17张表: auto_match_suggestions, group_templates, acquisition_smart_rules, contact_ways, contact_way_daily_stats, customer_events, ai_models, ai_agents, ai_inspect_strategies, ai_inspect_results, knowledge_bases, knowledge_entries, script_categories, scripts, ai_logs, sidebar_auth_codes, department_mappings' AS created;
SELECT '扩展2张表: wecom_configs(+4字段), wecom_acquisition_links(+4字段)' AS extended;

