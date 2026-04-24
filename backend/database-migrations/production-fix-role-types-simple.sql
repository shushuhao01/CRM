-- ============================================
-- 生产环境角色类型修复脚本（简化版 - 适用于宝塔 phpMyAdmin）
-- 执行时间：2026-02-26
-- 用途：修复5个系统预设角色的类型为 'system'
-- ============================================

-- 注意：请在宝塔 phpMyAdmin 中逐条执行以下 SQL 语句

-- 1. 检查修复前的角色类型（可选）
SELECT id, name, code, roleType, created_at
FROM roles 
WHERE code IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service')
ORDER BY id;

-- 2. 更新5个系统预设角色的类型为 'system'（核心语句）
UPDATE roles 
SET roleType = 'system' 
WHERE code IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service');

-- 3. 验证修复结果（可选）
SELECT id, name, code, roleType, updated_at
FROM roles 
WHERE code IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service')
ORDER BY id;

-- 4. 查看所有角色的类型分布（可选）
SELECT roleType, COUNT(*) as count
FROM roles 
GROUP BY roleType;
