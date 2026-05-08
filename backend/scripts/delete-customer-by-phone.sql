-- ============================================
-- 通过手机号删除客户信息 SQL 脚本
-- ============================================
-- 使用说明：
-- 1. 将下面的 '手机号' 替换为实际要删除的手机号
-- 2. 在宝塔面板或数据库管理工具中执行
-- 3. 建议先执行查询语句确认客户信息，再执行删除
-- ============================================

-- ============================================
-- 第一步：查询客户信息（确认要删除的客户）
-- ============================================
SELECT
    id,
    tenant_id,
    customer_code,
    name,
    phone,
    created_at,
    order_count,
    total_amount
FROM customers
WHERE phone = '手机号';

-- ============================================
-- 第二步：检查关联数据（重要！）
-- ============================================

-- 2.1 检查订单数量
SELECT COUNT(*) as order_count
FROM orders
WHERE customer_id = (SELECT id FROM customers WHERE phone = '手机号');

-- 2.2 检查售后记录
SELECT COUNT(*) as service_count
FROM service_records
WHERE customer_id = (SELECT id FROM customers WHERE phone = '手机号');

-- 2.3 检查跟进记录
SELECT COUNT(*) as followup_count
FROM customer_follow_ups
WHERE customer_id = (SELECT id FROM customers WHERE phone = '手机号');

-- ============================================
-- 第三步：删除关联数据（如果需要）
-- ============================================
-- ⚠️ 警告：以下操作会删除所有关联数据，请谨慎执行！
-- ⚠️ 建议：如果有订单数据，不要物理删除，改为将客户状态设置为"已删除"

-- 3.1 删除客户跟进记录
DELETE FROM customer_follow_ups
WHERE customer_id = (SELECT id FROM customers WHERE phone = '手机号');

-- 3.2 删除客户备注
DELETE FROM customer_notes
WHERE customer_id = (SELECT id FROM customers WHERE phone = '手机号');

-- 3.3 删除客户地址
DELETE FROM customer_addresses
WHERE customer_id = (SELECT id FROM customers WHERE phone = '手机号');

-- 3.4 删除客户分享记录
DELETE FROM customer_shares
WHERE customer_id = (SELECT id FROM customers WHERE phone = '手机号');

-- 3.5 删除客户操作日志
DELETE FROM customer_logs
WHERE customer_id = (SELECT id FROM customers WHERE phone = '手机号');

-- ============================================
-- 第四步：删除客户主记录
-- ============================================
-- ⚠️ 最后执行，确保上面的关联数据已处理
DELETE FROM customers
WHERE phone = '手机号';

-- ============================================
-- 验证删除结果
-- ============================================
SELECT COUNT(*) as remaining_count
FROM customers
WHERE phone = '手机号';
-- 应该返回 0


-- ============================================
-- 推荐方案：软删除（不物理删除，只标记为已删除）
-- ============================================
-- 如果客户有订单或重要数据，建议使用软删除：

UPDATE customers
SET
    status = 'deleted',
    remark = CONCAT(IFNULL(remark, ''), '\n[已删除于 ', NOW(), ']')
WHERE phone = '手机号';

-- 验证软删除
SELECT id, name, phone, status, remark
FROM customers
WHERE phone = '手机号';
