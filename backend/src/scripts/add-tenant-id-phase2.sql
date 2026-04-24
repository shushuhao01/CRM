-- ============================================
-- 租户数据隔离 Phase2：补充 tenant_id 字段
-- 创建日期：2026-03-23
-- 兼容 MySQL 8.0 / phpMyAdmin
-- ============================================

DROP PROCEDURE IF EXISTS add_tenant_id_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_tenant_id_if_not_exists(IN tbl VARCHAR(100))
BEGIN
    SET @db = DATABASE();
    -- 先检查表是否存在
    SET @tbl_exists = 0;
    SELECT COUNT(*) INTO @tbl_exists FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = tbl;
    IF @tbl_exists = 0 THEN
        -- 表不存在，跳过
        SELECT CONCAT('SKIP: table ', tbl, ' does not exist') AS info;
    ELSE
        SET @col_exists = 0;
        SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @db AND TABLE_NAME = tbl AND COLUMN_NAME = 'tenant_id';
        IF @col_exists = 0 THEN
            SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID''');
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END IF;
END //
DELIMITER ;

CALL add_tenant_id_if_not_exists('call_lines');
CALL add_tenant_id_if_not_exists('user_line_assignments');
CALL add_tenant_id_if_not_exists('phone_configs');
CALL add_tenant_id_if_not_exists('work_phones');
CALL add_tenant_id_if_not_exists('device_bind_logs');
CALL add_tenant_id_if_not_exists('global_call_config');
CALL add_tenant_id_if_not_exists('outbound_tasks');
CALL add_tenant_id_if_not_exists('call_recordings');
CALL add_tenant_id_if_not_exists('phone_blacklist');
CALL add_tenant_id_if_not_exists('commission_settings');
CALL add_tenant_id_if_not_exists('commission_ladders');
CALL add_tenant_id_if_not_exists('service_follow_ups');
CALL add_tenant_id_if_not_exists('service_operation_logs');
CALL add_tenant_id_if_not_exists('notification_templates');
CALL add_tenant_id_if_not_exists('payment_method_options');
CALL add_tenant_id_if_not_exists('performance_configs');
CALL add_tenant_id_if_not_exists('rejection_reasons');
CALL add_tenant_id_if_not_exists('message_cleanup_history');
CALL add_tenant_id_if_not_exists('logistics_api_configs');
CALL add_tenant_id_if_not_exists('improvement_goals');
CALL add_tenant_id_if_not_exists('wecom_chat_records');

DROP PROCEDURE IF EXISTS add_tenant_id_if_not_exists;

-- ============================================
-- 添加索引
-- ============================================
DROP PROCEDURE IF EXISTS add_index_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_index_if_not_exists(IN tbl VARCHAR(100), IN idx VARCHAR(100))
BEGIN
    SET @db = DATABASE();
    -- 先检查表是否存在
    SET @tbl_exists = 0;
    SELECT COUNT(*) INTO @tbl_exists FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = tbl;
    IF @tbl_exists > 0 THEN
        SET @idx_exists = 0;
        SELECT COUNT(*) INTO @idx_exists FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = @db AND TABLE_NAME = tbl AND INDEX_NAME = idx;
        IF @idx_exists = 0 THEN
            SET @col_exists = 0;
            SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = @db AND TABLE_NAME = tbl AND COLUMN_NAME = 'tenant_id';
            IF @col_exists > 0 THEN
                SET @sql = CONCAT('CREATE INDEX `', idx, '` ON `', tbl, '`(`tenant_id`)');
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            END IF;
        END IF;
    END IF;
END //
DELIMITER ;

CALL add_index_if_not_exists('call_lines', 'idx_call_lines_tenant');
CALL add_index_if_not_exists('user_line_assignments', 'idx_user_line_assignments_tenant');
CALL add_index_if_not_exists('work_phones', 'idx_work_phones_tenant');
CALL add_index_if_not_exists('device_bind_logs', 'idx_device_bind_logs_tenant');
CALL add_index_if_not_exists('global_call_config', 'idx_global_call_config_tenant');
CALL add_index_if_not_exists('outbound_tasks', 'idx_outbound_tasks_tenant');
CALL add_index_if_not_exists('call_recordings', 'idx_call_recordings_tenant');
CALL add_index_if_not_exists('commission_settings', 'idx_commission_settings_tenant');
CALL add_index_if_not_exists('service_follow_ups', 'idx_service_follow_ups_tenant');
CALL add_index_if_not_exists('notification_templates', 'idx_notification_templates_tenant');
CALL add_index_if_not_exists('payment_method_options', 'idx_payment_method_options_tenant');
CALL add_index_if_not_exists('performance_configs', 'idx_performance_configs_tenant');
CALL add_index_if_not_exists('rejection_reasons', 'idx_rejection_reasons_tenant');
CALL add_index_if_not_exists('message_cleanup_history', 'idx_message_cleanup_history_tenant');
CALL add_index_if_not_exists('improvement_goals', 'idx_improvement_goals_tenant');

DROP PROCEDURE IF EXISTS add_index_if_not_exists;
