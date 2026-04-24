-- =============================================
-- 增值管理备注预设功能
-- 创建时间：2026-03-01
-- 说明：为增值管理添加备注预设表和字段
-- =============================================

-- 1. 创建备注预设表
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

-- 2. 为 value_added_orders 表添加备注字段
ALTER TABLE `value_added_orders` 
ADD COLUMN `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注信息' AFTER `settlement_date`;

-- 3. 插入默认的无效原因预设
INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`) VALUES
(UUID(), '客户拒收', 'invalid', 1, 1),
(UUID(), '地址错误无法送达', 'invalid', 2, 1),
(UUID(), '客户电话无法接通', 'invalid', 3, 1),
(UUID(), '客户取消订单', 'invalid', 4, 1),
(UUID(), '商品质量问题', 'invalid', 5, 1),
(UUID(), '发货错误', 'invalid', 6, 1),
(UUID(), '物流丢失', 'invalid', 7, 1),
(UUID(), '超时未签收', 'invalid', 8, 1),
(UUID(), '客户信息不符', 'invalid', 9, 1),
(UUID(), '其他原因', 'invalid', 10, 1);

-- 4. 插入默认的通用备注预设
INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`) VALUES
(UUID(), '正常处理', 'general', 1, 1),
(UUID(), '需要跟进', 'general', 2, 1),
(UUID(), '已联系客户', 'general', 3, 1),
(UUID(), '待确认', 'general', 4, 1),
(UUID(), '优先处理', 'general', 5, 1);

-- 验证
SELECT '备注预设表创建完成' AS status;
SELECT COUNT(*) AS preset_count FROM value_added_remark_presets;
SELECT '备注字段添加完成' AS status;
SHOW COLUMNS FROM value_added_orders LIKE 'remark';
