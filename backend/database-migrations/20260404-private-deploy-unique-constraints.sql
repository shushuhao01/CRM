-- =============================================
-- 私有部署数据隔离加固 - 数据库唯一约束修复
-- 日期: 2026-04-04
-- 说明: 为 users 和 roles 表添加租户级复合唯一索引
--       防止同一租户下出现重复用户名/角色代码
-- =============================================

-- 安全检查：先看看是否有冲突数据
SELECT '=== 检查 users 表是否有重复的 (tenant_id, username) ===' AS info;
SELECT tenant_id, username, COUNT(*) as cnt
FROM users
GROUP BY tenant_id, username
HAVING COUNT(*) > 1;

SELECT '=== 检查 roles 表是否有重复的 (tenant_id, code) ===' AS info;
SELECT tenant_id, code, COUNT(*) as cnt
FROM roles
GROUP BY tenant_id, code
HAVING COUNT(*) > 1;

-- =============================================
-- 1. users 表：添加 (tenant_id, username) 复合唯一索引
-- =============================================

-- 检查索引是否已存在
SET @index_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'uk_tenant_username'
);

-- 如果不存在则创建
SET @sql = IF(@index_exists = 0,
  'ALTER TABLE users ADD UNIQUE INDEX uk_tenant_username (tenant_id, username)',
  'SELECT "uk_tenant_username already exists" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- 2. roles 表：修改 code 唯一约束为租户级
-- =============================================

-- 先删除旧的全局唯一索引（如果存在）
SET @old_index = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'roles'
    AND INDEX_NAME = 'code'
    AND NON_UNIQUE = 0
);

SET @drop_sql = IF(@old_index > 0,
  'ALTER TABLE roles DROP INDEX `code`',
  'SELECT "old code index not found" AS info'
);
PREPARE stmt FROM @drop_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加新的租户级复合唯一索引
SET @new_index = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'roles'
    AND INDEX_NAME = 'uk_tenant_role_code'
);

SET @create_sql = IF(@new_index = 0,
  'ALTER TABLE roles ADD UNIQUE INDEX uk_tenant_role_code (tenant_id, code)',
  'SELECT "uk_tenant_role_code already exists" AS info'
);
PREPARE stmt FROM @create_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- 验证结果
-- =============================================
SELECT '=== 验证 users 表索引 ===' AS info;
SHOW INDEX FROM users WHERE Key_name = 'uk_tenant_username';

SELECT '=== 验证 roles 表索引 ===' AS info;
SHOW INDEX FROM roles WHERE Key_name = 'uk_tenant_role_code';

SELECT '✅ 数据隔离唯一约束修复完成' AS result;

