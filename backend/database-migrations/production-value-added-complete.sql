-- =============================================
-- 生产环境：增值管理系统完整迁移SQL
-- 创建时间：2026-03-02
-- 执行环境：宝塔面板 - phpMyAdmin
-- 数据库：crm_production
-- =============================================

-- 【重要提示】
-- 1. 请在宝塔面板的phpMyAdmin中执行
-- 2. 选择 crm_production 数据库
-- 3. 本SQL会自动跳过已存在的表和字段
-- 4. 执行前请备份数据库
-- 5. 可以一次性全部执行

-- =============================================
-- 第一部分：状态配置表和数据
-- =============================================

-- 创建状态配置表（如果不存在）
CREATE TABLE IF NOT EXISTS `value_added_status_configs` (
  `id` VARCHAR(50) NOT NULL COMMENT '配置ID',
  `type` VARCHAR(50) NOT NULL COMMENT '配置类型：validStatus-有效状态，settlementStatus-结算状态',
  `value` VARCHAR(50) NOT NULL COMMENT '状态值（英文）',
  `label` VARCHAR(100) NOT NULL COMMENT '状态标签（中文）',
  `sort_order` INT DEFAULT 0 COMMENT '排序顺序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_value` (`type`, `value`),
  KEY `idx_type` (`type`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理状态配置表';

-- 删除错误的中文value配置
DELETE FROM `value_added_status_configs` 
WHERE `type` = 'validStatus' AND `value` IN ('待处理', '有效', '无效', '已补单');

DELETE FROM `value_added_status_configs` 
WHERE `type` = 'settlementStatus' AND `value` IN ('待处理', '已结算', '未结算');

-- 插入正确的状态配置
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `sort_order`, `created_at`) VALUES
('vs-pending-001', 'validStatus', 'pending', '待处理', 1, NOW()),
('vs-valid-001', 'validStatus', 'valid', '有效', 2, NOW()),
('vs-invalid-001', 'validStatus', 'invalid', '无效', 3, NOW()),
('vs-supplemented-001', 'validStatus', 'supplemented', '已补单', 4, NOW()),
('ss-unsettled-001', 'settlementStatus', 'unsettled', '未结算', 1, NOW()),
('ss-settled-001', 'settlementStatus', 'settled', '已结算', 2, NOW())
ON DUPLICATE KEY UPDATE 
  `label` = VALUES(`label`),
  `sort_order` = VALUES(`sort_order`);

-- =============================================
-- 第二部分：外包公司表字段
-- =============================================

-- 添加排序字段（如果不存在）
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'outsource_companies' 
  AND COLUMN_NAME = 'sort_order'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `outsource_companies` ADD COLUMN `sort_order` INT DEFAULT 999 COMMENT ''排序顺序，数字越小越靠前'' AFTER `status`',
  'SELECT ''sort_order字段已存在'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加是否默认字段（如果不存在）
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'outsource_companies' 
  AND COLUMN_NAME = 'is_default'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `outsource_companies` ADD COLUMN `is_default` TINYINT(1) DEFAULT 0 COMMENT ''是否默认公司（0-否，1-是）'' AFTER `sort_order`',
  'SELECT ''is_default字段已存在'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS `idx_sort_order` ON `outsource_companies`(`sort_order`);
CREATE INDEX IF NOT EXISTS `idx_is_default` ON `outsource_companies`(`is_default`);

-- =============================================
-- 第三部分：价格档位系统
-- =============================================

-- 创建价格配置表（如果不存在）
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

-- 为现有公司创建默认档位（如果default_unit_price字段存在）
INSERT INTO `value_added_price_config` (
  `id`, `company_id`, `tier_name`, `tier_order`, `pricing_type`, 
  `unit_price`, `start_date`, `is_active`, `created_at`, `created_by_name`
)
SELECT 
  CONCAT('tier-', `id`, '-001') as id,
  `id` as company_id,
  '第一档' as tier_name,
  1 as tier_order,
  'fixed' as pricing_type,
  COALESCE(`default_unit_price`, 0) as unit_price,
  '2024-01-01' as start_date,
  1 as is_active,
  NOW() as created_at,
  '系统迁移' as created_by_name
FROM `outsource_companies`
WHERE `id` IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'outsource_companies' 
    AND COLUMN_NAME = 'default_unit_price'
  )
  AND NOT EXISTS (
    SELECT 1 FROM `value_added_price_config` 
    WHERE `company_id` = `outsource_companies`.`id`
  );

-- 删除default_unit_price字段（如果存在）
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'outsource_companies' 
  AND COLUMN_NAME = 'default_unit_price'
);

SET @sql = IF(@col_exists > 0,
  'ALTER TABLE `outsource_companies` DROP COLUMN `default_unit_price`',
  'SELECT ''default_unit_price字段不存在'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- 第四部分：备注预设系统
-- =============================================

-- 创建备注预设表（如果不存在）
CREATE TABLE IF NOT EXISTS `value_added_remark_presets` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '主键ID',
  `remark_text` VARCHAR(500) NOT NULL COMMENT '备注内容',
  `category` ENUM('invalid', 'general') DEFAULT 'general' COMMENT '备注分类：invalid-无效原因，general-通用备注',
  `sort_order` INT DEFAULT 0 COMMENT '排序顺序',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用：1-启用，0-停用',
  `usage_count` INT DEFAULT 0 COMMENT '使用次数',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_category` (`category`),
  INDEX `idx_sort_order` (`sort_order`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理备注预设表';

-- 插入无效原因预设
INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`) VALUES
(REPLACE(UUID(), '-', ''), '客户拒收', 'invalid', 1, 1),
(REPLACE(UUID(), '-', ''), '地址错误无法送达', 'invalid', 2, 1),
(REPLACE(UUID(), '-', ''), '客户电话无法接通', 'invalid', 3, 1),
(REPLACE(UUID(), '-', ''), '客户取消订单', 'invalid', 4, 1),
(REPLACE(UUID(), '-', ''), '商品质量问题', 'invalid', 5, 1),
(REPLACE(UUID(), '-', ''), '发货错误', 'invalid', 6, 1),
(REPLACE(UUID(), '-', ''), '物流丢失', 'invalid', 7, 1),
(REPLACE(UUID(), '-', ''), '超时未签收', 'invalid', 8, 1),
(REPLACE(UUID(), '-', ''), '客户信息不符', 'invalid', 9, 1),
(REPLACE(UUID(), '-', ''), '其他原因', 'invalid', 10, 1)
ON DUPLICATE KEY UPDATE `remark_text` = VALUES(`remark_text`);

-- 插入通用备注预设
INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`) VALUES
(REPLACE(UUID(), '-', ''), '正常处理', 'general', 1, 1),
(REPLACE(UUID(), '-', ''), '需要跟进', 'general', 2, 1),
(REPLACE(UUID(), '-', ''), '已联系客户', 'general', 3, 1),
(REPLACE(UUID(), '-', ''), '待确认', 'general', 4, 1),
(REPLACE(UUID(), '-', ''), '优先处理', 'general', 5, 1)
ON DUPLICATE KEY UPDATE `remark_text` = VALUES(`remark_text`);

-- 为订单表添加备注字段（如果不存在）
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'value_added_orders' 
  AND COLUMN_NAME = 'remark'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `value_added_orders` ADD COLUMN `remark` VARCHAR(500) DEFAULT NULL COMMENT ''备注信息'' AFTER `settlement_date`',
  'SELECT ''remark字段已存在'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- 第五部分：权限配置
-- =============================================

-- 创建财务管理父级菜单（如果不存在）
INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `path`, `sort`, `status`, `parentId`)
SELECT '财务管理', 'finance', '财务管理模块', 'finance', 'menu', '/finance', 70, 'active', NULL
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance');

-- 获取财务管理ID（用于后续插入）
SET @finance_id = (SELECT `id` FROM `permissions` WHERE `code` = 'finance' LIMIT 1);

-- 添加增值管理菜单
INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `path`, `sort`, `status`, `parentId`)
SELECT '增值管理', 'finance.value_added', '增值管理菜单', 'finance', 'menu', '/finance/value-added-manage', 71, 'active', @finance_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.value_added');

-- 获取增值管理菜单ID
SET @value_added_id = (SELECT `id` FROM `permissions` WHERE `code` = 'finance.value_added' LIMIT 1);

-- 添加增值管理按钮权限
INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '查看增值订单', 'finance.value_added.view', '查看增值订单列表', 'finance', 'button', 711, 'active', @value_added_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.value_added.view');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '创建增值订单', 'finance.value_added.create', '创建新的增值订单', 'finance', 'button', 712, 'active', @value_added_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.value_added.create');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '编辑增值订单', 'finance.value_added.edit', '编辑增值订单信息', 'finance', 'button', 713, 'active', @value_added_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.value_added.edit');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '删除增值订单', 'finance.value_added.delete', '删除增值订单', 'finance', 'button', 714, 'active', @value_added_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.value_added.delete');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '批量操作订单', 'finance.value_added.batch', '批量处理增值订单', 'finance', 'button', 715, 'active', @value_added_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.value_added.batch');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '导出订单数据', 'finance.value_added.export', '导出增值订单数据', 'finance', 'button', 716, 'active', @value_added_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.value_added.export');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '管理外包公司', 'finance.value_added.company', '管理外包公司信息', 'finance', 'button', 717, 'active', @value_added_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.value_added.company');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '配置价格档位', 'finance.value_added.price_tier', '配置外包公司价格档位', 'finance', 'button', 718, 'active', @value_added_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.value_added.price_tier');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '配置状态选项', 'finance.value_added.status_config', '配置有效状态和结算状态选项', 'finance', 'button', 719, 'active', @value_added_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.value_added.status_config');

-- 添加结算报表菜单
INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `path`, `sort`, `status`, `parentId`)
SELECT '结算报表', 'finance.settlement_report', '结算报表菜单', 'finance', 'menu', '/finance/settlement-report', 72, 'active', @finance_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.settlement_report');

-- 获取结算报表菜单ID
SET @settlement_id = (SELECT `id` FROM `permissions` WHERE `code` = 'finance.settlement_report' LIMIT 1);

-- 添加结算报表按钮权限
INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '查看结算报表', 'finance.settlement_report.view', '查看结算报表数据', 'finance', 'button', 721, 'active', @settlement_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.settlement_report.view');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '导出报表数据', 'finance.settlement_report.export', '导出结算报表数据', 'finance', 'button', 722, 'active', @settlement_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.settlement_report.export');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '查看统计图表', 'finance.settlement_report.charts', '查看结算统计图表', 'finance', 'button', 723, 'active', @settlement_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.settlement_report.charts');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`)
SELECT '查看公司排名', 'finance.settlement_report.ranking', '查看公司结算排名', 'finance', 'button', 724, 'active', @settlement_id
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `code` = 'finance.settlement_report.ranking');

-- =============================================
-- 验证结果
-- =============================================

SELECT '=== 状态配置 ===' as info;
SELECT `type`, `value`, `label`, `sort_order` FROM `value_added_status_configs` ORDER BY `type`, `sort_order`;

SELECT '=== 外包公司字段 ===' as info;
SHOW COLUMNS FROM `outsource_companies` WHERE `Field` IN ('sort_order', 'is_default');

SELECT '=== 价格档位统计 ===' as info;
SELECT COUNT(*) as total_tiers FROM `value_added_price_config`;

SELECT '=== 备注预设统计 ===' as info;
SELECT `category`, COUNT(*) as count FROM `value_added_remark_presets` GROUP BY `category`;

SELECT '=== 订单表备注字段 ===' as info;
SHOW COLUMNS FROM `value_added_orders` WHERE `Field` = 'remark';

SELECT '=== 权限统计 ===' as info;
SELECT COUNT(*) as count FROM `permissions` WHERE `code` LIKE 'finance.value_added%' OR `code` LIKE 'finance.settlement_report%';

-- =============================================
-- 执行完成
-- =============================================
-- 如果所有验证都通过，说明迁移成功！
-- 执行后需要：
-- 1. 清除用户权限缓存
-- 2. 重新登录系统
-- 3. 检查增值管理和结算报表功能是否正常
-- =============================================
