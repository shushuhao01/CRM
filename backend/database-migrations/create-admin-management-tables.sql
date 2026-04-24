-- ============================================
-- 管理员用户和操作日志表创建脚本
-- 创建时间: 2026-03-06
-- 用途: Admin后台管理员用户管理和操作日志
-- ============================================

-- 管理员操作日志表
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
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员操作日志表';

