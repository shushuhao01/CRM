-- ==============================================
-- 迁移：商品SKU多规格功能
-- 适用：MySQL 5.7+ / MySQL 8.0+ / phpMyAdmin
-- 日期：2026-06-27
-- 说明：新增SKU表、规格组表、库存调整记录表，扩展商品表和订单项表
-- 注意：CREATE TABLE IF NOT EXISTS 安全幂等
--       ALTER TABLE ADD COLUMN 如字段已存在会报错，可忽略继续
-- ==============================================

CREATE TABLE IF NOT EXISTS `product_spec_groups` (
  `id` VARCHAR(50) NOT NULL COMMENT '规格组ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(50) NOT NULL COMMENT '所属商品ID',
  `spec_name` VARCHAR(50) NOT NULL COMMENT '规格名称',
  `spec_values` JSON NOT NULL COMMENT '规格值列表',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_spec_product` (`product_id`),
  KEY `IDX_spec_tenant_product` (`tenant_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品规格组表';

CREATE TABLE IF NOT EXISTS `product_skus` (
  `id` VARCHAR(50) NOT NULL COMMENT 'SKU ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(50) NOT NULL COMMENT '所属商品ID',
  `sku_code` VARCHAR(50) NOT NULL COMMENT 'SKU编码',
  `sku_name` VARCHAR(200) NOT NULL COMMENT 'SKU名称',
  `sku_image` VARCHAR(500) DEFAULT NULL COMMENT 'SKU图片URL',
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '销售价格',
  `cost_price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '成本价格',
  `stock` INT NOT NULL DEFAULT 0 COMMENT '库存数量',
  `sales_count` INT NOT NULL DEFAULT 0 COMMENT '销量',
  `weight` DECIMAL(10,2) DEFAULT 0.00 COMMENT '重量(kg)',
  `barcode` VARCHAR(50) DEFAULT NULL COMMENT '条形码',
  `spec_values` JSON NOT NULL COMMENT '规格值JSON',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/inactive',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_sku_product` (`product_id`),
  KEY `IDX_sku_tenant_product` (`tenant_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品SKU表';

CREATE TABLE IF NOT EXISTS `stock_adjustments` (
  `id` VARCHAR(50) NOT NULL COMMENT '调整记录ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(50) NOT NULL COMMENT '商品ID',
  `sku_id` VARCHAR(50) DEFAULT NULL COMMENT 'SKU ID',
  `sku_name` VARCHAR(200) DEFAULT NULL COMMENT 'SKU名称',
  `adjust_type` VARCHAR(20) NOT NULL COMMENT 'increase/decrease/set',
  `quantity` INT NOT NULL COMMENT '调整数量',
  `before_stock` INT NOT NULL COMMENT '调整前库存',
  `after_stock` INT NOT NULL COMMENT '调整后库存',
  `reason` VARCHAR(50) DEFAULT NULL COMMENT '调整原因',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `operator_id` VARCHAR(50) DEFAULT NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_adj_product` (`product_id`),
  KEY `IDX_adj_tenant_product` (`tenant_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存调整记录表';

ALTER TABLE `products` ADD COLUMN `sku_type` VARCHAR(10) DEFAULT 'none' COMMENT 'SKU类型: none/single/multi';

ALTER TABLE `products` ADD COLUMN `min_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'SKU最低价';

ALTER TABLE `products` ADD COLUMN `max_price` DECIMAL(10,2) DEFAULT NULL COMMENT 'SKU最高价';

ALTER TABLE `products` ADD COLUMN `total_stock` INT DEFAULT NULL COMMENT 'SKU总库存';

ALTER TABLE `order_items` ADD COLUMN `sku_id` VARCHAR(50) DEFAULT NULL COMMENT 'SKU ID';

ALTER TABLE `order_items` ADD COLUMN `sku_name` VARCHAR(200) DEFAULT NULL COMMENT 'SKU规格名称快照';

ALTER TABLE `order_items` ADD COLUMN `sku_image` VARCHAR(500) DEFAULT NULL COMMENT 'SKU图片快照';

ALTER TABLE `order_items` ADD COLUMN `spec_values` JSON DEFAULT NULL COMMENT 'SKU规格值快照';
