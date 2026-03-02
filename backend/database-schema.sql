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
  `config_value` text,
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
('pagination.max_size', '100', '最大分页大小', 'number', 0);

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
