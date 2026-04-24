-- ============================================
-- 生产环境：重新设计价格配置表
-- 执行环境：宝塔phpMyAdmin
-- 数据库：crm_production
-- 执行时间：2026-03-01
-- ============================================

-- 注意：在宝塔phpMyAdmin中，数据库已在界面选择，不需要USE语句

-- 步骤1: 备份现有数据
CREATE TABLE IF NOT EXISTS `value_added_price_config_backup_20260301` LIKE `value_added_price_config`;

-- 步骤2: 复制数据到备份表
INSERT INTO `value_added_price_config_backup_20260301` SELECT * FROM `value_added_price_config`;

-- 步骤3: 删除旧表
DROP TABLE IF EXISTS `value_added_price_config`;

-- 步骤4: 创建新的价格配置表
CREATE TABLE `value_added_price_config` (
  `id` varchar(50) NOT NULL COMMENT '配置ID',
  `company_id` varchar(50) NOT NULL COMMENT '外包公司ID',
  `tier_name` varchar(100) NOT NULL COMMENT '档位名称',
  `tier_order` int DEFAULT 1 COMMENT '档位排序',
  `pricing_type` varchar(20) NOT NULL DEFAULT 'fixed' COMMENT '计价方式：fixed=按单计价, percentage=按比例计价',
  `unit_price` decimal(10,2) DEFAULT 0.00 COMMENT '按单计价：固定单价',
  `percentage_rate` decimal(5,2) DEFAULT 0.00 COMMENT '按比例计价：百分比',
  `base_amount_field` varchar(50) DEFAULT 'orderAmount' COMMENT '按比例计价的基数字段',
  `start_date` date DEFAULT NULL COMMENT '开始日期',
  `end_date` date DEFAULT NULL COMMENT '结束日期',
  `is_active` tinyint DEFAULT 1 COMMENT '是否启用',
  `priority` int DEFAULT 0 COMMENT '优先级',
  `condition_rules` text COMMENT '条件规则JSON',
  `remark` text COMMENT '备注',
  `created_by` varchar(50) DEFAULT NULL,
  `created_by_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_date_range` (`start_date`,`end_date`),
  KEY `idx_active` (`is_active`),
  KEY `idx_priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='增值服务价格配置表（多档位）';

-- 步骤5: 验证
SELECT 
  '✅ 价格配置表重新设计完成' AS status,
  COUNT(*) AS backup_count 
FROM `value_added_price_config_backup_20260301`;
