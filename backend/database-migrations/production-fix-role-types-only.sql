-- ============================================
-- 生产环境角色类型修复脚本（仅修复角色类型）
-- 执行时间：2026-02-26
-- 用途：修复5个系统预设角色的类型为 'system'
-- ============================================

-- 开始事务
START TRANSACTION;

-- ============================================
-- 第一步：检查当前角色类型
-- ============================================
SELECT 
    '=== 修复前的角色类型 ===' as info;

SELECT 
    id,
    name,
    code,
    roleType,
    created_at
FROM roles 
WHERE code IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service')
ORDER BY 
    CASE code
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'department_manager' THEN 3
        WHEN 'sales_staff' THEN 4
        WHEN 'customer_service' THEN 5
    END;

-- ============================================
-- 第二步：检查 roleType 字段是否存在
-- ============================================
SELECT 
    '=== 检查 roleType 字段 ===' as info;

SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'roles' 
  AND COLUMN_NAME = 'roleType';

-- 如果上面的查询返回空结果，说明字段不存在
-- 需要先添加字段（取消下面的注释）：
-- ALTER TABLE roles ADD COLUMN roleType VARCHAR(20) DEFAULT 'custom' COMMENT '角色类型：system-系统角色, custom-自定义角色';

-- ============================================
-- 第三步：更新5个系统预设角色的类型为 'system'
-- ============================================
UPDATE roles 
SET roleType = 'system' 
WHERE code IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service');

-- 显示更新影响的行数
SELECT ROW_COUNT() as '更新的行数';

-- ============================================
-- 第四步：验证修复结果
-- ============================================
SELECT 
    '=== 修复后的角色类型 ===' as info;

SELECT 
    id,
    name,
    code,
    roleType,
    updated_at
FROM roles 
WHERE code IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service')
ORDER BY 
    CASE code
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'department_manager' THEN 3
        WHEN 'sales_staff' THEN 4
        WHEN 'customer_service' THEN 5
    END;

-- ============================================
-- 第五步：检查所有角色的类型
-- ============================================
SELECT 
    '=== 所有角色的类型分布 ===' as info;

SELECT 
    roleType,
    COUNT(*) as count
FROM roles 
GROUP BY roleType;

-- ============================================
-- 提交或回滚事务
-- ============================================
-- 如果验证结果正确，取消下面的注释来提交事务
COMMIT;

-- 如果发现问题，可以回滚事务（注释掉上面的 COMMIT，取消下面的注释）
-- ROLLBACK;

-- ============================================
-- 执行完成提示
-- ============================================
SELECT 
    '=== 修复完成 ===' as info,
    '请通知用户清除浏览器缓存或重新登录' as notice;
