-- 添加 custom_fields 列到 customers 表（修复客户列表500错误）
-- 日期: 2026-04-19
ALTER TABLE customers ADD COLUMN IF NOT EXISTS custom_fields JSON NULL COMMENT '自定义字段数据' AFTER other_goals;

