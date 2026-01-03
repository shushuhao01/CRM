-- =============================================
-- CRM系统数据库初始化脚本（最新版）
-- 版本：1.8.1
-- 更新时间：2024-12-04
-- 适用于：MySQL 8.0+ / 宝塔面板 7.x+
-- 
-- 更新内容：
-- 1. 添加完整的售后服务表(after_sales_services)
-- 2. 用户表添加在职状态、备注等字段
-- 3. 整合所有分散的SQL脚本
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
  `code` VARCHAR(50) NULL COMMENT '部门编码',
  `description` TEXT COMMENT '部门描述',
  `parent_id` VARCHAR(50) NULL COMMENT '上级部门ID',
  `manager_id` VARCHAR(50) NULL COMMENT '部门经理ID',
  `level` INT DEFAULT 1 COMMENT '部门层级',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `member_count` INT DEFAULT 0 COMMENT '成员数量',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
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
  `level` INT DEFAULT 0 COMMENT '角色级别',
  `color` VARCHAR(20) NULL COMMENT '角色颜色',
  `parent_id` VARCHAR(50) COMMENT '上级角色ID',
  `is_system` BOOLEAN DEFAULT FALSE COMMENT '是否系统角色',
  `role_type` VARCHAR(20) DEFAULT 'custom' COMMENT '角色类型：system=系统预设, business=业务角色, custom=自定义角色',
  `is_template` BOOLEAN DEFAULT FALSE COMMENT '是否为模板（模板可用于快速创建角色）',
  `data_scope` ENUM('all', 'department', 'self', 'custom') DEFAULT 'self' COMMENT '数据权限范围',
  `permissions` JSON COMMENT '功能权限列表',
  `menu_permissions` JSON COMMENT '菜单权限列表',
  `api_permissions` JSON COMMENT 'API权限列表',
  `user_count` INT DEFAULT 0 COMMENT '用户数量',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `created_by` VARCHAR(50) COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `updated_by` VARCHAR(50) COMMENT '更新人ID',
  `updated_by_name` VARCHAR(50) COMMENT '更新人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间(TypeORM)',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间(TypeORM)',
  INDEX `idx_code` (`code`),
  INDEX `idx_level` (`level`),
  INDEX `idx_parent` (`parent_id`),
  INDEX `idx_is_system` (`is_system`),
  INDEX `idx_is_template` (`is_template`),
  INDEX `idx_role_type` (`role_type`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 3. 用户表
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '用户ID',
  `username` VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码',
  `name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `real_name` VARCHAR(50) COMMENT '真实姓名',
  `email` VARCHAR(100) COMMENT '邮箱',
  `phone` VARCHAR(20) COMMENT '手机号',
  `avatar` VARCHAR(500) COMMENT '头像URL',
  `gender` ENUM('male', 'female', 'unknown') DEFAULT 'unknown' COMMENT '性别',
  `birthday` DATE COMMENT '生日',
  `id_card` VARCHAR(255) COMMENT '身份证号（加密）',
  `role` VARCHAR(50) NOT NULL COMMENT '角色',
  `role_id` VARCHAR(50) NOT NULL COMMENT '角色ID',
  `department_id` VARCHAR(50) COMMENT '部门ID',
  `department_name` VARCHAR(100) COMMENT '部门名称',
  `position` VARCHAR(50) COMMENT '职位',
  `employee_number` VARCHAR(50) COMMENT '工号',
  `entry_date` DATE COMMENT '入职日期',
  `leave_date` DATE COMMENT '离职日期',
  `salary` VARCHAR(255) COMMENT '工资（加密）',
  `bank_account` VARCHAR(255) COMMENT '银行账号（加密）',
  `emergency_contact` VARCHAR(50) COMMENT '紧急联系人',
  `emergency_phone` VARCHAR(20) COMMENT '紧急联系电话',
  `address` TEXT COMMENT '家庭住址',
  `education` VARCHAR(20) COMMENT '学历',
  `major` VARCHAR(100) COMMENT '专业',
  `status` ENUM('active', 'inactive', 'resigned', 'locked') DEFAULT 'active' COMMENT '状态',
  `employment_status` ENUM('active', 'resigned') DEFAULT 'active' COMMENT '在职状态',
  `resigned_at` DATETIME NULL COMMENT '离职时间',
  `last_login_at` TIMESTAMP NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(45) NULL COMMENT '最后登录IP',
  `login_count` INT DEFAULT 0 COMMENT '登录次数',
  `login_fail_count` INT DEFAULT 0 COMMENT '登录失败次数',
  `locked_at` DATETIME NULL COMMENT '账户锁定时间',
  `must_change_password` BOOLEAN DEFAULT FALSE COMMENT '是否必须修改密码',
  `remark` TEXT NULL COMMENT '备注',
  `settings` JSON COMMENT '用户设置',
  `authorized_ips` JSON COMMENT '授权登录IP列表（JSON数组，空表示无限制）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_username` (`username`),
  INDEX `idx_email` (`email`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_employee_number` (`employee_number`),
  INDEX `idx_role` (`role`),
  INDEX `idx_role_id` (`role_id`),
  INDEX `idx_department` (`department_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_entry_date` (`entry_date`),
  INDEX `idx_authorized_ips` ((JSON_LENGTH(`authorized_ips`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 4. 客户表
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '客户ID',
  `customer_code` VARCHAR(50) UNIQUE COMMENT '客户编号',
  `name` VARCHAR(100) NOT NULL COMMENT '客户姓名',
  `phone` VARCHAR(20) COMMENT '手机号',
  `other_phones` JSON DEFAULT NULL COMMENT '其他手机号',
  `wechat` VARCHAR(100) COMMENT '微信号',
  `qq` VARCHAR(50) COMMENT 'QQ号',
  `email` VARCHAR(100) COMMENT '邮箱',
  `gender` ENUM('male', 'female', 'unknown') DEFAULT 'unknown' COMMENT '性别',
  `age` INT NULL COMMENT '年龄',
  `birthday` DATE COMMENT '生日',
  `id_card` VARCHAR(255) COMMENT '身份证号（加密）',
  `height` DECIMAL(5,1) NULL COMMENT '身高(cm)',
  `weight` DECIMAL(5,1) NULL COMMENT '体重(kg)',
  `address` TEXT COMMENT '完整地址',
  `province` VARCHAR(50) NULL COMMENT '省份',
  `city` VARCHAR(50) NULL COMMENT '城市',
  `district` VARCHAR(50) NULL COMMENT '区县',
  `street` VARCHAR(100) NULL COMMENT '街道',
  `detail_address` VARCHAR(200) NULL COMMENT '详细地址',
  `overseas_address` VARCHAR(500) NULL COMMENT '境外地址',
  `company` VARCHAR(200) COMMENT '公司名称',
  `industry` VARCHAR(100) COMMENT '行业',
  `source` VARCHAR(50) COMMENT '客户来源',
  `level` VARCHAR(20) DEFAULT 'normal' COMMENT '客户等级',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `follow_status` VARCHAR(20) COMMENT '跟进状态',
  `tags` JSON COMMENT '标签',
  `remark` TEXT COMMENT '备注',
  `medical_history` TEXT NULL COMMENT '疾病史',
  `improvement_goals` JSON NULL COMMENT '改善目标',
  `other_goals` VARCHAR(200) NULL COMMENT '其他改善目标',
  `order_count` INT DEFAULT 0 COMMENT '订单数量',
  `return_count` INT DEFAULT 0 COMMENT '退货次数',
  `total_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '总消费金额',
  `fan_acquisition_time` DATETIME NULL COMMENT '进粉时间',
  `last_order_time` TIMESTAMP NULL COMMENT '最后下单时间',
  `last_contact_time` TIMESTAMP NULL COMMENT '最后联系时间',
  `next_follow_time` TIMESTAMP NULL COMMENT '下次跟进时间',
  `sales_person_id` VARCHAR(50) COMMENT '销售员ID',
  `sales_person_name` VARCHAR(50) COMMENT '销售员姓名',
  `created_by` VARCHAR(50) NOT NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_customer_code` (`customer_code`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_email` (`email`),
  INDEX `idx_birthday` (`birthday`),
  INDEX `idx_sales_person` (`sales_person_id`),
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_level` (`level`),
  INDEX `idx_status` (`status`),
  INDEX `idx_follow_status` (`follow_status`),
  INDEX `idx_next_follow_time` (`next_follow_time`),
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

-- 6.1 客户分享表
DROP TABLE IF EXISTS `customer_shares`;
CREATE TABLE `customer_shares` (
  `id` CHAR(36) PRIMARY KEY COMMENT '分享ID(UUID)',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) NOT NULL COMMENT '客户姓名',
  `shared_by` VARCHAR(50) NOT NULL COMMENT '分享人ID',
  `shared_by_name` VARCHAR(50) NOT NULL COMMENT '分享人姓名',
  `shared_to` VARCHAR(50) NOT NULL COMMENT '接收人ID',
  `shared_to_name` VARCHAR(50) NOT NULL COMMENT '接收人姓名',
  `time_limit` INT DEFAULT 0 COMMENT '时间限制(天,0表示永久)',
  `expire_time` TIMESTAMP NULL COMMENT '过期时间',
  `remark` VARCHAR(500) NULL COMMENT '备注',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active活跃, expired已过期, recalled已回收',
  `recall_time` TIMESTAMP NULL COMMENT '回收时间',
  `recall_reason` VARCHAR(500) NULL COMMENT '回收原因',
  `original_owner` VARCHAR(50) NULL COMMENT '原归属人ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_shared_by` (`shared_by`),
  INDEX `idx_shared_to` (`shared_to`),
  INDEX `idx_status` (`status`),
  INDEX `idx_expire_time` (`expire_time`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户分享表';

-- 6.2 客户分配历史表
DROP TABLE IF EXISTS `customer_assignments`;
CREATE TABLE `customer_assignments` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '分配ID',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) NULL COMMENT '客户姓名',
  `from_user_id` VARCHAR(50) NULL COMMENT '原归属人ID',
  `from_user_name` VARCHAR(50) NULL COMMENT '原归属人姓名',
  `to_user_id` VARCHAR(50) NOT NULL COMMENT '新归属人ID',
  `to_user_name` VARCHAR(50) NULL COMMENT '新归属人姓名',
  `assignment_type` VARCHAR(20) DEFAULT 'manual' COMMENT '分配类型: manual手动, auto自动, transfer转移',
  `reason` VARCHAR(500) NULL COMMENT '分配原因',
  `remark` TEXT NULL COMMENT '备注',
  `operator_id` VARCHAR(50) NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(50) NULL COMMENT '操作人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_from_user` (`from_user_id`),
  INDEX `idx_to_user` (`to_user_id`),
  INDEX `idx_operator` (`operator_id`),
  INDEX `idx_type` (`assignment_type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户分配历史表';

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
  `service_wechat` VARCHAR(100) COMMENT '客服微信号',
  `order_source` VARCHAR(50) COMMENT '订单来源',
  `products` JSON COMMENT '商品列表',
  `total_amount` DECIMAL(10,2) NOT NULL COMMENT '订单总金额',
  `discount_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
  `final_amount` DECIMAL(10,2) NOT NULL COMMENT '实付金额',
  `deposit_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '定金金额',
  `deposit_screenshots` JSON COMMENT '定金截图',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态',
  `payment_status` VARCHAR(20) DEFAULT 'unpaid' COMMENT '支付状态',
  `payment_method` VARCHAR(50) COMMENT '支付方式',
  `payment_method_other` VARCHAR(100) NULL COMMENT '其他支付方式说明',
  `payment_time` TIMESTAMP NULL COMMENT '支付时间',
  `shipping_address` TEXT COMMENT '收货地址',
  `shipping_phone` VARCHAR(20) COMMENT '收货电话',
  `shipping_name` VARCHAR(50) COMMENT '收货人',
  `express_company` VARCHAR(50) COMMENT '快递公司',
  `tracking_number` VARCHAR(100) COMMENT '快递单号',
  `shipping_time` VARCHAR(50) NULL COMMENT '发货时间字符串',
  `expected_delivery_date` VARCHAR(20) NULL COMMENT '预计送达日期',
  `shipped_at` TIMESTAMP NULL COMMENT '发货时间',
  `delivered_at` TIMESTAMP NULL COMMENT '签收时间',
  `cancelled_at` TIMESTAMP NULL COMMENT '取消时间',
  `cancel_reason` TEXT COMMENT '取消原因',
  `refund_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '退款金额',
  `refund_reason` TEXT COMMENT '退款原因',
  `refund_time` TIMESTAMP NULL COMMENT '退款时间',
  `invoice_type` VARCHAR(20) COMMENT '发票类型',
  `invoice_title` VARCHAR(200) COMMENT '发票抬头',
  `invoice_number` VARCHAR(100) COMMENT '发票号码',
  `mark_type` VARCHAR(20) DEFAULT 'normal' COMMENT '订单标记类型',
  `logistics_status` VARCHAR(50) DEFAULT NULL COMMENT '物流状态',
  `latest_logistics_info` VARCHAR(500) DEFAULT NULL COMMENT '最新物流动态',
  `is_todo` TINYINT(1) DEFAULT 0 COMMENT '是否待办',
  `todo_date` DATE DEFAULT NULL COMMENT '待办日期',
  `todo_remark` TEXT DEFAULT NULL COMMENT '待办备注',
  `custom_fields` JSON COMMENT '自定义字段(旧版，保留兼容)',
  `custom_field1` VARCHAR(500) NULL COMMENT '自定义字段1',
  `custom_field2` VARCHAR(500) NULL COMMENT '自定义字段2',
  `custom_field3` VARCHAR(500) NULL COMMENT '自定义字段3',
  `custom_field4` VARCHAR(500) NULL COMMENT '自定义字段4',
  `custom_field5` VARCHAR(500) NULL COMMENT '自定义字段5',
  `custom_field6` VARCHAR(500) NULL COMMENT '自定义字段6',
  `custom_field7` VARCHAR(500) NULL COMMENT '自定义字段7',
  `remark` TEXT COMMENT '订单备注',
  `performance_status` VARCHAR(20) DEFAULT 'pending' COMMENT '绩效状态: pending-待处理, valid-有效, invalid-无效',
  `performance_coefficient` DECIMAL(3,2) DEFAULT 1.00 COMMENT '绩效系数',
  `performance_remark` VARCHAR(200) DEFAULT NULL COMMENT '绩效备注',
  `estimated_commission` DECIMAL(10,2) DEFAULT 0.00 COMMENT '预估佣金',
  `performance_updated_at` TIMESTAMP NULL COMMENT '绩效更新时间',
  `performance_updated_by` VARCHAR(50) DEFAULT NULL COMMENT '绩效更新人ID',
  `operator_id` VARCHAR(50) COMMENT '操作员ID',
  `operator_name` VARCHAR(50) COMMENT '操作员姓名',
  `created_by` VARCHAR(50) NOT NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `created_by_department_id` VARCHAR(50) COMMENT '创建人部门ID',
  `created_by_department_name` VARCHAR(100) COMMENT '创建人部门名称',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_order_number` (`order_number`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_payment_status` (`payment_status`),
  INDEX `idx_tracking_number` (`tracking_number`),
  INDEX `idx_order_source` (`order_source`),
  INDEX `idx_mark_type` (`mark_type`),
  INDEX `idx_logistics_status` (`logistics_status`),
  INDEX `idx_is_todo` (`is_todo`),
  INDEX `idx_todo_date` (`todo_date`),
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_shipped_at` (`shipped_at`),
  INDEX `idx_delivered_at` (`delivered_at`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_shipping_time` (`shipping_time`),
  INDEX `idx_expected_delivery_date` (`expected_delivery_date`),
  INDEX `idx_performance_status` (`performance_status`),
  INDEX `idx_performance_coefficient` (`performance_coefficient`)
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

-- 11. 售后服务表（完整版）
DROP TABLE IF EXISTS `after_sales_services`;
CREATE TABLE `after_sales_services` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '售后ID',
  `service_number` VARCHAR(50) UNIQUE NOT NULL COMMENT '售后单号',
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
  INDEX `idx_service_number` (`service_number`),
  INDEX `idx_order_number` (`order_number`),
  INDEX `idx_customer_id` (`customer_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_by_id` (`created_by_id`),
  INDEX `idx_department_id` (`department_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后服务表';

-- 11.1 旧版售后服务表（兼容）
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后服务表(旧版兼容)';

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
  `customer_id` VARCHAR(50) COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `product_category` VARCHAR(100) COMMENT '产品分类',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '业绩金额',
  `commission_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '提成比例',
  `commission_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '提成金额',
  `type` VARCHAR(20) DEFAULT 'order' COMMENT '业绩类型',
  `status` ENUM('pending', 'confirmed', 'paid', 'cancelled') DEFAULT 'pending' COMMENT '状态',
  `confirmed_by` VARCHAR(50) COMMENT '确认人ID',
  `confirmed_by_name` VARCHAR(50) COMMENT '确认人姓名',
  `confirmed_at` TIMESTAMP NULL COMMENT '确认时间',
  `paid_at` TIMESTAMP NULL COMMENT '支付时间',
  `date` DATE NOT NULL COMMENT '业绩日期',
  `remark` TEXT COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user` (`user_id`),
  INDEX `idx_department` (`department_id`),
  INDEX `idx_order` (`order_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_status` (`status`),
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
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
  `configKey` VARCHAR(100) NOT NULL COMMENT '配置键名',
  `configValue` TEXT COMMENT '配置值',
  `valueType` VARCHAR(50) DEFAULT 'string' COMMENT '值类型: string, number, boolean, json, text',
  `configGroup` VARCHAR(100) NOT NULL DEFAULT 'general' COMMENT '配置分组',
  `description` VARCHAR(200) COMMENT '配置描述',
  `isEnabled` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  `isSystem` BOOLEAN DEFAULT FALSE COMMENT '是否为系统配置（不可删除）',
  `sortOrder` INT DEFAULT 0 COMMENT '排序权重',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE INDEX `idx_config_key_group` (`configKey`, `configGroup`),
  INDEX `idx_config_group` (`configGroup`),
  INDEX `idx_enabled` (`isEnabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 系统配置默认数据
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES
-- 基本设置
('systemName', '云客CRM客户管理系统', 'string', 'basic_settings', '系统名称', 1, 1, 1),
('systemVersion', '2.9.0', 'string', 'basic_settings', '系统版本', 1, 1, 2),
('companyName', '广州仙狐网络科技有限公司', 'string', 'basic_settings', '公司名称', 1, 1, 3),
('contactPhone', '13570727364', 'string', 'basic_settings', '联系电话', 1, 1, 4),
('contactEmail', 'xianhuquwang@163.com', 'string', 'basic_settings', '联系邮箱', 1, 1, 5),
('websiteUrl', 'https://xianhuqw.com', 'string', 'basic_settings', '网站地址', 1, 1, 6),
('companyAddress', '广州市黄埔区南翔一路68号', 'string', 'basic_settings', '公司地址', 1, 1, 7),
('systemDescription', '智能、专业、高效的客户关系管理系统', 'string', 'basic_settings', '系统描述', 1, 1, 8),
('systemLogo', '', 'string', 'basic_settings', '系统Logo', 1, 1, 9),
('contactQRCode', '', 'string', 'basic_settings', '联系二维码', 1, 1, 10),
-- 安全设置
('passwordMinLength', '8', 'number', 'security_settings', '密码最小长度', 1, 1, 1),
('passwordExpireDays', '90', 'number', 'security_settings', '密码过期天数', 1, 1, 2),
('loginFailLock', 'true', 'boolean', 'security_settings', '登录失败锁定', 1, 1, 3),
('maxLoginFails', '5', 'number', 'security_settings', '最大登录失败次数', 1, 1, 4),
('lockDuration', '30', 'number', 'security_settings', '锁定时长(分钟)', 1, 1, 5),
('sessionTimeout', '120', 'number', 'security_settings', '会话超时(分钟)', 1, 1, 6),
('forceHttps', 'false', 'boolean', 'security_settings', '强制HTTPS', 1, 1, 7),
('ipWhitelist', '', 'string', 'security_settings', 'IP白名单', 1, 1, 8),
('secureConsoleEnabled', 'false', 'boolean', 'security_settings', '控制台日志加密', 1, 1, 9),
-- 存储设置
('storageType', 'local', 'string', 'storage_settings', '存储类型', 1, 1, 1),
('localPath', '/uploads', 'string', 'storage_settings', '本地存储路径', 1, 1, 2),
('localDomain', 'http://localhost:3000', 'string', 'storage_settings', '本地域名', 1, 1, 3),
('maxFileSize', '10', 'number', 'storage_settings', '最大文件大小(MB)', 1, 1, 4),
('allowedTypes', 'jpg,png,gif,pdf,doc,docx,xls,xlsx', 'string', 'storage_settings', '允许的文件类型', 1, 1, 5),
('imageCompressEnabled', 'true', 'boolean', 'storage_settings', '启用图片压缩', 1, 1, 6),
('imageCompressQuality', 'medium', 'string', 'storage_settings', '图片压缩质量', 1, 1, 7),
('imageCompressMaxWidth', '1200', 'number', 'storage_settings', '图片最大宽度', 1, 1, 8),
-- 邮件设置
('smtpHost', '', 'string', 'email_settings', 'SMTP服务器', 1, 1, 1),
('smtpPort', '587', 'number', 'email_settings', 'SMTP端口', 1, 1, 2),
('senderEmail', '', 'string', 'email_settings', '发件人邮箱', 1, 1, 3),
('senderName', '', 'string', 'email_settings', '发件人名称', 1, 1, 4),
('emailPassword', '', 'string', 'email_settings', '邮箱密码', 1, 1, 5),
('enableSsl', 'true', 'boolean', 'email_settings', '启用SSL', 1, 1, 6),
('enableTls', 'false', 'boolean', 'email_settings', '启用TLS', 1, 1, 7),
-- 短信设置
('provider', 'aliyun', 'string', 'sms_settings', '短信服务商', 1, 1, 1),
('accessKey', '', 'string', 'sms_settings', 'AccessKey', 1, 1, 2),
('secretKey', '', 'string', 'sms_settings', 'SecretKey', 1, 1, 3),
('signName', '', 'string', 'sms_settings', '短信签名', 1, 1, 4),
('dailyLimit', '100', 'number', 'sms_settings', '每日限额', 1, 1, 5),
('monthlyLimit', '3000', 'number', 'sms_settings', '每月限额', 1, 1, 6),
('enabled', 'false', 'boolean', 'sms_settings', '启用短信', 1, 1, 7),
-- 通话设置
('sipServer', '', 'string', 'call_settings', 'SIP服务器', 1, 1, 1),
('sipPort', '5060', 'number', 'call_settings', 'SIP端口', 1, 1, 2),
('sipUsername', '', 'string', 'call_settings', 'SIP用户名', 1, 1, 3),
('sipPassword', '', 'string', 'call_settings', 'SIP密码', 1, 1, 4),
('sipTransport', 'UDP', 'string', 'call_settings', 'SIP传输协议', 1, 1, 5),
('autoAnswer', 'false', 'boolean', 'call_settings', '自动接听', 1, 1, 6),
('autoRecord', 'false', 'boolean', 'call_settings', '自动录音', 1, 1, 7),
('qualityMonitoring', 'false', 'boolean', 'call_settings', '质量监控', 1, 1, 8),
('incomingCallPopup', 'true', 'boolean', 'call_settings', '来电弹窗', 1, 1, 9),
('maxCallDuration', '3600', 'number', 'call_settings', '最大通话时长(秒)', 1, 1, 10),
('recordFormat', 'mp3', 'string', 'call_settings', '录音格式', 1, 1, 11),
('recordQuality', 'standard', 'string', 'call_settings', '录音质量', 1, 1, 12),
('recordPath', './recordings', 'string', 'call_settings', '录音路径', 1, 1, 13),
('recordRetentionDays', '90', 'number', 'call_settings', '录音保留天数', 1, 1, 14),
-- 商品设置
('maxDiscountPercent', '30', 'number', 'product_settings', '最大折扣百分比', 1, 1, 1),
('adminMaxDiscount', '50', 'number', 'product_settings', '管理员最大折扣', 1, 1, 2),
('managerMaxDiscount', '30', 'number', 'product_settings', '经理最大折扣', 1, 1, 3),
('salesMaxDiscount', '15', 'number', 'product_settings', '销售最大折扣', 1, 1, 4),
('discountApprovalThreshold', '20', 'number', 'product_settings', '折扣审批阈值', 1, 1, 5),
('allowPriceModification', 'true', 'boolean', 'product_settings', '允许修改价格', 1, 1, 6),
('enableInventory', 'true', 'boolean', 'product_settings', '启用库存管理', 1, 1, 7),
('lowStockThreshold', '10', 'number', 'product_settings', '低库存阈值', 1, 1, 8)
ON DUPLICATE KEY UPDATE `configValue` = VALUES(`configValue`), `updatedAt` = CURRENT_TIMESTAMP;

-- =============================================
-- 通话管理模块表
-- =============================================

-- 16. 通话记录表
DROP TABLE IF EXISTS `call_records`;
CREATE TABLE `call_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '通话ID',
  `customer_id` VARCHAR(100) COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) NOT NULL COMMENT '客户电话',
  `call_type` ENUM('outbound', 'inbound') DEFAULT 'outbound' COMMENT '通话类型：outbound-呼出，inbound-呼入',
  `call_status` ENUM('connected', 'missed', 'busy', 'failed', 'rejected', 'pending', 'calling') DEFAULT 'connected' COMMENT '通话状态：connected-已接通，missed-未接，busy-忙线，failed-失败，rejected-拒接，pending-待处理，calling-拨号中',
  `start_time` DATETIME COMMENT '通话开始时间',
  `end_time` DATETIME COMMENT '通话结束时间',
  `duration` INT DEFAULT 0 COMMENT '通话时长(秒)',
  `recording_url` VARCHAR(500) COMMENT '录音文件URL',
  `has_recording` TINYINT(1) DEFAULT 0 COMMENT '是否有录音',
  `recording_size` BIGINT DEFAULT 0 COMMENT '录音文件大小(字节)',
  `notes` TEXT COMMENT '通话备注',
  `call_tags` JSON COMMENT '通话标签（JSON数组，如：["意向","需报价"]）',
  `follow_up_required` TINYINT(1) DEFAULT 0 COMMENT '是否需要跟进',
  `call_method` VARCHAR(20) DEFAULT 'system' COMMENT '外呼方式：system-系统线路，mobile-工作手机，voip-网络电话',
  `line_id` VARCHAR(50) COMMENT '外呼线路ID',
  `caller_number` VARCHAR(20) COMMENT '主叫号码',
  `user_id` VARCHAR(100) NOT NULL COMMENT '操作用户ID',
  `user_name` VARCHAR(100) COMMENT '操作用户姓名',
  `department` VARCHAR(100) COMMENT '部门',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_customer_id` (`customer_id`),
  INDEX `idx_customer_phone` (`customer_phone`),
  INDEX `idx_call_type` (`call_type`),
  INDEX `idx_call_status` (`call_status`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_start_time` (`start_time`),
  INDEX `idx_has_recording` (`has_recording`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通话记录表';

-- 17. 跟进记录表
DROP TABLE IF EXISTS `follow_up_records`;
CREATE TABLE `follow_up_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '跟进ID',
  `call_id` VARCHAR(50) COMMENT '关联通话ID',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `follow_up_type` ENUM('call', 'visit', 'email', 'message', 'wechat') NOT NULL DEFAULT 'call' COMMENT '跟进方式',
  `content` TEXT COMMENT '跟进内容',
  `customer_intent` ENUM('high', 'medium', 'low', 'none') COMMENT '客户意向',
  `call_tags` JSON COMMENT '通话标签',
  `next_follow_up_date` DATETIME COMMENT '下次跟进时间',
  `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '优先级',
  `status` ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '状态',
  `intention` VARCHAR(20) COMMENT '客户意向(旧字段，兼容)',
  `result` VARCHAR(50) COMMENT '跟进结果',
  `user_id` VARCHAR(50) NOT NULL COMMENT '跟进人ID',
  `user_name` VARCHAR(50) COMMENT '跟进人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_call` (`call_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_next_follow_up` (`next_follow_up_date`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跟进记录表';

-- 17.1 电话配置表
DROP TABLE IF EXISTS `phone_configs`;
CREATE TABLE `phone_configs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `config_type` VARCHAR(50) NOT NULL DEFAULT 'call' COMMENT '配置类型: call-通话配置',
  
  -- 外呼方式配置
  `call_method` VARCHAR(20) DEFAULT 'system' COMMENT '外呼方式: system/mobile/voip',
  `line_id` VARCHAR(50) COMMENT '系统外呼线路ID',
  `work_phone` VARCHAR(20) COMMENT '工作手机号',
  `dial_method` VARCHAR(20) DEFAULT 'direct' COMMENT '拨号方式: direct/callback',
  
  -- 用户偏好设置 (新增)
  `prefer_mobile` TINYINT(1) DEFAULT 0 COMMENT '优先使用工作手机',
  `default_line_id` INT COMMENT '默认线路ID',
  
  -- 工作手机配置
  `mobile_config` JSON COMMENT '工作手机配置',
  
  -- 回拨配置
  `callback_config` JSON COMMENT '回拨模式配置',
  
  -- VoIP配置
  `voip_provider` VARCHAR(20) COMMENT 'VoIP服务商: aliyun/tencent/huawei/custom',
  `audio_device` VARCHAR(20) DEFAULT 'default' COMMENT '音频设备',
  `audio_quality` VARCHAR(20) DEFAULT 'standard' COMMENT '音频质量',
  
  -- 云服务商配置
  `aliyun_config` JSON COMMENT '阿里云通信配置',
  `tencent_config` JSON COMMENT '腾讯云通信配置',
  `huawei_config` JSON COMMENT '华为云通信配置',
  
  -- 呼叫参数
  `call_mode` VARCHAR(20) DEFAULT 'manual' COMMENT '呼叫模式',
  `call_interval` INT DEFAULT 30 COMMENT '呼叫间隔(秒)',
  `max_retries` INT DEFAULT 3 COMMENT '最大重试次数',
  `call_timeout` INT DEFAULT 60 COMMENT '呼叫超时(秒)',
  `enable_recording` TINYINT(1) DEFAULT 1 COMMENT '是否启用录音',
  `auto_follow_up` TINYINT(1) DEFAULT 0 COMMENT '是否自动跟进',
  
  -- 高级设置
  `concurrent_calls` INT DEFAULT 1 COMMENT '并发呼叫数',
  `priority` VARCHAR(20) DEFAULT 'medium' COMMENT '优先级',
  `blacklist_check` TINYINT(1) DEFAULT 1 COMMENT '是否检查黑名单',
  `show_location` TINYINT(1) DEFAULT 1 COMMENT '是否显示归属地',
  
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  UNIQUE KEY `uk_user_type` (`user_id`, `config_type`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户电话配置表';

-- 17.2 外呼线路表
DROP TABLE IF EXISTS `call_lines`;
CREATE TABLE `call_lines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '线路ID',
  `name` VARCHAR(100) NOT NULL COMMENT '线路名称',
  `provider` VARCHAR(50) NOT NULL COMMENT '服务商：system-系统，aliyun-阿里云，tencent-腾讯云，huawei-华为云，custom-自定义',
  `type` VARCHAR(20) DEFAULT 'voip' COMMENT '线路类型：voip-网络电话，pstn-传统电话，sip-SIP线路',
  `caller_number` VARCHAR(30) COMMENT '主叫显示号码/外显号码',
  `line_number` VARCHAR(30) COMMENT '线路号码',
  `config` JSON COMMENT '线路配置（加密存储AccessKey等）',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态：active-正常，inactive-停用，error-异常',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用(管理员控制)',
  `max_concurrent` INT DEFAULT 10 COMMENT '最大并发数',
  `current_concurrent` INT DEFAULT 0 COMMENT '当前并发数',
  `daily_limit` INT DEFAULT 1000 COMMENT '每日限额',
  `daily_used` INT DEFAULT 0 COMMENT '今日已用',
  `total_calls` INT DEFAULT 0 COMMENT '总通话次数',
  `total_duration` INT DEFAULT 0 COMMENT '总通话时长(秒)',
  `success_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '接通率(%)',
  `last_used_at` DATETIME COMMENT '最后使用时间',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `description` TEXT COMMENT '线路描述',
  `remark` TEXT COMMENT '备注',
  `created_by` VARCHAR(50) COMMENT '创建人ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_provider` (`provider`),
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外呼线路表';

-- 17.3 外呼任务表
DROP TABLE IF EXISTS `outbound_tasks`;
CREATE TABLE `outbound_tasks` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '任务ID',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) NOT NULL COMMENT '客户电话',
  `customer_level` VARCHAR(20) COMMENT '客户等级',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending-待外呼，calling-呼叫中，connected-已接通，no_answer-未接听，busy-忙线，failed-失败，completed-已完成',
  `call_count` INT DEFAULT 0 COMMENT '已呼叫次数',
  `last_call_time` DATETIME COMMENT '最后通话时间',
  `last_call_id` VARCHAR(50) COMMENT '最后通话记录ID',
  `next_call_time` DATETIME COMMENT '下次呼叫时间',
  `priority` INT DEFAULT 0 COMMENT '优先级(数字越大越优先)',
  `source` VARCHAR(50) COMMENT '任务来源：manual-手动添加，import-导入，system-系统生成',
  `campaign_id` VARCHAR(50) COMMENT '所属活动ID',
  `assigned_to` VARCHAR(50) COMMENT '分配给用户ID',
  `assigned_to_name` VARCHAR(50) COMMENT '分配给用户姓名',
  `remark` TEXT COMMENT '备注',
  `created_by` VARCHAR(50) COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_phone` (`customer_phone`),
  INDEX `idx_status` (`status`),
  INDEX `idx_assigned` (`assigned_to`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_next_call` (`next_call_time`),
  INDEX `idx_campaign` (`campaign_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外呼任务表';

-- 17.4 通话录音表
DROP TABLE IF EXISTS `call_recordings`;
CREATE TABLE `call_recordings` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '录音ID',
  `call_id` VARCHAR(50) NOT NULL COMMENT '通话记录ID',
  `customer_id` VARCHAR(50) COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) COMMENT '客户电话',
  `file_name` VARCHAR(200) NOT NULL COMMENT '文件名',
  `file_path` VARCHAR(500) NOT NULL COMMENT '文件路径',
  `file_url` VARCHAR(500) COMMENT '访问URL',
  `file_size` BIGINT DEFAULT 0 COMMENT '文件大小(字节)',
  `duration` INT DEFAULT 0 COMMENT '录音时长(秒)',
  `format` VARCHAR(20) DEFAULT 'mp3' COMMENT '文件格式：mp3，wav，ogg',
  `sample_rate` INT DEFAULT 16000 COMMENT '采样率',
  `channels` INT DEFAULT 1 COMMENT '声道数',
  `quality_score` DECIMAL(3,1) COMMENT '质量评分(1-5)',
  `transcription` TEXT COMMENT '语音转文字内容',
  `transcription_status` VARCHAR(20) DEFAULT 'none' COMMENT '转写状态：none-未转写，processing-处理中，completed-已完成，failed-失败',
  `storage_type` VARCHAR(20) DEFAULT 'local' COMMENT '存储类型：local-本地，oss-阿里云OSS，cos-腾讯云COS',
  `expire_at` DATETIME COMMENT '过期时间',
  `is_deleted` TINYINT(1) DEFAULT 0 COMMENT '是否已删除',
  `deleted_at` DATETIME COMMENT '删除时间',
  `user_id` VARCHAR(50) COMMENT '操作用户ID',
  `user_name` VARCHAR(50) COMMENT '操作用户姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_call` (`call_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_expire` (`expire_at`),
  INDEX `idx_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通话录音表';

-- 17.5 工作手机绑定表
DROP TABLE IF EXISTS `work_phones`;
CREATE TABLE `work_phones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '绑定ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `phone_number` VARCHAR(20) NOT NULL COMMENT '手机号码',
  `device_id` VARCHAR(100) COMMENT '设备ID',
  `device_name` VARCHAR(100) COMMENT '设备名称',
  `device_model` VARCHAR(100) COMMENT '设备型号',
  `platform` VARCHAR(20) DEFAULT 'android' COMMENT '平台：android，ios',
  `sdk_version` VARCHAR(20) COMMENT 'SDK版本',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending-待绑定，active-已绑定，offline-离线，disabled-已禁用',
  `online_status` VARCHAR(20) DEFAULT 'offline' COMMENT '在线状态：online-在线，offline-离线',
  `is_primary` TINYINT(1) DEFAULT 1 COMMENT '是否为主要设备',
  `last_online_at` DATETIME COMMENT '最后在线时间',
  `last_active_at` DATETIME COMMENT '最后活跃时间',
  `bind_time` DATETIME COMMENT '绑定时间',
  `connection_type` VARCHAR(20) DEFAULT 'qrcode' COMMENT '连接方式：qrcode-二维码，bluetooth-蓝牙，network-同网络，digital-数字配对',
  `connection_id` VARCHAR(100) COMMENT '连接ID',
  `push_token` VARCHAR(500) COMMENT '推送Token',
  `call_count` INT DEFAULT 0 COMMENT '通话次数',
  `total_duration` INT DEFAULT 0 COMMENT '总通话时长(秒)',
  `remark` TEXT COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user` (`user_id`),
  INDEX `idx_phone` (`phone_number`),
  INDEX `idx_device` (`device_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_is_primary` (`is_primary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作手机绑定表';

-- 17.6 号码黑名单表
DROP TABLE IF EXISTS `phone_blacklist`;
CREATE TABLE `phone_blacklist` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '黑名单ID',
  `phone` VARCHAR(20) NOT NULL COMMENT '电话号码',
  `reason` VARCHAR(200) COMMENT '加入原因',
  `source` VARCHAR(50) DEFAULT 'manual' COMMENT '来源：manual-手动添加，complaint-投诉，system-系统识别',
  `expire_at` DATETIME COMMENT '过期时间(NULL表示永久)',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否生效',
  `created_by` VARCHAR(50) COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE INDEX `idx_phone` (`phone`),
  INDEX `idx_active` (`is_active`),
  INDEX `idx_expire` (`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='号码黑名单表';

-- 18. 短信模板表
DROP TABLE IF EXISTS `sms_templates`;
CREATE TABLE `sms_templates` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '模板ID',
  `name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `category` VARCHAR(50) COMMENT '模板分类',
  `content` TEXT NOT NULL COMMENT '模板内容',
  `variables` JSON COMMENT '变量列表',
  `description` TEXT COMMENT '模板描述',
  `applicant` VARCHAR(50) NOT NULL COMMENT '申请人ID',
  `applicant_name` VARCHAR(50) COMMENT '申请人姓名',
  `applicant_dept` VARCHAR(100) COMMENT '申请人部门',
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审核状态',
  `approved_by` VARCHAR(50) COMMENT '审核人ID',
  `approved_at` TIMESTAMP NULL COMMENT '审核时间',
  `is_system` BOOLEAN DEFAULT FALSE COMMENT '是否系统模板',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_category` (`category`),
  INDEX `idx_status` (`status`),
  INDEX `idx_applicant` (`applicant`),
  INDEX `idx_is_system` (`is_system`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信模板表';

-- 19. 短信发送记录表
DROP TABLE IF EXISTS `sms_records`;
CREATE TABLE `sms_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '记录ID',
  `template_id` VARCHAR(50) COMMENT '模板ID',
  `template_name` VARCHAR(100) COMMENT '模板名称',
  `content` TEXT NOT NULL COMMENT '短信内容',
  `recipients` JSON NOT NULL COMMENT '接收人列表',
  `recipient_count` INT DEFAULT 0 COMMENT '接收人数量',
  `success_count` INT DEFAULT 0 COMMENT '成功数量',
  `fail_count` INT DEFAULT 0 COMMENT '失败数量',
  `status` ENUM('pending', 'sending', 'completed', 'failed') DEFAULT 'pending' COMMENT '发送状态',
  `send_details` JSON COMMENT '发送详情',
  `applicant` VARCHAR(50) NOT NULL COMMENT '申请人ID',
  `applicant_name` VARCHAR(50) COMMENT '申请人姓名',
  `applicant_dept` VARCHAR(100) COMMENT '申请人部门',
  `approved_by` VARCHAR(50) COMMENT '审核人ID',
  `approved_at` TIMESTAMP NULL COMMENT '审核时间',
  `sent_at` TIMESTAMP NULL COMMENT '发送时间',
  `remark` TEXT COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_template` (`template_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_applicant` (`applicant`),
  INDEX `idx_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信发送记录表';

-- 20. 消息通知表
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '通知ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '接收用户ID',
  `type` VARCHAR(50) NOT NULL COMMENT '消息类型',
  `title` VARCHAR(200) NOT NULL COMMENT '消息标题',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `category` VARCHAR(50) COMMENT '消息分类',
  `priority` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '优先级',
  `is_read` BOOLEAN DEFAULT FALSE COMMENT '是否已读',
  `read_at` TIMESTAMP NULL COMMENT '阅读时间',
  `related_id` VARCHAR(50) COMMENT '关联业务ID',
  `related_type` VARCHAR(50) COMMENT '关联业务类型',
  `action_url` VARCHAR(500) COMMENT '操作链接',
  `icon` VARCHAR(50) COMMENT '图标',
  `color` VARCHAR(20) COMMENT '颜色',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user` (`user_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_category` (`category`),
  INDEX `idx_is_read` (`is_read`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_related` (`related_type`, `related_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息通知表';

-- 21. 系统公告表
DROP TABLE IF EXISTS `system_announcements`;
CREATE TABLE `system_announcements` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '公告ID',
  `title` VARCHAR(200) NOT NULL COMMENT '公告标题',
  `content` TEXT NOT NULL COMMENT '公告内容',
  `type` ENUM('system', 'maintenance', 'update', 'notice') DEFAULT 'notice' COMMENT '公告类型',
  `priority` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '优先级',
  `status` ENUM('draft', 'published', 'archived') DEFAULT 'draft' COMMENT '状态',
  `target_users` JSON COMMENT '目标用户（为空表示全员）',
  `target_roles` JSON COMMENT '目标角色',
  `target_departments` JSON COMMENT '目标部门',
  `publish_time` TIMESTAMP NULL COMMENT '发布时间',
  `expire_time` TIMESTAMP NULL COMMENT '过期时间',
  `is_popup` BOOLEAN DEFAULT FALSE COMMENT '是否弹窗显示',
  `is_top` BOOLEAN DEFAULT FALSE COMMENT '是否置顶',
  `read_count` INT DEFAULT 0 COMMENT '阅读次数',
  `attachments` JSON COMMENT '附件列表',
  `created_by` VARCHAR(50) NOT NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_publish_time` (`publish_time`),
  INDEX `idx_is_top` (`is_top`),
  INDEX `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统公告表';

-- 22. 订单审核记录表
DROP TABLE IF EXISTS `order_audits`;
CREATE TABLE `order_audits` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '审核ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NOT NULL COMMENT '订单号',
  `audit_type` ENUM('create', 'modify', 'cancel', 'return') DEFAULT 'create' COMMENT '审核类型',
  `audit_status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审核状态',
  `audit_level` INT DEFAULT 1 COMMENT '审核级别',
  `auditor_id` VARCHAR(50) COMMENT '审核人ID',
  `auditor_name` VARCHAR(50) COMMENT '审核人姓名',
  `audit_time` TIMESTAMP NULL COMMENT '审核时间',
  `audit_result` VARCHAR(20) COMMENT '审核结果',
  `audit_remark` TEXT COMMENT '审核备注',
  `before_data` JSON COMMENT '修改前数据',
  `after_data` JSON COMMENT '修改后数据',
  `applicant_id` VARCHAR(50) NOT NULL COMMENT '申请人ID',
  `applicant_name` VARCHAR(50) COMMENT '申请人姓名',
  `apply_reason` TEXT COMMENT '申请原因',
  `apply_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_order` (`order_id`),
  INDEX `idx_order_number` (`order_number`),
  INDEX `idx_audit_type` (`audit_type`),
  INDEX `idx_audit_status` (`audit_status`),
  INDEX `idx_auditor` (`auditor_id`),
  INDEX `idx_applicant` (`applicant_id`),
  INDEX `idx_apply_time` (`apply_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单审核记录表';

-- 23. 业绩分享记录表
DROP TABLE IF EXISTS `performance_shares`;
CREATE TABLE `performance_shares` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '分享ID',
  `share_number` VARCHAR(50) UNIQUE NOT NULL COMMENT '分享编号',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NOT NULL COMMENT '订单号',
  `order_amount` DECIMAL(10,2) NOT NULL COMMENT '订单金额',
  `total_share_amount` DECIMAL(10,2) NOT NULL COMMENT '总分享金额',
  `share_count` INT DEFAULT 0 COMMENT '分享人数',
  `status` ENUM('active', 'completed', 'cancelled') DEFAULT 'active' COMMENT '状态',
  `description` TEXT COMMENT '分享说明',
  `created_by` VARCHAR(50) NOT NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `completed_at` TIMESTAMP NULL COMMENT '完成时间',
  `cancelled_at` TIMESTAMP NULL COMMENT '取消时间',
  INDEX `idx_share_number` (`share_number`),
  INDEX `idx_order` (`order_id`),
  INDEX `idx_order_number` (`order_number`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩分享记录表';

-- 24. 业绩分享成员表
DROP TABLE IF EXISTS `performance_share_members`;
CREATE TABLE `performance_share_members` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '成员ID',
  `share_id` VARCHAR(50) NOT NULL COMMENT '分享记录ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `user_name` VARCHAR(50) NOT NULL COMMENT '用户姓名',
  `department` VARCHAR(100) COMMENT '所属部门',
  `share_percentage` DECIMAL(5,2) NOT NULL COMMENT '分享比例',
  `share_amount` DECIMAL(10,2) NOT NULL COMMENT '分享金额',
  `status` ENUM('pending', 'confirmed', 'rejected') DEFAULT 'pending' COMMENT '确认状态',
  `confirm_time` TIMESTAMP NULL COMMENT '确认时间',
  `reject_reason` TEXT COMMENT '拒绝原因',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_share` (`share_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`),
  FOREIGN KEY (`share_id`) REFERENCES `performance_shares`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩分享成员表';

-- 25. 物流公司表
DROP TABLE IF EXISTS `logistics_companies`;
CREATE TABLE `logistics_companies` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '公司ID',
  `code` VARCHAR(50) UNIQUE NOT NULL COMMENT '公司代码',
  `name` VARCHAR(100) NOT NULL COMMENT '公司名称',
  `short_name` VARCHAR(50) COMMENT '公司简称',
  `logo` VARCHAR(500) COMMENT 'Logo URL',
  `website` VARCHAR(200) COMMENT '官网地址',
  `tracking_url` VARCHAR(500) COMMENT '跟踪查询地址',
  `api_url` VARCHAR(500) COMMENT 'API接口地址',
  `api_key` VARCHAR(200) COMMENT 'API密钥',
  `api_secret` VARCHAR(200) COMMENT 'API密钥',
  `contact_phone` VARCHAR(50) COMMENT '联系电话',
  `contact_email` VARCHAR(100) COMMENT '联系邮箱',
  `service_area` TEXT COMMENT '服务区域',
  `price_info` JSON COMMENT '价格信息',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `remark` TEXT COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_name` (`name`),
  INDEX `idx_status` (`status`),
  INDEX `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流公司表';

-- 25.1 物流API配置表
DROP TABLE IF EXISTS `logistics_api_configs`;
CREATE TABLE `logistics_api_configs` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '配置ID',
  `company_code` VARCHAR(50) NOT NULL COMMENT '物流公司代码(SF/ZTO/YTO/STO/YD/JTSD/EMS/JD/DBL)',
  `company_name` VARCHAR(100) NOT NULL COMMENT '物流公司名称',
  `app_id` VARCHAR(200) NULL COMMENT '应用ID/AppKey/PartnerId',
  `app_key` VARCHAR(200) NULL COMMENT '应用密钥/AppSecret',
  `app_secret` VARCHAR(500) NULL COMMENT '校验码/CheckWord/SecretKey',
  `customer_id` VARCHAR(200) NULL COMMENT '客户ID/月结账号',
  `api_url` VARCHAR(500) NULL COMMENT 'API接口地址',
  `api_environment` ENUM('sandbox', 'production') DEFAULT 'sandbox' COMMENT 'API环境(sandbox-测试/production-生产)',
  `extra_config` JSON NULL COMMENT '扩展配置(JSON格式)',
  `enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用(0-禁用/1-启用)',
  `last_test_time` DATETIME NULL COMMENT '最后测试时间',
  `last_test_result` TINYINT(1) NULL COMMENT '最后测试结果(0-失败/1-成功)',
  `last_test_message` VARCHAR(500) NULL COMMENT '最后测试消息',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` VARCHAR(50) NULL COMMENT '创建人',
  `updated_by` VARCHAR(50) NULL COMMENT '更新人',
  UNIQUE KEY `uk_company_code` (`company_code`),
  INDEX `idx_enabled` (`enabled`),
  INDEX `idx_api_environment` (`api_environment`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流API配置表';

-- 26. 物流状态历史表
DROP TABLE IF EXISTS `logistics_status_history`;
CREATE TABLE `logistics_status_history` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '历史ID',
  `logistics_id` VARCHAR(50) NOT NULL COMMENT '物流记录ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NOT NULL COMMENT '订单号',
  `tracking_number` VARCHAR(100) NOT NULL COMMENT '物流单号',
  `old_status` VARCHAR(50) COMMENT '原状态',
  `new_status` VARCHAR(50) NOT NULL COMMENT '新状态',
  `status_text` VARCHAR(200) COMMENT '状态描述',
  `location` VARCHAR(200) COMMENT '当前位置',
  `operator` VARCHAR(50) COMMENT '操作人',
  `operator_name` VARCHAR(50) COMMENT '操作人姓名',
  `update_source` ENUM('manual', 'auto', 'api') DEFAULT 'manual' COMMENT '更新来源',
  `remark` TEXT COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_logistics` (`logistics_id`),
  INDEX `idx_order` (`order_id`),
  INDEX `idx_tracking_number` (`tracking_number`),
  INDEX `idx_new_status` (`new_status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流状态历史表';

-- 27. 物流异常记录表
DROP TABLE IF EXISTS `logistics_exceptions`;
CREATE TABLE `logistics_exceptions` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '异常ID',
  `logistics_id` VARCHAR(50) NOT NULL COMMENT '物流记录ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NOT NULL COMMENT '订单号',
  `tracking_number` VARCHAR(100) NOT NULL COMMENT '物流单号',
  `exception_type` VARCHAR(50) NOT NULL COMMENT '异常类型',
  `exception_desc` TEXT NOT NULL COMMENT '异常描述',
  `exception_time` TIMESTAMP NOT NULL COMMENT '异常时间',
  `status` ENUM('pending', 'processing', 'resolved', 'closed') DEFAULT 'pending' COMMENT '处理状态',
  `handler_id` VARCHAR(50) COMMENT '处理人ID',
  `handler_name` VARCHAR(50) COMMENT '处理人姓名',
  `handle_time` TIMESTAMP NULL COMMENT '处理时间',
  `handle_result` TEXT COMMENT '处理结果',
  `solution` TEXT COMMENT '解决方案',
  `images` JSON COMMENT '相关图片',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_logistics` (`logistics_id`),
  INDEX `idx_order` (`order_id`),
  INDEX `idx_tracking_number` (`tracking_number`),
  INDEX `idx_exception_type` (`exception_type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_handler` (`handler_id`),
  INDEX `idx_exception_time` (`exception_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流异常记录表';

-- 28. 物流待办事项表
DROP TABLE IF EXISTS `logistics_todos`;
CREATE TABLE `logistics_todos` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '待办ID',
  `logistics_id` VARCHAR(50) NOT NULL COMMENT '物流记录ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NOT NULL COMMENT '订单号',
  `tracking_number` VARCHAR(100) COMMENT '物流单号',
  `todo_type` VARCHAR(50) NOT NULL COMMENT '待办类型',
  `todo_title` VARCHAR(200) NOT NULL COMMENT '待办标题',
  `todo_content` TEXT COMMENT '待办内容',
  `priority` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '优先级',
  `status` ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '状态',
  `assigned_to` VARCHAR(50) COMMENT '负责人ID',
  `assigned_to_name` VARCHAR(50) COMMENT '负责人姓名',
  `due_date` TIMESTAMP NULL COMMENT '截止时间',
  `remind_time` TIMESTAMP NULL COMMENT '提醒时间',
  `completed_time` TIMESTAMP NULL COMMENT '完成时间',
  `remark` TEXT COMMENT '备注',
  `created_by` VARCHAR(50) NOT NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_logistics` (`logistics_id`),
  INDEX `idx_order` (`order_id`),
  INDEX `idx_todo_type` (`todo_type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_assigned_to` (`assigned_to`),
  INDEX `idx_due_date` (`due_date`),
  INDEX `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流待办事项表';

-- 29. 订单字段配置表
DROP TABLE IF EXISTS `order_field_configs`;
CREATE TABLE `order_field_configs` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '配置ID',
  `field_key` VARCHAR(100) UNIQUE NOT NULL COMMENT '字段键名',
  `field_name` VARCHAR(100) NOT NULL COMMENT '字段名称',
  `field_type` ENUM('text', 'number', 'date', 'datetime', 'select', 'radio', 'checkbox') NOT NULL COMMENT '字段类型',
  `field_options` JSON COMMENT '字段选项',
  `default_value` VARCHAR(500) COMMENT '默认值',
  `placeholder` VARCHAR(200) COMMENT '占位符',
  `is_required` BOOLEAN DEFAULT FALSE COMMENT '是否必填',
  `is_visible` BOOLEAN DEFAULT TRUE COMMENT '是否可见',
  `show_in_list` BOOLEAN DEFAULT FALSE COMMENT '列表显示',
  `show_in_detail` BOOLEAN DEFAULT TRUE COMMENT '详情显示',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `validation_rules` JSON COMMENT '验证规则',
  `description` TEXT COMMENT '字段描述',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_field_key` (`field_key`),
  INDEX `idx_is_visible` (`is_visible`),
  INDEX `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单字段配置表';

-- 30. 系统设置表
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '设置ID',
  `category` VARCHAR(50) NOT NULL COMMENT '配置分类',
  `key` VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键名',
  `value` TEXT COMMENT '配置值',
  `value_type` ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string' COMMENT '值类型',
  `default_value` TEXT COMMENT '默认值',
  `description` TEXT COMMENT '配置描述',
  `is_public` BOOLEAN DEFAULT FALSE COMMENT '是否公开（前端可见）',
  `is_encrypted` BOOLEAN DEFAULT FALSE COMMENT '是否加密存储',
  `require_restart` BOOLEAN DEFAULT FALSE COMMENT '是否需要重启生效',
  `editable_roles` JSON COMMENT '可编辑角色列表',
  `version` INT DEFAULT 1 COMMENT '配置版本',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_by` VARCHAR(50) COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `updated_by` VARCHAR(50) COMMENT '更新人ID',
  `updated_by_name` VARCHAR(50) COMMENT '更新人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_category` (`category`),
  INDEX `idx_key` (`key`),
  INDEX `idx_is_public` (`is_public`),
  INDEX `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统设置表';

-- 31. 权限表（系统权限定义）
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '权限ID',
  `name` VARCHAR(100) NOT NULL COMMENT '权限名称',
  `code` VARCHAR(100) UNIQUE NOT NULL COMMENT '权限代码',
  `description` TEXT COMMENT '权限描述',
  `module` VARCHAR(50) NOT NULL DEFAULT 'system' COMMENT '所属模块',
  `type` VARCHAR(20) DEFAULT 'menu' COMMENT '权限类型: menu/button/api',
  `path` VARCHAR(200) COMMENT '路由路径',
  `icon` VARCHAR(50) COMMENT '图标',
  `sort` INT DEFAULT 0 COMMENT '排序',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/inactive',
  `parentId` INT NULL COMMENT '父级权限ID（树形结构）',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_module` (`module`),
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_parent` (`parentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 32. 角色权限关联表
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `roleId` VARCHAR(50) NOT NULL COMMENT '角色ID',
  `permissionId` INT NOT NULL COMMENT '权限ID',
  PRIMARY KEY (`roleId`, `permissionId`),
  INDEX `idx_role` (`roleId`),
  INDEX `idx_permission` (`permissionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 33. 权限树形结构闭包表（TypeORM closure-table需要）
DROP TABLE IF EXISTS `permissions_closure`;
CREATE TABLE `permissions_closure` (
  `id_ancestor` INT NOT NULL COMMENT '祖先权限ID',
  `id_descendant` INT NOT NULL COMMENT '后代权限ID',
  PRIMARY KEY (`id_ancestor`, `id_descendant`),
  INDEX `idx_ancestor` (`id_ancestor`),
  INDEX `idx_descendant` (`id_descendant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限树形结构闭包表';

-- 34. 用户个人权限表
DROP TABLE IF EXISTS `user_permissions`;
CREATE TABLE `user_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '权限ID',
  `userId` INT NOT NULL COMMENT '用户ID',
  `permissionId` INT NOT NULL COMMENT '权限ID',
  `grantedBy` INT NULL COMMENT '授权人ID',
  `reason` TEXT NULL COMMENT '授权原因',
  `grantedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
  INDEX `idx_user` (`userId`),
  INDEX `idx_permission` (`permissionId`),
  INDEX `idx_granted_by` (`grantedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户个人权限表';

-- 35. 物流状态配置表
DROP TABLE IF EXISTS `logistics_status`;
CREATE TABLE `logistics_status` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '状态ID',
  `name` VARCHAR(50) NOT NULL COMMENT '状态名称',
  `color` VARCHAR(7) DEFAULT '#28a745' COMMENT '状态颜色',
  `description` TEXT NULL COMMENT '状态描述',
  `isActive` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_name` (`name`),
  INDEX `idx_is_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流状态配置表';

-- 36. 物流跟踪表
DROP TABLE IF EXISTS `logistics_tracking`;
CREATE TABLE `logistics_tracking` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '跟踪ID',
  `orderId` INT NOT NULL COMMENT '订单ID',
  `trackingNo` VARCHAR(100) NOT NULL COMMENT '物流单号',
  `companyCode` VARCHAR(50) NOT NULL COMMENT '物流公司代码',
  `companyName` VARCHAR(100) NOT NULL COMMENT '物流公司名称',
  `status` VARCHAR(50) DEFAULT 'pending' COMMENT '物流状态',
  `currentLocation` VARCHAR(200) NULL COMMENT '当前位置',
  `statusDescription` TEXT NULL COMMENT '状态描述',
  `lastUpdateTime` DATETIME NULL COMMENT '最后更新时间',
  `estimatedDeliveryTime` DATETIME NULL COMMENT '预计送达时间',
  `actualDeliveryTime` DATETIME NULL COMMENT '实际送达时间',
  `signedBy` VARCHAR(100) NULL COMMENT '签收人',
  `extraInfo` JSON NULL COMMENT '扩展信息',
  `autoSyncEnabled` BOOLEAN DEFAULT TRUE COMMENT '是否启用自动同步',
  `nextSyncTime` DATETIME NULL COMMENT '下次同步时间',
  `syncFailureCount` INT DEFAULT 0 COMMENT '同步失败次数',
  `lastSyncError` TEXT NULL COMMENT '最后同步错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_order` (`orderId`),
  INDEX `idx_tracking_no` (`trackingNo`),
  INDEX `idx_company_code` (`companyCode`),
  INDEX `idx_status` (`status`),
  INDEX `idx_next_sync_time` (`nextSyncTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流跟踪表';

-- 37. 物流轨迹表
DROP TABLE IF EXISTS `logistics_traces`;
CREATE TABLE `logistics_traces` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '轨迹ID',
  `logisticsTrackingId` INT NOT NULL COMMENT '物流跟踪ID',
  `traceTime` DATETIME NOT NULL COMMENT '轨迹时间',
  `location` VARCHAR(200) NULL COMMENT '轨迹位置',
  `description` TEXT NOT NULL COMMENT '轨迹描述',
  `status` VARCHAR(50) NULL COMMENT '操作状态',
  `operator` VARCHAR(100) NULL COMMENT '操作员',
  `phone` VARCHAR(100) NULL COMMENT '联系电话',
  `rawData` JSON NULL COMMENT '原始数据',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_logistics_tracking` (`logisticsTrackingId`),
  INDEX `idx_trace_time` (`traceTime`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流轨迹表';

-- 38. 订单明细表
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '明细ID',
  `orderId` INT NOT NULL COMMENT '订单ID',
  `productId` INT NOT NULL COMMENT '产品ID',
  `productName` VARCHAR(100) NOT NULL COMMENT '产品名称（快照）',
  `productSku` VARCHAR(50) NOT NULL COMMENT '产品SKU（快照）',
  `unitPrice` DECIMAL(10,2) NOT NULL COMMENT '单价（快照）',
  `quantity` INT NOT NULL COMMENT '数量',
  `subtotal` DECIMAL(10,2) NOT NULL COMMENT '小计金额',
  `discountAmount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',
  `notes` TEXT NULL COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_order` (`orderId`),
  INDEX `idx_product` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细表';

-- 36. 订单状态历史表
DROP TABLE IF EXISTS `order_status_history`;
CREATE TABLE `order_status_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '历史ID',
  `orderId` VARCHAR(50) NOT NULL COMMENT '订单ID（UUID格式）',
  `status` VARCHAR(50) NOT NULL COMMENT '状态',
  `notes` TEXT NULL COMMENT '状态变更备注',
  `operatorId` INT NULL COMMENT '操作人ID',
  `operatorName` VARCHAR(50) NULL COMMENT '操作人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_order` (`orderId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_operator` (`operatorId`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单状态历史表';

-- 39. 拒绝原因表
DROP TABLE IF EXISTS `rejection_reasons`;
CREATE TABLE `rejection_reasons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '原因ID',
  `reason` VARCHAR(100) NOT NULL COMMENT '拒绝原因',
  `description` TEXT NULL COMMENT '描述',
  `isActive` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='拒绝原因表';

-- 40. 业绩指标表
DROP TABLE IF EXISTS `performance_metrics`;
CREATE TABLE `performance_metrics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '指标ID',
  `userId` VARCHAR(100) NOT NULL COMMENT '用户ID',
  `metricType` VARCHAR(50) NOT NULL COMMENT '指标类型',
  `value` DECIMAL(10,2) NOT NULL COMMENT '指标值',
  `date` DATE NOT NULL COMMENT '日期',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user` (`userId`),
  INDEX `idx_type` (`metricType`),
  INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩指标表';

-- 41. 消息表
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '消息ID',
  `senderId` VARCHAR(100) NOT NULL COMMENT '发送者ID',
  `receiverId` VARCHAR(100) NOT NULL COMMENT '接收者ID',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `type` VARCHAR(20) DEFAULT 'text' COMMENT '消息类型',
  `isRead` BOOLEAN DEFAULT FALSE COMMENT '是否已读',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_sender` (`senderId`),
  INDEX `idx_receiver` (`receiverId`),
  INDEX `idx_read` (`isRead`),
  INDEX `idx_created_at` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息表';

-- 42. 消息订阅表
DROP TABLE IF EXISTS `message_subscriptions`;
CREATE TABLE `message_subscriptions` (
  `id` CHAR(36) PRIMARY KEY COMMENT '订阅ID(UUID)',
  `messageType` VARCHAR(50) NOT NULL COMMENT '消息类型',
  `name` VARCHAR(100) NOT NULL COMMENT '消息名称',
  `description` TEXT NULL COMMENT '消息描述',
  `category` VARCHAR(50) NOT NULL COMMENT '消息分类',
  `isGlobalEnabled` BOOLEAN DEFAULT FALSE COMMENT '是否全局启用',
  `globalNotificationMethods` JSON NULL COMMENT '全局通知方式',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_type` (`messageType`),
  INDEX `idx_category` (`category`),
  INDEX `idx_enabled` (`isGlobalEnabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息订阅表';

-- 43. 部门订阅配置表
DROP TABLE IF EXISTS `department_subscription_configs`;
CREATE TABLE `department_subscription_configs` (
  `id` CHAR(36) PRIMARY KEY COMMENT '配置ID(UUID)',
  `messageType` VARCHAR(50) NOT NULL COMMENT '消息类型',
  `departmentId` VARCHAR(50) NOT NULL COMMENT '部门ID',
  `isEnabled` BOOLEAN DEFAULT FALSE COMMENT '是否启用',
  `notificationMethods` JSON NULL COMMENT '通知方式',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_type` (`messageType`),
  INDEX `idx_department` (`departmentId`),
  INDEX `idx_enabled` (`isEnabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门订阅配置表';

-- 44. 系统日志表
DROP TABLE IF EXISTS `logs`;
CREATE TABLE `logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  `level` VARCHAR(50) NOT NULL COMMENT '日志级别',
  `message` TEXT NOT NULL COMMENT '日志消息',
  `meta` TEXT NULL COMMENT '元数据',
  `userId` VARCHAR(100) NULL COMMENT '用户ID',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_level` (`level`),
  INDEX `idx_user` (`userId`),
  INDEX `idx_created_at` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统日志表';

-- 45. 改善目标表
DROP TABLE IF EXISTS `improvement_goals`;
CREATE TABLE `improvement_goals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '目标ID',
  `userId` VARCHAR(100) NOT NULL COMMENT '用户ID',
  `title` VARCHAR(200) NOT NULL COMMENT '目标标题',
  `description` TEXT NOT NULL COMMENT '目标描述',
  `targetDate` DATE NOT NULL COMMENT '目标日期',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user` (`userId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_target_date` (`targetDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='改善目标表';

-- 46. 通话表（已合并到call_records表，此处保留注释说明）
-- 注意：通话功能统一使用 call_records 表（第16项），此表已废弃
-- DROP TABLE IF EXISTS `calls`;

-- =============================================
-- 初始化数据
-- =============================================

-- 插入默认部门
INSERT INTO `departments` (`id`, `name`, `description`, `parent_id`, `level`, `sort_order`, `member_count`) VALUES 
('dept_001', '系统管理部', '系统管理和维护', NULL, 1, 1, 2),
('dept_002', '销售部', '负责产品销售和客户维护', NULL, 1, 2, 2),
('dept_003', '客服部', '负责客户服务和售后支持', NULL, 1, 3, 1);

-- 插入默认角色
INSERT INTO `roles` (`id`, `name`, `code`, `description`, `permissions`, `user_count`, `role_type`, `is_template`) VALUES 
('super_admin', '超级管理员', 'super_admin', '拥有系统所有权限', JSON_ARRAY('*'), 1, 'system', FALSE),
('admin', '管理员', 'admin', '拥有系统所有权限', JSON_ARRAY('*'), 1, 'system', FALSE),
('department_manager', '部门经理', 'department_manager', '管理本部门业务和团队', '["dashboard", "dashboard.personal", "dashboard.personal.view", "dashboard.department", "dashboard.department.view", "customer", "customer.list", "customer.list.view", "customer.list.edit", "customer.list.export", "customer.list.import", "customer.add", "customer.add.create", "order", "order.list", "order.list.view", "order.list.edit", "order.add", "order.add.create", "service", "service.call", "service.call.view", "service.call.make", "performance", "performance.personal", "performance.personal.view", "performance.team", "performance.team.view", "performance.analysis", "performance.analysis.view", "performance.share", "performance.share.view", "logistics", "logistics.list", "logistics.list.view", "logistics.track", "logistics.track.view", "afterSales", "afterSales.list", "afterSales.list.view", "afterSales.add", "afterSales.add.create", "afterSales.data", "afterSales.data.view", "afterSales.data.analysis", "data", "data.search", "data.search.basic", "data.search.advanced"]', 1, 'business', FALSE),
('sales_staff', '销售员', 'sales_staff', '专注于客户开发和订单管理', '["dashboard", "dashboard.personal", "dashboard.personal.view", "customer", "customer.list", "customer.list.view", "customer.add", "customer.add.create", "order", "order.list", "order.list.view", "order.list.edit", "order.add", "order.add.create", "service", "service.call", "service.call.view", "service.call.make", "performance", "performance.personal", "performance.personal.view", "performance.team", "performance.team.view", "logistics", "logistics.list", "logistics.list.view", "logistics.track", "logistics.track.view", "afterSales", "afterSales.list", "afterSales.list.view", "afterSales.add", "afterSales.add.create", "data", "data.search", "data.search.basic"]', 1, 'business', FALSE),
('customer_service', '客服', 'customer_service', '处理订单、物流和售后服务', '["dashboard", "dashboard.personal", "dashboard.personal.view", "order", "order.audit", "order.audit.view", "order.audit.approve", "order.audit.reject", "logistics", "logistics.list", "logistics.list.view", "logistics.shipping", "logistics.shipping.view", "logistics.shipping.create", "logistics.track", "logistics.track.view", "logistics.track.update", "logistics.status", "logistics.status.view", "logistics.status.update", "afterSales", "afterSales.list", "afterSales.list.view", "afterSales.add", "afterSales.add.create", "afterSales.data", "afterSales.data.view", "afterSales.data.analysis", "data", "data.list", "data.list.view", "data.search", "data.search.basic", "data.search.advanced"]', 1, 'business', FALSE);

-- 插入默认用户（不再插入角色模板）

-- 插入超时提醒配置
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES
('order_audit_timeout_hours', '24', 'number', 'timeout_reminder', '订单审核超时时间（小时）', TRUE, TRUE, 1),
('order_shipment_timeout_hours', '48', 'number', 'timeout_reminder', '订单发货超时时间（小时）', TRUE, TRUE, 2),
('after_sales_timeout_hours', '48', 'number', 'timeout_reminder', '售后处理超时时间（小时）', TRUE, TRUE, 3),
('order_followup_days', '3', 'number', 'timeout_reminder', '订单签收后跟进提醒天数', TRUE, TRUE, 4),
('timeout_reminder_enabled', 'true', 'boolean', 'timeout_reminder', '是否启用超时提醒', TRUE, TRUE, 0),
('timeout_check_interval_minutes', '30', 'number', 'timeout_reminder', '超时检测间隔（分钟）', TRUE, TRUE, 5)
ON DUPLICATE KEY UPDATE `updatedAt` = CURRENT_TIMESTAMP;

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

-- 插入系统配置（基本设置）
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('systemName', '云客CRM客户管理系统', 'string', 'basic_settings', '系统名称', TRUE, TRUE, 1),
('systemVersion', '2.9.0', 'string', 'basic_settings', '系统版本', TRUE, TRUE, 2),
('companyName', '广州仙狐网络科技有限公司', 'string', 'basic_settings', '公司名称', TRUE, TRUE, 3),
('contactPhone', '13570727364', 'string', 'basic_settings', '联系电话', TRUE, TRUE, 4),
('contactEmail', 'xianhuquwang@163.com', 'string', 'basic_settings', '联系邮箱', TRUE, TRUE, 5),
('websiteUrl', 'https://xianhuqw.com', 'string', 'basic_settings', '网站地址', TRUE, TRUE, 6),
('companyAddress', '广州市黄埔区南翔一路68号', 'string', 'basic_settings', '公司地址', TRUE, TRUE, 7),
('systemDescription', '智能、专业、高效的客户关系管理系统', 'text', 'basic_settings', '系统描述', TRUE, TRUE, 8),
('systemLogo', '', 'text', 'basic_settings', '系统Logo', TRUE, TRUE, 9),
('contactQRCode', '', 'text', 'basic_settings', '联系二维码', TRUE, TRUE, 10),
('contactQRCodeLabel', '扫码联系', 'string', 'basic_settings', '二维码标签', TRUE, TRUE, 11);

-- 插入系统配置（安全设置）
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('passwordMinLength', '6', 'number', 'security_settings', '密码最小长度', TRUE, TRUE, 1),
('passwordComplexity', '[]', 'json', 'security_settings', '密码复杂度要求', TRUE, TRUE, 2),
('passwordExpireDays', '0', 'number', 'security_settings', '密码有效期(天)', TRUE, TRUE, 3),
('loginFailLock', 'false', 'boolean', 'security_settings', '登录失败锁定', TRUE, TRUE, 4),
('maxLoginFails', '5', 'number', 'security_settings', '最大失败次数', TRUE, TRUE, 5),
('lockDuration', '30', 'number', 'security_settings', '锁定时间(分钟)', TRUE, TRUE, 6),
('sessionTimeout', '120', 'number', 'security_settings', '会话超时时间(分钟)', TRUE, TRUE, 7),
('forceHttps', 'false', 'boolean', 'security_settings', '强制HTTPS', TRUE, TRUE, 8),
('ipWhitelist', '', 'text', 'security_settings', 'IP白名单', TRUE, TRUE, 9);

-- 插入系统配置（通话设置）
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('sipServer', '', 'string', 'call_settings', 'SIP服务器地址', TRUE, TRUE, 1),
('sipPort', '5060', 'number', 'call_settings', 'SIP端口', TRUE, TRUE, 2),
('sipUsername', '', 'string', 'call_settings', 'SIP用户名', TRUE, TRUE, 3),
('sipPassword', '', 'string', 'call_settings', 'SIP密码', TRUE, TRUE, 4),
('sipTransport', 'UDP', 'string', 'call_settings', '传输协议', TRUE, TRUE, 5),
('autoAnswer', 'false', 'boolean', 'call_settings', '自动接听', TRUE, TRUE, 6),
('autoRecord', 'false', 'boolean', 'call_settings', '自动录音', TRUE, TRUE, 7),
('qualityMonitoring', 'false', 'boolean', 'call_settings', '通话质量监控', TRUE, TRUE, 8),
('incomingCallPopup', 'true', 'boolean', 'call_settings', '呼入弹窗', TRUE, TRUE, 9),
('maxCallDuration', '3600', 'number', 'call_settings', '最大通话时长(秒)', TRUE, TRUE, 10),
('recordFormat', 'mp3', 'string', 'call_settings', '录音格式', TRUE, TRUE, 11),
('recordQuality', 'standard', 'string', 'call_settings', '录音质量', TRUE, TRUE, 12),
('recordPath', './recordings', 'string', 'call_settings', '录音保存路径', TRUE, TRUE, 13),
('recordRetentionDays', '90', 'number', 'call_settings', '录音保留时间(天)', TRUE, TRUE, 14),
('outboundPermission', '["admin","manager","sales"]', 'json', 'call_settings', '外呼权限', TRUE, TRUE, 15),
('recordAccessPermission', '["admin","manager"]', 'json', 'call_settings', '录音访问权限', TRUE, TRUE, 16),
('statisticsPermission', '["admin","manager"]', 'json', 'call_settings', '通话统计权限', TRUE, TRUE, 17),
('numberRestriction', 'false', 'boolean', 'call_settings', '号码限制', TRUE, TRUE, 18),
('allowedPrefixes', '', 'text', 'call_settings', '允许的号码前缀', TRUE, TRUE, 19);

-- 插入系统配置（邮件设置）
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('smtpHost', '', 'string', 'email_settings', 'SMTP服务器地址', TRUE, TRUE, 1),
('smtpPort', '587', 'number', 'email_settings', 'SMTP端口', TRUE, TRUE, 2),
('senderEmail', '', 'string', 'email_settings', '发件人邮箱', TRUE, TRUE, 3),
('senderName', '', 'string', 'email_settings', '发件人名称', TRUE, TRUE, 4),
('emailPassword', '', 'string', 'email_settings', '邮箱密码', TRUE, TRUE, 5),
('enableSsl', 'true', 'boolean', 'email_settings', '启用SSL', TRUE, TRUE, 6),
('enableTls', 'false', 'boolean', 'email_settings', '启用TLS', TRUE, TRUE, 7),
('testEmail', '', 'string', 'email_settings', '测试邮箱', TRUE, TRUE, 8);

-- 插入系统配置（短信设置）
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('provider', 'aliyun', 'string', 'sms_settings', '短信服务商', TRUE, TRUE, 1),
('accessKey', '', 'string', 'sms_settings', 'AccessKey', TRUE, TRUE, 2),
('secretKey', '', 'string', 'sms_settings', 'SecretKey', TRUE, TRUE, 3),
('signName', '', 'string', 'sms_settings', '短信签名', TRUE, TRUE, 4),
('dailyLimit', '100', 'number', 'sms_settings', '每日发送限制', TRUE, TRUE, 5),
('monthlyLimit', '3000', 'number', 'sms_settings', '每月发送限制', TRUE, TRUE, 6),
('enabled', 'false', 'boolean', 'sms_settings', '启用短信功能', TRUE, TRUE, 7),
('requireApproval', 'false', 'boolean', 'sms_settings', '需要审核', TRUE, TRUE, 8),
('testPhone', '', 'string', 'sms_settings', '测试手机号', TRUE, TRUE, 9);

-- 插入系统配置（存储设置）
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('storageType', 'local', 'string', 'storage_settings', '存储类型', TRUE, TRUE, 1),
('localPath', './uploads', 'string', 'storage_settings', '本地存储路径', TRUE, TRUE, 2),
('localDomain', '', 'string', 'storage_settings', '访问域名', TRUE, TRUE, 3),
('accessKey', '', 'string', 'storage_settings', 'Access Key', TRUE, TRUE, 4),
('secretKey', '', 'string', 'storage_settings', 'Secret Key', TRUE, TRUE, 5),
('bucketName', '', 'string', 'storage_settings', '存储桶名称', TRUE, TRUE, 6),
('region', 'oss-cn-hangzhou', 'string', 'storage_settings', '存储区域', TRUE, TRUE, 7),
('customDomain', '', 'string', 'storage_settings', '自定义域名', TRUE, TRUE, 8),
('maxFileSize', '10', 'number', 'storage_settings', '最大文件大小(MB)', TRUE, TRUE, 9),
('allowedTypes', 'jpg,png,gif,pdf,doc,docx,xls,xlsx', 'string', 'storage_settings', '允许的文件类型', TRUE, TRUE, 10);

-- 插入系统配置（商品设置）
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('maxDiscountPercent', '50', 'number', 'product_settings', '全局最大优惠比例', TRUE, TRUE, 1),
('adminMaxDiscount', '50', 'number', 'product_settings', '管理员最大优惠', TRUE, TRUE, 2),
('managerMaxDiscount', '30', 'number', 'product_settings', '经理最大优惠', TRUE, TRUE, 3),
('salesMaxDiscount', '15', 'number', 'product_settings', '销售员最大优惠', TRUE, TRUE, 4),
('discountApprovalThreshold', '20', 'number', 'product_settings', '优惠审批阈值', TRUE, TRUE, 5),
('allowPriceModification', 'true', 'boolean', 'product_settings', '允许价格修改', TRUE, TRUE, 6),
('priceModificationRoles', '["admin","manager"]', 'json', 'product_settings', '价格修改权限', TRUE, TRUE, 7),
('enablePriceHistory', 'true', 'boolean', 'product_settings', '价格变动记录', TRUE, TRUE, 8),
('pricePrecision', '2', 'string', 'product_settings', '价格显示精度', TRUE, TRUE, 9),
('enableInventory', 'false', 'boolean', 'product_settings', '启用库存管理', TRUE, TRUE, 10),
('lowStockThreshold', '10', 'number', 'product_settings', '低库存预警阈值', TRUE, TRUE, 11),
('allowNegativeStock', 'false', 'boolean', 'product_settings', '允许负库存销售', TRUE, TRUE, 12),
('defaultCategory', '', 'string', 'product_settings', '默认分类', TRUE, TRUE, 13),
('maxCategoryLevel', '3', 'number', 'product_settings', '分类层级限制', TRUE, TRUE, 14),
('enableCategoryCode', 'false', 'boolean', 'product_settings', '启用分类编码', TRUE, TRUE, 15),
('costPriceViewRoles', '["super_admin","admin"]', 'json', 'product_settings', '成本价格查看权限', TRUE, TRUE, 16),
('salesDataViewRoles', '["super_admin","admin","manager"]', 'json', 'product_settings', '销售数据查看权限', TRUE, TRUE, 17),
('stockInfoViewRoles', '["super_admin","admin","manager"]', 'json', 'product_settings', '库存信息查看权限', TRUE, TRUE, 18),
('operationLogsViewRoles', '["super_admin","admin"]', 'json', 'product_settings', '操作日志查看权限', TRUE, TRUE, 19),
('sensitiveInfoHideMethod', 'asterisk', 'string', 'product_settings', '敏感信息隐藏方式', TRUE, TRUE, 20),
('enablePermissionControl', 'true', 'boolean', 'product_settings', '启用权限控制', TRUE, TRUE, 21);

-- 插入系统配置（订单设置）
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('orderTransferMode', 'delayed', 'string', 'order_settings', '订单流转模式：immediate-立即流转，delayed-延迟流转', TRUE, TRUE, 1),
('orderTransferDelayMinutes', '3', 'number', 'order_settings', '订单流转延迟时间（分钟）', TRUE, TRUE, 2);

-- 插入系统配置（数据备份设置）
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('autoBackupEnabled', 'false', 'boolean', 'backup_settings', '自动备份', TRUE, TRUE, 1),
('backupFrequency', 'daily', 'string', 'backup_settings', '备份频率', TRUE, TRUE, 2),
('retentionDays', '30', 'number', 'backup_settings', '保留天数', TRUE, TRUE, 3),
('compression', 'true', 'boolean', 'backup_settings', '压缩备份', TRUE, TRUE, 4);

-- 插入系统配置（用户协议设置）
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('userAgreementEnabled', 'true', 'boolean', 'agreement_settings', '用户协议启用', TRUE, TRUE, 1),
('userAgreementTitle', '用户服务协议', 'string', 'agreement_settings', '用户协议标题', TRUE, TRUE, 2),
('userAgreementContent', '', 'text', 'agreement_settings', '用户协议内容', TRUE, TRUE, 3),
('privacyAgreementEnabled', 'true', 'boolean', 'agreement_settings', '隐私协议启用', TRUE, TRUE, 4),
('privacyAgreementTitle', '隐私政策', 'string', 'agreement_settings', '隐私协议标题', TRUE, TRUE, 5),
('privacyAgreementContent', '', 'text', 'agreement_settings', '隐私协议内容', TRUE, TRUE, 6);

-- 插入系统配置（通用设置）
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('maxUploadSize', '10485760', 'number', 'general', '最大上传文件大小(字节)', TRUE, TRUE, 1),
('enableEmailNotification', 'true', 'boolean', 'general', '启用邮件通知', TRUE, TRUE, 2),
('enableSmsNotification', 'false', 'boolean', 'general', '启用短信通知', TRUE, TRUE, 3);

-- 插入物流公司初始数据
INSERT INTO `logistics_companies` (`id`, `code`, `name`, `short_name`, `logo`, `website`, `tracking_url`, `contact_phone`, `status`, `sort_order`, `remark`) VALUES
('lc-001', 'SF', '顺丰速运', '顺丰', 'https://www.sf-express.com/favicon.ico', 'https://www.sf-express.com', 'https://www.sf-express.com/cn/sc/dynamic_function/waybill/#search/bill-number/{trackingNo}', '95338', 'active', 1, '顺丰速运官方合作'),
('lc-002', 'ZTO', '中通快递', '中通', NULL, 'https://www.zto.com', 'https://www.zto.com/service/bill-query?billNo={trackingNo}', '95311', 'active', 2, '中通快递官方合作'),
('lc-003', 'YTO', '圆通速递', '圆通', 'https://www.yto.net.cn/favicon.ico', 'https://www.yto.net.cn', 'https://www.yto.net.cn/query/{trackingNo}', '95554', 'active', 3, '圆通速递官方合作'),
('lc-004', 'STO', '申通快递', '申通', 'https://www.sto.cn/favicon.ico', 'https://www.sto.cn', 'https://www.sto.cn/query/{trackingNo}', '95543', 'active', 4, '申通快递官方合作'),
('lc-005', 'YD', '韵达速递', '韵达', NULL, 'https://www.yunda.com', 'https://www.yunda.com/query/{trackingNo}', '95546', 'active', 5, '韵达速递官方合作'),
('lc-006', 'JTSD', '极兔速递', '极兔', NULL, 'https://www.jtexpress.cn', 'https://www.jtexpress.cn/track/{trackingNo}', '95353', 'active', 6, '极兔速递官方合作'),
('lc-007', 'EMS', '邮政EMS', 'EMS', NULL, 'https://www.ems.com.cn', 'https://www.ems.com.cn/queryList?mailNo={trackingNo}', '11183', 'active', 7, '中国邮政EMS'),
('lc-008', 'JD', '京东物流', '京东', NULL, 'https://www.jdl.com', 'https://www.jd.com/orderDetail?orderId={trackingNo}', '950616', 'inactive', 8, '京东物流（需开通合作）'),
('lc-009', 'DB', '德邦快递', '德邦', NULL, 'https://www.deppon.com', 'https://www.deppon.com/tracking/{trackingNo}', '95353', 'inactive', 9, '德邦快递（需开通合作）')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `short_name` = VALUES(`short_name`),
  `website` = VALUES(`website`),
  `tracking_url` = VALUES(`tracking_url`),
  `contact_phone` = VALUES(`contact_phone`),
  `updated_at` = CURRENT_TIMESTAMP;

-- 插入物流API配置初始数据（默认启用状态，但需要用户配置密钥后才能使用）
-- 注意：enabled=1表示启用，但如果app_id或app_secret为空，查询时会提示"API密钥未配置完整"
-- ON DUPLICATE KEY UPDATE 会更新enabled字段，确保已存在的记录也被启用
INSERT INTO `logistics_api_configs` (`id`, `company_code`, `company_name`, `api_environment`, `enabled`) VALUES
('lac-001', 'SF', '顺丰速运', 'production', 1),
('lac-002', 'ZTO', '中通快递', 'production', 1),
('lac-003', 'YTO', '圆通速递', 'production', 1),
('lac-004', 'STO', '申通快递', 'production', 1),
('lac-005', 'YD', '韵达速递', 'production', 1),
('lac-006', 'JTSD', '极兔速递', 'production', 1),
('lac-007', 'EMS', '邮政EMS', 'production', 1),
('lac-008', 'JD', '京东物流', 'production', 1),
('lac-009', 'DBL', '德邦快递', 'production', 1)
ON DUPLICATE KEY UPDATE
  `company_name` = VALUES(`company_name`),
  `enabled` = 1,
  `updated_at` = CURRENT_TIMESTAMP;

-- 30. 部门下单限制配置表
DROP TABLE IF EXISTS `department_order_limits`;
CREATE TABLE `department_order_limits` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '配置ID',
  `department_id` VARCHAR(50) NOT NULL COMMENT '部门ID',
  `department_name` VARCHAR(100) COMMENT '部门名称（冗余字段）',
  
  -- 下单次数限制
  `order_count_enabled` BOOLEAN DEFAULT FALSE COMMENT '是否启用下单次数限制',
  `max_order_count` INT DEFAULT 0 COMMENT '同一客户最大下单次数（0表示无限制）',
  
  -- 单笔金额限制
  `single_amount_enabled` BOOLEAN DEFAULT FALSE COMMENT '是否启用单笔金额限制',
  `max_single_amount` DECIMAL(12,2) DEFAULT 0 COMMENT '单笔订单最大金额（0表示无限制）',
  
  -- 累计金额限制
  `total_amount_enabled` BOOLEAN DEFAULT FALSE COMMENT '是否启用累计金额限制',
  `max_total_amount` DECIMAL(12,2) DEFAULT 0 COMMENT '同一客户累计最大金额（0表示无限制）',
  
  -- 配置状态
  `is_enabled` BOOLEAN DEFAULT TRUE COMMENT '配置是否启用',
  `remark` TEXT COMMENT '备注说明',
  
  -- 审计字段
  `created_by` VARCHAR(50) COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `updated_by` VARCHAR(50) COMMENT '更新人ID',
  `updated_by_name` VARCHAR(50) COMMENT '更新人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引
  UNIQUE INDEX `idx_department_id` (`department_id`),
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门下单限制配置表';

-- 47. 售后服务跟进记录表
DROP TABLE IF EXISTS `service_follow_up_records`;
CREATE TABLE `service_follow_up_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '跟进记录ID',
  `service_id` VARCHAR(50) NOT NULL COMMENT '售后服务ID',
  `service_number` VARCHAR(50) COMMENT '售后单号',
  `follow_up_time` TIMESTAMP NOT NULL COMMENT '跟进时间',
  `content` TEXT NOT NULL COMMENT '跟进内容',
  `created_by` VARCHAR(100) COMMENT '创建人姓名',
  `created_by_id` VARCHAR(50) COMMENT '创建人ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_service_id` (`service_id`),
  INDEX `idx_service_number` (`service_number`),
  INDEX `idx_follow_up_time` (`follow_up_time`),
  INDEX `idx_created_by_id` (`created_by_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后服务跟进记录表';

-- 48. 售后服务操作记录表
DROP TABLE IF EXISTS `service_operation_logs`;
CREATE TABLE `service_operation_logs` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '操作记录ID',
  `service_id` VARCHAR(50) NOT NULL COMMENT '售后服务ID',
  `service_number` VARCHAR(50) COMMENT '售后单号',
  `operation_type` VARCHAR(50) NOT NULL COMMENT '操作类型: create/assign/status_change/priority_change/close/follow_up',
  `operation_content` TEXT COMMENT '操作内容描述',
  `old_value` VARCHAR(255) COMMENT '旧值',
  `new_value` VARCHAR(255) COMMENT '新值',
  `operator_id` VARCHAR(50) COMMENT '操作人ID',
  `operator_name` VARCHAR(100) COMMENT '操作人姓名',
  `remark` TEXT COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_service_id` (`service_id`),
  INDEX `idx_service_number` (`service_number`),
  INDEX `idx_operation_type` (`operation_type`),
  INDEX `idx_operator_id` (`operator_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后服务操作记录表';

-- 25. 系统消息表（用于跨设备消息通知）
DROP TABLE IF EXISTS `system_messages`;
CREATE TABLE `system_messages` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '消息ID',
  `type` VARCHAR(50) NOT NULL COMMENT '消息类型',
  `title` VARCHAR(200) NOT NULL COMMENT '消息标题',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `priority` VARCHAR(20) DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  `category` VARCHAR(50) DEFAULT '系统通知' COMMENT '消息分类',
  `target_user_id` VARCHAR(36) NOT NULL COMMENT '接收者用户ID',
  `created_by` VARCHAR(36) COMMENT '发送者用户ID',
  `related_id` VARCHAR(36) COMMENT '关联的业务ID（订单ID/客户ID等）',
  `related_type` VARCHAR(50) COMMENT '关联类型: order/customer/afterSales等',
  `action_url` VARCHAR(200) COMMENT '点击跳转的URL',
  `is_read` TINYINT(1) DEFAULT 0 COMMENT '是否已读: 0未读 1已读',
  `read_at` TIMESTAMP NULL COMMENT '阅读时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_target_user` (`target_user_id`),
  INDEX `idx_is_read` (`is_read`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统消息表';

-- 26. 系统公告表
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '公告ID',
  `title` VARCHAR(200) NOT NULL COMMENT '公告标题',
  `content` TEXT NOT NULL COMMENT '公告内容',
  `type` VARCHAR(50) DEFAULT 'notice' COMMENT '公告类型: notice/update/maintenance/promotion',
  `priority` VARCHAR(20) DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  `status` VARCHAR(20) DEFAULT 'draft' COMMENT '状态: draft/published/archived',
  `target_roles` JSON COMMENT '目标角色列表，为空表示所有人',
  `target_departments` JSON COMMENT '目标部门列表，为空表示所有部门',
  `start_time` TIMESTAMP NULL COMMENT '生效开始时间',
  `end_time` TIMESTAMP NULL COMMENT '生效结束时间',
  `is_pinned` TINYINT(1) DEFAULT 0 COMMENT '是否置顶',
  `is_popup` TINYINT(1) DEFAULT 0 COMMENT '是否弹窗显示',
  `is_marquee` TINYINT(1) DEFAULT 1 COMMENT '是否横幅滚动',
  `view_count` INT DEFAULT 0 COMMENT '查看次数',
  `created_by` VARCHAR(36) COMMENT '创建者ID',
  `created_by_name` VARCHAR(100) COMMENT '创建者姓名',
  `published_at` TIMESTAMP NULL COMMENT '发布时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_status` (`status`),
  INDEX `idx_type` (`type`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_published_at` (`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统公告表';

-- 27. 公告阅读记录表
DROP TABLE IF EXISTS `announcement_reads`;
CREATE TABLE `announcement_reads` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  `announcement_id` VARCHAR(36) NOT NULL COMMENT '公告ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID，与users表id类型一致',
  `read_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '阅读时间',
  UNIQUE KEY `uk_announcement_user` (`announcement_id`, `user_id`),
  INDEX `idx_announcement_id` (`announcement_id`),
  INDEX `idx_user_id` (`user_id`),
  CONSTRAINT `fk_announcement_reads_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_announcement_reads_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告阅读记录表';

-- 28. 系统消息表
DROP TABLE IF EXISTS `system_messages`;
CREATE TABLE `system_messages` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '消息ID',
  `type` VARCHAR(50) NOT NULL COMMENT '消息类型',
  `title` VARCHAR(200) NOT NULL COMMENT '消息标题',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `priority` VARCHAR(20) DEFAULT 'normal' COMMENT '优先级',
  `category` VARCHAR(50) DEFAULT '系统通知' COMMENT '消息分类',
  `target_user_id` VARCHAR(36) NOT NULL COMMENT '接收者用户ID',
  `created_by` VARCHAR(36) COMMENT '发送者用户ID',
  `related_id` VARCHAR(36) COMMENT '关联的业务ID',
  `related_type` VARCHAR(50) COMMENT '关联类型',
  `action_url` VARCHAR(200) COMMENT '跳转URL',
  `is_read` TINYINT(1) DEFAULT 0 COMMENT '是否已读',
  `read_at` TIMESTAMP NULL COMMENT '阅读时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_type` (`type`),
  INDEX `idx_target_user_id` (`target_user_id`),
  INDEX `idx_is_read` (`is_read`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统消息表';

-- 29. 通知渠道配置表
DROP TABLE IF EXISTS `notification_channels`;
CREATE TABLE `notification_channels` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  `name` VARCHAR(100) NOT NULL COMMENT '配置名称',
  `channel_type` VARCHAR(50) NOT NULL COMMENT '通知渠道类型: dingtalk/wechat_work/wechat_mp/email/sms/system',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `config` JSON NOT NULL COMMENT '渠道配置参数',
  `message_types` JSON COMMENT '支持的消息类型列表',
  `target_type` VARCHAR(20) DEFAULT 'all' COMMENT '通知对象类型: all/departments/users/roles',
  `target_departments` JSON COMMENT '目标部门列表',
  `target_users` JSON COMMENT '目标用户列表',
  `target_roles` JSON COMMENT '目标角色列表',
  `priority_filter` VARCHAR(20) DEFAULT 'all' COMMENT '优先级过滤: all/high/urgent',
  `created_by` VARCHAR(36) COMMENT '创建者ID',
  `created_by_name` VARCHAR(100) COMMENT '创建者姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_channel_type` (`channel_type`),
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知渠道配置表';

-- 30. 通知发送记录表
DROP TABLE IF EXISTS `notification_logs`;
CREATE TABLE `notification_logs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  `channel_id` VARCHAR(36) NOT NULL COMMENT '通知渠道ID',
  `channel_type` VARCHAR(50) NOT NULL COMMENT '通知渠道类型',
  `message_type` VARCHAR(50) NOT NULL COMMENT '消息类型',
  `title` VARCHAR(200) NOT NULL COMMENT '消息标题',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `target_users` JSON COMMENT '目标用户列表',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '发送状态: pending/success/failed',
  `response` TEXT COMMENT '第三方API响应',
  `error_message` TEXT COMMENT '错误信息',
  `sent_at` TIMESTAMP NULL COMMENT '发送时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_channel_id` (`channel_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知发送记录表';

-- 31. 业绩消息配置表
DROP TABLE IF EXISTS `performance_report_configs`;
CREATE TABLE `performance_report_configs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  `name` VARCHAR(100) NOT NULL COMMENT '配置名称',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `send_frequency` VARCHAR(20) NOT NULL DEFAULT 'daily' COMMENT '发送频率: daily/weekly/monthly/custom',
  `send_time` VARCHAR(10) NOT NULL DEFAULT '09:00' COMMENT '发送时间 HH:mm',
  `send_days` JSON COMMENT '发送日期',
  `repeat_type` VARCHAR(20) DEFAULT 'workday' COMMENT '重复类型: everyday/workday/custom',
  `report_types` JSON NOT NULL COMMENT '报表类型列表',
  `message_format` VARCHAR(20) DEFAULT 'text' COMMENT '消息格式: text/image',
  `channel_type` VARCHAR(20) NOT NULL COMMENT '通知渠道: dingtalk/wechat_work',
  `webhook` VARCHAR(500) NOT NULL COMMENT 'Webhook地址',
  `secret` VARCHAR(200) COMMENT '加签密钥(钉钉)',
  `view_scope` VARCHAR(20) DEFAULT 'company' COMMENT '视角: company/department',
  `target_departments` JSON COMMENT '目标部门列表',
  `include_monthly` TINYINT(1) DEFAULT 1 COMMENT '是否包含月累计',
  `include_ranking` TINYINT(1) DEFAULT 1 COMMENT '是否包含排名',
  `ranking_limit` INT DEFAULT 10 COMMENT '排名显示数量',
  `last_sent_at` TIMESTAMP NULL COMMENT '上次发送时间',
  `last_sent_status` VARCHAR(20) COMMENT '上次发送状态',
  `last_sent_message` TEXT COMMENT '上次发送结果信息',
  `created_by` VARCHAR(36) COMMENT '创建者ID',
  `created_by_name` VARCHAR(100) COMMENT '创建者姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_send_frequency` (`send_frequency`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩消息配置表';

-- 32. 业绩消息发送记录表
DROP TABLE IF EXISTS `performance_report_logs`;
CREATE TABLE `performance_report_logs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  `config_id` VARCHAR(36) NOT NULL COMMENT '配置ID',
  `report_date` DATE NOT NULL COMMENT '报表日期',
  `report_data` JSON COMMENT '报表数据快照',
  `channel_type` VARCHAR(20) NOT NULL COMMENT '发送渠道',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '发送状态: pending/success/failed',
  `response` TEXT COMMENT 'API响应',
  `error_message` TEXT COMMENT '错误信息',
  `sent_at` TIMESTAMP NULL COMMENT '发送时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_config_id` (`config_id`),
  INDEX `idx_report_date` (`report_date`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩消息发送记录表';

-- 33. 消息清理历史表
DROP TABLE IF EXISTS `message_cleanup_history`;
CREATE TABLE `message_cleanup_history` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  `cleanup_type` VARCHAR(20) NOT NULL COMMENT '清理类型: auto/manual',
  `deleted_count` INT NOT NULL DEFAULT 0 COMMENT '删除记录数',
  `operator` VARCHAR(100) COMMENT '操作人',
  `operator_id` VARCHAR(36) COMMENT '操作人ID',
  `remark` VARCHAR(500) COMMENT '备注',
  `cleanup_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '清理时间',
  INDEX `idx_cleanup_time` (`cleanup_time`),
  INDEX `idx_cleanup_type` (`cleanup_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息清理历史表';

-- =============================================
-- 外呼系统扩展表 (v1.8.2)
-- =============================================

-- 全局外呼配置表 (管理员配置)
DROP TABLE IF EXISTS `global_call_config`;
CREATE TABLE `global_call_config` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `config_key` VARCHAR(50) NOT NULL UNIQUE COMMENT '配置键',
  `config_value` TEXT COMMENT '配置值',
  `config_type` VARCHAR(20) DEFAULT 'string' COMMENT '配置类型: string/json/number/boolean',
  `description` VARCHAR(255) COMMENT '配置说明',
  `updated_by` VARCHAR(50) COMMENT '最后更新人',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全局外呼配置表';

-- 用户线路分配表 (管理员分配号码给成员)
DROP TABLE IF EXISTS `user_line_assignments`;
CREATE TABLE `user_line_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `line_id` INT NOT NULL COMMENT '线路ID',
  `caller_number` VARCHAR(30) COMMENT '分配的外显号码(可为空则使用线路默认)',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否为该用户默认线路',
  `daily_limit` INT DEFAULT 0 COMMENT '个人每日限额(0=使用线路限额)',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `assigned_by` VARCHAR(50) COMMENT '分配人ID',
  `assigned_at` DATETIME COMMENT '分配时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_line` (`user_id`, `line_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_line_id` (`line_id`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户线路分配表';

-- 设备绑定操作日志表
DROP TABLE IF EXISTS `device_bindlogs`;
CREATE TABLE `device_bindlogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `device_id` VARCHAR(100) COMMENT '设备ID',
  `phone_number` VARCHAR(20) COMMENT '手机号码',
  `device_name` VARCHAR(100) COMMENT '设备名称',
  `device_model` VARCHAR(100) COMMENT '设备型号',
  `os_type` VARCHAR(20) COMMENT '操作系统',
  `os_version` VARCHAR(20) COMMENT '操作系统版本',
  `app_version` VARCHAR(20) COMMENT 'APP版本',
  `action` VARCHAR(20) NOT NULL COMMENT '操作类型：bind/unbind',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `remark` VARCHAR(255) COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_device_id` (`device_id`),
  INDEX `idx_action` (`action`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备绑定操作日志表';

-- 二维码绑定状态表 (用于扫码绑定工作手机)
DROP TABLE IF EXISTS `device_bind_logs`;
CREATE TABLE `device_bind_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `device_id` VARCHAR(100) COMMENT '设备ID',
  `phone_number` VARCHAR(20) COMMENT '手机号',
  `device_name` VARCHAR(100) COMMENT '设备名称',
  `device_model` VARCHAR(100) COMMENT '设备型号',
  `os_type` VARCHAR(20) COMMENT '操作系统类型',
  `os_version` VARCHAR(50) COMMENT '操作系统版本',
  `app_version` VARCHAR(20) COMMENT 'APP版本',
  `action` VARCHAR(20) COMMENT '操作类型: binddevice/unbind',
  `connection_id` VARCHAR(100) COMMENT '连接ID',
  `phone_id` INT COMMENT '绑定成功后的手机ID',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/connected/expired',
  `expires_at` DATETIME COMMENT '过期时间',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `remark` TEXT COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_device_id` (`device_id`),
  INDEX `idx_connection_id` (`connection_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备绑定日志表';

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

SELECT 'service / service123 (客服)' AS account_5;

-- =============================================
-- 数据修复脚本（部署后执行）
-- =============================================

-- 修复图片路径：将 /api/v1/uploads/ 修改为 /uploads/
-- 说明：后端静态文件服务配置的是 /uploads 路径，需要确保数据库中存储的图片路径一致
UPDATE system_configs 
SET configValue = REPLACE(configValue, '/api/v1/uploads/', '/uploads/'),
    updatedAt = NOW()
WHERE configValue LIKE '%/api/v1/uploads/%';

-- 修复用户头像路径
UPDATE users 
SET avatar = REPLACE(avatar, '/api/v1/uploads/', '/uploads/'),
    updated_at = NOW()
WHERE avatar LIKE '%/api/v1/uploads/%';

-- 修复产品图片路径
UPDATE products 
SET images = REPLACE(images, '/api/v1/uploads/', '/uploads/'),
    updated_at = NOW()
WHERE images LIKE '%/api/v1/uploads/%';

-- 修复订单定金截图路径
UPDATE orders 
SET deposit_screenshots = REPLACE(deposit_screenshots, '/api/v1/uploads/', '/uploads/'),
    updated_at = NOW()
WHERE deposit_screenshots LIKE '%/api/v1/uploads/%';

-- 修复售后服务附件路径
UPDATE after_sales_services 
SET attachments = REPLACE(attachments, '/api/v1/uploads/', '/uploads/'),
    updated_at = NOW()
WHERE attachments LIKE '%/api/v1/uploads/%';

-- =============================================
-- Nginx 配置说明（宝塔面板）
-- =============================================
-- 需要在 Nginx 配置中添加以下规则，让静态文件可以正常访问：
-- 
-- location /uploads {
--     alias /www/wwwroot/你的项目目录/backend/uploads;
--     expires 30d;
--     add_header Cache-Control "public, immutable";
--     add_header Access-Control-Allow-Origin *;
-- }
-- 
-- location /api/v1/uploads {
--     alias /www/wwwroot/你的项目目录/backend/uploads;
--     expires 30d;
--     add_header Cache-Control "public, immutable";
--     add_header Access-Control-Allow-Origin *;
-- }
-- =============================================


-- =============================================
-- 支付方式配置表
-- =============================================
DROP TABLE IF EXISTS `payment_method_options`;
CREATE TABLE `payment_method_options` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '支付方式ID',
  `label` VARCHAR(100) NOT NULL COMMENT '显示名称',
  `value` VARCHAR(50) NOT NULL COMMENT '选项值',
  `sort_order` INT DEFAULT 0 COMMENT '排序顺序',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE INDEX `idx_value` (`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付方式配置表';

-- 插入预设支付方式
INSERT INTO `payment_method_options` (`id`, `label`, `value`, `sort_order`, `is_enabled`) VALUES
('pm_wechat', '微信支付', 'wechat', 1, 1),
('pm_alipay', '支付宝支付', 'alipay', 2, 1),
('pm_bank', '银行转账', 'bank_transfer', 3, 1),
('pm_unionpay', '云闪付', 'unionpay', 4, 1),
('pm_cod', '货到付款', 'cod', 5, 1),
('pm_other', '其他', 'other', 6, 1)
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `sort_order` = VALUES(`sort_order`);

-- =============================================
-- 客服权限配置表
-- 版本：1.0
-- 创建时间：2024-12-18
-- 说明：用于存储客服人员的权限配置
-- =============================================
DROP TABLE IF EXISTS `customer_service_permissions`;
CREATE TABLE `customer_service_permissions` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '记录ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `customer_service_type` VARCHAR(30) NOT NULL DEFAULT 'general' COMMENT '客服类型: after_sales售后, audit审核, logistics物流, product商品, general通用',
  `data_scope` VARCHAR(20) NOT NULL DEFAULT 'self' COMMENT '数据范围: all全部, department部门, self个人, custom自定义',
  `department_ids` JSON NULL COMMENT '可访问的部门ID列表（data_scope为department或custom时使用）',
  `custom_permissions` JSON NULL COMMENT '自定义权限列表',
  `permission_template` VARCHAR(50) NULL COMMENT '使用的权限模板ID',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `remark` TEXT NULL COMMENT '备注',
  `created_by` VARCHAR(50) NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) NULL COMMENT '创建人姓名',
  `updated_by` VARCHAR(50) NULL COMMENT '更新人ID',
  `updated_by_name` VARCHAR(50) NULL COMMENT '更新人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE INDEX `idx_user_id` (`user_id`),
  INDEX `idx_service_type` (`customer_service_type`),
  INDEX `idx_data_scope` (`data_scope`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客服权限配置表';

-- =============================================
-- 敏感信息权限配置表
-- =============================================
DROP TABLE IF EXISTS `sensitive_info_permissions`;
CREATE TABLE `sensitive_info_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
  `info_type` VARCHAR(50) NOT NULL COMMENT '敏感信息类型: phone, id_card, email, wechat, address, bank, financial',
  `role_code` VARCHAR(50) NOT NULL COMMENT '角色代码: super_admin, admin, department_manager, sales_staff, customer_service',
  `has_permission` TINYINT(1) DEFAULT 0 COMMENT '是否有权限: 0无权限, 1有权限',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE INDEX `idx_info_role` (`info_type`, `role_code`),
  INDEX `idx_info_type` (`info_type`),
  INDEX `idx_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感信息权限配置表';

-- 插入敏感信息权限默认配置（超级管理员和管理员有全部权限）
INSERT INTO `sensitive_info_permissions` (`info_type`, `role_code`, `has_permission`) VALUES
('phone', 'super_admin', 1), ('phone', 'admin', 1), ('phone', 'department_manager', 0), ('phone', 'sales_staff', 0), ('phone', 'customer_service', 0),
('id_card', 'super_admin', 1), ('id_card', 'admin', 1), ('id_card', 'department_manager', 0), ('id_card', 'sales_staff', 0), ('id_card', 'customer_service', 0),
('email', 'super_admin', 1), ('email', 'admin', 1), ('email', 'department_manager', 0), ('email', 'sales_staff', 0), ('email', 'customer_service', 0),
('wechat', 'super_admin', 1), ('wechat', 'admin', 1), ('wechat', 'department_manager', 0), ('wechat', 'sales_staff', 0), ('wechat', 'customer_service', 0),
('address', 'super_admin', 1), ('address', 'admin', 1), ('address', 'department_manager', 0), ('address', 'sales_staff', 0), ('address', 'customer_service', 0),
('bank', 'super_admin', 1), ('bank', 'admin', 1), ('bank', 'department_manager', 0), ('bank', 'sales_staff', 0), ('bank', 'customer_service', 0),
('financial', 'super_admin', 1), ('financial', 'admin', 1), ('financial', 'department_manager', 0), ('financial', 'sales_staff', 0), ('financial', 'customer_service', 0)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- =============================================
-- 通话记录测试数据
-- =============================================
INSERT INTO `call_records` (`id`, `customer_id`, `customer_name`, `customer_phone`, `call_type`, `call_status`, `start_time`, `end_time`, `duration`, `has_recording`, `notes`, `follow_up_required`, `user_id`, `user_name`, `department`) VALUES
('call_1734567890_001', 'cust_001', '王磊', '18231431086', 'outbound', 'connected', DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 55 MINUTE), 300, 1, '客户咨询产品价格', 0, 'admin', '管理员', '销售部'),
('call_1734567890_002', 'cust_002', '王小雨', '15287985214', 'outbound', 'connected', DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR 50 MINUTE), 600, 1, '售后问题处理', 1, 'admin', '管理员', '客服部'),
('call_1734567890_003', 'cust_003', '单芳波', '13736053045', 'inbound', 'missed', DATE_SUB(NOW(), INTERVAL 3 HOUR), NULL, 0, 0, '未接听', 1, 'admin', '管理员', '销售部'),
('call_1734567890_004', 'cust_004', '贾将富', '13407722936', 'outbound', 'connected', DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR 45 MINUTE), 900, 1, '新客户开发', 0, 'admin', '管理员', '销售部')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 跟进记录测试数据
INSERT INTO `follow_up_records` (`id`, `call_id`, `customer_id`, `customer_name`, `follow_up_type`, `content`, `next_follow_up_date`, `priority`, `status`, `user_id`, `user_name`) VALUES
('followup_001', 'call_1734567890_002', 'cust_002', '王小雨', 'call', '客户反馈产品使用问题，需要技术支持跟进', DATE_ADD(NOW(), INTERVAL 1 DAY), 'high', 'pending', 'admin', '管理员'),
('followup_002', 'call_1734567890_003', 'cust_003', '单芳波', 'call', '未接听，需要回拨', DATE_ADD(NOW(), INTERVAL 2 HOUR), 'urgent', 'pending', 'admin', '管理员')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 外呼线路默认数据
INSERT INTO `call_lines` (`id`, `name`, `provider`, `caller_number`, `status`, `max_concurrent`, `daily_limit`, `sort_order`, `remark`) VALUES
('line_default_001', '默认线路', 'system', '', 'active', 10, 1000, 1, '系统默认外呼线路'),
('line_aliyun_001', '阿里云通信', 'aliyun', '', 'inactive', 20, 2000, 2, '阿里云语音通话服务'),
('line_tencent_001', '腾讯云通信', 'tencent', '', 'inactive', 20, 2000, 3, '腾讯云语音通话服务')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;


-- =============================================
-- API接口管理相关表
-- 版本：1.0
-- 创建时间：2025-12-25
-- 说明：用于管理APP对接接口、设备绑定等
-- =============================================

-- API接口配置表
DROP TABLE IF EXISTS `api_interfaces`;
CREATE TABLE `api_interfaces` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '接口ID',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT '接口编码',
  `name` VARCHAR(100) NOT NULL COMMENT '接口名称',
  `description` TEXT COMMENT '接口描述',
  `category` VARCHAR(50) DEFAULT 'mobile' COMMENT '接口分类：mobile-移动端,third_party-第三方,webhook-回调',
  `endpoint` VARCHAR(255) NOT NULL COMMENT '接口地址',
  `method` VARCHAR(10) DEFAULT 'POST' COMMENT '请求方法',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `auth_required` TINYINT(1) DEFAULT 1 COMMENT '是否需要认证',
  `rate_limit` INT DEFAULT 100 COMMENT '频率限制(次/分钟)',
  `last_called_at` DATETIME COMMENT '最后调用时间',
  `call_count` BIGINT DEFAULT 0 COMMENT '调用次数',
  `success_count` BIGINT DEFAULT 0 COMMENT '成功次数',
  `fail_count` BIGINT DEFAULT 0 COMMENT '失败次数',
  `avg_response_time` INT DEFAULT 0 COMMENT '平均响应时间(ms)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_api_interfaces_code` (`code`),
  INDEX `idx_api_interfaces_category` (`category`),
  INDEX `idx_api_interfaces_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API接口配置表';

-- 设备绑定日志表
DROP TABLE IF EXISTS `device_bindlogs`;
CREATE TABLE `device_bindlogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `user_name` VARCHAR(100) COMMENT '用户姓名',
  `device_id` VARCHAR(100) COMMENT '设备ID',
  `phone_number` VARCHAR(20) COMMENT '手机号码',
  `device_name` VARCHAR(100) COMMENT '设备名称',
  `device_model` VARCHAR(100) COMMENT '设备型号',
  `os_type` ENUM('android', 'ios') COMMENT '操作系统',
  `os_version` VARCHAR(20) COMMENT '系统版本',
  `app_version` VARCHAR(20) COMMENT 'APP版本',
  `action` ENUM('bind', 'unbind', 'online', 'offline') NOT NULL COMMENT '操作类型',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `remark` VARCHAR(255) COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_device_bindlogs_user_id` (`user_id`),
  INDEX `idx_device_bindlogs_device_id` (`device_id`),
  INDEX `idx_device_bindlogs_action` (`action`),
  INDEX `idx_device_bindlogs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备绑定日志表';

-- API调用日志表
DROP TABLE IF EXISTS `api_call_logs`;
CREATE TABLE `api_call_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  `interface_code` VARCHAR(50) NOT NULL COMMENT '接口编码',
  `method` VARCHAR(10) COMMENT '请求方法',
  `endpoint` VARCHAR(255) COMMENT '请求地址',
  `request_params` TEXT COMMENT '请求参数(脱敏)',
  `response_code` INT COMMENT '响应状态码',
  `response_time` INT COMMENT '响应时间(ms)',
  `success` TINYINT(1) DEFAULT 1 COMMENT '是否成功',
  `error_message` VARCHAR(500) COMMENT '错误信息',
  `client_ip` VARCHAR(50) COMMENT '客户端IP',
  `user_agent` VARCHAR(255) COMMENT '用户代理',
  `user_id` VARCHAR(50) COMMENT '调用用户ID',
  `device_id` VARCHAR(100) COMMENT '设备ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_api_call_logs_interface_code` (`interface_code`),
  INDEX `idx_api_call_logs_created_at` (`created_at`),
  INDEX `idx_api_call_logs_user_id` (`user_id`),
  INDEX `idx_api_call_logs_success` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API调用日志表';

-- 初始化API接口数据
INSERT INTO `api_interfaces` (`code`, `name`, `description`, `category`, `endpoint`, `method`, `is_enabled`, `auth_required`) VALUES
('mobile_login', 'APP登录', 'APP用户登录认证接口', 'mobile', '/api/v1/mobile/login', 'POST', 1, 0),
('mobile_bindqrcode', '生成绑定二维码', 'PC端生成设备绑定二维码', 'mobile', '/api/v1/mobile/bindQRCode', 'POST', 1, 1),
('mobile_binddevice', '扫码绑定设备', 'APP扫码绑定设备', 'mobile', '/api/v1/mobile/bind', 'POST', 1, 0),
('mobile_unbind', '解绑设备', '解除设备绑定', 'mobile', '/api/v1/mobile/unbind', 'DELETE', 1, 1),
('mobile_device_status', '获取设备状态', '获取绑定设备的在线状态', 'mobile', '/api/v1/mobile/device/status', 'GET', 1, 1),
('mobile_call_status', '上报通话状态', 'APP上报通话状态变更', 'mobile', '/api/v1/mobile/call/status', 'POST', 1, 1),
('mobile_call_end', '上报通话结束', 'APP上报通话结束信息', 'mobile', '/api/v1/mobile/call/end', 'POST', 1, 1),
('mobile_recording_upload', '上传录音文件', 'APP上传通话录音', 'mobile', '/api/v1/mobile/recording/upload', 'POST', 1, 1),
('mobile_websocket', 'WebSocket连接', 'APP实时通信WebSocket', 'mobile', '/ws/mobile', 'WS', 1, 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `description`=VALUES(`description`);


-- =============================================
-- 外呼系统相关表 (2025-12-25 新增)
-- =============================================

-- 全局外呼配置表 (管理员配置)
DROP TABLE IF EXISTS `global_call_config`;
CREATE TABLE `global_call_config` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `config_key` VARCHAR(50) NOT NULL UNIQUE COMMENT '配置键',
  `config_value` TEXT COMMENT '配置值',
  `config_type` VARCHAR(20) DEFAULT 'string' COMMENT '配置类型: string/json/number/boolean',
  `description` VARCHAR(255) COMMENT '配置说明',
  `updated_by` VARCHAR(50) COMMENT '最后更新人',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全局外呼配置表';

-- 用户线路分配表 (管理员分配号码给成员)
DROP TABLE IF EXISTS `user_line_assignments`;
CREATE TABLE `user_line_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `line_id` INT NOT NULL COMMENT '线路ID',
  `caller_number` VARCHAR(30) COMMENT '分配的外显号码(可为空则使用线路默认)',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否为该用户默认线路',
  `daily_limit` INT DEFAULT 0 COMMENT '个人每日限额(0=使用线路限额)',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `assigned_by` VARCHAR(50) COMMENT '分配人ID',
  `assigned_at` DATETIME COMMENT '分配时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_line` (`user_id`, `line_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_line_id` (`line_id`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户线路分配表';

-- 插入默认全局外呼配置
INSERT INTO `global_call_config` (`config_key`, `config_value`, `config_type`, `description`) VALUES
('default_call_method', 'system', 'string', '默认外呼方式: system/voip'),
('voip_provider', 'aliyun', 'string', 'VoIP服务商: aliyun/tencent/huawei'),
('aliyun_config', '{}', 'json', '阿里云通信配置'),
('tencent_config', '{}', 'json', '腾讯云通信配置'),
('huawei_config', '{}', 'json', '华为云通信配置'),
('call_timeout', '60', 'number', '呼叫超时时间(秒)'),
('max_retries', '3', 'number', '最大重试次数'),
('enable_recording', 'true', 'boolean', '是否启用录音'),
('recording_storage', 'local', 'string', '录音存储方式: local/oss'),
('blacklist_check', 'true', 'boolean', '是否检查黑名单')
ON DUPLICATE KEY UPDATE `updated_at` = NOW();

SET FOREIGN_KEY_CHECKS = 1;


-- =====================================================
-- 财务管理模块表
-- =====================================================

-- 绩效配置表（存储预设选项）
DROP TABLE IF EXISTS `performance_config`;
CREATE TABLE `performance_config` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `config_type` VARCHAR(20) NOT NULL COMMENT '配置类型: status-有效状态, coefficient-系数, remark-备注',
  `config_value` VARCHAR(50) NOT NULL COMMENT '配置值',
  `config_label` VARCHAR(50) DEFAULT NULL COMMENT '显示标签',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_config_type` (`config_type`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='绩效配置表';

-- 计提阶梯配置表
DROP TABLE IF EXISTS `commission_ladder`;
CREATE TABLE `commission_ladder` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `commission_type` ENUM('amount', 'count') NOT NULL DEFAULT 'amount' COMMENT '计提方式: amount-按业绩金额, count-按签收单数',
  `department_id` VARCHAR(36) DEFAULT NULL COMMENT '适用部门ID，为空表示全局',
  `department_name` VARCHAR(100) DEFAULT NULL COMMENT '适用部门名称',
  `min_value` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '阶梯起点',
  `max_value` DECIMAL(12,2) DEFAULT NULL COMMENT '阶梯终点（NULL表示无上限）',
  `commission_rate` DECIMAL(5,4) DEFAULT NULL COMMENT '提成比例（按业绩时用，如0.03表示3%）',
  `commission_per_unit` DECIMAL(10,2) DEFAULT NULL COMMENT '单价（按单数时用，如30表示30元/单）',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_commission_type` (`commission_type`),
  INDEX `idx_department_id` (`department_id`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='计提阶梯配置表';

-- 计提设置表（存储当前计提模式等全局配置）
DROP TABLE IF EXISTS `commission_setting`;
CREATE TABLE `commission_setting` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `setting_key` VARCHAR(50) NOT NULL UNIQUE COMMENT '配置键',
  `setting_value` VARCHAR(200) NOT NULL COMMENT '配置值',
  `setting_desc` VARCHAR(200) DEFAULT NULL COMMENT '配置说明',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='计提设置表';

-- 插入默认绩效配置数据
INSERT INTO `performance_config` (`config_type`, `config_value`, `config_label`, `sort_order`) VALUES
('status', 'pending', '待处理', 1),
('status', 'valid', '有效', 2),
('status', 'invalid', '无效', 3),
('coefficient', '1.00', '1.0', 1),
('coefficient', '0.80', '0.8', 2),
('coefficient', '0.50', '0.5', 3),
('coefficient', '0.00', '0', 4),
('remark', '正常订单', '正常订单', 1),
('remark', '退换货', '退换货', 2),
('remark', '部分退款', '部分退款', 3),
('remark', '客户取消', '客户取消', 4)
ON DUPLICATE KEY UPDATE `config_label` = VALUES(`config_label`);

-- 插入默认计提设置
INSERT INTO `commission_setting` (`setting_key`, `setting_value`, `setting_desc`) VALUES
('commission_type', 'amount', '计提方式: amount-按业绩金额, count-按签收单数')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 插入默认计提阶梯（按业绩金额）
INSERT INTO `commission_ladder` (`commission_type`, `min_value`, `max_value`, `commission_rate`, `sort_order`) VALUES
('amount', 0, 50000, 0.0300, 1),
('amount', 50000, 100000, 0.0400, 2),
('amount', 100000, 200000, 0.0500, 3),
('amount', 200000, NULL, 0.0600, 4)
ON DUPLICATE KEY UPDATE `commission_rate` = VALUES(`commission_rate`);

-- 插入默认计提阶梯（按签收单数）
INSERT INTO `commission_ladder` (`commission_type`, `min_value`, `max_value`, `commission_per_unit`, `sort_order`) VALUES
('count', 0, 50, 30.00, 1),
('count', 50, 100, 40.00, 2),
('count', 100, NULL, 50.00, 3)
ON DUPLICATE KEY UPDATE `commission_per_unit` = VALUES(`commission_per_unit`);
