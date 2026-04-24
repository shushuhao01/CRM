-- =====================================================
-- 生产环境数据库结构检查脚本
-- 请在生产环境执行此脚本，并将所有结果截图
-- =====================================================

-- 1. 检查 orders 表的所有字段
SELECT '=== 第1步：orders 表所有字段 ===' AS step;
DESCRIBE `orders`;

-- 2. 检查 orders 表中代收相关字段
SELECT '=== 第2步：orders 表代收相关字段 ===' AS step;
SHOW COLUMNS FROM `orders` WHERE Field LIKE '%cod%' OR Field LIKE '%deposit%';

-- 3. 检查 cod_cancel_applications 表是否存在
SELECT '=== 第3步：检查 cod_cancel_applications 表 ===' AS step;
SHOW TABLES LIKE 'cod_cancel_applications';

-- 4. 如果表存在，显示表结构
SELECT '=== 第4步：cod_cancel_applications 表结构 ===' AS step;
DESCRIBE `cod_cancel_applications`;

-- 5. 检查最近5条订单的代收相关数据
SELECT '=== 第5步：最近5条订单的代收数据 ===' AS step;
SELECT 
    order_number,
    customer_name,
    total_amount,
    deposit_amount,
    status,
    created_at
FROM `orders` 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. 统计订单表的字段数量
SELECT '=== 第6步：orders 表字段统计 ===' AS step;
SELECT COUNT(*) AS '字段总数' 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'orders';

-- 完成提示
SELECT '✅ 检查完成！请将以上所有结果截图发送' AS message;
