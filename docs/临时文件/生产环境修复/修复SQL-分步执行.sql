-- =====================================================
-- 修复SQL - 请一条一条复制执行
-- =====================================================

-- 第1条：添加 cod_amount 字段
ALTER TABLE `orders` ADD COLUMN `cod_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '代收金额';

-- 第2条：添加 cod_status 字段
ALTER TABLE `orders` ADD COLUMN `cod_status` VARCHAR(20) DEFAULT 'pending' COMMENT '代收状态';

-- 第3条：添加 cod_returned_amount 字段
ALTER TABLE `orders` ADD COLUMN `cod_returned_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '已返款金额';

-- 第4条：添加 cod_returned_at 字段
ALTER TABLE `orders` ADD COLUMN `cod_returned_at` DATETIME NULL COMMENT '返款时间';

-- 第5条：添加 cod_cancelled_at 字段
ALTER TABLE `orders` ADD COLUMN `cod_cancelled_at` DATETIME NULL COMMENT '取消代收时间';

-- 第6条：添加 cod_remark 字段
ALTER TABLE `orders` ADD COLUMN `cod_remark` VARCHAR(500) NULL COMMENT '代收备注';

-- 第7条：初始化未签收订单的代收金额
UPDATE `orders` SET `cod_amount` = `total_amount` - IFNULL(`deposit_amount`, 0) WHERE `status` IN ('pending_transfer', 'pending_audit', 'pending_shipment', 'shipped', 'confirmed', 'paid');

-- 第8条：初始化已签收订单的代收金额
UPDATE `orders` SET `cod_amount` = `total_amount` - IFNULL(`deposit_amount`, 0) WHERE `status` IN ('delivered', 'completed', 'logistics_returned', 'logistics_cancelled', 'package_exception');

-- 第9条：添加索引
ALTER TABLE `orders` ADD INDEX `idx_cod_status` (`cod_status`);

-- 验证：查看代收字段
SHOW COLUMNS FROM `orders` WHERE Field LIKE '%cod%';
