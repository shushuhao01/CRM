-- 创建租户操作日志表
-- 用于记录租户的关键操作，用于审计和追踪

CREATE TABLE IF NOT EXISTS `tenant_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `tenant_id` VARCHAR(255) NOT NULL COMMENT '租户ID',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `operator` VARCHAR(100) NOT NULL COMMENT '操作人名称',
  `operator_id` VARCHAR(255) NOT NULL COMMENT '操作人ID',
  `details` TEXT COMMENT '操作详情（JSON格式）',
  `ip_address` VARCHAR(45) COMMENT 'IP地址',
  `user_agent` VARCHAR(500) COMMENT '用户代理',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_tenant_created` (`tenant_id`, `created_at`),
  INDEX `idx_action` (`action`),
  INDEX `idx_operator_id` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户操作日志表';

-- 操作类型说明：
-- create: 创建租户
-- update: 更新租户信息
-- delete: 删除租户
-- suspend: 暂停授权
-- resume: 恢复授权
-- enable: 启用租户
-- disable: 禁用租户
-- renew: 续期
-- regenerate_license: 重新生成授权码
-- adjust_quota: 调整配额（用户数、存储空间）
-- adjust_package: 调整套餐
