-- ============================================================
-- 扩容管理相关表
-- 创建日期: 2026-04-05
-- ============================================================

-- 1. 扩容价格配置表
CREATE TABLE IF NOT EXISTS capacity_price_configs (
  id VARCHAR(36) PRIMARY KEY,
  type ENUM('user', 'storage') NOT NULL COMMENT '扩容类型: user=用户数, storage=存储空间',
  billing_cycle ENUM('monthly', 'yearly', 'follow_package') NOT NULL DEFAULT 'follow_package' COMMENT '计费周期',
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '单价(每用户/每GB)',
  min_qty INT NOT NULL DEFAULT 1 COMMENT '最小购买量',
  max_qty INT NOT NULL DEFAULT 100 COMMENT '最大购买量',
  description VARCHAR(255) DEFAULT '' COMMENT '描述',
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type_active (type, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='扩容价格配置';

-- 2. 扩容订单表
CREATE TABLE IF NOT EXISTS capacity_orders (
  id VARCHAR(36) PRIMARY KEY,
  order_no VARCHAR(64) NOT NULL UNIQUE COMMENT '订单号',
  tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
  type ENUM('user', 'storage') NOT NULL COMMENT '扩容类型',
  quantity INT NOT NULL DEFAULT 1 COMMENT '购买数量',
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '单价',
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '总金额',
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'follow_package' COMMENT '计费周期',
  pay_type VARCHAR(20) DEFAULT NULL COMMENT '支付方式: wechat/alipay',
  status ENUM('pending', 'paid', 'closed', 'refunded') NOT NULL DEFAULT 'pending' COMMENT '订单状态',
  trade_no VARCHAR(128) DEFAULT NULL COMMENT '第三方交易号',
  paid_at DATETIME DEFAULT NULL COMMENT '支付时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id),
  INDEX idx_status (status),
  INDEX idx_order_no (order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='扩容订单';

-- 3. tenants 表新增扩容字段（如不存在才添加）
-- ALTER TABLE tenants ADD COLUMN extra_users INT NOT NULL DEFAULT 0 COMMENT '扩容用户数' AFTER max_users;
-- ALTER TABLE tenants ADD COLUMN extra_storage_gb INT NOT NULL DEFAULT 0 COMMENT '扩容存储空间(GB)' AFTER max_storage_gb;

-- 安全添加字段（忽略已存在的情况）
SET @dbname = DATABASE();

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'extra_users') = 0,
  'ALTER TABLE tenants ADD COLUMN extra_users INT NOT NULL DEFAULT 0 COMMENT ''扩容用户数''',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql2 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'extra_storage_gb') = 0,
  'ALTER TABLE tenants ADD COLUMN extra_storage_gb INT NOT NULL DEFAULT 0 COMMENT ''扩容存储空间(GB)''',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 4. 插入默认扩容价格配置
INSERT IGNORE INTO capacity_price_configs (id, type, billing_cycle, unit_price, min_qty, max_qty, description, is_active) VALUES
  (UUID(), 'user', 'monthly', 50.00, 1, 200, '按月扩容用户数，每人每月50元', 1),
  (UUID(), 'user', 'yearly', 300.00, 1, 200, '按年扩容用户数，每人每年300元', 1),
  (UUID(), 'storage', 'monthly', 10.00, 1, 500, '按月扩容存储空间，每GB每月10元', 1),
  (UUID(), 'storage', 'yearly', 100.00, 1, 500, '按年扩容存储空间，每GB每年100元', 1);

