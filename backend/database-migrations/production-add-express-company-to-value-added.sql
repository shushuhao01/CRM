-- =============================================
-- 生产环境：为增值订单表添加物流公司字段
-- 执行时间：约1-5秒（取决于数据量）
-- 影响范围：value_added_orders 表
-- =============================================

-- 步骤1: 添加 express_company 字段
ALTER TABLE `value_added_orders` 
ADD COLUMN `express_company` VARCHAR(50) NULL COMMENT '物流公司' 
AFTER `tracking_number`;

-- 步骤2: 从订单表同步物流公司数据
UPDATE `value_added_orders` vo
INNER JOIN `orders` o ON BINARY vo.order_id = BINARY o.id
SET vo.express_company = o.express_company
WHERE vo.order_id IS NOT NULL 
  AND o.express_company IS NOT NULL
  AND o.express_company != '';

-- =============================================
-- 验证SQL（可选，用于检查结果）
-- =============================================

-- 查看同步结果统计
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN express_company IS NOT NULL AND express_company != '' THEN 1 END) as synced_records,
  ROUND(COUNT(CASE WHEN express_company IS NOT NULL AND express_company != '' THEN 1 END) * 100.0 / COUNT(*), 1) as sync_rate
FROM `value_added_orders`;

-- 查看示例数据（前10条）
SELECT 
  order_number,
  tracking_number,
  express_company
FROM `value_added_orders`
WHERE tracking_number IS NOT NULL
LIMIT 10;

-- =============================================
-- 执行完成！
-- 下一步：重启后端服务，测试物流弹窗功能
-- =============================================
