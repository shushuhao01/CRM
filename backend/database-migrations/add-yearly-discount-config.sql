-- 添加年付折扣配置字段
-- 用于配置年付优惠策略
-- 创建时间: 2026-03-05
-- 修正时间: 2026-03-28（修正表名 packages → tenant_packages）

-- 1. 添加年付折扣相关字段
ALTER TABLE `tenant_packages`
ADD COLUMN `yearly_discount_rate` DECIMAL(5, 2) DEFAULT 0.00 COMMENT '年付折扣率（0-100，例如20表示8折）' AFTER `billing_cycle`,
ADD COLUMN `yearly_bonus_months` INT DEFAULT 0 COMMENT '年付赠送月数' AFTER `yearly_discount_rate`,
ADD COLUMN `yearly_price` DECIMAL(10, 2) DEFAULT NULL COMMENT '年付价格（如果为NULL则自动计算）' AFTER `yearly_bonus_months`;

-- 2. 更新现有SaaS套餐的年付配置（送2个月，相当于10个月的价格）
UPDATE `tenant_packages`
SET
  `yearly_discount_rate` = 16.67,
  `yearly_bonus_months` = 2,
  `yearly_price` = `price` * 10
WHERE `type` = 'saas' AND `billing_cycle` = 'monthly' AND `price` > 0 AND `is_trial` = 0;

-- 3. 免费试用套餐不需要年付配置
UPDATE `tenant_packages`
SET
  `yearly_discount_rate` = 0,
  `yearly_bonus_months` = 0,
  `yearly_price` = NULL
WHERE `is_trial` = 1 OR `price` = 0;

-- 4. 私有部署版是一次性付费，不需要年付配置
UPDATE `tenant_packages`
SET
  `yearly_discount_rate` = 0,
  `yearly_bonus_months` = 0,
  `yearly_price` = NULL
WHERE `type` = 'private';

-- 5. 验证结果
SELECT
  name, code, type,
  price AS '月付价格',
  yearly_price AS '年付价格',
  yearly_discount_rate AS '折扣率%',
  yearly_bonus_months AS '赠送月数',
  duration_days AS '有效期(天)',
  is_trial AS '是否试用'
FROM tenant_packages
WHERE type = 'saas'
ORDER BY sort_order;

