-- =============================================
-- 管理后台通知服务 - 生产环境数据库迁移
-- 执行环境: phpMyAdmin / MySQL命令行
-- 执行前请备份数据库
-- 兼容 MySQL 5.7+ / 8.0+
-- =============================================

-- 管理员通知消息表
CREATE TABLE IF NOT EXISTS `admin_notifications` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL COMMENT '通知标题',
  `content` TEXT COMMENT '通知内容',
  `event_type` VARCHAR(50) NOT NULL COMMENT '事件类型',
  `level` ENUM('info','warning','success','error') DEFAULT 'info' COMMENT '通知级别',
  `is_read` TINYINT(1) DEFAULT 0 COMMENT '是否已读',
  `related_id` VARCHAR(100) DEFAULT NULL COMMENT '关联业务ID',
  `related_type` VARCHAR(50) DEFAULT NULL COMMENT '关联业务类型(tenant/order/license等)',
  `extra_data` JSON DEFAULT NULL COMMENT '附加数据',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_event_type` (`event_type`),
  INDEX `idx_is_read` (`is_read`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员通知消息表';

-- 通知渠道配置表
CREATE TABLE IF NOT EXISTS `admin_notification_channels` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `channel_type` VARCHAR(30) NOT NULL COMMENT '渠道类型: system/dingtalk/wecom/wechat_mp/email',
  `name` VARCHAR(100) NOT NULL COMMENT '渠道名称',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `config_data` JSON DEFAULT NULL COMMENT '渠道配置(JSON)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_channel_type` (`channel_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知渠道配置表';

-- 通知规则表(事件类型 x 渠道 的开关矩阵)
CREATE TABLE IF NOT EXISTS `admin_notification_rules` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `event_type` VARCHAR(50) NOT NULL COMMENT '事件类型',
  `channel_type` VARCHAR(30) NOT NULL COMMENT '渠道类型',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_event_channel` (`event_type`, `channel_type`),
  INDEX `idx_event_type` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知规则表';

-- 插入默认渠道配置
INSERT INTO `admin_notification_channels` (`id`, `channel_type`, `name`, `is_enabled`, `config_data`) VALUES
('ch-system', 'system', '系统消息', 1, '{}'),
('ch-dingtalk', 'dingtalk', '钉钉通知', 0, '{"webhook":"","secret":""}'),
('ch-wecom', 'wecom', '企业微信', 0, '{"webhook":""}'),
('ch-wechat-mp', 'wechat_mp', '微信公众号', 0, '{"app_id":"","app_secret":"","template_id":""}'),
('ch-email', 'email', '邮件通知', 0, '{"smtp_host":"","smtp_port":465,"username":"","password":"","from_name":"CRM管理后台","to_emails":[]}')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 插入默认通知规则(所有事件默认开启系统消息)
INSERT INTO `admin_notification_rules` (`id`, `event_type`, `channel_type`, `is_enabled`) VALUES
('rule-001', 'tenant_registered', 'system', 1),
('rule-002', 'payment_created', 'system', 1),
('rule-003', 'payment_success', 'system', 1),
('rule-004', 'payment_pending', 'system', 1),
('rule-005', 'payment_cancelled', 'system', 1),
('rule-006', 'license_expiring', 'system', 1),
('rule-007', 'license_expired', 'system', 1),
('rule-008', 'tenant_login', 'system', 1),
('rule-009', 'system_error', 'system', 1)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

