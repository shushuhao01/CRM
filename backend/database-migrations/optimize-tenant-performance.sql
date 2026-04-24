-- 租户系统性能优化
-- 添加复合索引以优化常见查询

-- 1. 优化租户查询
-- 租户表已有基本索引，添加复合索引优化筛选查询
ALTER TABLE `tenants` 
ADD INDEX `idx_status_license` (`status`, `license_status`),
ADD INDEX `idx_expire_date` (`expire_date`),
ADD INDEX `idx_created_at` (`created_at`);

-- 2. 优化用户查询（按租户）
-- 用户表的 tenant_id 索引应该已存在，如果没有则添加
-- 注意：如果索引已存在会报错，可以忽略
ALTER TABLE `users` 
ADD INDEX `idx_tenant_status` (`tenant_id`, `status`);

-- 3. 优化客户查询（按租户）
ALTER TABLE `customers` 
ADD INDEX `idx_tenant_created` (`tenant_id`, `created_at`);

-- 4. 优化订单查询（按租户）
ALTER TABLE `orders` 
ADD INDEX `idx_tenant_status` (`tenant_id`, `status`),
ADD INDEX `idx_tenant_created` (`tenant_id`, `created_at`);

-- 5. 优化商品查询（按租户）
ALTER TABLE `products` 
ADD INDEX `idx_tenant_status` (`tenant_id`, `status`);

-- 6. 优化租户配置查询
ALTER TABLE `tenant_settings` 
ADD INDEX `idx_tenant_key` (`tenant_id`, `key`);

-- 7. 优化租户日志查询（已在创建表时添加）
-- tenant_logs 表已有必要的索引

-- 8. 分析表以更新统计信息
ANALYZE TABLE `tenants`;
ANALYZE TABLE `users`;
ANALYZE TABLE `customers`;
ANALYZE TABLE `orders`;
ANALYZE TABLE `products`;
ANALYZE TABLE `tenant_settings`;
ANALYZE TABLE `tenant_logs`;

-- 完成！
SELECT '✅ 租户系统性能优化完成' AS message;
