-- 添加物流查询预设寄件人手机号配置
-- 用于物流跟踪页面，避免每次查询顺丰等需要验证的物流时都要输入手机号

-- 检查配置是否已存在，不存在则插入
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`)
SELECT 'logistics_sender_phone', '', 'string', 'logistics_settings', '物流查询预设寄件人手机号（完整11位或后4位）', TRUE, FALSE, 1
WHERE NOT EXISTS (
    SELECT 1 FROM `system_configs` WHERE `configKey` = 'logistics_sender_phone'
);

-- 如果需要直接执行（生产环境）：
-- INSERT IGNORE INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`)
-- VALUES ('logistics_sender_phone', '', 'string', 'logistics_settings', '物流查询预设寄件人手机号（完整11位或后4位）', TRUE, FALSE, 1);
