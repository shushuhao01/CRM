-- =============================================
-- 生产环境：增值管理系统迁移SQL（超简化版）
-- 每一段单独复制执行，不要一次性全部执行
-- =============================================

-- ========== 第1步：创建状态配置表 ==========
CREATE TABLE IF NOT EXISTS `value_added_status_configs` (
  `id` VARCHAR(50) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `value` VARCHAR(50) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `sort_order` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_value` (`type`, `value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ========== 第2步：插入状态配置数据（6条，逐条执行） ==========
-- 执行第1条
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `sort_order`) 
VALUES ('vs-pending-001', 'validStatus', 'pending', '待处理', 1);

-- 执行第2条
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `sort_order`) 
VALUES ('vs-valid-001', 'validStatus', 'valid', '有效', 2);

-- 执行第3条
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `sort_order`) 
VALUES ('vs-invalid-001', 'validStatus', 'invalid', '无效', 3);

-- 执行第4条
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `sort_order`) 
VALUES ('vs-supplemented-001', 'validStatus', 'supplemented', '已补单', 4);

-- 执行第5条
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `sort_order`) 
VALUES ('ss-unsettled-001', 'settlementStatus', 'unsettled', '未结算', 1);

-- 执行第6条
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `sort_order`) 
VALUES ('ss-settled-001', 'settlementStatus', 'settled', '已结算', 2);


-- ========== 第3步：验证状态配置 ==========
SELECT * FROM `value_added_status_configs` ORDER BY `type`, `sort_order`;


-- ========== 第4步：为外包公司表添加字段（如果报错说明已存在，跳过即可） ==========
ALTER TABLE `outsource_companies` ADD COLUMN `sort_order` INT DEFAULT 999 AFTER `status`;
ALTER TABLE `outsource_companies` ADD COLUMN `is_default` TINYINT(1) DEFAULT 0 AFTER `sort_order`;


-- ========== 第5步：创建价格配置表 ==========
CREATE TABLE IF NOT EXISTS `value_added_price_config` (
  `id` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `tier_name` VARCHAR(100) NOT NULL,
  `tier_order` INT NOT NULL DEFAULT 1,
  `pricing_type` VARCHAR(20) NOT NULL DEFAULT 'fixed',
  `unit_price` DECIMAL(10,2) DEFAULT 0.00,
  `percentage_rate` DECIMAL(5,2) DEFAULT 0.00,
  `base_amount_field` VARCHAR(50) DEFAULT 'orderAmount',
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `priority` INT DEFAULT 0,
  `condition_rules` TEXT,
  `remark` TEXT,
  `created_by` VARCHAR(50),
  `created_by_name` VARCHAR(100),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ========== 第6步：创建备注预设表 ==========
CREATE TABLE IF NOT EXISTS `value_added_remark_presets` (
  `id` VARCHAR(36) NOT NULL,
  `remark_text` VARCHAR(500) NOT NULL,
  `category` ENUM('invalid', 'general') DEFAULT 'general',
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `usage_count` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ========== 第7步：插入备注预设数据 - 无效原因（10条） ==========
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '客户拒收', 'invalid', 1, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '地址错误无法送达', 'invalid', 2, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '客户电话无法接通', 'invalid', 3, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '客户取消订单', 'invalid', 4, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '商品质量问题', 'invalid', 5, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '发货错误', 'invalid', 6, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '物流丢失', 'invalid', 7, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '超时未签收', 'invalid', 8, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '客户信息不符', 'invalid', 9, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '其他原因', 'invalid', 10, 1, 0, NOW(), NOW());


-- ========== 第8步：插入备注预设数据 - 通用备注（5条） ==========
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '正常处理', 'general', 1, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '需要跟进', 'general', 2, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '已联系客户', 'general', 3, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '待确认', 'general', 4, 1, 0, NOW(), NOW());
INSERT INTO `value_added_remark_presets` VALUES (UUID(), '优先处理', 'general', 5, 1, 0, NOW(), NOW());


-- ========== 第9步：验证备注预设 ==========
SELECT `category`, COUNT(*) as count FROM `value_added_remark_presets` GROUP BY `category`;


-- ========== 第10步：为订单表添加备注字段（如果报错说明已存在，跳过即可） ==========
ALTER TABLE `value_added_orders` ADD COLUMN `remark` VARCHAR(500) DEFAULT NULL AFTER `settlement_date`;


-- ========== 第11步：添加财务管理菜单（如果报错说明已存在，跳过即可） ==========
INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `path`, `sort`, `status`) 
VALUES ('财务管理', 'finance', '财务管理模块', 'finance', 'menu', '/finance', 70, 'active');


-- ========== 第12步：添加增值管理菜单 ==========
-- 先查询财务管理的ID
SELECT id FROM `permissions` WHERE `code` = 'finance';

-- 假设上面查询到的ID是 123，替换下面的 '替换为财务管理ID'
INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `path`, `sort`, `status`, `parentId`) 
VALUES ('增值管理', 'finance.value_added', '增值管理菜单', 'finance', 'menu', '/finance/value-added-manage', 71, 'active', '替换为财务管理ID');


-- ========== 第13步：添加增值管理按钮权限 ==========
-- 先查询增值管理菜单的ID
SELECT id FROM `permissions` WHERE `code` = 'finance.value_added';

-- 假设上面查询到的ID是 456，替换下面所有的 '替换为增值管理ID'
INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('查看增值订单', 'finance.value_added.view', '查看增值订单列表', 'finance', 'button', 711, 'active', '替换为增值管理ID');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('创建增值订单', 'finance.value_added.create', '创建新的增值订单', 'finance', 'button', 712, 'active', '替换为增值管理ID');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('编辑增值订单', 'finance.value_added.edit', '编辑增值订单信息', 'finance', 'button', 713, 'active', '替换为增值管理ID');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('删除增值订单', 'finance.value_added.delete', '删除增值订单', 'finance', 'button', 714, 'active', '替换为增值管理ID');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('批量操作订单', 'finance.value_added.batch', '批量处理增值订单', 'finance', 'button', 715, 'active', '替换为增值管理ID');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('导出订单数据', 'finance.value_added.export', '导出增值订单数据', 'finance', 'button', 716, 'active', '替换为增值管理ID');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('管理外包公司', 'finance.value_added.company', '管理外包公司信息', 'finance', 'button', 717, 'active', '替换为增值管理ID');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('配置价格档位', 'finance.value_added.price_tier', '配置外包公司价格档位', 'finance', 'button', 718, 'active', '替换为增值管理ID');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('配置状态选项', 'finance.value_added.status_config', '配置有效状态和结算状态选项', 'finance', 'button', 719, 'active', '替换为增值管理ID');


-- ========== 第14步：添加结算报表菜单 ==========
-- 使用第12步查询到的财务管理ID，替换下面的 '替换为财务管理ID'
INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `path`, `sort`, `status`, `parentId`) 
VALUES ('结算报表', 'finance.settlement_report', '结算报表菜单', 'finance', 'menu', '/finance/settlement-report', 72, 'active', '替换为财务管理ID');


-- ========== 第15步：添加结算报表按钮权限 ==========
-- 先查询结算报表菜单的ID
SELECT id FROM `permissions` WHERE `code` = 'finance.settlement_report';

-- 假设上面查询到的ID是 789，替换下面所有的 '替换为结算报表ID'
INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('查看结算报表', 'finance.settlement_report.view', '查看结算报表数据', 'finance', 'button', 721, 'active', '替换为结算报表ID');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('导出报表数据', 'finance.settlement_report.export', '导出结算报表数据', 'finance', 'button', 722, 'active', '替换为结算报表ID');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('查看统计图表', 'finance.settlement_report.charts', '查看结算统计图表', 'finance', 'button', 723, 'active', '替换为结算报表ID');

INSERT INTO `permissions` (`name`, `code`, `description`, `module`, `type`, `sort`, `status`, `parentId`) 
VALUES ('查看公司排名', 'finance.settlement_report.ranking', '查看公司结算排名', 'finance', 'button', 724, 'active', '替换为结算报表ID');


-- ========== 第16步：最终验证 ==========
-- 验证状态配置
SELECT * FROM `value_added_status_configs`;

-- 验证备注预设
SELECT * FROM `value_added_remark_presets`;

-- 验证权限
SELECT * FROM `permissions` WHERE `code` LIKE 'finance%' ORDER BY `sort`;


-- =============================================
-- 执行完成！
-- 注意：执行后需要清除权限缓存，重新登录系统
-- =============================================
