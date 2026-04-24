-- =============================================
-- 生产环境迁移脚本：确认发货功能（最简兼容版）
-- 日期：2026-04-08
-- 说明：
--   本脚本确保 orders 表具有发货确认所需的全部字段
--   所有语句使用 IF NOT EXISTS / 先检查再执行，安全重复执行
--   兼容 MySQL 5.7+ / 8.0+ / phpMyAdmin / 宝塔面板
-- =============================================

-- 设置字符集
SET NAMES utf8mb4;

-- =============================================
-- 1. 确保 orders 表存在必要字段
-- =============================================

-- 1.1 快递公司字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'express_company');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `orders` ADD COLUMN `express_company` VARCHAR(50) NULL COMMENT ''快递公司代码'' AFTER `shipping_name`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.2 快递单号字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'tracking_number');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `orders` ADD COLUMN `tracking_number` VARCHAR(100) NULL COMMENT ''快递单号'' AFTER `express_company`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.3 发货时间字符串
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'shipping_time');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `orders` ADD COLUMN `shipping_time` VARCHAR(50) NULL COMMENT ''发货时间字符串'' AFTER `tracking_number`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.4 预计送达日期
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'expected_delivery_date');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `orders` ADD COLUMN `expected_delivery_date` VARCHAR(20) NULL COMMENT ''预计送达日期'' AFTER `shipping_time`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.5 发货时间戳
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'shipped_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `orders` ADD COLUMN `shipped_at` TIMESTAMP NULL COMMENT ''发货时间'' AFTER `expected_delivery_date`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.6 物流状态
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'logistics_status');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `orders` ADD COLUMN `logistics_status` VARCHAR(50) NULL COMMENT ''物流状态'' AFTER `shipped_at`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.7 最新物流动态
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'latest_logistics_info');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `orders` ADD COLUMN `latest_logistics_info` VARCHAR(500) NULL COMMENT ''最新物流动态'' AFTER `logistics_status`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.8 签收时间
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'delivered_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `orders` ADD COLUMN `delivered_at` TIMESTAMP NULL COMMENT ''签收时间'' AFTER `latest_logistics_info`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.9 状态更新时间
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'status_updated_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `orders` ADD COLUMN `status_updated_at` TIMESTAMP NULL COMMENT ''状态更新时间'' AFTER `updated_at`',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================
-- 2. 确保必要的索引存在
-- =============================================

-- 2.1 tracking_number 索引
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_tracking_number');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `orders` ADD INDEX `idx_tracking_number` (`tracking_number`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.2 logistics_status 索引
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_logistics_status');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `orders` ADD INDEX `idx_logistics_status` (`logistics_status`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2.3 shipped_at 索引
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = 'idx_shipped_at');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `orders` ADD INDEX `idx_shipped_at` (`shipped_at`)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================
-- 3. 确保 logistics 表存在
-- =============================================
CREATE TABLE IF NOT EXISTS `logistics` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '物流ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) COMMENT '订单号',
  `tracking_number` VARCHAR(100) COMMENT '物流单号',
  `company` VARCHAR(100) COMMENT '物流公司',
  `company_code` VARCHAR(50) COMMENT '物流公司代码',
  `status` VARCHAR(50) COMMENT '物流状态',
  `current_location` VARCHAR(200) COMMENT '当前位置',
  `tracking_info` JSON COMMENT '跟踪信息',
  `shipped_at` TIMESTAMP NULL COMMENT '发货时间',
  `delivered_at` TIMESTAMP NULL COMMENT '签收时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_order` (`order_id`),
  INDEX `idx_tracking_number` (`tracking_number`),
  INDEX `idx_status` (`status`),
  INDEX `idx_logistics_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流表';

-- =============================================
-- 4. 确保 logistics_companies 表存在
-- =============================================
CREATE TABLE IF NOT EXISTS `logistics_companies` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '物流公司ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '物流公司名称',
  `code` VARCHAR(50) NOT NULL COMMENT '物流公司代码',
  `logo` VARCHAR(255) NULL COMMENT '公司LOGO',
  `website` VARCHAR(255) NULL COMMENT '官网',
  `phone` VARCHAR(50) NULL COMMENT '客服电话',
  `status` ENUM('active','inactive') DEFAULT 'active' COMMENT '状态',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流公司表';

-- =============================================
-- 5. 初始化默认物流公司（忽略已存在的）
-- =============================================
INSERT IGNORE INTO `logistics_companies` (`id`, `name`, `code`, `status`, `sort_order`) VALUES
('lc-sf',   '顺丰速运', 'SF',   'active', 1),
('lc-zto',  '中通快递', 'ZTO',  'active', 2),
('lc-yto',  '圆通速递', 'YTO',  'active', 3),
('lc-sto',  '申通快递', 'STO',  'active', 4),
('lc-yd',   '韵达速递', 'YD',   'active', 5),
('lc-jd',   '京东物流', 'JD',   'active', 6),
('lc-ems',  '中国邮政', 'EMS',  'active', 7),
('lc-jtsd', '极兔速递', 'JTSD', 'active', 8),
('lc-dbl',  '德邦快递', 'DBL',  'active', 9);

-- =============================================
-- 完成！
-- 本脚本可安全重复执行，不会破坏现有数据
-- =============================================
SELECT '✅ 迁移完成：确认发货功能所需字段和表已就绪' AS result;

