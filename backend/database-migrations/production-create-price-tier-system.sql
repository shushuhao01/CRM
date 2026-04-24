-- =============================================
-- 生产环境：创建价格档位系统
-- 执行环境：宝塔 phpMyAdmin
-- 执行说明：逐条执行，如果表已存在会跳过
-- =============================================

-- 1. 创建价格配置表
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='外包公司价格配置表';

-- 2. 创建索引（如果不存在）
CREATE INDEX idx_company_id ON value_added_price_config(company_id);
CREATE INDEX idx_tier_order ON value_added_price_config(tier_order);
CREATE INDEX idx_date_range ON value_added_price_config(start_date, end_date);
CREATE INDEX idx_is_active ON value_added_price_config(is_active);

-- =============================================
-- 执行完成！
-- 如果索引已存在会报错 "Duplicate key name"，可以忽略
-- =============================================
