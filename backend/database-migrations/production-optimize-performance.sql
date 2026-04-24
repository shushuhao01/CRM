-- =============================================
-- 生产环境：增值管理性能优化SQL
-- 解决加载慢的问题
-- 执行时间：约1-5分钟（取决于数据量）
-- =============================================

-- ========== 第1步：添加 order_id 索引 ==========
-- 用途：加速同步检查
-- 如果报错"索引已存在"，跳过即可
ALTER TABLE `value_added_orders` ADD INDEX `idx_order_id` (`order_id`);


-- ========== 第2步：添加 order_date 索引 ==========
-- 用途：加速日期筛选
ALTER TABLE `value_added_orders` ADD INDEX `idx_order_date` (`order_date`);


-- ========== 第3步：添加 order_status 索引 ==========
-- 用途：加速订单状态筛选
ALTER TABLE `value_added_orders` ADD INDEX `idx_order_status` (`order_status`);


-- ========== 第4步：添加 customer_name 索引 ==========
-- 用途：加速客户名称搜索
ALTER TABLE `value_added_orders` ADD INDEX `idx_customer_name` (`customer_name`);


-- ========== 第5步：添加 status+date 复合索引 ==========
-- 用途：加速标签页+日期筛选
ALTER TABLE `value_added_orders` ADD INDEX `idx_status_date` (`status`, `order_date`);


-- ========== 第6步：添加 settlement_status+date 复合索引 ==========
-- 用途：加速结算状态+日期筛选
ALTER TABLE `value_added_orders` ADD INDEX `idx_settlement_date` (`settlement_status`, `order_date`);


-- ========== 第7步：添加 company_id+date 复合索引 ==========
-- 用途：加速公司+日期筛选
ALTER TABLE `value_added_orders` ADD INDEX `idx_company_date` (`company_id`, `order_date`);


-- ========== 第8步：更新统计信息 ==========
-- 用途：让MySQL优化器使用最新的索引统计
ANALYZE TABLE `value_added_orders`;


-- ========== 第9步：验证索引 ==========
-- 查看所有索引
SHOW INDEX FROM `value_added_orders`;


-- =============================================
-- 执行完成！
-- 
-- 预期效果：
-- - 首次加载：从 15-30秒 降到 1-3秒（提升 10-30倍）
-- - 切换标签页：从 3-8秒 降到 0.3-1秒（提升 10倍）
-- - 日期筛选：从 5-10秒 降到 0.5-1.5秒（提升 10倍）
-- - 分页查询：从 3-8秒 降到 0.3-1秒（提升 10倍）
-- 
-- 注意事项：
-- 1. 如果某条SQL报错说索引已存在，跳过即可
-- 2. 索引创建可能需要1-5分钟（取决于数据量）
-- 3. 执行完成后刷新页面测试
-- =============================================
