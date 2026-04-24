-- =============================================
-- 生产环境增值管理修复SQL（宝塔兼容版）
-- 请按顺序逐条执行，每条执行成功后再执行下一条
-- =============================================

-- ========== 第1步：检查表是否存在 ==========
-- 执行后查看结果，确认哪些表已存在

SELECT 
  TABLE_NAME,
  TABLE_COMMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'value_added_orders',
    'outsource_companies',
    'value_added_price_config',
    'value_added_status_configs',
    'value_added_remark_presets'
  );

-- ========== 第2步：创建增值订单表（如果不存在） ==========

CREATE TABLE IF NOT EXISTS `value_added_orders` (
  `id` VARCHAR(50) NOT NULL,
  `order_id` VARCHAR(50) DEFAULT NULL,
  `order_number` VARCHAR(50) DEFAULT NULL,
  `customer_id` VARCHAR(50) DEFAULT NULL,
  `customer_name` VARCHAR(100) DEFAULT NULL,
  `customer_phone` VARCHAR(20) DEFAULT NULL,
  `tracking_number` VARCHAR(100) DEFAULT NULL,
  `express_company` VARCHAR(50) DEFAULT NULL,
  `order_status` VARCHAR(20) DEFAULT NULL,
  `order_date` DATETIME DEFAULT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `company_name` VARCHAR(200) NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `status` VARCHAR(20) DEFAULT 'pending',
  `settlement_status` VARCHAR(20) DEFAULT 'unsettled',
  `settlement_amount` DECIMAL(10,2) DEFAULT 0.00,
  `settlement_date` DATE DEFAULT NULL,
  `settlement_batch` VARCHAR(50) DEFAULT NULL,
  `invalid_reason` VARCHAR(500) DEFAULT NULL,
  `supplement_order_id` VARCHAR(50) DEFAULT NULL,
  `export_date` DATE DEFAULT NULL,
  `export_batch` VARCHAR(50) DEFAULT NULL,
  `remark` TEXT DEFAULT NULL,
  `operator_id` VARCHAR(50) DEFAULT NULL,
  `operator_name` VARCHAR(50) DEFAULT NULL,
  `created_by` VARCHAR(50) DEFAULT NULL,
  `created_by_name` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== 第3步：创建外包公司表（如果不存在） ==========

CREATE TABLE IF NOT EXISTS `outsource_companies` (
  `id` VARCHAR(50) NOT NULL,
  `company_name` VARCHAR(200) NOT NULL,
  `contact_person` VARCHAR(100) DEFAULT NULL,
  `contact_phone` VARCHAR(20) DEFAULT NULL,
  `contact_email` VARCHAR(100) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `sort_order` INT DEFAULT 999,
  `is_default` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `total_orders` INT DEFAULT 0,
  `valid_orders` INT DEFAULT 0,
  `invalid_orders` INT DEFAULT 0,
  `total_amount` DECIMAL(10,2) DEFAULT 0.00,
  `settled_amount` DECIMAL(10,2) DEFAULT 0.00,
  `created_by` VARCHAR(50) DEFAULT NULL,
  `created_by_name` VARCHAR(100) DEFAULT NULL,
  `remark` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== 第4步：创建价格档位表（如果不存在） ==========

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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== 第5步：创建状态配置表（如果不存在） ==========

CREATE TABLE IF NOT EXISTS `value_added_status_configs` (
  `id` VARCHAR(50) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `value` VARCHAR(50) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `color` VARCHAR(50) DEFAULT NULL,
  `sort_order` INT DEFAULT 0,
  `is_system` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_value` (`type`, `value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== 第6步：创建备注预设表（如果不存在） ==========

CREATE TABLE IF NOT EXISTS `value_added_remark_presets` (
  `id` VARCHAR(50) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `remark_text` VARCHAR(500) NOT NULL,
  `sort_order` INT DEFAULT 0,
  `usage_count` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========== 第7步：添加缺失字段到 value_added_orders ==========
-- 如果字段已存在会报错，可以忽略继续执行下一条

ALTER TABLE `value_added_orders` ADD COLUMN `express_company` VARCHAR(50) DEFAULT NULL AFTER `tracking_number`;
ALTER TABLE `value_added_orders` ADD COLUMN `order_status` VARCHAR(20) DEFAULT NULL AFTER `express_company`;
ALTER TABLE `value_added_orders` ADD COLUMN `order_date` DATETIME DEFAULT NULL AFTER `order_status`;

-- ========== 第8步：添加缺失字段到 outsource_companies ==========

ALTER TABLE `outsource_companies` ADD COLUMN `sort_order` INT DEFAULT 999 AFTER `status`;

-- ========== 第9步：创建索引（提升性能） ==========
-- 如果索引已存在会报错，可以忽略

CREATE INDEX `idx_order_number` ON `value_added_orders` (`order_number`);
CREATE INDEX `idx_company_id` ON `value_added_orders` (`company_id`);
CREATE INDEX `idx_status` ON `value_added_orders` (`status`);
CREATE INDEX `idx_order_id` ON `value_added_orders` (`order_id`);
CREATE INDEX `idx_order_date` ON `value_added_orders` (`order_date`);
CREATE INDEX `idx_status_date` ON `value_added_orders` (`status`, `order_date`);
CREATE INDEX `idx_company_date` ON `value_added_orders` (`company_id`, `order_date`);

CREATE INDEX `idx_company_id` ON `value_added_price_config` (`company_id`);
CREATE INDEX `idx_tier_order` ON `value_added_price_config` (`tier_order`);
CREATE INDEX `idx_is_active` ON `value_added_price_config` (`is_active`);

CREATE INDEX `idx_type` ON `value_added_status_configs` (`type`);
CREATE INDEX `idx_sort_order` ON `value_added_status_configs` (`sort_order`);

CREATE INDEX `idx_type` ON `value_added_remark_presets` (`type`);
CREATE INDEX `idx_sort_order` ON `value_added_remark_presets` (`sort_order`);

-- ========== 第10步：同步数据 ==========

UPDATE `value_added_orders` vo
INNER JOIN `orders` o ON BINARY vo.order_id = BINARY o.id
SET vo.express_company = o.express_company
WHERE vo.order_id IS NOT NULL 
  AND o.express_company IS NOT NULL
  AND o.express_company != ''
  AND (vo.express_company IS NULL OR vo.express_company = '');

UPDATE `value_added_orders` vo
INNER JOIN `orders` o ON BINARY vo.order_id = BINARY o.id
SET vo.order_status = o.status
WHERE vo.order_id IS NOT NULL 
  AND o.status IS NOT NULL
  AND (vo.order_status IS NULL OR vo.order_status = '');

UPDATE `value_added_orders` vo
INNER JOIN `orders` o ON BINARY vo.order_id = BINARY o.id
SET vo.order_date = o.created_at
WHERE vo.order_id IS NOT NULL 
  AND o.created_at IS NOT NULL
  AND vo.order_date IS NULL;

-- ========== 第11步：初始化状态配置 ==========

INSERT IGNORE INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `color`, `sort_order`, `is_system`, `is_active`) VALUES
('valid_status_pending', 'validStatus', 'pending', '待处理', 'warning', 1, 1, 1),
('valid_status_valid', 'validStatus', 'valid', '有效', 'success', 2, 1, 1),
('valid_status_invalid', 'validStatus', 'invalid', '无效', 'danger', 3, 1, 1),
('valid_status_supplemented', 'validStatus', 'supplemented', '已补单', 'info', 4, 1, 1),
('settlement_status_unsettled', 'settlementStatus', 'unsettled', '未结算', 'warning', 1, 1, 1),
('settlement_status_settled', 'settlementStatus', 'settled', '已结算', 'success', 2, 1, 1);

-- ========== 第12步：初始化备注预设 ==========

INSERT IGNORE INTO `value_added_remark_presets` (`id`, `type`, `remark_text`, `sort_order`, `is_active`) VALUES
('invalid_01', 'invalid', '客户拒收', 1, 1),
('invalid_02', 'invalid', '地址错误', 2, 1),
('invalid_03', 'invalid', '联系不上客户', 3, 1),
('invalid_04', 'invalid', '客户取消订单', 4, 1),
('invalid_05', 'invalid', '物流丢失', 5, 1),
('invalid_06', 'invalid', '商品损坏', 6, 1),
('invalid_07', 'invalid', '重复订单', 7, 1),
('invalid_08', 'invalid', '测试订单', 8, 1),
('general_01', 'general', '正常处理', 1, 1),
('general_02', 'general', '需要跟进', 2, 1),
('general_03', 'general', '客户已确认', 3, 1),
('general_04', 'general', '待补充资料', 4, 1);

-- ========== 第13步：验证结果 ==========

SELECT 
  TABLE_NAME,
  TABLE_ROWS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'value_added_orders',
    'outsource_companies',
    'value_added_price_config',
    'value_added_status_configs',
    'value_added_remark_presets'
  );

-- =============================================
-- 执行完成！
-- 下一步：重启后端服务，测试功能
-- =============================================
