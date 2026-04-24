-- 微信公众号关注用户表
CREATE TABLE IF NOT EXISTS wechat_followers (
  id VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  openid VARCHAR(100) NOT NULL UNIQUE COMMENT '微信OpenID',
  unionid VARCHAR(100) COMMENT '微信UnionID',
  
  -- 用户信息
  nickname VARCHAR(200) COMMENT '昵称',
  avatar_url VARCHAR(500) COMMENT '头像URL',
  gender TINYINT COMMENT '性别: 0未知 1男 2女',
  country VARCHAR(50) COMMENT '国家',
  province VARCHAR(50) COMMENT '省份',
  city VARCHAR(50) COMMENT '城市',
  language VARCHAR(20) COMMENT '语言',
  
  -- 关注状态
  subscribe_status TINYINT(1) DEFAULT 1 COMMENT '关注状态: 0取消关注 1已关注',
  subscribe_time DATETIME COMMENT '关注时间',
  unsubscribe_time DATETIME COMMENT '取消关注时间',
  subscribe_scene VARCHAR(50) COMMENT '关注场景',
  qr_scene VARCHAR(100) COMMENT '二维码场景值',
  qr_scene_str VARCHAR(200) COMMENT '二维码场景描述',
  
  -- 租户绑定
  tenant_id VARCHAR(36) COMMENT '绑定的租户ID',
  tenant_name VARCHAR(200) COMMENT '租户名称',
  bind_time DATETIME COMMENT '绑定时间',
  bind_status VARCHAR(20) DEFAULT 'unbound' COMMENT '绑定状态: unbound/pending/bound',
  
  -- 通知设置
  enable_notification TINYINT(1) DEFAULT 1 COMMENT '是否启用通知',
  notification_types JSON COMMENT '接收的通知类型',
  
  -- 标签和备注
  tags JSON COMMENT '用户标签',
  remark VARCHAR(200) COMMENT '备注',
  
  -- 统计信息
  message_count INT DEFAULT 0 COMMENT '发送消息数',
  last_message_time DATETIME COMMENT '最后发送消息时间',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_openid (openid),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_subscribe_status (subscribe_status),
  INDEX idx_bind_status (bind_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='微信公众号关注用户表';

-- 微信消息发送记录表
CREATE TABLE IF NOT EXISTS wechat_message_logs (
  id VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  openid VARCHAR(100) NOT NULL COMMENT '接收者OpenID',
  tenant_id VARCHAR(36) COMMENT '租户ID',
  
  -- 消息信息
  message_type VARCHAR(50) NOT NULL COMMENT '消息类型: template/text/image',
  template_id VARCHAR(100) COMMENT '模板ID',
  template_code VARCHAR(100) COMMENT '业务模板代码',
  
  -- 消息内容
  title VARCHAR(200) COMMENT '消息标题',
  content TEXT COMMENT '消息内容',
  url VARCHAR(500) COMMENT '跳转链接',
  data JSON COMMENT '模板数据',
  
  -- 发送状态
  send_status VARCHAR(20) DEFAULT 'pending' COMMENT '发送状态: pending/success/failed',
  send_time DATETIME COMMENT '发送时间',
  msgid VARCHAR(100) COMMENT '微信消息ID',
  
  -- 错误信息
  error_code VARCHAR(50) COMMENT '错误代码',
  error_message TEXT COMMENT '错误信息',
  
  -- 用户行为
  is_read TINYINT(1) DEFAULT 0 COMMENT '是否已读',
  read_time DATETIME COMMENT '阅读时间',
  is_clicked TINYINT(1) DEFAULT 0 COMMENT '是否点击',
  click_time DATETIME COMMENT '点击时间',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  INDEX idx_openid (openid),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_template_code (template_code),
  INDEX idx_send_status (send_status),
  INDEX idx_send_time (send_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='微信消息发送记录表';

-- 微信公众号配置表
CREATE TABLE IF NOT EXISTS wechat_official_account_config (
  id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  
  -- 基本配置
  app_id VARCHAR(100) NOT NULL COMMENT 'AppID',
  app_secret VARCHAR(200) NOT NULL COMMENT 'AppSecret',
  token VARCHAR(100) COMMENT 'Token',
  encoding_aes_key VARCHAR(200) COMMENT 'EncodingAESKey',
  
  -- 服务器配置
  server_url VARCHAR(500) COMMENT '服务器URL',
  message_encrypt_mode VARCHAR(20) DEFAULT 'plaintext' COMMENT '消息加密方式: plaintext/compatible/safe',
  
  -- 功能开关
  is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  auto_reply_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用自动回复',
  menu_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用自定义菜单',
  
  -- 自动回复配置
  welcome_message TEXT COMMENT '关注后欢迎语',
  default_reply TEXT COMMENT '默认回复内容',
  keyword_replies JSON COMMENT '关键词回复配置',
  
  -- 菜单配置
  menu_config JSON COMMENT '自定义菜单配置',
  
  -- 模板消息配置
  template_configs JSON COMMENT '模板消息配置',
  
  -- 统计信息
  total_followers INT DEFAULT 0 COMMENT '总关注人数',
  active_followers INT DEFAULT 0 COMMENT '当前关注人数',
  total_messages INT DEFAULT 0 COMMENT '总发送消息数',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='微信公众号配置表';

-- 插入默认配置
INSERT INTO wechat_official_account_config (id, app_id, app_secret, welcome_message, default_reply, is_enabled) VALUES
('wechat-config-001', '', '', 
'欢迎关注云客CRM！\n\n回复"绑定"可以绑定您的租户账号，接收系统通知。\n回复"帮助"查看更多功能。',
'感谢您的消息！\n\n回复"绑定"绑定账号\n回复"帮助"查看帮助\n回复"客服"联系客服',
0);

-- 微信二维码场景表
CREATE TABLE IF NOT EXISTS wechat_qrcode_scenes (
  id VARCHAR(36) PRIMARY KEY COMMENT '场景ID',
  scene_id INT UNIQUE COMMENT '场景值ID',
  scene_str VARCHAR(200) UNIQUE COMMENT '场景字符串',
  
  -- 场景信息
  scene_type VARCHAR(50) NOT NULL COMMENT '场景类型: tenant_bind/payment/register',
  scene_name VARCHAR(200) COMMENT '场景名称',
  scene_desc TEXT COMMENT '场景描述',
  
  -- 关联信息
  tenant_id VARCHAR(36) COMMENT '关联租户ID',
  related_id VARCHAR(100) COMMENT '关联业务ID',
  related_type VARCHAR(50) COMMENT '关联业务类型',
  
  -- 二维码信息
  qrcode_url VARCHAR(500) COMMENT '二维码图片URL',
  ticket VARCHAR(200) COMMENT '二维码ticket',
  expire_seconds INT COMMENT '过期时间(秒)',
  expire_time DATETIME COMMENT '过期时间',
  
  -- 统计信息
  scan_count INT DEFAULT 0 COMMENT '扫码次数',
  subscribe_count INT DEFAULT 0 COMMENT '关注次数',
  last_scan_time DATETIME COMMENT '最后扫码时间',
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/expired/disabled',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_scene_id (scene_id),
  INDEX idx_scene_str (scene_str),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='微信二维码场景表';
