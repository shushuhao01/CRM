-- 为销售员和经理角色添加通话管理权限
-- 只添加通话管理,不添加短信管理

-- 更新销售员角色权限
UPDATE roles 
SET permissions = JSON_ARRAY_APPEND(
  COALESCE(permissions, '[]'),
  '$',
  'communication.call',
  '$',
  'communication.call.view',
  '$',
  'communication.call.make',
  '$',
  'communication.call.record'
)
WHERE code = 'sales_staff' 
AND is_system = 1
AND JSON_SEARCH(permissions, 'one', 'communication.call') IS NULL;

-- 更新经理角色权限
UPDATE roles 
SET permissions = JSON_ARRAY_APPEND(
  COALESCE(permissions, '[]'),
  '$',
  'communication.call',
  '$',
  'communication.call.view',
  '$',
  'communication.call.make',
  '$',
  'communication.call.record'
)
WHERE code = 'manager' 
AND is_system = 1
AND JSON_SEARCH(permissions, 'one', 'communication.call') IS NULL;

-- 验证更新结果
SELECT 
  code AS '角色代码',
  name AS '角色名称',
  JSON_LENGTH(permissions) AS '权限数量',
  CASE 
    WHEN JSON_SEARCH(permissions, 'one', 'communication.call') IS NOT NULL THEN '✓ 已添加'
    ELSE '✗ 未添加'
  END AS '通话管理权限'
FROM roles 
WHERE code IN ('sales_staff', 'manager') 
AND is_system = 1;
