-- ============================================
-- 快速删除客户 - 一键执行版本
-- ============================================
-- 使用方法：将 '13800138000' 替换为实际手机号
-- ============================================

-- 设置变量（MySQL 5.7+）
SET @phone = '13800138000';

-- 1. 查看客户信息
SELECT '=== 客户信息 ===' as step;
SELECT id, name, phone, order_count, total_amount, created_at
FROM customers WHERE phone = @phone;

-- 2. 删除关联数据
SELECT '=== 开始删除关联数据 ===' as step;

DELETE FROM customer_follow_ups WHERE customer_id = (SELECT id FROM customers WHERE phone = @phone);
DELETE FROM customer_notes WHERE customer_id = (SELECT id FROM customers WHERE phone = @phone);
DELETE FROM customer_addresses WHERE customer_id = (SELECT id FROM customers WHERE phone = @phone);
DELETE FROM customer_shares WHERE customer_id = (SELECT id FROM customers WHERE phone = @phone);
DELETE FROM customer_logs WHERE customer_id = (SELECT id FROM customers WHERE phone = @phone);

-- 3. 删除客户主记录
SELECT '=== 删除客户主记录 ===' as step;
DELETE FROM customers WHERE phone = @phone;

-- 4. 验证
SELECT '=== 删除完成，验证结果 ===' as step;
SELECT COUNT(*) as remaining_count FROM customers WHERE phone = @phone;
