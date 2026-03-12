-- CRM系统数据库表结构和初始数据
-- 适用于宝塔面板MySQL环境
-- 数据库: abc789_cn

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 数据库表结构
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `real_name` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 角色表
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `description` text,
  `is_system` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 权限表
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `description` text,
  `resource` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_name` (`name`),
  KEY `idx_resource_action` (`resource`,`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_role` (`user_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_permission` (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 部门表
CREATE TABLE IF NOT EXISTS `departments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `parent_id` int(11) DEFAULT NULL,
  `manager_id` int(11) DEFAULT NULL,
  `sort_order` int(11) DEFAULT '0',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  KEY `manager_id` (`manager_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `departments_ibfk_2` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 客户表
CREATE TABLE IF NOT EXISTS `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_no` varchar(20) DEFAULT NULL COMMENT '客户编号',
  `name` varchar(100) NOT NULL COMMENT '客户姓名',
  `type` varchar(50) DEFAULT 'individual' COMMENT '客户类型：individual-个人，enterprise-企业',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `company` varchar(100) DEFAULT NULL COMMENT '公司名称',
  `position` varchar(50) DEFAULT NULL COMMENT '职位',
  `address` varchar(500) DEFAULT NULL COMMENT '完整地址',
  `province` varchar(50) DEFAULT NULL COMMENT '省份',
  `city` varchar(50) DEFAULT NULL COMMENT '城市',
  `district` varchar(50) DEFAULT NULL COMMENT '区县',
  `street` varchar(100) DEFAULT NULL COMMENT '街道',
  `detail_address` varchar(200) DEFAULT NULL COMMENT '详细地址',
  `overseas_address` varchar(500) DEFAULT NULL COMMENT '境外地址',
  `status` varchar(50) DEFAULT 'potential' COMMENT '客户状态：potential-潜在客户，contacted-已联系，negotiating-洽谈中，deal-成交，lost-流失',
  `level` varchar(50) DEFAULT 'C' COMMENT '客户等级：A-重要客户，B-一般客户，C-普通客户，D-低价值客户',
  `source` varchar(50) DEFAULT 'other' COMMENT '客户来源',
  `sales_user_id` int(11) DEFAULT NULL COMMENT '负责销售员ID',
  `notes` text COMMENT '备注信息',
  `tags` json DEFAULT NULL COMMENT '标签（JSON数组）',
  `age` int(11) DEFAULT NULL COMMENT '年龄',
  `gender` varchar(20) DEFAULT 'unknown' COMMENT '性别：male-男，female-女，unknown-未知',
  `height` decimal(5,1) DEFAULT NULL COMMENT '身高(cm)',
  `weight` decimal(5,1) DEFAULT NULL COMMENT '体重(kg)',
  `wechat` varchar(50) DEFAULT NULL COMMENT '微信号',
  `medical_history` text COMMENT '疾病史',
  `improvement_goals` json DEFAULT NULL COMMENT '改善目标（JSON数组）',
  `other_goals` varchar(200) DEFAULT NULL COMMENT '其他改善目标',
  `fan_acquisition_time` datetime DEFAULT NULL COMMENT '进粉时间',
  `last_contact_at` datetime DEFAULT NULL COMMENT '最后联系时间',
  `next_follow_up_at` datetime DEFAULT NULL COMMENT '下次跟进时间',
  `order_count` int(11) DEFAULT 0 COMMENT '订单数量',
  `return_count` int(11) DEFAULT 0 COMMENT '退货次数',
  `total_amount` decimal(10,2) DEFAULT 0 COMMENT '总消费金额',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_no` (`customer_no`),
  KEY `idx_phone` (`phone`),
  KEY `idx_status` (`status`),
  KEY `idx_level` (`level`),
  KEY `idx_sales_user_id` (`sales_user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`sales_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 产品分类表
CREATE TABLE IF NOT EXISTS `product_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `parent_id` int(11) DEFAULT NULL,
  `sort_order` int(11) DEFAULT '0',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `product_categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 产品表
CREATE TABLE IF NOT EXISTS `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sku` varchar(100) NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` text,
  `category_id` int(11) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT '0.00',
  `cost` decimal(10,2) DEFAULT '0.00',
  `stock_quantity` int(11) DEFAULT '0',
  `min_stock_level` int(11) DEFAULT '0',
  `status` enum('active','inactive','discontinued') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `category_id` (`category_id`),
  KEY `idx_sku` (`sku`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订单表
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NOT NULL COMMENT '订单号',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) NULL COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) NULL COMMENT '客户电话',
  `service_wechat` VARCHAR(100) NULL COMMENT '客服微信号',
  `order_source` VARCHAR(50) NULL COMMENT '订单来源',
  `products` JSON NULL COMMENT '商品列表',
  `status` VARCHAR(50) DEFAULT 'pending_transfer' COMMENT '订单状态',
  `total_amount` DECIMAL(10,2) NOT NULL COMMENT '订单总金额',
  `discount_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '优惠金额',
  `final_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '实付金额',
  `deposit_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '定金金额',
  `deposit_screenshots` JSON NULL COMMENT '定金截图',
  `payment_status` VARCHAR(50) DEFAULT 'unpaid' COMMENT '支付状态',
  `payment_method` VARCHAR(50) NULL COMMENT '支付方式',
  `payment_method_other` VARCHAR(100) NULL COMMENT '其他支付方式说明',
  `payment_time` DATETIME NULL COMMENT '支付时间',
  `shipping_name` VARCHAR(100) NULL COMMENT '收货人姓名',
  `shipping_phone` VARCHAR(20) NULL COMMENT '收货人电话',
  `shipping_address` TEXT NULL COMMENT '收货地址',
  `express_company` VARCHAR(50) NULL COMMENT '快递公司',
  `tracking_number` VARCHAR(100) NULL COMMENT '快递单号',
  `shipped_at` DATETIME NULL COMMENT '发货时间',
  `shipping_time` VARCHAR(50) NULL COMMENT '发货时间字符串',
  `expected_delivery_date` VARCHAR(20) NULL COMMENT '预计送达日期',
  `delivered_at` DATETIME NULL COMMENT '签收时间',
  `cancelled_at` DATETIME NULL COMMENT '取消时间',
  `cancel_reason` TEXT NULL COMMENT '取消原因',
  `refund_amount` DECIMAL(10,2) NULL COMMENT '退款金额',
  `refund_reason` TEXT NULL COMMENT '退款原因',
  `refund_time` DATETIME NULL COMMENT '退款时间',
  `invoice_type` VARCHAR(50) NULL COMMENT '发票类型',
  `invoice_title` VARCHAR(200) NULL COMMENT '发票抬头',
  `invoice_number` VARCHAR(100) NULL COMMENT '发票号码',
  `mark_type` VARCHAR(20) DEFAULT 'normal' COMMENT '订单标记类型',
  `logistics_status` VARCHAR(50) NULL COMMENT '物流状态',
  `latest_logistics_info` VARCHAR(500) NULL COMMENT '最新物流动态',
  `is_todo` TINYINT(1) DEFAULT 0 COMMENT '是否待办',
  `todo_date` DATE NULL COMMENT '待办日期',
  `todo_remark` TEXT NULL COMMENT '待办备注',
  `custom_fields` JSON NULL COMMENT '自定义字段(旧版，保留兼容)',
  `custom_field1` VARCHAR(500) NULL COMMENT '自定义字段1',
  `custom_field2` VARCHAR(500) NULL COMMENT '自定义字段2',
  `custom_field3` VARCHAR(500) NULL COMMENT '自定义字段3',
  `custom_field4` VARCHAR(500) NULL COMMENT '自定义字段4',
  `custom_field5` VARCHAR(500) NULL COMMENT '自定义字段5',
  `custom_field6` VARCHAR(500) NULL COMMENT '自定义字段6',
  `custom_field7` VARCHAR(500) NULL COMMENT '自定义字段7',
  `remark` TEXT NULL COMMENT '订单备注',
  `performance_status` VARCHAR(20) DEFAULT 'pending' COMMENT '绩效状态: pending-待处理, valid-有效, invalid-无效',
  `performance_coefficient` DECIMAL(3,2) DEFAULT 1.00 COMMENT '绩效系数',
  `performance_remark` VARCHAR(200) NULL COMMENT '绩效备注',
  `estimated_commission` DECIMAL(10,2) DEFAULT 0 COMMENT '预估佣金',
  `performance_updated_at` DATETIME NULL COMMENT '绩效更新时间',
  `performance_updated_by` VARCHAR(50) NULL COMMENT '绩效更新人ID',
  `cod_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '代收金额',
  `cod_status` VARCHAR(20) DEFAULT 'pending' COMMENT '代收状态: pending-未返款, returned-已返款, cancelled-已取消代收',
  `cod_returned_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '已返款金额',
  `cod_returned_at` DATETIME NULL COMMENT '返款时间',
  `cod_cancelled_at` DATETIME NULL COMMENT '取消代收时间',
  `cod_remark` VARCHAR(500) NULL COMMENT '代收备注',
  `operator_id` VARCHAR(50) NULL COMMENT '操作员ID',
  `operator_name` VARCHAR(50) NULL COMMENT '操作员姓名',
  `created_by` VARCHAR(50) NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) NULL COMMENT '创建人姓名',
  `created_by_department_id` VARCHAR(50) NULL COMMENT '创建人部门ID',
  `created_by_department_name` VARCHAR(100) NULL COMMENT '创建人部门名称',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_number` (`order_number`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_cod_status` (`cod_status`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 订单项表
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT '1',
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统配置表
CREATE TABLE IF NOT EXISTS `system_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL,
  `config_value` mediumtext,
  `description` varchar(255) DEFAULT NULL,
  `config_type` enum('string','number','boolean','json') DEFAULT 'string',
  `is_public` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`),
  KEY `idx_config_key` (`config_key`),
  KEY `idx_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 操作日志表
CREATE TABLE IF NOT EXISTS `operation_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `resource` varchar(100) NOT NULL,
  `resource_id` varchar(50) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_resource` (`resource`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `operation_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 初始数据插入
-- ============================================

-- 插入默认角色
INSERT IGNORE INTO `roles` (`name`, `display_name`, `description`, `is_system`) VALUES
('super_admin', '超级管理员', '系统超级管理员，拥有所有权限', 1),
('admin', '管理员', '系统管理员', 1),
('manager', '经理', '部门经理', 0),
('sales', '销售', '销售人员', 0),
('customer_service', '客服', '客户服务人员', 0);

-- 插入默认权限
INSERT IGNORE INTO `permissions` (`name`, `display_name`, `description`, `resource`, `action`) VALUES
('user.view', '查看用户', '查看用户信息', 'user', 'view'),
('user.create', '创建用户', '创建新用户', 'user', 'create'),
('user.update', '更新用户', '更新用户信息', 'user', 'update'),
('user.delete', '删除用户', '删除用户', 'user', 'delete'),
('customer.view', '查看客户', '查看客户信息', 'customer', 'view'),
('customer.create', '创建客户', '创建新客户', 'customer', 'create'),
('customer.update', '更新客户', '更新客户信息', 'customer', 'update'),
('customer.delete', '删除客户', '删除客户', 'customer', 'delete'),
('order.view', '查看订单', '查看订单信息', 'order', 'view'),
('order.create', '创建订单', '创建新订单', 'order', 'create'),
('order.update', '更新订单', '更新订单信息', 'order', 'update'),
('order.delete', '删除订单', '删除订单', 'order', 'delete'),
('product.view', '查看产品', '查看产品信息', 'product', 'view'),
('product.create', '创建产品', '创建新产品', 'product', 'create'),
('product.update', '更新产品', '更新产品信息', 'product', 'update'),
('product.delete', '删除产品', '删除产品', 'product', 'delete'),
('system.config', '系统配置', '系统配置管理', 'system', 'config'),
('system.logs', '系统日志', '查看系统日志', 'system', 'logs');

-- 为超级管理员角色分配所有权限
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r, `permissions` p WHERE r.name = 'super_admin';

-- 插入默认管理员用户 (密码: admin123)
-- 注意：这是bcrypt加密后的密码，对应明文密码 admin123
INSERT IGNORE INTO `users` (`username`, `email`, `password`, `real_name`, `status`) VALUES
('admin', 'admin@example.com', '$2b$10$rQZ8kHWKQVnqVQZ8kHWKQOvQZ8kHWKQVnqVQZ8kHWKQOvQZ8kHWKQO', '系统管理员', 'active');

-- 为默认管理员分配超级管理员角色
INSERT IGNORE INTO `user_roles` (`user_id`, `role_id`)
SELECT u.id, r.id FROM `users` u, `roles` r WHERE u.username = 'admin' AND r.name = 'super_admin';

-- 插入默认系统配置
INSERT IGNORE INTO `system_configs` (`config_key`, `config_value`, `description`, `config_type`, `is_public`) VALUES
('system.name', 'CRM系统', '系统名称', 'string', 1),
('system.version', '1.0.0', '系统版本', 'string', 1),
('system.timezone', 'Asia/Shanghai', '系统时区', 'string', 0),
('system.language', 'zh-CN', '系统语言', 'string', 1),
('pagination.default_size', '20', '默认分页大小', 'number', 0),
('pagination.max_size', '100', '最大分页大小', 'number', 0),
('copyrightText', '', '版权文字', 'string', 1),
('icpNumber', '', 'ICP备案号', 'string', 1),
('policeNumber', '', '公安备案号', 'string', 1),
('techSupport', '', '技术支持', 'string', 1);

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 初始化完成提示
-- ============================================
-- 数据库初始化完成！
-- 默认管理员账户：
--   用户名: admin
--   密码: admin123
-- 请及时修改默认管理员密码！

-- ============================================
-- 代收取消申请表（2026-02-25新增）
-- ============================================
CREATE TABLE IF NOT EXISTS `cod_cancel_applications` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) NOT NULL COMMENT '订单ID',
  `order_number` varchar(50) NOT NULL COMMENT '订单号',
  `applicant_id` varchar(36) NOT NULL COMMENT '申请人ID',
  `applicant_name` varchar(50) NOT NULL COMMENT '申请人姓名',
  `department_id` varchar(36) DEFAULT NULL COMMENT '申请人部门ID',
  `department_name` varchar(50) DEFAULT NULL COMMENT '申请人部门名称',
  `original_cod_amount` decimal(10,2) NOT NULL COMMENT '原代收金额',
  `modified_cod_amount` decimal(10,2) NOT NULL COMMENT '修改后金额',
  `cancel_reason` text NOT NULL COMMENT '取消原因',
  `payment_proof` json DEFAULT NULL COMMENT '尾款凭证（图片URL数组）',
  `status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '申请状态：pending-待审核, approved-已通过, rejected-已驳回, cancelled-已取消',
  `reviewer_id` varchar(36) DEFAULT NULL COMMENT '审核人ID',
  `reviewer_name` varchar(50) DEFAULT NULL COMMENT '审核人姓名',
  `review_remark` text DEFAULT NULL COMMENT '审核备注',
  `reviewed_at` datetime DEFAULT NULL COMMENT '审核时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_applicant_id` (`applicant_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代收取消申请表';

-- ============================================
-- 售后服务表
-- ============================================
CREATE TABLE IF NOT EXISTS `after_sales_services` (
  `id` VARCHAR(50) NOT NULL,
  `service_number` VARCHAR(50) NOT NULL UNIQUE COMMENT '售后单号',
  `order_id` VARCHAR(50) NULL COMMENT '关联订单ID',
  `order_number` VARCHAR(50) NULL COMMENT '关联订单号',
  `customer_id` VARCHAR(50) NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) NULL COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) NULL COMMENT '客户电话',
  `service_type` VARCHAR(20) DEFAULT 'return' COMMENT '服务类型: return退货, exchange换货, repair维修, refund退款, complaint投诉, inquiry咨询',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending待处理, processing处理中, resolved已解决, closed已关闭',
  `priority` VARCHAR(20) DEFAULT 'normal' COMMENT '优先级: low低, normal普通, high高, urgent紧急',
  `reason` VARCHAR(100) NULL COMMENT '申请原因',
  `description` TEXT NULL COMMENT '详细描述',
  `product_name` VARCHAR(200) NULL COMMENT '商品名称',
  `product_spec` VARCHAR(100) NULL COMMENT '商品规格',
  `quantity` INT DEFAULT 1 COMMENT '数量',
  `price` DECIMAL(10,2) DEFAULT 0 COMMENT '金额',
  `contact_name` VARCHAR(50) NULL COMMENT '联系人姓名',
  `contact_phone` VARCHAR(20) NULL COMMENT '联系人电话',
  `contact_address` VARCHAR(500) NULL COMMENT '联系地址',
  `assigned_to` VARCHAR(50) NULL COMMENT '处理人姓名',
  `assigned_to_id` VARCHAR(50) NULL COMMENT '处理人ID',
  `remark` TEXT NULL COMMENT '备注',
  `attachments` JSON NULL COMMENT '附件列表',
  `created_by` VARCHAR(50) NULL COMMENT '创建人姓名',
  `created_by_id` VARCHAR(50) NULL COMMENT '创建人ID',
  `department_id` VARCHAR(50) NULL COMMENT '所属部门ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `expected_time` DATETIME NULL COMMENT '预计完成时间',
  `resolved_time` DATETIME NULL COMMENT '解决时间',
  PRIMARY KEY (`id`),
  INDEX `idx_service_number` (`service_number`),
  INDEX `idx_order_number` (`order_number`),
  INDEX `idx_customer_id` (`customer_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_by_id` (`created_by_id`),
  INDEX `idx_department_id` (`department_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后服务表';

-- ============================================
-- 增值管理系统表（2026-03-01新增）
-- ============================================

-- 外包公司表
CREATE TABLE IF NOT EXISTS `outsource_companies` (
  `id` VARCHAR(50) NOT NULL COMMENT '公司ID',
  `company_name` VARCHAR(200) NOT NULL COMMENT '公司名称',
  `contact_person` VARCHAR(50) NULL COMMENT '联系人',
  `contact_phone` VARCHAR(20) NULL COMMENT '联系电话',
  `contact_email` VARCHAR(100) NULL COMMENT '联系邮箱',
  `address` VARCHAR(500) NULL COMMENT '公司地址',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-启用, inactive-停用',
  `is_default` TINYINT DEFAULT 0 COMMENT '是否默认公司: 0-否, 1-是',
  `sort_order` INT DEFAULT 999 COMMENT '排序顺序',
  `total_orders` INT DEFAULT 0 COMMENT '总订单数',
  `valid_orders` INT DEFAULT 0 COMMENT '有效订单数',
  `invalid_orders` INT DEFAULT 0 COMMENT '无效订单数',
  `total_amount` DECIMAL(12,2) DEFAULT 0 COMMENT '总金额',
  `settled_amount` DECIMAL(12,2) DEFAULT 0 COMMENT '已结算金额',
  `remark` TEXT NULL COMMENT '备注',
  `created_by` VARCHAR(50) NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) NULL COMMENT '创建人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外包公司表';

-- 外包公司价格配置表（价格档位系统）
CREATE TABLE IF NOT EXISTS `value_added_price_config` (
  `id` VARCHAR(50) NOT NULL COMMENT '配置ID',
  `company_id` VARCHAR(50) NOT NULL COMMENT '外包公司ID',
  `tier_name` VARCHAR(100) NOT NULL COMMENT '档位名称',
  `tier_order` INT NOT NULL DEFAULT 1 COMMENT '档位顺序',
  `pricing_type` VARCHAR(20) NOT NULL DEFAULT 'fixed' COMMENT '计价方式: fixed-按单计价, percentage-按比例计价',
  `unit_price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '单价（按单计价时使用）',
  `percentage_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '比例（按比例计价时使用，如5.5表示5.5%）',
  `base_amount_field` VARCHAR(50) DEFAULT 'orderAmount' COMMENT '基数字段',
  `start_date` DATE NULL COMMENT '生效开始日期',
  `end_date` DATE NULL COMMENT '生效结束日期',
  `is_active` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-停用',
  `priority` INT DEFAULT 0 COMMENT '优先级',
  `condition_rules` TEXT COMMENT '条件规则JSON',
  `remark` TEXT COMMENT '备注',
  `created_by` VARCHAR(50) COMMENT '创建人ID',
  `created_by_name` VARCHAR(100) COMMENT '创建人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_tier_order` (`tier_order`),
  KEY `idx_date_range` (`start_date`, `end_date`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='外包公司价格配置表';

-- 增值订单表
CREATE TABLE IF NOT EXISTS `value_added_orders` (
  `id` VARCHAR(50) NOT NULL COMMENT '记录ID',
  `order_id` VARCHAR(50) NULL COMMENT '关联订单ID',
  `order_number` VARCHAR(50) NULL COMMENT '订单号',
  `customer_id` VARCHAR(50) NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) NULL COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) NULL COMMENT '客户电话',
  `tracking_number` VARCHAR(100) NULL COMMENT '物流单号',
  `express_company` VARCHAR(50) NULL COMMENT '物流公司',
  `order_status` VARCHAR(20) NULL COMMENT '订单状态',
  `order_date` DATETIME NULL COMMENT '下单日期',
  `company_id` VARCHAR(50) NOT NULL COMMENT '外包公司ID',
  `company_name` VARCHAR(200) NOT NULL COMMENT '外包公司名称',
  `unit_price` DECIMAL(10,2) NOT NULL COMMENT '单价（元）',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending-待处理, valid-有效, invalid-无效, supplemented-已补单',
  `settlement_status` VARCHAR(20) DEFAULT 'unsettled' COMMENT '结算状态: unsettled-未结算, settled-已结算',
  `settlement_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '实际结算金额',
  `settlement_date` DATE NULL COMMENT '结算日期',
  `settlement_batch` VARCHAR(50) NULL COMMENT '结算批次号',
  `invalid_reason` VARCHAR(500) NULL COMMENT '无效原因',
  `supplement_order_id` VARCHAR(50) NULL COMMENT '补单关联ID',
  `export_date` DATE NULL COMMENT '导出日期',
  `export_batch` VARCHAR(50) NULL COMMENT '导出批次号',
  `remark` VARCHAR(500) NULL COMMENT '备注信息',
  `operator_id` VARCHAR(50) NULL COMMENT '操作员ID',
  `operator_name` VARCHAR(50) NULL COMMENT '操作员姓名',
  `created_by` VARCHAR(50) NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) NULL COMMENT '创建人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_customer_phone` (`customer_phone`),
  KEY `idx_tracking_number` (`tracking_number`),
  KEY `idx_order_status` (`order_status`),
  KEY `idx_order_date` (`order_date`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_status` (`status`),
  KEY `idx_settlement_status` (`settlement_status`),
  KEY `idx_export_date` (`export_date`),
  KEY `idx_settlement_date` (`settlement_date`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值订单表';

-- 增值管理状态配置表
CREATE TABLE IF NOT EXISTS `value_added_status_configs` (
  `id` VARCHAR(50) NOT NULL COMMENT '配置ID',
  `type` VARCHAR(50) NOT NULL COMMENT '类型: validStatus-有效状态, settlementStatus-结算状态',
  `value` VARCHAR(50) NOT NULL COMMENT '状态值',
  `label` VARCHAR(100) NOT NULL COMMENT '状态标签',
  `sort_order` INT DEFAULT 999 COMMENT '排序顺序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_value` (`type`, `value`),
  KEY `idx_type` (`type`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理状态配置表';

-- 插入默认状态配置
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`, `sort_order`) VALUES
('vs-pending-001', 'validStatus', 'pending', '待处理', 1),
('vs-valid-001', 'validStatus', 'valid', '有效', 2),
('vs-invalid-001', 'validStatus', 'invalid', '无效', 3),
('vs-supplemented-001', 'validStatus', '补单', 4),
('ss-unsettled-001', 'settlementStatus', 'unsettled', '未结算', 1),
('ss-settled-001', 'settlementStatus', 'settled', '已结算', 2)
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `sort_order` = VALUES(`sort_order`);

-- 增值管理备注预设表
CREATE TABLE IF NOT EXISTS `value_added_remark_presets` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '主键ID',
  `remark_text` VARCHAR(500) NOT NULL COMMENT '备注内容',
  `category` ENUM('invalid', 'general') DEFAULT 'general' COMMENT '备注分类：invalid-无效原因，general-通用备注',
  `sort_order` INT DEFAULT 0 COMMENT '排序顺序',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用：1-启用，0-停用',
  `usage_count` INT DEFAULT 0 COMMENT '使用次数',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_category` (`category`),
  INDEX `idx_sort_order` (`sort_order`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理备注预设表';

-- 插入备注预设数据（优化后只保留8个简洁选项）
INSERT INTO `value_added_remark_presets` (`id`, `remark_text`, `category`, `sort_order`, `is_active`) VALUES
(UUID(), '七天未联系上', 'invalid', 1, 1),
(UUID(), '重大疾病', 'invalid', 2, 1),
(UUID(), '哺乳期孕期', 'invalid', 3, 1),
(UUID(), '退货', 'invalid', 4, 1),
(UUID(), '拒绝指导', 'invalid', 5, 1),
(UUID(), '以后再用', 'invalid', 6, 1),
(UUID(), '空号', 'invalid', 7, 1),
(UUID(), '其他原因', 'invalid', 8, 1)
ON DUPLICATE KEY UPDATE `remark_text` = VALUES(`remark_text`);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 通知模板系统（2026-03-06新增）
-- ============================================

-- 通知模板表
CREATE TABLE IF NOT EXISTS `notification_templates` (
  `id` VARCHAR(36) NOT NULL COMMENT '模板ID',
  `template_code` VARCHAR(100) NOT NULL COMMENT '模板代码(唯一标识)',
  `template_name` VARCHAR(200) NOT NULL COMMENT '模板名称',
  `template_type` VARCHAR(50) NOT NULL COMMENT '模板类型: email/sms/both',
  `category` VARCHAR(50) NOT NULL COMMENT '业务分类: tenant/payment/order/license',
  `scene` VARCHAR(100) NOT NULL COMMENT '使用场景',
  `email_subject` VARCHAR(200) DEFAULT NULL COMMENT '邮件主题',
  `email_content` TEXT DEFAULT NULL COMMENT '邮件内容(支持HTML和变量)',
  `sms_content` VARCHAR(500) DEFAULT NULL COMMENT '短信内容(支持变量)',
  `sms_template_code` VARCHAR(100) DEFAULT NULL COMMENT '短信服务商模板代码',
  `variables` JSON DEFAULT NULL COMMENT '可用变量列表',
  `variable_description` TEXT DEFAULT NULL COMMENT '变量说明文档',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `is_system` TINYINT(1) DEFAULT 0 COMMENT '是否系统模板(不可删除)',
  `priority` VARCHAR(20) DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  `send_email` TINYINT(1) DEFAULT 1 COMMENT '是否发送邮件',
  `send_sms` TINYINT(1) DEFAULT 0 COMMENT '是否发送短信',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code` (`template_code`),
  KEY `idx_template_code` (`template_code`),
  KEY `idx_category` (`category`),
  KEY `idx_scene` (`scene`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板表';

-- ============================================
-- 微信公众号系统（2026-03-06新增）
-- ============================================

-- 微信公众号关注用户表
CREATE TABLE IF NOT EXISTS `wechat_followers` (
  `id` VARCHAR(36) NOT NULL COMMENT '记录ID',
  `openid` VARCHAR(100) NOT NULL COMMENT '微信OpenID',
  `unionid` VARCHAR(100) DEFAULT NULL COMMENT '微信UnionID',
  `nickname` VARCHAR(200) DEFAULT NULL COMMENT '昵称',
  `avatar_url` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  `gender` TINYINT DEFAULT NULL COMMENT '性别: 0未知 1男 2女',
  `country` VARCHAR(50) DEFAULT NULL COMMENT '国家',
  `province` VARCHAR(50) DEFAULT NULL COMMENT '省份',
  `city` VARCHAR(50) DEFAULT NULL COMMENT '城市',
  `language` VARCHAR(20) DEFAULT NULL COMMENT '语言',
  `subscribe_status` TINYINT(1) DEFAULT 1 COMMENT '关注状态: 0取消关注 1已关注',
  `subscribe_time` DATETIME DEFAULT NULL COMMENT '关注时间',
  `unsubscribe_time` DATETIME DEFAULT NULL COMMENT '取消关注时间',
  `subscribe_scene` VARCHAR(50) DEFAULT NULL COMMENT '关注场景',
  `qr_scene` VARCHAR(100) DEFAULT NULL COMMENT '二维码场景值',
  `qr_scene_str` VARCHAR(200) DEFAULT NULL COMMENT '二维码场景描述',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '绑定的租户ID',
  `tenant_name` VARCHAR(200) DEFAULT NULL COMMENT '租户名称',
  `bind_time` DATETIME DEFAULT NULL COMMENT '绑定时间',
  `bind_status` VARCHAR(20) DEFAULT 'unbound' COMMENT '绑定状态: unbound/pending/bound',
  `enable_notification` TINYINT(1) DEFAULT 1 COMMENT '是否启用通知',
  `notification_types` JSON DEFAULT NULL COMMENT '接收的通知类型',
  `tags` JSON DEFAULT NULL COMMENT '用户标签',
  `remark` VARCHAR(200) DEFAULT NULL COMMENT '备注',
  `message_count` INT DEFAULT 0 COMMENT '发送消息数',
  `last_message_time` DATETIME DEFAULT NULL COMMENT '最后发送消息时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_openid` (`openid`),
  KEY `idx_openid` (`openid`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_subscribe_status` (`subscribe_status`),
  KEY `idx_bind_status` (`bind_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信公众号关注用户表';

-- 微信消息发送记录表
CREATE TABLE IF NOT EXISTS `wechat_message_logs` (
  `id` VARCHAR(36) NOT NULL COMMENT '记录ID',
  `openid` VARCHAR(100) NOT NULL COMMENT '接收者OpenID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `message_type` VARCHAR(50) NOT NULL COMMENT '消息类型: template/text/image',
  `template_id` VARCHAR(100) DEFAULT NULL COMMENT '模板ID',
  `template_code` VARCHAR(100) DEFAULT NULL COMMENT '业务模板代码',
  `title` VARCHAR(200) DEFAULT NULL COMMENT '消息标题',
  `content` TEXT DEFAULT NULL COMMENT '消息内容',
  `url` VARCHAR(500) DEFAULT NULL COMMENT '跳转链接',
  `data` JSON DEFAULT NULL COMMENT '模板数据',
  `send_status` VARCHAR(20) DEFAULT 'pending' COMMENT '发送状态: pending/success/failed',
  `send_time` DATETIME DEFAULT NULL COMMENT '发送时间',
  `msgid` VARCHAR(100) DEFAULT NULL COMMENT '微信消息ID',
  `error_code` VARCHAR(50) DEFAULT NULL COMMENT '错误代码',
  `error_message` TEXT DEFAULT NULL COMMENT '错误信息',
  `is_read` TINYINT(1) DEFAULT 0 COMMENT '是否已读',
  `read_time` DATETIME DEFAULT NULL COMMENT '阅读时间',
  `is_clicked` TINYINT(1) DEFAULT 0 COMMENT '是否点击',
  `click_time` DATETIME DEFAULT NULL COMMENT '点击时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_openid` (`openid`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_template_code` (`template_code`),
  KEY `idx_send_status` (`send_status`),
  KEY `idx_send_time` (`send_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信消息发送记录表';

-- 微信公众号配置表
CREATE TABLE IF NOT EXISTS `wechat_official_account_config` (
  `id` VARCHAR(36) NOT NULL COMMENT '配置ID',
  `app_id` VARCHAR(100) NOT NULL COMMENT 'AppID',
  `app_secret` VARCHAR(200) NOT NULL COMMENT 'AppSecret',
  `token` VARCHAR(100) DEFAULT NULL COMMENT 'Token',
  `encoding_aes_key` VARCHAR(200) DEFAULT NULL COMMENT 'EncodingAESKey',
  `server_url` VARCHAR(500) DEFAULT NULL COMMENT '服务器URL',
  `message_encrypt_mode` VARCHAR(20) DEFAULT 'plaintext' COMMENT '消息加密方式: plaintext/compatible/safe',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `auto_reply_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用自动回复',
  `menu_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用自定义菜单',
  `welcome_message` TEXT DEFAULT NULL COMMENT '关注后欢迎语',
  `default_reply` TEXT DEFAULT NULL COMMENT '默认回复内容',
  `keyword_replies` JSON DEFAULT NULL COMMENT '关键词回复配置',
  `menu_config` JSON DEFAULT NULL COMMENT '自定义菜单配置',
  `template_configs` JSON DEFAULT NULL COMMENT '模板消息配置',
  `total_followers` INT DEFAULT 0 COMMENT '总关注人数',
  `active_followers` INT DEFAULT 0 COMMENT '当前关注人数',
  `total_messages` INT DEFAULT 0 COMMENT '总发送消息数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信公众号配置表';

-- 微信二维码场景表
CREATE TABLE IF NOT EXISTS `wechat_qrcode_scenes` (
  `id` VARCHAR(36) NOT NULL COMMENT '场景ID',
  `scene_id` INT DEFAULT NULL COMMENT '场景值ID',
  `scene_str` VARCHAR(200) DEFAULT NULL COMMENT '场景字符串',
  `scene_type` VARCHAR(50) NOT NULL COMMENT '场景类型: tenant_bind/payment/register',
  `scene_name` VARCHAR(200) DEFAULT NULL COMMENT '场景名称',
  `scene_desc` TEXT DEFAULT NULL COMMENT '场景描述',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '关联租户ID',
  `related_id` VARCHAR(100) DEFAULT NULL COMMENT '关联业务ID',
  `related_type` VARCHAR(50) DEFAULT NULL COMMENT '关联业务类型',
  `qrcode_url` VARCHAR(500) DEFAULT NULL COMMENT '二维码图片URL',
  `ticket` VARCHAR(200) DEFAULT NULL COMMENT '二维码ticket',
  `expire_seconds` INT DEFAULT NULL COMMENT '过期时间(秒)',
  `expire_time` DATETIME DEFAULT NULL COMMENT '过期时间',
  `scan_count` INT DEFAULT 0 COMMENT '扫码次数',
  `subscribe_count` INT DEFAULT 0 COMMENT '关注次数',
  `last_scan_time` DATETIME DEFAULT NULL COMMENT '最后扫码时间',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/expired/disabled',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scene_id` (`scene_id`),
  UNIQUE KEY `uk_scene_str` (`scene_str`),
  KEY `idx_scene_id` (`scene_id`),
  KEY `idx_scene_str` (`scene_str`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信二维码场景表';

-- 插入微信公众号默认配置
INSERT INTO `wechat_official_account_config` (`id`, `app_id`, `app_secret`, `welcome_message`, `default_reply`, `is_enabled`) VALUES
('wechat-config-001', '', '', 
'欢迎关注云客CRM！\n\n回复"绑定"可以绑定您的租户账号，接收系统通知。\n回复"帮助"查看更多功能。',
'感谢您的消息！\n\n回复"绑定"绑定账号\n回复"帮助"查看帮助\n回复"客服"联系客服',
0)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ============================================
-- Admin后台管理表（2026-03-06新增）
-- ============================================

-- 管理员用户表
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` VARCHAR(36) NOT NULL COMMENT '管理员ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `name` VARCHAR(50) DEFAULT NULL COMMENT '姓名',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像',
  `role` ENUM('super_admin','admin','operator') DEFAULT 'operator' COMMENT '角色',
  `status` ENUM('active','inactive','locked','disabled') DEFAULT 'active' COMMENT '状态',
  `last_login_at` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(50) DEFAULT NULL COMMENT '最后登录IP',
  `login_count` INT DEFAULT 0 COMMENT '登录次数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员用户表';

-- 管理员操作日志表
CREATE TABLE IF NOT EXISTS `admin_operation_logs` (
  `id` VARCHAR(36) NOT NULL COMMENT '日志ID',
  `admin_id` VARCHAR(36) NOT NULL COMMENT '管理员ID',
  `admin_name` VARCHAR(100) DEFAULT NULL COMMENT '管理员名称',
  `module` VARCHAR(50) DEFAULT NULL COMMENT '操作模块',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `target_type` VARCHAR(50) DEFAULT NULL COMMENT '目标类型',
  `target_id` VARCHAR(36) DEFAULT NULL COMMENT '目标ID',
  `detail` TEXT DEFAULT NULL COMMENT '操作详情',
  `ip` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT 'User Agent',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员操作日志表';

-- ============================================
-- 模块管理表（2026-03-06新增）
-- ============================================

-- 模块表
CREATE TABLE IF NOT EXISTS `modules` (
  `id` VARCHAR(36) NOT NULL COMMENT '模块ID',
  `name` VARCHAR(100) NOT NULL COMMENT '模块名称',
  `code` VARCHAR(50) NOT NULL COMMENT '模块代码',
  `description` TEXT DEFAULT NULL COMMENT '模块描述',
  `icon` VARCHAR(100) DEFAULT NULL COMMENT '模块图标',
  `version` VARCHAR(20) DEFAULT NULL COMMENT '模块版本',
  `status` ENUM('enabled','disabled') DEFAULT 'enabled' COMMENT '状态',
  `is_system` TINYINT(1) DEFAULT 0 COMMENT '是否系统模块',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_status` (`status`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块表';

-- 模块配置表
CREATE TABLE IF NOT EXISTS `module_configs` (
  `id` VARCHAR(36) NOT NULL COMMENT '配置ID',
  `module_id` VARCHAR(36) NOT NULL COMMENT '模块ID',
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `config_value` TEXT DEFAULT NULL COMMENT '配置值',
  `config_type` ENUM('string','number','boolean','json') DEFAULT 'string' COMMENT '配置类型',
  `description` VARCHAR(255) DEFAULT NULL COMMENT '配置说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_key` (`module_id`, `config_key`),
  KEY `idx_module_id` (`module_id`),
  CONSTRAINT `fk_module_configs_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块配置表';

-- 插入系统默认模块
INSERT INTO `modules` (`id`, `name`, `code`, `description`, `icon`, `version`, `status`, `is_system`, `sort_order`) VALUES
(UUID(), '订单管理', 'order_management', '订单创建、审核、发货等功能', 'el-icon-document', '1.0.0', 'enabled', 1, 1),
(UUID(), '客户管理', 'customer_management', '客户信息管理、跟进记录', 'el-icon-user', '1.0.0', 'enabled', 1, 2),
(UUID(), '财务管理', 'finance_management', '代收管理、结算报表、增值服务', 'el-icon-money', '1.0.0', 'enabled', 1, 3),
(UUID(), '物流管理', 'logistics_management', '物流跟踪、状态更新', 'el-icon-truck', '1.0.0', 'enabled', 1, 4),
(UUID(), '售后管理', 'aftersales_management', '售后申请、处理流程', 'el-icon-service', '1.0.0', 'enabled', 1, 5),
(UUID(), '通话管理', 'call_management', '通话记录、录音管理', 'el-icon-phone', '1.0.0', 'enabled', 1, 6),
(UUID(), '系统管理', 'system_management', '用户、角色、权限管理', 'el-icon-setting', '1.0.0', 'enabled', 1, 7)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ============================================
-- API配置表（2026-03-06新增）
-- ============================================

-- API配置表
CREATE TABLE IF NOT EXISTS `api_configs` (
  `id` VARCHAR(36) NOT NULL COMMENT 'API配置ID',
  `name` VARCHAR(100) NOT NULL COMMENT 'API名称',
  `code` VARCHAR(50) NOT NULL COMMENT 'API代码',
  `description` TEXT DEFAULT NULL COMMENT 'API描述',
  `api_key` VARCHAR(100) NOT NULL COMMENT 'API密钥',
  `api_secret` VARCHAR(255) NOT NULL COMMENT 'API密钥（加密）',
  `status` ENUM('active','inactive') DEFAULT 'active' COMMENT '状态',
  `rate_limit` INT DEFAULT 1000 COMMENT '速率限制（次/小时）',
  `allowed_ips` TEXT DEFAULT NULL COMMENT '允许的IP（JSON数组）',
  `expires_at` DATETIME DEFAULT NULL COMMENT '过期时间',
  `last_used_at` DATETIME DEFAULT NULL COMMENT '最后使用时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  UNIQUE KEY `uk_api_key` (`api_key`),
  KEY `idx_api_key` (`api_key`),
  KEY `idx_status` (`status`),
  KEY `idx_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API配置表';

-- API调用日志表
CREATE TABLE IF NOT EXISTS `api_call_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `interface_code` VARCHAR(50) NOT NULL COMMENT '接口代码',
  `method` VARCHAR(10) DEFAULT NULL COMMENT '请求方法',
  `endpoint` VARCHAR(255) DEFAULT NULL COMMENT '调用端点',
  `request_params` TEXT DEFAULT NULL COMMENT '请求参数',
  `response_code` INT DEFAULT NULL COMMENT '响应状态码',
  `response_time` INT DEFAULT NULL COMMENT '响应时间（ms）',
  `success` TINYINT(1) DEFAULT 1 COMMENT '是否成功',
  `error_message` VARCHAR(500) DEFAULT NULL COMMENT '错误信息',
  `client_ip` VARCHAR(50) DEFAULT NULL COMMENT '客户端IP',
  `user_agent` VARCHAR(255) DEFAULT NULL COMMENT 'User Agent',
  `user_id` VARCHAR(50) DEFAULT NULL COMMENT '用户ID',
  `device_id` VARCHAR(100) DEFAULT NULL COMMENT '设备ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_interface_code` (`interface_code`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_success` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API调用日志表';

-- ============================================
-- 通知发送记录表（2026-03-08新增）
-- ============================================

-- 通知发送记录表
CREATE TABLE IF NOT EXISTS `notification_logs` (
  `id` VARCHAR(36) NOT NULL COMMENT '记录ID',
  `channel_id` VARCHAR(36) NOT NULL COMMENT '通知渠道ID',
  `channel_type` VARCHAR(50) NOT NULL COMMENT '通知渠道类型',
  `message_type` VARCHAR(50) NOT NULL COMMENT '消息类型',
  `title` VARCHAR(200) NOT NULL COMMENT '消息标题',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `target_users` JSON DEFAULT NULL COMMENT '目标用户列表',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '发送状态',
  `response` TEXT DEFAULT NULL COMMENT '第三方API响应',
  `error_message` TEXT DEFAULT NULL COMMENT '错误信息',
  `template_code` VARCHAR(100) DEFAULT NULL COMMENT '使用的模板代码',
  `variables` JSON DEFAULT NULL COMMENT '渲染变量',
  `sent_at` DATETIME DEFAULT NULL COMMENT '发送时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_channel_id` (`channel_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_template_code` (`template_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知发送记录表';

-- ============================================
-- 通知模板默认数据
-- ============================================

INSERT INTO `notification_templates` (`id`, `template_code`, `template_name`, `template_type`, `category`, `scene`, `email_subject`, `email_content`, `sms_content`, `variables`, `variable_description`, `is_system`, `priority`, `send_email`, `send_sms`) VALUES
('tpl-001', 'tenant_register_success', '租户注册成功', 'both', 'tenant', '租户注册成功后发送欢迎邮件和短信',
'欢迎注册{{systemName}}',
'<h2>欢迎注册{{systemName}}</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p><p>恭喜您成功注册，以下是您的账号信息：</p><ul><li>租户名称：{{tenantName}}</li><li>管理员账号：{{adminUsername}}</li><li>初始密码：{{adminPassword}}</li><li>套餐类型：{{packageName}}</li><li>到期时间：{{expireDate}}</li></ul>',
'欢迎注册{{systemName}}！管理员账号：{{adminUsername}}，初始密码：{{adminPassword}}，请登录后及时修改密码。',
'{"systemName":"系统名称","tenantName":"租户名称","adminUsername":"管理员账号","adminPassword":"初始密码","packageName":"套餐名称","expireDate":"到期时间"}',
'租户注册成功后发送', 1, 'high', 1, 1),

('tpl-002', 'payment_success', '支付成功通知', 'both', 'payment', '支付成功后通知',
'支付成功 - {{orderNumber}}',
'<h2>支付成功</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的订单已支付成功：</p><ul><li>订单号：{{orderNumber}}</li><li>套餐：{{packageName}}</li><li>支付金额：¥{{amount}}</li><li>服务期限：{{serviceStartDate}} 至 {{serviceEndDate}}</li></ul>',
'支付成功！订单{{orderNumber}}，金额¥{{amount}}，服务期限至{{serviceEndDate}}。',
'{"tenantName":"租户名称","orderNumber":"订单号","packageName":"套餐名称","amount":"支付金额","serviceStartDate":"服务开始日期","serviceEndDate":"服务结束日期"}',
'支付成功后立即发送', 1, 'high', 1, 1),

('tpl-003', 'payment_pending', '待支付提醒', 'both', 'payment', '订单创建后待支付提醒',
'订单待支付 - {{orderNumber}}',
'<h2>订单待支付</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的订单已创建，请尽快完成支付：</p><ul><li>订单号：{{orderNumber}}</li><li>套餐：{{packageName}}</li><li>应付金额：¥{{amount}}</li></ul><p>订单将在24小时后自动取消。</p>',
'您的订单{{orderNumber}}待支付，金额¥{{amount}}，请尽快完成支付。',
'{"tenantName":"租户名称","orderNumber":"订单号","packageName":"套餐名称","amount":"应付金额"}',
'订单创建后发送', 1, 'normal', 1, 1),

('tpl-004', 'payment_refund', '退款成功通知', 'both', 'payment', '退款成功通知',
'退款成功 - {{orderNumber}}',
'<h2>退款成功</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的退款申请已处理完成：</p><ul><li>订单号：{{orderNumber}}</li><li>退款金额：¥{{refundAmount}}</li><li>退款原因：{{refundReason}}</li></ul><p>退款将在3-5个工作日内到账。</p>',
'退款成功！订单{{orderNumber}}，退款金额¥{{refundAmount}}，预计3-5个工作日到账。',
'{"tenantName":"租户名称","orderNumber":"订单号","refundAmount":"退款金额","refundReason":"退款原因"}',
'退款成功后发送', 1, 'high', 1, 1),

('tpl-005', 'license_generated', '授权码生成通知', 'email', 'license', '授权码生成后发送',
'授权码已生成 - {{tenantName}}',
'<h2>授权码已生成</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的授权码已生成：</p><div style="background:#f5f5f5;padding:15px;border-radius:4px;"><p style="font-size:18px;font-weight:bold;color:#409eff;">{{licenseKey}}</p></div><ul><li>授权类型：{{licenseType}}</li><li>有效期至：{{expireDate}}</li><li>最大用户数：{{maxUsers}}</li></ul>',
NULL,
'{"tenantName":"租户名称","licenseKey":"授权码","licenseType":"授权类型","expireDate":"到期时间","maxUsers":"最大用户数"}',
'授权码生成后发送', 1, 'high', 1, 0),

('tpl-006', 'license_expire_soon', '授权即将到期提醒', 'both', 'license', '授权到期前7天提醒',
'授权即将到期提醒',
'<h2>授权即将到期</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的授权即将到期：</p><ul><li>到期时间：{{expireDate}}</li><li>剩余天数：{{remainDays}}天</li></ul><p>请及时续费以免影响使用。</p>',
'您的授权将在{{remainDays}}天后到期，请及时续费以免影响使用。',
'{"tenantName":"租户名称","licenseKey":"授权码","expireDate":"到期时间","remainDays":"剩余天数"}',
'到期前7天、3天、1天各发送一次', 1, 'high', 1, 1),

('tpl-007', 'license_expired', '授权已到期通知', 'both', 'license', '授权到期后通知',
'授权已到期',
'<h2>授权已到期</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的授权已到期，系统已停止服务，请尽快续费恢复使用。</p>',
'您的授权已到期，系统已停止服务，请尽快续费。',
'{"tenantName":"租户名称","licenseKey":"授权码","expireDate":"到期时间"}',
'授权到期后发送', 1, 'urgent', 1, 1),

('tpl-008', 'tenant_activated', '账号激活成功', 'both', 'tenant', '账号激活成功通知',
'账号激活成功',
'<h2>账号激活成功</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的账号已成功激活。</p><ul><li>激活时间：{{activateTime}}</li><li>服务期限：{{serviceEndDate}}</li></ul>',
'您的账号已激活，服务期限至{{serviceEndDate}}。',
'{"tenantName":"租户名称","activateTime":"激活时间","serviceEndDate":"服务结束日期"}',
'账号激活后发送', 1, 'high', 1, 1),

('tpl-009', 'tenant_suspended', '账号已暂停', 'both', 'tenant', '账号暂停通知',
'账号已暂停',
'<h2>账号已暂停</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的账号已被暂停使用，原因：{{reason}}。如有疑问请联系客服。</p>',
'您的账号已暂停，原因：{{reason}}。如有疑问请联系客服。',
'{"tenantName":"租户名称","reason":"暂停原因","suspendTime":"暂停时间"}',
'账号暂停时发送', 1, 'urgent', 1, 1),

('tpl-010', 'tenant_resumed', '账号已恢复', 'both', 'tenant', '账号恢复通知',
'账号已恢复',
'<h2>账号已恢复</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的账号已恢复正常使用。</p>',
'您的账号已恢复，可以正常使用了。',
'{"tenantName":"租户名称","resumeTime":"恢复时间"}',
'账号恢复时发送', 1, 'high', 1, 1),

('tpl-011', 'renew_success', '续费成功通知', 'both', 'payment', '续费成功通知',
'续费成功',
'<h2>续费成功</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的续费已成功：金额¥{{amount}}，服务期限延长至{{newExpireDate}}。</p>',
'续费成功！金额¥{{amount}}，服务期限延长至{{newExpireDate}}。',
'{"tenantName":"租户名称","amount":"续费金额","duration":"续费时长","newExpireDate":"新到期时间"}',
'续费成功后发送', 1, 'high', 1, 1),

('tpl-012', 'package_upgraded', '套餐升级成功', 'both', 'tenant', '套餐升级成功通知',
'套餐升级成功',
'<h2>套餐升级成功</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的套餐已从{{oldPackage}}升级至{{newPackage}}，新功能已生效。</p>',
'套餐升级成功！已从{{oldPackage}}升级至{{newPackage}}。',
'{"tenantName":"租户名称","oldPackage":"原套餐","newPackage":"新套餐","upgradeTime":"升级时间"}',
'套餐升级后发送', 1, 'high', 1, 1),

('tpl-013', 'capacity_expanded', '容量扩容成功', 'email', 'tenant', '容量扩容成功通知',
'容量扩容成功',
'<h2>容量扩容成功</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您的{{item}}已从{{oldCapacity}}扩容至{{newCapacity}}。</p>',
NULL,
'{"tenantName":"租户名称","item":"扩容项目","oldCapacity":"原容量","newCapacity":"新容量","expandTime":"扩容时间"}',
'容量扩容后发送', 1, 'normal', 1, 0)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;
