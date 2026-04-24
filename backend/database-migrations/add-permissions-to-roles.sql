-- ============================================
-- 为 roles 表添加 permissions 字段
-- 创建时间: 2026-02-26
-- 说明: 添加 JSON 字段存储角色权限ID数组
-- ============================================

-- 检查并添加 permissions 字段
ALTER TABLE `roles` 
ADD COLUMN IF NOT EXISTS `permissions` JSON DEFAULT NULL COMMENT '权限ID数组（JSON格式）';

-- 检查并添加 data_scope 字段
ALTER TABLE `roles` 
ADD COLUMN IF NOT EXISTS `data_scope` VARCHAR(20) DEFAULT 'self' COMMENT '数据范围：all-全部数据, department-部门数据, self-个人数据';

-- 检查并添加 status 字段
ALTER TABLE `roles` 
ADD COLUMN IF NOT EXISTS `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态：active-启用, inactive-禁用';

-- 检查并添加 level 字段
ALTER TABLE `roles` 
ADD COLUMN IF NOT EXISTS `level` INT DEFAULT 0 COMMENT '角色级别，数字越小权限越高';

-- 检查并添加 color 字段
ALTER TABLE `roles` 
ADD COLUMN IF NOT EXISTS `color` VARCHAR(20) DEFAULT NULL COMMENT '角色颜色标识';

-- 检查并添加 code 字段（如果不存在）
ALTER TABLE `roles` 
ADD COLUMN IF NOT EXISTS `code` VARCHAR(50) DEFAULT NULL COMMENT '角色编码';

-- 为 code 字段添加唯一索引（如果不存在）
CREATE UNIQUE INDEX IF NOT EXISTS `idx_roles_code` ON `roles` (`code`);

-- 更新现有角色的 code 字段（如果为空）
UPDATE `roles` SET `code` = `name` WHERE `code` IS NULL OR `code` = '';

-- 更新现有角色的 permissions 字段为空数组（如果为空）
UPDATE `roles` SET `permissions` = '[]' WHERE `permissions` IS NULL;

-- 显示更新结果
SELECT 
    id,
    name,
    code,
    status,
    level,
    data_scope,
    JSON_LENGTH(permissions) as permission_count,
    created_at,
    updated_at
FROM `roles`
ORDER BY level ASC, created_at DESC;

-- ============================================
-- 迁移完成
-- ============================================
