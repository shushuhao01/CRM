-- 验证每个角色的权限代码是否都存在于permissions表中
-- 通过JSON_TABLE展开permissions数组，LEFT JOIN permissions表，找出不匹配的代码

-- 1. 检查所有角色中不匹配的权限代码
SELECT r.id AS role_id, r.name AS role_name, jt.perm_code,
  CASE WHEN p.code IS NOT NULL THEN 'OK' ELSE 'MISSING' END AS status
FROM roles r,
  JSON_TABLE(r.permissions, '$[*]' COLUMNS (perm_code VARCHAR(100) PATH '$')) AS jt
LEFT JOIN permissions p ON p.code COLLATE utf8mb4_unicode_ci = jt.perm_code COLLATE utf8mb4_unicode_ci
WHERE jt.perm_code != '*'
ORDER BY r.id, jt.perm_code;

-- 2. 只显示不匹配的权限代码
SELECT r.id AS role_id, r.name AS role_name, jt.perm_code AS missing_code
FROM roles r,
  JSON_TABLE(r.permissions, '$[*]' COLUMNS (perm_code VARCHAR(100) PATH '$')) AS jt
LEFT JOIN permissions p ON p.code COLLATE utf8mb4_unicode_ci = jt.perm_code COLLATE utf8mb4_unicode_ci
WHERE jt.perm_code != '*' AND p.code IS NULL
ORDER BY r.id, jt.perm_code;

-- 3. 统计每个角色的权限匹配情况
SELECT r.id AS role_id, r.name AS role_name, r.data_scope,
  COUNT(jt.perm_code) AS total_perms,
  SUM(CASE WHEN p.code IS NOT NULL THEN 1 ELSE 0 END) AS matched,
  SUM(CASE WHEN p.code IS NULL AND jt.perm_code != '*' THEN 1 ELSE 0 END) AS missing
FROM roles r,
  JSON_TABLE(r.permissions, '$[*]' COLUMNS (perm_code VARCHAR(100) PATH '$')) AS jt
LEFT JOIN permissions p ON p.code COLLATE utf8mb4_unicode_ci = jt.perm_code COLLATE utf8mb4_unicode_ci
GROUP BY r.id, r.name, r.data_scope
ORDER BY r.id;
