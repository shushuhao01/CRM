-- =============================================
-- 生产环境：只创建价格档位表
-- 这是解决"加载公司档位失败"的关键表
-- =============================================

-- 删除旧表（如果存在且有问题）
-- DROP TABLE IF EXISTS `value_added_price_config`;

-- 创建价格档位表
CREATE TABLE IF NOT EXISTS `value_added_price_config` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `tier_name` VARCHAR(100) NOT NULL,
  `tier_order` INT NOT NULL DEFAULT 1,
  `pricing_type` VARCHAR(20) NOT NULL DEFAULT 'fixed',
  `unit_price` DECIMAL(10,2) DEFAULT 0.00,
  `percentage_rate` DECIMAL(5,2) DEFAULT 0.00,
  `base_amount_field` VARCHAR(50) DEFAULT 'orderAmount',
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `priority` INT DEFAULT 0,
  `condition_rules` TEXT DEFAULT NULL,
  `remark` TEXT DEFAULT NULL,
  `created_by` VARCHAR(50) DEFAULT NULL,
  `created_by_name` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_tier_order` (`tier_order`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外包公司价格配置表';

-- 验证表是否创建成功
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'value_added_price_config';

-- 查看表结构
DESCRIBE `value_added_price_config`;

-- =============================================
-- 执行完成后重启后端服务：pm2 restart crm-backend
-- =============================================
