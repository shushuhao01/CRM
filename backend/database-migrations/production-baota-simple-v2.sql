-- ============================================
-- 宝塔超级简化版 - 增值管理系统数据库迁移
-- 执行时间: 2026-03-01
-- 数据库: abc789_cn
-- 说明: 分步执行，每次只执行一个CREATE TABLE语句
-- ============================================

-- 步骤1: 创建外包公司表
CREATE TABLE IF NOT EXISTS `outsource_companies` (
  `id` varchar(50) NOT NULL,
  `company_name` varchar(200) NOT NULL,
  `contact_person` varchar(50) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `default_unit_price` decimal(10,2) DEFAULT 0.00,
  `total_orders` int(11) DEFAULT 0,
  `valid_orders` int(11) DEFAULT 0,
  `invalid_orders` int(11) DEFAULT 0,
  `total_amount` decimal(12,2) DEFAULT 0.00,
  `settled_amount` decimal(12,2) DEFAULT 0.00,
  `remark` text,
  `created_by` varchar(50) DEFAULT NULL,
  `created_by_name` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='外包公司表';

-- 步骤2: 创建增值费用配置表
CREATE TABLE IF NOT EXISTS `value_added_price_config` (
  `id` varchar(50) NOT NULL,
  `config_name` varchar(100) NOT NULL,
  `company_id` varchar(50) DEFAULT NULL,
  `company_name` varchar(200) DEFAULT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `conditions` text,
  `status` varchar(20) DEFAULT 'active',
  `remark` text,
  `created_by` varchar(50) DEFAULT NULL,
  `created_by_name` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='增值费用配置表';

-- 步骤3: 创建增值订单表
CREATE TABLE IF NOT EXISTS `value_added_orders` (
  `id` varchar(50) NOT NULL,
  `order_id` varchar(50) DEFAULT NULL,
  `order_number` varchar(50) DEFAULT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `order_status` varchar(20) DEFAULT NULL,
  `order_date` datetime DEFAULT NULL,
  `company_id` varchar(50) NOT NULL,
  `company_name` varchar(200) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `settlement_status` varchar(20) DEFAULT 'unsettled',
  `settlement_amount` decimal(10,2) DEFAULT 0.00,
  `settlement_date` date DEFAULT NULL,
  `settlement_batch` varchar(50) DEFAULT NULL,
  `invalid_reason` varchar(500) DEFAULT NULL,
  `supplement_order_id` varchar(50) DEFAULT NULL,
  `export_date` date DEFAULT NULL,
  `export_batch` varchar(50) DEFAULT NULL,
  `remark` text,
  `operator_id` varchar(50) DEFAULT NULL,
  `operator_name` varchar(50) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_by_name` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_status` (`status`),
  KEY `idx_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='增值订单表';

-- 步骤4: 创建状态配置表
CREATE TABLE IF NOT EXISTS `value_added_status_configs` (
  `id` varchar(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `value` varchar(100) NOT NULL,
  `label` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_value` (`type`,`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='状态配置表';

-- 步骤5: 插入默认费用配置（如果不存在）
INSERT INTO `value_added_price_config` 
(`id`, `config_name`, `unit_price`, `status`, `remark`, `created_by_name`, `created_at`, `updated_at`) 
SELECT 'default-config-001', '默认费用配置', 900.00, 'active', '系统默认配置', '系统', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_price_config` WHERE `id` = 'default-config-001');

-- 步骤6: 插入有效状态配置（如果不存在）
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `created_at`) 
SELECT 'vs-pending-001', 'validStatus', 'pending', '待处理', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_status_configs` WHERE `id` = 'vs-pending-001');

INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `created_at`) 
SELECT 'vs-valid-001', 'validStatus', 'valid', '有效', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_status_configs` WHERE `id` = 'vs-valid-001');

INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `created_at`) 
SELECT 'vs-invalid-001', 'validStatus', 'invalid', '无效', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_status_configs` WHERE `id` = 'vs-invalid-001');

INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `created_at`) 
SELECT 'vs-supplemented-001', 'validStatus', 'supplemented', '已补单', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_status_configs` WHERE `id` = 'vs-supplemented-001');

-- 步骤7: 插入结算状态配置（如果不存在）
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `created_at`) 
SELECT 'ss-unsettled-001', 'settlementStatus', 'unsettled', '未结算', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_status_configs` WHERE `id` = 'ss-unsettled-001');

INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `created_at`) 
SELECT 'ss-settled-001', 'settlementStatus', 'settled', '已结算', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `value_added_status_configs` WHERE `id` = 'ss-settled-001');

-- 步骤8: 验证表创建和数据插入
SELECT '外包公司表' as 表名, COUNT(*) as 记录数 FROM outsource_companies
UNION ALL
SELECT '费用配置表', COUNT(*) FROM value_added_price_config
UNION ALL
SELECT '增值订单表', COUNT(*) FROM value_added_orders
UNION ALL
SELECT '状态配置表', COUNT(*) FROM value_added_status_configs;
