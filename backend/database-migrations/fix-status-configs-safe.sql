-- 安全修复状态配置（跳过已存在的字段）
-- 本地开发环境：crm_local

-- 1. 删除有效状态中value为中文的配置
DELETE FROM value_added_status_configs 
WHERE type = 'validStatus' 
AND value IN ('待处理', '有效', '无效', '已补单');

-- 2. 删除结算状态中value为中文的配置  
DELETE FROM value_added_status_configs 
WHERE type = 'settlementStatus' 
AND value IN ('待处理', '已结算', '未结算');

-- 3. 插入正确的状态配置（使用英文值和排序）
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
SELECT '=== 有效状态配置（按排序） ===' as info;
SELECT type, value, label, sort_order FROM value_added_status_configs WHERE type = 'validStatus' ORDER BY sort_order;

SELECT '=== 结算状态配置（按排序） ===' as info;
SELECT type, value, label, sort_order FROM value_added_status_configs WHERE type = 'settlementStatus' ORDER BY sort_order;
