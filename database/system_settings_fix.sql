-- =============================================
-- 系统设置配置键名修复脚本
-- 用于将第一版带前缀的键名更新为新版不带前缀的键名
-- 执行前请备份数据库！
-- =============================================

SET NAMES utf8mb4;

-- 1. 修复短信设置的键名（sms_settings组）
UPDATE `system_configs` SET `configKey` = 'provider' WHERE `configKey` = 'smsProvider' AND `configGroup` = 'sms_settings';
UPDATE `system_configs` SET `configKey` = 'accessKey' WHERE `configKey` = 'smsAccessKey' AND `configGroup` = 'sms_settings';
UPDATE `system_configs` SET `configKey` = 'secretKey' WHERE `configKey` = 'smsSecretKey' AND `configGroup` = 'sms_settings';
UPDATE `system_configs` SET `configKey` = 'signName' WHERE `configKey` = 'smsSignName' AND `configGroup` = 'sms_settings';
UPDATE `system_configs` SET `configKey` = 'dailyLimit' WHERE `configKey` = 'smsDailyLimit' AND `configGroup` = 'sms_settings';
UPDATE `system_configs` SET `configKey` = 'monthlyLimit' WHERE `configKey` = 'smsMonthlyLimit' AND `configGroup` = 'sms_settings';
UPDATE `system_configs` SET `configKey` = 'enabled' WHERE `configKey` = 'smsEnabled' AND `configGroup` = 'sms_settings';
UPDATE `system_configs` SET `configKey` = 'requireApproval' WHERE `configKey` = 'smsRequireApproval' AND `configGroup` = 'sms_settings';
UPDATE `system_configs` SET `configKey` = 'testPhone' WHERE `configKey` = 'smsTestPhone' AND `configGroup` = 'sms_settings';

-- 2. 修复存储设置的键名（storage_settings组）
UPDATE `system_configs` SET `configKey` = 'accessKey' WHERE `configKey` = 'ossAccessKey' AND `configGroup` = 'storage_settings';
UPDATE `system_configs` SET `configKey` = 'secretKey' WHERE `configKey` = 'ossSecretKey' AND `configGroup` = 'storage_settings';
UPDATE `system_configs` SET `configKey` = 'bucketName' WHERE `configKey` = 'ossBucketName' AND `configGroup` = 'storage_settings';
UPDATE `system_configs` SET `configKey` = 'region' WHERE `configKey` = 'ossRegion' AND `configGroup` = 'storage_settings';
UPDATE `system_configs` SET `configKey` = 'customDomain' WHERE `configKey` = 'ossCustomDomain' AND `configGroup` = 'storage_settings';

-- 3. 验证更新结果
SELECT '修复完成！以下是各配置组的配置项：' AS message;
SELECT configGroup AS '配置组', COUNT(*) AS '配置项数量' FROM `system_configs` GROUP BY configGroup ORDER BY configGroup;

-- 4. 显示短信设置的键名
SELECT '短信设置配置项：' AS message;
SELECT configKey, configValue FROM `system_configs` WHERE configGroup = 'sms_settings' ORDER BY sortOrder;

-- 5. 显示存储设置的键名
SELECT '存储设置配置项：' AS message;
SELECT configKey, configValue FROM `system_configs` WHERE configGroup = 'storage_settings' ORDER BY sortOrder;
