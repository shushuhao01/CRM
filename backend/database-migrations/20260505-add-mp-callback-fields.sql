-- =====================================================
-- 微信小程序消息推送回调字段迁移脚本
-- 版本: v4.2.1
-- 日期: 2026-05-05
-- 说明: 为 wecom_suite_configs 表新增小程序消息推送回调配置字段
--       mp_callback_token / mp_callback_encoding_aes_key
-- 兼容: MySQL 5.7+ / phpMyAdmin（无需 information_schema 权限）
-- 注意: 如果字段已存在会报 Duplicate column 错误，忽略即可
-- =====================================================

ALTER TABLE `wecom_suite_configs`
  ADD COLUMN `mp_callback_token` VARCHAR(100) DEFAULT NULL COMMENT '小程序消息推送Token' AFTER `mp_enabled`;

ALTER TABLE `wecom_suite_configs`
  ADD COLUMN `mp_callback_encoding_aes_key` VARCHAR(100) DEFAULT NULL COMMENT '小程序消息推送EncodingAESKey' AFTER `mp_callback_token`;
