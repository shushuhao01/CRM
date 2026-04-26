-- =====================================================
-- 企微服务商应用通知模板表
-- 存储企微服务商后台申请的消息通知模板ID
-- 创建时间: 2026-04-26
-- 兼容 phpMyAdmin 执行
-- =====================================================

CREATE TABLE IF NOT EXISTS `wecom_notification_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `template_id` VARCHAR(200) NOT NULL COMMENT '企微消息模板ID',
  `template_name` VARCHAR(200) NOT NULL COMMENT '模板名称(自定义标签)',
  `template_type` VARCHAR(50) NOT NULL COMMENT '模板类型: order/customer/follow_up/payment/approval/system/custom',
  `description` TEXT NULL COMMENT '模板用途描述',
  `template_content` TEXT NULL COMMENT '模板内容/变量说明(JSON)',
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_template_type` (`template_type`),
  INDEX `idx_is_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微服务商应用通知模板配置';
