-- 添加版本发布通知模板
-- 执行时间: 2026-03-19
-- 说明: 版本发布时自动通知所有活跃租户

INSERT INTO notification_templates (
  id, template_code, template_name, template_type, category, scene,
  email_subject, email_content, sms_content, variables, variable_description,
  is_enabled, is_system, priority, send_email, send_sms
) VALUES (
  'tpl-014',
  'version_published',
  '新版本发布通知',
  'both',
  'system',
  '新版本发布时通知所有活跃租户',
  '系统新版本发布 - v{{version}}',
  '<h2>新版本发布通知</h2><p>尊敬的 <strong>{{tenantName}}</strong>，云客CRM系统发布了新版本：</p><ul><li>版本号：<strong>v{{version}}</strong></li><li>更新类型：{{releaseType}}</li><li>发布时间：{{publishTime}}</li></ul><div style="background:#f5f7fa;padding:15px;border-radius:4px;margin:10px 0"><h3>更新内容</h3><p>{{changelog}}</p></div><p>{{forceUpdateTip}}</p><p>如有疑问请联系客服。</p>',
  '云客CRM新版本v{{version}}已发布，{{releaseType}}更新。{{forceUpdateTip}}请及时更新以获取最新功能。',
  '{"tenantName":"租户名称","version":"版本号","releaseType":"更新类型","changelog":"更新内容","publishTime":"发布时间","forceUpdateTip":"强制更新提示","downloadUrl":"下载地址"}',
  '版本发布后自动发送给所有活跃租户的邮箱和手机',
  1, 1, 'high', 1, 1
) ON DUPLICATE KEY UPDATE updated_at = NOW();
