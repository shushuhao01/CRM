-- =============================================
-- 清理并优化增值管理备注预设 (最简单版本)
-- 适用于宝塔面板 phpMyAdmin
-- 请逐条执行以下SQL语句
-- =============================================

-- 第1步：删除所有现有的备注预设
DELETE FROM `value_added_remark_presets`;

-- 第2步：插入优化后的备注预设
-- 请逐条复制执行以下8条INSERT语句

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `is_system`, `created_at`, `updated_at`) 
VALUES (UUID(), '七天未联系上', 'invalid', 1, 1, 0, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `is_system`, `created_at`, `updated_at`) 
VALUES (UUID(), '重大疾病', 'invalid', 2, 1, 0, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `is_system`, `created_at`, `updated_at`) 
VALUES (UUID(), '哺乳期孕期', 'invalid', 3, 1, 0, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `is_system`, `created_at`, `updated_at`) 
VALUES (UUID(), '退货', 'invalid', 4, 1, 0, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `is_system`, `created_at`, `updated_at`) 
VALUES (UUID(), '拒绝指导', 'invalid', 5, 1, 0, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `is_system`, `created_at`, `updated_at`) 
VALUES (UUID(), '以后再用', 'invalid', 6, 1, 0, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `is_system`, `created_at`, `updated_at`) 
VALUES (UUID(), '空号', 'invalid', 7, 1, 0, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `is_system`, `created_at`, `updated_at`) 
VALUES (UUID(), '其他原因', 'invalid', 8, 1, 0, NOW(), NOW());

-- 第3步：验证结果（应该返回8条记录）
SELECT COUNT(*) as total FROM `value_added_remark_presets`;

-- 第4步：查看详细内容
SELECT `remark_text`, `category`, `sort_order`, `is_active` 
FROM `value_added_remark_presets` 
ORDER BY `sort_order`;
