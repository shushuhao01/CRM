-- API配置表
CREATE TABLE IF NOT EXISTS api_configs (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT 'API名称',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT 'API代码',
  description TEXT COMMENT 'API描述',
  api_key VARCHAR(100) NOT NULL UNIQUE COMMENT 'API密钥',
  api_secret VARCHAR(255) NOT NULL COMMENT 'API密钥（加密）',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  rate_limit INT DEFAULT 1000 COMMENT '速率限制（次/小时）',
  allowed_ips TEXT COMMENT '允许的IP（JSON数组）',
  expires_at TIMESTAMP NULL COMMENT '过期时间',
  last_used_at TIMESTAMP NULL COMMENT '最后使用时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_api_key (api_key),
  INDEX idx_status (status),
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API配置表';

-- API调用日志表
CREATE TABLE IF NOT EXISTS api_call_logs (
  id VARCHAR(36) PRIMARY KEY,
  api_config_id VARCHAR(36) COMMENT 'API配置ID',
  api_key VARCHAR(100) COMMENT 'API密钥',
  endpoint VARCHAR(255) NOT NULL COMMENT '调用端点',
  method VARCHAR(10) NOT NULL COMMENT '请求方法',
  request_params TEXT COMMENT '请求参数',
  response_status INT COMMENT '响应状态码',
  response_time INT COMMENT '响应时间（ms）',
  ip_address VARCHAR(50) COMMENT 'IP地址',
  user_agent TEXT COMMENT 'User Agent',
  error_message TEXT COMMENT '错误信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_api_config_id (api_config_id),
  INDEX idx_api_key (api_key),
  INDEX idx_created_at (created_at),
  INDEX idx_endpoint (endpoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API调用日志表';
