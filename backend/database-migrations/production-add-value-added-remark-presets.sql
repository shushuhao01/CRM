-- =============================================
-- 生产环境：增值管理备注预设功能
-- 创建时间：2026-03-01
-- 执行环境：宝塔面板 - phpMyAdmin
-- 数据库：crm_production
-- =============================================

-- 【重要提示】
-- 1. 请在宝塔面板的phpMyAdmin中执行
-- 2. 选择 crm_production 数据库
-- 3. 分段执行，每段执行后检查结果
-- 4. 执行前请备份数据库

-- =============================================
-- 第一段：创建备注预设表
-- =============================================
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

-- 执行后检查：应该显示 "Query OK, 0 rows affected"

-- =============================================
-- 第二段：添加备注字段
-- =============================================
ALTER TABLE `value_added_orders` 
ADD COLUMN `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注信息' AFTER `settlement_date`;

-- 执行后检查：应该显示 "Query OK, 0 rows affected"

-- =============================================
-- 第三段：插入无效原因预设（分批插入）
-- =============================================
-- 第一批（5条）
INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`) VALUES
(REPLACE(UUID(), '-', ''), '客户拒收', 'invalid', 1, 1),
(REPLACE(UUID(), '-', ''), '地址错误无法送达', 'invalid', 2, 1),
(REPLACE(UUID(), '-', ''), '客户电话无法接通', 'invalid', 3, 1),
(REPLACE(UUID(), '-', ''), '客户取消订单', 'invalid', 4, 1),
(REPLACE(UUID(), '-', ''), '商品质量问题', 'invalid', 5, 1);

-- 执行后检查：应该显示 "5 rows inserted"

-- 第二批（5条）
INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`) VALUES
(REPLACE(UUID(), '-', ''), '发货错误', 'invalid', 6, 1),
(REPLACE(UUID(), '-', ''), '物流丢失', 'invalid', 7, 1),
(REPLACE(UUID(), '-', ''), '超时未签收', 'invalid', 8, 1),
(REPLACE(UUID(), '-', ''), '客户信息不符', 'invalid', 9, 1),
(REPLACE(UUID(), '-', ''), '其他原因', 'invalid', 10, 1);

-- 执行后检查：应该显示 "5 rows inserted"

-- =============================================
-- 第四段：插入通用备注预设
-- =============================================
INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`) VALUES
(REPLACE(UUID(), '-', ''), '正常处理', 'general', 1, 1),
(REPLACE(UUID(), '-', ''), '需要跟进', 'general', 2, 1),
(REPLACE(UUID(), '-', ''), '已联系客户', 'general', 3, 1),
(REPLACE(UUID(), '-', ''), '待确认', 'general', 4, 1),
(REPLACE(UUID(), '-', ''), '优先处理', 'general', 5, 1);

-- 执行后检查：应该显示 "5 rows inserted"

-- =============================================
-- 第五段：验证数据
-- =============================================
-- 检查表是否创建成功
SHOW TABLES LIKE 'value_added_remark_presets';

-- 检查字段是否添加成功
SHOW COLUMNS FROM value_added_orders LIKE 'remark';

-- 检查预设数据
SELECT category, COUNT(*) as count FROM value_added_remark_presets GROUP BY category;

-- 查看所有预设
SELECT id, remark_text, category, sort_order, is_active FROM value_added_remark_presets ORDER BY category, sort_order;

-- =============================================
-- 执行完成提示
-- =============================================
-- 如果所有步骤都成功执行，应该看到：
-- 1. value_added_remark_presets 表已创建
-- 2. value_added_orders 表新增 remark 字段
-- 3. 共插入 15 条预设数据（10条无效原因 + 5条通用备注）
