-- ========================================
-- 第四阶段数据库迁移 - 生产环境
-- ========================================
-- 执行时间：2026-03-03
-- 说明：创建租户日志表和性能优化索引
-- ========================================

-- 1. 创建租户操作日志表
-- ========================================

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

-- ========================================
-- 2. 性能优化索引
-- ========================================

-- 2.1 优化租户表查询
-- 注意：如果索引已存在会报错，可以忽略或先检查
ALTER TABLE `tenants` 
ADD INDEX `idx_status_license` (`status`, `license_status`);

ALTER TABLE `tenants` 
ADD INDEX `idx_expire_date` (`expire_date`);

ALTER TABLE `tenants` 
ADD INDEX `idx_created_at` (`created_at`);

-- 2.2 优化用户表查询（按租户）
ALTER TABLE `users` 
ADD INDEX `idx_tenant_status` (`tenant_id`, `status`);

-- 2.3 优化客户表查询（按租户）
ALTER TABLE `customers` 
ADD INDEX `idx_tenant_created` (`tenant_id`, `created_at`);

-- 2.4 优化订单表查询（按租户）
ALTER TABLE `orders` 
ADD INDEX `idx_tenant_status` (`tenant_id`, `status`);

ALTER TABLE `orders` 
ADD INDEX `idx_tenant_created` (`tenant_id`, `created_at`);

-- 2.5 优化商品表查询（按租户）
ALTER TABLE `products` 
ADD INDEX `idx_tenant_status` (`tenant_id`, `status`);

-- 2.6 优化租户配置表查询
-- 注意：tenant_settings 表的 key 字段名称可能不同，请根据实际情况调整
-- ALTER TABLE `tenant_settings` 
-- ADD INDEX `idx_tenant_key` (`tenant_id`, `key`);

-- ========================================
-- 3. 分析表以更新统计信息
-- ========================================

ANALYZE TABLE `tenants`;
ANALYZE TABLE `users`;
ANALYZE TABLE `customers`;
ANALYZE TABLE `orders`;
ANALYZE TABLE `products`;
ANALYZE TABLE `tenant_settings`;
ANALYZE TABLE `tenant_logs`;

-- ========================================
-- 4. 验证
-- ========================================

-- 检查 tenant_logs 表是否创建成功
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'tenant_logs';

-- 检查索引
SHOW INDEX FROM tenant_logs;

-- ========================================
-- 完成！
-- ========================================

SELECT '✅ 第四阶段数据库迁移完成' AS message;
