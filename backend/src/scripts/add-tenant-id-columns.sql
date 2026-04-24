-- ============================================
-- 租户数据隔离：添加 tenant_id 字段迁移脚本
-- 创建日期：2026-03-22
-- 说明：为所有需要租户隔离但缺少 tenant_id 的表添加该字段
-- ============================================

-- 物流相关表
ALTER TABLE logistics_companies ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID' AFTER id;
ALTER TABLE logistics_tracking ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID' AFTER id;
ALTER TABLE logistics_traces ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE logistics_api_configs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';

-- 消息通知相关表
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID' AFTER id;
ALTER TABLE announcement_reads ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE message_subscriptions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE notification_channels ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID' AFTER id;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE message_read_status ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';

-- 订单历史表
ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID' AFTER id;

-- 操作日志表
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID' AFTER id;

-- 短信相关表
ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE sms_records ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';

-- 业绩报表配置表
ALTER TABLE performance_report_configs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID' AFTER id;

-- 佣金相关表
ALTER TABLE commission_settings ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE commission_ladders ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';

-- COD取消申请
ALTER TABLE cod_cancel_applications ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';

-- 企业微信相关表
ALTER TABLE wecom_configs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE wecom_user_bindings ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE wecom_customers ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE wecom_acquisition_links ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE wecom_service_accounts ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE wecom_payment_records ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE wecom_chat_records ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';

-- 服务相关表
ALTER TABLE service_follow_ups ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';
ALTER TABLE service_operation_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';

-- 通知模板
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';

-- 支付方式选项
ALTER TABLE payment_method_options ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';

-- 绩效配置
ALTER TABLE performance_configs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';

-- 拒绝原因
ALTER TABLE rejection_reasons ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(36) NULL COMMENT '租户ID';

-- ============================================
-- 添加索引以提高租户查询性能
-- ============================================
CREATE INDEX IF NOT EXISTS idx_logistics_companies_tenant ON logistics_companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logistics_tracking_tenant ON logistics_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_channels_tenant ON notification_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_tenant ON order_status_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_tenant ON operation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant ON sms_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_records_tenant ON sms_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_report_configs_tenant ON performance_report_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wecom_configs_tenant ON wecom_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wecom_user_bindings_tenant ON wecom_user_bindings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_subscriptions_tenant ON message_subscriptions(tenant_id);

-- ============================================
-- 说明：
-- 1. 使用 IF NOT EXISTS 确保重复执行安全
-- 2. tenant_id 设为 NULL 以兼容私有部署模式
-- 3. 已有数据需要手动更新 tenant_id 值
-- ============================================

