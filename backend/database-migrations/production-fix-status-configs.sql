-- 生产环境：修复状态配置
-- 数据库：crm_production
-- 执行时间：2026-03-01
-- 说明：删除中文值配置，添加正确的英文值配置，并设置排序顺序

-- 1. 添加 sort_order 字段（如果不存在）
ALTER TABLE value_added_status_configs 
ADD COLUMN sort_order INT DEFAULT 999 COMMENT '排序顺序';

-- 添加索引
ALTER TABLE value_added_status_configs 
ADD KEY idx_sort_order (sort_order);

-- 2. 删除有效状态中value为中文的配置
DELETE FROM value_added_status_configs 
WHERE type = 'validStatus' 
AND value IN ('待处理', '有效', '无效', '已补单');

-- 3. 删除结算状态中value为中文的配置  
DELETE FROM value_added_status_configs 
WHERE type = 'settlementStatus' 
AND value IN ('待处理', '已结算', '未结算');

-- 4. 插入正确的状态配置（使用英文值和排序）
INSERT INTO value_added_status_configs (id, type, value, label, sort_order, created_at) VALUES
('vs-pending-001', 'validStatus', 'pending', '待处理', 1, NOW()),
('vs-valid-001', 'validStatus', 'valid', '有效', 2, NOW()),
('vs-invalid-001', 'validStatus', 'invalid', '无效', 3, NOW()),
('vs-supplemented-001', 'validStatus', 'supplemented', '已补单', 4, NOW()),
('ss-unsettled-001', 'settlementStatus', 'unsettled', '未结算', 1, NOW()),
('ss-settled-001', 'settlementStatus', 'settled', '已结算', 2, NOW())
ON DUPLICATE KEY UPDATE 
  label = VALUES(label),
  sort_order = VALUES(sort_order);

-- 验证结果
SELECT '=== 有效状态配置（按排序） ===' as '';
SELECT type, value, label, sort_order FROM value_added_status_configs WHERE type = 'validStatus' ORDER BY sort_order;

SELECT '=== 结算状态配置（按排序） ===' as '';
SELECT type, value, label, sort_order FROM value_added_status_configs WHERE type = 'settlementStatus' ORDER BY sort_order;
