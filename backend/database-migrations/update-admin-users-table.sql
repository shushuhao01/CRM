-- ============================================
-- 更新admin_users表结构
-- 创建时间: 2026-03-06
-- 用途: 添加缺失字段，统一字段名称
-- ============================================

-- 添加avatar字段（如果不存在）
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) COMMENT '头像' AFTER phone;

-- 添加login_count字段（如果不存在）
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS login_count INT DEFAULT 0 COMMENT '登录次数' AFTER last_login_ip;

-- 修改status字段，添加locked状态
ALTER TABLE admin_users 
MODIFY COLUMN status ENUM('active', 'inactive', 'locked', 'disabled') DEFAULT 'active' COMMENT '状态';

-- 创建admin_operation_logs表（如果不存在）
CREATE TABLE IF NOT EXISTS admin_operation_logs (
  id VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
  admin_id VARCHAR(36) NOT NULL COMMENT '管理员ID',
  admin_name VARCHAR(50) COMMENT '管理员名称',
  operation VARCHAR(100) NOT NULL COMMENT '操作类型',
  module VARCHAR(50) COMMENT '操作模块',
  description TEXT COMMENT '操作描述',
  request_method VARCHAR(10) COMMENT '请求方法',
  request_url VARCHAR(255) COMMENT '请求URL',
  request_params TEXT COMMENT '请求参数',
  response_status INT COMMENT '响应状态码',
  ip_address VARCHAR(50) COMMENT 'IP地址',
  user_agent TEXT COMMENT 'User Agent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_admin_id (admin_id),
  INDEX idx_operation (operation),
  INDEX idx_module (module),
  INDEX idx_created_at (created_at),
  INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员操作日志表';
