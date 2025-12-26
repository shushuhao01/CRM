-- 创建移动端API相关表
-- 执行时间: 2025-12-26

-- 1. 工作手机表
CREATE TABLE IF NOT EXISTS work_phones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL COMMENT '用户ID',
  phone_number VARCHAR(20) COMMENT '手机号',
  device_id VARCHAR(100) COMMENT '设备ID',
  device_name VARCHAR(100) COMMENT '设备名称',
  device_model VARCHAR(100) COMMENT '设备型号',
  os_type VARCHAR(20) DEFAULT 'android' COMMENT '操作系统类型',
  os_version VARCHAR(50) COMMENT '操作系统版本',
  app_version VARCHAR(20) COMMENT 'APP版本',
  status ENUM('active', 'inactive') DEFAULT 'inactive' COMMENT '状态',
  online_status ENUM('online', 'offline') DEFAULT 'offline' COMMENT '在线状态',
  bind_token VARCHAR(100) COMMENT '绑定Token',
  bind_token_expires DATETIME COMMENT '绑定Token过期时间',
  last_active_at DATETIME COMMENT '最后活跃时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_id (user_id),
  KEY idx_device_id (device_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作手机表';

-- 2. 设备绑定日志表 (统一使用 device_bind_logs)
CREATE TABLE IF NOT EXISTS device_bind_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL COMMENT '用户ID',
  device_id VARCHAR(100) COMMENT '设备ID',
  phone_number VARCHAR(20) COMMENT '手机号',
  device_name VARCHAR(100) COMMENT '设备名称',
  device_model VARCHAR(100) COMMENT '设备型号',
  os_type VARCHAR(20) COMMENT '操作系统类型',
  os_version VARCHAR(50) COMMENT '操作系统版本',
  app_version VARCHAR(20) COMMENT 'APP版本',
  action VARCHAR(20) COMMENT '操作类型: binddevice/unbind',
  connection_id VARCHAR(100) COMMENT '连接ID',
  phone_id INT COMMENT '手机ID',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/connected/expired',
  expires_at DATETIME COMMENT '过期时间',
  ip_address VARCHAR(50) COMMENT 'IP地址',
  remark TEXT COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_id (user_id),
  KEY idx_device_id (device_id),
  KEY idx_connection_id (connection_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备绑定日志表';

-- 3. API接口管理表
CREATE TABLE IF NOT EXISTS api_interfaces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '接口编码',
  name VARCHAR(100) NOT NULL COMMENT '接口名称',
  description TEXT COMMENT '接口描述',
  method VARCHAR(10) NOT NULL COMMENT '请求方法',
  endpoint VARCHAR(200) NOT NULL COMMENT '接口路径',
  category VARCHAR(50) COMMENT '接口分类',
  status ENUM('enabled', 'disabled') DEFAULT 'enabled' COMMENT '状态',
  call_count INT DEFAULT 0 COMMENT '调用次数',
  success_count INT DEFAULT 0 COMMENT '成功次数',
  fail_count INT DEFAULT 0 COMMENT '失败次数',
  avg_response_time DECIMAL(10,2) DEFAULT 0 COMMENT '平均响应时间(ms)',
  last_called_at DATETIME COMMENT '最后调用时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_code (code),
  KEY idx_category (category),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API接口管理表';

-- 4. API调用日志表
CREATE TABLE IF NOT EXISTS api_call_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  interface_code VARCHAR(50) COMMENT '接口编码',
  method VARCHAR(10) COMMENT '请求方法',
  endpoint VARCHAR(200) COMMENT '接口路径',
  request_params TEXT COMMENT '请求参数',
  response_code INT COMMENT '响应状态码',
  response_time INT COMMENT '响应时间(ms)',
  success TINYINT(1) DEFAULT 0 COMMENT '是否成功',
  error_message TEXT COMMENT '错误信息',
  client_ip VARCHAR(50) COMMENT '客户端IP',
  user_agent VARCHAR(500) COMMENT 'User-Agent',
  user_id VARCHAR(50) COMMENT '用户ID',
  device_id VARCHAR(100) COMMENT '设备ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_interface_code (interface_code),
  KEY idx_user_id (user_id),
  KEY idx_created_at (created_at),
  KEY idx_success (success)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API调用日志表';

-- 5. 插入默认API接口配置
INSERT IGNORE INTO api_interfaces (code, name, description, method, endpoint, category) VALUES
('mobile_login', 'APP登录', 'APP用户登录接口', 'POST', '/api/v1/mobile/login', '认证'),
('mobile_bindqrcode', '生成绑定二维码', 'PC端生成设备绑定二维码', 'POST', '/api/v1/mobile/bindQRCode', '设备'),
('mobile_binddevice', '扫码绑定设备', 'APP扫码绑定设备', 'POST', '/api/v1/mobile/bind', '设备'),
('mobile_unbind', '解绑设备', '解绑工作手机', 'DELETE', '/api/v1/mobile/unbind', '设备'),
('mobile_device_status', '获取设备状态', '获取设备绑定状态', 'GET', '/api/v1/mobile/device/status', '设备'),
('mobile_call_status', '上报通话状态', 'APP上报通话状态', 'POST', '/api/v1/mobile/call/status', '通话'),
('mobile_call_end', '上报通话结束', 'APP上报通话结束', 'POST', '/api/v1/mobile/call/end', '通话'),
('mobile_recording_upload', '上传录音', 'APP上传通话录音', 'POST', '/api/v1/mobile/recording/upload', '通话'),
('mobile_call_followup', '提交通话跟进', 'APP提交通话跟进记录', 'POST', '/api/v1/mobile/call/followup', '通话');

SELECT '移动端API相关表创建完成' AS message;
