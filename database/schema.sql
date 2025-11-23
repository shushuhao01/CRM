-- =============================================
-- CRM系统数据库初始化脚本（最新版）
-- 版本：1.8.0
-- 更新时间：2024-11-23
-- 适用于：MySQL 8.0+ / 宝塔面板 7.x+
-- =============================================

-- 设置字符集和时区
SET NAMES utf8mb4;
SET time_zone = '+08:00';
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================
-- 核心数据表创建
-- =============================================

-- 1. 部门表
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '部门ID',
  `name` VARCHAR(100) NOT NULL COMMENT '部门名称',
  `description` TEXT COMMENT '部门描述',
  `parent_id` VARCHAR(50) NULL COMMENT '上级部门ID',
  `manager_id` VARCHAR(50) NULL COMMENT '部门经理ID',
  `level` INT DEFAULT 1 COMMENT '部门层级',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `member_count` INT DEFAULT 0 COMMENT '成员数量',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_parent` (`parent_id`),
  INDEX `idx_manager` (`manager_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';

-- 2. 角色表
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '角色ID',
  `name` VARCHAR(50) NOT NULL COMMENT '角色名称',
  `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '角色代码',
  `description` TEXT COMMENT '角色描述',
  `permissions` JSON COMMENT '权限列表',
  `user_count` INT DEFAULT 0 COMMENT '用户数量',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 3. 用户表
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '用户ID',
  `username` VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `email` VARCHAR(100) COMMENT '邮箱',
  `phone` VARCHAR(20) COMMENT '手机号',
  `avatar` VARCHAR(500) COMMENT '头像URL',
  `role` VARCHAR(50) NOT NULL COMMENT '角色',
  `role_id` VARCHAR(50) NOT NULL COMMENT '角色ID',
  `department_id` VARCHAR(50) COMMENT '部门ID',
  `department_name` VARCHAR(100) COMMENT '部门名称',
  `position` VARCHAR(50) COMMENT '职位',
  `employee_number` VARCHAR(50) COMMENT '工号',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `last_login_at` TIMESTAMP NULL COMMENT '最后登录时间',
  `login_count` INT DEFAULT 0 COMMENT '登录次数',
  `settings` JSON COMMENT '用户设置',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_role` (`role`),
  INDEX `idx_role_id` (`role_id`),
  INDEX `idx_department` (`department_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 4. 客户表
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '客户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '客户姓名',
  `phone` VARCHAR(20) COMMENT '手机号',
  `wechat` VARCHAR(100) COMMENT '微信号',
  `email` VARCHAR(100) COMMENT '邮箱',
  `address` TEXT COMMENT '地址',
  `company` VARCHAR(200) COMMENT '公司名称',
  `industry` VARCHAR(100) COMMENT '行业',
  `source` VARCHAR(50) COMMENT '客户来源',
  `level` VARCHAR(20) DEFAULT 'normal' COMMENT '客户等级',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `tags` JSON COMMENT '标签',
  `remark` TEXT COMMENT '备注',
  `order_count` INT DEFAULT 0 COMMENT '订单数量',
  `total_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '总消费金额',
  `last_order_time` TIMESTAMP NULL COMMENT '最后下单时间',
  `sales_person_id` VARCHAR(50) COMMENT '销售员ID',
  `sales_person_name` VARCHAR(50) COMMENT '销售员姓名',
  `created_by` VARCHAR(50) NOT NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_phone` (`phone`),
  INDEX `idx_email` (`email`),
  INDEX `idx_sales_person` (`sales_person_id`),
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_level` (`level`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户表';

-- 5. 客户标签表
DROP TABLE IF EXISTS `customer_tags`;
CREATE TABLE `customer_tags` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '标签ID',
  `name` VARCHAR(50) NOT NULL COMMENT '标签名称',
  `color` VARCHAR(20) COMMENT '标签颜色',
  `description` TEXT COMMENT '标签描述',
  `customer_count` INT DEFAULT 0 COMMENT '客户数量',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户标签表';

-- 6. 客户分组表
DROP TABLE IF EXISTS `customer_groups`;
CREATE TABLE `customer_groups` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '分组ID',
  `name` VARCHAR(50) NOT NULL COMMENT '分组名称',
  `description` TEXT COMMENT '分组描述',
  `customer_count` INT DEFAULT 0 COMMENT '客户数量',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户分组表';

-- 7. 产品分类表
DROP TABLE IF EXISTS `product_categories`;
CREATE TABLE `product_categories` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '分类ID',
  `name` VARCHAR(100) NOT NULL COMMENT '分类名称',
  `parent_id` VARCHAR(50) NULL COMMENT '上级分类ID',
  `description` TEXT COMMENT '分类描述',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_parent` (`parent_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品分类表';

-- 8. 产品表
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '产品ID',
  `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '产品编码',
  `name` VARCHAR(200) NOT NULL COMMENT '产品名称',
  `category_id` VARCHAR(50) COMMENT '分类ID',
  `category_name` VARCHAR(100) COMMENT '分类名称',
  `description` TEXT COMMENT '产品描述',
  `price` DECIMAL(10,2) NOT NULL COMMENT '销售价格',
  `cost_price` DECIMAL(10,2) COMMENT '成本价格',
  `stock` INT DEFAULT 0 COMMENT '库存数量',
  `min_stock` INT DEFAULT 0 COMMENT '最小库存',
  `unit` VARCHAR(20) DEFAULT '件' COMMENT '单位',
  `specifications` JSON COMMENT '规格参数',
  `images` JSON COMMENT '产品图片',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `created_by` VARCHAR(50) NOT NULL COMMENT '创建人',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_category` (`category_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品表';

-- 9. 订单表
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '订单ID',
  `order_number` VARCHAR(50) UNIQUE NOT NULL COMMENT '订单号',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) COMMENT '客户电话',
  `products` JSON COMMENT '商品列表',
  `total_amount` DECIMAL(10,2) NOT NULL COMMENT '订单总金额',
  `discount_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
  `final_amount` DECIMAL(10,2) NOT NULL COMMENT '实付金额',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态',
  `payment_status` VARCHAR(20) DEFAULT 'unpaid' COMMENT '支付状态',
  `payment_method` VARCHAR(50) COMMENT '支付方式',
  `shipping_address` TEXT COMMENT '收货地址',
  `shipping_phone` VARCHAR(20) COMMENT '收货电话',
  `shipping_name` VARCHAR(50) COMMENT '收货人',
  `remark` TEXT COMMENT '订单备注',
  `operator_id` VARCHAR(50) COMMENT '操作员ID',
  `operator_name` VARCHAR(50) COMMENT '操作员姓名',
  `created_by` VARCHAR(50) NOT NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_order_number` (`order_number`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_payment_status` (`payment_status`),
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 10. 物流表
DROP TABLE IF EXISTS `logistics`;
CREATE TABLE `logistics` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '物流ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) COMMENT '订单号',
  `tracking_number` VARCHAR(100) COMMENT '物流单号',
  `company` VARCHAR(100) COMMENT '物流公司',
  `company_code` VARCHAR(50) COMMENT '物流公司代码',
  `status` VARCHAR(50) COMMENT '物流状态',
  `current_location` VARCHAR(200) COMMENT '当前位置',
  `tracking_info` JSON COMMENT '跟踪信息',
  `shipped_at` TIMESTAMP NULL COMMENT '发货时间',
  `delivered_at` TIMESTAMP NULL COMMENT '签收时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_order` (`order_id`),
  INDEX `idx_tracking_number` (`tracking_number`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流表';

-- 11. 售后服务表
DROP TABLE IF EXISTS `service_records`;
CREATE TABLE `service_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '售后ID',
  `service_number` VARCHAR(50) UNIQUE NOT NULL COMMENT '售后单号',
  `order_id` VARCHAR(50) COMMENT '订单ID',
  `order_number` VARCHAR(50) COMMENT '订单号',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) COMMENT '客户电话',
  `service_type` VARCHAR(50) COMMENT '服务类型',
  `problem_description` TEXT COMMENT '问题描述',
  `solution` TEXT COMMENT '解决方案',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
  `priority` VARCHAR(20) DEFAULT 'normal' COMMENT '优先级',
  `assigned_to` VARCHAR(50) COMMENT '处理人ID',
  `assigned_to_name` VARCHAR(50) COMMENT '处理人姓名',
  `created_by` VARCHAR(50) NOT NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `closed_at` TIMESTAMP NULL COMMENT '关闭时间',
  INDEX `idx_service_number` (`service_number`),
  INDEX `idx_order` (`order_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_assigned_to` (`assigned_to`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后服务表';

-- 12. 资料表
DROP TABLE IF EXISTS `data_records`;
CREATE TABLE `data_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '资料ID',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `order_id` VARCHAR(50) COMMENT '订单ID',
  `order_number` VARCHAR(50) COMMENT '订单号',
  `type` VARCHAR(50) COMMENT '资料类型',
  `content` TEXT COMMENT '资料内容',
  `attachments` JSON COMMENT '附件',
  `created_by` VARCHAR(50) NOT NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_order` (`order_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资料表';

-- 13. 业绩表
DROP TABLE IF EXISTS `performance_records`;
CREATE TABLE `performance_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '业绩ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `user_name` VARCHAR(50) COMMENT '用户姓名',
  `department_id` VARCHAR(50) COMMENT '部门ID',
  `department_name` VARCHAR(100) COMMENT '部门名称',
  `order_id` VARCHAR(50) COMMENT '订单ID',
  `order_number` VARCHAR(50) COMMENT '订单号',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '业绩金额',
  `type` VARCHAR(20) DEFAULT 'order' COMMENT '业绩类型',
  `date` DATE NOT NULL COMMENT '业绩日期',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_user` (`user_id`),
  INDEX `idx_department` (`department_id`),
  INDEX `idx_order` (`order_id`),
  INDEX `idx_date` (`date`),
  INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩表';

-- 14. 操作日志表
DROP TABLE IF EXISTS `operation_logs`;
CREATE TABLE `operation_logs` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '日志ID',
  `user_id` VARCHAR(50) COMMENT '操作用户ID',
  `user_name` VARCHAR(50) COMMENT '操作用户姓名',
  `action` VARCHAR(100) NOT NULL COMMENT '操作类型',
  `module` VARCHAR(50) COMMENT '模块',
  `resource_type` VARCHAR(50) COMMENT '资源类型',
  `resource_id` VARCHAR(50) COMMENT '资源ID',
  `description` TEXT COMMENT '操作描述',
  `ip_address` VARCHAR(45) COMMENT 'IP地址',
  `user_agent` TEXT COMMENT '用户代理',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_user` (`user_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_module` (`module`),
  INDEX `idx_resource` (`resource_type`, `resource_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- 15. 系统配置表
DROP TABLE IF EXISTS `system_configs`;
CREATE TABLE `system_configs` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '配置ID',
  `key` VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
  `value` TEXT COMMENT '配置值',
  `type` VARCHAR(20) DEFAULT 'string' COMMENT '配置类型',
  `description` TEXT COMMENT '配置描述',
  `is_public` BOOLEAN DEFAULT FALSE COMMENT '是否公开',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_key` (`key`),
  INDEX `idx_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- =============================================
-- 初始化数据
-- =============================================

-- 插入默认部门
INSERT INTO `departments` (`id`, `name`, `description`, `parent_id`, `level`, `sort_order`, `member_count`) VALUES 
('dept_001', '系统管理部', '系统管理和维护', NULL, 1, 1, 2),
('dept_002', '销售部', '负责产品销售和客户维护', NULL, 1, 2, 2),
('dept_003', '客服部', '负责客户服务和售后支持', NULL, 1, 3, 1);

-- 插入默认角色
INSERT INTO `roles` (`id`, `name`, `code`, `description`, `permissions`, `user_count`) VALUES 
('super_admin', '超级管理员', 'super_admin', '拥有系统所有权限', JSON_ARRAY('*'), 1),
('admin', '管理员', 'admin', '拥有系统所有权限', JSON_ARRAY('*'), 1),
('department_manager', '部门经理', 'department_manager', '管理本部门业务和团队', JSON_ARRAY('dashboard', 'customer', 'order', 'performance', 'logistics', 'aftersale', 'data'), 1),
('sales_staff', '销售员', 'sales_staff', '专注于客户开发和订单管理', JSON_ARRAY('dashboard', 'customer', 'order', 'performance', 'logistics', 'aftersale', 'data'), 1),
('customer_service', '客服', 'customer_service', '处理订单、物流和售后服务', JSON_ARRAY('dashboard', 'order', 'logistics', 'aftersale', 'data'), 1);

-- 插入预设用户（密码已加密，实际密码见文档）
INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `phone`, `role`, `role_id`, `department_id`, `department_name`, `position`, `status`) VALUES 
('superadmin', 'superadmin', 'super123456', '超级管理员', 'superadmin@example.com', '13800138000', 'super_admin', 'super_admin', 'dept_001', '系统管理部', '超级管理员', 'active'),
('admin', 'admin', 'admin123', '系统管理员', 'admin@example.com', '13800000000', 'admin', 'admin', 'dept_001', '管理部', '系统管理员', 'active'),
('manager_001', 'manager', 'manager123', '张经理', 'manager@example.com', '13800000001', 'department_manager', 'department_manager', 'dept_002', '销售部', '部门经理', 'active'),
('sales_001', 'sales', 'sales123', '李销售', 'sales@example.com', '13800000002', 'sales_staff', 'sales_staff', 'dept_002', '销售部', '销售员', 'active'),
('service_001', 'service', 'service123', '王客服', 'service@example.com', '13800000003', 'customer_service', 'customer_service', 'dept_003', '客服部', '客服专员', 'active');

-- 更新部门成员数量
UPDATE `departments` SET `member_count` = 2 WHERE `id` = 'dept_001';
UPDATE `departments` SET `member_count` = 2 WHERE `id` = 'dept_002';
UPDATE `departments` SET `member_count` = 1 WHERE `id` = 'dept_003';

-- 插入默认产品分类
INSERT INTO `product_categories` (`id`, `name`, `description`, `sort_order`) VALUES 
('cat_001', '默认分类', '系统默认产品分类', 1),
('cat_002', '电子产品', '各类电子设备和配件', 2),
('cat_003', '办公用品', '办公室日常用品', 3),
('cat_004', '服装鞋帽', '各类服装和鞋帽产品', 4);

-- 插入系统配置
INSERT INTO `system_configs` (`id`, `key`, `value`, `type`, `description`, `is_public`) VALUES 
('config_001', 'system_name', 'CRM客户管理系统', 'string', '系统名称', TRUE),
('config_002', 'company_name', '您的公司名称', 'string', '公司名称', TRUE),
('config_003', 'max_upload_size', '10485760', 'number', '最大上传文件大小(字节)', FALSE),
('config_004', 'session_timeout', '7200', 'number', '会话超时时间(秒)', FALSE),
('config_005', 'password_min_length', '6', 'number', '密码最小长度', FALSE),
('config_006', 'enable_email_notification', 'true', 'boolean', '启用邮件通知', FALSE),
('config_007', 'enable_sms_notification', 'false', 'boolean', '启用短信通知', FALSE);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- 完成提示
-- =============================================
SELECT '数据库初始化完成！' AS message;
SELECT '预设账号：' AS info;
SELECT 'superadmin / super123456 (超级管理员)' AS account_1;
SELECT 'admin / admin123 (管理员)' AS account_2;
SELECT 'manager / manager123 (部门经理)' AS account_3;
SELECT 'sales / sales123 (销售员)' AS account_4;
SELECT 'service / service123 (客服)' AS account_5;
