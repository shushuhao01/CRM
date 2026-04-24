-- 通知模板表
CREATE TABLE IF NOT EXISTS notification_templates (
  id VARCHAR(36) PRIMARY KEY COMMENT '模板ID',
  template_code VARCHAR(100) NOT NULL UNIQUE COMMENT '模板代码(唯一标识)',
  template_name VARCHAR(200) NOT NULL COMMENT '模板名称',
  template_type VARCHAR(50) NOT NULL COMMENT '模板类型: email/sms/both',
  category VARCHAR(50) NOT NULL COMMENT '业务分类: tenant/payment/order/license',
  scene VARCHAR(100) NOT NULL COMMENT '使用场景',
  
  -- 邮件模板
  email_subject VARCHAR(200) COMMENT '邮件主题',
  email_content TEXT COMMENT '邮件内容(支持HTML和变量)',
  
  -- 短信模板
  sms_content VARCHAR(500) COMMENT '短信内容(支持变量)',
  sms_template_code VARCHAR(100) COMMENT '短信服务商模板代码',
  
  -- 变量说明
  variables JSON COMMENT '可用变量列表',
  variable_description TEXT COMMENT '变量说明文档',
  
  -- 状态和配置
  is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  is_system TINYINT(1) DEFAULT 0 COMMENT '是否系统模板(不可删除)',
  priority VARCHAR(20) DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  
  -- 发送配置
  send_email TINYINT(1) DEFAULT 1 COMMENT '是否发送邮件',
  send_sms TINYINT(1) DEFAULT 0 COMMENT '是否发送短信',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_template_code (template_code),
  INDEX idx_category (category),
  INDEX idx_scene (scene)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知模板表';

-- 插入系统默认模板
INSERT INTO notification_templates (id, template_code, template_name, template_type, category, scene, email_subject, email_content, sms_content, variables, variable_description, is_system, priority, send_email, send_sms) VALUES

-- ========== 租户注册相关 ==========
('tpl-001', 'tenant_register_success', '租户注册成功', 'both', 'tenant', '租户注册成功后发送欢迎邮件和短信',
'欢迎注册{{systemName}}',
'<h2>欢迎注册{{systemName}}</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>恭喜您成功注册{{systemName}}，以下是您的账号信息：</p>
<ul>
  <li>租户名称：{{tenantName}}</li>
  <li>管理员账号：{{adminUsername}}</li>
  <li>初始密码：{{adminPassword}}</li>
  <li>套餐类型：{{packageName}}</li>
  <li>到期时间：{{expireDate}}</li>
</ul>
<p><a href="{{crmUrl}}/login" style="background:#409eff;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">立即登录</a></p>
<p>请妥善保管您的账号信息，建议首次登录后修改密码。</p>',
'欢迎注册{{systemName}}！您的管理员账号：{{adminUsername}}，初始密码：{{adminPassword}}，请登录后及时修改密码。',
'{"systemName":"系统名称","tenantName":"租户名称","adminUsername":"管理员账号","adminPassword":"初始密码","packageName":"套餐名称","expireDate":"到期时间"}',
'租户注册成功后发送，包含登录信息',
1, 'high', 1, 1),

-- ========== 支付相关 ==========
('tpl-002', 'payment_success', '支付成功通知', 'both', 'payment', '支付成功后通知',
'支付成功 - {{orderNumber}}',
'<h2>支付成功</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>您的订单已支付成功：</p>
<ul>
  <li>订单号：{{orderNumber}}</li>
  <li>套餐：{{packageName}}</li>
  <li>支付金额：¥{{amount}}</li>
  <li>支付时间：{{payTime}}</li>
  <li>服务期限：{{serviceStartDate}} 至 {{serviceEndDate}}</li>
</ul>
<p>您的账号已自动激活，可以开始使用了。</p>
<p><a href="{{crmUrl}}/login">立即登录</a></p>',
'支付成功！订单{{orderNumber}}，金额¥{{amount}}，服务期限至{{serviceEndDate}}。',
'{"tenantName":"租户名称","orderNumber":"订单号","packageName":"套餐名称","amount":"支付金额","payTime":"支付时间","serviceStartDate":"服务开始日期","serviceEndDate":"服务结束日期"}',
'支付成功后立即发送',
1, 'high', 1, 1),

('tpl-003', 'payment_pending', '待支付提醒', 'both', 'payment', '订单创建后待支付提醒',
'订单待支付 - {{orderNumber}}',
'<h2>订单待支付</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>您的订单已创建，请尽快完成支付：</p>
<ul>
  <li>订单号：{{orderNumber}}</li>
  <li>套餐：{{packageName}}</li>
  <li>应付金额：¥{{amount}}</li>
  <li>创建时间：{{createTime}}</li>
</ul>
<p><a href="{{websiteUrl}}/pay/{{orderNumber}}">立即支付</a></p>
<p>订单将在24小时后自动取消，请及时支付。</p>',
'您的订单{{orderNumber}}待支付，金额¥{{amount}}，请尽快完成支付。',
'{"tenantName":"租户名称","orderNumber":"订单号","packageName":"套餐名称","amount":"应付金额","createTime":"创建时间"}',
'订单创建后发送',
1, 'normal', 1, 1),

('tpl-004', 'payment_refund', '退款成功通知', 'both', 'payment', '退款成功通知',
'退款成功 - {{orderNumber}}',
'<h2>退款成功</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>您的退款申请已处理完成：</p>
<ul>
  <li>订单号：{{orderNumber}}</li>
  <li>退款金额：¥{{refundAmount}}</li>
  <li>退款时间：{{refundTime}}</li>
  <li>退款原因：{{refundReason}}</li>
</ul>
<p>退款将在3-5个工作日内到账，请注意查收。</p>',
'退款成功！订单{{orderNumber}}，退款金额¥{{refundAmount}}，预计3-5个工作日到账。',
'{"tenantName":"租户名称","orderNumber":"订单号","refundAmount":"退款金额","refundTime":"退款时间","refundReason":"退款原因"}',
'退款成功后发送',
1, 'high', 1, 1),

-- ========== 授权码相关 ==========
('tpl-005', 'license_generated', '授权码生成通知', 'email', 'license', '授权码生成后发送',
'授权码已生成 - {{tenantName}}',
'<h2>授权码已生成</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>您的授权码已生成：</p>
<div style="background:#f5f5f5;padding:15px;border-radius:4px;margin:15px 0;">
  <p style="font-size:18px;font-weight:bold;color:#409eff;margin:0;">{{licenseKey}}</p>
</div>
<ul>
  <li>授权类型：{{licenseType}}</li>
  <li>有效期至：{{expireDate}}</li>
  <li>最大用户数：{{maxUsers}}</li>
</ul>
<p>请妥善保管您的授权码，激活时需要使用。</p>
<p><a href="{{crmUrl}}/activate">立即激活</a></p>',
NULL,
'{"tenantName":"租户名称","licenseKey":"授权码","licenseType":"授权类型","expireDate":"到期时间","maxUsers":"最大用户数"}',
'授权码生成后发送',
1, 'high', 1, 0),

('tpl-006', 'license_expire_soon', '授权即将到期提醒', 'both', 'license', '授权到期前7天提醒',
'授权即将到期提醒',
'<h2>授权即将到期</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>您的授权即将到期，请及时续费：</p>
<ul>
  <li>授权码：{{licenseKey}}</li>
  <li>到期时间：{{expireDate}}</li>
  <li>剩余天数：{{remainDays}}天</li>
</ul>
<p><a href="{{websiteUrl}}/renew">立即续费</a></p>
<p>授权到期后系统将无法使用，请尽快续费。</p>',
'您的授权将在{{remainDays}}天后到期，请及时续费以免影响使用。',
'{"tenantName":"租户名称","licenseKey":"授权码","expireDate":"到期时间","remainDays":"剩余天数"}',
'到期前7天、3天、1天各发送一次',
1, 'high', 1, 1),

('tpl-007', 'license_expired', '授权已到期通知', 'both', 'license', '授权到期后通知',
'授权已到期',
'<h2>授权已到期</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>您的授权已到期：</p>
<ul>
  <li>授权码：{{licenseKey}}</li>
  <li>到期时间：{{expireDate}}</li>
</ul>
<p>系统已停止服务，请尽快续费恢复使用。</p>
<p><a href="{{websiteUrl}}/renew">立即续费</a></p>',
'您的授权已到期，系统已停止服务，请尽快续费。',
'{"tenantName":"租户名称","licenseKey":"授权码","expireDate":"到期时间"}',
'授权到期后发送',
1, 'urgent', 1, 1),

-- ========== 租户状态变更 ==========
('tpl-008', 'tenant_activated', '账号激活成功', 'both', 'tenant', '账号激活成功通知',
'账号激活成功',
'<h2>账号激活成功</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>您的账号已成功激活，可以正常使用了。</p>
<ul>
  <li>激活时间：{{activateTime}}</li>
  <li>服务期限：{{serviceEndDate}}</li>
</ul>
<p><a href="{{crmUrl}}/login">立即登录</a></p>',
'您的账号已激活，服务期限至{{serviceEndDate}}。',
'{"tenantName":"租户名称","activateTime":"激活时间","serviceEndDate":"服务结束日期"}',
'账号激活后发送',
1, 'high', 1, 1),

('tpl-009', 'tenant_suspended', '账号已暂停', 'both', 'tenant', '账号暂停通知',
'账号已暂停',
'<h2>账号已暂停</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>您的账号已被暂停使用：</p>
<ul>
  <li>暂停原因：{{reason}}</li>
  <li>暂停时间：{{suspendTime}}</li>
</ul>
<p>如有疑问，请联系客服。</p>',
'您的账号已暂停，原因：{{reason}}。如有疑问请联系客服。',
'{"tenantName":"租户名称","reason":"暂停原因","suspendTime":"暂停时间"}',
'账号暂停时发送',
1, 'urgent', 1, 1),

('tpl-010', 'tenant_resumed', '账号已恢复', 'both', 'tenant', '账号恢复通知',
'账号已恢复',
'<h2>账号已恢复</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>您的账号已恢复正常使用：</p>
<ul>
  <li>恢复时间：{{resumeTime}}</li>
</ul>
<p><a href="{{crmUrl}}/login">立即登录</a></p>',
'您的账号已恢复，可以正常使用了。',
'{"tenantName":"租户名称","resumeTime":"恢复时间"}',
'账号恢复时发送',
1, 'high', 1, 1),

-- ========== 续费相关 ==========
('tpl-011', 'renew_success', '续费成功通知', 'both', 'payment', '续费成功通知',
'续费成功',
'<h2>续费成功</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>您的续费已成功：</p>
<ul>
  <li>续费金额：¥{{amount}}</li>
  <li>续费时长：{{duration}}</li>
  <li>新到期时间：{{newExpireDate}}</li>
</ul>
<p>感谢您的支持！</p>',
'续费成功！金额¥{{amount}}，服务期限延长至{{newExpireDate}}。',
'{"tenantName":"租户名称","amount":"续费金额","duration":"续费时长","newExpireDate":"新到期时间"}',
'续费成功后发送',
1, 'high', 1, 1),

-- ========== 套餐升级/扩容 ==========
('tpl-012', 'package_upgraded', '套餐升级成功', 'both', 'tenant', '套餐升级成功通知',
'套餐升级成功',
'<h2>套餐升级成功</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>您的套餐已成功升级：</p>
<ul>
  <li>原套餐：{{oldPackage}}</li>
  <li>新套餐：{{newPackage}}</li>
  <li>升级时间：{{upgradeTime}}</li>
</ul>
<p>新功能已生效，请登录体验。</p>',
'套餐升级成功！已从{{oldPackage}}升级至{{newPackage}}。',
'{"tenantName":"租户名称","oldPackage":"原套餐","newPackage":"新套餐","upgradeTime":"升级时间"}',
'套餐升级后发送',
1, 'high', 1, 1),

('tpl-013', 'capacity_expanded', '容量扩容成功', 'email', 'tenant', '容量扩容成功通知',
'容量扩容成功',
'<h2>容量扩容成功</h2>
<p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p>
<p>您的容量已成功扩容：</p>
<ul>
  <li>扩容项目：{{item}}</li>
  <li>原容量：{{oldCapacity}}</li>
  <li>新容量：{{newCapacity}}</li>
  <li>扩容时间：{{expandTime}}</li>
</ul>',
NULL,
'{"tenantName":"租户名称","item":"扩容项目","oldCapacity":"原容量","newCapacity":"新容量","expandTime":"扩容时间"}',
'容量扩容后发送',
1, 'normal', 1, 0);

-- 通知发送记录表(扩展)
ALTER TABLE notification_logs 
ADD COLUMN template_code VARCHAR(100) COMMENT '使用的模板代码',
ADD COLUMN variables JSON COMMENT '渲染变量',
ADD INDEX idx_template_code (template_code);

