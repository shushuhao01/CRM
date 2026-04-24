-- 增值管理状态配置预设数据初始化
-- 执行时间：2026-03-01
-- 说明：初始化有效状态和结算状态的预设配置

-- 清空现有配置（可选，如果需要重置）
-- DELETE FROM value_added_status_configs;

-- 插入有效状态预设
INSERT INTO value_added_status_configs (id, type, value, label, created_at)
VALUES
  (UUID(), 'validStatus', 'pending', '待处理', NOW()),
  (UUID(), 'validStatus', 'valid', '有效', NOW()),
  (UUID(), 'validStatus', 'invalid', '无效', NOW())
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- 插入结算状态预设
INSERT INTO value_added_status_configs (id, type, value, label, created_at)
VALUES
  (UUID(), 'settlementStatus', 'unsettled', '未结算', NOW()),
  (UUID(), 'settlementStatus', 'settled', '已结算', NOW())
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- 验证插入结果
SELECT '有效状态配置:' as '配置类型';
SELECT * FROM value_added_status_configs WHERE type = 'validStatus' ORDER BY created_at;

SELECT '结算状态配置:' as '配置类型';
SELECT * FROM value_added_status_configs WHERE type = 'settlementStatus' ORDER BY created_at;
