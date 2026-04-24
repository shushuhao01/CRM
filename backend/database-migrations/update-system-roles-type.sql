-- 更新系统预设角色的 roleType 字段
-- 适用于 MySQL 数据库
-- 确保5个系统预设角色的类型为 'system'

-- 1. 检查并添加 roleType 字段（如果不存在）
-- MySQL 语法
ALTER TABLE roles ADD COLUMN IF NOT EXISTS roleType VARCHAR(20) DEFAULT 'custom' AFTER status;

-- 2. 更新系统预设角色的类型为 'system'
UPDATE roles 
SET roleType = 'system'
WHERE code IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service');

-- 3. 验证更新结果
SELECT id, name, code, roleType, status 
FROM roles 
WHERE code IN ('super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service')
ORDER BY FIELD(code, 'super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service');
