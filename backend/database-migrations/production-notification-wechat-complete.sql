-- ============================================
-- 生产环境数据库迁移脚本
-- 通知模板和微信公众号系统
-- 适用于phpMyAdmin和宝塔面板
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. 通知模板表
-- ============================================
CREATE TABLE IF NOT EXISTS `notification_templates` (
  `id` VARCHAR(36) NOT NULL COMMENT '模板ID',
  `template_code` VARCHAR(100) NOT NULL COMMENT '模板代码(唯一标识)',
  `template_name` VARCHAR(200) NOT NULL COMMENT '模板名称',
  `template_type` VARCHAR(50) NOT NULL COMMENT '模板类型: email/sms/both',
  `category` VARCHAR(50) NOT NULL COMMENT '业务分类: tenant/payment/order/license',
  `scene` VARCHAR(100) NOT NULL COMMENT '使用场景',
  `email_subject` VARCHAR(200) DEFAULT NULL COMMENT '邮件主题',
  `email_content` TEXT DEFAULT NULL COMMENT '邮件内容(支持HTML和变量)',
  `sms_content` VARCHAR(500) DEFAULT NULL COMMENT '短信内容(支持变量)',
  `sms_template_code` VARCHAR(100) DEFAULT NULL COMMENT '短信服务商模板代码',
  `variables` JSON DEFAULT NULL COMMENT '可用变量列表',
  `variable_description` TEXT DEFAULT NULL COMMENT '变量说明文档',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `is_system` TINYINT(1) DEFAULT 0 COMMENT '是否系统模板(不可删除)',
  `priority` VARCHAR(20) DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  `send_email` TINYINT(1) DEFAULT 1 COMMENT '是否发送邮件',
  `send_sms` TINYINT(1) DEFAULT 0 COMMENT '是否发送短信',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code` (`template_code`),
  KEY `idx_template_code` (`template_code`),
  KEY `idx_category` (`category`),
  KEY `idx_scene` (`scene`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板表';

-- ============================================
-- 2. 微信公众号关注用户表
-- ============================================
CREATE TABLE IF NOT EXISTS `wechat_followers` (
  `id` VARCHAR(36) NOT NULL COMMENT '记录ID',
  `openid` VARCHAR(100) NOT NULL COMMENT '微信OpenID',
  `unionid` VARCHAR(100) DEFAULT NULL COMMENT '微信UnionID',
  `nickname` VARCHAR(200) DEFAULT NULL COMMENT '昵称',
  `avatar_url` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  `gender` TINYINT DEFAULT NULL COMMENT '性别: 0未知 1男 2女',
  `country` VARCHAR(50) DEFAULT NULL COMMENT '国家',
  `province` VARCHAR(50) DEFAULT NULL COMMENT '省份',
  `city` VARCHAR(50) DEFAULT NULL COMMENT '城市',
  `language` VARCHAR(20) DEFAULT NULL COMMENT '语言',
  `subscribe_status` TINYINT(1) DEFAULT 1 COMMENT '关注状态: 0取消关注 1已关注',
  `subscribe_time` DATETIME DEFAULT NULL COMMENT '关注时间',
  `unsubscribe_time` DATETIME DEFAULT NULL COMMENT '取消关注时间',
  `subscribe_scene` VARCHAR(50) DEFAULT NULL COMMENT '关注场景',
  `qr_scene` VARCHAR(100) DEFAULT NULL COMMENT '二维码场景值',
  `qr_scene_str` VARCHAR(200) DEFAULT NULL COMMENT '二维码场景描述',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '绑定的租户ID',
  `tenant_name` VARCHAR(200) DEFAULT NULL COMMENT '租户名称',
  `bind_time` DATETIME DEFAULT NULL COMMENT '绑定时间',
  `bind_status` VARCHAR(20) DEFAULT 'unbound' COMMENT '绑定状态: unbound/pending/bound',
  `enable_notification` TINYINT(1) DEFAULT 1 COMMENT '是否启用通知',
  `notification_types` JSON DEFAULT NULL COMMENT '接收的通知类型',
  `tags` JSON DEFAULT NULL COMMENT '用户标签',
  `remark` VARCHAR(200) DEFAULT NULL COMMENT '备注',
  `message_count` INT DEFAULT 0 COMMENT '发送消息数',
  `last_message_time` DATETIME DEFAULT NULL COMMENT '最后发送消息时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`),
  KEY `idx_openid` (`openid`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_subscribe_status` (`subscribe_status`),
  KEY `idx_bind_status` (`bind_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信公众号关注用户表';

-- ============================================
-- 3. 微信消息发送记录表
-- ============================================
CREATE TABLE IF NOT EXISTS `wechat_message_logs` (
  `id` VARCHAR(36) NOT NULL COMMENT '记录ID',
  `openid` VARCHAR(100) NOT NULL COMMENT '接收者OpenID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `message_type` VARCHAR(50) NOT NULL COMMENT '消息类型: template/text/image',
  `template_id` VARCHAR(100) DEFAULT NULL COMMENT '模板ID',
  `template_code` VARCHAR(100) DEFAULT NULL COMMENT '业务模板代码',
  `title` VARCHAR(200) DEFAULT NULL COMMENT '消息标题',
  `content` TEXT DEFAULT NULL COMMENT '消息内容',
  `url` VARCHAR(500) DEFAULT NULL COMMENT '跳转链接',
  `data` JSON DEFAULT NULL COMMENT '模板数据',
  `send_status` VARCHAR(20) DEFAULT 'pending' COMMENT '发送状态: pending/success/failed',
  `send_time` DATETIME DEFAULT NULL COMMENT '发送时间',
  `msgid` VARCHAR(100) DEFAULT NULL COMMENT '微信消息ID',
  `error_code` VARCHAR(50) DEFAULT NULL COMMENT '错误代码',
  `error_message` TEXT DEFAULT NULL COMMENT '错误信息',
  `is_read` TINYINT(1) DEFAULT 0 COMMENT '是否已读',
  `read_time` DATETIME DEFAULT NULL COMMENT '阅读时间',
  `is_clicked` TINYINT(1) DEFAULT 0 COMMENT '是否点击',
  `click_time` DATETIME DEFAULT NULL COMMENT '点击时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_openid` (`openid`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_template_code` (`template_code`),
  KEY `idx_send_status` (`send_status`),
  KEY `idx_send_time` (`send_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信消息发送记录表';

-- ============================================
-- 4. 微信公众号配置表
-- ============================================
CREATE TABLE IF NOT EXISTS `wechat_official_account_config` (
  `id` VARCHAR(36) NOT NULL COMMENT '配置ID',
  `app_id` VARCHAR(100) NOT NULL COMMENT 'AppID',
  `app_secret` VARCHAR(200) NOT NULL COMMENT 'AppSecret',
  `token` VARCHAR(100) DEFAULT NULL COMMENT 'Token',
  `encoding_aes_key` VARCHAR(200) DEFAULT NULL COMMENT 'EncodingAESKey',
  `server_url` VARCHAR(500) DEFAULT NULL COMMENT '服务器URL',
  `message_encrypt_mode` VARCHAR(20) DEFAULT 'plaintext' COMMENT '消息加密方式: plaintext/compatible/safe',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `auto_reply_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用自动回复',
  `menu_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用自定义菜单',
  `welcome_message` TEXT DEFAULT NULL COMMENT '关注后欢迎语',
  `default_reply` TEXT DEFAULT NULL COMMENT '默认回复内容',
  `keyword_replies` JSON DEFAULT NULL COMMENT '关键词回复配置',
  `menu_config` JSON DEFAULT NULL COMMENT '自定义菜单配置',
  `template_configs` JSON DEFAULT NULL COMMENT '模板消息配置',
  `total_followers` INT DEFAULT 0 COMMENT '总关注人数',
  `active_followers` INT DEFAULT 0 COMMENT '当前关注人数',
  `total_messages` INT DEFAULT 0 COMMENT '总发送消息数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信公众号配置表';

-- ============================================
-- 5. 微信二维码场景表
-- ============================================
CREATE TABLE IF NOT EXISTS `wechat_qrcode_scenes` (
  `id` VARCHAR(36) NOT NULL COMMENT '场景ID',
  `scene_id` INT DEFAULT NULL COMMENT '场景值ID',
  `scene_str` VARCHAR(200) DEFAULT NULL COMMENT '场景字符串',
  `scene_type` VARCHAR(50) NOT NULL COMMENT '场景类型: tenant_bind/payment/register',
  `scene_name` VARCHAR(200) DEFAULT NULL COMMENT '场景名称',
  `scene_desc` TEXT DEFAULT NULL COMMENT '场景描述',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '关联租户ID',
  `related_id` VARCHAR(100) DEFAULT NULL COMMENT '关联业务ID',
  `related_type` VARCHAR(50) DEFAULT NULL COMMENT '关联业务类型',
  `qrcode_url` VARCHAR(500) DEFAULT NULL COMMENT '二维码图片URL',
  `ticket` VARCHAR(200) DEFAULT NULL COMMENT '二维码ticket',
  `expire_seconds` INT DEFAULT NULL COMMENT '过期时间(秒)',
  `expire_time` DATETIME DEFAULT NULL COMMENT '过期时间',
  `scan_count` INT DEFAULT 0 COMMENT '扫码次数',
  `subscribe_count` INT DEFAULT 0 COMMENT '关注次数',
  `last_scan_time` DATETIME DEFAULT NULL COMMENT '最后扫码时间',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/expired/disabled',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scene_id` (`scene_id`),
  UNIQUE KEY `uk_scene_str` (`scene_str`),
  KEY `idx_scene_id` (`scene_id`),
  KEY `idx_scene_str` (`scene_str`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信二维码场景表';

-- ============================================
-- 6. 插入默认数据
-- ============================================

-- 插入微信公众号默认配置
INSERT INTO `wechat_official_account_config` (`id`, `app_id`, `app_secret`, `welcome_message`, `default_reply`, `is_enabled`) VALUES
('wechat-config-001', '', '', 
'欢迎关注云客CRM！\n\n回复"绑定"可以绑定您的租户账号，接收系统通知。\n回复"帮助"查看更多功能。',
'感谢您的消息！\n\n回复"绑定"绑定账号\n回复"帮助"查看帮助\n回复"客服"联系客服',
0)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 执行完成
-- ============================================
-- 通知模板和微信公众号系统表创建完成
-- 请在Admin后台配置微信公众号信息和通知模板
-- ============================================
