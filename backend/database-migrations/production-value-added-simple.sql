-- ============================================
-- 生产环境 - 增值管理系统数据库迁移脚本（简化版）
-- 执行时间: 2026-03-01
-- 数据库: abc789_cn
-- 说明: 在宝塔phpMyAdmin中逐步执行
-- ============================================

-- 步骤1: 选择数据库
USE abc789_cn;

-- 步骤2: 创建外包公司表
CREATE TABLE IF NOT EXISTS `outsource_companies` (
  `id` VARCHAR(50) NOT NULL COMMENT '公司ID',
  `company_name` VARCHAR(200) NOT NULL COMMENT '公司名称',
  `contact_person` VARCHAR(50) NULL COMMENT '联系人',
  `contact_phone` VARCHAR(20) NULL COMMENT '联系电话',
  `contact_email` VARCHAR(100) NULL COMMENT '联系邮箱',
  `address` VARCHAR(500) NULL COMMENT '公司地址',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `default_unit_price` DECIMAL(10, 2) DEFAULT 0 COMMENT '默认单价',
  `total_orders` INT DEFAULT 0 COMMENT '总订单数',
  `valid_orders` INT DEFAULT 0 COMMENT '有效订单数',
  `invalid_orders` INT DEFAULT 0 COMMENT '无效订单数',
  `total_amount` DECIMAL(12,2) DEFAULT 0 COMMENT '总金额',
  `settled_amount` DECIMAL(12,2) DEFAULT 0 COMMENT '已结算金额',
  `remark` TEXT NULL COMMENT '备注',
  `created_by` VARCHAR(50) NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) NULL COMMENT '创建人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外包公司表';

-- 步骤3: 创建增值费用配置表
CREATE TABLE IF NOT EXISTS `value_added_price_config` (
  `id` VARCHAR(50) NOT NULL COMMENT '配置ID',
  `config_name` VARCHAR(100) NOT NULL COMMENT '配置名称',
  `company_id` VARCHAR(50) NULL COMMENT '外包公司ID',
  `company_name` VARCHAR(200) NULL COMMENT '外包公司名称',
  `unit_price` DECIMAL(10,2) NOT NULL COMMENT '单价',
  `start_date` DATE NULL COMMENT '生效开始日期',
  `end_date` DATE NULL COMMENT '生效结束日期',
  `conditions` JSON NULL COMMENT '适用条件',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `remark` TEXT NULL COMMENT '备注说明',
  `created_by` VARCHAR(50) NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) NULL COMMENT '创建人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_status` (`status`),
  KEY `idx_date_range` (`start_date`, `end_date`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值费用配置表';

-- 步骤4: 创建增值订单表
CREATE TABLE IF NOT EXISTS `value_added_orders` (
  `id` VARCHAR(50) NOT NULL COMMENT '记录ID',
  `order_id` VARCHAR(50) NULL COMMENT '关联订单ID',
  `order_number` VARCHAR(50) NULL COMMENT '订单号',
  `customer_id` VARCHAR(50) NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) NULL COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) NULL COMMENT '客户电话',
  `tracking_number` VARCHAR(100) NULL COMMENT '物流单号',
  `order_status` VARCHAR(20) NULL COMMENT '订单状态',
  `order_date` DATETIME NULL COMMENT '下单日期',
  `company_id` VARCHAR(50) NOT NULL COMMENT '外包公司ID',
  `company_name` VARCHAR(200) NOT NULL COMMENT '外包公司名称',
  `unit_price` DECIMAL(10,2) NOT NULL COMMENT '单价',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
  `settlement_status` VARCHAR(20) DEFAULT 'unsettled' COMMENT '结算状态',
  `settlement_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '实际结算金额',
  `settlement_date` DATE NULL COMMENT '结算日期',
  `settlement_batch` VARCHAR(50) NULL COMMENT '结算批次号',
  `invalid_reason` VARCHAR(500) NULL COMMENT '无效原因',
  `supplement_order_id` VARCHAR(50) NULL COMMENT '补单关联ID',
  `export_date` DATE NULL COMMENT '导出日期',
  `export_batch` VARCHAR(50) NULL COMMENT '导出批次号',
  `remark` TEXT NULL COMMENT '备注',
  `operator_id` VARCHAR(50) NULL COMMENT '操作员ID',
  `operator_name` VARCHAR(50) NULL COMMENT '操作员姓名',
  `created_by` VARCHAR(50) NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) NULL COMMENT '创建人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_customer_phone` (`customer_phone`),
  KEY `idx_tracking_number` (`tracking_number`),
  KEY `idx_order_status` (`order_status`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_status` (`status`),
  KEY `idx_settlement_status` (`settlement_status`),
  KEY `idx_export_date` (`export_date`),
  KEY `idx_settlement_date` (`settlement_date`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值订单表';

-- 步骤5: 创建增值管理状态配置表
CREATE TABLE IF NOT EXISTS `value_added_status_configs` (
  `id` VARCHAR(36) NOT NULL COMMENT '配置ID',
  `type` VARCHAR(50) NOT NULL COMMENT '配置类型',
  `value` VARCHAR(100) NOT NULL COMMENT '状态值',
  `label` VARCHAR(100) NOT NULL COMMENT '状态标签',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_value` (`type`, `value`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理状态配置表';

-- 步骤6: 插入默认费用配置
INSERT IGNORE INTO `value_added_price_config` 
(`id`, `config_name`, `company_id`, `company_name`, `unit_price`, `status`, `remark`, `created_by_name`) 
VALUES
('default-config-001', '默认费用配置', NULL, NULL, 900.00, 'active', '系统默认费用配置，单价900元/单', '系统');

-- 步骤7: 插入默认有效状态配置
INSERT IGNORE INTO `value_added_status_configs` (`id`, `type`, `value`, `label`) VALUES
('vs-pending-001', 'validStatus', 'pending', '待处理'),
('vs-valid-001', 'validStatus', 'valid', '有效'),
('vs-invalid-001', 'validStatus', 'invalid', '无效'),
('vs-supplemented-001', 'validStatus', 'supplemented', '已补单');

-- 步骤8: 插入默认结算状态配置
INSERT IGNORE INTO `value_added_status_configs` (`id`, `type`, `value`, `label`) VALUES
('ss-unsettled-001', 'settlementStatus', 'unsettled', '未结算'),
('ss-settled-001', 'settlementStatus', 'settled', '已结算');

-- 步骤9: 验证表创建
SELECT 
  '外包公司表' AS table_name, 
  COUNT(*) AS record_count 
FROM outsource_companies
UNION ALL
SELECT '费用配置表', COUNT(*) FROM value_added_price_config
UNION ALL
SELECT '增值订单表', COUNT(*) FROM value_added_orders
UNION ALL
SELECT '状态配置表', COUNT(*) FROM value_added_status_configs;

-- ============================================
-- 执行完成！
-- 如果看到上面的验证结果，说明表已成功创建
-- ============================================
