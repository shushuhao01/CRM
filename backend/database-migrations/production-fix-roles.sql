-- ============================================
-- 生产环境角色数据修复脚本
-- 执行时间：2026-02-26
-- 用途：
--   1. 修复5个系统预设角色的类型为 'system'
--   2. 修复售后管理权限ID（afterSales -> aftersale）
-- ============================================

-- 开始事务
START TRANSACTION;

-- ============================================
-- 第一步：检查 roleType 字段是否存在
-- ============================================
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'roles' 
  AND COLUMN_NAME = 'roleType';

-- 如果上面的查询返回空结果，说明字段不存在，需要先添加字段
-- 如果字段不存在，请先执行以下语句（取消注释）：
-- ALTER TABLE roles ADD COLUMN roleType VARCHAR(20) DEFAULT 'custom' COMMENT '角色类型：system-系统角色, custom-自定义角色';

-- ============================================
-- 第二步：更新5个系统预设角色的类型为 'system'
-- ============================================
UPDATE roles 
SET roleType = 'system' 
WHERE code IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service');

-- 验证更新结果
SELECT 
    id,
    name,
    code,
    roleType,
    JSON_LENGTH(permissions) as permission_count
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
-- 第三步：修复部门经理的售后管理权限ID
-- ============================================
UPDATE roles 
SET permissions = JSON_ARRAY(
    'dashboard', 'dashboard.view', 'dashboard.export',
    'customer', 'customer.list', 'customer.list.view', 'customer.list.edit', 'customer.list.export', 'customer.list.import',
    'customer.add', 'customer.add.create',
    'order', 'order.list', 'order.list.view', 'order.list.edit',
    'order.add', 'order.add.create',
    'communication', 'communication.call', 'communication.call.view', 'communication.call.make', 'communication.call.record',
    'performance', 'performance.personal', 'performance.personal.view',
    'performance.team', 'performance.team.view',
    'performance.analysis', 'performance.analysis.view',
    'performance.share', 'performance.share.view',
    'logistics', 'logistics.list', 'logistics.list.view',
    'logistics.track', 'logistics.track.view',
    'aftersale', 'aftersale.list', 'aftersale.list.view',
    'aftersale.add', 'aftersale.add.create',
    'aftersale.data', 'aftersale.data.view',
    'data', 'data.search', 'data.search.basic', 'data.search.advanced',
    'finance', 'finance.performance_data', 'finance.performance_data.view',
    'finance.cod_application', 'finance.cod_application.view', 'finance.cod_application.create'
)
WHERE code = 'department_manager';

-- ============================================
-- 第四步：修复销售员的售后管理权限ID
-- ============================================
UPDATE roles 
SET permissions = JSON_ARRAY(
    'dashboard', 'dashboard.view',
    'customer', 'customer.list', 'customer.list.view',
    'customer.add', 'customer.add.create',
    'order', 'order.list', 'order.list.view', 'order.list.edit',
    'order.add', 'order.add.create',
    'communication', 'communication.call', 'communication.call.view', 'communication.call.make',
    'performance', 'performance.personal', 'performance.personal.view',
    'performance.team', 'performance.team.view',
    'logistics', 'logistics.list', 'logistics.list.view',
    'logistics.track', 'logistics.track.view',
    'aftersale', 'aftersale.list', 'aftersale.list.view',
    'aftersale.add', 'aftersale.add.create',
    'data', 'data.search', 'data.search.basic',
    'finance', 'finance.performance_data', 'finance.performance_data.view',
    'finance.cod_application', 'finance.cod_application.view', 'finance.cod_application.create'
)
WHERE code = 'sales_staff';

-- ============================================
-- 第五步：验证所有修复结果
-- ============================================
SELECT 
    '=== 角色类型修复结果 ===' as info;

SELECT 
    id,
    name,
    code,
    roleType,
    JSON_LENGTH(permissions) as permission_count,
    created_at,
    updated_at
FROM roles 
ORDER BY 
    CASE 
        WHEN code IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service') THEN 0
        ELSE 1
    END,
    id;

-- 检查是否还有 afterSales 权限ID
SELECT 
    '=== 检查是否还有 afterSales 权限ID ===' as info;

SELECT 
    id,
    name,
    code,
    permissions
FROM roles 
WHERE JSON_CONTAINS(permissions, '"afterSales"')
   OR JSON_SEARCH(permissions, 'one', 'afterSales%') IS NOT NULL;

-- 如果上面的查询返回结果，说明还有角色使用了旧的权限ID，需要手动修复

-- ============================================
-- 提交事务（如果一切正常）
-- ============================================
-- 如果上面的验证都通过，取消下面的注释来提交事务
-- COMMIT;

-- 如果发现问题，可以回滚事务
-- ROLLBACK;

-- ============================================
-- 使用说明
-- ============================================
-- 1. 在生产环境数据库中执行此脚本
-- 2. 仔细检查每一步的验证结果
-- 3. 如果所有验证都通过，执行 COMMIT; 提交事务
-- 4. 如果发现问题，执行 ROLLBACK; 回滚事务
-- 5. 执行完成后，通知用户清除浏览器缓存或重新登录
