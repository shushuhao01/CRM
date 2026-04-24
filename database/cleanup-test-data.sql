-- ============================================================
-- 清理测试/调试数据 SQL 脚本
-- 适用于：生产环境 / phpMyAdmin
-- 执行前请先备份数据库！
-- 日期：2026-03-20
-- ============================================================

-- 1. 清理 licenses 表中的测试数据
-- 删除名称包含"测试"、"验收"或乱码的记录
DELETE FROM license_logs WHERE license_id IN (
  SELECT id FROM licenses WHERE
    customer_name LIKE '%测试%' OR
    customer_name LIKE '%验收%' OR
    customer_name = '????' OR
    customer_name LIKE '%Test%'
);

DELETE FROM licenses WHERE
  customer_name LIKE '%测试%' OR
  customer_name LIKE '%验收%' OR
  customer_name = '????' OR
  customer_name LIKE '%Test%';

-- 2. 清理 licenses 表中的重复记录（只保留最新的一条）
-- 先查看重复记录（执行前可先 SELECT 确认）
-- SELECT id, customer_name, license_type, created_at FROM licenses ORDER BY created_at DESC;
-- 如有重复，保留第一条，删除其余（请根据实际情况修改ID）
-- DELETE FROM licenses WHERE id IN ('要删除的ID1', '要删除的ID2');

-- 3. 清理 tenants 表中的测试数据
DELETE FROM tenants WHERE
  name LIKE '%测试%' OR
  name LIKE '%Test%' OR
  code LIKE '%TEST%' OR
  code LIKE '%CFGTEST%' OR
  code LIKE '%REPO%';

-- 4. 清理孤立的 license_logs（关联的 license 已不存在）
DELETE FROM license_logs WHERE license_id NOT IN (SELECT id FROM licenses);

-- 5. 验证清理结果
SELECT '== licenses ==' AS info;
SELECT COUNT(*) AS total_licenses FROM licenses;
SELECT id, customer_name, license_type, status FROM licenses ORDER BY created_at DESC;

SELECT '== tenants ==' AS info;
SELECT COUNT(*) AS total_tenants FROM tenants;

SELECT '== license_logs ==' AS info;
SELECT COUNT(*) AS total_logs FROM license_logs;

