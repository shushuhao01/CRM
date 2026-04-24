-- ============================================
-- 生产环境角色类型修复脚本（使用 is_system 字段）
-- 执行时间：2026-02-26
-- 用途：修复5个系统预设角色，设置 is_system = 1
-- ============================================

-- 注意：生产数据库使用 is_system 字段，不是 roleType 字段
-- is_system = 1 表示系统角色
-- is_system = 0 表示自定义角色

-- 第1步：检查当前状态（可选）
SELECT id, name, display_name, is_system, created_at
FROM roles 
WHERE name IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service')
ORDER BY id;

-- 第2步：更新5个系统预设角色，设置 is_system = 1（核心语句）
UPDATE roles 
SET is_system = 1 
WHERE name IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service');

-- 第3步：验证修复结果（可选）
SELECT id, name, display_name, is_system, updated_at
FROM roles 
WHERE name IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service')
ORDER BY id;

-- 第4步：查看所有角色的类型分布（可选）
SELECT 
    CASE 
        WHEN is_system = 1 THEN '系统角色'
        ELSE '自定义角色'
    END as role_type,
    COUNT(*) as count
FROM roles 
GROUP BY is_system;
