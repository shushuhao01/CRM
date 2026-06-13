-- ==============================================
-- 迁移：客户表增加小程序资料提交次数字段
-- 适用：MySQL 5.7+ / MySQL 8.0+ / phpMyAdmin
-- 日期：2026-06-13
-- ==============================================

-- 先检查列是否存在，不存在才添加
ALTER TABLE `customers`
  ADD COLUMN `mp_submit_count` INT DEFAULT 0 COMMENT '小程序资料提交次数' AFTER `final_score`;
