-- =============================================
-- 生产环境增值管理系统完整修复SQL
-- 包含所有必需的表和字段
-- =============================================

-- ========================================
-- 第1部分：检查和创建基础表
-- ========================================

-- 1. 增值订单表
CREATE TABLE IF NOT EXISTS `value_added_orders` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '订单ID',
  `order_id` VARCHAR(50) DEFAULT NULL COMMENT '关联订单ID',
  `order_number` VARCHAR(50) DEFAULT NULL COMMENT '订单号',
  `customer_id` VARCHAR(50) DEFAULT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) DEFAULT NULL COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) DEFAULT NULL COMMENT '客户电话',
  `tracking_number` VARCHAR(100) DEFAULT NULL COMMENT '物流单号',
  `express_company` VARCHAR(50) DEFAULT NULL COMMENT '物流公司',
  `order_status` VARCHAR(20) DEFAULT NULL COMMENT '订单状态',
  `order_date` DATETIME DEFAULT NULL COMMENT '下单日期',
  `company_id` VARCHAR(50) NOT NULL COMMENT '外包公司ID',
  `company_name` VARCHAR(200) NOT NULL COMMENT '外包公司名称',
  `unit_price` DECIMAL(10,2) NOT NULL COMMENT '单价',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '有效状态：pending-待处理, valid-有效, invalid-无效, supplemented-已补单',
  `settlement_status` VARCHAR(20) DEFAULT 'unsettled' COMMENT '结算状态：unsettled-未结算, settled-已结算',
  `settlement_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '实际结算金额',
  `settlement_date` DATE DEFAULT NULL COMMENT '结算日期',
  `settlement_batch` VARCHAR(50) DEFAULT NULL COMMENT '结算批次号',
  `invalid_reason` VARCHAR(500) DEFAULT NULL COMMENT '无效原因',
  `supplement_order_id` VARCHAR(50) DEFAULT NULL COMMENT '补单关联ID',
  `export_date` DATE DEFAULT NULL COMMENT '导出日期',
  `export_batch` VARCHAR(50) DEFAULT NULL COMMENT '导出批次号',
  `remark` TEXT DEFAULT NULL COMMENT '备注信息',
  `operator_id` VARCHAR(50) DEFAULT NULL COMMENT '操作员ID',
  `operator_name` VARCHAR(50) DEFAULT NULL COMMENT '操作员姓名',
  `created_by` VARCHAR(50) DEFAULT NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) DEFAULT NULL COMMENT '创建人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_order_number` (`order_number`),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_order_date` (`order_date`),
  INDEX `idx_order_status` (`order_status`),
  INDEX `idx_customer_name` (`customer_name`),
  INDEX `idx_status_date` (`status`, `order_date`),
  INDEX `idx_settlement_date` (`settlement_status`, `order_date`),
  INDEX `idx_company_date` (`company_id`, `order_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理订单表';

-- 2. 外包公司表
CREATE TABLE IF NOT EXISTS `outsource_companies` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '公司ID',
  `company_name` VARCHAR(200) NOT NULL COMMENT '公司名称',
  `contact_person` VARCHAR(100) COMMENT '联系人',
  `contact_phone` VARCHAR(20) COMMENT '联系电话',
  `contact_email` VARCHAR(100) COMMENT '联系邮箱',
  `address` TEXT COMMENT '公司地址',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态：active-启用, inactive-停用',
  `sort_order` INT DEFAULT 999 COMMENT '排序顺序，数字越小越靠前',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认公司（0-否，1-是）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `total_orders` INT DEFAULT 0 COMMENT '总订单数',
  `valid_orders` INT DEFAULT 0 COMMENT '有效订单数',
  `invalid_orders` INT DEFAULT 0 COMMENT '无效订单数',
  `total_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '总金额',
  `settled_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '已结算金额',
  `created_by` VARCHAR(50) COMMENT '创建人ID',
  `created_by_name` VARCHAR(100) COMMENT '创建人姓名',
  `remark` TEXT COMMENT '备注',
  INDEX `idx_status` (`status`),
  INDEX `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外包公司表';

-- 3. 价格档位配置表
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
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_tier_order` (`tier_order`),
  KEY `idx_date_range` (`start_date`, `end_date`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外包公司价格配置表';

-- 4. 状态配置表
CREATE TABLE IF NOT EXISTS `value_added_status_configs` (
  `id` VARCHAR(50) NOT NULL COMMENT '配置ID',
  `type` VARCHAR(50) NOT NULL COMMENT '配置类型：validStatus-有效状态，settlementStatus-结算状态',
  `value` VARCHAR(50) NOT NULL COMMENT '状态值（英文）',
  `label` VARCHAR(100) NOT NULL COMMENT '显示标签（中文）',
  `color` VARCHAR(50) DEFAULT NULL COMMENT '颜色标识',
  `sort_order` INT DEFAULT 0 COMMENT '排序顺序',
  `is_system` TINYINT(1) DEFAULT 0 COMMENT '是否系统预设（0-否，1-是）',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用（0-否，1-是）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_value` (`type`, `value`),
  KEY `idx_type` (`type`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理状态配置表';

-- 5. 备注预设表
CREATE TABLE IF NOT EXISTS `value_added_remark_presets` (
  `id` VARCHAR(50) NOT NULL COMMENT '预设ID',
  `type` VARCHAR(50) NOT NULL COMMENT '预设类型：invalid-无效原因，general-通用备注',
  `remark_text` VARCHAR(500) NOT NULL COMMENT '备注文本',
  `sort_order` INT DEFAULT 0 COMMENT '排序顺序',
  `usage_count` INT DEFAULT 0 COMMENT '使用次数',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用（0-否，1-是）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_usage_count` (`usage_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理备注预设表';

-- ========================================
-- 第2部分：添加缺失字段（如果表已存在）
-- ========================================

-- 为 value_added_orders 添加 express_company 字段
SET @dbname = DATABASE();
SET @tablename = 'value_added_orders';
SET @columnname = 'express_company';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(50) NULL COMMENT ''物流公司'' AFTER tracking_number')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 为 value_added_orders 添加 order_status 字段
SET @columnname = 'order_status';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) NULL COMMENT ''订单状态'' AFTER express_company')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 为 value_added_orders 添加 order_date 字段
SET @columnname = 'order_date';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DATETIME NULL COMMENT ''下单日期'' AFTER order_status')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 为 outsource_companies 添加 sort_order 字段
SET @tablename = 'outsource_companies';
SET @columnname = 'sort_order';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT DEFAULT 999 COMMENT ''排序顺序，数字越小越靠前'' AFTER status')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ========================================
-- 第3部分：同步数据
-- ========================================

-- 从订单表同步物流公司数据
UPDATE `value_added_orders` vo
INNER JOIN `orders` o ON BINARY vo.order_id = BINARY o.id
SET vo.express_company = o.express_company
WHERE vo.order_id IS NOT NULL 
  AND o.express_company IS NOT NULL
  AND o.express_company != ''
  AND (vo.express_company IS NULL OR vo.express_company = '');

-- 从订单表同步订单状态
UPDATE `value_added_orders` vo
INNER JOIN `orders` o ON BINARY vo.order_id = BINARY o.id
SET vo.order_status = o.status
WHERE vo.order_id IS NOT NULL 
  AND o.status IS NOT NULL
  AND (vo.order_status IS NULL OR vo.order_status = '');

-- 从订单表同步下单日期
UPDATE `value_added_orders` vo
INNER JOIN `orders` o ON BINARY vo.order_id = BINARY o.id
SET vo.order_date = o.created_at
WHERE vo.order_id IS NOT NULL 
  AND o.created_at IS NOT NULL
  AND vo.order_date IS NULL;

-- ========================================
-- 第4部分：初始化状态配置数据
-- ========================================

-- 清空现有配置（如果需要重新初始化）
-- DELETE FROM `value_added_status_configs`;

-- 插入有效状态配置
INSERT IGNORE INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `color`, `sort_order`, `is_system`, `is_active`) VALUES
('valid_status_pending', 'validStatus', 'pending', '待处理', 'warning', 1, 1, 1),
('valid_status_valid', 'validStatus', 'valid', '有效', 'success', 2, 1, 1),
('valid_status_invalid', 'validStatus', 'invalid', '无效', 'danger', 3, 1, 1),
('valid_status_supplemented', 'validStatus', 'supplemented', '已补单', 'info', 4, 1, 1);

-- 插入结算状态配置
INSERT IGNORE INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `color`, `sort_order`, `is_system`, `is_active`) VALUES
('settlement_status_unsettled', 'settlementStatus', 'unsettled', '未结算', 'warning', 1, 1, 1),
('settlement_status_settled', 'settlementStatus', 'settled', '已结算', 'success', 2, 1, 1);

-- ========================================
-- 第5部分：初始化备注预设数据
-- ========================================

-- 插入无效原因预设
INSERT IGNORE INTO `value_added_remark_presets` (`id`, `type`, `remark_text`, `sort_order`, `is_active`) VALUES
('invalid_01', 'invalid', '客户拒收', 1, 1),
('invalid_02', 'invalid', '地址错误', 2, 1),
('invalid_03', 'invalid', '联系不上客户', 3, 1),
('invalid_04', 'invalid', '客户取消订单', 4, 1),
('invalid_05', 'invalid', '物流丢失', 5, 1),
('invalid_06', 'invalid', '商品损坏', 6, 1),
('invalid_07', 'invalid', '重复订单', 7, 1),
('invalid_08', 'invalid', '测试订单', 8, 1);

-- 插入通用备注预设
INSERT IGNORE INTO `value_added_remark_presets` (`id`, `type`, `remark_text`, `sort_order`, `is_active`) VALUES
('general_01', 'general', '正常处理', 1, 1),
('general_02', 'general', '需要跟进', 2, 1),
('general_03', 'general', '客户已确认', 3, 1),
('general_04', 'general', '待补充资料', 4, 1);

-- ========================================
-- 第6部分：创建性能优化索引
-- ========================================

-- 为 value_added_orders 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS `idx_order_number` ON `value_added_orders` (`order_number`);
CREATE INDEX IF NOT EXISTS `idx_company_id` ON `value_added_orders` (`company_id`);
CREATE INDEX IF NOT EXISTS `idx_status` ON `value_added_orders` (`status`);
CREATE INDEX IF NOT EXISTS `idx_order_id` ON `value_added_orders` (`order_id`);
CREATE INDEX IF NOT EXISTS `idx_order_date` ON `value_added_orders` (`order_date`);
CREATE INDEX IF NOT EXISTS `idx_order_status` ON `value_added_orders` (`order_status`);
CREATE INDEX IF NOT EXISTS `idx_customer_name` ON `value_added_orders` (`customer_name`);
CREATE INDEX IF NOT EXISTS `idx_status_date` ON `value_added_orders` (`status`, `order_date`);
CREATE INDEX IF NOT EXISTS `idx_settlement_date` ON `value_added_orders` (`settlement_status`, `order_date`);
CREATE INDEX IF NOT EXISTS `idx_company_date` ON `value_added_orders` (`company_id`, `order_date`);

-- ========================================
-- 验证SQL（可选）
-- ========================================

-- 查看表结构
SELECT 
  TABLE_NAME,
  TABLE_COMMENT,
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

-- 查看 value_added_orders 字段
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'value_added_orders'
ORDER BY ORDINAL_POSITION;

-- 查看 value_added_price_config 字段
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'value_added_price_config'
ORDER BY ORDINAL_POSITION;

-- =============================================
-- 执行完成！
-- 下一步：重启后端服务，测试功能
-- =============================================
