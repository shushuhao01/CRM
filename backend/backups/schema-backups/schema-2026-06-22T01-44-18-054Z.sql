-- 数据库结构备份
-- 时间: 2026-06-22T01:44:18.058Z
-- 数据库: crm_local
-- 表数量: 194

-- 表: admin_notification_channels
CREATE TABLE `admin_notification_channels` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '渠道类型: system/dingtalk/wecom/wechat_mp/email',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '渠道名称',
  `is_enabled` tinyint(1) DEFAULT '0' COMMENT '是否启用',
  `config_data` json DEFAULT NULL COMMENT '渠道配置数据(JSON)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `channel_type` (`channel_type`),
  KEY `idx_channel_type` (`channel_type`),
  KEY `idx_is_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理后台通知渠道配置表';

-- 表: admin_notification_rules
CREATE TABLE `admin_notification_rules` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件类型',
  `channel_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '渠道类型',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_channel` (`event_type`,`channel_type`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_channel_type` (`channel_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理后台通知规则表';

-- 表: admin_notifications
CREATE TABLE `admin_notifications` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `event_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` enum('info','success','warning','error') COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT '0',
  `related_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra_data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理后台通知记录表';

-- 表: admin_operation_logs
CREATE TABLE `admin_operation_logs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `module` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detail` text COLLATE utf8mb4_unicode_ci,
  `ip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: admin_roles
CREATE TABLE `admin_roles` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色ID',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色名称',
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色标识码',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '角色描述',
  `permissions` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限码列表(JSON数组)',
  `is_system` tinyint(1) DEFAULT '0' COMMENT '是否系统内置角色(不可删除)',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态: active/disabled',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: admin_users
CREATE TABLE `admin_users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('super_admin','admin','operator') COLLATE utf8mb4_unicode_ci DEFAULT 'operator',
  `role_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联角色ID(admin_roles表)',
  `status` enum('active','inactive','locked','disabled') COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态',
  `last_login_at` datetime DEFAULT NULL,
  `last_login_ip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: after_sales_services
CREATE TABLE `after_sales_services` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '售后ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `service_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '售后单号',
  `order_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联订单ID',
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联订单号',
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户姓名',
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户电话',
  `service_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'return' COMMENT '服务类型: return退货, exchange换货, repair维修, refund退款, complaint投诉, inquiry咨询',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '状态: pending待处理, processing处理中, resolved已解决, closed已关闭',
  `priority` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'normal' COMMENT '优先级: low低, normal普通, high高, urgent紧急',
  `reason` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '申请原因',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '详细描述',
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '商品名称',
  `product_spec` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '商品规格',
  `quantity` int DEFAULT '1' COMMENT '数量',
  `price` decimal(10,2) DEFAULT '0.00' COMMENT '金额',
  `contact_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系人姓名',
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系人电话',
  `contact_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系地址',
  `assigned_to` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '处理人姓名',
  `assigned_to_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '处理人ID',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `attachments` json DEFAULT NULL COMMENT '附件列表',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人姓名',
  `created_by_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人ID',
  `department_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属部门ID',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `expected_time` datetime DEFAULT NULL COMMENT '预计完成时间',
  `resolved_time` datetime DEFAULT NULL COMMENT '解决时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: agent_status
CREATE TABLE `agent_status` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'offline' COMMENT '坐席状态：ready-就绪，busy-忙碌，offline-离线，resting-小休',
  `busy_reason` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '忙碌原因',
  `status_changed_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '状态变更时间',
  `last_call_at` datetime DEFAULT NULL COMMENT '最后通话时间',
  `today_call_count` int DEFAULT '0' COMMENT '今日通话数',
  `today_call_duration` int DEFAULT '0' COMMENT '今日通话总时长(秒)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_tenant` (`user_id`,`tenant_id`),
  KEY `idx_agent_status_tenant` (`tenant_id`),
  KEY `idx_agent_status_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='坐席状态表';

-- 表: announcement_reads
CREATE TABLE `announcement_reads` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '记录ID',
  `announcement_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告ID',
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `read_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '阅读时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: announcements
CREATE TABLE `announcements` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID（公司公告属于租户，系统公告为NULL）',
  `source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'company' COMMENT '公告来源: system=系统公告, company=公司公告',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告标题',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告内容',
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'notice' COMMENT '公告类型: notice/update/maintenance/promotion',
  `priority` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT '状态: draft/published/archived',
  `target_roles` json DEFAULT NULL COMMENT '目标角色列表，为空表示所有人',
  `target_departments` json DEFAULT NULL COMMENT '目标部门列表，为空表示所有部门',
  `target_tenants` json DEFAULT NULL COMMENT '目标租户列表（系统公告用，NULL=全部租户）',
  `start_time` timestamp NULL DEFAULT NULL COMMENT '生效开始时间',
  `end_time` timestamp NULL DEFAULT NULL COMMENT '生效结束时间',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否置顶',
  `is_popup` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否弹窗显示',
  `is_marquee` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否横幅滚动',
  `view_count` int NOT NULL DEFAULT '0' COMMENT '查看次数',
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建者ID',
  `created_by_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建者姓名',
  `published_at` timestamp NULL DEFAULT NULL COMMENT '发布时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: api_call_logs
CREATE TABLE `api_call_logs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日志ID',
  `api_config_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'API配置ID',
  `api_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'API密钥',
  `endpoint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调用端点',
  `method` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '请求方法',
  `request_params` text COLLATE utf8mb4_unicode_ci COMMENT '请求参数',
  `response_status` int DEFAULT NULL COMMENT '响应状态码',
  `response_time` int DEFAULT NULL COMMENT '响应时间(ms)',
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
  `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT 'User Agent',
  `error_message` text COLLATE utf8mb4_unicode_ci COMMENT '错误信息',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `success` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: api_configs
CREATE TABLE `api_configs` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL COMMENT 'API名称',
  `code` varchar(50) NOT NULL COMMENT 'API代码',
  `description` text COMMENT 'API描述',
  `api_key` varchar(100) NOT NULL COMMENT 'API密钥',
  `api_secret` varchar(255) NOT NULL COMMENT 'API密钥（加密）',
  `status` enum('active','inactive') DEFAULT 'active' COMMENT '状态',
  `rate_limit` int DEFAULT '1000' COMMENT '速率限制（次/小时）',
  `allowed_ips` text COMMENT '允许的IP（JSON数组）',
  `expires_at` timestamp NULL DEFAULT NULL COMMENT '过期时间',
  `last_used_at` timestamp NULL DEFAULT NULL COMMENT '最后使用时间',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: api_interfaces
CREATE TABLE `api_interfaces` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL COMMENT '接口编码',
  `name` varchar(100) NOT NULL COMMENT '接口名称',
  `description` text COMMENT '接口描述',
  `category` varchar(50) DEFAULT 'mobile' COMMENT '接口分类：mobile-移动端,binddevice-第三方,webhook-回调',
  `endpoint` varchar(255) NOT NULL COMMENT '接口地址',
  `method` varchar(10) DEFAULT 'POST' COMMENT '请求方法',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `auth_required` tinyint(1) DEFAULT '1' COMMENT '是否需要认证',
  `rate_limit` int DEFAULT '100' COMMENT '频率限制(次/分钟)',
  `last_called_at` datetime DEFAULT NULL COMMENT '最后调用时间',
  `call_count` bigint DEFAULT '0' COMMENT '调用次数',
  `success_count` bigint DEFAULT '0' COMMENT '成功次数',
  `fail_count` bigint DEFAULT '0' COMMENT '失败次数',
  `avg_response_time` int DEFAULT '0' COMMENT '平均响应时间(ms)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_api_interfaces_code` (`code`),
  KEY `idx_api_interfaces_category` (`category`),
  KEY `idx_api_interfaces_enabled` (`is_enabled`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='API接口配置表';

-- 表: api_statistics
CREATE TABLE `api_statistics` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `api_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `api_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `call_count` bigint DEFAULT '0',
  `success_count` bigint DEFAULT '0',
  `fail_count` bigint DEFAULT '0',
  `total_time` bigint DEFAULT '0',
  `last_call_at` datetime DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_api_name` (`api_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: call_lines
CREATE TABLE `call_lines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '线路名称',
  `provider` varchar(100) DEFAULT NULL COMMENT '运营商/服务商',
  `line_number` varchar(50) DEFAULT NULL COMMENT '线路号码',
  `type` varchar(20) DEFAULT 'voip' COMMENT '线路类型：voip/pstn/sip',
  `status` enum('active','inactive','maintenance') DEFAULT 'active' COMMENT '状态',
  `max_concurrent` int DEFAULT '10' COMMENT '最大并发数',
  `current_concurrent` int DEFAULT '0' COMMENT '当前并发数',
  `cost_per_minute` decimal(10,4) DEFAULT '0.0000' COMMENT '每分钟费用',
  `config` json DEFAULT NULL COMMENT '线路配置(SIP账号等)',
  `priority` int DEFAULT '0' COMMENT '优先级',
  `description` text COMMENT '描述',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `caller_number` varchar(30) DEFAULT NULL,
  `daily_limit` int DEFAULT '1000',
  `daily_used` int DEFAULT '0',
  `total_calls` int DEFAULT '0',
  `total_duration` int DEFAULT '0',
  `success_rate` decimal(5,2) DEFAULT '0.00',
  `last_used_at` datetime DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `remark` text,
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_by` varchar(50) DEFAULT NULL,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '绉熸埛ID',
  PRIMARY KEY (`id`),
  KEY `idx_call_lines_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='外呼线路表';

-- 表: call_prospects
CREATE TABLE `call_prospects` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `call_count` int DEFAULT '0',
  `last_call_time` datetime DEFAULT NULL,
  `last_call_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_to` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `converted_customer_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `converted_at` datetime DEFAULT NULL,
  `import_batch_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人姓名',
  `deleted_at` datetime DEFAULT NULL COMMENT '删除时间（软删除）',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_phone` (`tenant_id`,`phone`),
  KEY `idx_tenant_status` (`tenant_id`,`status`),
  KEY `idx_tenant_assigned` (`tenant_id`,`assigned_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: call_recordings
CREATE TABLE `call_recordings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `call_record_id` int DEFAULT NULL COMMENT '关联通话记录ID',
  `file_name` varchar(255) NOT NULL COMMENT '文件名',
  `file_path` varchar(500) NOT NULL COMMENT '文件路径',
  `file_size` bigint DEFAULT '0' COMMENT '文件大小(字节)',
  `duration` int DEFAULT '0' COMMENT '录音时长(秒)',
  `format` varchar(20) DEFAULT 'mp3' COMMENT '文件格式',
  `storage_type` enum('local','oss','cos','s3') DEFAULT 'local' COMMENT '存储类型',
  `storage_url` varchar(500) DEFAULT NULL COMMENT '云存储URL',
  `transcription` text COMMENT '语音转文字内容',
  `transcription_status` enum('pending','processing','completed','failed') DEFAULT 'pending' COMMENT '转写状态',
  `quality_score` decimal(5,2) DEFAULT NULL COMMENT '通话质量评分',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '绉熸埛ID',
  PRIMARY KEY (`id`),
  KEY `idx_call_record` (`call_record_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_call_recordings_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通话录音表';

-- 表: call_records
CREATE TABLE `call_records` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通话ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `customer_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户姓名',
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户电话',
  `call_type` enum('outbound','inbound') COLLATE utf8mb4_unicode_ci DEFAULT 'outbound' COMMENT '通话类型：outbound-呼出，inbound-呼入',
  `call_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'connected' COMMENT '通话状态：connected-已接通，missed-未接，busy-忙线，failed-失败，rejected-拒接，pending-待处理，calling-拨号中，ringing-响铃中，dialing-拨号中，cancelled-已取消',
  `start_time` datetime DEFAULT NULL COMMENT '通话开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '通话结束时间',
  `duration` int DEFAULT '0' COMMENT '通话时长(秒)',
  `recording_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '录音文件URL',
  `has_recording` tinyint(1) DEFAULT '0' COMMENT '是否有录音',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT '通话备注',
  `call_tags` json DEFAULT NULL COMMENT '通话标签',
  `follow_up_required` tinyint(1) DEFAULT '0' COMMENT '是否需要跟进',
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作用户ID',
  `user_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作用户姓名',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `call_method` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'system' COMMENT '外呼方式：system-系统线路，mobile-工作手机，voip-网络电话，sip-SIP线路，manual-手动',
  `caller_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `line_id` int DEFAULT NULL,
  `provider_call_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hangup_cause` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recording_size` bigint DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: capacity_orders
CREATE TABLE `capacity_orders` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_no` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'order number',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'tenant id',
  `type` enum('user','storage','online_seat') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '1' COMMENT 'quantity',
  `unit_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'unit price',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'total amount',
  `billing_cycle` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'follow_package' COMMENT 'billing cycle',
  `pay_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'payment type',
  `status` enum('pending','paid','closed','refunded','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `trade_no` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'trade number',
  `paid_at` datetime DEFAULT NULL COMMENT 'paid time',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `discount_percent` decimal(5,2) DEFAULT '0.00' COMMENT '折扣百分比',
  `expire_date` datetime DEFAULT NULL COMMENT '扩容到期日',
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_no` (`order_no`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_status` (`status`),
  KEY `idx_order_no` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: capacity_price_configs
CREATE TABLE `capacity_price_configs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('user','storage','online_seat') COLLATE utf8mb4_unicode_ci NOT NULL,
  `billing_cycle` enum('monthly','yearly','permanent','follow_package') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'follow_package',
  `unit_price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '单价(每用户/每GB)',
  `min_qty` int NOT NULL DEFAULT '1' COMMENT '最小购买量',
  `max_qty` int NOT NULL DEFAULT '100' COMMENT '最大购买量',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '描述',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `discount_rules` json DEFAULT NULL COMMENT '折扣规则',
  PRIMARY KEY (`id`),
  KEY `idx_type_active` (`type`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='扩容价格配置';

-- 表: card_key_inventory
CREATE TABLE `card_key_inventory` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` varchar(36) NOT NULL COMMENT '关联商品ID',
  `card_key` varchar(255) NOT NULL COMMENT '卡密编码',
  `status` varchar(20) DEFAULT 'unused' COMMENT '状态: unused-未使用, reserved-已预占, used-已使用, claimed-已领取, expired-已过期, voided-已作废',
  `order_id` varchar(36) DEFAULT NULL COMMENT '关联订单ID（发货后填充）',
  `reserved_order_id` varchar(36) DEFAULT NULL COMMENT '预占订单ID（下单时填充）',
  `claim_token` varchar(100) DEFAULT NULL COMMENT '客户领取令牌',
  `claim_method` varchar(20) DEFAULT NULL COMMENT '领取方式: customer_self/member_send/email_send',
  `claimed_at` datetime DEFAULT NULL COMMENT '客户领取时间',
  `usage_instructions` text COMMENT '使用说明',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tenant_card_key` (`tenant_id`,`card_key`),
  KEY `idx_product_status` (`product_id`,`status`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_claim_token` (`claim_token`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='卡密库存表';

-- 表: changelogs
CREATE TABLE `changelogs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `version_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '版本ID',
  `type` enum('feature','bugfix','improvement','security','breaking') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'feature' COMMENT '类型',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '更新内容',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: cod_cancel_applications
CREATE TABLE `cod_cancel_applications` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `order_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicant_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applicant_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `original_cod_amount` decimal(10,2) NOT NULL,
  `modified_cod_amount` decimal(10,2) NOT NULL,
  `cancel_reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_proof` json DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reviewer_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewer_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `review_remark` text COLLATE utf8mb4_unicode_ci,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: commission_ladder
CREATE TABLE `commission_ladder` (
  `id` int NOT NULL AUTO_INCREMENT,
  `commission_type` enum('amount','count') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'amount' COMMENT '璁℃彁鏂瑰紡: amount-鎸変笟缁╅噾棰? count-鎸夌?鏀跺崟鏁',
  `department_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '适用部门ID，为空表示全局',
  `department_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '适用部门名称',
  `min_value` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '闃舵?璧风偣',
  `max_value` decimal(12,2) DEFAULT NULL COMMENT '闃舵?缁堢偣锛圢ULL琛ㄧず鏃犱笂闄愶級',
  `commission_rate` decimal(5,4) DEFAULT NULL COMMENT '鎻愭垚姣斾緥锛堟寜涓氱哗鏃剁敤锛屽?0.03琛ㄧず3%锛',
  `commission_per_unit` decimal(10,2) DEFAULT NULL COMMENT '鍗曚环锛堟寜鍗曟暟鏃剁敤锛屽?30琛ㄧず30鍏?鍗曪級',
  `sort_order` int DEFAULT '0' COMMENT '鎺掑簭',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '鏄?惁鍚?敤',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: commission_setting
CREATE TABLE `commission_setting` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '閰嶇疆閿',
  `setting_value` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '閰嶇疆鍊',
  `setting_desc` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '閰嶇疆璇存槑',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: customer_assignments
CREATE TABLE `customer_assignments` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分配ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户姓名',
  `from_user_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原归属人ID',
  `from_user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原归属人姓名',
  `to_user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '新归属人ID',
  `to_user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '新归属人姓名',
  `assignment_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'manual' COMMENT '分配类型: manual手动, auto自动, transfer转移',
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分配原因',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `operator_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人姓名',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_from_user` (`from_user_id`),
  KEY `idx_to_user` (`to_user_id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_type` (`assignment_type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户分配历史表';

-- 表: customer_follow_ups
CREATE TABLE `customer_follow_ups` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户ID（license.id 或 tenant.id）',
  `customer_type` enum('private','tenant') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户类型',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '跟进内容',
  `operator_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人姓名',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`,`customer_type`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户跟进记录表';

-- 表: customer_groups
CREATE TABLE `customer_groups` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分组ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分组名称',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '分组描述',
  `customer_count` int DEFAULT '0' COMMENT '客户数量',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: customer_logs
CREATE TABLE `customer_logs` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `log_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` json DEFAULT NULL,
  `operator_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_logs_tenant` (`tenant_id`),
  KEY `idx_customer_logs_customer_time` (`customer_id`,`created_at` DESC),
  KEY `idx_customer_logs_type` (`log_type`),
  KEY `idx_customer_logs_operator` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: customer_service_permissions
CREATE TABLE `customer_service_permissions` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_service_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general',
  `data_scope` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'self',
  `department_ids` json DEFAULT NULL,
  `custom_permissions` json DEFAULT NULL,
  `permission_template` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: customer_shares
CREATE TABLE `customer_shares` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分享ID(UUID)',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户姓名',
  `shared_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分享人ID',
  `shared_by_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分享人姓名',
  `shared_to` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '接收人ID',
  `shared_to_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '接收人姓名',
  `time_limit` int DEFAULT '0' COMMENT '时间限制(天,0表示永久)',
  `expire_time` timestamp NULL DEFAULT NULL COMMENT '过期时间',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态: active活跃, expired已过期, recalled已回收',
  `recall_time` timestamp NULL DEFAULT NULL COMMENT '回收时间',
  `recall_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '回收原因',
  `original_owner` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原归属人ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: customer_tags
CREATE TABLE `customer_tags` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标签ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标签名称',
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标签颜色',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '标签描述',
  `customer_count` int DEFAULT '0' COMMENT '客户数量',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: customers
CREATE TABLE `customers` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '??ID',
  `customer_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户编号',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户姓名',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '手机号',
  `wechat` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '微信号',
  `qq` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'QQ号',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱',
  `gender` enum('male','female','unknown') COLLATE utf8mb4_unicode_ci DEFAULT 'unknown' COMMENT '性别',
  `age` int DEFAULT NULL COMMENT '年龄',
  `birthday` date DEFAULT NULL COMMENT '生日',
  `id_card` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '身份证号（加密）',
  `bank_cards` json DEFAULT NULL COMMENT 'bank cards JSON array',
  `height` decimal(5,1) DEFAULT NULL COMMENT '身高(cm)',
  `weight` decimal(5,1) DEFAULT NULL COMMENT '体重(kg)',
  `address` text COLLATE utf8mb4_unicode_ci COMMENT '完整地址',
  `province` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '省份',
  `city` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '城市',
  `district` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '区县',
  `street` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '街道',
  `detail_address` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '详细地址',
  `overseas_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '境外地址',
  `company` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '公司名称',
  `industry` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '行业',
  `source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户来源',
  `level` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'normal' COMMENT '客户等级',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态',
  `follow_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '跟进状态',
  `tags` json DEFAULT NULL COMMENT '标签',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `medical_history` text COLLATE utf8mb4_unicode_ci COMMENT '疾病史',
  `improvement_goals` json DEFAULT NULL COMMENT '改善目标',
  `other_goals` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '其他改善目标',
  `order_count` int DEFAULT '0' COMMENT '订单数量',
  `return_count` int DEFAULT '0' COMMENT '退货次数',
  `total_amount` decimal(10,2) DEFAULT '0.00' COMMENT '总消费金额',
  `fan_acquisition_time` datetime DEFAULT NULL COMMENT '进粉时间',
  `last_order_time` timestamp NULL DEFAULT NULL COMMENT '最后下单时间',
  `last_contact_time` timestamp NULL DEFAULT NULL COMMENT '最后联系时间',
  `next_follow_time` timestamp NULL DEFAULT NULL COMMENT '下次跟进时间',
  `sales_person_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '销售员ID',
  `sales_person_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '销售员姓名',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '创建人ID',
  `created_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人姓名',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `other_phones` json DEFAULT NULL COMMENT '其他手机号',
  `wecom_external_userid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户唯一企微编码(USID)',
  `wecom_external_userids` json DEFAULT NULL COMMENT '多企微UserID列表',
  `custom_fields` json DEFAULT NULL COMMENT '自定义字段数据',
  `star_rating` int DEFAULT '0' COMMENT '手动星级评分(1-5)',
  `final_score` int DEFAULT '0' COMMENT '综合评分(0-100)',
  `mp_submit_count` int DEFAULT '0' COMMENT '小程序资料提交次数',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: data_records
CREATE TABLE `data_records` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '资料ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户姓名',
  `order_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '订单ID',
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '订单号',
  `type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '资料类型',
  `content` text COLLATE utf8mb4_unicode_ci COMMENT '资料内容',
  `attachments` json DEFAULT NULL COMMENT '附件',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '创建人ID',
  `created_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人姓名',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_type` (`type`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_data_records_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资料表';

-- 表: department_order_limits
CREATE TABLE `department_order_limits` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `department_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '部门ID',
  `department_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门名称',
  `order_count_enabled` tinyint(1) DEFAULT '0' COMMENT '是否启用下单次数限制',
  `max_order_count` int DEFAULT '0' COMMENT '最大下单次数',
  `single_amount_enabled` tinyint(1) DEFAULT '0' COMMENT '是否启用单笔金额限制',
  `max_single_amount` decimal(12,2) DEFAULT '0.00' COMMENT '单笔最大金额',
  `total_amount_enabled` tinyint(1) DEFAULT '0' COMMENT '是否启用累计金额限制',
  `max_total_amount` decimal(12,2) DEFAULT '0.00' COMMENT '累计最大金额',
  `min_order_amount_enabled` tinyint(1) DEFAULT '0' COMMENT '是否启用最低下单金额限制',
  `min_order_amount` decimal(12,2) DEFAULT '0.00' COMMENT '最低下单金额（订单总额低于此金额无法提交）',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '配置是否启用',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人ID',
  `created_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人姓名',
  `updated_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更新人ID',
  `updated_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更新人姓名',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tenant_department` (`tenant_id`,`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: department_subscription_configs
CREATE TABLE `department_subscription_configs` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置ID(UUID)',
  `messageType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息类型',
  `departmentId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '部门ID',
  `isEnabled` tinyint(1) DEFAULT '0' COMMENT '是否启用',
  `notificationMethods` json DEFAULT NULL COMMENT '通知方式',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`messageType`),
  KEY `idx_department` (`departmentId`),
  KEY `idx_enabled` (`isEnabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门订阅配置表';

-- 表: departments
CREATE TABLE `departments` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '部门ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '??ID',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '部门名称',
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门编码',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '部门描述',
  `parent_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上级部门ID',
  `manager_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门经理ID',
  `level` int DEFAULT '1' COMMENT '部门层级',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态',
  `member_count` int DEFAULT '0' COMMENT '成员数量',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: device_bind_logs
CREATE TABLE `device_bind_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_id` int DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绉熸埛ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `connection_id` (`connection_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_connection_id` (`connection_id`),
  KEY `idx_status` (`status`),
  KEY `idx_device_bind_logs_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: device_bindlogs
CREATE TABLE `device_bindlogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) NOT NULL,
  `user_name` varchar(100) DEFAULT NULL,
  `device_id` varchar(100) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `device_name` varchar(100) DEFAULT NULL,
  `device_model` varchar(100) DEFAULT NULL,
  `os_type` enum('android','ios') DEFAULT NULL,
  `os_version` varchar(20) DEFAULT NULL,
  `app_version` varchar(20) DEFAULT NULL,
  `action` enum('bind','unbind','online','offline') NOT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_device_bindlogs_user_id` (`user_id`),
  KEY `idx_device_bindlogs_device_id` (`device_id`),
  KEY `idx_device_bindlogs_action` (`action`),
  KEY `idx_device_bindlogs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: follow_up_records
CREATE TABLE `follow_up_records` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '跟进ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `call_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联通话ID',
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户姓名',
  `follow_up_type` enum('call','visit','email','message') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '跟进方式',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '跟进内容',
  `customer_intent` enum('high','medium','low','none') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户意向',
  `call_tags` json DEFAULT NULL COMMENT '通话标签',
  `next_follow_up_date` timestamp NULL DEFAULT NULL COMMENT '下次跟进时间',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'medium' COMMENT '优先级',
  `status` enum('pending','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '状态',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT 'remark',
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '跟进人ID',
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '跟进人姓名',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: global_call_config
CREATE TABLE `global_call_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_value` text COLLATE utf8mb4_unicode_ci,
  `config_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'string',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绉熸埛ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`),
  KEY `idx_global_call_config_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: improvement_goals
CREATE TABLE `improvement_goals` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '目标ID',
  `userId` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '目标标题',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '目标描述',
  `targetDate` date NOT NULL COMMENT '目标日期',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '状态',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绉熸埛ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: license_logs
CREATE TABLE `license_logs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `license_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` enum('verify','activate','renew','revoke','expire') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `machine_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `result` enum('success','failed') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: licenses
CREATE TABLE `licenses` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `license_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_contact` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license_type` enum('trial','perpetual','annual','monthly','community') COLLATE utf8mb4_unicode_ci DEFAULT 'trial' COMMENT '授权类型',
  `max_users` int DEFAULT '10',
  `max_storage_gb` int DEFAULT '5' COMMENT '最大存储空间(GB)',
  `user_limit_mode` enum('total','online') COLLATE utf8mb4_unicode_ci DEFAULT 'total' COMMENT '用户限制模式',
  `max_online_seats` int DEFAULT '0' COMMENT '最大在线席位数',
  `features` json DEFAULT NULL,
  `package_id` int DEFAULT NULL COMMENT '关联套餐ID',
  `package_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '套餐名称',
  `machine_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','expired','revoked','pending') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `activated_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL COMMENT '软删除时间',
  `deleted_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '删除操作人',
  `wecom_chat_archive_auth` tinyint(1) NOT NULL DEFAULT '0' COMMENT '会话存档功能授权(0=未授权,1=已授权)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: logistics
CREATE TABLE `logistics` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物流ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `order_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID',
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '订单号',
  `tracking_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物流单号',
  `company` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物流公司',
  `company_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物流公司代码',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物流状态',
  `current_location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '当前位置',
  `tracking_info` json DEFAULT NULL COMMENT '跟踪信息',
  `shipped_at` timestamp NULL DEFAULT NULL COMMENT '发货时间',
  `delivered_at` timestamp NULL DEFAULT NULL COMMENT '签收时间',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_tracking_number` (`tracking_number`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_logistics_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流表';

-- 表: logistics_api_configs
CREATE TABLE `logistics_api_configs` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置ID',
  `company_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物流公司代码(SF/ZTO/YTO/STO/YD/JTSD/EMS/JD/DBL)',
  `company_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物流公司名称',
  `app_id` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '应用ID/AppKey/PartnerId',
  `app_key` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '应用密钥/AppSecret',
  `app_secret` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '校验码/CheckWord/SecretKey',
  `customer_id` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户ID/月结账号',
  `api_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'API接口地址',
  `api_environment` enum('sandbox','production') COLLATE utf8mb4_unicode_ci DEFAULT 'sandbox' COMMENT 'API环境(sandbox-测试/production-生产)',
  `extra_config` json DEFAULT NULL COMMENT '扩展配置(JSON格式)',
  `enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用(0-禁用/1-启用)',
  `last_test_time` datetime DEFAULT NULL COMMENT '最后测试时间',
  `last_test_result` tinyint(1) DEFAULT NULL COMMENT '最后测试结果(0-失败/1-成功)',
  `last_test_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '最后测试消息',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人',
  `updated_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更新人',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绉熸埛ID',
  `support_create_order` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否支持下单生成运单号: 0=仅查询, 1=支持下单',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_logistics_api_configs_tenant_code` (`tenant_id`,`company_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: logistics_companies
CREATE TABLE `logistics_companies` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公司ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公司代码',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公司名称',
  `short_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '公司简称',
  `logo` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Logo URL',
  `website` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '官网地址',
  `tracking_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '跟踪查询地址',
  `api_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'API接口地址',
  `api_key` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'API密钥',
  `api_secret` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'API密钥',
  `contact_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系电话',
  `contact_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系邮箱',
  `service_area` text COLLATE utf8mb4_unicode_ci COMMENT '服务区域',
  `price_info` json DEFAULT NULL COMMENT '价格信息',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_logistics_companies_tenant_code` (`tenant_id`,`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: logistics_exceptions
CREATE TABLE `logistics_exceptions` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '异常ID',
  `logistics_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物流记录ID',
  `order_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID',
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单号',
  `tracking_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物流单号',
  `exception_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '异常类型',
  `exception_desc` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '异常描述',
  `exception_time` timestamp NOT NULL COMMENT '异常时间',
  `status` enum('pending','processing','resolved','closed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '处理状态',
  `handler_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '处理人ID',
  `handler_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '处理人姓名',
  `handle_time` timestamp NULL DEFAULT NULL COMMENT '处理时间',
  `handle_result` text COLLATE utf8mb4_unicode_ci COMMENT '处理结果',
  `solution` text COLLATE utf8mb4_unicode_ci COMMENT '解决方案',
  `images` json DEFAULT NULL COMMENT '相关图片',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_logistics` (`logistics_id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_tracking_number` (`tracking_number`),
  KEY `idx_exception_type` (`exception_type`),
  KEY `idx_status` (`status`),
  KEY `idx_handler` (`handler_id`),
  KEY `idx_exception_time` (`exception_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流异常记录表';

-- 表: logistics_status
CREATE TABLE `logistics_status` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '状态ID',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状态名称',
  `color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#28a745' COMMENT '状态颜色',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '状态描述',
  `isActive` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: logistics_status_history
CREATE TABLE `logistics_status_history` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '历史ID',
  `logistics_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物流记录ID',
  `order_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID',
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单号',
  `tracking_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物流单号',
  `old_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原状态',
  `new_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '新状态',
  `status_text` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '状态描述',
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '当前位置',
  `operator` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人',
  `operator_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人姓名',
  `update_source` enum('manual','auto','api') COLLATE utf8mb4_unicode_ci DEFAULT 'manual' COMMENT '更新来源',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_logistics` (`logistics_id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_tracking_number` (`tracking_number`),
  KEY `idx_new_status` (`new_status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流状态历史表';

-- 表: logistics_todos
CREATE TABLE `logistics_todos` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '待办ID',
  `logistics_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物流记录ID',
  `order_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID',
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单号',
  `tracking_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物流单号',
  `todo_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '待办类型',
  `todo_title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '待办标题',
  `todo_content` text COLLATE utf8mb4_unicode_ci COMMENT '待办内容',
  `priority` enum('low','normal','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'normal' COMMENT '优先级',
  `status` enum('pending','processing','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '状态',
  `assigned_to` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '负责人ID',
  `assigned_to_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '负责人姓名',
  `due_date` timestamp NULL DEFAULT NULL COMMENT '截止时间',
  `remind_time` timestamp NULL DEFAULT NULL COMMENT '提醒时间',
  `completed_time` timestamp NULL DEFAULT NULL COMMENT '完成时间',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '创建人ID',
  `created_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人姓名',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_logistics` (`logistics_id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_todo_type` (`todo_type`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_assigned_to` (`assigned_to`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流待办事项表';

-- 表: logistics_traces
CREATE TABLE `logistics_traces` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `logisticsTrackingId` int NOT NULL COMMENT '物流跟踪ID',
  `traceTime` datetime NOT NULL COMMENT '轨迹时间',
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '轨迹位置',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '轨迹描述',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作状态',
  `operator` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作员',
  `phone` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系电话',
  `rawData` json DEFAULT NULL COMMENT '原始数据',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: logistics_tracking
CREATE TABLE `logistics_tracking` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `trackingNo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物流单号',
  `companyCode` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物流公司代码',
  `companyName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物流公司名称',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '物流状态',
  `currentLocation` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '当前位置',
  `statusDescription` text COLLATE utf8mb4_unicode_ci COMMENT '状态描述',
  `lastUpdateTime` datetime DEFAULT NULL COMMENT '最后更新时间',
  `estimatedDeliveryTime` datetime DEFAULT NULL COMMENT '预计送达时间',
  `actualDeliveryTime` datetime DEFAULT NULL COMMENT '实际送达时间',
  `signedBy` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '签收人',
  `extraInfo` json DEFAULT NULL COMMENT '扩展信息',
  `autoSyncEnabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用自动同步',
  `nextSyncTime` datetime DEFAULT NULL COMMENT '下次同步时间',
  `syncFailureCount` int NOT NULL DEFAULT '0' COMMENT '同步失败次数',
  `lastSyncError` text COLLATE utf8mb4_unicode_ci COMMENT '最后同步错误信息',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `orderId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: logs
CREATE TABLE `logs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `level` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日志级别',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日志消息',
  `meta` text COLLATE utf8mb4_unicode_ci COMMENT '元数据',
  `userId` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户ID',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: member_login_logs
CREATE TABLE `member_login_logs` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL COMMENT '租户ID',
  `ip` varchar(45) DEFAULT NULL COMMENT '登录IP',
  `user_agent` varchar(500) DEFAULT NULL COMMENT '浏览器UA',
  `login_type` enum('password','sms_code') DEFAULT 'password' COMMENT '登录方式',
  `login_result` enum('success','failed') DEFAULT 'success' COMMENT '登录结果',
  `fail_reason` varchar(200) DEFAULT NULL COMMENT '失败原因',
  `login_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_member_tenant` (`tenant_id`),
  KEY `idx_member_login_at` (`login_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='会员登录日志表';

-- 表: message_cleanup_history
CREATE TABLE `message_cleanup_history` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cleanup_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cleaned_count` int DEFAULT '0',
  `cleanup_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `details` text COLLATE utf8mb4_unicode_ci,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绉熸埛ID',
  PRIMARY KEY (`id`),
  KEY `idx_message_cleanup_history_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: message_read_status
CREATE TABLE `message_read_status` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '记录ID',
  `message_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息ID',
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `read_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '阅读时间',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: message_subscriptions
CREATE TABLE `message_subscriptions` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订阅ID(UUID)',
  `messageType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息类型',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息名称',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '消息描述',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息分类',
  `isGlobalEnabled` tinyint(1) DEFAULT '0' COMMENT '是否全局启用',
  `globalNotificationMethods` json DEFAULT NULL COMMENT '全局通知方式',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: messages
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `senderId` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '发送者ID',
  `receiverId` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '接收者ID',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息内容',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'text' COMMENT '消息类型',
  `isRead` tinyint(1) DEFAULT '0' COMMENT '是否已读',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: migration_history
CREATE TABLE `migration_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `filename` varchar(200) NOT NULL COMMENT '迁移文件名',
  `checksum` varchar(64) DEFAULT NULL COMMENT '文件校验值',
  `execution_time` int DEFAULT NULL COMMENT '执行耗时ms',
  `success` tinyint DEFAULT '1' COMMENT '是否成功',
  `error_message` text COMMENT '错误信息',
  `executed_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: mobile_app_packages
CREATE TABLE `mobile_app_packages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `platform` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '平台: android/ios',
  `app_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '应用名称',
  `version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '版本号',
  `package_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '上传的安装包路径',
  `external_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '外部下载地址',
  `file_size` bigint DEFAULT '0' COMMENT '文件大小(字节)',
  `file_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '文件SHA256哈希',
  `download_count` int DEFAULT '0' COMMENT '下载次数',
  `is_enabled` tinyint DEFAULT '1' COMMENT '是否启用: 1启用 0禁用',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '版本说明',
  `uploaded_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '上传者',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_platform` (`platform`),
  KEY `idx_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='移动应用安装包管理';

-- 表: module_configs
CREATE TABLE `module_configs` (
  `id` varchar(36) NOT NULL COMMENT '配置ID',
  `module_id` varchar(36) NOT NULL COMMENT '模块ID',
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `config_value` text COMMENT '配置值',
  `config_type` enum('string','number','boolean','json') DEFAULT 'string' COMMENT '配置类型',
  `description` varchar(255) DEFAULT NULL COMMENT '配置说明',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: module_schemes
CREATE TABLE `module_schemes` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `target_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'all',
  `targets` text COLLATE utf8mb4_unicode_ci,
  `modules` text COLLATE utf8mb4_unicode_ci,
  `is_default` tinyint(1) DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: module_status
CREATE TABLE `module_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模块标识',
  `module_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模块名称',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '模块描述',
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '图标名称',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `disabled_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '停用原因',
  `disabled_at` datetime DEFAULT NULL COMMENT '停用时间',
  `disabled_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '停用操作人',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `module_key` (`module_key`),
  KEY `idx_module_key` (`module_key`),
  KEY `idx_is_enabled` (`is_enabled`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块状态表';

-- 表: modules
CREATE TABLE `modules` (
  `id` varchar(36) NOT NULL COMMENT '模块ID',
  `name` varchar(100) NOT NULL COMMENT '模块名称',
  `code` varchar(50) NOT NULL COMMENT '模块代码',
  `description` text COMMENT '模块描述',
  `icon` varchar(100) DEFAULT NULL COMMENT '模块图标',
  `version` varchar(20) DEFAULT NULL COMMENT '模块版本',
  `status` enum('enabled','disabled') DEFAULT 'enabled' COMMENT '状态',
  `is_system` tinyint(1) DEFAULT '0' COMMENT '是否系统模块',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: mp_card_send_logs
CREATE TABLE `mp_card_send_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '租户ID',
  `member_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '发送者企微成员ID',
  `external_user_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '接收者外部联系人ID',
  `card_title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '卡片标题',
  `card_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '小程序路径',
  `sent_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_member` (`member_id`),
  KEY `idx_sent` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小程序卡片发送日志';

-- 表: mp_form_submissions
CREATE TABLE `mp_form_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '租户ID',
  `member_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '发送卡片的企微成员ID',
  `external_user_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '企微外部联系人ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户填写的姓名',
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户手机号',
  `customer_gender` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '性别',
  `customer_age` int DEFAULT NULL COMMENT '年龄',
  `province` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '省',
  `city` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '市',
  `district` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '区',
  `detail_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '详细地址',
  `custom_fields` text COLLATE utf8mb4_unicode_ci COMMENT '自定义字段数据(JSON)',
  `phone_source` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'manual' COMMENT '手机号来源: wechat_auth / manual',
  `form_sign` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '表单签名',
  `submitted_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  `synced_to_crm` tinyint(1) DEFAULT '0' COMMENT '是否已同步到CRM',
  `synced_at` datetime DEFAULT NULL COMMENT '同步时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_member` (`member_id`),
  KEY `idx_phone` (`customer_phone`),
  KEY `idx_submitted` (`submitted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小程序表单提交记录';

-- 表: notification_channels
CREATE TABLE `notification_channels` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '通知渠道类型',
  `config` json DEFAULT NULL,
  `is_enabled` tinyint DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `message_types` json DEFAULT NULL COMMENT '支持的消息类型列表',
  `target_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'all' COMMENT '通知对象类型',
  `target_departments` json DEFAULT NULL COMMENT '目标部门列表',
  `target_users` json DEFAULT NULL COMMENT '目标用户列表',
  `target_roles` json DEFAULT NULL COMMENT '目标角色列表',
  `priority_filter` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'all' COMMENT '优先级过滤',
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建者ID',
  `created_by_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建者姓名',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: notification_logs
CREATE TABLE `notification_logs` (
  `id` varchar(36) NOT NULL,
  `channel_id` varchar(36) NOT NULL COMMENT '通知渠道ID',
  `channel_type` varchar(50) NOT NULL COMMENT '通知渠道类型',
  `message_type` varchar(50) NOT NULL COMMENT '消息类型',
  `title` varchar(200) NOT NULL COMMENT '消息标题',
  `content` text NOT NULL COMMENT '消息内容',
  `target_users` json DEFAULT NULL COMMENT '目标用户列表',
  `status` varchar(20) DEFAULT 'pending' COMMENT '发送状态',
  `response` text COMMENT '第三方API响应',
  `error_message` text COMMENT '错误信息',
  `sent_at` timestamp NULL DEFAULT NULL COMMENT '发送时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: notification_templates
CREATE TABLE `notification_templates` (
  `id` varchar(36) NOT NULL COMMENT '模板ID',
  `template_code` varchar(100) NOT NULL COMMENT '模板代码',
  `template_name` varchar(200) NOT NULL COMMENT '模板名称',
  `template_type` varchar(50) NOT NULL COMMENT '模板类型: email/sms/both',
  `category` varchar(50) NOT NULL COMMENT '业务分类',
  `scene` varchar(100) NOT NULL COMMENT '使用场景',
  `email_subject` varchar(200) DEFAULT NULL COMMENT '邮件主题',
  `email_content` text COMMENT '邮件内容',
  `sms_content` varchar(500) DEFAULT NULL COMMENT '短信内容',
  `sms_template_code` varchar(100) DEFAULT NULL COMMENT '短信服务商模板代码',
  `variables` json DEFAULT NULL COMMENT '可用变量列表',
  `variable_description` text COMMENT '变量说明文档',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `is_system` tinyint(1) DEFAULT '0' COMMENT '是否系统模板',
  `priority` varchar(20) DEFAULT 'normal' COMMENT '优先级',
  `send_email` tinyint(1) DEFAULT '1' COMMENT '是否发送邮件',
  `send_sms` tinyint(1) DEFAULT '0' COMMENT '是否发送短信',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '绉熸埛ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: notifications
CREATE TABLE `notifications` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息类型',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息标题',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息内容',
  `userId` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unread',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: operation_logs
CREATE TABLE `operation_logs` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日志ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作用户ID',
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作用户姓名',
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型',
  `module` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '模块',
  `resource_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '资源类型',
  `resource_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '资源ID',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '操作描述',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
  `user_agent` text COLLATE utf8mb4_unicode_ci COMMENT '用户代理',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: order_audits
CREATE TABLE `order_audits` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '审核ID',
  `order_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID',
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单号',
  `audit_type` enum('create','modify','cancel','return') COLLATE utf8mb4_unicode_ci DEFAULT 'create' COMMENT '审核类型',
  `audit_status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '审核状态',
  `audit_level` int DEFAULT '1' COMMENT '审核级别',
  `auditor_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审核人ID',
  `auditor_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审核人姓名',
  `audit_time` timestamp NULL DEFAULT NULL COMMENT '审核时间',
  `audit_result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审核结果',
  `audit_remark` text COLLATE utf8mb4_unicode_ci COMMENT '审核备注',
  `before_data` json DEFAULT NULL COMMENT '修改前数据',
  `after_data` json DEFAULT NULL COMMENT '修改后数据',
  `applicant_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '申请人ID',
  `applicant_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '申请人姓名',
  `apply_reason` text COLLATE utf8mb4_unicode_ci COMMENT '申请原因',
  `apply_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_audit_type` (`audit_type`),
  KEY `idx_audit_status` (`audit_status`),
  KEY `idx_auditor` (`auditor_id`),
  KEY `idx_applicant` (`applicant_id`),
  KEY `idx_apply_time` (`apply_time`),
  KEY `idx_order_audits_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单审核记录表';

-- 表: order_field_configs
CREATE TABLE `order_field_configs` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置ID',
  `field_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字段键名',
  `field_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字段名称',
  `field_type` enum('text','number','date','datetime','select','radio','checkbox') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字段类型',
  `field_options` json DEFAULT NULL COMMENT '字段选项',
  `default_value` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '默认值',
  `placeholder` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '占位符',
  `is_required` tinyint(1) DEFAULT '0' COMMENT '是否必填',
  `is_visible` tinyint(1) DEFAULT '1' COMMENT '是否可见',
  `show_in_list` tinyint(1) DEFAULT '0' COMMENT '列表显示',
  `show_in_detail` tinyint(1) DEFAULT '1' COMMENT '详情显示',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `validation_rules` json DEFAULT NULL COMMENT '验证规则',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '字段描述',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `field_key` (`field_key`),
  KEY `idx_field_key` (`field_key`),
  KEY `idx_is_visible` (`is_visible`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_order_field_configs_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单字段配置表';

-- 表: order_items
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `productName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品名称（快照）',
  `productSku` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品SKU（快照）',
  `unitPrice` decimal(10,2) NOT NULL COMMENT '单价（快照）',
  `quantity` int NOT NULL COMMENT '数量',
  `subtotal` decimal(10,2) NOT NULL COMMENT '小计金额',
  `discountAmount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '优惠金额',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `productImage` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品图片URL（快照）',
  `orderId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID',
  `productId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: order_status_history
CREATE TABLE `order_status_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状态',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT '状态变更备注',
  `operatorId` int DEFAULT NULL COMMENT '操作人ID',
  `operatorName` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人姓名',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `operatorDepartment` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人部门',
  `actionType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作类型：status_change/edit/audit/cancel/shipment/create等',
  `changeDetail` text COLLATE utf8mb4_unicode_ci COMMENT '变更详情JSON',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: orders
CREATE TABLE `orders` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单号',
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户姓名',
  `customer_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户电话',
  `service_wechat` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客服微信号',
  `order_source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '订单来源',
  `products` json DEFAULT NULL COMMENT '商品列表',
  `total_amount` decimal(10,2) NOT NULL COMMENT '订单总金额',
  `discount_amount` decimal(10,2) DEFAULT '0.00' COMMENT '优惠金额',
  `final_amount` decimal(10,2) NOT NULL COMMENT '实付金额',
  `deposit_amount` decimal(10,2) DEFAULT '0.00' COMMENT '定金金额',
  `deposit_screenshots` json DEFAULT NULL COMMENT '定金截图',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '订单状态',
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'unpaid' COMMENT '支付状态',
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '支付方式',
  `payment_method_other` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '其他支付方式说明',
  `payment_time` timestamp NULL DEFAULT NULL COMMENT '支付时间',
  `shipping_address` text COLLATE utf8mb4_unicode_ci COMMENT '收货地址',
  `shipping_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '收货电话',
  `shipping_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '收货人',
  `express_company` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '快递公司',
  `tracking_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '快递单号',
  `shipping_time` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '发货时间字符串',
  `expected_delivery_date` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '预计送达日期',
  `shipped_at` timestamp NULL DEFAULT NULL COMMENT '发货时间',
  `delivered_at` timestamp NULL DEFAULT NULL COMMENT '签收时间',
  `cancelled_at` timestamp NULL DEFAULT NULL COMMENT '取消时间',
  `cancel_reason` text COLLATE utf8mb4_unicode_ci COMMENT '取消原因',
  `refund_amount` decimal(10,2) DEFAULT '0.00' COMMENT '退款金额',
  `refund_reason` text COLLATE utf8mb4_unicode_ci COMMENT '退款原因',
  `refund_time` timestamp NULL DEFAULT NULL COMMENT '退款时间',
  `invoice_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '发票类型',
  `invoice_title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '发票抬头',
  `invoice_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '发票号码',
  `mark_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'normal' COMMENT '订单标记类型',
  `logistics_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '物流状态',
  `latest_logistics_info` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '最新物流动态',
  `is_todo` tinyint(1) DEFAULT '0' COMMENT '是否待办',
  `todo_date` date DEFAULT NULL COMMENT '待办日期',
  `todo_remark` text COLLATE utf8mb4_unicode_ci COMMENT '待办备注',
  `custom_fields` json DEFAULT NULL COMMENT '自定义字段(旧版，保留兼容)',
  `custom_field1` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '自定义字段1',
  `custom_field2` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '自定义字段2',
  `custom_field3` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '自定义字段3',
  `custom_field4` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '自定义字段4',
  `custom_field5` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '自定义字段5',
  `custom_field6` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '自定义字段6',
  `custom_field7` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '自定义字段7',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '订单备注',
  `operator_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作员ID',
  `operator_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作员姓名',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '创建人ID',
  `created_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人姓名',
  `created_by_department_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人部门ID',
  `created_by_department_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人部门名称',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `status_updated_at` timestamp NULL DEFAULT NULL COMMENT '状态更新时间（记录最后一次状态变更的时间）',
  `performance_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '缁╂晥鐘舵?: pending-寰呭?鐞? valid-鏈夋晥, invalid-鏃犳晥',
  `performance_coefficient` decimal(3,2) DEFAULT '1.00' COMMENT '缁╂晥绯绘暟: 0-1',
  `performance_remark` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '缁╂晥澶囨敞',
  `estimated_commission` decimal(10,2) DEFAULT '0.00' COMMENT '棰勪及浣ｉ噾',
  `performance_updated_at` datetime DEFAULT NULL COMMENT '缁╂晥鏇存柊鏃堕棿',
  `performance_updated_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '缁╂晥鏇存柊浜篒D',
  `cod_amount` decimal(10,2) DEFAULT '0.00' COMMENT '代收金额',
  `cod_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '代收状态: pending-未返款, returned-已返款, cancelled-已取消代收',
  `cod_returned_amount` decimal(10,2) DEFAULT '0.00' COMMENT '已返款金额',
  `cod_returned_at` datetime DEFAULT NULL COMMENT '返款时间',
  `cod_returned_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '返款操作人ID',
  `cod_returned_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '返款操作人姓名',
  `cod_cancelled_at` datetime DEFAULT NULL COMMENT '取消代收时间',
  `cod_cancelled_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '改代收操作人ID',
  `cod_cancelled_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '改代收操作人姓名',
  `cod_remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '代收备注',
  `order_product_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'physical' COMMENT '订单商品类型: physical-普通, virtual-虚拟, mixed-混合',
  `completion_source` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '完成来源: audit_auto_complete/virtual_delivery/logistics_delivery',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: outbound_tasks
CREATE TABLE `outbound_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL COMMENT '任务名称',
  `type` enum('single','batch','scheduled') DEFAULT 'single' COMMENT '任务类型',
  `status` enum('pending','running','paused','completed','cancelled') DEFAULT 'pending' COMMENT '任务状态',
  `priority` int DEFAULT '0' COMMENT '优先级',
  `assigned_user_id` int DEFAULT NULL COMMENT '分配的用户ID',
  `customer_id` int DEFAULT NULL COMMENT '客户ID',
  `phone_number` varchar(20) DEFAULT NULL COMMENT '目标号码',
  `call_line_id` int DEFAULT NULL COMMENT '使用的线路ID',
  `scheduled_time` datetime DEFAULT NULL COMMENT '计划执行时间',
  `started_at` datetime DEFAULT NULL COMMENT '开始时间',
  `completed_at` datetime DEFAULT NULL COMMENT '完成时间',
  `total_calls` int DEFAULT '0' COMMENT '总呼叫数',
  `successful_calls` int DEFAULT '0' COMMENT '成功呼叫数',
  `failed_calls` int DEFAULT '0' COMMENT '失败呼叫数',
  `retry_count` int DEFAULT '0' COMMENT '重试次数',
  `max_retries` int DEFAULT '3' COMMENT '最大重试次数',
  `notes` text COMMENT '备注',
  `result` text COMMENT '任务结果',
  `created_by` int DEFAULT NULL COMMENT '创建人ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenant_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_assigned_user` (`assigned_user_id`),
  KEY `idx_scheduled_time` (`scheduled_time`),
  KEY `idx_outbound_tasks_tenant_id` (`tenant_id`),
  KEY `idx_outbound_tasks_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='外呼任务表';

-- 表: outsource_companies
CREATE TABLE `outsource_companies` (
  `id` varchar(50) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '租户ID',
  `company_name` varchar(200) NOT NULL,
  `contact_person` varchar(50) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `is_default` tinyint DEFAULT '0' COMMENT '是否默认公司: 0-否, 1-是',
  `sort_order` int DEFAULT '999' COMMENT '排序顺序',
  `total_orders` int DEFAULT '0',
  `valid_orders` int DEFAULT '0',
  `invalid_orders` int DEFAULT '0',
  `total_amount` decimal(12,2) DEFAULT '0.00',
  `settled_amount` decimal(12,2) DEFAULT '0.00',
  `remark` text,
  `created_by` varchar(50) DEFAULT NULL,
  `created_by_name` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: packages
CREATE TABLE `packages` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '套餐ID',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '套餐名称',
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '套餐代码（唯一标识）',
  `type` enum('saas','private') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'saas' COMMENT '套餐类型：saas-SaaS云端版，private-私有部署版',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '套餐描述',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '价格',
  `original_price` decimal(10,2) DEFAULT NULL COMMENT '原价（用于显示折扣）',
  `billing_cycle` enum('monthly','yearly','once') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly' COMMENT '计费周期：monthly-月付，yearly-年付，once-一次性',
  `yearly_discount_rate` decimal(5,2) DEFAULT '0.00' COMMENT '年付折扣率（0-100，例如20表示8折）',
  `yearly_bonus_months` int DEFAULT '0' COMMENT '年付赠送月数',
  `yearly_price` decimal(10,2) DEFAULT NULL COMMENT '年付价格（如果为NULL则自动计算）',
  `duration_days` int NOT NULL DEFAULT '30' COMMENT '有效期（天）',
  `max_users` int NOT NULL DEFAULT '10' COMMENT '最大用户数',
  `max_storage_gb` int NOT NULL DEFAULT '5' COMMENT '最大存储空间（GB）',
  `features` json DEFAULT NULL COMMENT '功能特性列表（JSON数组）',
  `is_trial` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否为试用套餐',
  `is_recommended` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否为推荐套餐',
  `is_visible` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否在官网显示',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序（数字越小越靠前）',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态：1-启用，0-禁用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐管理表';

-- 表: payment_configs
CREATE TABLE `payment_configs` (
  `id` varchar(36) NOT NULL,
  `pay_type` varchar(20) NOT NULL COMMENT '鏀?粯绫诲瀷: wechat/alipay',
  `enabled` tinyint(1) DEFAULT '0' COMMENT '鏄?惁鍚?敤',
  `config_data` text COMMENT '閰嶇疆鏁版嵁(JSON鍔犲瘑瀛樺偍)',
  `notify_url` varchar(500) DEFAULT NULL COMMENT '鍥炶皟鍦板潃',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pay_type` (`pay_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='鏀?粯閰嶇疆琛';

-- 表: payment_logs
CREATE TABLE `payment_logs` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) NOT NULL COMMENT '璁㈠崟ID',
  `order_no` varchar(64) NOT NULL COMMENT '璁㈠崟鍙',
  `action` varchar(50) NOT NULL COMMENT '鎿嶄綔绫诲瀷: create/pay/notify/refund/close',
  `pay_type` varchar(20) DEFAULT NULL COMMENT '鏀?粯鏂瑰紡',
  `request_data` text COMMENT '璇锋眰鏁版嵁',
  `response_data` text COMMENT '鍝嶅簲鏁版嵁',
  `result` varchar(20) DEFAULT NULL COMMENT '缁撴灉: success/fail',
  `error_msg` varchar(500) DEFAULT NULL COMMENT '閿欒?淇℃伅',
  `ip` varchar(50) DEFAULT NULL COMMENT 'IP鍦板潃',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='鏀?粯鏃ュ織琛';

-- 表: payment_method_options
CREATE TABLE `payment_method_options` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '显示名称',
  `value` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '选项值',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序顺序',
  `is_enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `is_system` tinyint(1) DEFAULT '0' COMMENT '是否系统预设（不可删除）',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tenant_value` (`tenant_id`,`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: payment_orders
CREATE TABLE `payment_orders` (
  `id` varchar(36) NOT NULL,
  `order_no` varchar(64) NOT NULL COMMENT '璁㈠崟鍙',
  `customer_type` varchar(20) DEFAULT 'tenant' COMMENT '瀹㈡埛绫诲瀷: tenant/private',
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '绉熸埛ID',
  `license_id` varchar(36) DEFAULT NULL COMMENT '绉佹湁瀹㈡埛鎺堟潈ID',
  `tenant_name` varchar(100) DEFAULT NULL COMMENT '绉熸埛鍚嶇О',
  `package_id` varchar(36) DEFAULT NULL COMMENT '濂楅?ID',
  `package_name` varchar(100) DEFAULT NULL COMMENT '濂楅?鍚嶇О',
  `amount` decimal(10,2) NOT NULL COMMENT '鏀?粯閲戦?',
  `pay_type` varchar(20) DEFAULT NULL COMMENT '鏀?粯鏂瑰紡: wechat/alipay',
  `billing_cycle` varchar(20) DEFAULT 'monthly' COMMENT '璁¤垂鍛ㄦ湡: monthly/yearly/once',
  `bonus_months` int DEFAULT '0' COMMENT '赠送月数（年付套餐）',
  `status` varchar(20) DEFAULT 'pending' COMMENT '璁㈠崟鐘舵?: pending/paid/expired/refunded/closed',
  `trade_no` varchar(64) DEFAULT NULL COMMENT '绗?笁鏂逛氦鏄撳彿',
  `qr_code` text COMMENT '鏀?粯浜岀淮鐮?base64)',
  `pay_url` varchar(500) DEFAULT NULL COMMENT '鏀?粯閾炬帴',
  `contact_name` varchar(50) DEFAULT NULL COMMENT '鑱旂郴浜',
  `contact_phone` varchar(20) DEFAULT NULL COMMENT '鑱旂郴鐢佃瘽',
  `contact_email` varchar(100) DEFAULT NULL COMMENT '鑱旂郴閭??',
  `expire_time` datetime DEFAULT NULL COMMENT '璁㈠崟杩囨湡鏃堕棿',
  `paid_at` datetime DEFAULT NULL COMMENT '鏀?粯鏃堕棿',
  `refund_amount` decimal(10,2) DEFAULT '0.00' COMMENT '閫??閲戦?',
  `refund_at` datetime DEFAULT NULL COMMENT '閫??鏃堕棿',
  `refund_reason` varchar(500) DEFAULT NULL COMMENT '閫??鍘熷洜',
  `remark` varchar(500) DEFAULT NULL COMMENT '澶囨敞',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `refunded_by` varchar(100) DEFAULT NULL COMMENT '退款操作人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_license_id` (`license_id`),
  KEY `idx_customer_type` (`customer_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='鏀?粯璁㈠崟琛';

-- 表: payment_records
CREATE TABLE `payment_records` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenant_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `pay_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'wechat',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `transaction_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `refunded_at` datetime DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: performance_config
CREATE TABLE `performance_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '閰嶇疆绫诲瀷: status-鏈夋晥鐘舵?, coefficient-绯绘暟, remark-澶囨敞',
  `config_value` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '閰嶇疆鍊',
  `config_label` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '鏄剧ず鏍囩?',
  `sort_order` int DEFAULT '0' COMMENT '鎺掑簭',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '鏄?惁鍚?敤',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: performance_metrics
CREATE TABLE `performance_metrics` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '指标ID',
  `userId` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `metricType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '指标类型',
  `value` decimal(10,2) NOT NULL COMMENT '指标值',
  `date` date NOT NULL COMMENT '日期',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: performance_records
CREATE TABLE `performance_records` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '业绩ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户姓名',
  `department_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门ID',
  `department_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门名称',
  `order_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '订单ID',
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '订单号',
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户姓名',
  `product_category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品分类',
  `amount` decimal(10,2) NOT NULL COMMENT '业绩金额',
  `commission_rate` decimal(5,2) DEFAULT '0.00' COMMENT '提成比例',
  `commission_amount` decimal(10,2) DEFAULT '0.00' COMMENT '提成金额',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'order' COMMENT '业绩类型',
  `status` enum('pending','confirmed','paid','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '状态',
  `confirmed_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '确认人ID',
  `confirmed_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '确认人姓名',
  `confirmed_at` timestamp NULL DEFAULT NULL COMMENT '确认时间',
  `paid_at` timestamp NULL DEFAULT NULL COMMENT '支付时间',
  `date` date NOT NULL COMMENT '业绩日期',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_department` (`department_id`),
  KEY `idx_order` (`order_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_date` (`date`),
  KEY `idx_type` (`type`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_performance_tenant_user` (`tenant_id`,`user_id`),
  KEY `idx_performance_tenant_date` (`tenant_id`,`date`),
  KEY `idx_performance_records_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩表';

-- 表: performance_report_configs
CREATE TABLE `performance_report_configs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置名称',
  `is_enabled` tinyint DEFAULT '1' COMMENT '是否启用',
  `send_frequency` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'daily' COMMENT '发送频率',
  `send_time` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '09:00' COMMENT '发送时间',
  `send_days` json DEFAULT NULL COMMENT '发送日期',
  `repeat_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'workday' COMMENT '重复类型',
  `report_types` json NOT NULL COMMENT '报表类型列表',
  `message_format` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'text' COMMENT '消息格式',
  `channel_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知渠道',
  `webhook` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Webhook地址',
  `secret` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '加签密钥',
  `view_scope` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'company' COMMENT '视角',
  `target_departments` json DEFAULT NULL COMMENT '目标部门列表',
  `include_monthly` tinyint DEFAULT '1' COMMENT '是否包含月累计',
  `include_ranking` tinyint DEFAULT '1' COMMENT '是否包含排名',
  `ranking_limit` int DEFAULT '10' COMMENT '排名显示数量',
  `last_sent_at` timestamp NULL DEFAULT NULL COMMENT '上次发送时间',
  `last_sent_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上次发送状态',
  `last_sent_message` text COLLATE utf8mb4_unicode_ci COMMENT '上次发送结果信息',
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建者ID',
  `created_by_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建者姓名',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: performance_report_logs
CREATE TABLE `performance_report_logs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_date` date NOT NULL,
  `report_data` json DEFAULT NULL,
  `channel_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `response` text COLLATE utf8mb4_unicode_ci,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: performance_share_members
CREATE TABLE `performance_share_members` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '成员ID',
  `share_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分享记录ID',
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户姓名',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属部门',
  `share_percentage` decimal(5,2) NOT NULL COMMENT '分享比例',
  `share_amount` decimal(10,2) NOT NULL COMMENT '分享金额',
  `status` enum('pending','confirmed','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '确认状态',
  `confirm_time` timestamp NULL DEFAULT NULL COMMENT '确认时间',
  `reject_reason` text COLLATE utf8mb4_unicode_ci COMMENT '拒绝原因',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_share` (`share_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_performance_share_members_tenant_id` (`tenant_id`),
  CONSTRAINT `performance_share_members_ibfk_1` FOREIGN KEY (`share_id`) REFERENCES `performance_shares` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩分享成员表';

-- 表: performance_shares
CREATE TABLE `performance_shares` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分享ID',
  `share_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分享编号',
  `order_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单ID',
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单号',
  `order_amount` decimal(10,2) NOT NULL COMMENT '订单金额',
  `total_share_amount` decimal(10,2) NOT NULL COMMENT '总分享金额',
  `share_count` int DEFAULT '0' COMMENT '分享人数',
  `status` enum('active','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '分享说明',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '创建人ID',
  `created_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人姓名',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT '完成时间',
  `cancelled_at` timestamp NULL DEFAULT NULL COMMENT '取消时间',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `share_number` (`share_number`),
  KEY `idx_share_number` (`share_number`),
  KEY `idx_order` (`order_id`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_performance_shares_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩分享记录表';

-- 表: permissions
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '权限ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID（NULL表示系统权限）',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限名称',
  `code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限代码',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '权限描述',
  `module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'system' COMMENT '所属模块',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'menu' COMMENT '权限类型: menu/button/api',
  `path` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '路由路径',
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '图标',
  `sort` int DEFAULT '0' COMMENT '排序',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态: active/inactive',
  `parentId` int DEFAULT NULL COMMENT '父级权限ID（树形结构）',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=400 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: permissions_closure
CREATE TABLE `permissions_closure` (
  `id_ancestor` int NOT NULL COMMENT '祖先权限ID',
  `id_descendant` int NOT NULL COMMENT '后代权限ID',
  PRIMARY KEY (`id_ancestor`,`id_descendant`),
  KEY `idx_ancestor` (`id_ancestor`),
  KEY `idx_descendant` (`id_descendant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限树形结构闭包表';

-- 表: phone_blacklist
CREATE TABLE `phone_blacklist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(20) NOT NULL COMMENT '电话号码',
  `reason` varchar(500) DEFAULT NULL COMMENT '加入原因',
  `type` enum('manual','complaint','invalid','dnc') DEFAULT 'manual' COMMENT '类型',
  `source` varchar(100) DEFAULT NULL COMMENT '来源',
  `added_by` int DEFAULT NULL COMMENT '添加人ID',
  `expires_at` datetime DEFAULT NULL COMMENT '过期时间',
  `is_permanent` tinyint(1) DEFAULT '1' COMMENT '是否永久',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '绉熸埛ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone_number`),
  KEY `idx_type` (`type`),
  KEY `idx_expires` (`expires_at`),
  KEY `idx_phone_blacklist_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='号码黑名单表';

-- 表: phone_configs
CREATE TABLE `phone_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) NOT NULL COMMENT '用户ID',
  `config_type` varchar(50) NOT NULL DEFAULT 'call' COMMENT '配置类型: call-通话配置',
  `call_method` varchar(20) DEFAULT 'system' COMMENT '外呼方式: system/mobile/voip',
  `line_id` varchar(50) DEFAULT NULL COMMENT '系统外呼线路ID',
  `work_phone` varchar(20) DEFAULT NULL COMMENT '工作手机号',
  `dial_method` varchar(20) DEFAULT 'direct' COMMENT '拨号方式: direct/callback',
  `mobile_config` json DEFAULT NULL COMMENT '工作手机配置',
  `callback_config` json DEFAULT NULL COMMENT '回拨模式配置',
  `voip_provider` varchar(20) DEFAULT NULL COMMENT 'VoIP服务商: aliyun/tencent/huawei/custom',
  `audio_device` varchar(20) DEFAULT 'default' COMMENT '音频设备',
  `audio_quality` varchar(20) DEFAULT 'standard' COMMENT '音频质量',
  `aliyun_config` json DEFAULT NULL COMMENT '阿里云通信配置',
  `tencent_config` json DEFAULT NULL COMMENT '腾讯云通信配置',
  `huawei_config` json DEFAULT NULL COMMENT '华为云通信配置',
  `call_mode` varchar(20) DEFAULT 'manual' COMMENT '呼叫模式',
  `call_interval` int DEFAULT '30' COMMENT '呼叫间隔(秒)',
  `max_retries` int DEFAULT '3' COMMENT '最大重试次数',
  `call_timeout` int DEFAULT '60' COMMENT '呼叫超时(秒)',
  `enable_recording` tinyint(1) DEFAULT '1' COMMENT '是否启用录音',
  `auto_follow_up` tinyint(1) DEFAULT '0' COMMENT '是否自动跟进',
  `concurrent_calls` int DEFAULT '1' COMMENT '并发呼叫数',
  `priority` varchar(20) DEFAULT 'medium' COMMENT '优先级',
  `blacklist_check` tinyint(1) DEFAULT '1' COMMENT '是否检查黑名单',
  `show_location` tinyint(1) DEFAULT '1' COMMENT '是否显示归属地',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `prefer_mobile` tinyint(1) DEFAULT '0',
  `default_line_id` int DEFAULT NULL,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '绉熸埛ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_type` (`user_id`,`config_type`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_phone_configs_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户电话配置表';

-- 表: private_customers
CREATE TABLE `private_customers` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客户名称',
  `contact_person` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系电话',
  `contact_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系邮箱',
  `company_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '公司地址',
  `industry` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属行业',
  `company_size` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '公司规模: 10人以下, 10-50人, 50-200人, 200人以上',
  `deployment_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'on-premise' COMMENT '部署类型: on-premise-本地部署, cloud-云部署',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态: active-正常, inactive-停用',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: private_deployments
CREATE TABLE `private_deployments` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `server_ip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `domain` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `last_heartbeat` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: product_categories
CREATE TABLE `product_categories` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类名称',
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类编码',
  `parent_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上级分类ID',
  `level` int NOT NULL DEFAULT '1' COMMENT '层级：1=一级分类，2=二级分类',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '分类描述',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '状态',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: products
CREATE TABLE `products` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品编码',
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品名称',
  `category_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类ID',
  `category_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类名称',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '产品描述',
  `price` decimal(10,2) NOT NULL COMMENT '销售价格',
  `cost_price` decimal(10,2) DEFAULT NULL COMMENT '成本价格',
  `stock` int NOT NULL DEFAULT '0' COMMENT '库存数量',
  `min_stock` int NOT NULL DEFAULT '0' COMMENT '最小库存',
  `max_stock` int DEFAULT '0' COMMENT '最高库存',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '件' COMMENT '单位',
  `brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '商品品牌',
  `specification` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '商品规格',
  `weight` decimal(10,2) DEFAULT '0.00' COMMENT '商品重量(kg)',
  `dimensions` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '商品尺寸',
  `specifications` json DEFAULT NULL COMMENT '规格参数',
  `images` json DEFAULT NULL COMMENT '产品图片',
  `status` enum('active','inactive','deleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '状态',
  `allowed_departments` json DEFAULT NULL COMMENT '可下单部门ID列表，NULL表示全部部门',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '创建人',
  `is_recommended` tinyint NOT NULL DEFAULT '0' COMMENT '是否推荐',
  `is_new` tinyint NOT NULL DEFAULT '0' COMMENT '是否新品',
  `is_hot` tinyint NOT NULL DEFAULT '0' COMMENT '是否热销',
  `product_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'physical' COMMENT '商品类型: physical-普通商品, virtual-虚拟商品',
  `virtual_delivery_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '虚拟发货方式: none-无需发货, card_key-卡密发货, resource_link-网盘资源',
  `card_key_template` text COLLATE utf8mb4_unicode_ci COMMENT '卡密模板说明',
  `resource_link_template` text COLLATE utf8mb4_unicode_ci COMMENT '资源链接模板',
  `virtual_content_encrypt` tinyint NOT NULL DEFAULT '0' COMMENT '虚拟内容是否加密显示',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: prospect_logs
CREATE TABLE `prospect_logs` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prospect_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `log_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail` json DEFAULT NULL,
  `operator_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pl_tenant` (`tenant_id`),
  KEY `idx_pl_prospect` (`prospect_id`,`created_at` DESC),
  KEY `idx_pl_type` (`log_type`),
  KEY `idx_pl_operator` (`operator_id`),
  KEY `idx_pl_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: rejection_reasons
CREATE TABLE `rejection_reasons` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '原因ID',
  `reason` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '拒绝原因',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '描述',
  `isActive` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绉熸埛ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: resource_inventory
CREATE TABLE `resource_inventory` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` varchar(36) NOT NULL COMMENT '关联商品ID',
  `resource_link` varchar(500) NOT NULL COMMENT '资源链接',
  `resource_password` varchar(100) DEFAULT NULL COMMENT '提取码',
  `resource_description` text COMMENT '资源说明',
  `status` varchar(20) DEFAULT 'unused' COMMENT '状态: unused/reserved/used/claimed/expired/voided',
  `order_id` varchar(36) DEFAULT NULL COMMENT '关联订单ID',
  `reserved_order_id` varchar(36) DEFAULT NULL COMMENT '预占订单ID',
  `claim_token` varchar(100) DEFAULT NULL COMMENT '客户领取令牌',
  `claim_method` varchar(20) DEFAULT NULL COMMENT '领取方式',
  `claimed_at` datetime DEFAULT NULL COMMENT '客户领取时间',
  `usage_instructions` text COMMENT '使用说明',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_status` (`product_id`,`status`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_claim_token` (`claim_token`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='网盘资源库存表';

-- 表: role_permissions
CREATE TABLE `role_permissions` (
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `roleId` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色ID',
  `permissionId` int NOT NULL COMMENT '权限ID',
  PRIMARY KEY (`roleId`,`permissionId`),
  KEY `idx_role` (`roleId`),
  KEY `idx_permission` (`permissionId`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 表: roles
CREATE TABLE `roles` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '??ID',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色名称',
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色代码',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '角色描述',
  `level` int DEFAULT '0' COMMENT '角色级别',
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '角色颜色',
  `data_scope` enum('all','department','self','custom') COLLATE utf8mb4_unicode_ci DEFAULT 'self' COMMENT '数据权限范围',
  `role_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'custom' COMMENT '角色类型：system=系统预设, business=业务角色, custom=自定义角色',
  `permissions` json DEFAULT NULL COMMENT '功能权限列表',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间(TypeORM)',
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间(TypeORM)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: sender_addresses
CREATE TABLE `sender_addresses` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '地址ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sender' COMMENT '类型: sender=寄件人, return=退货地址',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '联系人姓名',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '联系电话',
  `province` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '省',
  `city` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '市',
  `district` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '区/县',
  `address` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '详细地址',
  `full_address` varchar(600) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '完整地址(省市区+详细)',
  `is_default` tinyint(1) DEFAULT '0' COMMENT '是否默认: 0否 1是',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `linked_service_types` json DEFAULT NULL COMMENT '关联售后类型',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人ID',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_sender_addresses_tenant_type` (`tenant_id`,`type`),
  KEY `idx_sender_addresses_tenant_default` (`tenant_id`,`type`,`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: sensitive_info_permissions
CREATE TABLE `sensitive_info_permissions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID（NULL表示全局默认）',
  `info_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '敏感信息类型',
  `role_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色代码',
  `has_permission` tinyint(1) DEFAULT '0' COMMENT '是否有权限: 0无权限, 1有权限',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tenant_info_role` (`tenant_id`,`info_type`,`role_code`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: service_follow_up_records
CREATE TABLE `service_follow_up_records` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `follow_up_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: service_operation_logs
CREATE TABLE `service_operation_logs` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operation_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operation_content` text COLLATE utf8mb4_unicode_ci,
  `old_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: service_records
CREATE TABLE `service_records` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '售后ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '状态',
  `customerId` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serviceType` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignedTo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: sms_auto_send_rules
CREATE TABLE `sms_auto_send_rules` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '规则ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '规则名称',
  `template_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '关联模板ID',
  `template_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '模板名称',
  `trigger_event` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '触发事件类型',
  `effective_departments` json DEFAULT NULL COMMENT '生效部门IDs',
  `time_range_config` json DEFAULT NULL COMMENT '时间范围配置',
  `enabled` tinyint DEFAULT '1' COMMENT '是否启用',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人ID',
  `created_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人姓名',
  `stats_sent_count` int DEFAULT '0' COMMENT '发送成功总数',
  `stats_fail_count` int DEFAULT '0' COMMENT '发送失败总数',
  `last_triggered_at` timestamp NULL DEFAULT NULL COMMENT '最后触发时间',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '规则描述',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: sms_quota_orders
CREATE TABLE `sms_quota_orders` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '订单号',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `tenant_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户名称',
  `package_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '套餐ID',
  `package_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '套餐名称',
  `sms_count` int DEFAULT '0' COMMENT '购买短信条数',
  `amount` decimal(10,2) DEFAULT '0.00' COMMENT '支付金额',
  `pay_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '支付方式',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '状态',
  `qr_code` text COLLATE utf8mb4_unicode_ci,
  `pay_url` text COLLATE utf8mb4_unicode_ci,
  `paid_at` datetime DEFAULT NULL,
  `buyer_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `buyer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `buyer_source` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'crm',
  `refund_amount` decimal(10,2) DEFAULT '0.00',
  `refund_sms_count` int DEFAULT '0',
  `refund_at` datetime DEFAULT NULL,
  `refund_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refunded_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expire_time` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: sms_quota_packages
CREATE TABLE `sms_quota_packages` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '套餐名称',
  `sms_count` int NOT NULL COMMENT '短信条数',
  `price` decimal(10,2) NOT NULL COMMENT '套餐价格(元)',
  `unit_price` decimal(10,4) DEFAULT '0.0000' COMMENT '单条价格(元)',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '套餐描述',
  `sort_order` int DEFAULT '0' COMMENT '排序权重',
  `is_enabled` tinyint DEFAULT '1' COMMENT '是否启用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: sms_records
CREATE TABLE `sms_records` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '记录ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `template_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '模板ID',
  `template_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '模板名称',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '短信内容',
  `recipients` json NOT NULL COMMENT '接收人列表',
  `recipient_count` int DEFAULT '0' COMMENT '接收人数量',
  `success_count` int DEFAULT '0' COMMENT '成功数量',
  `fail_count` int DEFAULT '0' COMMENT '失败数量',
  `status` enum('pending','sending','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '发送状态',
  `send_details` json DEFAULT NULL COMMENT '发送详情',
  `applicant` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '申请人ID',
  `applicant_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '申请人姓名',
  `applicant_dept` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '申请人部门',
  `approved_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审核人ID',
  `approved_at` timestamp NULL DEFAULT NULL COMMENT '审核时间',
  `sent_at` timestamp NULL DEFAULT NULL COMMENT '发送时间',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `sender_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '发送人手机号',
  `sender_user_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '?????ID',
  `sender_department_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '?????ID',
  `trigger_source` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'manual' COMMENT '????: manual/auto',
  `auto_rule_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '??????ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: sms_templates
CREATE TABLE `sms_templates` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板ID',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板名称',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '模板分类',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板内容',
  `variables` json DEFAULT NULL COMMENT '变量列表',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '模板描述',
  `applicant` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '申请人ID',
  `applicant_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '申请人姓名',
  `applicant_dept` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '申请人部门',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_admin' COMMENT '审核状态: pending_admin/pending_vendor/active/rejected/withdrawn/deleted',
  `approved_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审核人ID',
  `approved_at` timestamp NULL DEFAULT NULL COMMENT '审核时间',
  `is_system` tinyint(1) DEFAULT '0' COMMENT '是否系统模板',
  `vendor_template_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '服务商模板CODE',
  `vendor_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '服务商审核状态',
  `vendor_submit_at` timestamp NULL DEFAULT NULL COMMENT '提交服务商时间',
  `vendor_reject_reason` text COLLATE utf8mb4_unicode_ci COMMENT '服务商拒绝原因',
  `admin_reviewer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '管理后台审核人',
  `admin_review_at` timestamp NULL DEFAULT NULL COMMENT '管理后台审核时间',
  `admin_review_note` text COLLATE utf8mb4_unicode_ci COMMENT '管理后台审核备注/拒绝原因',
  `is_preset` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否为后台预设模板: 0=租户自建, 1=预设',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: subscription_deduct_logs
CREATE TABLE `subscription_deduct_logs` (
  `id` varchar(36) NOT NULL COMMENT '扣款记录ID',
  `subscription_id` varchar(36) NOT NULL COMMENT '订阅ID',
  `tenant_id` varchar(36) NOT NULL COMMENT '租户ID',
  `amount` decimal(10,2) NOT NULL COMMENT '扣款金额',
  `channel` enum('wechat','alipay') NOT NULL COMMENT '扣款渠道',
  `status` enum('pending','success','failed') DEFAULT 'pending' COMMENT '扣款状态',
  `trade_no` varchar(100) DEFAULT NULL COMMENT '第三方交易号',
  `payment_order_id` varchar(36) DEFAULT NULL COMMENT '关联payment_orders',
  `deduct_date` date NOT NULL COMMENT '扣款日期',
  `executed_at` datetime DEFAULT NULL COMMENT '执行时间',
  `retry_count` int DEFAULT '0' COMMENT '重试次数',
  `max_retry` int DEFAULT '3' COMMENT '最大重试次数',
  `next_retry_at` datetime DEFAULT NULL COMMENT '下次重试时间',
  `error_code` varchar(50) DEFAULT NULL COMMENT '错误代码',
  `error_msg` text COMMENT '错误信息',
  `period_number` int DEFAULT '1' COMMENT '第几期',
  `billing_start` date DEFAULT NULL COMMENT '本期开始日',
  `billing_end` date DEFAULT NULL COMMENT '本期结束日',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_deduct_sub` (`subscription_id`),
  KEY `idx_deduct_tenant` (`tenant_id`),
  KEY `idx_deduct_status` (`status`),
  KEY `idx_deduct_date` (`deduct_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='订阅扣款明细表';

-- 表: subscriptions
CREATE TABLE `subscriptions` (
  `id` varchar(36) NOT NULL COMMENT '订阅ID',
  `tenant_id` varchar(36) NOT NULL COMMENT '租户ID',
  `package_id` int NOT NULL COMMENT '套餐ID',
  `status` enum('signing','active','paused','cancelled','expired') DEFAULT 'signing' COMMENT '订阅状态',
  `channel` enum('wechat','alipay') NOT NULL COMMENT '订阅渠道',
  `wechat_contract_id` varchar(100) DEFAULT NULL COMMENT '微信签约协议号',
  `wechat_plan_id` varchar(100) DEFAULT NULL COMMENT '微信代扣计划编号',
  `alipay_agreement_no` varchar(100) DEFAULT NULL COMMENT '支付宝协议号',
  `sign_url` varchar(500) DEFAULT NULL COMMENT 'signing url',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '每期扣款金额',
  `billing_cycle` enum('monthly','yearly') DEFAULT 'monthly' COMMENT '扣款周期',
  `next_deduct_date` date DEFAULT NULL COMMENT '下次扣款日期',
  `last_deduct_date` date DEFAULT NULL COMMENT '最近扣款日期',
  `sign_date` datetime DEFAULT NULL COMMENT '签约时间',
  `cancel_date` datetime DEFAULT NULL COMMENT '取消时间',
  `cancel_reason` varchar(500) DEFAULT NULL COMMENT 'cancel reason',
  `total_deducted` decimal(10,2) DEFAULT '0.00' COMMENT '累计扣款金额',
  `deduct_count` int DEFAULT '0' COMMENT '已扣款次数',
  `fail_count` int DEFAULT '0' COMMENT '连续失败次数',
  `source` enum('register','renew','upgrade') DEFAULT 'register' COMMENT '订阅来源',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sub_tenant` (`tenant_id`),
  KEY `idx_sub_status` (`status`),
  KEY `idx_sub_next_deduct` (`next_deduct_date`),
  KEY `idx_sub_channel` (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='订阅记录表';

-- 表: system_announcements
CREATE TABLE `system_announcements` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告标题',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告内容',
  `type` enum('system','maintenance','update','notice') COLLATE utf8mb4_unicode_ci DEFAULT 'notice' COMMENT '公告类型',
  `priority` enum('low','normal','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'normal' COMMENT '优先级',
  `status` enum('draft','published','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'draft' COMMENT '状态',
  `target_users` json DEFAULT NULL COMMENT '目标用户（为空表示全员）',
  `target_roles` json DEFAULT NULL COMMENT '目标角色',
  `target_departments` json DEFAULT NULL COMMENT '目标部门',
  `publish_time` timestamp NULL DEFAULT NULL COMMENT '发布时间',
  `expire_time` timestamp NULL DEFAULT NULL COMMENT '过期时间',
  `is_popup` tinyint(1) DEFAULT '0' COMMENT '是否弹窗显示',
  `is_top` tinyint(1) DEFAULT '0' COMMENT '是否置顶',
  `read_count` int DEFAULT '0' COMMENT '阅读次数',
  `attachments` json DEFAULT NULL COMMENT '附件列表',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '创建人ID',
  `created_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人姓名',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_publish_time` (`publish_time`),
  KEY `idx_is_top` (`is_top`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统公告表';

-- 表: system_config
CREATE TABLE `system_config` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `config_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_value` longtext COLLATE utf8mb4_unicode_ci,
  `tenant_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `config_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'system',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `config_group` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'general' COMMENT '配置分组',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_key` (`tenant_id`,`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: system_configs
CREATE TABLE `system_configs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `tenant_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `configKey` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键名',
  `configValue` mediumtext COLLATE utf8mb4_unicode_ci,
  `valueType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'string' COMMENT '值类型: string, number, boolean, json, text',
  `configGroup` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general' COMMENT '配置分组',
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配置描述',
  `isEnabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `isSystem` tinyint(1) DEFAULT '0' COMMENT '是否为系统配置（不可删除）',
  `sortOrder` int DEFAULT '0' COMMENT '排序权重',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tenant_config_key_group` (`tenant_id`,`configKey`,`configGroup`)
) ENGINE=InnoDB AUTO_INCREMENT=158 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: system_license
CREATE TABLE `system_license` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '授权ID',
  `license_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '授权码',
  `customer_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户名称',
  `license_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'perpetual' COMMENT '授权类型: trial试用, perpetual永久, annual年度, monthly月度, community社区版',
  `max_users` int DEFAULT '50' COMMENT '最大用户数',
  `features` text COLLATE utf8mb4_unicode_ci COMMENT '功能模块(JSON)',
  `expires_at` datetime DEFAULT NULL COMMENT '到期时间',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态: active激活, expired过期, revoked吊销',
  `activated_at` datetime DEFAULT NULL COMMENT '激活时间',
  `machine_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '机器码',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `admin_credentials_shown` tinyint DEFAULT '0' COMMENT '管理员凭据是否已展示(防重复)',
  `user_limit_mode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'total' COMMENT '用户限制模式: total总用户数, online在线席位',
  `max_online_seats` int DEFAULT '0' COMMENT '最大在线席位数(user_limit_mode=online时生效)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_license_key` (`license_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统授权表';

-- 表: system_messages
CREATE TABLE `system_messages` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息类型',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息标题',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息内容',
  `priority` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'normal' COMMENT '优先级',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '系统通知' COMMENT '消息分类',
  `target_user_id` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '发送者用户ID',
  `related_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联的业务ID',
  `related_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联类型',
  `action_url` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '跳转URL',
  `is_read` tinyint DEFAULT '0' COMMENT '是否已读',
  `read_at` timestamp NULL DEFAULT NULL COMMENT '阅读时间',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: system_settings
CREATE TABLE `system_settings` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设置ID',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置分类',
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键名',
  `value` text COLLATE utf8mb4_unicode_ci COMMENT '配置值',
  `value_type` enum('string','number','boolean','json','array') COLLATE utf8mb4_unicode_ci DEFAULT 'string' COMMENT '值类型',
  `default_value` text COLLATE utf8mb4_unicode_ci COMMENT '默认值',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '配置描述',
  `is_public` tinyint(1) DEFAULT '0' COMMENT '是否公开（前端可见）',
  `is_encrypted` tinyint(1) DEFAULT '0' COMMENT '是否加密存储',
  `require_restart` tinyint(1) DEFAULT '0' COMMENT '是否需要重启生效',
  `editable_roles` json DEFAULT NULL COMMENT '可编辑角色列表',
  `version` int DEFAULT '1' COMMENT '配置版本',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人ID',
  `created_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人姓名',
  `updated_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更新人ID',
  `updated_by_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更新人姓名',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `idx_category` (`category`),
  KEY `idx_key` (`key`),
  KEY `idx_is_public` (`is_public`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统设置表';

-- 表: tenant_cleanup_logs
CREATE TABLE `tenant_cleanup_logs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenant_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cleaned_tables` text COLLATE utf8mb4_unicode_ci COMMENT '清理的表名和行数JSON',
  `cleaned_files_count` int DEFAULT '0' COMMENT '清理的文件数',
  `cleaned_files_size_mb` decimal(12,2) DEFAULT '0.00' COMMENT '清理的文件总大小MB',
  `operator_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户数据清理记录';

-- 表: tenant_email_config
CREATE TABLE `tenant_email_config` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `smtp_host` varchar(200) NOT NULL COMMENT 'SMTP服务器',
  `smtp_port` int DEFAULT '465' COMMENT 'SMTP端口',
  `encryption` varchar(10) DEFAULT 'ssl' COMMENT '加密方式: ssl/tls/none',
  `sender_email` varchar(200) NOT NULL COMMENT '发件邮箱',
  `sender_password` varchar(500) NOT NULL COMMENT '邮箱密码/授权码',
  `sender_name` varchar(100) DEFAULT '' COMMENT '发件人名称',
  `is_verified` tinyint(1) DEFAULT '0' COMMENT '是否已验证',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='租户自定义邮箱配置';

-- 表: tenant_license_logs
CREATE TABLE `tenant_license_logs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `operator_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: tenant_logs
CREATE TABLE `tenant_logs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '租户ID',
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型',
  `operator` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作人名称',
  `operator_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作人ID',
  `details` text COLLATE utf8mb4_unicode_ci COMMENT '操作详情（JSON格式）',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户代理',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: tenant_packages
CREATE TABLE `tenant_packages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` enum('saas','private','community') NOT NULL DEFAULT 'saas' COMMENT '套餐类型：saas-云端版，private-私有部署，community-开源社区版',
  `description` text,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `original_price` decimal(10,2) DEFAULT NULL,
  `billing_cycle` enum('monthly','yearly','once') NOT NULL DEFAULT 'monthly',
  `yearly_discount_rate` decimal(5,2) DEFAULT '0.00' COMMENT '年付折扣率',
  `yearly_bonus_months` int DEFAULT '0' COMMENT '年付赠送月数',
  `yearly_price` decimal(10,2) DEFAULT NULL COMMENT '年付价格',
  `duration_days` int DEFAULT '30',
  `max_users` int DEFAULT '10',
  `user_limit_mode` enum('total','online','both') NOT NULL DEFAULT 'total' COMMENT '用户限制模式：total-限制总注册数，online-限制在线数，both-两种都支持(租户自选)',
  `max_online_seats` int NOT NULL DEFAULT '0' COMMENT '最大在线席位数（user_limit_mode=online时生效）',
  `max_storage_gb` int DEFAULT '5',
  `features` json DEFAULT NULL,
  `feature_details` json DEFAULT NULL COMMENT '功能特性详情(对比表用)',
  `modules` json DEFAULT NULL COMMENT '模块列表（JSON数组）',
  `is_trial` tinyint(1) DEFAULT '0',
  `is_recommended` tinyint(1) DEFAULT '0',
  `is_visible` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `status` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `subscription_enabled` tinyint(1) DEFAULT '0' COMMENT '是否支持订阅模式：0-不支持 1-支持',
  `subscription_channels` varchar(50) DEFAULT 'all' COMMENT '订阅渠道：wechat/alipay/all',
  `subscription_billing_cycle` varchar(20) DEFAULT 'monthly' COMMENT '订阅计费周期：monthly/yearly/both',
  `subscription_discount_rate` decimal(5,2) DEFAULT '0.00' COMMENT '订阅优惠折扣率（百分比）',
  `wechat_plan_ids` text COMMENT '微信委托代扣计划ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: tenant_settings
CREATE TABLE `tenant_settings` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '??ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '??ID',
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '???',
  `setting_value` text COLLATE utf8mb4_unicode_ci COMMENT '???',
  `setting_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'string' COMMENT '????: string, number, boolean, json',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '????',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '????',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '????',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_setting` (`tenant_id`,`setting_key`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: tenants
CREATE TABLE `tenants` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `license_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `license_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `activated_at` datetime DEFAULT NULL,
  `package_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_users` int DEFAULT '10',
  `user_limit_mode` enum('total','online') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'total' COMMENT '用户限制模式',
  `max_online_seats` int NOT NULL DEFAULT '0' COMMENT '最大在线席位数',
  `extra_online_seats` int NOT NULL DEFAULT '0' COMMENT '额外增购的在线席位数',
  `current_online_seats` int DEFAULT '0' COMMENT '当前在线席位数',
  `max_storage_gb` int DEFAULT '5' COMMENT '最大存储空间(GB)',
  `user_count` int DEFAULT '0',
  `used_storage_mb` decimal(10,2) DEFAULT '0.00' COMMENT '已使用存储空间(MB)',
  `expire_date` date DEFAULT NULL,
  `features` text COLLATE utf8mb4_unicode_ci,
  `database_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `wecom_chat_archive_auth` tinyint(1) NOT NULL DEFAULT '0' COMMENT '会话存档功能授权(0=未授权,1=已授权)',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '会员中心登录密码（bcrypt哈希）',
  `last_login_at` datetime DEFAULT NULL COMMENT '最近会员中心登录时间',
  `extra_users` int NOT NULL DEFAULT '0',
  `extra_storage_gb` int NOT NULL DEFAULT '0',
  `data_cleaned_at` datetime DEFAULT NULL COMMENT '数据清理时间',
  `deleted_at` datetime DEFAULT NULL COMMENT '软删除时间',
  `deleted_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '删除操作人ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: timeout_reminder_configs
CREATE TABLE `timeout_reminder_configs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `timeout_hours` int DEFAULT '24',
  `is_enabled` tinyint DEFAULT '1',
  `notify_roles` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: update_tasks
CREATE TABLE `update_tasks` (
  `id` varchar(36) NOT NULL,
  `version_id` varchar(36) NOT NULL COMMENT '目标版本ID',
  `customer_id` varchar(36) DEFAULT NULL COMMENT '私有客户ID',
  `status` varchar(20) DEFAULT 'pending' COMMENT '更新状态',
  `current_step` varchar(50) DEFAULT NULL COMMENT '当前执行步骤',
  `progress` int DEFAULT '0' COMMENT '进度百分比',
  `logs` longtext COMMENT '执行日志',
  `backup_path` varchar(500) DEFAULT NULL COMMENT '备份目录路径',
  `error_message` text COMMENT '错误信息',
  `from_version` varchar(20) DEFAULT NULL COMMENT '更新前版本号',
  `to_version` varchar(20) DEFAULT NULL COMMENT '目标版本号',
  `triggered_by` varchar(36) DEFAULT NULL COMMENT '操作人ID',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: user_line_assignments
CREATE TABLE `user_line_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `line_id` int NOT NULL,
  `caller_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `daily_limit` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `assigned_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绉熸埛ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_line` (`user_id`,`line_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_line_id` (`line_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_user_line_assignments_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: user_permissions
CREATE TABLE `user_permissions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '权限ID',
  `userId` int NOT NULL COMMENT '用户ID',
  `permissionId` int NOT NULL COMMENT '权限ID',
  `grantedBy` int DEFAULT NULL COMMENT '授权人ID',
  `reason` text COLLATE utf8mb4_unicode_ci COMMENT '授权原因',
  `grantedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: user_sessions
CREATE TABLE `user_sessions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '会话ID(UUID)',
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '租户ID',
  `session_token` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JWT token标识(jti或token hash)',
  `device_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备类型: web/mobile/app',
  `device_info` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备信息(User-Agent)',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '登录IP',
  `last_active_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后活跃时间',
  `logged_out_at` datetime DEFAULT NULL COMMENT '主动登出时间',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '会话状态: active/expired/kicked/logged_out',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: users
CREATE TABLE `users` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `real_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` enum('male','female','unknown') COLLATE utf8mb4_unicode_ci DEFAULT 'unknown',
  `birthday` date DEFAULT NULL,
  `id_card` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entry_date` date DEFAULT NULL,
  `leave_date` date DEFAULT NULL,
  `salary` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `education` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `major` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive','resigned','locked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `employment_status` enum('active','resigned') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `resigned_at` datetime DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `last_login_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `login_count` int DEFAULT '0',
  `login_fail_count` int DEFAULT '0',
  `locked_at` datetime DEFAULT NULL,
  `settings` json DEFAULT NULL,
  `authorized_ips` json DEFAULT NULL,
  `password_last_changed` datetime DEFAULT NULL,
  `need_change_password` tinyint DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `agent_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'ready' COMMENT '坐席状态：ready-就绪，busy-忙碌，offline-离线',
  `status_changed_at` datetime DEFAULT NULL COMMENT '坐席状态变更时间',
  `status_reason` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '坐席状态变更原因',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: value_added_orders
CREATE TABLE `value_added_orders` (
  `id` varchar(50) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '租户ID',
  `order_id` varchar(50) DEFAULT NULL,
  `order_number` varchar(50) DEFAULT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `express_company` varchar(50) DEFAULT NULL COMMENT '物流公司',
  `order_status` varchar(20) DEFAULT NULL,
  `order_date` datetime DEFAULT NULL,
  `company_id` varchar(50) NOT NULL,
  `company_name` varchar(200) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `settlement_status` varchar(20) DEFAULT 'unsettled',
  `settlement_amount` decimal(10,2) DEFAULT '0.00',
  `settlement_date` date DEFAULT NULL,
  `settlement_batch` varchar(50) DEFAULT NULL,
  `invalid_reason` varchar(500) DEFAULT NULL,
  `supplement_order_id` varchar(50) DEFAULT NULL,
  `export_date` date DEFAULT NULL,
  `export_batch` varchar(50) DEFAULT NULL,
  `remark` text,
  `operator_id` varchar(50) DEFAULT NULL,
  `operator_name` varchar(50) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_by_name` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: value_added_price_config
CREATE TABLE `value_added_price_config` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `company_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '外包公司ID',
  `tier_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '档位名称',
  `tier_order` int NOT NULL DEFAULT '1' COMMENT '档位顺序',
  `pricing_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixed' COMMENT '计价方式: fixed-按单计价, percentage-按比例计价',
  `unit_price` decimal(10,2) DEFAULT '0.00' COMMENT '单价（按单计价时使用）',
  `percentage_rate` decimal(5,2) DEFAULT '0.00' COMMENT '比例（按比例计价时使用，如5.5表示5.5%）',
  `base_amount_field` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'orderAmount' COMMENT '基数字段',
  `start_date` date DEFAULT NULL COMMENT '生效开始日期',
  `end_date` date DEFAULT NULL COMMENT '生效结束日期',
  `is_active` tinyint NOT NULL DEFAULT '1' COMMENT '状态: 1-启用, 0-停用',
  `priority` int DEFAULT '0' COMMENT '优先级',
  `condition_rules` text COLLATE utf8mb4_unicode_ci COMMENT '条件规则JSON',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人ID',
  `created_by_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人姓名',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: value_added_price_config_backup
CREATE TABLE `value_added_price_config_backup` (
  `id` varchar(50) NOT NULL,
  `config_name` varchar(100) NOT NULL,
  `company_id` varchar(50) DEFAULT NULL,
  `company_name` varchar(200) DEFAULT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `conditions` text,
  `status` varchar(20) DEFAULT 'active',
  `remark` text,
  `created_by` varchar(50) DEFAULT NULL,
  `created_by_name` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='增值费用配置表';

-- 表: value_added_remark_presets
CREATE TABLE `value_added_remark_presets` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '主键ID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `remark_text` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '备注内容',
  `category` enum('invalid','general') COLLATE utf8mb4_unicode_ci DEFAULT 'general' COMMENT '备注分类：invalid-无效原因，general-通用备注',
  `sort_order` int DEFAULT '0' COMMENT '排序顺序',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用：1-启用，0-停用',
  `is_system` tinyint DEFAULT '0' COMMENT '系统预设',
  `usage_count` int DEFAULT '0' COMMENT '使用次数',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理备注预设表';

-- 表: value_added_status_configs
CREATE TABLE `value_added_status_configs` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '租户ID',
  `type` varchar(50) NOT NULL,
  `value` varchar(100) NOT NULL,
  `label` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `sort_order` int DEFAULT '999' COMMENT '排序顺序',
  `is_system` tinyint DEFAULT '0' COMMENT '系统预设',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: versions
CREATE TABLE `versions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version_code` int NOT NULL,
  `release_type` enum('major','minor','patch','beta') COLLATE utf8mb4_unicode_ci DEFAULT 'patch',
  `platform` enum('windows','macos','linux','android','ios','web','all') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all' COMMENT '适用平台',
  `changelog` text COLLATE utf8mb4_unicode_ci,
  `release_notes_html` text COLLATE utf8mb4_unicode_ci COMMENT '富文本更新说明(HTML)',
  `download_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'url' COMMENT '更新源类型: url/upload/git',
  `git_repo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Git仓库地址',
  `git_branch` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'main' COMMENT 'Git分支',
  `git_tag` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Git标签',
  `package_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上传包服务器路径',
  `target_audience` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'all' COMMENT '目标受众: all/saas/private',
  `file_size` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `download_count` int NOT NULL DEFAULT '0' COMMENT '下载次数',
  `min_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_force_update` tinyint(1) DEFAULT '0',
  `status` enum('draft','published','deprecated') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `is_published` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已发布',
  `published_at` datetime DEFAULT NULL,
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: virtual_claim_settings
CREATE TABLE `virtual_claim_settings` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `delivery_mode` varchar(20) DEFAULT 'link' COMMENT '发货方式: link/manual',
  `claim_link_expiry_days` int DEFAULT '30' COMMENT '链接有效天数',
  `login_methods` varchar(50) DEFAULT 'password' COMMENT '登录方式: sms/password/sms,password',
  `initial_password` varchar(100) DEFAULT '123456' COMMENT '初始登录密码',
  `claim_page_notice` text COMMENT '领取页提示语',
  `email_enabled` tinyint(1) DEFAULT '0' COMMENT '是否开启邮件',
  `email_source` varchar(20) DEFAULT 'official' COMMENT '邮箱来源: official/custom',
  `email_content_mode` varchar(20) DEFAULT 'link' COMMENT '邮件内容模式: link/content/both',
  `email_auto_send` tinyint(1) DEFAULT '0' COMMENT '自动发送邮件',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='虚拟商品领取配置';

-- 表: virtual_delivery_records
CREATE TABLE `virtual_delivery_records` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '租户ID',
  `order_id` varchar(36) NOT NULL COMMENT '订单ID',
  `product_id` varchar(36) DEFAULT NULL COMMENT '关联商品ID',
  `delivery_type` varchar(20) NOT NULL COMMENT '发货类型: none/card_key/resource_link',
  `card_key_content` text COMMENT '卡密内容',
  `resource_link` varchar(500) DEFAULT NULL COMMENT '资源链接',
  `resource_password` varchar(100) DEFAULT NULL COMMENT '提取码',
  `remark` text COMMENT '备注',
  `operator_id` varchar(36) NOT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) DEFAULT NULL COMMENT '操作人姓名',
  `delivered_at` datetime NOT NULL COMMENT '发货时间',
  `email_sent` tinyint(1) DEFAULT '0' COMMENT '是否已发送邮件',
  `email_sent_at` datetime DEFAULT NULL COMMENT '邮件发送时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='虚拟商品发货记录表';

-- 表: wechat_followers
CREATE TABLE `wechat_followers` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '记录ID',
  `openid` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '微信OpenID',
  `unionid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '微信UnionID',
  `nickname` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '昵称',
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像URL',
  `gender` tinyint DEFAULT NULL COMMENT '性别: 0未知 1男 2女',
  `country` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '国家',
  `province` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '省份',
  `city` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '城市',
  `language` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '语言',
  `subscribe_status` tinyint(1) DEFAULT '1' COMMENT '关注状态: 0取消关注 1已关注',
  `subscribe_time` datetime DEFAULT NULL COMMENT '关注时间',
  `unsubscribe_time` datetime DEFAULT NULL COMMENT '取消关注时间',
  `subscribe_scene` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关注场景',
  `qr_scene` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '二维码场景值',
  `qr_scene_str` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '二维码场景描述',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绑定的租户ID',
  `tenant_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户名称',
  `bind_time` datetime DEFAULT NULL COMMENT '绑定时间',
  `bind_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'unbound' COMMENT '绑定状态: unbound/pending/bound',
  `enable_notification` tinyint(1) DEFAULT '1' COMMENT '是否启用通知',
  `notification_types` json DEFAULT NULL COMMENT '接收的通知类型',
  `tags` json DEFAULT NULL COMMENT '用户标签',
  `remark` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `message_count` int DEFAULT '0' COMMENT '发送消息数',
  `last_message_time` datetime DEFAULT NULL COMMENT '最后发送消息时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`),
  KEY `idx_openid` (`openid`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_subscribe_status` (`subscribe_status`),
  KEY `idx_bind_status` (`bind_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信公众号关注用户表';

-- 表: wechat_message_logs
CREATE TABLE `wechat_message_logs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '记录ID',
  `openid` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '接收者OpenID',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `message_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息类型: template/text/image',
  `template_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '模板ID',
  `template_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '业务模板代码',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '消息标题',
  `content` text COLLATE utf8mb4_unicode_ci COMMENT '消息内容',
  `url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '跳转链接',
  `data` json DEFAULT NULL COMMENT '模板数据',
  `send_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '发送状态: pending/success/failed',
  `send_time` datetime DEFAULT NULL COMMENT '发送时间',
  `msgid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '微信消息ID',
  `error_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '错误代码',
  `error_message` text COLLATE utf8mb4_unicode_ci COMMENT '错误信息',
  `is_read` tinyint(1) DEFAULT '0' COMMENT '是否已读',
  `read_time` datetime DEFAULT NULL COMMENT '阅读时间',
  `is_clicked` tinyint(1) DEFAULT '0' COMMENT '是否点击',
  `click_time` datetime DEFAULT NULL COMMENT '点击时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_openid` (`openid`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_template_code` (`template_code`),
  KEY `idx_send_status` (`send_status`),
  KEY `idx_send_time` (`send_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信消息发送记录表';

-- 表: wechat_official_account_config
CREATE TABLE `wechat_official_account_config` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置ID',
  `app_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'AppID',
  `app_secret` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'AppSecret',
  `token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Token',
  `encoding_aes_key` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'EncodingAESKey',
  `server_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '服务器URL',
  `message_encrypt_mode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'plaintext' COMMENT '消息加密方式: plaintext/compatible/safe',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `auto_reply_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用自动回复',
  `menu_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用自定义菜单',
  `welcome_message` text COLLATE utf8mb4_unicode_ci COMMENT '关注后欢迎语',
  `default_reply` text COLLATE utf8mb4_unicode_ci COMMENT '默认回复内容',
  `keyword_replies` json DEFAULT NULL COMMENT '关键词回复配置',
  `menu_config` json DEFAULT NULL COMMENT '自定义菜单配置',
  `template_configs` json DEFAULT NULL COMMENT '模板消息配置',
  `total_followers` int DEFAULT '0' COMMENT '总关注人数',
  `active_followers` int DEFAULT '0' COMMENT '当前关注人数',
  `total_messages` int DEFAULT '0' COMMENT '总发送消息数',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信公众号配置表';

-- 表: wechat_qrcode_scenes
CREATE TABLE `wechat_qrcode_scenes` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '场景ID',
  `scene_id` int DEFAULT NULL COMMENT '场景值ID',
  `scene_str` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '场景字符串',
  `scene_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '场景类型: tenant_bind/payment/register',
  `scene_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '场景名称',
  `scene_desc` text COLLATE utf8mb4_unicode_ci COMMENT '场景描述',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联租户ID',
  `related_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联业务ID',
  `related_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联业务类型',
  `qrcode_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '二维码图片URL',
  `ticket` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '二维码ticket',
  `expire_seconds` int DEFAULT NULL COMMENT '过期时间(秒)',
  `expire_time` datetime DEFAULT NULL COMMENT '过期时间',
  `scan_count` int DEFAULT '0' COMMENT '扫码次数',
  `subscribe_count` int DEFAULT '0' COMMENT '关注次数',
  `last_scan_time` datetime DEFAULT NULL COMMENT '最后扫码时间',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态: active/expired/disabled',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scene_id` (`scene_id`),
  UNIQUE KEY `uk_scene_str` (`scene_str`),
  KEY `idx_scene_id` (`scene_id`),
  KEY `idx_scene_str` (`scene_str`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信二维码场景表';

-- 表: wecom_acquisition_links
CREATE TABLE `wecom_acquisition_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wecom_config_id` int NOT NULL,
  `corp_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `link_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `link_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `link_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `welcome_msg` text COLLATE utf8mb4_unicode_ci,
  `user_ids` text COLLATE utf8mb4_unicode_ci,
  `department_ids` text COLLATE utf8mb4_unicode_ci,
  `tag_ids` text COLLATE utf8mb4_unicode_ci,
  `click_count` int DEFAULT '0',
  `add_count` int DEFAULT '0',
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `welcome_config` json DEFAULT NULL COMMENT '欢迎语配置',
  `auto_tags` json DEFAULT NULL COMMENT '自动标签配置',
  `auto_group_config` json DEFAULT NULL COMMENT '自动建群配置',
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '渠道标识',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `loss_count` int NOT NULL DEFAULT '0' COMMENT '流失数量',
  `weight_config` text COLLATE utf8mb4_unicode_ci COMMENT '成员权重配置(JSON)',
  `daily_stats` text COLLATE utf8mb4_unicode_ci COMMENT '每日统计(JSON)',
  `assign_mode` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT 'weighted' COMMENT '分配模式',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_acquisition_smart_rules
CREATE TABLE `wecom_acquisition_smart_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `link_id` int NOT NULL COMMENT '获客链接ID',
  `daily_limit_enabled` tinyint(1) DEFAULT '0',
  `daily_limit_per_user` int DEFAULT '50',
  `daily_limit_action` enum('offline','reduce_weight') DEFAULT 'offline',
  `work_time_enabled` tinyint(1) DEFAULT '0',
  `work_time_start` varchar(10) DEFAULT '09:00',
  `work_time_end` varchar(10) DEFAULT '18:00',
  `work_days` json DEFAULT NULL COMMENT '工作日[1,2,3,4,5]',
  `slow_reply_enabled` tinyint(1) DEFAULT '0',
  `slow_reply_minutes` int DEFAULT '30',
  `slow_reply_action` enum('offline','reduce_weight') DEFAULT 'offline',
  `loss_rate_enabled` tinyint(1) DEFAULT '0',
  `loss_rate_threshold` int DEFAULT '30',
  `next_day_auto_online` tinyint(1) DEFAULT '1',
  `next_day_online_time` varchar(10) DEFAULT '09:00',
  `next_day_exclude_manual` tinyint(1) DEFAULT '0',
  `next_day_exclude_loss_rate` tinyint(1) DEFAULT '0',
  `schedule_enabled` tinyint(1) DEFAULT '0',
  `schedule_config` json DEFAULT NULL COMMENT '排班配置',
  `dept_quota_enabled` tinyint(1) DEFAULT '0',
  `dept_quotas` json DEFAULT NULL COMMENT '部门配额配置',
  `dept_overflow_enabled` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_ai_agents
CREATE TABLE `wecom_ai_agents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `agent_name` varchar(100) NOT NULL COMMENT '智能体名称',
  `usages` json DEFAULT NULL COMMENT '用途列表',
  `model_id` int DEFAULT NULL COMMENT '关联AI模型ID',
  `knowledge_base_ids` json DEFAULT NULL COMMENT '关联知识库ID列表',
  `system_prompt` text COMMENT '系统提示词',
  `max_msg_per_analysis` int DEFAULT '50',
  `context_window` int DEFAULT '8000',
  `output_format` enum('json','text','markdown') DEFAULT 'json',
  `retry_count` int DEFAULT '3',
  `timeout_seconds` int DEFAULT '30',
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_ai_inspect_results
CREATE TABLE `wecom_ai_inspect_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `strategy_id` int DEFAULT NULL COMMENT '策略ID',
  `conversation_id` varchar(100) DEFAULT NULL COMMENT '会话ID',
  `employee_user_id` varchar(100) DEFAULT NULL,
  `employee_name` varchar(100) DEFAULT NULL,
  `customer_user_id` varchar(100) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `total_score` int DEFAULT NULL COMMENT '总分',
  `dimension_scores` json DEFAULT NULL COMMENT '维度评分',
  `highlights` json DEFAULT NULL COMMENT '亮点',
  `improvements` json DEFAULT NULL COMMENT '待改进',
  `risks` json DEFAULT NULL COMMENT '风险',
  `ai_suggestion` text COMMENT 'AI建议',
  `risk_level` enum('excellent','pass','fail') DEFAULT NULL COMMENT '风险等级',
  `analyzed_msg_count` int DEFAULT NULL,
  `analyzed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_ai_inspect_strategies
CREATE TABLE `wecom_ai_inspect_strategies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `strategy_name` varchar(100) NOT NULL,
  `detect_types` json DEFAULT NULL COMMENT '检测类型',
  `scope` varchar(20) DEFAULT 'all' COMMENT '适用范围',
  `scope_config` json DEFAULT NULL COMMENT '范围配置',
  `max_score` int DEFAULT '100',
  `deduct_rules` json DEFAULT NULL COMMENT '扣分规则',
  `risk_levels` json DEFAULT NULL COMMENT '风险等级配置',
  `ai_model_id` int DEFAULT NULL COMMENT '关联AI模型ID',
  `prompt_template` text COMMENT '提示词模板',
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_ai_logs
CREATE TABLE `wecom_ai_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `agent_id` int DEFAULT NULL,
  `agent_name` varchar(100) DEFAULT NULL,
  `operation_type` varchar(50) DEFAULT NULL COMMENT '操作类型',
  `target_description` varchar(500) DEFAULT NULL COMMENT '目标描述',
  `input_tokens` int DEFAULT '0',
  `output_tokens` int DEFAULT '0',
  `total_tokens` int DEFAULT '0',
  `duration_ms` int DEFAULT '0',
  `status` enum('success','fail','timeout') DEFAULT 'success',
  `error_message` text,
  `request_payload` text,
  `response_payload` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_ai_models
CREATE TABLE `wecom_ai_models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `model_name` varchar(100) NOT NULL COMMENT '模型名称',
  `provider` enum('openai','azure','claude','deepseek','qwen','custom') NOT NULL DEFAULT 'openai',
  `api_url` varchar(500) DEFAULT NULL COMMENT 'API地址',
  `api_key` varchar(500) DEFAULT NULL COMMENT 'API密钥(加密)',
  `model_id` varchar(100) DEFAULT NULL COMMENT '模型标识',
  `temperature` decimal(3,2) DEFAULT '0.70',
  `max_tokens` int DEFAULT '4096',
  `top_p` decimal(3,2) DEFAULT '1.00',
  `is_default` tinyint(1) DEFAULT '0',
  `is_enabled` tinyint(1) DEFAULT '1',
  `last_test_time` datetime DEFAULT NULL,
  `last_test_status` varchar(20) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_anti_spam_rules
CREATE TABLE `wecom_anti_spam_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wecom_config_id` int DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `detect_types` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON: ["keyword","link","frequency"]',
  `punishments` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON array of punishments',
  `keywords` text COLLATE utf8mb4_unicode_ci,
  `keyword_mode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'any',
  `link_mode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'block_all',
  `link_whitelist` text COLLATE utf8mb4_unicode_ci,
  `freq_minutes` int NOT NULL DEFAULT '5',
  `freq_max_msg` int NOT NULL DEFAULT '10',
  `exempt_employee` tinyint NOT NULL DEFAULT '1',
  `exempt_admin` tinyint NOT NULL DEFAULT '0',
  `specified_groups` text COLLATE utf8mb4_unicode_ci,
  `specified_templates` text COLLATE utf8mb4_unicode_ci,
  `is_enabled` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_wasr_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_archive_members
CREATE TABLE `wecom_archive_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(50) DEFAULT NULL COMMENT '租户ID',
  `wecom_user_id` varchar(100) NOT NULL COMMENT '企微成员userId',
  `wecom_user_name` varchar(200) DEFAULT NULL COMMENT '成员名称(冗余)',
  `crm_user_id` varchar(50) DEFAULT NULL COMMENT '关联CRM用户ID',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用存档',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_archive_settings
CREATE TABLE `wecom_archive_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '租户ID',
  `wecom_config_id` int DEFAULT NULL COMMENT '企微配置ID',
  `retention_days` int NOT NULL DEFAULT '365' COMMENT '保留天数',
  `max_users` int NOT NULL DEFAULT '10' COMMENT '开通人数上限',
  `used_users` int NOT NULL DEFAULT '0' COMMENT '已使用人数',
  `expire_date` date DEFAULT NULL COMMENT '服务到期日期',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '状态: active/expired/disabled',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `fetch_interval` int DEFAULT '5' COMMENT '拉取间隔(分钟)',
  `fetch_mode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'default' COMMENT '拉取模式: default/pre_page/adaptive',
  `media_storage` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'local' COMMENT '媒体存储方式: local/oss',
  `auto_inspect` tinyint(1) DEFAULT '0' COMMENT '是否自动质检',
  `member_scope` text COLLATE utf8mb4_unicode_ci COMMENT '存档成员范围(JSON)',
  `rsa_public_key` text COLLATE utf8mb4_unicode_ci COMMENT 'RSA公钥',
  `visibility` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'all' COMMENT '成员可见性: self/department/all',
  `audit_members` text COLLATE utf8mb4_unicode_ci COMMENT '质检审计可见成员(JSON数组,CRM用户ID列表)',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_auto_match_suggestions
CREATE TABLE `wecom_auto_match_suggestions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `wecom_customer_id` int NOT NULL COMMENT '企微客户ID',
  `crm_customer_id` varchar(50) NOT NULL COMMENT 'CRM客户ID',
  `match_type` enum('phone','name') NOT NULL DEFAULT 'phone' COMMENT '匹配方式',
  `match_field` varchar(100) DEFAULT NULL COMMENT '匹配的值(如手机号)',
  `confidence` enum('high','medium','low') NOT NULL DEFAULT 'medium' COMMENT '置信度',
  `status` enum('pending','confirmed','rejected') NOT NULL DEFAULT 'pending' COMMENT '状态',
  `confirmed_by` varchar(50) DEFAULT NULL COMMENT '确认人',
  `confirmed_at` datetime DEFAULT NULL COMMENT '确认时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_chat_audit_marks
CREATE TABLE `wecom_chat_audit_marks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wecom_config_id` int NOT NULL COMMENT '企微配置ID',
  `chat_record_id` int DEFAULT NULL COMMENT '关联消息记录ID',
  `from_user_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '消息发送者',
  `to_user_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '消息接收者',
  `msg_content` text COLLATE utf8mb4_unicode_ci COMMENT '被标记的消息原文',
  `msg_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '消息类型',
  `msg_time` bigint DEFAULT NULL COMMENT '消息时间戳',
  `risk_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '风险类型',
  `risk_level` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'medium' COMMENT '风险等级',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '审计备注',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '处理状态',
  `operator_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标记操作人ID',
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标记操作人名称',
  `resolver_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '处理人ID',
  `resolver_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '处理人名称',
  `resolve_remark` text COLLATE utf8mb4_unicode_ci COMMENT '处理备注',
  `resolved_at` datetime DEFAULT NULL COMMENT '处理时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_marks_tenant` (`tenant_id`),
  KEY `idx_audit_marks_config` (`wecom_config_id`),
  KEY `idx_audit_marks_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话存档风险审计标记表';

-- 表: wecom_chat_records
CREATE TABLE `wecom_chat_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wecom_config_id` int NOT NULL,
  `corp_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `msg_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `msg_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `from_user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `from_user_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_user_ids` text COLLATE utf8mb4_unicode_ci,
  `room_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `msg_time` bigint NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `media_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `media_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `audit_remark` text COLLATE utf8mb4_unicode_ci,
  `audit_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `audit_time` datetime DEFAULT NULL,
  `is_sensitive` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绉熸埛ID',
  `sender_type` tinyint DEFAULT NULL COMMENT '发送者类型: 1员工 2客户',
  `receiver_type` tinyint DEFAULT NULL COMMENT '接收者类型: 1员工 2客户 3群聊',
  `oss_path` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'OSS存储路径',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_configs
CREATE TABLE `wecom_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置名称',
  `corp_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '企业ID',
  `corp_secret` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '应用Secret',
  `agent_id` int DEFAULT NULL COMMENT '应用AgentId',
  `callback_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '回调Token',
  `encoding_aes_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '消息加解密密钥',
  `callback_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '回调URL',
  `contact_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '通讯录Secret',
  `external_contact_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户联系Secret',
  `chat_archive_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '会话存档Secret',
  `chat_archive_private_key` text COLLATE utf8mb4_unicode_ci COMMENT '会话存档私钥',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `connection_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '连接状态',
  `last_error` text COLLATE utf8mb4_unicode_ci COMMENT '最后错误信息',
  `last_api_call_time` datetime DEFAULT NULL COMMENT '最后API调用时间',
  `api_call_count` int DEFAULT '0' COMMENT 'API调用次数',
  `bind_operator` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绑定操作人',
  `bind_time` datetime DEFAULT NULL COMMENT '绑定时间',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `auth_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'self_built' COMMENT '授权类型: third_party/self_built',
  `permanent_code` text COLLATE utf8mb4_unicode_ci COMMENT '第三方应用永久授权码(加密存储)',
  `suite_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '第三方应用SuiteID',
  `auth_corp_info` text COLLATE utf8mb4_unicode_ci COMMENT '授权方企业信息(JSON)',
  `auth_user_info` text COLLATE utf8mb4_unicode_ci COMMENT '授权管理员信息(JSON)',
  `auth_scope` text COLLATE utf8mb4_unicode_ci COMMENT '授权范围(JSON)',
  `data_api_status` tinyint DEFAULT '0' COMMENT '数据API授权状态: 0未授权 1已授权 2已过期',
  `data_api_expire_time` datetime DEFAULT NULL COMMENT '数据API授权到期时间',
  `vas_chat_archive` tinyint(1) DEFAULT '0' COMMENT '是否开通会话存档增值服务',
  `vas_expire_date` date DEFAULT NULL COMMENT '增值服务到期时间',
  `vas_user_count` int DEFAULT '0' COMMENT '增值服务开通人数',
  `auth_mode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'self_built' COMMENT '授权模式: third_party/self_built',
  `auth_corp_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '授权企业名称',
  `auth_admin_user_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '授权管理员UserID',
  `auth_time` datetime DEFAULT NULL COMMENT '授权时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_contact_way_daily_stats
CREATE TABLE `wecom_contact_way_daily_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `contact_way_id` int NOT NULL COMMENT '活码ID',
  `stat_date` date NOT NULL COMMENT '统计日期',
  `add_count` int DEFAULT '0' COMMENT '添加数',
  `loss_count` int DEFAULT '0' COMMENT '流失数',
  `net_count` int DEFAULT '0' COMMENT '净增数',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_contact_ways
CREATE TABLE `wecom_contact_ways` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `wecom_config_id` int NOT NULL,
  `config_id` varchar(100) DEFAULT NULL COMMENT '企微返回的config_id',
  `name` varchar(200) NOT NULL COMMENT '活码名称',
  `type` int DEFAULT '1' COMMENT '1=单人/多人 2=群聊',
  `scene` int DEFAULT '2' COMMENT '1=小程序 2=二维码',
  `style` int DEFAULT '0' COMMENT '样式0-3',
  `state` varchar(100) DEFAULT NULL COMMENT '渠道标识',
  `remark` varchar(500) DEFAULT NULL,
  `skip_verify` tinyint(1) DEFAULT '1' COMMENT '跳过验证',
  `is_exclusive` tinyint(1) DEFAULT '0' COMMENT '同一外部企业客户只能添加同一员工',
  `user_ids` json DEFAULT NULL COMMENT '接待成员列表',
  `party_ids` json DEFAULT NULL COMMENT '接待部门列表',
  `is_temp` tinyint(1) DEFAULT '0' COMMENT '是否临时活码',
  `qr_code` varchar(500) DEFAULT NULL COMMENT '二维码链接',
  `welcome_enabled` tinyint(1) DEFAULT '0',
  `welcome_config` json DEFAULT NULL COMMENT '欢迎语配置',
  `auto_tags` json DEFAULT NULL COMMENT '自动标签',
  `weight_mode` enum('single','round_robin','weighted') DEFAULT 'single' COMMENT '分配模式',
  `user_weights` json DEFAULT NULL COMMENT '成员权重配置',
  `smart_rule_id` int DEFAULT NULL COMMENT '智能规则ID',
  `auto_group_enabled` tinyint(1) DEFAULT '0',
  `auto_group_config` json DEFAULT NULL COMMENT '自动建群配置',
  `total_add_count` int DEFAULT '0' COMMENT '总添加数',
  `total_loss_count` int DEFAULT '0' COMMENT '总流失数',
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_by` varchar(50) DEFAULT NULL COMMENT '创建人ID',
  `created_by_name` varchar(100) DEFAULT NULL COMMENT '创建人名称',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `today_add_count` int NOT NULL DEFAULT '0',
  `today_loss_count` int NOT NULL DEFAULT '0',
  `abnormal_count` int NOT NULL DEFAULT '0' COMMENT '异常数',
  `current_reception_count` int NOT NULL DEFAULT '0' COMMENT '当前接待人数',
  `open_message_count` int NOT NULL DEFAULT '0' COMMENT '开口消息数',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_customer_events
CREATE TABLE `wecom_customer_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `wecom_config_id` int NOT NULL,
  `external_user_id` varchar(100) NOT NULL,
  `event_type` enum('add','delete','tag','link','group_join','group_leave','crm_link') NOT NULL,
  `event_detail` json DEFAULT NULL COMMENT '事件详情',
  `operator_id` varchar(100) DEFAULT NULL COMMENT '操作人',
  `event_time` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_customer_groups
CREATE TABLE `wecom_customer_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '租户ID',
  `wecom_config_id` int NOT NULL COMMENT '企微配置ID',
  `chat_id` varchar(100) NOT NULL COMMENT '群聊ID',
  `name` varchar(200) DEFAULT NULL COMMENT '群名称',
  `owner_user_id` varchar(100) DEFAULT NULL COMMENT '群主UserID',
  `owner_user_name` varchar(100) DEFAULT NULL COMMENT '群主姓名',
  `member_count` int DEFAULT '0' COMMENT '群成员数量',
  `today_msg_count` int DEFAULT '0' COMMENT '今日消息数',
  `notice` text COMMENT '群公告',
  `create_time` datetime DEFAULT NULL COMMENT '群创建时间',
  `status` varchar(20) DEFAULT 'normal' COMMENT '状态: normal/dismissed',
  `member_list` text COMMENT '群成员列表(JSON)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_customers
CREATE TABLE `wecom_customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wecom_config_id` int NOT NULL,
  `corp_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `external_user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` int DEFAULT '1',
  `gender` int DEFAULT '0',
  `corp_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `follow_user_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `follow_user_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `add_time` datetime DEFAULT NULL,
  `add_way` int DEFAULT NULL,
  `tag_ids` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `delete_time` datetime DEFAULT NULL,
  `is_dealt` tinyint(1) DEFAULT '0',
  `crm_customer_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tag_names` text COLLATE utf8mb4_unicode_ci COMMENT '客户标签名称列表(JSON)',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '手机号',
  `state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '渠道来源标识',
  `msg_sent_count` int DEFAULT '0' COMMENT '发送消息数',
  `msg_recv_count` int DEFAULT '0' COMMENT '接收消息数',
  `last_msg_time` bigint DEFAULT NULL COMMENT '最后消息时间戳',
  `active_days_7d` int DEFAULT '0' COMMENT '近7天活跃天数',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `last_chat_time` datetime DEFAULT NULL COMMENT '最后聊天时间',
  `follow_users` text COLLATE utf8mb4_unicode_ci COMMENT '所有跟进人信息(JSON数组)，包含完整的follow_user列表',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_department_mappings
CREATE TABLE `wecom_department_mappings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `wecom_config_id` int NOT NULL,
  `wecom_dept_id` int NOT NULL COMMENT '企微部门ID',
  `wecom_dept_name` varchar(200) DEFAULT NULL,
  `wecom_parent_id` int DEFAULT NULL COMMENT '企微父部门ID',
  `crm_dept_id` varchar(50) DEFAULT NULL COMMENT 'CRM部门ID',
  `crm_dept_name` varchar(200) DEFAULT NULL,
  `member_count` int DEFAULT '0',
  `last_sync_time` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_group_broadcasts
CREATE TABLE `wecom_group_broadcasts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wecom_config_id` int DEFAULT NULL,
  `task_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all' COMMENT 'all/specified/template',
  `target_desc` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachments` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON attachments',
  `content_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '文本',
  `send_mode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'now',
  `scheduled_time` datetime DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT 'draft/pending/sent/failed/cancelled',
  `target_count` int NOT NULL DEFAULT '0',
  `success_count` int NOT NULL DEFAULT '0',
  `fail_count` int NOT NULL DEFAULT '0',
  `specified_groups` text COLLATE utf8mb4_unicode_ci,
  `specified_templates` text COLLATE utf8mb4_unicode_ci,
  `detail_results` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON array of per-group results',
  `wecom_msg_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_wgb_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_group_templates
CREATE TABLE `wecom_group_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `wecom_config_id` int NOT NULL COMMENT '企微配置ID',
  `template_name` varchar(100) NOT NULL COMMENT '模板名称',
  `group_name_prefix` varchar(100) DEFAULT NULL COMMENT '群名前缀',
  `max_members` int DEFAULT '200' COMMENT '最大成员数',
  `owner_user_id` varchar(100) DEFAULT NULL COMMENT '群主UserID',
  `welcome_enabled` tinyint(1) DEFAULT '0' COMMENT '是否启用欢迎语',
  `welcome_text` text COMMENT '欢迎语内容',
  `welcome_media_type` enum('none','image','link','miniprogram') DEFAULT 'none' COMMENT '欢迎语附件类型',
  `welcome_media_content` json DEFAULT NULL COMMENT '欢迎语附件内容',
  `anti_spam_enabled` tinyint(1) DEFAULT '0' COMMENT '是否启用防骚扰',
  `anti_spam_rules` json DEFAULT NULL COMMENT '防骚扰规则',
  `notice_template` text COMMENT '群公告模板',
  `auto_tags` json DEFAULT NULL COMMENT '自动标签',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_group_welcomes
CREATE TABLE `wecom_group_welcomes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wecom_config_id` int DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all' COMMENT 'all/specified/template',
  `text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `link_title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `link_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specified_groups` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON array of chatIds',
  `specified_templates` text COLLATE utf8mb4_unicode_ci COMMENT 'JSON array of template IDs',
  `wecom_template_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '企微欢迎语模板ID',
  `is_enabled` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_wgw_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_kf_sessions
CREATE TABLE `wecom_kf_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `wecom_config_id` int NOT NULL COMMENT '企微配置ID',
  `open_kf_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客服账号ID',
  `external_userid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户外部ID',
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户名称',
  `servicer_userid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '接待人员ID',
  `servicer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '接待人员名称',
  `session_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'open' COMMENT '会话状态: open/closed/timeout',
  `msg_count` int DEFAULT '0' COMMENT '消息数量',
  `first_response_time` int DEFAULT NULL COMMENT '首次响应时间(秒)',
  `avg_response_time` int DEFAULT NULL COMMENT '平均响应时间(秒)',
  `satisfaction` tinyint DEFAULT NULL COMMENT '满意度(1-5)',
  `last_msg_content` text COLLATE utf8mb4_unicode_ci COMMENT '最后消息内容',
  `last_msg_time` datetime DEFAULT NULL COMMENT '最后消息时间',
  `session_start_time` datetime DEFAULT NULL COMMENT '会话开始时间',
  `session_end_time` datetime DEFAULT NULL COMMENT '会话结束时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_knowledge_bases
CREATE TABLE `wecom_knowledge_bases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `document_count` int DEFAULT '0',
  `entry_count` int DEFAULT '0',
  `total_size` bigint DEFAULT '0',
  `index_status` enum('pending','indexing','indexed','failed') DEFAULT 'pending',
  `last_index_time` datetime DEFAULT NULL,
  `sync_crm_enabled` tinyint(1) DEFAULT '0',
  `sync_crm_sources` json DEFAULT NULL,
  `sync_frequency` enum('daily','manual') DEFAULT 'manual',
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_knowledge_entries
CREATE TABLE `wecom_knowledge_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `knowledge_base_id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text,
  `tags` json DEFAULT NULL,
  `source_type` enum('manual','document','crm_sync') DEFAULT 'manual',
  `source_file` varchar(500) DEFAULT NULL,
  `embedding` text,
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_notification_templates
CREATE TABLE `wecom_notification_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '企微消息模板ID',
  `template_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板名称(自定义标签)',
  `template_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板类型: order/customer/follow_up/payment/custom',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '模板用途描述',
  `template_content` text COLLATE utf8mb4_unicode_ci COMMENT '模板内容/变量说明(JSON)',
  `is_enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `notify_scope` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'all' COMMENT '通知范围: self/team/all',
  `suite_config_id` int DEFAULT NULL COMMENT '关联服务商应用ID',
  `template_variables` text COLLATE utf8mb4_unicode_ci COMMENT '模板变量定义JSON',
  PRIMARY KEY (`id`),
  KEY `IDX_ntpl_type` (`template_type`),
  KEY `IDX_ntpl_enabled` (`is_enabled`),
  KEY `IDX_ntpl_suite` (`suite_config_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_payment_qrcodes
CREATE TABLE `wecom_payment_qrcodes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wecom_config_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '收款码名称',
  `amount_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'custom' COMMENT 'fixed/custom',
  `fixed_amount` int NOT NULL DEFAULT '0' COMMENT '固定金额(分)',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '收款码描述',
  `member_user_ids` text COLLATE utf8mb4_unicode_ci COMMENT '使用成员UserID JSON数组',
  `member_names` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '使用成员姓名',
  `remark_template` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注模板',
  `qr_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '二维码URL',
  `total_amount` bigint NOT NULL DEFAULT '0' COMMENT '累计收款(分)',
  `total_count` int NOT NULL DEFAULT '0' COMMENT '累计笔数',
  `is_enabled` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_wecom_qrcode_config` (`wecom_config_id`),
  KEY `IDX_wecom_qrcode_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_payment_records
CREATE TABLE `wecom_payment_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wecom_config_id` int NOT NULL,
  `corp_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `trade_no` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_user_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` int NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `pay_time` datetime DEFAULT NULL,
  `refund_time` datetime DEFAULT NULL,
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `payment_no` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '收款单号',
  `department_id` int DEFAULT NULL COMMENT '收款人所属部门ID',
  `department_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门名称',
  `payer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '付款人昵称',
  `pay_method` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '支付方式',
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CNY' COMMENT '币种',
  `refund_amount` int NOT NULL DEFAULT '0' COMMENT '已退款金额(分)',
  `qrcode_id` int DEFAULT NULL COMMENT '关联收款码ID',
  `crm_order_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联CRM订单号',
  `crm_customer_id` int DEFAULT NULL COMMENT '关联CRM客户ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_payment_refunds
CREATE TABLE `wecom_payment_refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wecom_config_id` int NOT NULL,
  `refund_no` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '退款单号',
  `original_payment_no` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '原收款单号',
  `original_trade_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原交易单号',
  `payer_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原付款人',
  `operator_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人UserID',
  `operator_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人姓名',
  `original_amount` int NOT NULL COMMENT '原交易金额(分)',
  `refund_amount` int NOT NULL COMMENT '退款金额(分)',
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '退款原因',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'processing' COMMENT 'processing/completed/rejected',
  `refund_time` datetime DEFAULT NULL COMMENT '退款完成时间',
  `reject_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '拒绝原因',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_wecom_refund_no` (`refund_no`),
  KEY `IDX_wecom_refund_payment` (`original_payment_no`),
  KEY `IDX_wecom_refund_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_quality_inspections
CREATE TABLE `wecom_quality_inspections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '租户ID',
  `wecom_config_id` int NOT NULL COMMENT '企微配置ID',
  `session_key` varchar(200) DEFAULT NULL COMMENT '会话标识',
  `from_user_id` varchar(100) DEFAULT NULL COMMENT '员工UserID',
  `from_user_name` varchar(100) DEFAULT NULL COMMENT '员工姓名',
  `to_user_id` varchar(100) DEFAULT NULL COMMENT '对方UserID',
  `to_user_name` varchar(100) DEFAULT NULL COMMENT '对方姓名',
  `room_id` varchar(100) DEFAULT NULL COMMENT '群聊ID(群聊场景)',
  `message_count` int DEFAULT '0' COMMENT '消息数量',
  `start_time` datetime DEFAULT NULL COMMENT '会话开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '会话结束时间',
  `status` varchar(20) DEFAULT 'pending' COMMENT '状态: pending/normal/excellent/violation',
  `violation_type` text COMMENT '违规类型(JSON数组)',
  `score` int DEFAULT NULL COMMENT '质检评分(0-100)',
  `remark` text COMMENT '质检备注',
  `inspector_id` varchar(50) DEFAULT NULL COMMENT '质检员ID',
  `inspector_name` varchar(100) DEFAULT NULL COMMENT '质检员姓名',
  `inspected_at` datetime DEFAULT NULL COMMENT '质检时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_quality_rules
CREATE TABLE `wecom_quality_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '租户ID',
  `name` varchar(100) NOT NULL COMMENT '规则名称',
  `rule_type` varchar(30) NOT NULL COMMENT '规则类型: response_time/msg_count/keyword/emotion',
  `conditions` text NOT NULL COMMENT '条件参数(JSON)',
  `score_value` int DEFAULT '0' COMMENT '分值(正加负减)',
  `apply_scope` text COMMENT '适用范围(JSON: 部门/员工)',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_quick_replies
CREATE TABLE `wecom_quick_replies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `category` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'enterprise' COMMENT '类别: enterprise/personal',
  `group_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分组名称',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标题',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '内容',
  `shortcut` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '快捷键',
  `use_count` int DEFAULT '0' COMMENT '使用次数',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `sort_order` int DEFAULT '0' COMMENT '排序',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建人',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_script_categories
CREATE TABLE `wecom_script_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `sort_order` int DEFAULT '0',
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `color` varchar(100) DEFAULT NULL,
  `scope` varchar(100) DEFAULT 'public',
  `created_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_scripts
CREATE TABLE `wecom_scripts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `content` text,
  `shortcut` varchar(50) DEFAULT NULL COMMENT '快捷短语',
  `attachments` json DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `use_count` int DEFAULT '0',
  `ai_rewrite_enabled` tinyint(1) DEFAULT '0',
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `scope` varchar(100) DEFAULT 'public',
  `created_by` varchar(100) DEFAULT NULL,
  `created_by_name` varchar(100) DEFAULT NULL,
  `color` varchar(100) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_sensitive_hits
CREATE TABLE `wecom_sensitive_hits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '租户ID',
  `wecom_config_id` int NOT NULL COMMENT '企微配置ID',
  `chat_record_id` int DEFAULT NULL COMMENT '关联的聊天记录ID',
  `word_id` int NOT NULL COMMENT '命中的敏感词ID',
  `word` varchar(200) NOT NULL COMMENT '命中的敏感词内容',
  `context` text COMMENT '消息上下文',
  `from_user_id` varchar(100) DEFAULT NULL COMMENT '发送者ID',
  `from_user_name` varchar(100) DEFAULT NULL COMMENT '发送者姓名',
  `to_user_id` varchar(100) DEFAULT NULL COMMENT '接收者ID',
  `status` varchar(20) DEFAULT 'pending' COMMENT '状态: pending/processed/ignored',
  `processed_by` varchar(50) DEFAULT NULL COMMENT '处理人',
  `processed_at` datetime DEFAULT NULL COMMENT '处理时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_sensitive_words
CREATE TABLE `wecom_sensitive_words` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL COMMENT '租户ID',
  `wecom_config_id` int DEFAULT NULL COMMENT '企微配置ID(NULL表示全局)',
  `word` varchar(200) NOT NULL COMMENT '敏感词',
  `group_name` varchar(100) DEFAULT 'custom' COMMENT '分组: porn/politics/violence/competitor/custom',
  `level` varchar(20) DEFAULT 'warning' COMMENT '级别: info/warning/danger/critical',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `created_by` varchar(50) DEFAULT NULL COMMENT '创建人',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_service_accounts
CREATE TABLE `wecom_service_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wecom_config_id` int NOT NULL,
  `corp_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `open_kf_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `servicer_user_ids` text COLLATE utf8mb4_unicode_ci,
  `kf_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客服链接URL',
  `welcome_msg` text COLLATE utf8mb4_unicode_ci,
  `is_enabled` tinyint(1) DEFAULT '1',
  `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `service_time_start` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '接待时间开始',
  `service_time_end` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '接待时间结束',
  `today_service_count` int NOT NULL DEFAULT '0' COMMENT '今日接待数',
  `total_service_count` int NOT NULL DEFAULT '0' COMMENT '累计接待数',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_sidebar_auth_codes
CREATE TABLE `wecom_sidebar_auth_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) DEFAULT NULL,
  `code` varchar(100) NOT NULL COMMENT '授权码',
  `code_type` enum('single','multi','permanent') DEFAULT 'single',
  `max_uses` int DEFAULT '1',
  `used_count` int DEFAULT '0',
  `expire_at` datetime DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_suite_auth_links
CREATE TABLE `wecom_suite_auth_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `suite_id` varchar(100) DEFAULT NULL,
  `pre_auth_code` varchar(255) DEFAULT NULL,
  `auth_url` text,
  `redirect_uri` text,
  `state` varchar(100) DEFAULT 'general',
  `type` varchar(20) DEFAULT 'general',
  `tenant_id` varchar(100) DEFAULT NULL,
  `expire_days` int DEFAULT '7',
  `status` varchar(20) DEFAULT 'pending',
  `auth_corp_id` varchar(100) DEFAULT NULL,
  `auth_corp_name` varchar(200) DEFAULT NULL,
  `auth_time` datetime DEFAULT NULL,
  `remark` varchar(500) DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_suite_callback_logs
CREATE TABLE `wecom_suite_callback_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `info_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件类型: suite_ticket/create_auth/cancel_auth/change_auth等',
  `suite_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auth_corp_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '授权企业CorpID',
  `detail` text COLLATE utf8mb4_unicode_ci COMMENT '事件详情/解密后的XML摘要',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success' COMMENT '处理状态: success/failed',
  `error_message` text COLLATE utf8mb4_unicode_ci COMMENT '错误信息',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_suite_cb_created_at` (`created_at`),
  KEY `IDX_suite_cb_info_type` (`info_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_suite_configs
CREATE TABLE `wecom_suite_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `suite_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Suite ID',
  `suite_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Suite Secret',
  `suite_ticket` text COLLATE utf8mb4_unicode_ci COMMENT '企微推送的suite_ticket',
  `suite_ticket_updated_at` datetime DEFAULT NULL COMMENT 'suite_ticket最后更新时间',
  `provider_corp_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '服务商CorpID',
  `provider_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '服务商Secret',
  `callback_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '回调Token',
  `callback_encoding_aes_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '回调EncodingAESKey',
  `app_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'web' COMMENT '应用类型: web(网页应用)/miniprogram(小程序应用)',
  `app_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '应用名称',
  `app_description` text COLLATE utf8mb4_unicode_ci COMMENT '应用描述',
  `app_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'offline' COMMENT '应用状态: online/offline',
  `permissions` text COLLATE utf8mb4_unicode_ci COMMENT '权限范围(JSON数组)',
  `chat_archive_rsa_public_key` text COLLATE utf8mb4_unicode_ci COMMENT '会话存档RSA公钥(租户复制到企微后台加密密钥处)',
  `chat_archive_rsa_private_key` text COLLATE utf8mb4_unicode_ci COMMENT '会话存档RSA私钥(服务商级别，所有授权企业共用)',
  `zone_program_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zone_ability_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zone_sync_msg_ability_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zone_get_msg_body_ability_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'get_msg_body ability ID',
  `is_enabled` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `mp_app_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联的微信小程序AppID',
  `mp_app_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '微信小程序AppSecret(加密存储)',
  `mp_form_secret` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '表单签名密钥',
  `mp_enabled` tinyint(1) DEFAULT '0' COMMENT '是否启用小程序资料收集',
  `mp_callback_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '小程序消息推送Token',
  `mp_callback_encoding_aes_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '小程序消息推送EncodingAESKey',
  `mp_config` text COLLATE utf8mb4_unicode_ci COMMENT '小程序扩展配置(JSON)',
  `redirect_domain` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `web_login_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `web_login_encoding_aes_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `web_login_redirect_domain` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `web_login_appid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `web_login_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_user_bindings
CREATE TABLE `wecom_user_bindings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wecom_config_id` int NOT NULL COMMENT '企微配置ID',
  `corp_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '企业ID',
  `wecom_user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '企微成员UserID',
  `wecom_user_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '企微成员姓名',
  `wecom_avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '企微成员头像',
  `wecom_department_ids` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '企微部门ID列表',
  `crm_user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'CRM用户ID',
  `crm_user_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'CRM用户姓名',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `bind_operator` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绑定操作人',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 表: wecom_vas_configs
CREATE TABLE `wecom_vas_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_type` varchar(50) NOT NULL COMMENT '服务类型',
  `service_name` varchar(100) DEFAULT NULL COMMENT '服务名称',
  `default_price` decimal(10,2) DEFAULT NULL COMMENT '默认价格',
  `min_price` decimal(10,2) DEFAULT NULL COMMENT '最低价格',
  `billing_unit` varchar(20) DEFAULT 'per_user_year' COMMENT '计费单位',
  `trial_days` int DEFAULT '7' COMMENT '试用天数',
  `tier_pricing` text COMMENT '阶梯定价(JSON)',
  `description` text COMMENT '服务说明',
  `is_enabled` tinyint(1) DEFAULT '1' COMMENT '是否启用',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: wecom_vas_orders
CREATE TABLE `wecom_vas_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` varchar(36) NOT NULL COMMENT '租户ID',
  `order_no` varchar(32) NOT NULL COMMENT '订单号',
  `wecom_config_id` int DEFAULT NULL COMMENT '企微配置ID',
  `service_type` varchar(50) DEFAULT 'chat_archive' COMMENT '服务类型',
  `order_type` varchar(20) DEFAULT 'new' COMMENT '订单类型: new/renew/upgrade/addon',
  `user_count` int DEFAULT '0' COMMENT '开通/增购人数',
  `unit_price` decimal(10,2) DEFAULT NULL COMMENT '单价',
  `total_amount` decimal(10,2) NOT NULL COMMENT '总金额',
  `pay_type` varchar(20) DEFAULT NULL COMMENT '支付方式: wechat/alipay/bank',
  `pay_status` tinyint DEFAULT '0' COMMENT '0待支付 1已支付 2已取消 3已退款',
  `pay_time` datetime DEFAULT NULL COMMENT '支付时间',
  `transaction_id` varchar(64) DEFAULT NULL COMMENT '第三方支付流水号',
  `start_date` date DEFAULT NULL COMMENT '服务开始日期',
  `end_date` date DEFAULT NULL COMMENT '服务到期日期',
  `detail` text COMMENT '订单详情(JSON)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: work_phones
CREATE TABLE `work_phones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '手机号码',
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户ID',
  `device_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备名称',
  `device_model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '设备型号',
  `imei` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IMEI号',
  `status` enum('active','inactive','maintenance') COLLATE utf8mb4_unicode_ci DEFAULT 'active' COMMENT '状态',
  `last_active_at` datetime DEFAULT NULL COMMENT '最后活跃时间',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `device_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `websocket_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `online_status` enum('online','offline') COLLATE utf8mb4_unicode_ci DEFAULT 'offline',
  `last_heartbeat` datetime DEFAULT NULL,
  `app_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `os_type` enum('android','ios') COLLATE utf8mb4_unicode_ci DEFAULT 'android',
  `os_version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bind_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bind_token_expires` datetime DEFAULT NULL,
  `bind_time` datetime DEFAULT NULL,
  `connection_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'qrcode',
  `is_primary` tinyint(1) DEFAULT '1',
  `call_count` int DEFAULT '0',
  `total_duration` int DEFAULT '0',
  `tenant_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绉熸埛ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone_number`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_work_phones_tenant` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作手机表';

