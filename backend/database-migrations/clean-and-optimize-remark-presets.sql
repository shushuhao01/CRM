-- =============================================
-- 清理并优化增值管理备注预设
-- 删除重复和冗余的备注，只保留简洁实用的选项
-- =============================================

-- 第1步：删除所有现有的备注预设
DELETE FROM `value_added_remark_presets`;

-- 第2步：插入优化后的备注预设（只保留8个简洁选项）
INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`, `is_system`) VALUES
(REPLACE(UUID(), '-', ''), '七天未联系上', 'invalid', 1, 1, 0),
(REPLACE(UUID(), '-', ''), '重大疾病', 'invalid', 2, 1, 0),
(REPLACE(UUID(), '-', ''), '哺乳期孕期', 'invalid', 3, 1, 0),
(REPLACE(UUID(), '-', ''), '退货', 'invalid', 4, 1, 0),
(REPLACE(UUID(), '-', ''), '拒绝指导', 'invalid', 5, 1, 0),
(REPLACE(UUID(), '-', ''), '以后再用', 'invalid', 6, 1, 0),
(REPLACE(UUID(), '-', ''), '空号', 'invalid', 7, 1, 0),
(REPLACE(UUID(), '-', ''), '其他原因', 'invalid', 8, 1, 0);

-- 第3步：验证结果
SELECT 
  remark_text AS '备注内容',
  category AS '分类',
  sort_order AS '排序',
  is_active AS '是否启用'
FROM `value_added_remark_presets`
ORDER BY sort_order;

-- =============================================
-- 执行完成！
-- 
-- 优化说明：
-- 1. 删除了所有重复的备注预设
-- 2. 只保留8个简洁实用的选项
-- 3. 所有备注都归类为 'invalid'（无效原因）
-- 4. 删除了冗余的 'general'（通用备注）分类
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
