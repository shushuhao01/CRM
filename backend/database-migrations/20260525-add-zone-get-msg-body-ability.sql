-- 新增 zone_get_msg_body_ability_id 字段
-- 用于配置获取消息体的专区程序能力ID（invoke_get_msg_body），与 sync_msg 使用不同能力

DROP PROCEDURE IF EXISTS add_zone_get_msg_body_ability_id;

DELIMITER //
CREATE PROCEDURE add_zone_get_msg_body_ability_id()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'wecom_suite_configs'
        AND COLUMN_NAME = 'zone_get_msg_body_ability_id'
    ) THEN
        ALTER TABLE `wecom_suite_configs`
        ADD COLUMN `zone_get_msg_body_ability_id` VARCHAR(100) DEFAULT NULL
        COMMENT '获取消息体专用能力ID（如invoke_get_msg_body，为空则使用zone_sync_msg_ability_id）'
        AFTER `zone_sync_msg_ability_id`;
    END IF;
END //
DELIMITER ;

CALL add_zone_get_msg_body_ability_id();
DROP PROCEDURE IF EXISTS add_zone_get_msg_body_ability_id;
