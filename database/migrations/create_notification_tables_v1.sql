-- 创建通知渠道配置表（如果不存在）
-- 执行时间: 2025-12-14
-- 说明: 用于存储通知渠道配置和业绩消息配置

-- 29. 通知渠道配置表
CREATE TABLE IF NOT EXISTS `notification_channels` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  `name` VARCHAR(100) NOT NULL COMMENT '配置名称',
  `channel_type` VARCHAR(50) NOT NULL COMMENT '通知渠道类型: dingtalk/wechat_work/wechat_mp/email/sms/system',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `config` JSON NOT NULL COMMENT '渠道配置参数',
  `message_types` JSON COMMENT '支持的消息类型列表',
  `target_type` VARCHAR(20) DEFAULT 'all' COMMENT '通知对象类型: all/departments/users/roles',
  `target_departments` JSON COMMENT '目标部门列表',
  `target_users` JSON COMMENT '目标用户列表',
  `target_roles` JSON COMMENT '目标角色列表',
  `priority_filter` VARCHAR(20) DEFAULT 'all' COMMENT '优先级过滤: all/high/urgent',
  `created_by` VARCHAR(36) COMMENT '创建者ID',
  `created_by_name` VARCHAR(100) COMMENT '创建者姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_channel_type` (`channel_type`),
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知渠道配置表';

-- 30. 通知发送记录表
CREATE TABLE IF NOT EXISTS `notification_logs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  `channel_id` VARCHAR(36) NOT NULL COMMENT '通知渠道ID',
  `channel_type` VARCHAR(50) NOT NULL COMMENT '通知渠道类型',
  `message_type` VARCHAR(50) NOT NULL COMMENT '消息类型',
  `title` VARCHAR(200) NOT NULL COMMENT '消息标题',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `target_users` JSON COMMENT '目标用户列表',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '发送状态: pending/success/failed',
  `response` TEXT COMMENT '第三方API响应',
  `error_message` TEXT COMMENT '错误信息',
  `sent_at` TIMESTAMP NULL COMMENT '发送时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_channel_id` (`channel_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知发送记录表';

-- 31. 业绩消息配置表
CREATE TABLE IF NOT EXISTS `performance_report_configs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  `name` VARCHAR(100) NOT NULL COMMENT '配置名称',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `send_frequency` VARCHAR(20) NOT NULL DEFAULT 'daily' COMMENT '发送频率: daily/weekly/monthly/custom',
  `send_time` VARCHAR(10) NOT NULL DEFAULT '09:00' COMMENT '发送时间 HH:mm',
  `send_days` JSON COMMENT '发送日期',
  `repeat_type` VARCHAR(20) DEFAULT 'workday' COMMENT '重复类型: everyday/workday/custom',
  `report_types` JSON NOT NULL COMMENT '报表类型列表',
  `message_format` VARCHAR(20) DEFAULT 'text' COMMENT '消息格式: text/image',
  `channel_type` VARCHAR(20) NOT NULL COMMENT '通知渠道: dingtalk/wechat_work',
  `webhook` VARCHAR(500) NOT NULL COMMENT 'Webhook地址',
  `secret` VARCHAR(200) COMMENT '加签密钥(钉钉)',
  `view_scope` VARCHAR(20) DEFAULT 'company' COMMENT '视角: company/department',
  `target_departments` JSON COMMENT '目标部门列表',
  `include_monthly` TINYINT(1) DEFAULT 1 COMMENT '是否包含月累计',
  `include_ranking` TINYINT(1) DEFAULT 1 COMMENT '是否包含排名',
  `ranking_limit` INT DEFAULT 10 COMMENT '排名显示数量',
  `last_sent_at` TIMESTAMP NULL COMMENT '上次发送时间',
  `last_sent_status` VARCHAR(20) COMMENT '上次发送状态',
  `last_sent_message` TEXT COMMENT '上次发送结果信息',
  `created_by` VARCHAR(36) COMMENT '创建者ID',
  `created_by_name` VARCHAR(100) COMMENT '创建者姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_send_frequency` (`send_frequency`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩消息配置表';

-- 32. 业绩消息发送记录表
CREATE TABLE IF NOT EXISTS `performance_report_logs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  `config_id` VARCHAR(36) NOT NULL COMMENT '配置ID',
  `report_date` DATE NOT NULL COMMENT '报表日期',
  `report_data` JSON COMMENT '报表数据快照',
  `channel_type` VARCHAR(20) NOT NULL COMMENT '发送渠道',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '发送状态: pending/success/failed',
  `response` TEXT COMMENT 'API响应',
  `error_message` TEXT COMMENT '错误信息',
  `sent_at` TIMESTAMP NULL COMMENT '发送时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_config_id` (`config_id`),
  INDEX `idx_report_date` (`report_date`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩消息发送记录表';

-- 为已存在的表添加 message_format 字段（如果不存在）
-- 注意：这个语句可能会报错如果字段已存在，可以忽略
-- ALTER TABLE `performance_report_configs` ADD COLUMN `message_format` VARCHAR(20) DEFAULT 'text' COMMENT '消息格式: text/image' AFTER `report_types`;
