-- ============================================
-- Admin角色权限管理系统 - 数据库迁移脚本
-- 创建时间: 2026-04-04
-- 用途: 管理后台角色权限控制
-- ============================================

-- 1. 创建角色表
CREATE TABLE IF NOT EXISTS admin_roles (
  id VARCHAR(36) PRIMARY KEY COMMENT '角色ID',
  name VARCHAR(50) NOT NULL UNIQUE COMMENT '角色名称',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '角色标识码',
  description TEXT COMMENT '角色描述',
  permissions TEXT NOT NULL COMMENT '权限码列表(JSON数组)',
  is_system TINYINT(1) DEFAULT 0 COMMENT '是否系统内置角色(不可删除)',
  status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/disabled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_code (code),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理后台角色表';

-- 2. admin_users表添加role_id字段
-- 安全执行：先检查列是否已存在
SET @dbname = DATABASE();
SET @tablename = 'admin_users';
SET @columnname = 'role_id';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` VARCHAR(36) NULL COMMENT "关联角色ID(admin_roles表)" AFTER `role`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. 插入默认系统角色
INSERT INTO admin_roles (id, name, code, description, permissions, is_system, status) VALUES
(
  UUID(),
  '超级管理员',
  'super_admin',
  '拥有所有权限，不可删除',
  '["*"]',
  1,
  'active'
),
(
  UUID(),
  '运营管理员',
  'operation_admin',
  '负责日常运营管理，包括客户管理、支付管理等',
  '["dashboard:view","customer-management:view","customer-management:all:view","customer-management:all:edit","customer-management:renewal:view","private-customers:view","private-customers:list:view","private-customers:list:edit","tenant-customers:view","tenant-customers:list:view","tenant-customers:list:edit","tenant-customers:packages:view","payment:view","payment:list:view","payment:reports:view","versions:view","versions:list:view","versions:changelog:view","settings:view","settings:operation-logs:view"]',
  1,
  'active'
),
(
  UUID(),
  '销售员',
  'sales',
  '仅可查看和管理客户信息',
  '["dashboard:view","customer-management:view","customer-management:all:view","customer-management:renewal:view","private-customers:view","private-customers:list:view","tenant-customers:view","tenant-customers:list:view"]',
  1,
  'active'
),
(
  UUID(),
  '技术支持',
  'tech_support',
  '负责版本管理、模块配置、接口管理等技术支持工作',
  '["dashboard:view","modules:view","modules:list:view","modules:list:edit","modules:config:view","modules:config:edit","modules:distribute:view","modules:distribute:edit","modules:message:view","versions:view","versions:list:view","versions:upload:view","versions:upload:edit","versions:changelog:view","versions:changelog:edit","api:view","api:list:view","api:list:edit"]',
  1,
  'active'
)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

SELECT '✅ Admin角色权限管理系统迁移完成' AS result;

