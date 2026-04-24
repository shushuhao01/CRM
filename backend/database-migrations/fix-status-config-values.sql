-- 修复状态配置值 - 删除中文值，使用英文值
-- 执行环境：生产环境 MySQL (crm_production)
-- 执行时间：2026-03-01

-- 1. 删除有效状态中value为中文的配置
DELETE FROM value_added_status_configs 
WHERE type = 'validStatus' 
AND value IN ('待处理', '有效', '无效', '已补单');

-- 2. 删除结算状态中value为中文的配置
DELETE FROM value_added_status_configs 
WHERE type = 'settlementStatus' 
AND value IN ('待处理', '已结算', '未结算');

-- 3. 确保有效状态配置存在（使用英文值）
INSERT IGNORE INTO value_added_status_configs (id, type, value, label, created_at) VALUES
('vs-pending-001', 'validStatus', 'pending', '待处理', NOW()),
('vs-valid-001', 'validStatus', 'valid', '有效', NOW()),
('vs-invalid-001', 'validStatus', 'invalid', '无效', NOW()),
('vs-supplemented-001', 'validStatus', 'supplemented', '已补单', NOW());

-- 4. 确保结算状态配置存在（使用英文值）
INSERT IGNORE INTO value_added_status_configs (id, type, value, label, created_at) VALUES
('ss-unsettled-001', 'settlementStatus', 'unsettled', '未结算', NOW()),
('ss-settled-001', 'settlementStatus', 'settled', '已结算', NOW());

-- 验证结果
SELECT '有效状态配置:' as '';
SELECT type, value, label FROM value_added_status_configs WHERE type = 'validStatus' ORDER BY created_at;

SELECT '结算状态配置:' as '';
SELECT type, value, label FROM value_added_status_configs WHERE type = 'settlementStatus' ORDER BY created_at;
