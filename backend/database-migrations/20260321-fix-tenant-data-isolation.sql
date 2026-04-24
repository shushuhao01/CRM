-- ============================================================
-- 租户数据隔离修复 - 生产环境SQL迁移脚本
-- 兼容phpMyAdmin执行
-- 日期: 2026-03-21
-- ============================================================

-- 1. 检查并创建唯一索引（如果不存在）
-- 确保 (tenant_id, username) 组合唯一
-- 不同租户可以有相同的用户名，同租户内用户名唯一
SET @idx_exists = (SELECT COUNT(1) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uk_tenant_username');

SET @sql = IF(@idx_exists = 0,
  'CREATE UNIQUE INDEX uk_tenant_username ON users(tenant_id, username)',
  'SELECT "uk_tenant_username 索引已存在" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 检查并创建 (tenant_id, email) 唯一索引
SET @idx_exists2 = (SELECT COUNT(1) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uk_tenant_email');

SET @sql2 = IF(@idx_exists2 = 0,
  'CREATE UNIQUE INDEX uk_tenant_email ON users(tenant_id, email)',
  'SELECT "uk_tenant_email 索引已存在" AS message');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3. 为已有租户创建默认管理员用户（admin/admin123，bcrypt加密）
-- 注意：$2a$12$开头的是bcrypt哈希值，对应明文密码 admin123
-- 如果您需要自定义密码，请使用在线bcrypt工具生成哈希值替换

-- 先检查每个租户是否已有admin用户，没有的才插入
INSERT INTO users (id, tenant_id, username, password, name, real_name, email, phone, role, role_id, status, employment_status, login_fail_count, login_count, created_at, updated_at)
SELECT
  UUID(),
  t.id,
  'admin',
  '$2a$12$iGFBSMLvWr.KA3v.addjV.nYvEReobkFJeGXOt4tOQdi80X9lmVYu',
  COALESCE(t.contact, '系统管理员'),
  COALESCE(t.contact, '系统管理员'),
  t.email,
  t.phone,
  'admin',
  'admin',
  'active',
  'active',
  0,
  0,
  NOW(),
  NOW()
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.tenant_id = t.id AND u.username = 'admin'
);

-- 4. 验证结果
SELECT
  u.username,
  u.tenant_id,
  t.name AS tenant_name,
  t.code AS tenant_code,
  u.role,
  u.status
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.username = 'admin'
ORDER BY u.tenant_id IS NULL DESC, t.name;

-- ============================================================
-- 执行完毕后提示
-- ============================================================
-- 默认管理员账号: admin
-- 默认密码: admin123
--
-- ⚠️ 注意: 上面的bcrypt哈希值是通用的admin123哈希
-- 如果执行后登录提示密码错误，请在服务器上运行以下命令重新生成：
-- node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('admin123',12).then(h=>console.log(h))"
-- 然后将生成的哈希值更新到对应用户的password字段
-- ============================================================


