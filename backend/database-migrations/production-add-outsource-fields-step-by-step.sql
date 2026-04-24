-- ============================================
-- 生产环境：为 outsource_companies 表添加缺失字段（分步执行版）
-- 执行时间: 2026-03-01
-- 说明: 一次执行一条语句，避免错误
-- ============================================

-- 第1步：使用生产数据库
USE crm_production;

-- 第2步：添加 is_default 字段
-- 复制下面这一条执行：
ALTER TABLE outsource_companies ADD COLUMN is_default TINYINT DEFAULT 0 COMMENT '是否默认公司';

-- 第3步：添加 sort_order 字段
-- 复制下面这一条执行：
ALTER TABLE outsource_companies ADD COLUMN sort_order INT DEFAULT 999 COMMENT '排序顺序';

-- 第4步：添加索引
-- 复制下面这一条执行：
ALTER TABLE outsource_companies ADD INDEX idx_sort_order (sort_order);

-- 第5步：更新排序值（需要一起执行这两条）
-- 复制下面这两条一起执行：
SET @row_number = 0;
UPDATE outsource_companies SET sort_order = (@row_number := @row_number + 1) WHERE sort_order = 999 ORDER BY created_at ASC;

-- 第6步：验证结果
-- 复制下面这一条执行：
SELECT id, company_name, is_default, sort_order, status, created_at FROM outsource_companies ORDER BY sort_order ASC;
