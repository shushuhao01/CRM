-- 删除硬编码的测试档位数据
-- 执行环境：开发环境 crm_local
-- 执行时间：2026-03-01

-- 删除测试档位（根据档位名称识别）
DELETE FROM value_added_price_config 
WHERE tier_name IN ('标准档位', '11', '第一档', '测试档位')
  OR tier_name LIKE '%测试%'
  OR tier_name LIKE '%test%';

-- 查看剩余档位
SELECT 
  id,
  company_id,
  tier_name,
  pricing_type,
  unit_price,
  percentage_rate,
  start_date,
  end_date,
  priority,
  is_active,
  created_at
FROM value_added_price_config
ORDER BY company_id, tier_order, priority DESC;
