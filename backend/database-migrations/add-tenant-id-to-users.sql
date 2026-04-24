-- 给 users 表添加 tenant_id 列（多租户支持）
-- 执行前确认：如果列已存在则跳过

SET NAMES utf8mb4;

-- 1. 添加 tenant_id 列（如果不存在）
SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'tenant_id'
);
SET @sql = IF(@exist = 0,
  'ALTER TABLE `users` ADD COLUMN `tenant_id` VARCHAR(36) NULL COMMENT ''租户ID（SaaS模式）'' AFTER `id`',
  'SELECT ''tenant_id column already exists''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 添加 tenant_id 索引（如果不存在）
SET @idx_exist := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND INDEX_NAME = 'idx_users_tenant_id'
);
SET @sql2 = IF(@idx_exist = 0,
  'ALTER TABLE `users` ADD INDEX `idx_users_tenant_id` (`tenant_id`)',
  'SELECT ''idx_users_tenant_id already exists''');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3. 添加租户+用户名复合唯一索引（同一租户下用户名唯一）
-- 注意：私有部署模式 tenant_id 为 NULL，MySQL中 NULL 值不参与唯一索引
SET @uk_exist := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND INDEX_NAME = 'uk_tenant_username'
);
SET @sql3 = IF(@uk_exist = 0,
  'ALTER TABLE `users` ADD UNIQUE INDEX `uk_tenant_username` (`tenant_id`, `username`)',
  'SELECT ''uk_tenant_username already exists''');
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- 4. 移除原来的 username 单列唯一索引（如果存在复合索引后不再需要）
-- 注意：先检查原始唯一索引是否存在
-- 暂不移除，保持向后兼容。如果出现"Duplicate entry"错误再手动移除：
-- ALTER TABLE `users` DROP INDEX `username`;

SELECT '✅ users 表 tenant_id 列添加完成' AS result;

