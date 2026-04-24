-- =============================================
-- 短信管理模块 v1.8.0 数据库迁移 SQL
-- 适用于：生产环境 / phpMyAdmin 执行
-- 日期：2026-04-10
-- 兼容：MySQL 5.7+ / MySQL 8.0+
--
-- 迁移内容：
-- 1. sms_templates 表 status 字段从 ENUM 改为 VARCHAR(20)
-- 2. sms_templates 表新增 8 个字段（审核流程+预设模板）
-- 3. sms_records 表新增 sender_phone 字段
-- 4. 新建 sms_quota_packages 表（短信额度套餐）
-- 5. 新建 sms_quota_orders 表（短信额度购买订单）
-- 6. 插入 4 个默认套餐数据
-- =============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. sms_templates: status 从 ENUM 改为 VARCHAR(20)
-- ============================================================
ALTER TABLE `sms_templates`
  MODIFY COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'pending_admin'
  COMMENT '审核状态: pending_admin/pending_vendor/active/rejected/withdrawn/deleted';

-- 旧数据兼容迁移
UPDATE `sms_templates` SET `status` = 'pending_admin' WHERE `status` = 'pending';
UPDATE `sms_templates` SET `status` = 'active' WHERE `status` = 'approved';

-- ============================================================
-- 2. sms_templates: 新增 8 个字段（如已存在会报错，可忽略）
-- ============================================================
ALTER TABLE `sms_templates`
  ADD COLUMN `vendor_template_code` VARCHAR(100) NULL COMMENT '服务商模板CODE' AFTER `is_system`,
  ADD COLUMN `vendor_status` VARCHAR(20) NULL COMMENT '服务商审核状态' AFTER `vendor_template_code`,
  ADD COLUMN `vendor_submit_at` TIMESTAMP NULL COMMENT '提交服务商时间' AFTER `vendor_status`,
  ADD COLUMN `vendor_reject_reason` TEXT NULL COMMENT '服务商拒绝原因' AFTER `vendor_submit_at`,
  ADD COLUMN `admin_reviewer` VARCHAR(50) NULL COMMENT '管理后台审核人' AFTER `vendor_reject_reason`,
  ADD COLUMN `admin_review_at` TIMESTAMP NULL COMMENT '管理后台审核时间' AFTER `admin_reviewer`,
  ADD COLUMN `admin_review_note` TEXT NULL COMMENT '管理后台审核备注/拒绝原因' AFTER `admin_review_at`,
  ADD COLUMN `is_preset` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否为后台预设模板: 0=租户自建, 1=预设' AFTER `admin_review_note`;

-- ============================================================
-- 3. sms_records: 新增 sender_phone 字段
-- ============================================================
ALTER TABLE `sms_records`
  ADD COLUMN `sender_phone` VARCHAR(20) NULL COMMENT '发送人手机号' AFTER `remark`;

-- ============================================================
-- 4. 创建 sms_quota_packages 表
-- ============================================================
CREATE TABLE IF NOT EXISTS `sms_quota_packages` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '套餐名称',
  `sms_count` INT NOT NULL COMMENT '短信条数',
  `price` DECIMAL(10,2) NOT NULL COMMENT '套餐价格(元)',
  `unit_price` DECIMAL(10,4) DEFAULT 0 COMMENT '单条价格(元)',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '套餐描述',
  `sort_order` INT DEFAULT 0 COMMENT '排序权重',
  `is_enabled` TINYINT DEFAULT 1 COMMENT '是否启用: 1启用 0禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信额度套餐';

-- ============================================================
-- 5. 创建 sms_quota_orders 表
-- ============================================================
CREATE TABLE IF NOT EXISTS `sms_quota_orders` (
  `id` VARCHAR(36) PRIMARY KEY,
  `order_no` VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `tenant_name` VARCHAR(200) DEFAULT NULL COMMENT '租户名称',
  `package_id` VARCHAR(36) DEFAULT NULL COMMENT '套餐ID',
  `package_name` VARCHAR(100) DEFAULT NULL COMMENT '套餐名称',
  `sms_count` INT DEFAULT 0 COMMENT '购买短信条数',
  `amount` DECIMAL(10,2) DEFAULT 0 COMMENT '支付金额',
  `pay_type` VARCHAR(20) DEFAULT NULL COMMENT '支付方式: wechat/alipay/bank',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/paid/refunded/closed',
  `qr_code` TEXT DEFAULT NULL COMMENT '支付二维码',
  `pay_url` TEXT DEFAULT NULL COMMENT '支付链接',
  `paid_at` DATETIME DEFAULT NULL COMMENT '支付时间',
  `buyer_id` VARCHAR(36) DEFAULT NULL COMMENT '购买人ID',
  `buyer_name` VARCHAR(100) DEFAULT NULL COMMENT '购买人姓名',
  `buyer_source` VARCHAR(20) DEFAULT 'crm' COMMENT '购买来源: crm/member',
  `refund_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '退款金额',
  `refund_sms_count` INT DEFAULT 0 COMMENT '退款短信条数',
  `refund_at` DATETIME DEFAULT NULL COMMENT '退款时间',
  `refund_reason` VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
  `refunded_by` VARCHAR(100) DEFAULT NULL COMMENT '退款操作人',
  `expire_time` DATETIME DEFAULT NULL COMMENT '订单过期时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_sms_quota_orders_tenant_id` (`tenant_id`),
  INDEX `idx_sms_quota_orders_order_no` (`order_no`),
  INDEX `idx_sms_quota_orders_status` (`status`),
  INDEX `idx_sms_quota_orders_paid_at` (`paid_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信额度购买订单';

-- ============================================================
-- 6. 插入默认套餐数据
-- ============================================================
INSERT INTO `sms_quota_packages` (`id`, `name`, `sms_count`, `price`, `unit_price`, `description`, `sort_order`, `is_enabled`) VALUES
('pkg-sms-001', '体验包', 100, 5.00, 0.0500, '适合小规模测试使用', 1, 1),
('pkg-sms-002', '基础包', 500, 22.50, 0.0450, '适合小团队日常使用', 2, 1),
('pkg-sms-003', '标准包', 2000, 80.00, 0.0400, '适合中型企业日常营销', 3, 1),
('pkg-sms-004', '旗舰包', 10000, 350.00, 0.0350, '适合大批量短信营销推广', 4, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `sms_count` = VALUES(`sms_count`),
  `price` = VALUES(`price`),
  `unit_price` = VALUES(`unit_price`),
  `updated_at` = CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- 迁移完成！
-- 验证命令（可选执行）：
-- SHOW COLUMNS FROM sms_templates;
-- SHOW COLUMNS FROM sms_records;
-- SELECT * FROM sms_quota_packages ORDER BY sort_order;
-- SELECT COUNT(*) FROM sms_quota_orders;
-- =============================================

