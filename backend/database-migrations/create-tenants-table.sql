-- ============================================
-- 创建租户表（tenants）
-- 用于SaaS多租户模式
-- 执行环境：开发环境(crm_local) 和 生产环境(abc789_cn)
-- ============================================

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS `tenants`;

-- 创建租户表
CREATE TABLE `tenants` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '租户ID（UUID）',
  `name` VARCHAR(100) NOT NULL COMMENT '租户名称',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT '租户代码（唯一标识）',
  `status` ENUM('active', 'inactive', 'expired') DEFAULT 'active' COMMENT '状态：active-正常，inactive-已禁用，expired-已过期',
  `license_key` VARCHAR(100) NOT NULL UNIQUE COMMENT '授权码（用于租户登录验证）',
  `expire_date` DATETIME NULL COMMENT '过期时间（NULL表示永久有效）',
  `max_users` INT DEFAULT 10 COMMENT '最大用户数限制',
  `max_storage_gb` INT DEFAULT 10 COMMENT '最大存储空间限制（GB）',
  `contact_name` VARCHAR(50) NULL COMMENT '联系人姓名',
  `contact_phone` VARCHAR(20) NULL COMMENT '联系电话',
  `contact_email` VARCHAR(100) NULL COMMENT '联系邮箱',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_tenant_code` (`code`),
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_status` (`status`),
  INDEX `idx_expire_date` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户表';

-- 插入测试租户数据（仅用于开发环境测试）
-- 生产环境请通过Admin后台创建租户
INSERT INTO `tenants` (`id`, `name`, `code`, `status`, `license_key`, `expire_date`, `max_users`, `max_storage_gb`, `contact_name`, `contact_phone`, `contact_email`)
VALUES 
  (
    UUID(),
    '测试租户A',
    'TENANT_A',
    'active',
    'LIC-TEST-A-12345678901234567890',
    DATE_ADD(NOW(), INTERVAL 1 YEAR),
    50,
    100,
    '张三',
    '13800138000',
    'zhangsan@example.com'
  ),
  (
    UUID(),
    '测试租户B',
    'TENANT_B',
    'active',
    'LIC-TEST-B-09876543210987654321',
    DATE_ADD(NOW(), INTERVAL 1 YEAR),
    30,
    50,
    '李四',
    '13900139000',
    'lisi@example.com'
  )
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 验证表创建成功
SELECT 
  TABLE_NAME,
  TABLE_COMMENT,
  TABLE_ROWS
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tenants';

-- 验证索引创建成功
SELECT 
  INDEX_NAME,
  COLUMN_NAME,
  NON_UNIQUE
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tenants'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- 查看测试数据
SELECT 
  id,
  name,
  code,
  status,
  license_key,
  expire_date,
  max_users,
  max_storage_gb,
  created_at
FROM tenants;

-- ============================================
-- 执行说明
-- ============================================
-- 
-- 开发环境执行：
-- mysql -u abc789 -p crm_local < backend/database-migrations/create-tenants-table.sql
-- 
-- 生产环境执行（待确认后）：
-- mysql -u abc789 -p abc789_cn < backend/database-migrations/create-tenants-table.sql
-- 
-- 注意：
-- 1. 测试租户数据仅用于开发环境，生产环境请删除INSERT语句
-- 2. 生产环境的租户应通过Admin后台创建
-- 3. license_key必须唯一，建议使用Tenant.generateLicenseKey()生成
-- ============================================
