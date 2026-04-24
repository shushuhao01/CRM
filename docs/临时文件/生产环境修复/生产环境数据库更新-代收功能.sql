-- =====================================================
-- 生产环境数据库更新 - 代收功能完整SQL
-- 执行前请先备份数据库！
-- 执行时间：2025-02-25
-- =====================================================

-- 第一部分：更新 orders 表结构
-- =====================================================

-- 1. 添加代收金额字段
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `cod_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '代收金额';

-- 2. 添加代收状态字段
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `cod_status` VARCHAR(20) DEFAULT 'pending' COMMENT '代收状态: pending-未返款, returned-已返款, cancelled-已取消代收';

-- 3. 添加已返款金额字段
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `cod_returned_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '已返款金额';

-- 4. 添加返款时间字段
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `cod_returned_at` DATETIME NULL COMMENT '返款时间';

-- 5. 添加取消代收时间字段
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `cod_cancelled_at` DATETIME NULL COMMENT '取消代收时间';

-- 6. 添加代收备注字段
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `cod_remark` VARCHAR(500) NULL COMMENT '代收备注';

-- 7. 初始化现有订单的代收金额
-- 对于未签收的订单，cod_amount = total_amount - deposit_amount
UPDATE `orders` 
SET `cod_amount` = `total_amount` - IFNULL(`deposit_amount`, 0)
WHERE (`cod_amount` IS NULL OR `cod_amount` = 0)
    AND `status` IN ('pending_transfer', 'pending_audit', 'pending_shipment', 'shipped');

-- 8. 对于已签收/已完成的订单，也初始化 cod_amount
UPDATE `orders` 
SET `cod_amount` = `total_amount` - IFNULL(`deposit_amount`, 0)
WHERE (`cod_amount` IS NULL OR `cod_amount` = 0)
    AND `status` IN ('delivered', 'completed', 'logistics_returned', 'logistics_cancelled', 'package_exception');


-- 第二部分：创建代收取消申请表
-- =====================================================

CREATE TABLE IF NOT EXISTS `cod_cancel_applications` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `application_number` VARCHAR(50) NOT NULL COMMENT '申请单号',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NOT NULL COMMENT '订单号',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) NOT NULL COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) NULL COMMENT '客户电话',
  `original_cod_amount` DECIMAL(10,2) NOT NULL COMMENT '原代收金额',
  `current_cod_amount` DECIMAL(10,2) NOT NULL COMMENT '当前代收金额',
  `requested_cod_amount` DECIMAL(10,2) NOT NULL COMMENT '申请代收金额',
  `cancel_reason` TEXT NOT NULL COMMENT '取消原因',
  `payment_proof` JSON NULL COMMENT '尾款凭证（图片URL数组）',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '申请状态: pending-待审核, approved-已通过, rejected-已拒绝',
  `applicant_id` VARCHAR(50) NOT NULL COMMENT '申请人ID',
  `applicant_name` VARCHAR(50) NOT NULL COMMENT '申请人姓名',
  `department_id` VARCHAR(36) NULL COMMENT '申请人部门ID',
  `department_name` VARCHAR(50) NULL COMMENT '申请人部门名称',
  `reviewer_id` VARCHAR(50) NULL COMMENT '审核人ID',
  `reviewer_name` VARCHAR(50) NULL COMMENT '审核人姓名',
  `review_time` DATETIME NULL COMMENT '审核时间',
  `review_remark` TEXT NULL COMMENT '审核意见',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_application_number` (`application_number`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_status` (`status`),
  KEY `idx_applicant_id` (`applicant_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代收取消申请表';


-- 第三部分：验证更新结果
-- =====================================================

-- 验证 orders 表字段
SELECT '=== 验证 orders 表代收相关字段 ===' AS step;
SHOW COLUMNS FROM `orders` WHERE Field LIKE '%cod%';

-- 统计代收数据
SELECT '=== 代收数据统计 ===' AS step;
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
SELECT '=== 最近10条订单的代收信息 ===' AS step;
SELECT 
    order_number AS '订单号',
    customer_name AS '客户',
    total_amount AS '总额',
    deposit_amount AS '定金',
    cod_amount AS '代收金额',
    cod_status AS '代收状态',
    status AS '订单状态',
    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS '创建时间'
FROM `orders` 
ORDER BY created_at DESC 
LIMIT 10;

-- 验证代收取消申请表
SELECT '=== 验证代收取消申请表 ===' AS step;
SHOW CREATE TABLE `cod_cancel_applications`;

-- 完成提示
SELECT '✅ 数据库更新完成！' AS result;
SELECT '请重启后端服务：pm2 restart crm-backend' AS next_step;
SELECT '然后测试代收功能是否正常' AS final_step;
