-- 为外包公司表添加排序字段
-- 执行时间：2026-03-01
-- 说明：支持公司排序和默认公司设置

-- 添加排序字段
ALTER TABLE outsource_companies 
ADD COLUMN sort_order INT DEFAULT 999 COMMENT '排序顺序，数字越小越靠前' AFTER status;

-- 添加是否默认字段
ALTER TABLE outsource_companies 
ADD COLUMN is_default TINYINT(1) DEFAULT 0 COMMENT '是否默认公司（0-否，1-是）' AFTER sort_order;

-- 为现有公司设置排序
UPDATE outsource_companies SET sort_order = 1 WHERE id = (SELECT id FROM (SELECT id FROM outsource_companies ORDER BY created_at LIMIT 1) AS temp);

-- 创建索引
CREATE INDEX idx_sort_order ON outsource_companies(sort_order);
CREATE INDEX idx_is_default ON outsource_companies(is_default);

-- 验证
SELECT id, company_name, sort_order, is_default, status FROM outsource_companies ORDER BY sort_order;
