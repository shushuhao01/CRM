-- 添加计费周期和赠送月数字段到支付订单表
-- 用于正确计算年付套餐的授权有效期

-- 1. 添加计费周期字段
ALTER TABLE payment_orders 
ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly' 
COMMENT '计费周期：monthly-月付，yearly-年付，once-一次性';

-- 2. 添加赠送月数字段
ALTER TABLE payment_orders 
ADD COLUMN bonus_months INT DEFAULT 0 
COMMENT '年付赠送月数（仅年付套餐有效）';

-- 3. 添加索引以提高查询性能
CREATE INDEX idx_payment_orders_billing_cycle ON payment_orders(billing_cycle);

-- 验证字段是否添加成功
SELECT 
  COLUMN_NAME, 
  COLUMN_TYPE, 
  COLUMN_DEFAULT, 
  COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'payment_orders' 
  AND COLUMN_NAME IN ('billing_cycle', 'bonus_months');
