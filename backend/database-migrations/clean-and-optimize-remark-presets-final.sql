-- =============================================
-- 清理并优化增值管理备注预设 (最终版本)
-- 适用于宝塔面板 phpMyAdmin
-- 不包含 is_system 字段（该字段可能不存在）
-- =============================================

-- 第1步：删除所有现有的备注预设
DELETE FROM `value_added_remark_presets`;

-- 第2步：插入优化后的8个备注预设
-- 每条语句独立执行，不依赖 is_system 字段

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `created_at`, `updated_at`) 
VALUES (UUID(), '七天未联系上', 'invalid', 1, 1, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `created_at`, `updated_at`) 
VALUES (UUID(), '重大疾病', 'invalid', 2, 1, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `created_at`, `updated_at`) 
VALUES (UUID(), '哺乳期孕期', 'invalid', 3, 1, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `created_at`, `updated_at`) 
VALUES (UUID(), '退货', 'invalid', 4, 1, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `created_at`, `updated_at`) 
VALUES (UUID(), '拒绝指导', 'invalid', 5, 1, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `created_at`, `updated_at`) 
VALUES (UUID(), '以后再用', 'invalid', 6, 1, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `created_at`, `updated_at`) 
VALUES (UUID(), '空号', 'invalid', 7, 1, NOW(), NOW());

INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `created_at`, `updated_at`) 
VALUES (UUID(), '其他原因', 'invalid', 8, 1, NOW(), NOW());

-- 第3步：验证结果
SELECT '=== 验证：应该有8条记录 ===' as info;
SELECT COUNT(*) as total FROM `value_added_remark_presets`;

SELECT '=== 查看所有备注预设 ===' as info;
SELECT `remark_text` as '备注内容', `category` as '分类', `sort_order` as '排序', `is_active` as '是否启用' 
FROM `value_added_remark_presets` 
ORDER BY `sort_order`;

-- =============================================
-- 执行完成！
-- 
-- 优化说明：
-- 1. 删除了所有重复的备注预设
-- 2. 只保留8个简洁实用的选项
-- 3. 所有备注都归类为 'invalid'（无效原因）
-- 4. 移除了 is_system 字段（该字段在生产环境可能不存在）
-- 
-- 新的备注列表：
-- 1. 七天未联系上
-- 2. 重大疾病
-- 3. 哺乳期孕期
-- 4. 退货
-- 5. 拒绝指导
-- 6. 以后再用
-- 7. 空号
-- 8. 其他原因
-- =============================================
