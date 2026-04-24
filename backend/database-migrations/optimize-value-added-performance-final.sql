-- =============================================
-- 增值管理性能优化SQL（最终版-完全兼容宝塔）
-- 逐条复制执行
-- =============================================

-- 第1条：添加 order_id 索引
CREATE INDEX idx_order_id ON value_added_orders(order_id);

-- 第2条：添加 order_date 索引
CREATE INDEX idx_order_date ON value_added_orders(order_date);

-- 第3条：添加 order_status 索引
CREATE INDEX idx_order_status ON value_added_orders(order_status);

-- 第4条：添加 customer_name 索引
CREATE INDEX idx_customer_name ON value_added_orders(customer_name);

-- 第5条：添加 status+date 复合索引
CREATE INDEX idx_status_date ON value_added_orders(status, order_date);

-- 第6条：添加 settlement_status+date 复合索引
CREATE INDEX idx_settlement_date ON value_added_orders(settlement_status, order_date);

-- 第7条：添加 company_id+date 复合索引
CREATE INDEX idx_company_date ON value_added_orders(company_id, order_date);

-- 第8条：更新统计信息
ANALYZE TABLE value_added_orders;

-- =============================================
-- 执行完成！
-- 如果报错说索引已存在，跳过即可
-- =============================================
