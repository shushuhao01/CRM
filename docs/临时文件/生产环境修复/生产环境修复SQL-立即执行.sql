-- =====================================================
-- 生产环境修复SQL - 添加代收相关字段
-- 执行前请先备份数据库！
-- =====================================================

-- 1. 添加 cod_amount 字段（代收金额）
ALTER TABLE `orders` 
ADD COLUMN `cod_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '代收金额';

-- 2. 添加 cod_status 字段（代收状态）
ALTER TABLE `orders` 
ADD COLUMN `cod_status` VARCHAR(20) DEFAULT 'pending' COMMENT '代收状态: pending-未返款, returned-已返款, cancelled-已取消代收';

-- 3. 添加 cod_returned_amount 字段（已返款金额）
ALTER TABLE `orders` 
ADD COLUMN `cod_returned_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '已返款金额';

-- 4. 添加 cod_returned_at 字段（返款时间）
ALTER TABLE `orders` 
ADD COLUMN `cod_returned_at` DATETIME NULL COMMENT '返款时间';

-- 5. 添加 cod_cancelled_at 字段（取消代收时间）
ALTER TABLE `orders` 
ADD COLUMN `cod_cancelled_at` DATETIME NULL COMMENT '取消代收时间';

-- 6. 添加 cod_remark 字段（代收备注）
ALTER TABLE `orders` 
ADD COLUMN `cod_remark` VARCHAR(500) NULL COMMENT '代收备注';

-- 7. 初始化现有订单的代收金额
-- 对于未签收的订单，cod_amount = total_amount - deposit_amount
UPDATE `orders` 
SET `cod_amount` = `total_amount` - IFNULL(`deposit_amount`, 0)
WHERE `status` IN ('pending_transfer', 'pending_audit', 'pending_shipment', 'shipped', 'confirmed', 'paid');

-- 8. 对于已签收的订单，也初始化代收金额（用于历史记录）
UPDATE `orders` 
SET `cod_amount` = `total_amount` - IFNULL(`deposit_amount`, 0)
WHERE `status` IN ('delivered', 'completed', 'logistics_returned', 'logistics_cancelled', 'package_exception');

-- 9. 添加索引以提高查询性能
ALTER TABLE `orders` ADD INDEX `idx_cod_status` (`cod_status`);

-- =====================================================
-- 验证修复结果
-- =====================================================

-- 验证字段是否添加成功
SELECT '=== 验证：代收相关字段 ===' AS step;
SHOW COLUMNS FROM `orders` WHERE Field LIKE '%cod%' OR Field LIKE '%deposit%';

-- 统计代收数据
SELECT '=== 统计：代收数据 ===' AS step;
SELECT 
    COUNT(*) AS '总订单数',
    SUM(CASE WHEN cod_amount IS NULL THEN 1 ELSE 0 END) AS 'cod_amount为NULL',
    SUM(CASE WHEN cod_amount = 0 THEN 1 ELSE 0 END) AS 'cod_amount为0',
    SUM(CASE WHEN cod_amount > 0 THEN 1 ELSE 0 END) AS 'cod_amount大于0',
    SUM(CASE WHEN cod_status = 'pending' THEN 1 ELSE 0 END) AS '待返款',
    SUM(CASE WHEN cod_status = 'returned' THEN 1 ELSE 0 END) AS '已返款',
    SUM(CASE WHEN cod_status = 'cancelled' THEN 1 ELSE 0 END) AS '已取消代收'
FROM `orders`;

-- 显示最近10条订单的代收信息
SELECT '=== 验证：最近10条订单 ===' AS step;
SELECT 
    order_number AS '订单号',
    customer_name AS '客户',
    total_amount AS '总额',
    deposit_amount AS '定金',
    cod_amount AS '代收金额',
    cod_status AS '代收状态',
    status AS '订单状态'
FROM `orders` 
ORDER BY created_at DESC 
LIMIT 10;

-- 完成提示
SELECT '✅ 修复完成！' AS result;
SELECT '下一步：重启后端服务 pm2 restart crm-backend' AS next_step;
