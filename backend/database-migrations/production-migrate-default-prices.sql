-- =============================================
-- 生产环境：迁移现有公司的默认单价到价格档位
-- 执行环境：宝塔 phpMyAdmin
-- 执行说明：为每个公司创建默认档位
-- =============================================

-- 为现有公司创建默认档位（从default_unit_price迁移）
-- 注意：如果档位已存在，会跳过
INSERT INTO value_added_price_config (
  id, 
  company_id, 
  tier_name, 
  tier_order, 
  pricing_type, 
  unit_price, 
  start_date, 
  is_active, 
  created_at, 
  created_by_name
)
SELECT 
  CONCAT('tier-', id, '-001') as id,
  id as company_id,
  '第一档' as tier_name,
  1 as tier_order,
  'fixed' as pricing_type,
  COALESCE(default_unit_price, 0) as unit_price,
  '2024-01-01' as start_date,
  1 as is_active,
  NOW() as created_at,
  '系统迁移' as created_by_name
FROM outsource_companies
WHERE NOT EXISTS (
  SELECT 1 
  FROM value_added_price_config 
  WHERE company_id = outsource_companies.id
);

-- =============================================
-- 执行完成！
-- 检查结果：SELECT * FROM value_added_price_config;
-- =============================================
