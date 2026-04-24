-- ============================================
-- 模块管理表创建脚本
-- 创建时间: 2026-03-06
-- 用途: Admin后台模块管理功能
-- ============================================

-- 模块表
CREATE TABLE IF NOT EXISTS modules (
  id VARCHAR(36) PRIMARY KEY COMMENT '模块ID',
  name VARCHAR(100) NOT NULL COMMENT '模块名称',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '模块代码',
  description TEXT COMMENT '模块描述',
  icon VARCHAR(100) COMMENT '模块图标',
  version VARCHAR(20) COMMENT '模块版本',
  status ENUM('enabled', 'disabled') DEFAULT 'enabled' COMMENT '状态',
  is_system BOOLEAN DEFAULT FALSE COMMENT '是否系统模块',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_code (code),
  INDEX idx_status (status),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模块表';

-- 模块配置表
CREATE TABLE IF NOT EXISTS module_configs (
  id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  module_id VARCHAR(36) NOT NULL COMMENT '模块ID',
  config_key VARCHAR(100) NOT NULL COMMENT '配置键',
  config_value TEXT COMMENT '配置值',
  config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
  description VARCHAR(255) COMMENT '配置说明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
  UNIQUE KEY uk_module_key (module_id, config_key),
  INDEX idx_module_id (module_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模块配置表';

-- 插入系统默认模块
INSERT INTO modules (id, name, code, description, icon, version, status, is_system, sort_order) VALUES
(UUID(), '订单管理', 'order_management', '订单创建、审核、发货等功能', 'el-icon-document', '1.0.0', 'enabled', TRUE, 1),
(UUID(), '客户管理', 'customer_management', '客户信息管理、跟进记录', 'el-icon-user', '1.0.0', 'enabled', TRUE, 2),
(UUID(), '财务管理', 'finance_management', '代收管理、结算报表、增值服务', 'el-icon-money', '1.0.0', 'enabled', TRUE, 3),
(UUID(), '物流管理', 'logistics_management', '物流跟踪、状态更新', 'el-icon-truck', '1.0.0', 'enabled', TRUE, 4),
(UUID(), '售后管理', 'aftersales_management', '售后申请、处理流程', 'el-icon-service', '1.0.0', 'enabled', TRUE, 5),
(UUID(), '通话管理', 'call_management', '通话记录、录音管理', 'el-icon-phone', '1.0.0', 'enabled', TRUE, 6),
(UUID(), '系统管理', 'system_management', '用户、角色、权限管理', 'el-icon-setting', '1.0.0', 'enabled', TRUE, 7)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

