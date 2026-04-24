-- ============================================================
-- 生产环境数据库合并迁移 - 2026-03-09
-- 兼容 phpMyAdmin 一键执行（定界符保持默认 ; 即可）
-- 
-- 包含内容:
--   1. 新表: modules, module_configs, module_status, api_configs
--   2. 新表: notification_templates, wechat_followers, wechat_message_logs
--   3. 新表: wechat_official_account_config, wechat_qrcode_scenes
--   4. 列变更: licenses 新增 package_id, package_name
--   5. 列变更: tenant_packages 新增 modules
--   6. 列变更: tenants 新增 modules
--   7. 默认数据: 10个CRM模块 + 13个通知模板 + 微信公众号配置
--
-- 安全说明: 
--   所有 CREATE TABLE 使用 IF NOT EXISTS
--   所有 ALTER TABLE 先检查列是否存在（通过存储过程）
--   所有 INSERT 使用 ON DUPLICATE KEY UPDATE
--   可安全重复执行，不会影响已有数据
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 辅助: 创建安全添加列的存储过程
-- ============================================
DROP PROCEDURE IF EXISTS safe_add_column;
CREATE PROCEDURE safe_add_column(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  SET @col_exists = 0;
  SELECT COUNT(*) INTO @col_exists
    FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME   = p_table
     AND COLUMN_NAME  = p_column;
  IF @col_exists = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END;

-- ============================================
-- 1. 模块表
-- ============================================
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

-- ============================================
-- 2. 模块配置表
-- ============================================
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

-- ============================================
-- 3. 模块状态表（CRM前端模块启停控制）
-- ============================================
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

-- ============================================
-- 4. API配置表
-- ============================================
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

-- ============================================
-- 5. 通知模板表
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
-- 6. 微信公众号关注用户表
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
-- 7. 微信消息发送记录表
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
-- 8. 微信公众号配置表
-- ============================================
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

-- ============================================
-- 9. 微信二维码场景表
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
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信二维码场景表';

-- ============================================
-- 10. 列变更: licenses 表新增 package_id, package_name
-- ============================================
CALL safe_add_column('licenses', 'package_id', "INT NULL COMMENT '关联套餐ID' AFTER `features`");
CALL safe_add_column('licenses', 'package_name', "VARCHAR(100) NULL COMMENT '套餐名称' AFTER `package_id`");

-- ============================================
-- 11. 列变更: tenant_packages 表新增 modules
-- ============================================
CALL safe_add_column('tenant_packages', 'modules', "JSON NULL COMMENT '授权模块ID列表（JSON数组）' AFTER `features`");

-- ============================================
-- 12. 列变更: tenants 表新增 modules
-- ============================================
CALL safe_add_column('tenants', 'modules', "JSON NULL COMMENT '授权模块ID列表（JSON数组）' AFTER `features`");

-- ============================================
-- 13. 默认数据: CRM系统模块（10个）
-- ============================================
INSERT INTO `modules` (`id`, `name`, `code`, `description`, `icon`, `version`, `status`, `is_system`, `sort_order`) VALUES
(UUID(), '订单管理', 'order_management', '订单创建、审核、发货等功能', 'ShoppingCart', '1.0.0', 'enabled', 1, 1),
(UUID(), '客户管理', 'customer_management', '客户信息管理、跟进记录', 'User', '1.0.0', 'enabled', 1, 2),
(UUID(), '财务管理', 'finance_management', '代收管理、结算报表、增值服务', 'Money', '1.0.0', 'enabled', 1, 3),
(UUID(), '物流管理', 'logistics_management', '物流跟踪、状态更新', 'Van', '1.0.0', 'enabled', 1, 4),
(UUID(), '售后管理', 'aftersales_management', '售后申请、处理流程', 'Service', '1.0.0', 'enabled', 1, 5),
(UUID(), '通话管理', 'call_management', '通话记录、录音管理', 'Phone', '1.0.0', 'enabled', 1, 6),
(UUID(), '资料管理', 'data_management', '客户资料、文档管理', 'Folder', '1.0.0', 'enabled', 1, 7),
(UUID(), '业绩统计', 'performance_management', '销售业绩、团队绩效', 'TrendCharts', '1.0.0', 'enabled', 1, 8),
(UUID(), '商品管理', 'product_management', '商品信息、库存、分类管理', 'Goods', '1.0.0', 'enabled', 1, 9),
(UUID(), '系统管理', 'system_management', '用户、角色、权限管理', 'Setting', '1.0.0', 'enabled', 1, 10)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ============================================
-- 14. 默认数据: module_status 模块启停状态（11个）
-- ============================================
INSERT INTO `module_status` (`module_key`, `module_name`, `description`, `icon`, `is_enabled`, `sort_order`) VALUES
('dashboard', '数据看板', '数据统计与可视化看板', 'Odometer', 1, 1),
('customer', '客户管理', '客户信息管理、跟进记录', 'User', 1, 2),
('order', '订单管理', '订单创建、审核、发货等功能', 'ShoppingCart', 1, 3),
('product', '商品管理', '商品信息、库存、分类管理', 'Goods', 1, 4),
('logistics', '物流管理', '物流跟踪、状态更新', 'Van', 1, 5),
('performance', '业绩管理', '销售业绩、团队绩效', 'TrendCharts', 1, 6),
('service', '售后管理', '售后申请、处理流程', 'Service', 1, 7),
('finance', '财务管理', '代收管理、结算报表、增值服务', 'Money', 1, 8),
('data', '资料管理', '客户资料、文档管理', 'Folder', 1, 9),
('serviceManagement', '服务管理', '服务项目与服务记录管理', 'SetUp', 1, 10),
('system', '系统管理', '用户、角色、权限管理', 'Setting', 1, 11)
ON DUPLICATE KEY UPDATE `module_name` = VALUES(`module_name`), `updated_at` = CURRENT_TIMESTAMP;

-- ============================================
-- 15. 默认数据: 通知模板（13个）
-- ============================================
INSERT INTO `notification_templates` (`id`, `template_code`, `template_name`, `template_type`, `category`, `scene`, `email_subject`, `email_content`, `sms_content`, `variables`, `variable_description`, `is_system`, `priority`, `send_email`, `send_sms`) VALUES
('tpl-001', 'tenant_register_success', '租户注册成功', 'both', 'tenant', '租户注册成功后发送欢迎邮件和短信',
'欢迎注册{{systemName}}',
'<h2>欢迎注册{{systemName}}</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p><p>恭喜您成功注册，以下是您的账号信息：</p><ul><li>租户名称：{{tenantName}}</li><li>管理员账号：{{adminUsername}}</li><li>初始密码：{{adminPassword}}</li><li>套餐类型：{{packageName}}</li><li>到期时间：{{expireDate}}</li></ul>',
'欢迎注册{{systemName}}！管理员账号：{{adminUsername}}，初始密码：{{adminPassword}}，请登录后及时修改密码。',
'{"systemName":"系统名称","tenantName":"租户名称","adminUsername":"管理员账号","adminPassword":"初始密码","packageName":"套餐名称","expireDate":"到期时间"}',
'租户注册成功后发送', 1, 'high', 1, 1),

('tpl-002', 'payment_success', '支付成功通知', 'both', 'payment', '支付成功后通知',
'支付成功 - {{orderNumber}}',
'<h2>支付成功</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的订单已支付成功：</p><ul><li>订单号：{{orderNumber}}</li><li>套餐：{{packageName}}</li><li>支付金额：¥{{amount}}</li><li>服务期限：{{serviceStartDate}} 至 {{serviceEndDate}}</li></ul>',
'支付成功！订单{{orderNumber}}，金额¥{{amount}}，服务期限至{{serviceEndDate}}。',
'{"tenantName":"租户名称","orderNumber":"订单号","packageName":"套餐名称","amount":"支付金额","serviceStartDate":"服务开始日期","serviceEndDate":"服务结束日期"}',
'支付成功后立即发送', 1, 'high', 1, 1),

('tpl-003', 'payment_pending', '待支付提醒', 'both', 'payment', '订单创建后待支付提醒',
'订单待支付 - {{orderNumber}}',
'<h2>订单待支付</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的订单已创建，请尽快完成支付：</p><ul><li>订单号：{{orderNumber}}</li><li>套餐：{{packageName}}</li><li>应付金额：¥{{amount}}</li></ul><p>订单将在24小时后自动取消。</p>',
'您的订单{{orderNumber}}待支付，金额¥{{amount}}，请尽快完成支付。',
'{"tenantName":"租户名称","orderNumber":"订单号","packageName":"套餐名称","amount":"应付金额"}',
'订单创建后发送', 1, 'normal', 1, 1),

('tpl-004', 'payment_refund', '退款成功通知', 'both', 'payment', '退款成功通知',
'退款成功 - {{orderNumber}}',
'<h2>退款成功</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的退款申请已处理完成：</p><ul><li>订单号：{{orderNumber}}</li><li>退款金额：¥{{refundAmount}}</li><li>退款原因：{{refundReason}}</li></ul><p>退款将在3-5个工作日内到账。</p>',
'退款成功！订单{{orderNumber}}，退款金额¥{{refundAmount}}，预计3-5个工作日到账。',
'{"tenantName":"租户名称","orderNumber":"订单号","refundAmount":"退款金额","refundReason":"退款原因"}',
'退款成功后发送', 1, 'high', 1, 1),

('tpl-005', 'license_generated', '授权码生成通知', 'email', 'license', '授权码生成后发送',
'授权码已生成 - {{tenantName}}',
'<h2>授权码已生成</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的授权码已生成：</p><div style="background:#f5f5f5;padding:15px;border-radius:4px;"><p style="font-size:18px;font-weight:bold;color:#409eff;">{{licenseKey}}</p></div><ul><li>授权类型：{{licenseType}}</li><li>有效期至：{{expireDate}}</li><li>最大用户数：{{maxUsers}}</li></ul>',
NULL,
'{"tenantName":"租户名称","licenseKey":"授权码","licenseType":"授权类型","expireDate":"到期时间","maxUsers":"最大用户数"}',
'授权码生成后发送', 1, 'high', 1, 0),

('tpl-006', 'license_expire_soon', '授权即将到期提醒', 'both', 'license', '授权到期前7天提醒',
'授权即将到期提醒',
'<h2>授权即将到期</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的授权即将到期：</p><ul><li>到期时间：{{expireDate}}</li><li>剩余天数：{{remainDays}}天</li></ul><p>请及时续费以免影响使用。</p>',
'您的授权将在{{remainDays}}天后到期，请及时续费以免影响使用。',
'{"tenantName":"租户名称","licenseKey":"授权码","expireDate":"到期时间","remainDays":"剩余天数"}',
'到期前7天、3天、1天各发送一次', 1, 'high', 1, 1),

('tpl-007', 'license_expired', '授权已到期通知', 'both', 'license', '授权到期后通知',
'授权已到期',
'<h2>授权已到期</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的授权已到期，系统已停止服务，请尽快续费恢复使用。</p>',
'您的授权已到期，系统已停止服务，请尽快续费。',
'{"tenantName":"租户名称","licenseKey":"授权码","expireDate":"到期时间"}',
'授权到期后发送', 1, 'urgent', 1, 1),

('tpl-008', 'tenant_activated', '账号激活成功', 'both', 'tenant', '账号激活成功通知',
'账号激活成功',
'<h2>账号激活成功</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的账号已成功激活。</p><ul><li>激活时间：{{activateTime}}</li><li>服务期限：{{serviceEndDate}}</li></ul>',
'您的账号已激活，服务期限至{{serviceEndDate}}。',
'{"tenantName":"租户名称","activateTime":"激活时间","serviceEndDate":"服务结束日期"}',
'账号激活后发送', 1, 'high', 1, 1),

('tpl-009', 'tenant_suspended', '账号已暂停', 'both', 'tenant', '账号暂停通知',
'账号已暂停',
'<h2>账号已暂停</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的账号已被暂停使用，原因：{{reason}}。如有疑问请联系客服。</p>',
'您的账号已暂停，原因：{{reason}}。如有疑问请联系客服。',
'{"tenantName":"租户名称","reason":"暂停原因","suspendTime":"暂停时间"}',
'账号暂停时发送', 1, 'urgent', 1, 1),

('tpl-010', 'tenant_resumed', '账号已恢复', 'both', 'tenant', '账号恢复通知',
'账号已恢复',
'<h2>账号已恢复</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的账号已恢复正常使用。</p>',
'您的账号已恢复，可以正常使用了。',
'{"tenantName":"租户名称","resumeTime":"恢复时间"}',
'账号恢复时发送', 1, 'high', 1, 1),

('tpl-011', 'renew_success', '续费成功通知', 'both', 'payment', '续费成功通知',
'续费成功',
'<h2>续费成功</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的续费已成功：金额¥{{amount}}，服务期限延长至{{newExpireDate}}。</p>',
'续费成功！金额¥{{amount}}，服务期限延长至{{newExpireDate}}。',
'{"tenantName":"租户名称","amount":"续费金额","duration":"续费时长","newExpireDate":"新到期时间"}',
'续费成功后发送', 1, 'high', 1, 1),

('tpl-012', 'package_upgraded', '套餐升级成功', 'both', 'tenant', '套餐升级成功通知',
'套餐升级成功',
'<h2>套餐升级成功</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的套餐已从{{oldPackage}}升级至{{newPackage}}，新功能已生效。</p>',
'套餐升级成功！已从{{oldPackage}}升级至{{newPackage}}。',
'{"tenantName":"租户名称","oldPackage":"原套餐","newPackage":"新套餐","upgradeTime":"升级时间"}',
'套餐升级后发送', 1, 'high', 1, 1),

('tpl-013', 'capacity_expanded', '容量扩容成功', 'email', 'tenant', '容量扩容成功通知',
'容量扩容成功',
'<h2>容量扩容成功</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的{{item}}已从{{oldCapacity}}扩容至{{newCapacity}}。</p>',
NULL,
'{"tenantName":"租户名称","item":"扩容项目","oldCapacity":"原容量","newCapacity":"新容量","expandTime":"扩容时间"}',
'容量扩容后发送', 1, 'normal', 1, 0)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ============================================
-- 16. 默认数据: 微信公众号配置
-- ============================================
INSERT INTO `wechat_official_account_config` (`id`, `app_id`, `app_secret`, `welcome_message`, `default_reply`, `is_enabled`) VALUES
('wechat-config-001', '', '',
'欢迎关注云客CRM！\n\n回复"绑定"可以绑定您的租户账号，接收系统通知。\n回复"帮助"查看更多功能。',
'感谢您的消息！\n\n回复"绑定"绑定账号\n回复"帮助"查看帮助\n回复"客服"联系客服',
0)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ============================================
-- 清理: 删除辅助存储过程
-- ============================================
DROP PROCEDURE IF EXISTS safe_add_column;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 执行完成！
-- 以上所有语句均使用 IF NOT EXISTS / ON DUPLICATE KEY UPDATE
-- 可安全重复执行，不会影响已有数据
-- ============================================================
