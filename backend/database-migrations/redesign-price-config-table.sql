-- ============================================
-- 重新设计价格配置表（支持多档位和按比例计价）
-- 执行时间：2026-03-01
-- ============================================

-- 1. 备份现有数据（如果需要）
CREATE TABLE IF NOT EXISTS `value_added_price_config_backup` LIKE `value_added_price_config`;
INSERT INTO `value_added_price_config_backup` SELECT * FROM `value_added_price_config`;

-- 2. 删除旧表
DROP TABLE IF EXISTS `value_added_price_config`;

-- 3. 创建新的价格配置表
CREATE TABLE `value_added_price_config` (
  `id` VARCHAR(50) NOT NULL COMMENT '配置ID',
  `company_id` VARCHAR(50) NOT NULL COMMENT '外包公司ID',
  `tier_name` VARCHAR(100) NOT NULL COMMENT '档位名称（如：第一档、春节档）',
  `tier_order` INT DEFAULT 1 COMMENT '档位排序',
  
  -- 计价方式
  `pricing_type` VARCHAR(20) NOT NULL DEFAULT 'fixed' COMMENT '计价方式：fixed=按单计价, percentage=按比例计价',
  `unit_price` DECIMAL(10,2) DEFAULT 0 COMMENT '按单计价：固定单价',
  `percentage_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '按比例计价：百分比（如5.5表示5.5%）',
  `base_amount_field` VARCHAR(50) DEFAULT 'orderAmount' COMMENT '按比例计价的基数字段',
  
  -- 生效时间
  `start_date` DATE NULL COMMENT '开始日期',
  `end_date` DATE NULL COMMENT '结束日期',
  `is_active` TINYINT DEFAULT 1 COMMENT '是否启用',
  
  -- 优先级和条件
  `priority` INT DEFAULT 0 COMMENT '优先级（数字越大优先级越高）',
  `condition_rules` TEXT NULL COMMENT '条件规则JSON（预留扩展）',
  
  `remark` TEXT NULL COMMENT '备注',
  `created_by` VARCHAR(50) NULL,
  `created_by_name` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_date_range` (`start_date`, `end_date`),
  KEY `idx_active` (`is_active`),
  KEY `idx_priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='增值服务价格配置表（多档位）';

-- 4. 添加外键约束（可选）
-- ALTER TABLE `value_added_price_config` 
--   ADD CONSTRAINT `fk_price_config_company` 
--   FOREIGN KEY (`company_id`) REFERENCES `outsource_companies`(`id`) ON DELETE CASCADE;

-- 5. 插入示例数据（可选）
-- INSERT INTO `value_added_price_config` 
-- (`id`, `company_id`, `tier_name`, `tier_order`, `pricing_type`, `unit_price`, `start_date`, `end_date`, `is_active`, `priority`)
-- VALUES
-- ('pc001', 'company001', '标准档', 1, 'fixed', 900.00, NULL, NULL, 1, 0),
-- ('pc002', 'company001', '节假日档', 2, 'fixed', 1200.00, '2026-01-01', '2026-02-28', 1, 10);

SELECT '✅ 价格配置表重新设计完成' AS status;
