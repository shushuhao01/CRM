-- 迁移: 为 wecom_suite_configs 添加 zone_sync_msg_ability_id 字段
-- 用途: 支持为 sync_msg（获取会话记录）配置独立的专区能力ID
-- 日期: 2026-05-25
-- 兼容: MySQL 5.7+ / 8.0+

SET @table_name = 'wecom_suite_configs';
SET @column_name = 'zone_sync_msg_ability_id';

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = @table_name
    AND COLUMN_NAME = @column_name
);

SET @sql = IF(@col_exists = 0,
  CONCAT('ALTER TABLE `', @table_name, '` ADD COLUMN `', @column_name, '` VARCHAR(100) DEFAULT NULL COMMENT ''获取会话记录专用能力ID（如invoke_sync_msg，为空则使用zone_ability_id）'' AFTER `zone_ability_id`'),
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
