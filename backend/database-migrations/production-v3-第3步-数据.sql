-- ============================================================
-- 第三部分: 插入默认数据（全部 ON DUPLICATE KEY，安全重复执行）
-- 
-- ★★★ 直接全部复制到 phpMyAdmin 执行即可 ★★★
-- ============================================================

SET NAMES utf8mb4;

-- 3a. CRM系统模块（10个）
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

-- 3b. module_status 模块启停状态（11个）
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

-- 3c. 通知模板（13个）
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

-- 3d. 微信公众号配置
INSERT INTO `wechat_official_account_config` (`id`, `app_id`, `app_secret`, `welcome_message`, `default_reply`, `is_enabled`) VALUES
('wechat-config-001', '', '',
'欢迎关注云客CRM！\n\n回复"绑定"可以绑定您的租户账号，接收系统通知。\n回复"帮助"查看更多功能。',
'感谢您的消息！\n\n回复"绑定"绑定账号\n回复"帮助"查看帮助\n回复"客服"联系客服',
0)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ★ 第三部分结束 ★
