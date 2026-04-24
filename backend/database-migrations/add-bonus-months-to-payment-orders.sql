-- 添加年付赠送月数字段到支付订单表
-- 用于记录用户购买年付套餐时获得的赠送月数

USE crm_local;

-- 添加 bonus_months 字段
ALTER TABLE payment_orders 
ADD COLUMN bonus_months INT DEFAULT 0 COMMENT '赠送月数（年付套餐）' AFTER billing_cycle;

-- 验证字段添加
SELECT 
  COLUMN_NAME, 
  COLUMN_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT, 
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'crm_local' 
  AND TABLE_NAME = 'payment_orders'
  AND COLUMN_NAME IN ('billing_cycle', 'bonus_months');
