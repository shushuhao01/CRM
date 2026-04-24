-- =============================================
-- 企微客户表 - 性能优化索引（策略一）
-- 日期: 2026-04-11
-- 说明: 为 wecom_customers 表添加复合索引
--       优化客户列表查询、同步去重、时间范围查询
-- =============================================

-- 1. 唯一复合索引：防止重复客户（同步时 upsert 依赖此索引）
-- 同一配置下同一 external_user_id 只能有一条记录
ALTER TABLE `wecom_customers`
  ADD UNIQUE INDEX IF NOT EXISTS `UQ_wecom_customers_config_external`
    (`wecom_config_id`, `external_user_id`);

-- 2. 复合索引：按配置+跟进人+状态筛选查询
-- 用于客户列表页按跟进人、状态筛选的高频查询
ALTER TABLE `wecom_customers`
  ADD INDEX IF NOT EXISTS `IDX_wecom_customers_config_follow_status`
    (`wecom_config_id`, `follow_user_id`, `status`);

-- 3. 复合索引：按配置+添加时间排序/范围查询
-- 用于按时间段筛选客户、统计今日进粉等
ALTER TABLE `wecom_customers`
  ADD INDEX IF NOT EXISTS `IDX_wecom_customers_config_addtime`
    (`wecom_config_id`, `add_time`);

-- 4. CRM关联查询索引
-- 用于查询已关联/未关联CRM客户
ALTER TABLE `wecom_customers`
  ADD INDEX IF NOT EXISTS `IDX_wecom_customers_crm_customer`
    (`crm_customer_id`);

-- 5. wecom_chat_records 性能索引（高危表，数据量大）
ALTER TABLE `wecom_chat_records`
  ADD UNIQUE INDEX IF NOT EXISTS `UQ_wecom_chat_records_msg_id`
    (`msg_id`);

ALTER TABLE `wecom_chat_records`
  ADD INDEX IF NOT EXISTS `IDX_wecom_chat_records_config_time`
    (`wecom_config_id`, `msg_time`);

ALTER TABLE `wecom_chat_records`
  ADD INDEX IF NOT EXISTS `IDX_wecom_chat_records_from_user`
    (`from_user_id`, `msg_time`);

-- 6. wecom_payment_records 索引
ALTER TABLE `wecom_payment_records`
  ADD UNIQUE INDEX IF NOT EXISTS `UQ_wecom_payment_records_payment_no`
    (`payment_no`);

ALTER TABLE `wecom_payment_records`
  ADD INDEX IF NOT EXISTS `IDX_wecom_payment_records_config_time`
    (`wecom_config_id`, `created_at`);

-- 验证索引
SELECT
  TABLE_NAME, INDEX_NAME, NON_UNIQUE, COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('wecom_customers', 'wecom_chat_records', 'wecom_payment_records')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

