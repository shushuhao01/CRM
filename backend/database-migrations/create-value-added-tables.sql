-- ============================================
-- 增值管理系统数据库表结构
-- 创建时间: 2026-02-28
-- 说明: 用于管理外包订单数据、费用配置和外包公司信息
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. 外包公司表
-- ============================================
CREATE TABLE IF NOT EXISTS `outsource_companies` (
  `id` VARCHAR(50) NOT NULL COMMENT '公司ID',
  `company_name` VARCHAR(200) NOT NULL COMMENT '公司名称',
  `contact_person` VARCHAR(50) NULL COMMENT '联系人',
  `contact_phone` VARCHAR(20) NULL COMMENT '联系电话',
  `contact_email` VARCHAR(100) NULL COMMENT '联系邮箱',
  `address` VARCHAR(500) NULL COMMENT '公司地址',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-启用, inactive-停用',
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

-- ============================================
-- 2. 增值费用配置表
-- ============================================
CREATE TABLE IF NOT EXISTS `value_added_price_config` (
  `id` VARCHAR(50) NOT NULL COMMENT '配置ID',
  `config_name` VARCHAR(100) NOT NULL COMMENT '配置名称',
  `company_id` VARCHAR(50) NULL COMMENT '外包公司ID（NULL表示通用配置）',
  `company_name` VARCHAR(200) NULL COMMENT '外包公司名称',
  `unit_price` DECIMAL(10,2) NOT NULL COMMENT '单价（元/单）',
  `start_date` DATE NULL COMMENT '生效开始日期',
  `end_date` DATE NULL COMMENT '生效结束日期',
  `conditions` JSON NULL COMMENT '适用条件（JSON格式）',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-启用, inactive-停用',
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

-- ============================================
-- 3. 增值订单表
-- ============================================
CREATE TABLE IF NOT EXISTS `value_added_orders` (
  `id` VARCHAR(50) NOT NULL COMMENT '记录ID',
  `order_id` VARCHAR(50) NULL COMMENT '关联订单ID',
  `order_number` VARCHAR(50) NULL COMMENT '订单号',
  `customer_id` VARCHAR(50) NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) NULL COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) NULL COMMENT '客户电话',
  `tracking_number` VARCHAR(100) NULL COMMENT '物流单号',
  `company_id` VARCHAR(50) NOT NULL COMMENT '外包公司ID',
  `company_name` VARCHAR(200) NOT NULL COMMENT '外包公司名称',
  `unit_price` DECIMAL(10,2) NOT NULL COMMENT '单价（元）',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending-待处理, valid-有效, invalid-无效, supplemented-已补单',
  `settlement_status` VARCHAR(20) DEFAULT 'unsettled' COMMENT '结算状态: unsettled-未结算, settled-已结算',
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
  KEY `idx_order_number` (`order_number`),
  KEY `idx_customer_phone` (`customer_phone`),
  KEY `idx_tracking_number` (`tracking_number`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_status` (`status`),
  KEY `idx_settlement_status` (`settlement_status`),
  KEY `idx_export_date` (`export_date`),
  KEY `idx_settlement_date` (`settlement_date`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值订单表';

-- ============================================
-- 插入默认费用配置
-- ============================================
INSERT INTO `value_added_price_config` (`id`, `config_name`, `company_id`, `company_name`, `unit_price`, `status`, `remark`, `created_by_name`) VALUES
('default-config-001', '默认费用配置', NULL, NULL, 900.00, 'active', '系统默认费用配置，单价900元/单', '系统');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 初始化完成提示
-- ============================================
-- 增值管理系统表结构创建完成！
-- 已创建3张表：
--   1. outsource_companies - 外包公司表
--   2. value_added_price_config - 增值费用配置表
--   3. value_added_orders - 增值订单表
-- 已插入默认费用配置：900元/单
