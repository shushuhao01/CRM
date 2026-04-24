-- 修复售后管理权限ID不匹配问题
-- 将 afterSales 改为 aftersale（与权限树保持一致）

-- 部门经理角色
UPDATE roles 
SET permissions = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    permissions,
    'afterSales.data.analysis', 'aftersale.data.analysis'),
    'afterSales.data.view', 'aftersale.data.view'),
    'afterSales.data', 'aftersale.data'),
    'afterSales.add.create', 'aftersale.add.create'),
    'afterSales.add', 'aftersale.add'),
    'afterSales.list.view', 'aftersale.list.view'),
    'afterSales.list', 'aftersale.list'),
    'afterSales', 'aftersale')
WHERE code = 'department_manager';

-- 销售员角色
UPDATE roles 
SET permissions = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    permissions,
    'afterSales.add.create', 'aftersale.add.create'),
    'afterSales.add', 'aftersale.add'),
    'afterSales.list.view', 'aftersale.list.view'),
    'afterSales.list', 'aftersale.list'),
    'afterSales', 'aftersale')
WHERE code = 'sales_staff';

-- 验证修复结果
SELECT 
    id,
    name,
    code,
    JSON_LENGTH(permissions) as permission_count,
    permissions
FROM roles 
WHERE code IN ('department_manager', 'sales_staff')
ORDER BY id;
