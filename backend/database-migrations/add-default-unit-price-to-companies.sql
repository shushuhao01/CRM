-- 为外包公司表添加默认单价字段
-- 执行时间：2026-03-01

-- 添加默认单价字段
ALTER TABLE outsource_companies 
ADD COLUMN default_unit_price DECIMAL(10, 2) DEFAULT 0 COMMENT '默认单价' 
AFTER status;

-- 更新现有公司的默认单价（可选，根据实际情况调整）
UPDATE outsource_companies 
SET default_unit_price = 900 
WHERE default_unit_price = 0;

-- 验证
SELECT id, company_name, default_unit_price, status 
FROM outsource_companies 
LIMIT 10;
