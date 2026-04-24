-- =============================================
-- 生产环境迁移脚本（phpMyAdmin简化版）
-- 日期：2026-04-08
-- 说明：
--   适用于 phpMyAdmin / 宝塔面板 直接执行
--   每条语句独立，逐条粘贴执行即可
--   已有的字段/表/索引会自动跳过（不报错）
-- =============================================

SET NAMES utf8mb4;

-- ======== 第1步：给 orders 表加字段（已有则忽略） ========

-- 如果字段已存在，执行会报 Duplicate column 错误，忽略即可
-- 可以先用 DESCRIBE orders; 查看现有字段

ALTER TABLE `orders` ADD COLUMN `express_company` VARCHAR(50) NULL COMMENT '快递公司代码';
ALTER TABLE `orders` ADD COLUMN `tracking_number` VARCHAR(100) NULL COMMENT '快递单号';
ALTER TABLE `orders` ADD COLUMN `shipping_time` VARCHAR(50) NULL COMMENT '发货时间字符串';
ALTER TABLE `orders` ADD COLUMN `expected_delivery_date` VARCHAR(20) NULL COMMENT '预计送达日期';
ALTER TABLE `orders` ADD COLUMN `shipped_at` TIMESTAMP NULL COMMENT '发货时间';
ALTER TABLE `orders` ADD COLUMN `delivered_at` TIMESTAMP NULL COMMENT '签收时间';
ALTER TABLE `orders` ADD COLUMN `logistics_status` VARCHAR(50) NULL COMMENT '物流状态';
ALTER TABLE `orders` ADD COLUMN `latest_logistics_info` VARCHAR(500) NULL COMMENT '最新物流动态';
ALTER TABLE `orders` ADD COLUMN `status_updated_at` TIMESTAMP NULL COMMENT '状态更新时间';

-- ======== 第2步：加索引（已有则忽略） ========

ALTER TABLE `orders` ADD INDEX `idx_tracking_number` (`tracking_number`);
ALTER TABLE `orders` ADD INDEX `idx_logistics_status` (`logistics_status`);
ALTER TABLE `orders` ADD INDEX `idx_shipped_at` (`shipped_at`);

-- ======== 第3步：建物流表（已有则跳过） ========

CREATE TABLE IF NOT EXISTS `logistics` (
  `id` VARCHAR(50) PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `order_id` VARCHAR(50) NOT NULL,
  `order_number` VARCHAR(50),
  `tracking_number` VARCHAR(100),
  `company` VARCHAR(100),
  `company_code` VARCHAR(50),
  `status` VARCHAR(50),
  `current_location` VARCHAR(200),
  `tracking_info` JSON,
  `shipped_at` TIMESTAMP NULL,
  `delivered_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_order` (`order_id`),
  INDEX `idx_tracking_number` (`tracking_number`),
  INDEX `idx_status` (`status`),
  INDEX `idx_logistics_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======== 第4步：建物流公司表（已有则跳过） ========

CREATE TABLE IF NOT EXISTS `logistics_companies` (
  `id` VARCHAR(50) PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `logo` VARCHAR(255) NULL,
  `website` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `status` ENUM('active','inactive') DEFAULT 'active',
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======== 第5步：初始化默认物流公司 ========

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

-- ✅ 完成！已有字段报 Duplicate 错误属于正常，不影响

