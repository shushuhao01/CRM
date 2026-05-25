-- v4.3.1 为 wecom_suite_configs 添加专区程序配置字段
-- 用于第三方应用通过 chatdata/sync_call_program 调用专区程序拉取会话存档
-- 兼容 MySQL 5.7+ / 8.0+

-- 先检查字段是否存在再添加（通过存储过程实现兼容）
DROP PROCEDURE IF EXISTS add_zone_fields;
DELIMITER $$
CREATE PROCEDURE add_zone_fields()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME = 'zone_program_id'
    ) THEN
        ALTER TABLE `wecom_suite_configs`
            ADD COLUMN `zone_program_id` VARCHAR(100) DEFAULT NULL COMMENT '数据与智能专区程序ID' AFTER `chat_archive_rsa_private_key`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_configs' AND COLUMN_NAME = 'zone_ability_id'
    ) THEN
        ALTER TABLE `wecom_suite_configs`
            ADD COLUMN `zone_ability_id` VARCHAR(100) DEFAULT NULL COMMENT '专区程序能力ID' AFTER `zone_program_id`;
    END IF;
END$$
DELIMITER ;

CALL add_zone_fields();
DROP PROCEDURE IF EXISTS add_zone_fields;
