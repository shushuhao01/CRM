-- =============================================
-- 系统设置增量更新脚本
-- 用于已部署系统添加/更新系统设置配置项
-- 新部署请直接使用 schema.sql
-- 执行前请备份数据库！
-- =============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. 清理旧的系统配置数据（可选，如需保留现有数据请注释此行）
-- DELETE FROM `system_configs` WHERE `configGroup` IN ('security_settings', 'call_settings', 'email_settings', 'sms_settings', 'storage_settings', 'product_settings', 'backup_settings', 'agreement_settings');

-- 2. 插入安全设置配置
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('passwordMinLength', '6', 'number', 'security_settings', '密码最小长度', TRUE, TRUE, 1),
('passwordComplexity', '[]', 'json', 'security_settings', '密码复杂度要求', TRUE, TRUE, 2),
('passwordExpireDays', '0', 'number', 'security_settings', '密码有效期(天)', TRUE, TRUE, 3),
('loginFailLock', 'false', 'boolean', 'security_settings', '登录失败锁定', TRUE, TRUE, 4),
('maxLoginFails', '5', 'number', 'security_settings', '最大失败次数', TRUE, TRUE, 5),
('lockDuration', '30', 'number', 'security_settings', '锁定时间(分钟)', TRUE, TRUE, 6),
('sessionTimeout', '120', 'number', 'security_settings', '会话超时时间(分钟)', TRUE, TRUE, 7),
('forceHttps', 'false', 'boolean', 'security_settings', '强制HTTPS', TRUE, TRUE, 8),
('ipWhitelist', '', 'text', 'security_settings', 'IP白名单', TRUE, TRUE, 9)
ON DUPLICATE KEY UPDATE `configValue` = VALUES(`configValue`), `updatedAt` = CURRENT_TIMESTAMP;

-- 3. 插入通话设置配置
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('sipServer', '', 'string', 'call_settings', 'SIP服务器地址', TRUE, TRUE, 1),
('sipPort', '5060', 'number', 'call_settings', 'SIP端口', TRUE, TRUE, 2),
('sipUsername', '', 'string', 'call_settings', 'SIP用户名', TRUE, TRUE, 3),
('sipPassword', '', 'string', 'call_settings', 'SIP密码', TRUE, TRUE, 4),
('sipTransport', 'UDP', 'string', 'call_settings', '传输协议', TRUE, TRUE, 5),
('autoAnswer', 'false', 'boolean', 'call_settings', '自动接听', TRUE, TRUE, 6),
('autoRecord', 'false', 'boolean', 'call_settings', '自动录音', TRUE, TRUE, 7),
('qualityMonitoring', 'false', 'boolean', 'call_settings', '通话质量监控', TRUE, TRUE, 8),
('incomingCallPopup', 'true', 'boolean', 'call_settings', '呼入弹窗', TRUE, TRUE, 9),
('maxCallDuration', '3600', 'number', 'call_settings', '最大通话时长(秒)', TRUE, TRUE, 10),
('recordFormat', 'mp3', 'string', 'call_settings', '录音格式', TRUE, TRUE, 11),
('recordQuality', 'standard', 'string', 'call_settings', '录音质量', TRUE, TRUE, 12),
('recordPath', './recordings', 'string', 'call_settings', '录音保存路径', TRUE, TRUE, 13),
('recordRetentionDays', '90', 'number', 'call_settings', '录音保留时间(天)', TRUE, TRUE, 14),
('outboundPermission', '["admin","manager","sales"]', 'json', 'call_settings', '外呼权限', TRUE, TRUE, 15),
('recordAccessPermission', '["admin","manager"]', 'json', 'call_settings', '录音访问权限', TRUE, TRUE, 16),
('statisticsPermission', '["admin","manager"]', 'json', 'call_settings', '通话统计权限', TRUE, TRUE, 17),
('numberRestriction', 'false', 'boolean', 'call_settings', '号码限制', TRUE, TRUE, 18),
('allowedPrefixes', '', 'text', 'call_settings', '允许的号码前缀', TRUE, TRUE, 19)
ON DUPLICATE KEY UPDATE `configValue` = VALUES(`configValue`), `updatedAt` = CURRENT_TIMESTAMP;

-- 4. 插入邮件设置配置
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('smtpHost', '', 'string', 'email_settings', 'SMTP服务器地址', TRUE, TRUE, 1),
('smtpPort', '587', 'number', 'email_settings', 'SMTP端口', TRUE, TRUE, 2),
('senderEmail', '', 'string', 'email_settings', '发件人邮箱', TRUE, TRUE, 3),
('senderName', '', 'string', 'email_settings', '发件人名称', TRUE, TRUE, 4),
('emailPassword', '', 'string', 'email_settings', '邮箱密码', TRUE, TRUE, 5),
('enableSsl', 'true', 'boolean', 'email_settings', '启用SSL', TRUE, TRUE, 6),
('enableTls', 'false', 'boolean', 'email_settings', '启用TLS', TRUE, TRUE, 7),
('testEmail', '', 'string', 'email_settings', '测试邮箱', TRUE, TRUE, 8)
ON DUPLICATE KEY UPDATE `configValue` = VALUES(`configValue`), `updatedAt` = CURRENT_TIMESTAMP;

-- 5. 插入短信设置配置
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('provider', 'aliyun', 'string', 'sms_settings', '短信服务商', TRUE, TRUE, 1),
('accessKey', '', 'string', 'sms_settings', 'AccessKey', TRUE, TRUE, 2),
('secretKey', '', 'string', 'sms_settings', 'SecretKey', TRUE, TRUE, 3),
('signName', '', 'string', 'sms_settings', '短信签名', TRUE, TRUE, 4),
('dailyLimit', '100', 'number', 'sms_settings', '每日发送限制', TRUE, TRUE, 5),
('monthlyLimit', '3000', 'number', 'sms_settings', '每月发送限制', TRUE, TRUE, 6),
('enabled', 'false', 'boolean', 'sms_settings', '启用短信功能', TRUE, TRUE, 7),
('requireApproval', 'false', 'boolean', 'sms_settings', '需要审核', TRUE, TRUE, 8),
('testPhone', '', 'string', 'sms_settings', '测试手机号', TRUE, TRUE, 9)
ON DUPLICATE KEY UPDATE `configValue` = VALUES(`configValue`), `updatedAt` = CURRENT_TIMESTAMP;

-- 6. 插入存储设置配置
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('storageType', 'local', 'string', 'storage_settings', '存储类型', TRUE, TRUE, 1),
('localPath', './uploads', 'string', 'storage_settings', '本地存储路径', TRUE, TRUE, 2),
('localDomain', '', 'string', 'storage_settings', '访问域名', TRUE, TRUE, 3),
('accessKey', '', 'string', 'storage_settings', 'Access Key', TRUE, TRUE, 4),
('secretKey', '', 'string', 'storage_settings', 'Secret Key', TRUE, TRUE, 5),
('bucketName', '', 'string', 'storage_settings', '存储桶名称', TRUE, TRUE, 6),
('region', 'oss-cn-hangzhou', 'string', 'storage_settings', '存储区域', TRUE, TRUE, 7),
('customDomain', '', 'string', 'storage_settings', '自定义域名', TRUE, TRUE, 8),
('maxFileSize', '10', 'number', 'storage_settings', '最大文件大小(MB)', TRUE, TRUE, 9),
('allowedTypes', 'jpg,png,gif,pdf,doc,docx,xls,xlsx', 'string', 'storage_settings', '允许的文件类型', TRUE, TRUE, 10)
ON DUPLICATE KEY UPDATE `configValue` = VALUES(`configValue`), `updatedAt` = CURRENT_TIMESTAMP;


-- 7. 插入商品设置配置
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('maxDiscountPercent', '50', 'number', 'product_settings', '全局最大优惠比例', TRUE, TRUE, 1),
('adminMaxDiscount', '50', 'number', 'product_settings', '管理员最大优惠', TRUE, TRUE, 2),
('managerMaxDiscount', '30', 'number', 'product_settings', '经理最大优惠', TRUE, TRUE, 3),
('salesMaxDiscount', '15', 'number', 'product_settings', '销售员最大优惠', TRUE, TRUE, 4),
('discountApprovalThreshold', '20', 'number', 'product_settings', '优惠审批阈值', TRUE, TRUE, 5),
('allowPriceModification', 'true', 'boolean', 'product_settings', '允许价格修改', TRUE, TRUE, 6),
('priceModificationRoles', '["admin","manager"]', 'json', 'product_settings', '价格修改权限', TRUE, TRUE, 7),
('enablePriceHistory', 'true', 'boolean', 'product_settings', '价格变动记录', TRUE, TRUE, 8),
('pricePrecision', '2', 'string', 'product_settings', '价格显示精度', TRUE, TRUE, 9),
('enableInventory', 'false', 'boolean', 'product_settings', '启用库存管理', TRUE, TRUE, 10),
('lowStockThreshold', '10', 'number', 'product_settings', '低库存预警阈值', TRUE, TRUE, 11),
('allowNegativeStock', 'false', 'boolean', 'product_settings', '允许负库存销售', TRUE, TRUE, 12),
('defaultCategory', '', 'string', 'product_settings', '默认分类', TRUE, TRUE, 13),
('maxCategoryLevel', '3', 'number', 'product_settings', '分类层级限制', TRUE, TRUE, 14),
('enableCategoryCode', 'false', 'boolean', 'product_settings', '启用分类编码', TRUE, TRUE, 15),
('costPriceViewRoles', '["super_admin","admin"]', 'json', 'product_settings', '成本价格查看权限', TRUE, TRUE, 16),
('salesDataViewRoles', '["super_admin","admin","manager"]', 'json', 'product_settings', '销售数据查看权限', TRUE, TRUE, 17),
('stockInfoViewRoles', '["super_admin","admin","manager"]', 'json', 'product_settings', '库存信息查看权限', TRUE, TRUE, 18),
('operationLogsViewRoles', '["super_admin","admin"]', 'json', 'product_settings', '操作日志查看权限', TRUE, TRUE, 19),
('sensitiveInfoHideMethod', 'asterisk', 'string', 'product_settings', '敏感信息隐藏方式', TRUE, TRUE, 20),
('enablePermissionControl', 'true', 'boolean', 'product_settings', '启用权限控制', TRUE, TRUE, 21)
ON DUPLICATE KEY UPDATE `configValue` = VALUES(`configValue`), `updatedAt` = CURRENT_TIMESTAMP;

-- 8. 插入数据备份设置配置
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('autoBackupEnabled', 'false', 'boolean', 'backup_settings', '自动备份', TRUE, TRUE, 1),
('backupFrequency', 'daily', 'string', 'backup_settings', '备份频率', TRUE, TRUE, 2),
('retentionDays', '30', 'number', 'backup_settings', '保留天数', TRUE, TRUE, 3),
('compression', 'true', 'boolean', 'backup_settings', '压缩备份', TRUE, TRUE, 4)
ON DUPLICATE KEY UPDATE `configValue` = VALUES(`configValue`), `updatedAt` = CURRENT_TIMESTAMP;

-- 9. 插入用户协议设置配置
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('userAgreementEnabled', 'true', 'boolean', 'agreement_settings', '用户协议启用', TRUE, TRUE, 1),
('userAgreementTitle', '用户服务协议', 'string', 'agreement_settings', '用户协议标题', TRUE, TRUE, 2),
('userAgreementContent', '', 'text', 'agreement_settings', '用户协议内容', TRUE, TRUE, 3),
('privacyAgreementEnabled', 'true', 'boolean', 'agreement_settings', '隐私协议启用', TRUE, TRUE, 4),
('privacyAgreementTitle', '隐私政策', 'string', 'agreement_settings', '隐私协议标题', TRUE, TRUE, 5),
('privacyAgreementContent', '', 'text', 'agreement_settings', '隐私协议内容', TRUE, TRUE, 6)
ON DUPLICATE KEY UPDATE `configValue` = VALUES(`configValue`), `updatedAt` = CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- 验证数据
-- =============================================
SELECT '系统设置数据库更新完成！' AS message;
SELECT configGroup AS '配置组', COUNT(*) AS '配置项数量' FROM `system_configs` GROUP BY configGroup ORDER BY configGroup;
