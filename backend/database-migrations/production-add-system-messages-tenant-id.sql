-- ============================================================================
-- 生产环境 - 为system_messages表添加tenant_id字段
-- ============================================================================
-- 执行时间: 2026-03-03
-- 目标数据库: abc789_cn (生产环境)
-- 执行方式: 宝塔面板 > 数据库 > abc789_cn > SQL窗口
-- 
-- 说明:
-- 1. 为system_messages表添加tenant_id字段，支持多租户数据隔离
-- 2. 添加索引提升查询性能
-- 3. 字段允许NULL，兼容私有部署模式
-- ============================================================================

USE abc789_cn;

-- ============================================================================
-- 步骤1: 检查字段是否已存在
-- ============================================================================
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'abc789_cn'
  AND TABLE_NAME = 'system_messages'
  AND COLUMN_NAME = 'tenant_id';

-- 如果上面查询有结果，说明字段已存在，无需执行后续步骤
-- 如果上面查询无结果，继续执行下面的步骤

-- ============================================================================
-- 步骤2: 添加tenant_id字段
-- ============================================================================
ALTER TABLE system_messages 
ADD COLUMN tenant_id VARCHAR(36) NULL COMMENT '租户ID' AFTER target_user_id;

-- ============================================================================
-- 步骤3: 添加索引
-- ============================================================================
ALTER TABLE system_messages 
ADD INDEX idx_tenant_id (tenant_id);

-- ============================================================================
-- 步骤4: 验证字段添加成功
-- ============================================================================
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT,
    COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'abc789_cn'
  AND TABLE_NAME = 'system_messages'
  AND COLUMN_NAME = 'tenant_id';

-- 预期结果:
-- COLUMN_NAME: tenant_id
-- COLUMN_TYPE: varchar(36)
-- IS_NULLABLE: YES
-- COLUMN_DEFAULT: NULL
-- COLUMN_COMMENT: 租户ID
-- COLUMN_KEY: MUL (表示有索引)

-- ============================================================================
-- 步骤5: 查看表结构
-- ============================================================================
SHOW CREATE TABLE system_messages;

-- ============================================================================
-- 步骤6: 统计现有数据
-- ============================================================================
SELECT 
    COUNT(*) as total_messages,
    COUNT(tenant_id) as messages_with_tenant,
    COUNT(*) - COUNT(tenant_id) as messages_without_tenant
FROM system_messages;

-- 预期结果:
-- total_messages: 总消息数
-- messages_with_tenant: 0 (新添加的字段，现有数据都是NULL)
-- messages_without_tenant: 总消息数 (等于total_messages)

-- ============================================================================
-- 执行完成
-- ============================================================================
-- 
-- ✅ 执行成功标志:
-- 1. 步骤4查询返回tenant_id字段信息
-- 2. COLUMN_TYPE = varchar(36)
-- 3. IS_NULLABLE = YES
-- 4. COLUMN_KEY = MUL
-- 
-- ⚠️ 注意事项:
-- 1. 现有数据的tenant_id都是NULL，这是正常的
-- 2. 私有部署模式下，tenant_id保持NULL
-- 3. SaaS模式下，新创建的数据会自动设置tenant_id
-- 4. 此字段不影响现有功能，完全向后兼容
-- 
-- ============================================================================
