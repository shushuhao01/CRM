-- 检查 outsource_companies 表结构
USE crm_production;

-- 查看表结构
SHOW COLUMNS FROM outsource_companies;

-- 查看所有字段名
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'crm_production' 
AND TABLE_NAME = 'outsource_companies'
ORDER BY ORDINAL_POSITION;
