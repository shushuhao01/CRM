-- ============================================================
-- 生产环境数据库合并迁移 - 2026-03-09 (v3 - phpMyAdmin终极兼容版)
-- 
-- ★★★ 使用方法 ★★★
-- 分3步在 phpMyAdmin 中执行:
--   第1步: 复制"第一部分"执行 → 建表 (安全，IF NOT EXISTS)
--   第2步: 复制"第二部分"执行 → 加列 (如果列已存在会报错可忽略)
--   第3步: 复制"第三部分"执行 → 插数据 (安全，ON DUPLICATE KEY)
-- ============================================================


-- ************************************************************
-- 第一部分: 建表（全部 IF NOT EXISTS，安全重复执行）
-- ************************************************************

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `modules` (
  `id` VARCHAR(36) NOT NULL COMMENT '模块ID',
  `name` VARCHAR(100) NOT NULL COMMENT '模块名称',
  `code` VARCHAR(50) NOT NULL COMMENT '模块代码',
  `description` TEXT DEFAULT NULL COMMENT '模块描述',
  `icon` VARCHAR(100) DEFAULT NULL COMMENT '模块图标',
  `version` VARCHAR(20) DEFAULT NULL COMMENT '模块版本',
  `status` ENUM('enabled','disabled') DEFAULT 'enabled' COMMENT '状态',
  `is_system` TINYINT(1) DEFAULT 0 COMMENT '是否系统模块',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_status` (`status`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块表';

CREATE TABLE IF NOT EXISTS `module_configs` (
  `id` VARCHAR(36) NOT NULL COMMENT '配置ID',
  `module_id` VARCHAR(36) NOT NULL COMMENT '模块ID',
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `config_value` TEXT DEFAULT NULL COMMENT '配置值',
  `config_type` ENUM('string','number','boolean','json') DEFAULT 'string' COMMENT '配置类型',
  `description` VARCHAR(255) DEFAULT NULL COMMENT '配置说明',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_key` (`module_id`, `config_key`),
  KEY `idx_module_id` (`module_id`),
  CONSTRAINT `fk_module_configs_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块配置表';

CREATE TABLE IF NOT EXISTS `module_status` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `module_key` VARCHAR(50) NOT NULL COMMENT '模块标识',
  `module_name` VARCHAR(100) NOT NULL COMMENT '模块名称',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '模块描述',
  `icon` VARCHAR(50) DEFAULT NULL COMMENT '图标名称',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `disabled_reason` VARCHAR(500) DEFAULT NULL COMMENT '停用原因',
  `disabled_at` DATETIME DEFAULT NULL COMMENT '停用时间',
  `disabled_by` VARCHAR(100) DEFAULT NULL COMMENT '停用操作人',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_key` (`module_key`),
  KEY `idx_module_key` (`module_key`),
  KEY `idx_is_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块状态表';

CREATE TABLE IF NOT EXISTS `api_configs` (
  `id` VARCHAR(36) NOT NULL COMMENT 'API配置ID',
  `name` VARCHAR(100) NOT NULL COMMENT 'API名称',
  `code` VARCHAR(50) NOT NULL COMMENT 'API代码',
  `description` TEXT DEFAULT NULL COMMENT 'API描述',
  `api_key` VARCHAR(100) NOT NULL COMMENT 'API密钥',
  `api_secret` VARCHAR(255) NOT NULL COMMENT 'API密钥（加密）',
  `status` ENUM('active','inactive') DEFAULT 'active' COMMENT '状态',
  `rate_limit` INT DEFAULT 1000 COMMENT '速率限制（次/小时）',
  `allowed_ips` TEXT DEFAULT NULL COMMENT '允许的IP（JSON数组）',
  `expires_at` DATETIME DEFAULT NULL COMMENT '过期时间',
  `last_used_at` DATETIME DEFAULT NULL COMMENT '最后使用时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  UNIQUE KEY `uk_api_key` (`api_key`),
  KEY `idx_api_key` (`api_key`),
  KEY `idx_status` (`status`),
  KEY `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API配置表';

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

CREATE TABLE IF NOT EXISTS `wechat_official_account_config` (
  `id` VARCHAR(36) NOT NULL COMMENT '配置ID',
  `app_id` VARCHAR(100) NOT NULL COMMENT 'AppID',
  `app_secret` VARCHAR(200) NOT NULL COMMENT 'AppSecret',
  `token` VARCHAR(100) DEFAULT NULL COMMENT 'Token',
  `encoding_aes_key` VARCHAR(200) DEFAULT NULL COMMENT 'EncodingAESKey',
  `server_url` VARCHAR(500) DEFAULT NULL COMMENT '服务器URL',
  `message_encrypt_mode` VARCHAR(20) DEFAULT 'plaintext' COMMENT '消息加密方式',
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
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信二维码场景表';

SET FOREIGN_KEY_CHECKS = 1;

-- ★ 第一部分结束，以上全部是建表，执行不会出错 ★
