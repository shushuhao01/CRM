-- ============================================
-- 宝塔兼容版 - 增值管理系统数据库迁移
-- 执行时间: 2026-03-01
-- 数据库: abc789_cn
-- ============================================

USE abc789_cn;

-- 表1: 外包公司表
DROP TABLE IF EXISTS `outsource_companies`;
CREATE TABLE `outsource_companies` (
  `id` varchar(50) NOT NULL,
  `company_name` varchar(200) NOT NULL,
  `contact_person` varchar(50) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `default_unit_price` decimal(10,2) DEFAULT '0.00',
  `total_orders` int(11) DEFAULT '0',
  `valid_orders` int(11) DEFAULT '0',
  `invalid_orders` int(11) DEFAULT '0',
  `total_amount` decimal(12,2) DEFAULT '0.00',
  `settled_amount` decimal(12,2) DEFAULT '0.00',
  `remark` text,
  `created_by` varchar(50) DEFAULT NULL,
  `created_by_name` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 表2: 增值费用配置表
DROP TABLE IF EXISTS `value_added_price_config`;
CREATE TABLE `value_added_price_config` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 表3: 增值订单表
DROP TABLE IF EXISTS `value_added_orders`;
CREATE TABLE `value_added_orders` (
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
  `settlement_amount` decimal(10,2) DEFAULT '0.00',
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
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 表4: 状态配置表
DROP TABLE IF EXISTS `value_added_status_configs`;
CREATE TABLE `value_added_status_configs` (
  `id` varchar(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `value` varchar(100) NOT NULL,
  `label` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_value` (`type`,`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入默认数据
INSERT INTO `value_added_price_config` VALUES 
('default-config-001', '默认费用配置', NULL, NULL, 900.00, NULL, NULL, NULL, 'active', '系统默认费用配置', NULL, '系统', NOW(), NOW());

INSERT INTO `value_added_status_configs` VALUES 
('vs-pending-001', 'validStatus', 'pending', '待处理', NOW()),
('vs-valid-001', 'validStatus', 'valid', '有效', NOW()),
('vs-invalid-001', 'validStatus', 'invalid', '无效', NOW()),
('vs-supplemented-001', 'validStatus', 'supplemented', '已补单', NOW()),
('ss-unsettled-001', 'settlementStatus', 'unsettled', '未结算', NOW()),
('ss-settled-001', 'settlementStatus', 'settled', '已结算', NOW());

-- 验证
SELECT '外包公司表' as 表名, COUNT(*) as 记录数 FROM outsource_companies
UNION ALL
SELECT '费用配置表', COUNT(*) FROM value_added_price_config
UNION ALL
SELECT '增值订单表', COUNT(*) FROM value_added_orders
UNION ALL
SELECT '状态配置表', COUNT(*) FROM value_added_status_configs;
