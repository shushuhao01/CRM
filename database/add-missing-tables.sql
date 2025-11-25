-- =============================================
-- 添加缺失的数据表
-- 版本：1.8.4
-- 更新时间：2024-11-25
-- 说明：此脚本用于在现有数据库上添加缺失的表
-- =============================================

SET NAMES utf8mb4;
SET time_zone = '+08:00';
SET FOREIGN_KEY_CHECKS = 0;

-- 1. 用户个人权限表
DROP TABLE IF EXISTS `user_permissions`;
CREATE TABLE `user_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '权限ID',
  `userId` INT NOT NULL COMMENT '用户ID',
  `permissionId` INT NOT NULL COMMENT '权限ID',
  `grantedBy` INT NULL COMMENT '授权人ID',
  `reason` TEXT NULL COMMENT '授权原因',
  `grantedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
  INDEX `idx_user` (`userId`),
  INDEX `idx_permission` (`permissionId`),
  INDEX `idx_granted_by` (`grantedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户个人权限表';

-- 2. 物流状态配置表
DROP TABLE IF EXISTS `logistics_status`;
CREATE TABLE `logistics_status` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '状态ID',
  `name` VARCHAR(50) NOT NULL COMMENT '状态名称',
  `color` VARCHAR(7) DEFAULT '#28a745' COMMENT '状态颜色',
  `description` TEXT NULL COMMENT '状态描述',
  `isActive` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_name` (`name`),
  INDEX `idx_is_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流状态配置表';

-- 3. 物流跟踪表
DROP TABLE IF EXISTS `logistics_tracking`;
CREATE TABLE `logistics_tracking` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '跟踪ID',
  `orderId` INT NOT NULL COMMENT '订单ID',
  `trackingNo` VARCHAR(100) NOT NULL COMMENT '物流单号',
  `companyCode` VARCHAR(50) NOT NULL COMMENT '物流公司代码',
  `companyName` VARCHAR(100) NOT NULL COMMENT '物流公司名称',
  `status` VARCHAR(50) DEFAULT 'pending' COMMENT '物流状态',
  `currentLocation` VARCHAR(200) NULL COMMENT '当前位置',
  `statusDescription` TEXT NULL COMMENT '状态描述',
  `lastUpdateTime` DATETIME NULL COMMENT '最后更新时间',
  `estimatedDeliveryTime` DATETIME NULL COMMENT '预计送达时间',
  `actualDeliveryTime` DATETIME NULL COMMENT '实际送达时间',
  `signedBy` VARCHAR(100) NULL COMMENT '签收人',
  `extraInfo` JSON NULL COMMENT '扩展信息',
  `autoSyncEnabled` BOOLEAN DEFAULT TRUE COMMENT '是否启用自动同步',
  `nextSyncTime` DATETIME NULL COMMENT '下次同步时间',
  `syncFailureCount` INT DEFAULT 0 COMMENT '同步失败次数',
  `lastSyncError` TEXT NULL COMMENT '最后同步错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_order` (`orderId`),
  INDEX `idx_tracking_no` (`trackingNo`),
  INDEX `idx_company_code` (`companyCode`),
  INDEX `idx_status` (`status`),
  INDEX `idx_next_sync_time` (`nextSyncTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流跟踪表';

-- 4. 物流轨迹表
DROP TABLE IF EXISTS `logistics_traces`;
CREATE TABLE `logistics_traces` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '轨迹ID',
  `logisticsTrackingId` INT NOT NULL COMMENT '物流跟踪ID',
  `traceTime` DATETIME NOT NULL COMMENT '轨迹时间',
  `location` VARCHAR(200) NULL COMMENT '轨迹位置',
  `description` TEXT NOT NULL COMMENT '轨迹描述',
  `status` VARCHAR(50) NULL COMMENT '操作状态',
  `operator` VARCHAR(100) NULL COMMENT '操作员',
  `phone` VARCHAR(100) NULL COMMENT '联系电话',
  `rawData` JSON NULL COMMENT '原始数据',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_logistics_tracking` (`logisticsTrackingId`),
  INDEX `idx_trace_time` (`traceTime`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流轨迹表';

-- 5. 订单明细表
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '明细ID',
  `orderId` INT NOT NULL COMMENT '订单ID',
  `productId` INT NOT NULL COMMENT '产品ID',
  `productName` VARCHAR(100) NOT NULL COMMENT '产品名称（快照）',
  `productSku` VARCHAR(50) NOT NULL COMMENT '产品SKU（快照）',
  `unitPrice` DECIMAL(10,2) NOT NULL COMMENT '单价（快照）',
  `quantity` INT NOT NULL COMMENT '数量',
  `subtotal` DECIMAL(10,2) NOT NULL COMMENT '小计金额',
  `discountAmount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
  `notes` TEXT NULL COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_order` (`orderId`),
  INDEX `idx_product` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细表';

-- 6. 订单状态历史表
DROP TABLE IF EXISTS `order_status_history`;
CREATE TABLE `order_status_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '历史ID',
  `orderId` INT NOT NULL COMMENT '订单ID',
  `status` VARCHAR(50) NOT NULL COMMENT '状态',
  `notes` TEXT NULL COMMENT '状态变更备注',
  `operatorId` INT NULL COMMENT '操作人ID',
  `operatorName` VARCHAR(50) NULL COMMENT '操作人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_order` (`orderId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_operator` (`operatorId`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单状态历史表';

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- 完成提示
-- =============================================
SELECT '缺失表添加完成！' AS message;
SELECT '已添加以下表：' AS info;
SELECT '1. user_permissions - 用户个人权限表' AS table_1;
SELECT '2. logistics_status - 物流状态配置表' AS table_2;
SELECT '3. logistics_tracking - 物流跟踪表' AS table_3;
SELECT '4. logistics_traces - 物流轨迹表' AS table_4;
SELECT '5. order_items - 订单明细表' AS table_5;
SELECT '6. order_status_history - 订单状态历史表' AS table_6;
