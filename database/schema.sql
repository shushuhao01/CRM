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
  INDEX `idx_entry_date` (`entry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 4. 客户表
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '客户ID',
  `customer_code` VARCHAR(50) UNIQUE COMMENT '客户编号',
  `name` VARCHAR(100) NOT NULL COMMENT '客户姓名',
  `phone` VARCHAR(20) COMMENT '手机号',
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
  `is_todo` TINYINT(1) DEFAULT 0 COMMENT '是否待办',
  `todo_date` DATE DEFAULT NULL COMMENT '待办日期',
  `todo_remark` TEXT DEFAULT NULL COMMENT '待办备注',
  `custom_fields` JSON COMMENT '自定义字段',
  `remark` TEXT COMMENT '订单备注',
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

-- 16. 通话记录表
DROP TABLE IF EXISTS `call_records`;
CREATE TABLE `call_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '通话ID',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) COMMENT '客户电话',
  `call_type` ENUM('outbound', 'inbound') NOT NULL COMMENT '通话类型',
  `call_status` ENUM('connected', 'missed', 'busy', 'failed', 'rejected') NOT NULL COMMENT '通话状态',
  `start_time` TIMESTAMP NOT NULL COMMENT '开始时间',
  `end_time` TIMESTAMP NULL COMMENT '结束时间',
  `duration` INT DEFAULT 0 COMMENT '通话时长(秒)',
  `recording_url` VARCHAR(500) COMMENT '录音文件URL',
  `notes` TEXT COMMENT '通话备注',
  `follow_up_required` BOOLEAN DEFAULT FALSE COMMENT '是否需要跟进',
  `user_id` VARCHAR(50) NOT NULL COMMENT '操作员ID',
  `user_name` VARCHAR(50) COMMENT '操作员姓名',
  `department` VARCHAR(100) COMMENT '所属部门',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_call_type` (`call_type`),
  INDEX `idx_call_status` (`call_status`),
  INDEX `idx_start_time` (`start_time`),
  INDEX `idx_follow_up` (`follow_up_required`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通话记录表';

-- 17. 跟进记录表
DROP TABLE IF EXISTS `follow_up_records`;
CREATE TABLE `follow_up_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '跟进ID',
  `call_id` VARCHAR(50) COMMENT '关联通话ID',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) COMMENT '客户姓名',
  `follow_up_type` ENUM('call', 'visit', 'email', 'message') NOT NULL COMMENT '跟进方式',
  `content` TEXT NOT NULL COMMENT '跟进内容',
  `next_follow_up_date` TIMESTAMP NULL COMMENT '下次跟进时间',
  `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '优先级',
  `status` ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '状态',
  `user_id` VARCHAR(50) NOT NULL COMMENT '跟进人ID',
  `user_name` VARCHAR(50) COMMENT '跟进人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_call` (`call_id`),
  INDEX `idx_customer` (`customer_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_next_follow_up` (`next_follow_up_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跟进记录表';

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
  `orderId` INT NOT NULL COMMENT '订单ID',
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

-- 46. 通话表（与call_records不同，这是实体对应的表）
DROP TABLE IF EXISTS `calls`;
CREATE TABLE `calls` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '通话ID',
  `customerId` VARCHAR(100) NOT NULL COMMENT '客户ID',
  `userId` VARCHAR(100) NOT NULL COMMENT '用户ID',
  `phoneNumber` VARCHAR(20) NOT NULL COMMENT '电话号码',
  `duration` INT DEFAULT 0 COMMENT '通话时长(秒)',
  `status` VARCHAR(20) DEFAULT 'completed' COMMENT '状态',
  `notes` TEXT NULL COMMENT '备注',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_customer` (`customerId`),
  INDEX `idx_user` (`userId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通话表';

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

-- 插入系统配置（基本设置）
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES 
('systemName', 'CRM客户管理系统', 'string', 'basic_settings', '系统名称', TRUE, TRUE, 1),
('systemVersion', '1.0.0', 'string', 'basic_settings', '系统版本', TRUE, TRUE, 2),
('companyName', '', 'string', 'basic_settings', '公司名称', TRUE, TRUE, 3),
('contactPhone', '', 'string', 'basic_settings', '联系电话', TRUE, TRUE, 4),
('contactEmail', '', 'string', 'basic_settings', '联系邮箱', TRUE, TRUE, 5),
('websiteUrl', '', 'string', 'basic_settings', '网站地址', TRUE, TRUE, 6),
('companyAddress', '', 'string', 'basic_settings', '公司地址', TRUE, TRUE, 7),
('systemDescription', '', 'text', 'basic_settings', '系统描述', TRUE, TRUE, 8),
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
