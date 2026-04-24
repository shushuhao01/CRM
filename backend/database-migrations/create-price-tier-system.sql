-- 创建价格档位系统
-- 执行环境：本地开发 crm_local
-- 执行时间：2026-03-01

-- 1. 创建价格配置表（如果不存在）
CREATE TABLE IF NOT EXISTS `value_added_price_config` (
  `id` VARCHAR(50) NOT NULL COMMENT '配置ID',
  `company_id` VARCHAR(50) NOT NULL COMMENT '外包公司ID',
  `tier_name` VARCHAR(100) NOT NULL COMMENT '档位名称',
  `tier_order` INT NOT NULL DEFAULT 1 COMMENT '档位顺序',
  `pricing_type` VARCHAR(20) NOT NULL DEFAULT 'fixed' COMMENT '计价方式: fixed-按单计价, percentage-按比例计价',
  `unit_price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '单价（按单计价时使用）',
  `percentage_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '比例（按比例计价时使用，如5.5表示5.5%）',
  `base_amount_field` VARCHAR(50) DEFAULT 'orderAmount' COMMENT '基数字段',
  `start_date` DATE NULL COMMENT '生效开始日期',
  `end_date` DATE NULL COMMENT '生效结束日期',
  `is_active` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-停用',
  `priority` INT DEFAULT 0 COMMENT '优先级',
  `condition_rules` TEXT COMMENT '条件规则JSON',
  `remark` TEXT COMMENT '备注',
  `created_by` VARCHAR(50) COMMENT '创建人ID',
  `created_by_name` VARCHAR(100) COMMENT '创建人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_tier_order` (`tier_order`),
  KEY `idx_date_range` (`start_date`, `end_date`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='外包公司价格配置表';

-- 2. 为现有公司创建默认档位（从default_unit_price迁移）
INSERT INTO value_added_price_config (
  id, company_id, tier_name, tier_order, pricing_type, 
  unit_price, start_date, is_active, created_at, created_by_name
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
WHERE id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM value_added_price_config 
    WHERE company_id COLLATE utf8mb4_0900_ai_ci = outsource_companies.id
  );

-- 3. 删除default_unit_price字段（如果存在）
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() 
   AND TABLE_NAME = 'outsource_companies' 
   AND COLUMN_NAME = 'default_unit_price') > 0,
  'ALTER TABLE outsource_companies DROP COLUMN default_unit_price',
  'SELECT "字段不存在，跳过删除" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. 验证结果
SELECT '=== 价格档位统计 ===' as info;
SELECT COUNT(*) as total_tiers FROM value_added_price_config;

SELECT '=== 公司档位分布 ===' as info;
SELECT 
  c.company_name,
  COUNT(t.id) as tier_count,
  GROUP_CONCAT(CONCAT(t.tier_name, '(¥', t.unit_price, ')') SEPARATOR ', ') as tiers
FROM outsource_companies c
LEFT JOIN value_added_price_config t ON c.id = t.company_id COLLATE utf8mb4_0900_ai_ci
GROUP BY c.id, c.company_name
ORDER BY c.sort_order;
