-- =============================================
-- 增值管理性能优化SQL（宝塔phpMyAdmin兼容版）
-- 逐条复制执行，不要一次性全部执行
-- =============================================

-- ========== 第1步：添加 order_id 索引 ==========
ALTER TABLE `value_added_orders` ADD KEY `idx_order_id` (`order_id`);

-- ========== 第2步：添加 order_date 索引 ==========
ALTER TABLE `value_added_orders` ADD KEY `idx_order_date` (`order_date`);

-- ========== 第3步：添加 order_status 索引 ==========
ALTER TABLE `value_added_orders` ADD KEY `idx_order_status` (`order_status`);

-- ========== 第4步：添加 customer_name 索引 ==========
ALTER TABLE `value_added_orders` ADD KEY `idx_customer_name` (`customer_name`);

-- ========== 第5步：添加 status+date 复合索引 ==========
ALTER TABLE `value_added_orders` ADD KEY `idx_status_date` (`status`, `order_date`);

-- ========== 第6步：添加 settlement_status+date 复合索引 ==========
ALTER TABLE `value_added_orders` ADD KEY `idx_settlement_date` (`settlement_status`, `order_date`);

-- ========== 第7步：添加 company_id+date 复合索引 ==========
ALTER TABLE `value_added_orders` ADD KEY `idx_company_date` (`company_id`, `order_date`);

-- ========== 第8步：验证索引 ==========
SHOW INDEX FROM `value_added_orders`;

-- ========== 第9步：更新统计信息 ==========
ANALYZE TABLE `value_added_orders`;

-- =============================================
-- 执行完成！
-- 
-- 如果某条SQL报错说索引已存在，跳过即可
-- 
-- 预期效果：
-- 1. 同步检查速度提升 10-100 倍
-- 2. 日期筛选速度提升 5-50 倍
-- 3. 标签页切换速度提升 3-10 倍
-- 4. 客户搜索速度提升 5-20 倍
-- 5. 页面加载速度提升 10-30 倍
-- =============================================
