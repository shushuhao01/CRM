-- ============================================================
-- 微信委托代扣审核截图用 - 模拟订阅数据
-- 租户：王老吉 (cd6a9e46-c271-40bc-b1e9-8c6c08f7998c)
-- 手机号：16815898989
-- 密码：Yunke2026
-- ============================================================

-- 1. 更新租户信息：设置密码、激活状态、延长到期日、设置套餐
UPDATE tenants SET
  password_hash = '$2a$10$9oJm0.sBgxt6kyeX/Eq6jOZFM8a1lfuTbAG6SquV5XmA8wbn2M7va',
  license_status = 'active',
  status = 'active',
  expire_date = '2027-05-15',
  package_id = 3
WHERE id = 'cd6a9e46-c271-40bc-b1e9-8c6c08f7998c';

-- 2. 更新套餐支持订阅（基础版 id=3）
UPDATE tenant_packages SET
  subscription_enabled = 1,
  subscription_channels = 'all',
  subscription_billing_cycle = 'both',
  subscription_discount_rate = 10
WHERE id = 3;

-- 3. 删除该租户旧的订阅记录（如果有）
DELETE FROM subscriptions WHERE tenant_id = 'cd6a9e46-c271-40bc-b1e9-8c6c08f7998c';

-- 4. 插入一条活跃的微信代扣订阅记录
INSERT INTO subscriptions (
  id, tenant_id, package_id, status, channel,
  wechat_contract_id, wechat_plan_id,
  amount, billing_cycle,
  next_deduct_date, last_deduct_date, sign_date,
  total_deducted, deduct_count, fail_count, source, created_at
) VALUES (
  'sub-demo-wechat-001',
  'cd6a9e46-c271-40bc-b1e9-8c6c08f7998c',
  3,
  'active',
  'wechat',
  'wx_contract_20260515001',
  'PLAN_MONTHLY_CRM',
  399.00,
  'monthly',
  '2026-06-15',
  '2026-05-15',
  '2026-04-15 10:30:00',
  798.00,
  2,
  0,
  'register',
  '2026-04-15 10:30:00'
);

-- 5. 插入扣款历史记录（让页面看起来更真实）
CREATE TABLE IF NOT EXISTS subscription_deduct_logs (
  id VARCHAR(36) PRIMARY KEY,
  subscription_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  channel ENUM('wechat','alipay') NOT NULL,
  status ENUM('pending','success','failed') DEFAULT 'pending',
  trade_no VARCHAR(100),
  deduct_date DATE,
  period_number INT DEFAULT 1,
  billing_start DATE,
  billing_end DATE,
  error_code VARCHAR(50),
  error_msg VARCHAR(500),
  retry_count INT DEFAULT 0,
  next_retry_at DATETIME,
  executed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DELETE FROM subscription_deduct_logs WHERE subscription_id = 'sub-demo-wechat-001';

INSERT INTO subscription_deduct_logs (id, subscription_id, tenant_id, amount, channel, status, trade_no, deduct_date, period_number, billing_start, billing_end, executed_at, created_at)
VALUES
('deduct-log-001', 'sub-demo-wechat-001', 'cd6a9e46-c271-40bc-b1e9-8c6c08f7998c', 399.00, 'wechat', 'success', 'WX_TXN_20260415103500', '2026-04-15', 1, '2026-04-15', '2026-05-15', '2026-04-15 10:35:00', '2026-04-15 10:35:00'),
('deduct-log-002', 'sub-demo-wechat-001', 'cd6a9e46-c271-40bc-b1e9-8c6c08f7998c', 399.00, 'wechat', 'success', 'WX_TXN_20260515103500', '2026-05-15', 2, '2026-05-15', '2026-06-15', '2026-05-15 10:35:00', '2026-05-15 10:35:00');

-- 验证数据
SELECT '=== 租户信息 ===' AS info;
SELECT id, name, phone, package_id, status, license_status, expire_date FROM tenants WHERE id = 'cd6a9e46-c271-40bc-b1e9-8c6c08f7998c';

SELECT '=== 订阅记录 ===' AS info;
SELECT id, status, channel, amount, billing_cycle, next_deduct_date, sign_date FROM subscriptions WHERE tenant_id = 'cd6a9e46-c271-40bc-b1e9-8c6c08f7998c';

SELECT '=== 扣款历史 ===' AS info;
SELECT id, amount, status, trade_no, deduct_date, period_number FROM subscription_deduct_logs WHERE subscription_id = 'sub-demo-wechat-001';
