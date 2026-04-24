-- 企微对外收款模块增强 - 数据库迁移
-- 日期: 2026-04-20

-- 1. 增强 wecom_payment_records 表
ALTER TABLE wecom_payment_records
  ADD COLUMN trade_no VARCHAR(100) NULL COMMENT '微信交易单号' AFTER payment_no,
  ADD COLUMN department_id INT NULL COMMENT '收款人所属部门ID' AFTER user_name,
  ADD COLUMN department_name VARCHAR(100) NULL COMMENT '部门名称' AFTER department_id,
  ADD COLUMN customer_name VARCHAR(100) NULL COMMENT '客户名称(CRM)' AFTER payer_name,
  ADD COLUMN pay_method VARCHAR(30) NULL COMMENT '支付方式' AFTER amount,
  ADD COLUMN currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种' AFTER pay_method,
  ADD COLUMN refund_amount INT DEFAULT 0 COMMENT '已退款金额(分)' AFTER refund_time,
  ADD COLUMN qrcode_id INT NULL COMMENT '关联收款码ID' AFTER refund_amount,
  ADD COLUMN crm_order_no VARCHAR(100) NULL COMMENT '关联CRM订单号' AFTER qrcode_id,
  ADD COLUMN crm_customer_id INT NULL COMMENT '关联CRM客户ID' AFTER crm_order_no;

ALTER TABLE wecom_payment_records
  ADD INDEX IDX_wecom_payment_pay_time (pay_time);

-- 2. 创建退款记录表
CREATE TABLE IF NOT EXISTS wecom_payment_refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  wecom_config_id INT NOT NULL,
  refund_no VARCHAR(100) NOT NULL COMMENT '退款单号',
  original_payment_no VARCHAR(100) NOT NULL COMMENT '原收款单号',
  original_trade_no VARCHAR(100) NULL COMMENT '原交易单号',
  payer_name VARCHAR(100) NULL COMMENT '原付款人',
  operator_id VARCHAR(100) NULL COMMENT '操作人UserID',
  operator_name VARCHAR(100) NULL COMMENT '操作人姓名',
  original_amount INT NOT NULL COMMENT '原交易金额(分)',
  refund_amount INT NOT NULL COMMENT '退款金额(分)',
  reason VARCHAR(500) NULL COMMENT '退款原因',
  status VARCHAR(20) DEFAULT 'processing' COMMENT 'processing/completed/rejected',
  refund_time DATETIME NULL COMMENT '退款完成时间',
  reject_reason VARCHAR(500) NULL COMMENT '拒绝原因',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX IDX_wecom_refund_no (refund_no),
  INDEX IDX_wecom_refund_tenant (tenant_id),
  INDEX IDX_wecom_refund_payment (original_payment_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微收款退款记录';

-- 3. 创建收款码管理表
CREATE TABLE IF NOT EXISTS wecom_payment_qrcodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  wecom_config_id INT NOT NULL DEFAULT 0,
  name VARCHAR(100) NOT NULL COMMENT '收款码名称',
  amount_type VARCHAR(20) DEFAULT 'custom' COMMENT 'fixed/custom',
  fixed_amount INT DEFAULT 0 COMMENT '固定金额(分)',
  description VARCHAR(500) NULL COMMENT '收款码描述',
  member_user_ids TEXT NULL COMMENT '使用成员UserID JSON数组',
  member_names VARCHAR(500) NULL COMMENT '使用成员姓名',
  remark_template VARCHAR(200) NULL COMMENT '备注模板',
  qr_url VARCHAR(500) NULL COMMENT '二维码URL',
  total_amount BIGINT DEFAULT 0 COMMENT '累计收款(分)',
  total_count INT DEFAULT 0 COMMENT '累计笔数',
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX IDX_wecom_qrcode_tenant (tenant_id),
  INDEX IDX_wecom_qrcode_config (wecom_config_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微收款码管理';

