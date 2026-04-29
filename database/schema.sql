-- =============================================
-- CRM系统数据库初始化脚本（最新版）
-- 版本：4.1.0
-- 更新时间：2026-04-22
-- 适用于：MySQL 8.0+ / 宝塔面板 7.x+
--
-- 更新内容：
-- 1. 添加完整的售后服务表(after_sales_services)
-- 2. 用户表添加在职状态、备注等字段
-- 3. 整合所有分散的SQL脚本
-- 4. 新增模块管理表(modules, module_configs, module_status)
-- 5. 新增API配置表(api_configs)
-- 6. 新增通知模板表(notification_templates)
-- 7. 新增微信公众号相关表(wechat_followers等)
-- 8. licenses表新增package_id/package_name列
-- 9. tenant_packages/tenants表新增modules列
-- 10. 新增模块默认数据(10个CRM模块+11个模块状态)
-- 11. 修复物流公司/API配置表唯一约束为租户级复合索引
-- 12. 修复德邦快递代码 DB -> DBL，补全物流API配置默认数据
-- 13. 新增客户跟进记录表(customer_follow_ups)，管理后台客户管理模块专用
-- 14. 新增管理后台角色表(admin_roles)，RBAC权限控制
-- 15. admin_users表新增role_id字段，关联角色权限
-- 16. 新增扩容管理表(capacity_price_configs, capacity_orders)
-- 17. tenants表新增extra_users/extra_storage_gb扩容字段
-- 18. 新增面单打印记录表(print_label_logs)，记录每次打印面单操作
-- 19. 新增寄件人/退货地址表(sender_addresses)，支持多寄件人、退货地址管理
-- 20. logistics_api_configs表新增support_create_order字段，标记物流公司是否支持下单生成运单号
-- 21. [v1.8.0] sms_templates: status从ENUM改为VARCHAR(20)，新增8个审核/预设字段
-- 22. [v1.8.0] sms_records: 新增sender_phone字段
-- 23. [v1.8.0] 新增sms_quota_packages(短信额度套餐)、sms_quota_orders(短信额度购买订单)表
-- 24. [v1.8.1] 新增sms_auto_send_rules(短信自动发送规则)表
-- 25. [v1.8.1] sms_records: 新增sender_user_id/sender_department_id/trigger_source/auto_rule_id字段（角色权限+自动发送支持）
-- 26. [v2.0.0] 企微V2.0: wecom_configs扩展+11字段(双模式授权), wecom_customers扩展+7字段, wecom_chat_records扩展+3字段
-- 27. [v2.0.0] customers表新增wecom_external_userid(USID)字段+唯一索引
-- 28. [v2.0.0] 新增wecom_customer_groups(客户群)、wecom_sensitive_words(敏感词)、wecom_sensitive_hits(敏感词命中)
-- 29. [v2.0.0] 新增wecom_quality_rules(质检规则)、wecom_quality_inspections(质检记录)
-- 30. [v2.0.0] 新增wecom_archive_members(存档生效成员)、wecom_vas_orders(增值服务订单)、wecom_vas_configs(增值服务配置)
-- 31. [v2.0.0] 新增wecom_kf_sessions(客服会话)、wecom_quick_replies(快捷回复)
-- 32. [v4.0.0] 企微V4.0: wecom_configs新增auth_mode/auth_corp_name/auth_admin_user_id/auth_time字段
-- 33. [v4.0.0] wecom_acquisition_links新增state/welcome_config/auto_tags/auto_group_config字段
-- 34. [v4.0.0] 新增wecom_auto_match_suggestions(自动匹配建议)、wecom_group_templates(群模板)
-- 35. [v4.0.0] 新增wecom_acquisition_smart_rules(获客智能规则)、wecom_contact_ways(活码)、wecom_contact_way_daily_stats(活码统计)
-- 36. [v4.0.0] 新增wecom_customer_events(客户事件)、wecom_department_mappings(部门映射)
-- 37. [v4.0.0] 新增wecom_ai_models(AI模型)、wecom_ai_agents(智能体)、wecom_ai_logs(AI日志)
-- 38. [v4.0.0] 新增wecom_ai_inspect_strategies(AI质检策略)、wecom_ai_inspect_results(AI质检结果)
-- 39. [v4.0.0] 新增wecom_knowledge_bases(知识库)、wecom_knowledge_entries(知识条目)
-- 40. [v4.0.0] 新增wecom_script_categories(话术分类)、wecom_scripts(话术)、wecom_sidebar_auth_codes(侧边栏授权码)
-- 41. [v4.1.0] 新增wecom_anti_spam_rules(防骚扰规则)、wecom_group_broadcasts(群发消息)、wecom_group_welcomes(入群欢迎语)
-- 42. [v4.1.0] 新增wecom_payment_qrcodes(收款码)、wecom_payment_refunds(退款记录)
-- 43. [v4.1.0] 新增wecom_suite_configs(服务商应用配置)、wecom_suite_callback_logs(服务商回调日志)
-- 44. [v4.1.0] system_license表新增user_limit_mode(用户限制模式)、max_online_seats(最大在线席位数)字段
-- 45. [v4.1.0] 新增mobile_app_packages(移动应用安装包管理)表
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
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_status` (`status`),
  INDEX `idx_departments_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';

-- 2. 角色表
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '角色ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_status` (`status`),
  INDEX `idx_roles_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 3. 用户表
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '用户ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID（SaaS模式，私有部署为NULL）',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
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
  `must_change_password` BOOLEAN DEFAULT FALSE COMMENT '是否必须修改密码(旧字段,保留兼容)',
  `password_last_changed` DATETIME NULL COMMENT '密码最后修改时间',
  `need_change_password` TINYINT(1) DEFAULT 1 COMMENT '是否需要修改密码: 0=否, 1=是(新用户默认需要)',
  `remark` TEXT NULL COMMENT '备注',
  `settings` JSON COMMENT '用户设置',
  `authorized_ips` JSON COMMENT '授权登录IP列表（JSON数组，空表示无限制）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_username` (`username`),
  INDEX `idx_users_tenant_id` (`tenant_id`),
  UNIQUE INDEX `uk_tenant_username` (`tenant_id`, `username`),
  INDEX `idx_email` (`email`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_employee_number` (`employee_number`),
  INDEX `idx_role` (`role`),
  INDEX `idx_role_id` (`role_id`),
  INDEX `idx_department` (`department_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_entry_date` (`entry_date`),
  INDEX `idx_authorized_ips` ((JSON_LENGTH(`authorized_ips`))),
  INDEX `idx_users_tenant_dept` (`tenant_id`, `department_id`),
  INDEX `idx_users_tenant_status` (`tenant_id`, `status`),
  INDEX `idx_users_tenant_role` (`tenant_id`, `role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 4. 客户表
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '客户ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID（SaaS模式，私有部署为NULL）',
  `customer_code` VARCHAR(50) COMMENT '客户编号',
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
  `custom_fields` JSON DEFAULT NULL COMMENT '自定义字段数据',
  `order_count` INT DEFAULT 0 COMMENT '订单数量',
  `return_count` INT DEFAULT 0 COMMENT '退货次数',
  `total_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '总消费金额',
  `fan_acquisition_time` DATETIME NULL COMMENT '进粉时间',
  `last_order_time` TIMESTAMP NULL COMMENT '最后下单时间',
  `last_contact_time` TIMESTAMP NULL COMMENT '最后联系时间',
  `next_follow_time` TIMESTAMP NULL COMMENT '下次跟进时间',
  `sales_person_id` VARCHAR(50) COMMENT '销售员ID',
  `sales_person_name` VARCHAR(50) COMMENT '销售员姓名',
  `wecom_external_userid` VARCHAR(100) NULL COMMENT '客户唯一企微编码(USID)',
  `star_rating` INT DEFAULT 0 NULL COMMENT '手动星级评分(1-5)',
  `final_score` INT DEFAULT 0 NULL COMMENT '综合评分(0-100)',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_customers_tenant_id` (`tenant_id`),
  UNIQUE INDEX `uk_tenant_customer_code` (`tenant_id`, `customer_code`),
  INDEX `idx_customers_tenant_status` (`tenant_id`, `status`),
  INDEX `idx_customers_tenant_sales` (`tenant_id`, `sales_person_id`),
  INDEX `idx_customers_tenant_created_by` (`tenant_id`, `created_by`),
  INDEX `idx_customers_tenant_created_at` (`tenant_id`, `created_at`),
  INDEX `idx_customers_tenant_phone` (`tenant_id`, `phone`),
  INDEX `idx_customers_tenant_name` (`tenant_id`, `name`),
  UNIQUE INDEX `uk_tenant_wecom_userid` (`tenant_id`, `wecom_external_userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户表';

-- 5. 客户标签表
DROP TABLE IF EXISTS `customer_tags`;
CREATE TABLE `customer_tags` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '标签ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(50) NOT NULL COMMENT '标签名称',
  `color` VARCHAR(20) COMMENT '标签颜色',
  `description` TEXT COMMENT '标签描述',
  `customer_count` INT DEFAULT 0 COMMENT '客户数量',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_name` (`name`),
  INDEX `idx_customer_tags_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户标签表';

-- 6. 客户分组表
DROP TABLE IF EXISTS `customer_groups`;
CREATE TABLE `customer_groups` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '分组ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(50) NOT NULL COMMENT '分组名称',
  `description` TEXT COMMENT '分组描述',
  `customer_count` INT DEFAULT 0 COMMENT '客户数量',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_name` (`name`),
  INDEX `idx_customer_groups_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户分组表';

-- 6.1 客户分享表
DROP TABLE IF EXISTS `customer_shares`;
CREATE TABLE `customer_shares` (
  `id` CHAR(36) PRIMARY KEY COMMENT '分享ID(UUID)',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_customer_shares_tenant_id` (`tenant_id`),
  INDEX `idx_customer_shares_tenant_customer` (`tenant_id`, `customer_id`),
  INDEX `idx_customer_shares_tenant_shared_to` (`tenant_id`, `shared_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户分享表';

-- 6.2 客户分配历史表
DROP TABLE IF EXISTS `customer_assignments`;
CREATE TABLE `customer_assignments` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '分配ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_customer_assignments_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户分配历史表';

-- 7. 产品分类表
DROP TABLE IF EXISTS `product_categories`;
CREATE TABLE `product_categories` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '分类ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '分类名称',
  `parent_id` VARCHAR(50) NULL COMMENT '上级分类ID',
  `description` TEXT COMMENT '分类描述',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_parent` (`parent_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_sort` (`sort_order`),
  INDEX `idx_product_categories_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品分类表';

-- 8. 产品表
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '产品ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  `product_type` VARCHAR(20) DEFAULT 'physical' COMMENT '商品类型: physical-普通商品, virtual-虚拟商品',
  `virtual_delivery_type` VARCHAR(20) DEFAULT NULL COMMENT '虚拟发货方式: none-无需发货, card_key-卡密发货, resource_link-网盘资源',
  `card_key_template` TEXT DEFAULT NULL COMMENT '卡密模板说明',
  `resource_link_template` TEXT DEFAULT NULL COMMENT '资源链接模板',
  `virtual_content_encrypt` TINYINT(1) DEFAULT 0 COMMENT '虚拟内容是否加密显示',
  `created_by` VARCHAR(50) NOT NULL COMMENT '创建人',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_category` (`category_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_products_tenant_id` (`tenant_id`),
  INDEX `idx_products_tenant_status` (`tenant_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品表';

-- 9. 订单表
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '订单ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID（SaaS模式，私有部署为NULL）',
  `order_number` VARCHAR(50) NOT NULL COMMENT '订单号',
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
  `cod_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '代收金额',
  `cod_status` VARCHAR(20) DEFAULT 'pending' COMMENT '代收状态: pending-未返款, returned-已返款, cancelled-已取消代收',
  `cod_returned_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '已返款金额',
  `cod_returned_at` TIMESTAMP NULL COMMENT '返款时间',
  `cod_cancelled_at` TIMESTAMP NULL COMMENT '取消代收时间',
  `cod_cancelled_by` VARCHAR(50) DEFAULT NULL COMMENT '取消代收操作人ID',
  `cod_cancelled_by_name` VARCHAR(50) DEFAULT NULL COMMENT '取消代收操作人姓名',
  `cod_remark` VARCHAR(500) DEFAULT NULL COMMENT '代收备注',
  `cod_returned_by` VARCHAR(50) DEFAULT NULL COMMENT '返款操作人ID',
  `cod_returned_by_name` VARCHAR(50) DEFAULT NULL COMMENT '返款操作人姓名',
  `operator_id` VARCHAR(50) COMMENT '操作员ID',
  `operator_name` VARCHAR(50) COMMENT '操作员姓名',
  `created_by` VARCHAR(50) NOT NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) COMMENT '创建人姓名',
  `created_by_department_id` VARCHAR(50) COMMENT '创建人部门ID',
  `created_by_department_name` VARCHAR(100) COMMENT '创建人部门名称',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `status_updated_at` TIMESTAMP NULL COMMENT '状态更新时间（记录最后一次状态变更的时间，如签收、发货等）',
  `order_product_type` VARCHAR(20) DEFAULT 'physical' COMMENT '订单商品类型: physical-普通, virtual-虚拟, mixed-混合',
  `completion_source` VARCHAR(30) DEFAULT NULL COMMENT '完成来源: audit_auto_complete/virtual_delivery/logistics_delivery',
  -- 🔥 索引优化（2026-03-30）：精简至17个索引（含PK），删除11个冗余/低效索引
  -- 保留的独立查询索引
  UNIQUE INDEX `uk_tenant_order_number` (`tenant_id`, `order_number`),
  INDEX `idx_tracking_number` (`tracking_number`),
  INDEX `idx_logistics_status` (`logistics_status`),
  INDEX `idx_todo_date` (`todo_date`),
  INDEX `idx_shipped_at` (`shipped_at`),
  INDEX `idx_delivered_at` (`delivered_at`),
  INDEX `idx_performance_status` (`performance_status`),
  INDEX `idx_cod_status` (`cod_status`),
  INDEX `idx_status_updated_at` (`status_updated_at`),
  -- 租户复合索引（覆盖多租户场景高频查询）
  INDEX `idx_orders_tenant_id` (`tenant_id`),
  INDEX `idx_orders_tenant_status` (`tenant_id`, `status`),
  INDEX `idx_orders_tenant_customer` (`tenant_id`, `customer_id`),
  INDEX `idx_orders_tenant_created_by` (`tenant_id`, `created_by`),
  INDEX `idx_orders_tenant_created_at` (`tenant_id`, `created_at`),
  INDEX `idx_orders_tenant_status_created` (`tenant_id`, `status`, `created_at`),
  INDEX `idx_orders_tenant_payment_status` (`tenant_id`, `payment_status`),
  INDEX `idx_orders_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 10. 物流表
DROP TABLE IF EXISTS `logistics`;
CREATE TABLE `logistics` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '物流ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_logistics_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流表';

-- 11. 售后服务表（完整版）
DROP TABLE IF EXISTS `after_sales_services`;
CREATE TABLE `after_sales_services` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '售后ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_after_sales_services_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后服务表';

-- 11.1 旧版售后服务表（兼容）
DROP TABLE IF EXISTS `service_records`;
CREATE TABLE `service_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '售后ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_service_records_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后服务表(旧版兼容)';

-- 12. 资料表
DROP TABLE IF EXISTS `data_records`;
CREATE TABLE `data_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '资料ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_data_records_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资料表';

-- 13. 业绩表
DROP TABLE IF EXISTS `performance_records`;
CREATE TABLE `performance_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '业绩ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_type` (`type`),
  INDEX `idx_performance_records_tenant_id` (`tenant_id`),
  INDEX `idx_performance_tenant_user` (`tenant_id`, `user_id`),
  INDEX `idx_performance_tenant_date` (`tenant_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩表';

-- 14. 操作日志表
DROP TABLE IF EXISTS `operation_logs`;
CREATE TABLE `operation_logs` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '日志ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_operation_logs_tenant_id` (`tenant_id`),
  INDEX `idx_operation_logs_tenant_created` (`tenant_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- 15. 系统配置表
DROP TABLE IF EXISTS `system_configs`;
CREATE TABLE `system_configs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '配置ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  UNIQUE INDEX `idx_tenant_config_key_group` (`tenant_id`, `configKey`, `configGroup`),
  INDEX `idx_config_group` (`configGroup`),
  INDEX `idx_enabled` (`isEnabled`),
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 系统配置默认数据
INSERT INTO `system_configs` (`configKey`, `configValue`, `valueType`, `configGroup`, `description`, `isEnabled`, `isSystem`, `sortOrder`) VALUES
-- 基本设置
('systemName', '云客CRM客户管理系统', 'string', 'basic_settings', '系统名称', 1, 1, 1),
('systemVersion', '2.9.0', 'string', 'basic_settings', '系统版本', 1, 1, 2),
('companyName', '广州仙狐网络科技有限公司', 'string', 'basic_settings', '公司名称', 1, 1, 3),
('contactPhone', '13570727364', 'string', 'basic_settings', '联系电话', 1, 1, 4),
('contactEmail', 'xianhuquwang@163.com', 'string', 'basic_settings', '联系邮箱', 1, 1, 5),
('websiteUrl', 'https://yunkes.com', 'string', 'basic_settings', '网站地址', 1, 1, 6),
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
('secureConsoleEnabled', 'true', 'boolean', 'security_settings', '控制台日志加密', 1, 1, 9),
-- 存储设置
('storageType', 'local', 'string', 'storage_settings', '存储类型', 1, 1, 1),
('localPath', '/uploads', 'string', 'storage_settings', '本地存储路径', 1, 1, 2),
('localDomain', 'http://localhost:3000', 'string', 'storage_settings', '本地域名', 1, 1, 3),
('maxFileSize', '10', 'number', 'storage_settings', '最大文件大小(MB)', 1, 1, 4),
('allowedTypes', 'jpg,png,gif,pdf,doc,docx,xls,xlsx', 'string', 'storage_settings', '允许的文件类型', 1, 1, 5),
('imageCompressEnabled', 'true', 'boolean', 'storage_settings', '启用图片压缩', 1, 1, 6),
('imageCompressQuality', 'medium', 'string', 'storage_settings', '图片压缩质量', 1, 1, 7),
('imageCompressMaxWidth', '1200', 'number', 'storage_settings', '图片最大宽度', 1, 1, 8),
-- 物流设置
('logistics_sender_phone', '', 'string', 'logistics_settings', '物流查询预设寄件人手机号', 1, 0, 1),
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
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  `provider_call_id` VARCHAR(100) COMMENT '服务商通话ID',
  `hangup_cause` VARCHAR(100) COMMENT '挂断原因',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_call_records_tenant_id` (`tenant_id`),
  INDEX `idx_call_records_tenant_user` (`tenant_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通话记录表';

-- 17. 跟进记录表
DROP TABLE IF EXISTS `follow_up_records`;
CREATE TABLE `follow_up_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '跟进ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_follow_up_records_tenant_id` (`tenant_id`),
  INDEX `idx_follow_up_tenant_customer` (`tenant_id`, `customer_id`)
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
  INDEX `idx_user_id` (`user_id`),
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID'
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
  INDEX `idx_sort` (`sort_order`),
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  INDEX `idx_call_lines_tenant` (`tenant_id`)
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
  INDEX `idx_created_at` (`created_at`),
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  INDEX `idx_outbound_tasks_tenant` (`tenant_id`)
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
  INDEX `idx_deleted` (`is_deleted`),
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  INDEX `idx_call_recordings_tenant` (`tenant_id`)
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
  INDEX `idx_is_primary` (`is_primary`),
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  INDEX `idx_work_phones_tenant` (`tenant_id`)
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
  INDEX `idx_expire` (`expire_at`),
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='号码黑名单表';

-- 18. 短信模板表（v1.8.0 更新：status改为VARCHAR, 新增8个审核/预设字段）
DROP TABLE IF EXISTS `sms_templates`;
CREATE TABLE `sms_templates` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '模板ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `category` VARCHAR(50) COMMENT '模板分类',
  `content` TEXT NOT NULL COMMENT '模板内容',
  `variables` JSON COMMENT '变量列表',
  `description` TEXT COMMENT '模板描述',
  `applicant` VARCHAR(50) NOT NULL COMMENT '申请人ID',
  `applicant_name` VARCHAR(50) COMMENT '申请人姓名',
  `applicant_dept` VARCHAR(100) COMMENT '申请人部门',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending_admin' COMMENT '审核状态: pending_admin/pending_vendor/active/rejected/withdrawn/deleted',
  `approved_by` VARCHAR(50) COMMENT '审核人ID',
  `approved_at` TIMESTAMP NULL COMMENT '审核时间',
  `is_system` BOOLEAN DEFAULT FALSE COMMENT '是否系统模板',
  `vendor_template_code` VARCHAR(100) NULL COMMENT '服务商模板CODE',
  `vendor_status` VARCHAR(20) NULL COMMENT '服务商审核状态',
  `vendor_submit_at` TIMESTAMP NULL COMMENT '提交服务商时间',
  `vendor_reject_reason` TEXT NULL COMMENT '服务商拒绝原因',
  `admin_reviewer` VARCHAR(50) NULL COMMENT '管理后台审核人',
  `admin_review_at` TIMESTAMP NULL COMMENT '管理后台审核时间',
  `admin_review_note` TEXT NULL COMMENT '管理后台审核备注/拒绝原因',
  `is_preset` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否为后台预设模板: 0=租户自建, 1=预设',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_category` (`category`),
  INDEX `idx_status` (`status`),
  INDEX `idx_applicant` (`applicant`),
  INDEX `idx_is_system` (`is_system`),
  INDEX `idx_sms_templates_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信模板表';

-- 19. 短信发送记录表（v1.8.0 更新：新增 sender_phone 字段; v1.8.1 更新：新增角色权限+自动发送字段）
DROP TABLE IF EXISTS `sms_records`;
CREATE TABLE `sms_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '记录ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  `sender_phone` VARCHAR(20) NULL COMMENT '发送人手机号',
  `sender_user_id` VARCHAR(50) NULL COMMENT '发送人用户ID(角色数据范围过滤)',
  `sender_department_id` VARCHAR(100) NULL COMMENT '发送人部门ID(部门经理数据范围过滤)',
  `trigger_source` VARCHAR(20) NULL DEFAULT 'manual' COMMENT '触发来源: manual=手动发送, auto=自动触发',
  `auto_rule_id` VARCHAR(50) NULL COMMENT '自动发送规则ID(自动触发时关联)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_template` (`template_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_applicant` (`applicant`),
  INDEX `idx_sent_at` (`sent_at`),
  INDEX `idx_sms_records_tenant_id` (`tenant_id`),
  INDEX `idx_sms_records_sender_user` (`sender_user_id`),
  INDEX `idx_sms_records_sender_dept` (`sender_department_id`),
  INDEX `idx_sms_records_auto_rule` (`auto_rule_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信发送记录表';

-- 19.1 短信额度套餐表（v1.8.0 新增）
DROP TABLE IF EXISTS `sms_quota_packages`;
CREATE TABLE `sms_quota_packages` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '套餐ID',
  `name` VARCHAR(100) NOT NULL COMMENT '套餐名称',
  `sms_count` INT NOT NULL COMMENT '短信条数',
  `price` DECIMAL(10,2) NOT NULL COMMENT '套餐价格(元)',
  `unit_price` DECIMAL(10,4) DEFAULT 0 COMMENT '单条价格(元)',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '套餐描述',
  `sort_order` INT DEFAULT 0 COMMENT '排序权重',
  `is_enabled` TINYINT DEFAULT 1 COMMENT '是否启用: 1启用 0禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信额度套餐表';

-- 19.2 短信额度购买订单表（v1.8.0 新增）
DROP TABLE IF EXISTS `sms_quota_orders`;
CREATE TABLE `sms_quota_orders` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '订单ID',
  `order_no` VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `tenant_name` VARCHAR(200) DEFAULT NULL COMMENT '租户名称',
  `package_id` VARCHAR(36) DEFAULT NULL COMMENT '套餐ID',
  `package_name` VARCHAR(100) DEFAULT NULL COMMENT '套餐名称',
  `sms_count` INT DEFAULT 0 COMMENT '购买短信条数',
  `amount` DECIMAL(10,2) DEFAULT 0 COMMENT '支付金额',
  `pay_type` VARCHAR(20) DEFAULT NULL COMMENT '支付方式: wechat/alipay/bank',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/paid/refunded/closed',
  `qr_code` TEXT DEFAULT NULL COMMENT '支付二维码',
  `pay_url` TEXT DEFAULT NULL COMMENT '支付链接',
  `paid_at` DATETIME DEFAULT NULL COMMENT '支付时间',
  `buyer_id` VARCHAR(36) DEFAULT NULL COMMENT '购买人ID',
  `buyer_name` VARCHAR(100) DEFAULT NULL COMMENT '购买人姓名',
  `buyer_source` VARCHAR(20) DEFAULT 'crm' COMMENT '购买来源: crm/member',
  `refund_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '退款金额',
  `refund_sms_count` INT DEFAULT 0 COMMENT '退款短信条数',
  `refund_at` DATETIME DEFAULT NULL COMMENT '退款时间',
  `refund_reason` VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
  `refunded_by` VARCHAR(100) DEFAULT NULL COMMENT '退款操作人',
  `expire_time` DATETIME DEFAULT NULL COMMENT '订单过期时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_sms_quota_orders_tenant_id` (`tenant_id`),
  INDEX `idx_sms_quota_orders_order_no` (`order_no`),
  INDEX `idx_sms_quota_orders_status` (`status`),
  INDEX `idx_sms_quota_orders_paid_at` (`paid_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信额度购买订单表';

-- 19.3 短信自动发送规则表（v1.8.1 新增）
DROP TABLE IF EXISTS `sms_auto_send_rules`;
CREATE TABLE `sms_auto_send_rules` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '规则ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '规则名称',
  `template_id` VARCHAR(50) NOT NULL COMMENT '关联模板ID',
  `template_name` VARCHAR(100) NULL COMMENT '模板名称(冗余)',
  `trigger_event` VARCHAR(50) NOT NULL COMMENT '触发事件类型: order_shipped/order_confirmed/order_paid/order_delivered/customer_created/follow_up_remind/payment_remind/birthday_wish',
  `effective_departments` JSON NULL COMMENT '生效部门IDs(JSON数组,空=全部部门)',
  `time_range_config` JSON NULL COMMENT '时间范围配置(JSON: workdaysOnly/startHour/endHour/sendImmediately)',
  `enabled` TINYINT DEFAULT 1 COMMENT '是否启用: 1启用 0禁用',
  `created_by` VARCHAR(50) NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) NULL COMMENT '创建人姓名',
  `stats_sent_count` INT DEFAULT 0 COMMENT '发送成功总数',
  `stats_fail_count` INT DEFAULT 0 COMMENT '发送失败总数',
  `last_triggered_at` TIMESTAMP NULL COMMENT '最后触发时间',
  `description` TEXT NULL COMMENT '规则描述',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_sms_auto_send_rules_tenant_id` (`tenant_id`),
  INDEX `idx_sms_auto_send_rules_trigger_event` (`trigger_event`),
  INDEX `idx_sms_auto_send_rules_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信自动发送规则表';

-- 20. 消息通知表
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '通知ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_notifications_tenant_id` (`tenant_id`),
  INDEX `idx_notifications_tenant_user` (`tenant_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息通知表';

-- 21. 系统公告表
DROP TABLE IF EXISTS `system_announcements`;
CREATE TABLE `system_announcements` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '公告ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_system_announcements_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统公告表';

-- 22. 订单审核记录表
DROP TABLE IF EXISTS `order_audits`;
CREATE TABLE `order_audits` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '审核ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_apply_time` (`apply_time`),
  INDEX `idx_order_audits_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单审核记录表';

-- 23. 业绩分享记录表
DROP TABLE IF EXISTS `performance_shares`;
CREATE TABLE `performance_shares` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '分享ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_performance_shares_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩分享记录表';

-- 24. 业绩分享成员表
DROP TABLE IF EXISTS `performance_share_members`;
CREATE TABLE `performance_share_members` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '成员ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_performance_share_members_tenant_id` (`tenant_id`),
  FOREIGN KEY (`share_id`) REFERENCES `performance_shares`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩分享成员表';

-- 25. 物流公司表
DROP TABLE IF EXISTS `logistics_companies`;
CREATE TABLE `logistics_companies` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '公司ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `code` VARCHAR(50) NOT NULL COMMENT '公司代码',
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
  UNIQUE KEY `idx_logistics_companies_tenant_code` (`tenant_id`, `code`),
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_code` (`code`),
  INDEX `idx_name` (`name`),
  INDEX `idx_status` (`status`),
  INDEX `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流公司表';

-- 25.1 物流API配置表
DROP TABLE IF EXISTS `logistics_api_configs`;
CREATE TABLE `logistics_api_configs` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '配置ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `company_code` VARCHAR(50) NOT NULL COMMENT '物流公司代码(SF/ZTO/YTO/STO/YD/JTSD/EMS/JD/DBL)',
  `company_name` VARCHAR(100) NOT NULL COMMENT '物流公司名称',
  `app_id` VARCHAR(200) NULL COMMENT '应用ID/AppKey/PartnerId',
  `app_key` VARCHAR(200) NULL COMMENT '应用密钥/AppSecret',
  `app_secret` VARCHAR(500) NULL COMMENT '校验码/CheckWord/SecretKey',
  `customer_id` VARCHAR(200) NULL COMMENT '客户ID/月结账号',
  `api_url` VARCHAR(500) NULL COMMENT 'API接口地址',
  `api_environment` ENUM('sandbox', 'production') DEFAULT 'sandbox' COMMENT 'API环境(sandbox-测试/production-生产)',
  `extra_config` JSON NULL COMMENT '扩展配置(JSON格式)',
  `support_create_order` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否支持下单生成运单号: 0=仅查询, 1=支持下单',
  `enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用(0-禁用/1-启用)',
  `last_test_time` DATETIME NULL COMMENT '最后测试时间',
  `last_test_result` TINYINT(1) NULL COMMENT '最后测试结果(0-失败/1-成功)',
  `last_test_message` VARCHAR(500) NULL COMMENT '最后测试消息',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` VARCHAR(50) NULL COMMENT '创建人',
  `updated_by` VARCHAR(50) NULL COMMENT '更新人',
  UNIQUE KEY `idx_logistics_api_configs_tenant_code` (`tenant_id`, `company_code`),
  INDEX `idx_enabled` (`enabled`),
  INDEX `idx_api_environment` (`api_environment`),
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流API配置表';

-- 26. 物流状态历史表
DROP TABLE IF EXISTS `logistics_status_history`;
CREATE TABLE `logistics_status_history` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '历史ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_logistics_status_history_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流状态历史表';

-- 27. 物流异常记录表
DROP TABLE IF EXISTS `logistics_exceptions`;
CREATE TABLE `logistics_exceptions` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '异常ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_exception_time` (`exception_time`),
  INDEX `idx_logistics_exceptions_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流异常记录表';

-- 28. 物流待办事项表
DROP TABLE IF EXISTS `logistics_todos`;
CREATE TABLE `logistics_todos` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '待办ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_by` (`created_by`),
  INDEX `idx_logistics_todos_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流待办事项表';

-- 29. 订单字段配置表
DROP TABLE IF EXISTS `order_field_configs`;
CREATE TABLE `order_field_configs` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '配置ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_sort_order` (`sort_order`),
  INDEX `idx_order_field_configs_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单字段配置表';

-- 30. 系统设置表
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '设置ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_sort_order` (`sort_order`),
  INDEX `idx_system_settings_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统设置表';

-- 31. 权限表（系统权限定义）
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '权限ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_parent` (`parentId`),
  INDEX `idx_permissions_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 插入默认权限树数据（与前端 PERMISSION_TREE 完全对应）
INSERT INTO `permissions` (`id`, `tenant_id`, `name`, `code`, `description`, `module`, `type`, `path`, `icon`, `sort`, `status`, `parentId`) VALUES
-- 1. 数据看板
(1, NULL, '数据看板', 'dashboard', '数据看板模块', 'dashboard', 'module', '/dashboard', 'Odometer', 1, 'active', NULL),
(2, NULL, '查看看板', 'dashboard.view', NULL, 'dashboard', 'action', NULL, NULL, 1, 'active', 1),
(3, NULL, '导出数据', 'dashboard.export', NULL, 'dashboard', 'action', NULL, NULL, 2, 'active', 1),
-- 2. 客户管理
(4, NULL, '客户管理', 'customer', '客户管理模块', 'customer', 'module', '/customer', 'User', 2, 'active', NULL),
(5, NULL, '客户列表', 'customer.list', NULL, 'customer', 'menu', '/customer/list', 'List', 1, 'active', 4),
(6, NULL, '查看列表', 'customer.list.view', NULL, 'customer', 'action', NULL, NULL, 1, 'active', 5),
(7, NULL, '导出客户', 'customer.list.export', NULL, 'customer', 'action', NULL, NULL, 2, 'active', 5),
(8, NULL, '导入客户', 'customer.list.import', NULL, 'customer', 'action', NULL, NULL, 3, 'active', 5),
(9, NULL, '编辑客户', 'customer.list.edit', NULL, 'customer', 'action', NULL, NULL, 4, 'active', 5),
(10, NULL, '删除客户', 'customer.list.delete', NULL, 'customer', 'action', NULL, NULL, 5, 'active', 5),
(11, NULL, '分配客户', 'customer.list.assign', NULL, 'customer', 'action', NULL, NULL, 6, 'active', 5),
(12, NULL, '新增客户', 'customer.add', NULL, 'customer', 'menu', '/customer/add', 'Plus', 2, 'active', 4),
(13, NULL, '创建客户', 'customer.add.create', NULL, 'customer', 'action', NULL, NULL, 1, 'active', 12),
(14, NULL, '客户分组', 'customer.groups', NULL, 'customer', 'menu', '/customer/groups', 'Collection', 3, 'active', 4),
(15, NULL, '查看分组', 'customer.groups.view', NULL, 'customer', 'action', NULL, NULL, 1, 'active', 14),
(16, NULL, '新增分组', 'customer.groups.create', NULL, 'customer', 'action', NULL, NULL, 2, 'active', 14),
(17, NULL, '编辑分组', 'customer.groups.edit', NULL, 'customer', 'action', NULL, NULL, 3, 'active', 14),
(18, NULL, '删除分组', 'customer.groups.delete', NULL, 'customer', 'action', NULL, NULL, 4, 'active', 14),
(19, NULL, '客户标签', 'customer.tags', NULL, 'customer', 'menu', '/customer/tags', 'PriceTag', 4, 'active', 4),
(20, NULL, '查看标签', 'customer.tags.view', NULL, 'customer', 'action', NULL, NULL, 1, 'active', 19),
(21, NULL, '新增标签', 'customer.tags.create', NULL, 'customer', 'action', NULL, NULL, 2, 'active', 19),
(22, NULL, '编辑标签', 'customer.tags.edit', NULL, 'customer', 'action', NULL, NULL, 3, 'active', 19),
(23, NULL, '删除标签', 'customer.tags.delete', NULL, 'customer', 'action', NULL, NULL, 4, 'active', 19),
-- 3. 订单管理
(24, NULL, '订单管理', 'order', '订单管理模块', 'order', 'module', '/order', 'ShoppingCart', 3, 'active', NULL),
(25, NULL, '订单列表', 'order.list', NULL, 'order', 'menu', '/order/list', 'List', 1, 'active', 24),
(26, NULL, '查看订单', 'order.list.view', NULL, 'order', 'action', NULL, NULL, 1, 'active', 25),
(27, NULL, '导出订单', 'order.list.export', NULL, 'order', 'action', NULL, NULL, 2, 'active', 25),
(28, NULL, '编辑订单', 'order.list.edit', NULL, 'order', 'action', NULL, NULL, 3, 'active', 25),
(29, NULL, '删除订单', 'order.list.delete', NULL, 'order', 'action', NULL, NULL, 4, 'active', 25),
(30, NULL, '取消订单', 'order.list.cancel', NULL, 'order', 'action', NULL, NULL, 5, 'active', 25),
(31, NULL, '新增订单', 'order.add', NULL, 'order', 'menu', '/order/add', 'Plus', 2, 'active', 24),
(32, NULL, '创建订单', 'order.add.create', NULL, 'order', 'action', NULL, NULL, 1, 'active', 31),
(33, NULL, '订单审核', 'order.audit', NULL, 'order', 'menu', '/order/audit', 'CircleCheck', 3, 'active', 24),
(34, NULL, '查看审核', 'order.audit.view', NULL, 'order', 'action', NULL, NULL, 1, 'active', 33),
(35, NULL, '通过审核', 'order.audit.approve', NULL, 'order', 'action', NULL, NULL, 2, 'active', 33),
(36, NULL, '拒绝审核', 'order.audit.reject', NULL, 'order', 'action', NULL, NULL, 3, 'active', 33),
(37, NULL, '批量审核', 'order.audit.batch', NULL, 'order', 'action', NULL, NULL, 4, 'active', 33),
(38, NULL, '取消代收申请', 'order.cod_application', NULL, 'order', 'menu', '/order/my-cod-application', 'DocumentRemove', 4, 'active', 24),
(39, NULL, '查看申请', 'order.cod_application.view', NULL, 'order', 'action', NULL, NULL, 1, 'active', 38),
(40, NULL, '创建申请', 'order.cod_application.create', NULL, 'order', 'action', NULL, NULL, 2, 'active', 38),
(41, NULL, '撤销申请', 'order.cod_application.cancel', NULL, 'order', 'action', NULL, NULL, 3, 'active', 38),
(42, NULL, '取消代收审核', 'order.cod_review', NULL, 'order', 'menu', '/order/cod-application-review', 'CircleCheck', 5, 'active', 24),
(43, NULL, '查看审核', 'order.cod_review.view', NULL, 'order', 'action', NULL, NULL, 1, 'active', 42),
(44, NULL, '通过审核', 'order.cod_review.approve', NULL, 'order', 'action', NULL, NULL, 2, 'active', 42),
(45, NULL, '拒绝审核', 'order.cod_review.reject', NULL, 'order', 'action', NULL, NULL, 3, 'active', 42),
(46, NULL, '批量审核', 'order.cod_review.batch', NULL, 'order', 'action', NULL, NULL, 4, 'active', 42),
-- 4. 服务管理
(47, NULL, '服务管理', 'communication', '服务管理模块', 'communication', 'module', '/service-management', 'Headset', 4, 'active', NULL),
(48, NULL, '通话管理', 'communication.call', NULL, 'communication', 'menu', '/service-management/call', 'Phone', 1, 'active', 47),
(49, NULL, '查看通话记录', 'communication.call.view', NULL, 'communication', 'action', NULL, NULL, 1, 'active', 48),
(50, NULL, '发起通话', 'communication.call.make', NULL, 'communication', 'action', NULL, NULL, 2, 'active', 48),
(51, NULL, '录音管理', 'communication.call.record', NULL, 'communication', 'action', NULL, NULL, 3, 'active', 48),
(52, NULL, '短信管理', 'communication.sms', NULL, 'communication', 'menu', '/service-management/sms', 'Message', 2, 'active', 47),
(53, NULL, '查看短信记录', 'communication.sms.view', NULL, 'communication', 'action', NULL, NULL, 1, 'active', 52),
(54, NULL, '发送短信', 'communication.sms.send', NULL, 'communication', 'action', NULL, NULL, 2, 'active', 52),
(55, NULL, '模板管理', 'communication.sms.template', NULL, 'communication', 'action', NULL, NULL, 3, 'active', 52),
-- 5. 业绩统计
(56, NULL, '业绩统计', 'performance', '业绩统计模块', 'performance', 'module', '/performance', 'TrendCharts', 5, 'active', NULL),
(57, NULL, '个人业绩', 'performance.personal', NULL, 'performance', 'menu', '/performance/personal', 'User', 1, 'active', 56),
(58, NULL, '查看个人业绩', 'performance.personal.view', NULL, 'performance', 'action', NULL, NULL, 1, 'active', 57),
(59, NULL, '导出个人数据', 'performance.personal.export', NULL, 'performance', 'action', NULL, NULL, 2, 'active', 57),
(60, NULL, '团队业绩', 'performance.team', NULL, 'performance', 'menu', '/performance/team', 'UserFilled', 2, 'active', 56),
(61, NULL, '查看团队业绩', 'performance.team.view', NULL, 'performance', 'action', NULL, NULL, 1, 'active', 60),
(62, NULL, '导出团队数据', 'performance.team.export', NULL, 'performance', 'action', NULL, NULL, 2, 'active', 60),
(63, NULL, '业绩分析', 'performance.analysis', NULL, 'performance', 'menu', '/performance/analysis', 'DataAnalysis', 3, 'active', 56),
(64, NULL, '查看分析', 'performance.analysis.view', NULL, 'performance', 'action', NULL, NULL, 1, 'active', 63),
(65, NULL, '导出分析', 'performance.analysis.export', NULL, 'performance', 'action', NULL, NULL, 2, 'active', 63),
(66, NULL, '业绩分享', 'performance.share', NULL, 'performance', 'menu', '/performance/share', 'Share', 4, 'active', 56),
(67, NULL, '查看分享', 'performance.share.view', NULL, 'performance', 'action', NULL, NULL, 1, 'active', 66),
(68, NULL, '创建分享', 'performance.share.create', NULL, 'performance', 'action', NULL, NULL, 2, 'active', 66),
(69, NULL, '管理分享', 'performance.share.manage', NULL, 'performance', 'action', NULL, NULL, 3, 'active', 66),
-- 6. 物流管理
(70, NULL, '物流管理', 'logistics', '物流管理模块', 'logistics', 'module', '/logistics', 'Van', 6, 'active', NULL),
(71, NULL, '发货列表', 'logistics.shipping', NULL, 'logistics', 'menu', '/logistics/shipping', 'Box', 1, 'active', 70),
(72, NULL, '查看发货', 'logistics.shipping.view', NULL, 'logistics', 'action', NULL, NULL, 1, 'active', 71),
(73, NULL, '创建发货', 'logistics.shipping.create', NULL, 'logistics', 'action', NULL, NULL, 2, 'active', 71),
(74, NULL, '编辑发货', 'logistics.shipping.edit', NULL, 'logistics', 'action', NULL, NULL, 3, 'active', 71),
(75, NULL, '导出发货', 'logistics.shipping.export', NULL, 'logistics', 'action', NULL, NULL, 4, 'active', 71),
(76, NULL, '物流列表', 'logistics.list', NULL, 'logistics', 'menu', '/logistics/list', 'List', 2, 'active', 70),
(77, NULL, '查看物流', 'logistics.list.view', NULL, 'logistics', 'action', NULL, NULL, 1, 'active', 76),
(78, NULL, '导出物流', 'logistics.list.export', NULL, 'logistics', 'action', NULL, NULL, 2, 'active', 76),
(79, NULL, '物流跟踪', 'logistics.track', NULL, 'logistics', 'menu', '/logistics/track', 'Position', 3, 'active', 70),
(80, NULL, '查看跟踪', 'logistics.track.view', NULL, 'logistics', 'action', NULL, NULL, 1, 'active', 79),
(81, NULL, '更新跟踪', 'logistics.track.update', NULL, 'logistics', 'action', NULL, NULL, 2, 'active', 79),
(82, NULL, '状态更新', 'logistics.status', NULL, 'logistics', 'menu', '/logistics/status-update', 'Refresh', 4, 'active', 70),
(83, NULL, '查看状态', 'logistics.status.view', NULL, 'logistics', 'action', NULL, NULL, 1, 'active', 82),
(84, NULL, '更新状态', 'logistics.status.update', NULL, 'logistics', 'action', NULL, NULL, 2, 'active', 82),
(85, NULL, '批量更新', 'logistics.status.batch', NULL, 'logistics', 'action', NULL, NULL, 3, 'active', 82),
(86, NULL, '物流公司', 'logistics.companies', NULL, 'logistics', 'menu', '/logistics/companies', 'OfficeBuilding', 5, 'active', 70),
(87, NULL, '查看公司', 'logistics.companies.view', NULL, 'logistics', 'action', NULL, NULL, 1, 'active', 86),
(88, NULL, '新增公司', 'logistics.companies.create', NULL, 'logistics', 'action', NULL, NULL, 2, 'active', 86),
(89, NULL, '编辑公司', 'logistics.companies.edit', NULL, 'logistics', 'action', NULL, NULL, 3, 'active', 86),
-- 7. 售后管理
(90, NULL, '售后管理', 'aftersale', '售后管理模块', 'aftersale', 'module', '/service', 'Tools', 7, 'active', NULL),
(91, NULL, '售后订单', 'aftersale.list', NULL, 'aftersale', 'menu', '/service/list', 'List', 1, 'active', 90),
(92, NULL, '查看售后', 'aftersale.list.view', NULL, 'aftersale', 'action', NULL, NULL, 1, 'active', 91),
(93, NULL, '导出售后', 'aftersale.list.export', NULL, 'aftersale', 'action', NULL, NULL, 2, 'active', 91),
(94, NULL, '编辑售后', 'aftersale.list.edit', NULL, 'aftersale', 'action', NULL, NULL, 3, 'active', 91),
(95, NULL, '删除售后', 'aftersale.list.delete', NULL, 'aftersale', 'action', NULL, NULL, 4, 'active', 91),
(96, NULL, '新建售后', 'aftersale.add', NULL, 'aftersale', 'menu', '/service/add', 'Plus', 2, 'active', 90),
(97, NULL, '创建售后', 'aftersale.add.create', NULL, 'aftersale', 'action', NULL, NULL, 1, 'active', 96),
(98, NULL, '售后数据', 'aftersale.data', NULL, 'aftersale', 'menu', '/service/data', 'DataAnalysis', 3, 'active', 90),
(99, NULL, '查看数据', 'aftersale.data.view', NULL, 'aftersale', 'action', NULL, NULL, 1, 'active', 98),
(100, NULL, '导出数据', 'aftersale.data.export', NULL, 'aftersale', 'action', NULL, NULL, 2, 'active', 98),
-- 8. 资料管理
(101, NULL, '资料管理', 'data', '资料管理模块', 'data', 'module', '/data', 'Files', 8, 'active', NULL),
(102, NULL, '资料列表', 'data.list', NULL, 'data', 'menu', '/data/list', 'List', 1, 'active', 101),
(103, NULL, '查看列表', 'data.list.view', NULL, 'data', 'action', NULL, NULL, 1, 'active', 102),
(104, NULL, '导出资料', 'data.list.export', NULL, 'data', 'action', NULL, NULL, 2, 'active', 102),
(105, NULL, '导入资料', 'data.list.import', NULL, 'data', 'action', NULL, NULL, 3, 'active', 102),
(106, NULL, '分配资料', 'data.list.assign', NULL, 'data', 'action', NULL, NULL, 4, 'active', 102),
(107, NULL, '客户查询', 'data.search', NULL, 'data', 'menu', '/data/search', 'Search', 2, 'active', 101),
(108, NULL, '基础查询', 'data.search.basic', NULL, 'data', 'action', NULL, NULL, 1, 'active', 107),
(109, NULL, '高级查询', 'data.search.advanced', NULL, 'data', 'action', NULL, NULL, 2, 'active', 107),
(110, NULL, '导出结果', 'data.search.export', NULL, 'data', 'action', NULL, NULL, 3, 'active', 107),
(111, NULL, '回收站', 'data.recycle', NULL, 'data', 'menu', '/data/recycle', 'Delete', 3, 'active', 101),
(112, NULL, '查看回收站', 'data.recycle.view', NULL, 'data', 'action', NULL, NULL, 1, 'active', 111),
(113, NULL, '恢复数据', 'data.recycle.restore', NULL, 'data', 'action', NULL, NULL, 2, 'active', 111),
(114, NULL, '彻底删除', 'data.recycle.delete', NULL, 'data', 'action', NULL, NULL, 3, 'active', 111),
-- 9. 商品管理
(115, NULL, '商品管理', 'product', '商品管理模块', 'product', 'module', '/product', 'Box', 9, 'active', NULL),
(116, NULL, '商品列表', 'product.list', NULL, 'product', 'menu', '/product/list', 'List', 1, 'active', 115),
(117, NULL, '查看商品', 'product.list.view', NULL, 'product', 'action', NULL, NULL, 1, 'active', 116),
(118, NULL, '导出商品', 'product.list.export', NULL, 'product', 'action', NULL, NULL, 2, 'active', 116),
(119, NULL, '导入商品', 'product.list.import', NULL, 'product', 'action', NULL, NULL, 3, 'active', 116),
(120, NULL, '编辑商品', 'product.list.edit', NULL, 'product', 'action', NULL, NULL, 4, 'active', 116),
(121, NULL, '删除商品', 'product.list.delete', NULL, 'product', 'action', NULL, NULL, 5, 'active', 116),
(122, NULL, '新增商品', 'product.add', NULL, 'product', 'menu', '/product/add', 'Plus', 2, 'active', 115),
(123, NULL, '创建商品', 'product.add.create', NULL, 'product', 'action', NULL, NULL, 1, 'active', 122),
(124, NULL, '库存管理', 'product.inventory', NULL, 'product', 'menu', '/product/inventory', 'Box', 3, 'active', 115),
(125, NULL, '查看库存', 'product.inventory.view', NULL, 'product', 'action', NULL, NULL, 1, 'active', 124),
(126, NULL, '库存调整', 'product.inventory.adjust', NULL, 'product', 'action', NULL, NULL, 2, 'active', 124),
(127, NULL, '导出库存', 'product.inventory.export', NULL, 'product', 'action', NULL, NULL, 3, 'active', 124),
(128, NULL, '导入库存', 'product.inventory.import', NULL, 'product', 'action', NULL, NULL, 4, 'active', 124),
(129, NULL, '商品分类', 'product.category', NULL, 'product', 'menu', '/product/category', 'Collection', 4, 'active', 115),
(130, NULL, '查看分类', 'product.category.view', NULL, 'product', 'action', NULL, NULL, 1, 'active', 129),
(131, NULL, '新增分类', 'product.category.create', NULL, 'product', 'action', NULL, NULL, 2, 'active', 129),
(132, NULL, '编辑分类', 'product.category.edit', NULL, 'product', 'action', NULL, NULL, 3, 'active', 129),
(133, NULL, '删除分类', 'product.category.delete', NULL, 'product', 'action', NULL, NULL, 4, 'active', 129),
(134, NULL, '商品分析', 'product.analytics', NULL, 'product', 'menu', '/product/analytics', 'DataAnalysis', 5, 'active', 115),
(135, NULL, '查看分析', 'product.analytics.view', NULL, 'product', 'action', NULL, NULL, 1, 'active', 134),
(136, NULL, '导出分析', 'product.analytics.export', NULL, 'product', 'action', NULL, NULL, 2, 'active', 134),
(137, NULL, '卡密库存', 'product.virtual_keys', NULL, 'product', 'menu', '/product/virtual/card-keys', 'Key', 6, 'active', 115),
(138, NULL, '查看卡密', 'product.virtual_keys.view', NULL, 'product', 'action', NULL, NULL, 1, 'active', 137),
(139, NULL, '新增卡密', 'product.virtual_keys.create', NULL, 'product', 'action', NULL, NULL, 2, 'active', 137),
(140, NULL, '编辑卡密', 'product.virtual_keys.edit', NULL, 'product', 'action', NULL, NULL, 3, 'active', 137),
(141, NULL, '删除卡密', 'product.virtual_keys.delete', NULL, 'product', 'action', NULL, NULL, 4, 'active', 137),
(142, NULL, '导入卡密', 'product.virtual_keys.import', NULL, 'product', 'action', NULL, NULL, 5, 'active', 137),
(143, NULL, '导出卡密', 'product.virtual_keys.export', NULL, 'product', 'action', NULL, NULL, 6, 'active', 137),
(144, NULL, '资源库存', 'product.virtual_resources', NULL, 'product', 'menu', '/product/virtual/resources', 'FolderOpened', 7, 'active', 115),
(145, NULL, '查看资源', 'product.virtual_resources.view', NULL, 'product', 'action', NULL, NULL, 1, 'active', 144),
(146, NULL, '新增资源', 'product.virtual_resources.create', NULL, 'product', 'action', NULL, NULL, 2, 'active', 144),
(147, NULL, '编辑资源', 'product.virtual_resources.edit', NULL, 'product', 'action', NULL, NULL, 3, 'active', 144),
(148, NULL, '删除资源', 'product.virtual_resources.delete', NULL, 'product', 'action', NULL, NULL, 4, 'active', 144),
(149, NULL, '导入资源', 'product.virtual_resources.import', NULL, 'product', 'action', NULL, NULL, 5, 'active', 144),
(150, NULL, '导出资源', 'product.virtual_resources.export', NULL, 'product', 'action', NULL, NULL, 6, 'active', 144),
-- 10. 财务管理
(151, NULL, '财务管理', 'finance', '财务管理模块', 'finance', 'module', '/finance', 'Money', 10, 'active', NULL),
(152, NULL, '绩效数据', 'finance.performance_data', NULL, 'finance', 'menu', '/finance/performance-data', 'DataLine', 1, 'active', 151),
(153, NULL, '查看绩效数据', 'finance.performance_data.view', NULL, 'finance', 'action', NULL, NULL, 1, 'active', 152),
(154, NULL, '绩效管理', 'finance.performance_manage', NULL, 'finance', 'menu', '/finance/performance-manage', 'Setting', 2, 'active', 151),
(155, NULL, '查看绩效管理', 'finance.performance_manage.view', NULL, 'finance', 'action', NULL, NULL, 1, 'active', 154),
(156, NULL, '编辑绩效', 'finance.performance_manage.edit', NULL, 'finance', 'action', NULL, NULL, 2, 'active', 154),
(157, NULL, '配置管理', 'finance.performance_manage.config', NULL, 'finance', 'action', NULL, NULL, 3, 'active', 154),
(158, NULL, '代收管理', 'finance.cod_collection', NULL, 'finance', 'menu', '/finance/cod-collection', 'Wallet', 3, 'active', 151),
(159, NULL, '查看代收', 'finance.cod_collection.view', NULL, 'finance', 'action', NULL, NULL, 1, 'active', 158),
(160, NULL, '导出代收', 'finance.cod_collection.export', NULL, 'finance', 'action', NULL, NULL, 2, 'active', 158),
(161, NULL, '编辑代收', 'finance.cod_collection.edit', NULL, 'finance', 'action', NULL, NULL, 3, 'active', 158),
(162, NULL, '返款操作', 'finance.cod_collection.refund', NULL, 'finance', 'action', NULL, NULL, 4, 'active', 158),
(163, NULL, '增值管理', 'finance.value_added', NULL, 'finance', 'menu', '/finance/value-added-manage', 'Coin', 4, 'active', 151),
(164, NULL, '查看增值列表', 'finance.value_added.view', NULL, 'finance', 'action', NULL, NULL, 1, 'active', 163),
(165, NULL, '新增增值', 'finance.value_added.create', NULL, 'finance', 'action', NULL, NULL, 2, 'active', 163),
(166, NULL, '编辑增值', 'finance.value_added.edit', NULL, 'finance', 'action', NULL, NULL, 3, 'active', 163),
(167, NULL, '删除增值', 'finance.value_added.delete', NULL, 'finance', 'action', NULL, NULL, 4, 'active', 163),
(168, NULL, '批量操作', 'finance.value_added.batch', NULL, 'finance', 'action', NULL, NULL, 5, 'active', 163),
(169, NULL, '导出数据', 'finance.value_added.export', NULL, 'finance', 'action', NULL, NULL, 6, 'active', 163),
(170, NULL, '外包公司管理', 'finance.value_added.company', NULL, 'finance', 'action', NULL, NULL, 7, 'active', 163),
(171, NULL, '价格档位管理', 'finance.value_added.price_tier', NULL, 'finance', 'action', NULL, NULL, 8, 'active', 163),
(172, NULL, '状态配置管理', 'finance.value_added.status_config', NULL, 'finance', 'action', NULL, NULL, 9, 'active', 163),
(173, NULL, '结算报表', 'finance.settlement_report', NULL, 'finance', 'menu', '/finance/settlement-report', 'Document', 5, 'active', 151),
(174, NULL, '查看报表', 'finance.settlement_report.view', NULL, 'finance', 'action', NULL, NULL, 1, 'active', 173),
(175, NULL, '导出报表', 'finance.settlement_report.export', NULL, 'finance', 'action', NULL, NULL, 2, 'active', 173),
(176, NULL, '查看图表', 'finance.settlement_report.charts', NULL, 'finance', 'action', NULL, NULL, 3, 'active', 173),
(177, NULL, '查看排名', 'finance.settlement_report.ranking', NULL, 'finance', 'action', NULL, NULL, 4, 'active', 173),
-- 11. 企微管理
(178, NULL, '企微管理', 'wecom', '企微管理模块', 'wecom', 'module', '/wecom', 'ChatDotRound', 10, 'active', NULL),
(179, NULL, '通讯录', 'wecom.address_book', NULL, 'wecom', 'menu', '/wecom/address-book', 'Notebook', 1, 'active', 178),
(180, NULL, '查看通讯录', 'wecom.address_book.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 179),
(181, NULL, '同步通讯录', 'wecom.address_book.sync', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 179),
(182, NULL, '企微客户', 'wecom.customer', NULL, 'wecom', 'menu', '/wecom/customer', 'User', 2, 'active', 178),
(183, NULL, '查看企微客户', 'wecom.customer.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 182),
(184, NULL, '导出企微客户', 'wecom.customer.export', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 182),
(185, NULL, '同步企微客户', 'wecom.customer.sync', NULL, 'wecom', 'action', NULL, NULL, 3, 'active', 182),
(186, NULL, '客户群', 'wecom.customer_group', NULL, 'wecom', 'menu', '/wecom/customer-group', 'UserFilled', 3, 'active', 178),
(187, NULL, '查看客户群', 'wecom.customer_group.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 186),
(188, NULL, '导出客户群', 'wecom.customer_group.export', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 186),
(189, NULL, '同步客户群', 'wecom.customer_group.sync', NULL, 'wecom', 'action', NULL, NULL, 3, 'active', 186),
(190, NULL, '获客助手', 'wecom.acquisition', NULL, 'wecom', 'menu', '/wecom/acquisition', 'Promotion', 4, 'active', 178),
(191, NULL, '查看获客助手', 'wecom.acquisition.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 190),
(192, NULL, '创建获客链接', 'wecom.acquisition.create', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 190),
(193, NULL, '编辑获客链接', 'wecom.acquisition.edit', NULL, 'wecom', 'action', NULL, NULL, 3, 'active', 190),
(194, NULL, '删除获客链接', 'wecom.acquisition.delete', NULL, 'wecom', 'action', NULL, NULL, 4, 'active', 190),
(195, NULL, '活码管理', 'wecom.contact_way', NULL, 'wecom', 'menu', '/wecom/contact-way', 'Connection', 5, 'active', 178),
(196, NULL, '查看活码', 'wecom.contact_way.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 195),
(197, NULL, '创建活码', 'wecom.contact_way.create', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 195),
(198, NULL, '编辑活码', 'wecom.contact_way.edit', NULL, 'wecom', 'action', NULL, NULL, 3, 'active', 195),
(199, NULL, '删除活码', 'wecom.contact_way.delete', NULL, 'wecom', 'action', NULL, NULL, 4, 'active', 195),
(200, NULL, '会话存档', 'wecom.chat_archive', NULL, 'wecom', 'menu', '/wecom/chat-archive', 'ChatLineSquare', 6, 'active', 178),
(201, NULL, '查看会话存档', 'wecom.chat_archive.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 200),
(202, NULL, '查看全部存档', 'wecom.chat_archive.view_all', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 200),
(203, NULL, '导出会话记录', 'wecom.chat_archive.export', NULL, 'wecom', 'action', NULL, NULL, 3, 'active', 200),
(204, NULL, '微信客服', 'wecom.service', NULL, 'wecom', 'menu', '/wecom/service', 'Service', 7, 'active', 178),
(205, NULL, '查看微信客服', 'wecom.service.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 204),
(206, NULL, '配置微信客服', 'wecom.service.config', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 204),
(207, NULL, 'AI助手', 'wecom.ai_assistant', NULL, 'wecom', 'menu', '/wecom/ai-assistant', 'MagicStick', 8, 'active', 178),
(208, NULL, '查看AI助手', 'wecom.ai_assistant.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 207),
(209, NULL, '配置AI助手', 'wecom.ai_assistant.config', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 207),
(210, NULL, '侧边栏', 'wecom.sidebar', NULL, 'wecom', 'menu', '/wecom/sidebar', 'Operation', 9, 'active', 178),
(211, NULL, '查看侧边栏', 'wecom.sidebar.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 210),
(212, NULL, '配置侧边栏', 'wecom.sidebar.config', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 210),
(213, NULL, '对外收款', 'wecom.payment', NULL, 'wecom', 'menu', '/wecom/payment', 'Wallet', 10, 'active', 178),
(214, NULL, '查看收款记录', 'wecom.payment.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 213),
(215, NULL, '创建收款', 'wecom.payment.create', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 213),
(216, NULL, '导出收款记录', 'wecom.payment.export', NULL, 'wecom', 'action', NULL, NULL, 3, 'active', 213),
(217, NULL, '企微授权', 'wecom.config', NULL, 'wecom', 'menu', '/wecom/config', 'Setting', 11, 'active', 178),
(218, NULL, '查看授权配置', 'wecom.config.view', NULL, 'wecom', 'action', NULL, NULL, 1, 'active', 217),
(219, NULL, '编辑授权配置', 'wecom.config.edit', NULL, 'wecom', 'action', NULL, NULL, 2, 'active', 217),
-- 11.1 企微管理 - 标签选项卡权限
(300, NULL, '成员绑定', 'wecom.address_book.binding', '通讯录-成员绑定标签页', 'wecom', 'tab', NULL, NULL, 3, 'active', 179),
(301, NULL, '自动匹配', 'wecom.address_book.auto_match', '通讯录-自动匹配标签页', 'wecom', 'tab', NULL, NULL, 4, 'active', 179),
(302, NULL, '同步设置', 'wecom.address_book.sync_settings', '通讯录-同步设置标签页', 'wecom', 'tab', NULL, NULL, 5, 'active', 179),
(303, NULL, '同步日志', 'wecom.address_book.sync_logs', '通讯录-同步日志标签页', 'wecom', 'tab', NULL, NULL, 6, 'active', 179),
(304, NULL, '群模板', 'wecom.customer_group.template', '客户群-群模板标签页', 'wecom', 'tab', NULL, NULL, 4, 'active', 186),
(305, NULL, '入群欢迎语', 'wecom.customer_group.welcome', '客户群-入群欢迎语标签页', 'wecom', 'tab', NULL, NULL, 5, 'active', 186),
(306, NULL, '防骚扰规则', 'wecom.customer_group.anti_spam', '客户群-防骚扰规则标签页', 'wecom', 'tab', NULL, NULL, 6, 'active', 186),
(307, NULL, '群发消息', 'wecom.customer_group.broadcast', '客户群-群发消息标签页', 'wecom', 'tab', NULL, NULL, 7, 'active', 186),
(308, NULL, '群数据', 'wecom.customer_group.stats', '客户群-群数据标签页', 'wecom', 'tab', NULL, NULL, 8, 'active', 186),
(309, NULL, '数据总览', 'wecom.acquisition.overview', '获客助手-数据总览标签页', 'wecom', 'tab', NULL, NULL, 5, 'active', 190),
(310, NULL, '留存分析', 'wecom.acquisition.retention', '获客助手-留存分析标签页', 'wecom', 'tab', NULL, NULL, 6, 'active', 190),
(311, NULL, '成员排行', 'wecom.acquisition.ranking', '获客助手-成员排行标签页', 'wecom', 'tab', NULL, NULL, 7, 'active', 190),
(312, NULL, '标签管理', 'wecom.acquisition.tags', '获客助手-标签管理标签页', 'wecom', 'tab', NULL, NULL, 8, 'active', 190),
(313, NULL, '套餐与配额', 'wecom.acquisition.purchase', '获客助手-套餐与配额标签页', 'wecom', 'tab', NULL, NULL, 9, 'active', 190),
(314, NULL, '数据统计', 'wecom.contact_way.stats', '活码管理-数据统计标签页', 'wecom', 'tab', NULL, NULL, 5, 'active', 195),
(315, NULL, '渠道分析', 'wecom.contact_way.channel', '活码管理-渠道分析标签页', 'wecom', 'tab', NULL, NULL, 6, 'active', 195),
(316, NULL, '标签管理', 'wecom.contact_way.tags', '活码管理-标签管理标签页', 'wecom', 'tab', NULL, NULL, 7, 'active', 195),
(317, NULL, '消息记录', 'wecom.chat_archive.records', '会话存档-消息记录标签页', 'wecom', 'tab', NULL, NULL, 4, 'active', 200),
(318, NULL, '数据统计', 'wecom.chat_archive.stats', '会话存档-数据统计标签页', 'wecom', 'tab', NULL, NULL, 5, 'active', 200),
(319, NULL, 'AI质检', 'wecom.chat_archive.ai_inspect', '会话存档-AI质检标签页', 'wecom', 'tab', NULL, NULL, 6, 'active', 200),
(320, NULL, '敏感词管理', 'wecom.chat_archive.sensitive', '会话存档-敏感词管理标签页', 'wecom', 'tab', NULL, NULL, 7, 'active', 200),
(321, NULL, '存档设置', 'wecom.chat_archive.settings', '会话存档-存档设置标签页', 'wecom', 'tab', NULL, NULL, 8, 'active', 200),
(322, NULL, '套餐与配额', 'wecom.chat_archive.purchase', '会话存档-套餐与配额标签页', 'wecom', 'tab', NULL, NULL, 9, 'active', 200),
(323, NULL, '客服账号', 'wecom.service.accounts', '微信客服-客服账号标签页', 'wecom', 'tab', NULL, NULL, 3, 'active', 204),
(324, NULL, '实时工作台', 'wecom.service.workspace', '微信客服-实时工作台标签页', 'wecom', 'tab', NULL, NULL, 4, 'active', 204),
(325, NULL, '会话记录', 'wecom.service.sessions', '微信客服-会话记录标签页', 'wecom', 'tab', NULL, NULL, 5, 'active', 204),
(326, NULL, '数据统计', 'wecom.service.stats', '微信客服-数据统计标签页', 'wecom', 'tab', NULL, NULL, 6, 'active', 204),
(327, NULL, '快捷回复', 'wecom.service.replies', '微信客服-快捷回复标签页', 'wecom', 'tab', NULL, NULL, 7, 'active', 204),
(328, NULL, '自动回复', 'wecom.service.auto_reply', '微信客服-自动回复标签页', 'wecom', 'tab', NULL, NULL, 8, 'active', 204),
(329, NULL, 'AI配置', 'wecom.ai_assistant.model_config', 'AI助手-AI配置标签页', 'wecom', 'tab', NULL, NULL, 3, 'active', 207),
(330, NULL, '知识库', 'wecom.ai_assistant.knowledge', 'AI助手-知识库标签页', 'wecom', 'tab', NULL, NULL, 4, 'active', 207),
(331, NULL, '话术库', 'wecom.ai_assistant.scripts', 'AI助手-话术库标签页', 'wecom', 'tab', NULL, NULL, 5, 'active', 207),
(332, NULL, '敏感词库', 'wecom.ai_assistant.sensitive', 'AI助手-敏感词库标签页', 'wecom', 'tab', NULL, NULL, 6, 'active', 207),
(333, NULL, '标签AI', 'wecom.ai_assistant.tag_ai', 'AI助手-标签AI标签页', 'wecom', 'tab', NULL, NULL, 7, 'active', 207),
(334, NULL, '调用日志', 'wecom.ai_assistant.logs', 'AI助手-调用日志标签页', 'wecom', 'tab', NULL, NULL, 8, 'active', 207),
(335, NULL, '订单与使用量', 'wecom.ai_assistant.usage', 'AI助手-订单与使用量标签页', 'wecom', 'tab', NULL, NULL, 9, 'active', 207),
(336, NULL, '内置应用', 'wecom.sidebar.builtin', '侧边栏-内置应用标签页', 'wecom', 'tab', NULL, NULL, 3, 'active', 210),
(337, NULL, '自定义应用', 'wecom.sidebar.custom', '侧边栏-自定义应用标签页', 'wecom', 'tab', NULL, NULL, 4, 'active', 210),
(338, NULL, '快捷话术', 'wecom.sidebar.scripts', '侧边栏-快捷话术标签页', 'wecom', 'tab', NULL, NULL, 5, 'active', 210),
(339, NULL, '收款统计', 'wecom.payment.stats', '对外收款-收款统计标签页', 'wecom', 'tab', NULL, NULL, 4, 'active', 213),
(340, NULL, '退款统计', 'wecom.payment.refund', '对外收款-退款统计标签页', 'wecom', 'tab', NULL, NULL, 5, 'active', 213),
(341, NULL, '收款设置', 'wecom.payment.settings', '对外收款-收款设置标签页', 'wecom', 'tab', NULL, NULL, 6, 'active', 213),
(342, NULL, 'Secret管理', 'wecom.config.secret', '企微授权-Secret管理标签页', 'wecom', 'tab', NULL, NULL, 3, 'active', 217),
(343, NULL, '回调配置', 'wecom.config.callback', '企微授权-回调配置标签页', 'wecom', 'tab', NULL, NULL, 4, 'active', 217),
(344, NULL, '功能授权', 'wecom.config.feature', '企微授权-功能授权标签页', 'wecom', 'tab', NULL, NULL, 5, 'active', 217),
(345, NULL, 'API诊断', 'wecom.config.diagnostic', '企微授权-API诊断标签页', 'wecom', 'tab', NULL, NULL, 6, 'active', 217),
(346, NULL, '企微套餐', 'wecom.config.package', '企微授权-企微套餐标签页', 'wecom', 'tab', NULL, NULL, 7, 'active', 217),
-- 12. 系统管理
(220, NULL, '系统管理', 'system', '系统管理模块', 'system', 'module', '/system', 'Setting', 11, 'active', NULL),
(221, NULL, '部门管理', 'system.departments', NULL, 'system', 'menu', '/system/departments', 'OfficeBuilding', 1, 'active', 220),
(222, NULL, '查看部门', 'system.departments.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 221),
(223, NULL, '创建部门', 'system.departments.create', NULL, 'system', 'action', NULL, NULL, 2, 'active', 221),
(224, NULL, '编辑部门', 'system.departments.edit', NULL, 'system', 'action', NULL, NULL, 3, 'active', 221),
(225, NULL, '删除部门', 'system.departments.delete', NULL, 'system', 'action', NULL, NULL, 4, 'active', 221),
(226, NULL, '管理成员', 'system.departments.members', NULL, 'system', 'action', NULL, NULL, 5, 'active', 221),
(227, NULL, '用户管理', 'system.users', NULL, 'system', 'menu', '/system/users', 'User', 2, 'active', 220),
(228, NULL, '查看用户', 'system.users.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 227),
(229, NULL, '创建用户', 'system.users.create', NULL, 'system', 'action', NULL, NULL, 2, 'active', 227),
(230, NULL, '编辑用户', 'system.users.edit', NULL, 'system', 'action', NULL, NULL, 3, 'active', 227),
(231, NULL, '删除用户', 'system.users.delete', NULL, 'system', 'action', NULL, NULL, 4, 'active', 227),
(232, NULL, '重置密码', 'system.users.reset_password', NULL, 'system', 'action', NULL, NULL, 5, 'active', 227),
(233, NULL, '导出用户', 'system.users.export', NULL, 'system', 'action', NULL, NULL, 6, 'active', 227),
(234, NULL, '导入用户', 'system.users.import', NULL, 'system', 'action', NULL, NULL, 7, 'active', 227),
(235, NULL, '角色权限', 'system.roles', NULL, 'system', 'menu', '/system/roles', 'Key', 3, 'active', 220),
(236, NULL, '查看角色', 'system.roles.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 235),
(237, NULL, '创建角色', 'system.roles.create', NULL, 'system', 'action', NULL, NULL, 2, 'active', 235),
(238, NULL, '编辑角色', 'system.roles.edit', NULL, 'system', 'action', NULL, NULL, 3, 'active', 235),
(239, NULL, '删除角色', 'system.roles.delete', NULL, 'system', 'action', NULL, NULL, 4, 'active', 235),
(240, NULL, '分配权限', 'system.roles.assign_permissions', NULL, 'system', 'action', NULL, NULL, 5, 'active', 235),
(241, NULL, '权限管理', 'system.permissions', NULL, 'system', 'menu', '/system/permissions', 'Lock', 4, 'active', 220),
(242, NULL, '查看权限', 'system.permissions.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 241),
(243, NULL, '编辑权限', 'system.permissions.edit', NULL, 'system', 'action', NULL, NULL, 2, 'active', 241),
(244, NULL, '超管面板', 'system.super_admin_panel', NULL, 'system', 'menu', '/system/super-admin-panel', 'Monitor', 5, 'active', 220),
(245, NULL, '查看面板', 'system.super_admin_panel.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 244),
(246, NULL, '管理系统', 'system.super_admin_panel.manage', NULL, 'system', 'action', NULL, NULL, 2, 'active', 244),
(247, NULL, '客服管理', 'system.customer_service_permissions', NULL, 'system', 'menu', '/system/customer-service-permissions', 'Service', 6, 'active', 220),
(248, NULL, '查看客服', 'system.customer_service_permissions.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 247),
(249, NULL, '管理客服', 'system.customer_service_permissions.manage', NULL, 'system', 'action', NULL, NULL, 2, 'active', 247),
(250, NULL, '消息管理', 'system.message_management', NULL, 'system', 'menu', '/system/message-management', 'Bell', 7, 'active', 220),
(251, NULL, '查看消息', 'system.message_management.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 250),
(252, NULL, '发送消息', 'system.message_management.send', NULL, 'system', 'action', NULL, NULL, 2, 'active', 250),
(253, NULL, '管理消息', 'system.message_management.manage', NULL, 'system', 'action', NULL, NULL, 3, 'active', 250),
(254, NULL, '系统设置', 'system.settings', NULL, 'system', 'menu', '/system/settings', 'Tools', 8, 'active', 220),
(255, NULL, '查看设置', 'system.settings.view', NULL, 'system', 'action', NULL, NULL, 1, 'active', 254),
(256, NULL, '修改设置', 'system.settings.edit', NULL, 'system', 'action', NULL, NULL, 2, 'active', 254);

-- 32. 角色权限关联表
DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `roleId` VARCHAR(50) NOT NULL COMMENT '角色ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `permissionId` INT NOT NULL COMMENT '权限ID',
  PRIMARY KEY (`roleId`, `permissionId`),
  INDEX `idx_role` (`roleId`),
  INDEX `idx_permission` (`permissionId`),
  INDEX `idx_role_permissions_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 33. 权限树形结构闭包表（TypeORM closure-table需要）
DROP TABLE IF EXISTS `permissions_closure`;
CREATE TABLE `permissions_closure` (
  `id_ancestor` INT NOT NULL COMMENT '祖先权限ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `id_descendant` INT NOT NULL COMMENT '后代权限ID',
  PRIMARY KEY (`id_ancestor`, `id_descendant`),
  INDEX `idx_ancestor` (`id_ancestor`),
  INDEX `idx_descendant` (`id_descendant`),
  INDEX `idx_permissions_closure_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限树形结构闭包表';

-- 34. 用户个人权限表
DROP TABLE IF EXISTS `user_permissions`;
CREATE TABLE `user_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '权限ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `userId` INT NOT NULL COMMENT '用户ID',
  `permissionId` INT NOT NULL COMMENT '权限ID',
  `grantedBy` INT NULL COMMENT '授权人ID',
  `reason` TEXT NULL COMMENT '授权原因',
  `grantedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
  INDEX `idx_user` (`userId`),
  INDEX `idx_permission` (`permissionId`),
  INDEX `idx_granted_by` (`grantedBy`),
  INDEX `idx_user_permissions_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户个人权限表';

-- 35. 物流状态配置表
DROP TABLE IF EXISTS `logistics_status`;
CREATE TABLE `logistics_status` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '状态ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(50) NOT NULL COMMENT '状态名称',
  `color` VARCHAR(7) DEFAULT '#28a745' COMMENT '状态颜色',
  `description` TEXT NULL COMMENT '状态描述',
  `isActive` BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_name` (`name`),
  INDEX `idx_is_active` (`isActive`),
  INDEX `idx_logistics_status_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流状态配置表';

-- 36. 物流跟踪表
DROP TABLE IF EXISTS `logistics_tracking`;
CREATE TABLE `logistics_tracking` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '跟踪ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_next_sync_time` (`nextSyncTime`),
  INDEX `idx_logistics_tracking_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流跟踪表';

-- 37. 物流轨迹表
DROP TABLE IF EXISTS `logistics_traces`;
CREATE TABLE `logistics_traces` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '轨迹ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_status` (`status`),
  INDEX `idx_logistics_traces_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流轨迹表';

-- 38. 订单明细表
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '明细ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_product` (`productId`),
  INDEX `idx_order_items_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细表';

-- 36. 订单状态历史表
DROP TABLE IF EXISTS `order_status_history`;
CREATE TABLE `order_status_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '历史ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `orderId` VARCHAR(50) NOT NULL COMMENT '订单ID（UUID格式）',
  `status` VARCHAR(50) NOT NULL COMMENT '状态',
  `notes` TEXT NULL COMMENT '状态变更备注',
  `operatorId` INT NULL COMMENT '操作人ID',
  `operatorName` VARCHAR(50) NULL COMMENT '操作人姓名',
  `operator_department` VARCHAR(100) NULL COMMENT '操作人部门',
  `action_type` VARCHAR(50) NULL COMMENT '操作类型：create/edit/submit_audit/audit_approve/audit_reject/cancel_approve/cancel_reject/status_change',
  `change_detail` TEXT NULL COMMENT '变更详情JSON',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_order` (`orderId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_operator` (`operatorId`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_action_type` (`action_type`),
  INDEX `idx_order_status_history_tenant_id` (`tenant_id`)
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
  INDEX `idx_active` (`isActive`),
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  INDEX `idx_rejection_reasons_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='拒绝原因表';

-- 40. 业绩指标表
DROP TABLE IF EXISTS `performance_metrics`;
CREATE TABLE `performance_metrics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '指标ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `userId` VARCHAR(100) NOT NULL COMMENT '用户ID',
  `metricType` VARCHAR(50) NOT NULL COMMENT '指标类型',
  `value` DECIMAL(10,2) NOT NULL COMMENT '指标值',
  `date` DATE NOT NULL COMMENT '日期',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user` (`userId`),
  INDEX `idx_type` (`metricType`),
  INDEX `idx_date` (`date`),
  INDEX `idx_performance_metrics_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩指标表';

-- 41. 消息表
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '消息ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`createdAt`),
  INDEX `idx_messages_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息表';

-- 42. 消息订阅表
DROP TABLE IF EXISTS `message_subscriptions`;
CREATE TABLE `message_subscriptions` (
  `id` CHAR(36) PRIMARY KEY COMMENT '订阅ID(UUID)',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_enabled` (`isGlobalEnabled`),
  INDEX `idx_message_subscriptions_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息订阅表';

-- 43. 部门订阅配置表
DROP TABLE IF EXISTS `department_subscription_configs`;
CREATE TABLE `department_subscription_configs` (
  `id` CHAR(36) PRIMARY KEY COMMENT '配置ID(UUID)',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `messageType` VARCHAR(50) NOT NULL COMMENT '消息类型',
  `departmentId` VARCHAR(50) NOT NULL COMMENT '部门ID',
  `isEnabled` BOOLEAN DEFAULT FALSE COMMENT '是否启用',
  `notificationMethods` JSON NULL COMMENT '通知方式',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_type` (`messageType`),
  INDEX `idx_department` (`departmentId`),
  INDEX `idx_enabled` (`isEnabled`),
  INDEX `idx_department_subscription_configs_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门订阅配置表';

-- 44. 系统日志表
DROP TABLE IF EXISTS `logs`;
CREATE TABLE `logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `level` VARCHAR(50) NOT NULL COMMENT '日志级别',
  `message` TEXT NOT NULL COMMENT '日志消息',
  `meta` TEXT NULL COMMENT '元数据',
  `userId` VARCHAR(100) NULL COMMENT '用户ID',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_level` (`level`),
  INDEX `idx_user` (`userId`),
  INDEX `idx_created_at` (`createdAt`),
  INDEX `idx_logs_tenant_id` (`tenant_id`)
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
  INDEX `idx_target_date` (`targetDate`),
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  INDEX `idx_improvement_goals_tenant` (`tenant_id`)
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

-- 插入默认角色（permissions字段与permissions表code完全对应）
INSERT INTO `roles` (`id`, `name`, `code`, `description`, `permissions`, `data_scope`, `user_count`, `role_type`, `is_template`) VALUES
('super_admin', '超级管理员', 'super_admin', '拥有系统所有权限', JSON_ARRAY('*'), 'all', 1, 'system', FALSE),
('admin', '管理员', 'admin', '拥有系统所有权限', JSON_ARRAY('*'), 'all', 1, 'system', FALSE),
('department_manager', '部门经理', 'department_manager', '管理本部门业务和团队', JSON_ARRAY('dashboard', 'dashboard.view', 'dashboard.export', 'customer', 'customer.list', 'customer.list.view', 'customer.list.edit', 'customer.list.export', 'customer.list.import', 'customer.add', 'customer.add.create', 'order', 'order.list', 'order.list.view', 'order.list.edit', 'order.add', 'order.add.create', 'order.cod_application', 'order.cod_application.view', 'order.cod_application.create', 'communication', 'communication.call', 'communication.call.view', 'communication.call.make', 'communication.call.record', 'performance', 'performance.personal', 'performance.personal.view', 'performance.team', 'performance.team.view', 'performance.analysis', 'performance.analysis.view', 'performance.share', 'performance.share.view', 'logistics', 'logistics.list', 'logistics.list.view', 'logistics.track', 'logistics.track.view', 'aftersale', 'aftersale.list', 'aftersale.list.view', 'aftersale.add', 'aftersale.add.create', 'aftersale.data', 'aftersale.data.view', 'data', 'data.search', 'data.search.basic', 'data.search.advanced', 'finance', 'finance.performance_data', 'finance.performance_data.view', 'wecom', 'wecom.customer', 'wecom.customer.view', 'wecom.customer_group', 'wecom.customer_group.view', 'wecom.chat_archive', 'wecom.chat_archive.view', 'wecom.acquisition', 'wecom.acquisition.view', 'wecom.acquisition.create', 'wecom.acquisition.edit', 'wecom.acquisition.delete', 'wecom.contact_way', 'wecom.contact_way.view', 'wecom.contact_way.create', 'wecom.contact_way.edit', 'wecom.contact_way.delete'), 'department', 1, 'system', FALSE),
('sales_staff', '销售员', 'sales_staff', '专注于客户开发和订单管理', JSON_ARRAY('dashboard', 'dashboard.view', 'customer', 'customer.list', 'customer.list.view', 'customer.add', 'customer.add.create', 'order', 'order.list', 'order.list.view', 'order.list.edit', 'order.add', 'order.add.create', 'order.cod_application', 'order.cod_application.view', 'order.cod_application.create', 'communication', 'communication.call', 'communication.call.view', 'communication.call.make', 'performance', 'performance.personal', 'performance.personal.view', 'performance.team', 'performance.team.view', 'logistics', 'logistics.list', 'logistics.list.view', 'logistics.track', 'logistics.track.view', 'aftersale', 'aftersale.list', 'aftersale.list.view', 'aftersale.add', 'aftersale.add.create', 'data', 'data.search', 'data.search.basic', 'finance', 'finance.performance_data', 'finance.performance_data.view', 'wecom', 'wecom.customer', 'wecom.customer.view', 'wecom.customer_group', 'wecom.customer_group.view', 'wecom.chat_archive', 'wecom.chat_archive.view'), 'self', 1, 'system', FALSE),
('customer_service', '客服', 'customer_service', '处理订单、物流和售后服务', JSON_ARRAY('dashboard', 'dashboard.view', 'order', 'order.audit', 'order.audit.view', 'order.audit.approve', 'order.audit.reject', 'logistics', 'logistics.list', 'logistics.list.view', 'logistics.shipping', 'logistics.shipping.view', 'logistics.shipping.create', 'logistics.track', 'logistics.track.view', 'logistics.track.update', 'logistics.status', 'logistics.status.view', 'logistics.status.update', 'aftersale', 'aftersale.list', 'aftersale.list.view', 'aftersale.list.edit', 'aftersale.list.delete', 'aftersale.list.export', 'aftersale.add', 'aftersale.add.create', 'aftersale.data', 'aftersale.data.view', 'aftersale.data.export', 'data', 'data.list', 'data.list.view', 'data.search', 'data.search.basic', 'data.search.advanced'), 'self', 1, 'system', FALSE);

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
('websiteUrl', 'https://yunkes.com', 'string', 'basic_settings', '网站地址', TRUE, TRUE, 6),
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
('lc-009', 'DBL', '德邦快递', '德邦', NULL, 'https://www.deppon.com', 'https://www.deppon.com/tracking/{trackingNo}', '95353', 'inactive', 9, '德邦快递（需开通合作）')
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

-- 插入默认短信额度套餐数据（v1.8.0 新增）
INSERT INTO `sms_quota_packages` (`id`, `name`, `sms_count`, `price`, `unit_price`, `description`, `sort_order`, `is_enabled`) VALUES
('pkg-sms-001', '体验包', 100, 5.00, 0.0500, '适合小规模测试使用', 1, 1),
('pkg-sms-002', '基础包', 500, 22.50, 0.0450, '适合小团队日常使用', 2, 1),
('pkg-sms-003', '标准包', 2000, 80.00, 0.0400, '适合中型企业日常营销', 3, 1),
('pkg-sms-004', '旗舰包', 10000, 350.00, 0.0350, '适合大批量短信营销推广', 4, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `sms_count` = VALUES(`sms_count`),
  `price` = VALUES(`price`),
  `unit_price` = VALUES(`unit_price`),
  `updated_at` = CURRENT_TIMESTAMP;

-- 预设短信模板（全员全租户可用，is_preset=1, tenant_id=NULL）
INSERT INTO `sms_templates` (`id`, `name`, `category`, `content`, `variables`, `description`, `status`, `is_preset`, `tenant_id`, `applicant`, `applicant_name`, `applicant_dept`, `created_at`, `updated_at`) VALUES
(UUID(), '发货通知', '物流通知', '【{companyName}】尊敬的{customerName}，您的订单{orderNo}已发货，快递：{expressCompany}，单号：{trackingNo}，请留意查收。如有疑问请联系客服{servicePhone}。', '["companyName","customerName","orderNo","expressCompany","trackingNo","servicePhone"]', '订单发货后通知客户物流信息', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '签收通知', '物流通知', '【{companyName}】尊敬的{customerName}，您的订单{orderNo}已签收。如有任何问题，请在7天内联系客服{servicePhone}，祝您使用愉快！', '["companyName","customerName","orderNo","servicePhone"]', '快递签收后通知客户确认收货', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '退款成功通知', '订单通知', '【{companyName}】尊敬的{customerName}，您的退款申请已处理完成，退款金额¥{refundAmount}将在1-3个工作日退回原支付账户。订单号：{orderNo}。', '["companyName","customerName","refundAmount","orderNo"]', '退款审核通过后通知客户', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '订单确认通知', '订单通知', '【{companyName}】尊敬的{customerName}，您的订单{orderNo}已确认，金额¥{amount}，我们将尽快为您安排发货，预计{deliveryDate}前发出。', '["companyName","customerName","orderNo","amount","deliveryDate"]', '订单确认后通知客户', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '付款提醒', '订单通知', '【{companyName}】尊敬的{customerName}，您的订单{orderNo}（¥{amount}）尚未支付，请于{payDeadline}前完成付款，逾期订单将自动取消。', '["companyName","customerName","orderNo","amount","payDeadline"]', '提醒客户尽快完成未支付订单', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '售后处理完成通知', '售后服务', '【{companyName}】尊敬的{customerName}，您的售后工单{ticketNo}已处理完成，处理方案：{solution}。如有疑问请致电{servicePhone}。', '["companyName","customerName","ticketNo","solution","servicePhone"]', '售后工单处理完毕后通知客户', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '售后受理通知', '售后服务', '【{companyName}】尊敬的{customerName}，您的售后申请已受理，工单号：{ticketNo}，我们将在{processTime}内为您处理，请耐心等待。', '["companyName","customerName","ticketNo","processTime"]', '售后申请提交后通知客户已受理', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '服务电话预通知', '电话服务', '【{companyName}】尊敬的{customerName}，我司客服{staffName}将于{callTime}致电为您服务，届时来电号码{callerPhone}，请您留意接听。', '["companyName","customerName","staffName","callTime","callerPhone"]', '提前通知客户即将有服务电话，提高接听率', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '未接来电回拨提醒', '电话服务', '【{companyName}】尊敬的{customerName}，我们刚致电给您未能接通，如看到来电{callerPhone}请回拨，或联系客服{servicePhone}，我们将竭诚为您服务。', '["companyName","customerName","callerPhone","servicePhone"]', '电话未接通时发送短信提醒客户回拨', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '生日祝福', '客户关怀', '【{companyName}】亲爱的{customerName}，今天是您的生日！祝您生日快乐！为您送上{couponAmount}元生日专属优惠券，券码：{couponCode}，有效期至{couponExpiry}。回T退订', '["companyName","customerName","couponAmount","couponCode","couponExpiry"]', '客户生日当天发送祝福及优惠券', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '活动营销通知', '营销推广', '【{companyName}】尊敬的{customerName}，{activityName}火热进行中！{activityContent}，活动时间{startDate}至{endDate}，不要错过哦！详询{servicePhone}。回T退订', '["companyName","customerName","activityName","activityContent","startDate","endDate","servicePhone"]', '通知客户参与促销活动', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '活动福利通知', '营销推广', '【{companyName}】尊敬的{customerName}，专属福利来啦！{benefitContent}，限时领取截止{endDate}，点击{activityLink}立即参与！回T退订', '["companyName","customerName","benefitContent","endDate","activityLink"]', '向客户推送专属福利通知', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '商品折扣通知', '营销推广', '【{companyName}】尊敬的{customerName}，您关注的{productName}限时{discount}折优惠！原价¥{originalPrice}，现价仅¥{currentPrice}，活动截止{endDate}，先到先得！回T退订', '["companyName","customerName","productName","discount","originalPrice","currentPrice","endDate"]', '通知客户关注商品的折扣信息', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '新品上架通知', '营销推广', '【{companyName}】尊敬的{customerName}，新品{productName}已上架！{productDesc}，首发价¥{price}，详询{servicePhone}。回T退订', '["companyName","customerName","productName","productDesc","price","servicePhone"]', '新品上架时通知目标客户', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '客户回访提醒', '客户关怀', '【{companyName}】尊敬的{customerName}，感谢您的信赖！为了更好地服务您，我们的客服{staffName}将于近日回访，请您留意来电{callerPhone}。', '["companyName","customerName","staffName","callerPhone"]', '定期客户回访前发送预通知', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '客户到期续费提醒', '客户关怀', '【{companyName}】尊敬的{customerName}，您的{serviceName}将于{expireDate}到期，为确保服务不中断，请及时续费。续费咨询{servicePhone}。', '["companyName","customerName","serviceName","expireDate","servicePhone"]', '服务即将到期时提醒客户续费', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '预约确认通知', '客户关怀', '【{companyName}】尊敬的{customerName}，您已成功预约{serviceName}，时间：{appointmentDate} {appointmentTime}，地点：{location}。如需改约请联系{servicePhone}。', '["companyName","customerName","serviceName","appointmentDate","appointmentTime","location","servicePhone"]', '服务预约确认通知', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '验证码', '系统通知', '【{companyName}】您的验证码是{code}，{minutes}分钟内有效，请勿告知他人。如非本人操作请忽略。', '["companyName","code","minutes"]', '系统验证码发送', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW()),
(UUID(), '账户异常提醒', '系统通知', '【{companyName}】尊敬的{customerName}，您的账户在{loginTime}存在异常操作，如非本人操作请立即修改密码或联系客服{servicePhone}。', '["companyName","customerName","loginTime","servicePhone"]', '账户异常登录时通知客户', 'active', 1, NULL, 'system', '系统预设', '平台运营', NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `updated_at` = NOW();

-- 30. 部门下单限制配置表
DROP TABLE IF EXISTS `department_order_limits`;
CREATE TABLE `department_order_limits` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '配置ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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

  -- 索引（同一租户同一部门唯一）
  UNIQUE INDEX `idx_tenant_department` (`tenant_id`, `department_id`),
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门下单限制配置表';

-- 47. 售后服务跟进记录表
DROP TABLE IF EXISTS `service_follow_up_records`;
CREATE TABLE `service_follow_up_records` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '跟进记录ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_by_id` (`created_by_id`),
  INDEX `idx_service_follow_up_records_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后服务跟进记录表';

-- 48. 售后服务操作记录表
DROP TABLE IF EXISTS `service_operation_logs`;
CREATE TABLE `service_operation_logs` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '操作记录ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_service_operation_logs_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后服务操作记录表';

-- 注：系统消息表(system_messages)定义在下方"通知渠道模块"区域

-- 26. 系统公告表
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '公告ID',
   `tenant_id` VARCHAR(36) NULL DEFAULT NULL COMMENT '租户ID（公司公告属于租户，系统公告为NULL）',
  `source` VARCHAR(20) NOT NULL DEFAULT 'company' COMMENT '公告来源: system=系统公告, company=公司公告',
  `title` VARCHAR(200) NOT NULL COMMENT '公告标题',
  `content` TEXT NOT NULL COMMENT '公告内容',
  `type` VARCHAR(50) DEFAULT 'notice' COMMENT '公告类型: notice/update/maintenance/promotion',
  `priority` VARCHAR(20) DEFAULT 'normal' COMMENT '优先级: low/normal/high/urgent',
  `status` VARCHAR(20) DEFAULT 'draft' COMMENT '状态: draft/published/archived',
  `target_roles` JSON COMMENT '目标角色列表，为空表示所有人',
  `target_departments` JSON COMMENT '目标部门列表，为空表示所有部门',
  `target_tenants` JSON NULL DEFAULT NULL COMMENT '目标租户列表（系统公告用，NULL=全部租户）',
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
  INDEX `idx_announcements_source` (`source`),
  INDEX `idx_announcements_status` (`status`),
  INDEX `idx_announcements_type` (`type`),
  INDEX `idx_announcements_created_at` (`created_at`),
  INDEX `idx_announcements_published_at` (`published_at`),
  INDEX `idx_announcements_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统公告表';

-- 27. 公告阅读记录表
DROP TABLE IF EXISTS `announcement_reads`;
CREATE TABLE `announcement_reads` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `announcement_id` VARCHAR(36) NOT NULL COMMENT '公告ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID，与users表id类型一致',
  `read_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '阅读时间',
  UNIQUE KEY `uk_announcement_user` (`announcement_id`, `user_id`),
  INDEX `idx_announcement_id` (`announcement_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_announcement_reads_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_announcement_reads_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_announcement_reads_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告阅读记录表';

-- 27.1 消息已读状态表（记录每个用户对每条消息的独立已读状态）
DROP TABLE IF EXISTS `message_read_status`;
CREATE TABLE `message_read_status` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `message_id` VARCHAR(36) NOT NULL COMMENT '消息ID',
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `read_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '阅读时间',
  UNIQUE KEY `uk_message_user` (`message_id`, `user_id`),
  INDEX `idx_message_id` (`message_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_message_read_status_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息已读状态表';

-- 28. 系统消息表
DROP TABLE IF EXISTS `system_messages`;
CREATE TABLE `system_messages` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '消息ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_system_messages_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统消息表';

-- 29. 通知渠道配置表
DROP TABLE IF EXISTS `notification_channels`;
CREATE TABLE `notification_channels` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_notification_channels_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知渠道配置表';

-- 30. 通知发送记录表
DROP TABLE IF EXISTS `notification_logs`;
CREATE TABLE `notification_logs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_notification_logs_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知发送记录表';

-- 31. 业绩消息配置表
DROP TABLE IF EXISTS `performance_report_configs`;
CREATE TABLE `performance_report_configs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_performance_report_configs_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业绩消息配置表';

-- 32. 业绩消息发送记录表
DROP TABLE IF EXISTS `performance_report_logs`;
CREATE TABLE `performance_report_logs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '记录ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_status` (`status`),
  INDEX `idx_performance_report_logs_tenant_id` (`tenant_id`)
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
  INDEX `idx_cleanup_type` (`cleanup_type`),
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  INDEX `idx_message_cleanup_history_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息清理历史表';

-- =============================================
-- 外呼系统扩展表 (v1.8.2)
-- =============================================

-- 全局外呼配置表 (管理员配置)
DROP TABLE IF EXISTS `global_call_config`;
CREATE TABLE `global_call_config` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `config_key` VARCHAR(50) NOT NULL COMMENT '配置键',
  `config_value` TEXT COMMENT '配置值',
  `config_type` VARCHAR(20) DEFAULT 'string' COMMENT '配置类型: string/json/number/boolean',
  `description` VARCHAR(255) COMMENT '配置说明',
  `updated_by` VARCHAR(50) COMMENT '最后更新人',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  UNIQUE INDEX `idx_config_key_tenant` (`config_key`, `tenant_id`),
  INDEX `idx_global_call_config_tenant` (`tenant_id`)
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
  INDEX `idx_is_active` (`is_active`),
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  INDEX `idx_user_line_assignments_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户线路分配表';

-- 设备绑定操作日志表
DROP TABLE IF EXISTS `device_bindlogs`;
CREATE TABLE `device_bindlogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_device_bindlogs_tenant_id` (`tenant_id`)
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
  INDEX `idx_status` (`status`),
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  INDEX `idx_device_bind_logs_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备绑定日志表';

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
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID（NULL表示全局预设，对所有租户可见）',
  `label` VARCHAR(100) NOT NULL COMMENT '显示名称',
  `value` VARCHAR(50) NOT NULL COMMENT '选项值',
  `sort_order` INT DEFAULT 0 COMMENT '排序顺序',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `is_system` TINYINT(1) DEFAULT 0 COMMENT '是否系统预设（不可删除）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_tenant_id` (`tenant_id`),
  UNIQUE INDEX `idx_tenant_value` (`tenant_id`, `value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付方式配置表';

-- 插入预设支付方式（tenant_id=NULL 表示全局预设，所有租户可见）
INSERT INTO `payment_method_options` (`id`, `tenant_id`, `label`, `value`, `sort_order`, `is_enabled`, `is_system`) VALUES
('pm_wechat', NULL, '微信支付', 'wechat', 1, 1, 1),
('pm_alipay', NULL, '支付宝支付', 'alipay', 2, 1, 1),
('pm_bank', NULL, '银行转账', 'bank_transfer', 3, 1, 1),
('pm_unionpay', NULL, '云闪付', 'unionpay', 4, 1, 1),
('pm_cod', NULL, '货到付款', 'cod', 5, 1, 1),
('pm_other', NULL, '其他', 'other', 6, 1, 1)
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
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `customer_service_type` VARCHAR(30) NOT NULL DEFAULT 'general' COMMENT '客服类型: after_sales售后, audit审核, logistics物流, product商品, finance财务, general通用',
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
  UNIQUE INDEX `idx_tenant_user` (`tenant_id`, `user_id`),
  INDEX `idx_tenant_id` (`tenant_id`),
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
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID（NULL表示全局默认）',
  `info_type` VARCHAR(50) NOT NULL COMMENT '敏感信息类型: phone, id_card, email, wechat, address, bank, financial',
  `role_code` VARCHAR(50) NOT NULL COMMENT '角色代码: super_admin, admin, department_manager, sales_staff, customer_service',
  `has_permission` TINYINT(1) DEFAULT 0 COMMENT '是否有权限: 0无权限, 1有权限',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE INDEX `idx_tenant_info_role` (`tenant_id`, `info_type`, `role_code`),
  INDEX `idx_sip_tenant_id` (`tenant_id`),
  INDEX `idx_sip_info_type` (`info_type`),
  INDEX `idx_sip_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感信息权限配置表';

-- 插入敏感信息权限默认配置（全局默认：超级管理员和管理员有全部权限，tenant_id=NULL）
INSERT INTO `sensitive_info_permissions` (`tenant_id`, `info_type`, `role_code`, `has_permission`) VALUES
(NULL, 'phone', 'super_admin', 1), (NULL, 'phone', 'admin', 1), (NULL, 'phone', 'department_manager', 0), (NULL, 'phone', 'sales_staff', 0), (NULL, 'phone', 'customer_service', 0),
(NULL, 'id_card', 'super_admin', 1), (NULL, 'id_card', 'admin', 1), (NULL, 'id_card', 'department_manager', 0), (NULL, 'id_card', 'sales_staff', 0), (NULL, 'id_card', 'customer_service', 0),
(NULL, 'email', 'super_admin', 1), (NULL, 'email', 'admin', 1), (NULL, 'email', 'department_manager', 0), (NULL, 'email', 'sales_staff', 0), (NULL, 'email', 'customer_service', 0),
(NULL, 'wechat', 'super_admin', 1), (NULL, 'wechat', 'admin', 1), (NULL, 'wechat', 'department_manager', 0), (NULL, 'wechat', 'sales_staff', 0), (NULL, 'wechat', 'customer_service', 0),
(NULL, 'address', 'super_admin', 1), (NULL, 'address', 'admin', 1), (NULL, 'address', 'department_manager', 0), (NULL, 'address', 'sales_staff', 0), (NULL, 'address', 'customer_service', 0),
(NULL, 'bank', 'super_admin', 1), (NULL, 'bank', 'admin', 1), (NULL, 'bank', 'department_manager', 0), (NULL, 'bank', 'sales_staff', 0), (NULL, 'bank', 'customer_service', 0),
(NULL, 'financial', 'super_admin', 1), (NULL, 'financial', 'admin', 1), (NULL, 'financial', 'department_manager', 0), (NULL, 'financial', 'sales_staff', 0), (NULL, 'financial', 'customer_service', 0)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- =============================================
-- 通话记录测试数据
-- =============================================
INSERT INTO `call_records` (`id`, `customer_id`, `customer_name`, `customer_phone`, `call_type`, `call_status`, `start_time`, `end_time`, `duration`, `has_recording`, `notes`, `follow_up_required`, `user_id`, `user_name`, `department`) VALUES
('call_1734567890_001', 'cust_001', '王磊', '18231431086', 'outbound', 'connected', DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 55 MINUTE), 300, 1, '客户咨询产品价格', 0, 'admin', '管理员', '销售部'),
('call_1734567890_002', 'cust_002', '王小雨', '15287985214', 'outbound', 'connected', DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 110 MINUTE), 600, 1, '售后问题处理', 1, 'admin', '管理员', '客服部'),
('call_1734567890_003', 'cust_003', '单芳波', '13736053045', 'inbound', 'missed', DATE_SUB(NOW(), INTERVAL 3 HOUR), NULL, 0, 0, '未接听', 1, 'admin', '管理员', '销售部'),
('call_1734567890_004', 'cust_004', '贾将富', '13407722936', 'outbound', 'connected', DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 225 MINUTE), 900, 1, '新客户开发', 0, 'admin', '管理员', '销售部')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 跟进记录测试数据
INSERT INTO `follow_up_records` (`id`, `call_id`, `customer_id`, `customer_name`, `follow_up_type`, `content`, `next_follow_up_date`, `priority`, `status`, `user_id`, `user_name`) VALUES
('followup_001', 'call_1734567890_002', 'cust_002', '王小雨', 'call', '客户反馈产品使用问题，需要技术支持跟进', DATE_ADD(NOW(), INTERVAL 1 DAY), 'high', 'pending', 'admin', '管理员'),
('followup_002', 'call_1734567890_003', 'cust_003', '单芳波', 'call', '未接听，需要回拨', DATE_ADD(NOW(), INTERVAL 2 HOUR), 'urgent', 'pending', 'admin', '管理员')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 外呼线路默认数据
INSERT INTO `call_lines` (`name`, `provider`, `caller_number`, `status`, `max_concurrent`, `daily_limit`, `sort_order`, `remark`) VALUES
('默认线路', 'system', '', 'active', 10, 1000, 1, '系统默认外呼线路'),
('阿里云通信', 'aliyun', '', 'inactive', 20, 2000, 2, '阿里云语音通话服务'),
('腾讯云通信', 'tencent', '', 'inactive', 20, 2000, 3, '腾讯云语音通话服务')
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

-- 注：device_bindlogs 设备绑定日志表已在上方"外呼系统扩展表"区域定义

-- API调用日志表（匹配 ApiCallLog 实体）
DROP TABLE IF EXISTS `api_call_logs`;
CREATE TABLE `api_call_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '日志ID',
  `api_config_id` VARCHAR(36) NULL COMMENT 'API配置ID',
  `api_key` VARCHAR(100) NULL COMMENT 'API密钥',
  `endpoint` VARCHAR(255) NOT NULL COMMENT '调用端点',
  `method` VARCHAR(10) NOT NULL COMMENT '请求方法',
  `request_params` TEXT NULL COMMENT '请求参数',
  `response_status` INT NULL COMMENT '响应状态码',
  `response_time` INT NULL COMMENT '响应时间(ms)',
  `ip_address` VARCHAR(50) NULL COMMENT 'IP地址',
  `user_agent` TEXT NULL COMMENT 'User Agent',
  `error_message` TEXT NULL COMMENT '错误信息',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_api_call_logs_api_config_id` (`api_config_id`),
  INDEX `idx_api_call_logs_api_key` (`api_key`),
  INDEX `idx_api_call_logs_created_at` (`created_at`),
  INDEX `idx_api_call_logs_endpoint` (`endpoint`)
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


-- 注：global_call_config 和 user_line_assignments 表已在上方"外呼系统扩展表"区域定义

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


-- =====================================================
-- 财务管理模块表
-- =====================================================

-- 绩效配置表（存储预设选项）
DROP TABLE IF EXISTS `performance_config`;
CREATE TABLE `performance_config` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `config_type` VARCHAR(20) NOT NULL COMMENT '配置类型: status-有效状态, coefficient-系数, remark-备注',
  `config_value` VARCHAR(50) NOT NULL COMMENT '配置值',
  `config_label` VARCHAR(50) DEFAULT NULL COMMENT '显示标签',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_config_type` (`config_type`),
  INDEX `idx_is_active` (`is_active`),
  INDEX `idx_performance_config_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='绩效配置表';

-- 计提阶梯配置表
DROP TABLE IF EXISTS `commission_ladder`;
CREATE TABLE `commission_ladder` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  INDEX `idx_sort_order` (`sort_order`),
  INDEX `idx_commission_ladder_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='计提阶梯配置表';

-- 计提设置表（存储当前计提模式等全局配置）
DROP TABLE IF EXISTS `commission_setting`;
CREATE TABLE `commission_setting` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `setting_key` VARCHAR(50) NOT NULL UNIQUE COMMENT '配置键',
  `setting_value` VARCHAR(200) NOT NULL COMMENT '配置值',
  `setting_desc` VARCHAR(200) DEFAULT NULL COMMENT '配置说明',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_commission_setting_tenant_id` (`tenant_id`)
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

-- =============================================
-- 平台管理后台表（可选 - 仅平台运营方需要）
-- 说明：以下表用于平台管理后台，管理私有部署授权和版本发布
-- 私有部署客户无需创建这些表，不会影响CRM系统正常使用
-- =============================================

-- 管理员用户表（可选）
-- 注意：此表与CRM的users表完全独立，用于平台管理后台登录
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '登录用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码(bcrypt加密)',
  `name` VARCHAR(50) COMMENT '姓名',
  `email` VARCHAR(100) COMMENT '邮箱',
  `phone` VARCHAR(20) COMMENT '手机号',
  `role` ENUM('super_admin', 'admin', 'operator') DEFAULT 'operator' COMMENT '角色类型',
  `role_id` VARCHAR(36) DEFAULT NULL COMMENT '关联角色ID(admin_roles表，决定具体权限)',
  `status` ENUM('active', 'disabled') DEFAULT 'active' COMMENT '状态',
  `last_login_at` DATETIME COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(50) COMMENT '最后登录IP',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员用户表（平台管理后台专用）';

-- 管理后台角色表（可选 - 与管理员账号配合使用）
-- 说明：用于RBAC权限控制，管理员通过关联角色获得对应菜单和操作权限
CREATE TABLE IF NOT EXISTS `admin_roles` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE COMMENT '角色名称',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT '角色标识码',
  `description` TEXT DEFAULT NULL COMMENT '角色描述',
  `permissions` TEXT NOT NULL COMMENT '权限码列表(JSON数组)',
  `is_system` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否系统内置角色(不可删除)',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active/disabled',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理后台角色表（平台管理后台专用）';

-- 授权码表（可选）
CREATE TABLE IF NOT EXISTS `licenses` (
  `id` VARCHAR(36) PRIMARY KEY,
  `license_key` VARCHAR(255) NOT NULL UNIQUE COMMENT '授权码',
  `customer_name` VARCHAR(100) NOT NULL COMMENT '客户名称',
  `customer_contact` VARCHAR(100) COMMENT '联系人',
  `customer_phone` VARCHAR(20) COMMENT '联系电话',
  `customer_email` VARCHAR(100) COMMENT '邮箱',
  `license_type` ENUM('trial', 'perpetual', 'annual', 'monthly') DEFAULT 'trial' COMMENT '授权类型',
  `max_users` INT DEFAULT 10 COMMENT '最大用户数',
  `max_storage_gb` INT DEFAULT 5 COMMENT '最大存储空间(GB)',
  `user_limit_mode` ENUM('total','online') NOT NULL DEFAULT 'total' COMMENT '用户限制模式',
  `max_online_seats` INT NOT NULL DEFAULT 0 COMMENT '最大在线席位数',
  `features` JSON COMMENT '开通的功能模块',
  `package_id` INT NULL COMMENT '关联套餐ID',
  `package_name` VARCHAR(100) NULL COMMENT '套餐名称',
  `machine_id` VARCHAR(255) COMMENT '绑定的机器码',
  `status` ENUM('active', 'expired', 'revoked', 'pending') DEFAULT 'pending' COMMENT '状态',
  `activated_at` DATETIME COMMENT '激活时间',
  `expires_at` DATETIME COMMENT '到期时间',
  `notes` TEXT COMMENT '备注',
  `created_by` VARCHAR(36) COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL DEFAULT NULL COMMENT '软删除时间（回收站）',
  `deleted_by` VARCHAR(36) NULL DEFAULT NULL COMMENT '删除操作人',
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_status` (`status`),
  INDEX `idx_licenses_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授权码表（平台管理后台专用-私有客户）';

-- 版本发布表（可选）
CREATE TABLE IF NOT EXISTS `versions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `version` VARCHAR(20) NOT NULL UNIQUE COMMENT '版本号',
  `version_code` INT NOT NULL COMMENT '版本数字',
  `release_type` ENUM('major', 'minor', 'patch', 'beta') DEFAULT 'patch' COMMENT '发布类型',
  `platform` VARCHAR(50) DEFAULT 'all' COMMENT '平台',
  `changelog` TEXT COMMENT '更新日志',
  `release_notes_html` TEXT NULL COMMENT '富文本更新说明(HTML)',
  `download_url` VARCHAR(500) COMMENT '下载地址',
  `source_type` VARCHAR(20) DEFAULT 'url' COMMENT '更新源类型: url/upload/git',
  `git_repo_url` VARCHAR(500) NULL COMMENT 'Git仓库地址',
  `git_branch` VARCHAR(100) DEFAULT 'main' COMMENT 'Git分支',
  `git_tag` VARCHAR(100) NULL COMMENT 'Git标签',
  `package_path` VARCHAR(500) NULL COMMENT '上传包服务器路径',
  `target_audience` VARCHAR(20) DEFAULT 'all' COMMENT '目标受众: all/saas/private',
  `file_size` VARCHAR(20) COMMENT '文件大小',
  `file_hash` VARCHAR(64) COMMENT '文件MD5/SHA256',
  `min_version` VARCHAR(20) COMMENT '最低可升级版本',
  `is_force_update` TINYINT(1) DEFAULT 0 COMMENT '是否强制更新',
  `status` ENUM('draft', 'published', 'deprecated') DEFAULT 'draft' COMMENT '状态',
  `is_published` TINYINT(1) DEFAULT 0 COMMENT '是否已发布',
  `download_count` INT DEFAULT 0 COMMENT '下载次数',
  `published_at` DATETIME COMMENT '发布时间',
  `created_by` VARCHAR(36) COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_version` (`version`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='版本发布表（平台管理后台专用）';

-- 版本更新任务表
CREATE TABLE IF NOT EXISTS `update_tasks` (
  `id` VARCHAR(36) PRIMARY KEY,
  `version_id` VARCHAR(36) NOT NULL COMMENT '目标版本ID',
  `customer_id` VARCHAR(36) NULL COMMENT '私有客户ID（null=管理后台自身）',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '更新状态: pending/backing_up/downloading/installing/building/migrating/restarting/success/failed/rolled_back',
  `current_step` VARCHAR(50) NULL COMMENT '当前执行步骤',
  `progress` INT DEFAULT 0 COMMENT '进度百分比(0-100)',
  `logs` LONGTEXT NULL COMMENT '执行日志(JSON数组)',
  `backup_path` VARCHAR(500) NULL COMMENT '备份目录路径',
  `error_message` TEXT NULL COMMENT '错误信息',
  `from_version` VARCHAR(20) NULL COMMENT '更新前版本号',
  `to_version` VARCHAR(20) NULL COMMENT '目标版本号',
  `triggered_by` VARCHAR(36) NULL COMMENT '操作人ID',
  `started_at` DATETIME NULL COMMENT '开始时间',
  `completed_at` DATETIME NULL COMMENT '完成时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_update_tasks_version_id` (`version_id`),
  INDEX `idx_update_tasks_customer_id` (`customer_id`),
  INDEX `idx_update_tasks_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='版本更新任务记录';

-- 数据库迁移历史表
CREATE TABLE IF NOT EXISTS `migration_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `filename` VARCHAR(200) NOT NULL UNIQUE COMMENT '迁移文件名',
  `checksum` VARCHAR(64) NULL COMMENT '文件校验值',
  `execution_time` INT NULL COMMENT '执行耗时(ms)',
  `success` TINYINT DEFAULT 1 COMMENT '是否成功',
  `error_message` TEXT NULL COMMENT '错误信息',
  `executed_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据库迁移历史';

-- 授权验证日志表（可选）
CREATE TABLE IF NOT EXISTS `license_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `license_id` VARCHAR(36) COMMENT '授权ID',
  `license_key` VARCHAR(255) COMMENT '授权码',
  `action` ENUM('verify', 'activate', 'renew', 'revoke', 'expire') COMMENT '操作类型',
  `machine_id` VARCHAR(255) COMMENT '机器码',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` TEXT COMMENT 'User-Agent',
  `result` ENUM('success', 'failed') COMMENT '结果',
  `message` TEXT COMMENT '消息',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_license_id` (`license_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='授权验证日志表（平台管理后台专用）';

-- 租户表（SaaS模式）
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL COMMENT '租户名称',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT '租户编码',
  `package_id` VARCHAR(36) COMMENT '套餐ID',
  `contact` VARCHAR(100) COMMENT '联系人',
  `phone` VARCHAR(20) COMMENT '联系电话',
  `email` VARCHAR(100) COMMENT '邮箱',
  `max_users` INT DEFAULT 10 COMMENT '最大用户数',
  `extra_users` INT NOT NULL DEFAULT 0 COMMENT '扩容用户数',
  `max_storage_gb` INT DEFAULT 5 COMMENT '最大存储空间(GB)',
  `extra_storage_gb` INT NOT NULL DEFAULT 0 COMMENT '扩容存储空间(GB)',
  `user_count` INT DEFAULT 0 COMMENT '当前用户数',
  `user_limit_mode` ENUM('total','online','both') NOT NULL DEFAULT 'total' COMMENT '用户限制模式（继承自套餐，可单独覆盖）',
  `max_online_seats` INT NOT NULL DEFAULT 0 COMMENT '最大在线席位数',
  `extra_online_seats` INT NOT NULL DEFAULT 0 COMMENT '额外增购的在线席位数',
  `current_online_seats` INT NOT NULL DEFAULT 0 COMMENT '当前在线席位数（定时任务同步）',
  `used_storage_mb` DECIMAL(10,2) DEFAULT 0 COMMENT '已使用存储空间(MB)',
  `expire_date` DATE COMMENT '到期日期',
  `license_key` VARCHAR(100) COMMENT '租户授权码',
  `license_status` VARCHAR(20) DEFAULT 'pending' COMMENT '授权状态',
  `activated_at` DATETIME COMMENT '激活时间',
  `features` JSON COMMENT '开通的功能模块',
  `modules` JSON NULL COMMENT '授权模块ID列表（JSON数组）',
  `database_name` VARCHAR(100) COMMENT '数据库名称',
  `remark` TEXT COMMENT '备注',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL DEFAULT NULL COMMENT '软删除时间（回收站）',
  `deleted_by` VARCHAR(36) NULL DEFAULT NULL COMMENT '删除操作人',
  `last_verify_at` DATETIME DEFAULT NULL COMMENT '最后验证时间',
  `wecom_chat_archive_auth` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '会话存档增值服务授权: 0=未授权, 1=已授权',
  INDEX `idx_code` (`code`),
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_status` (`status`),
  INDEX `idx_tenants_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户表（平台管理后台专用-租户客户）';

-- 租户授权日志表
CREATE TABLE IF NOT EXISTS `tenant_license_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `tenant_id` VARCHAR(36) COMMENT '租户ID',
  `license_key` VARCHAR(50) COMMENT '授权码',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型: generate/verify/activate/suspend/resume/renew',
  `result` VARCHAR(20) NOT NULL COMMENT '结果: success/failed',
  `message` VARCHAR(500) COMMENT '消息',
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` VARCHAR(500) COMMENT 'User Agent',
  `operator_id` VARCHAR(36) COMMENT '操作人ID',
  `operator_name` VARCHAR(50) COMMENT '操作人名称',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_license_key` (`license_key`),
  INDEX `idx_action` (`action`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户授权日志表';

-- 套餐表（旧版已弃用，完整版定义在下方 "租户套餐表（官网和管理后台共用）"）
-- CREATE TABLE IF NOT EXISTS `tenant_packages` (
--   `id` VARCHAR(36) PRIMARY KEY,
--   `name` VARCHAR(100) NOT NULL COMMENT '套餐名称',
--   `price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '价格',
--   `unit` VARCHAR(10) DEFAULT '月' COMMENT '计费单位',
--   `max_users` INT DEFAULT 10 COMMENT '最大用户数',
--   `storage` VARCHAR(20) DEFAULT '5GB' COMMENT '存储空间',
--   `features` TEXT COMMENT '功能列表(JSON)',
--   `recommended` TINYINT(1) DEFAULT 0 COMMENT '是否推荐',
--   `sort_order` INT DEFAULT 0 COMMENT '排序',
--   `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
--   `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
--   `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐表（平台管理后台专用）';

-- 模块方案表
CREATE TABLE IF NOT EXISTS `module_schemes` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '方案名称',
  `description` TEXT COMMENT '方案描述',
  `target_type` VARCHAR(20) DEFAULT 'all' COMMENT '目标类型',
  `targets` TEXT COMMENT '目标列表(JSON)',
  `modules` TEXT COMMENT '模块配置(JSON)',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `created_by` VARCHAR(36) COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块方案表（平台管理后台专用）';

-- =============================================
-- 支付系统表
-- =============================================

-- 支付配置表
CREATE TABLE IF NOT EXISTS `payment_configs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `pay_type` VARCHAR(20) NOT NULL COMMENT '支付类型: wechat/alipay/bank',
  `enabled` TINYINT(1) DEFAULT 0 COMMENT '是否启用',
  `config_data` TEXT COMMENT '配置数据(JSON加密存储)',
  `notify_url` VARCHAR(500) COMMENT '回调地址',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_pay_type` (`pay_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付配置表';

-- 支付订单表
CREATE TABLE IF NOT EXISTS `payment_orders` (
  `id` VARCHAR(36) PRIMARY KEY,
  `order_no` VARCHAR(64) NOT NULL COMMENT '订单号',
  `customer_type` VARCHAR(20) DEFAULT 'tenant' COMMENT '客户类型: tenant/private',
  `tenant_id` VARCHAR(36) COMMENT '租户ID',
  `license_id` VARCHAR(36) COMMENT '私有客户授权ID',
  `tenant_name` VARCHAR(100) COMMENT '租户名称',
  `package_id` VARCHAR(36) COMMENT '套餐ID',
  `package_name` VARCHAR(100) COMMENT '套餐名称',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '支付金额',
  `pay_type` VARCHAR(20) COMMENT '支付方式: wechat/alipay',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态: pending/paid/expired/refunded/closed',
  `trade_no` VARCHAR(64) COMMENT '第三方交易号',
  `qr_code` TEXT COMMENT '支付二维码(base64)',
  `pay_url` VARCHAR(500) COMMENT '支付链接',
  `contact_name` VARCHAR(50) COMMENT '联系人',
  `contact_phone` VARCHAR(20) COMMENT '联系电话',
  `contact_email` VARCHAR(100) COMMENT '联系邮箱',
  `expire_time` DATETIME COMMENT '订单过期时间',
  `paid_at` DATETIME COMMENT '支付时间',
  `refund_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '退款金额',
  `refund_at` DATETIME COMMENT '退款时间',
  `refund_reason` VARCHAR(500) COMMENT '退款原因',
  `remark` VARCHAR(500) COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_license_id` (`license_id`),
  KEY `idx_customer_type` (`customer_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付订单表';

-- 支付日志表
CREATE TABLE IF NOT EXISTS `payment_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `order_id` VARCHAR(36) NOT NULL COMMENT '订单ID',
  `order_no` VARCHAR(64) NOT NULL COMMENT '订单号',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型: create/pay/notify/refund/close',
  `pay_type` VARCHAR(20) COMMENT '支付方式',
  `request_data` TEXT COMMENT '请求数据',
  `response_data` TEXT COMMENT '响应数据',
  `result` VARCHAR(20) COMMENT '结果: success/fail',
  `error_msg` VARCHAR(500) COMMENT '错误信息',
  `ip` VARCHAR(50) COMMENT 'IP地址',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_order_id` (`order_id`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付日志表';

-- 旧版支付记录表（兼容）
CREATE TABLE IF NOT EXISTS `payment_records` (
  `id` VARCHAR(36) PRIMARY KEY,
  `order_no` VARCHAR(50) NOT NULL UNIQUE COMMENT '订单号',
  `tenant_id` VARCHAR(36) COMMENT '租户ID',
  `tenant_name` VARCHAR(200) COMMENT '租户名称',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '金额',
  `pay_type` VARCHAR(20) DEFAULT 'wechat' COMMENT '支付方式',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态',
  `transaction_id` VARCHAR(100) COMMENT '交易号',
  `paid_at` DATETIME COMMENT '支付时间',
  `refunded_at` DATETIME COMMENT '退款时间',
  `remark` TEXT COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录表（平台管理后台专用）';

-- 注：payment_configs 支付配置表已在上方"支付系统表"区域定义
-- 注：payment_configs.config_data 以加密JSON存储各支付渠道配置，微信委托代扣计划ID(pappayPlanId)也存储在此JSON中

-- 订阅记录表（委托代扣/周期扣款）
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '订阅ID',
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `package_id` INT NOT NULL COMMENT '套餐ID',
  `status` ENUM('signing','active','paused','cancelled','expired') DEFAULT 'signing' COMMENT '订阅状态',
  `channel` ENUM('wechat','alipay') NOT NULL COMMENT '订阅渠道',
  `wechat_contract_id` VARCHAR(100) DEFAULT NULL COMMENT '微信签约协议号',
  `wechat_plan_id` VARCHAR(100) DEFAULT NULL COMMENT '微信代扣计划编号',
  `alipay_agreement_no` VARCHAR(100) DEFAULT NULL COMMENT '支付宝协议号',
  `sign_url` VARCHAR(500) DEFAULT NULL COMMENT '签约链接',
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '每期扣款金额',
  `billing_cycle` ENUM('monthly','yearly') DEFAULT 'monthly' COMMENT '扣款周期',
  `next_deduct_date` DATE DEFAULT NULL COMMENT '下次扣款日期',
  `last_deduct_date` DATE DEFAULT NULL COMMENT '最近扣款日期',
  `sign_date` DATETIME DEFAULT NULL COMMENT '签约时间',
  `cancel_date` DATETIME DEFAULT NULL COMMENT '取消时间',
  `cancel_reason` VARCHAR(500) DEFAULT NULL COMMENT '取消原因',
  `total_deducted` DECIMAL(10,2) DEFAULT 0 COMMENT '累计扣款金额',
  `deduct_count` INT DEFAULT 0 COMMENT '已扣款次数',
  `fail_count` INT DEFAULT 0 COMMENT '连续失败次数',
  `source` ENUM('register','renew','upgrade') DEFAULT 'register' COMMENT '订阅来源',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sub_tenant` (`tenant_id`),
  INDEX `idx_sub_status` (`status`),
  INDEX `idx_sub_next_deduct` (`next_deduct_date`),
  INDEX `idx_sub_channel` (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订阅记录表（委托代扣/周期扣款）';

-- 订阅扣款明细表
CREATE TABLE IF NOT EXISTS `subscription_deduct_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '扣款记录ID',
  `subscription_id` VARCHAR(36) NOT NULL COMMENT '订阅ID',
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '扣款金额',
  `channel` ENUM('wechat','alipay') NOT NULL COMMENT '扣款渠道',
  `status` ENUM('pending','success','failed') DEFAULT 'pending' COMMENT '扣款状态',
  `trade_no` VARCHAR(100) DEFAULT NULL COMMENT '第三方交易号',
  `payment_order_id` VARCHAR(36) DEFAULT NULL COMMENT '关联payment_orders',
  `deduct_date` DATE NOT NULL COMMENT '扣款日期',
  `executed_at` DATETIME DEFAULT NULL COMMENT '执行时间',
  `retry_count` INT DEFAULT 0 COMMENT '重试次数',
  `max_retry` INT DEFAULT 3 COMMENT '最大重试次数',
  `next_retry_at` DATETIME DEFAULT NULL COMMENT '下次重试时间',
  `error_code` VARCHAR(50) DEFAULT NULL COMMENT '错误代码',
  `error_msg` TEXT DEFAULT NULL COMMENT '错误信息',
  `period_number` INT DEFAULT 1 COMMENT '第几期',
  `billing_start` DATE DEFAULT NULL COMMENT '本期开始日',
  `billing_end` DATE DEFAULT NULL COMMENT '本期结束日',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_deduct_sub` (`subscription_id`),
  INDEX `idx_deduct_tenant` (`tenant_id`),
  INDEX `idx_deduct_status` (`status`),
  INDEX `idx_deduct_date` (`deduct_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订阅扣款明细表';

-- API接口统计表
CREATE TABLE IF NOT EXISTS `api_statistics` (
  `id` VARCHAR(36) PRIMARY KEY,
  `api_name` VARCHAR(100) NOT NULL UNIQUE COMMENT 'API名称',
  `api_type` VARCHAR(50) COMMENT 'API类型',
  `provider` VARCHAR(50) COMMENT '服务商',
  `call_count` BIGINT DEFAULT 0 COMMENT '调用次数',
  `success_count` BIGINT DEFAULT 0 COMMENT '成功次数',
  `fail_count` BIGINT DEFAULT 0 COMMENT '失败次数',
  `total_time` BIGINT DEFAULT 0 COMMENT '总耗时(ms)',
  `last_call_at` DATETIME COMMENT '最后调用时间',
  `status` VARCHAR(20) DEFAULT 'normal' COMMENT '状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API接口统计表（平台管理后台专用）';

-- 管理后台操作日志表
CREATE TABLE IF NOT EXISTS `admin_operation_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `admin_id` VARCHAR(36) NOT NULL COMMENT '管理员ID',
  `admin_name` VARCHAR(100) COMMENT '管理员姓名',
  `module` VARCHAR(50) COMMENT '模块',
  `action` VARCHAR(50) NOT NULL COMMENT '操作',
  `target_type` VARCHAR(50) COMMENT '目标类型',
  `target_id` VARCHAR(36) COMMENT '目标ID',
  `detail` TEXT COMMENT '详情',
  `ip` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` VARCHAR(500) COMMENT 'User-Agent',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_admin_id` (`admin_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理后台操作日志表（平台管理后台专用）';

-- 私有部署客户表
CREATE TABLE IF NOT EXISTS `private_deployments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL COMMENT '客户名称',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT '客户编码',
  `contact` VARCHAR(100) COMMENT '联系人',
  `phone` VARCHAR(20) COMMENT '联系电话',
  `email` VARCHAR(100) COMMENT '邮箱',
  `server_ip` VARCHAR(50) COMMENT '服务器IP',
  `domain` VARCHAR(200) COMMENT '域名',
  `version` VARCHAR(20) COMMENT '当前版本',
  `license_id` VARCHAR(36) COMMENT '授权ID',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态',
  `last_heartbeat` DATETIME COMMENT '最后心跳时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私有部署客户表（平台管理后台专用）';

-- =============================================
-- CRM系统本地授权表（私有部署使用）
-- =============================================

-- 系统授权表（存储本地激活的授权信息）
CREATE TABLE IF NOT EXISTS `system_license` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '授权ID',
  `license_key` VARCHAR(255) NOT NULL COMMENT '授权码',
  `customer_name` VARCHAR(200) COMMENT '客户名称',
  `license_type` VARCHAR(50) DEFAULT 'perpetual' COMMENT '授权类型: trial试用, perpetual永久, annual年度, monthly月度',
  `max_users` INT DEFAULT 50 COMMENT '最大用户数',
  `user_limit_mode` VARCHAR(20) DEFAULT 'total' COMMENT '用户限制模式: total总用户数, online在线席位',
  `max_online_seats` INT DEFAULT 0 COMMENT '最大在线席位数(user_limit_mode=online时生效)',
  `features` TEXT COMMENT '功能模块(JSON)',
  `expires_at` DATETIME COMMENT '到期时间',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active激活, expired过期, revoked吊销',
  `activated_at` DATETIME COMMENT '激活时间',
  `machine_id` VARCHAR(255) COMMENT '机器码',
  `admin_credentials_shown` TINYINT DEFAULT 0 COMMENT '管理员凭据是否已展示(防重复)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY `uk_license_key` (`license_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统授权表（私有部署本地存储）';

-- =============================================
-- 租户套餐表（官网和管理后台共用）
-- =============================================

CREATE TABLE IF NOT EXISTS `tenant_packages` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '套餐名称',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT '套餐代码',
  `type` ENUM('saas', 'private') NOT NULL DEFAULT 'saas' COMMENT '套餐类型：saas-云端版，private-私有部署',
  `description` TEXT COMMENT '套餐描述',
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '价格',
  `original_price` DECIMAL(10,2) COMMENT '原价（用于显示折扣）',
  `billing_cycle` ENUM('monthly', 'yearly', 'once') NOT NULL DEFAULT 'monthly' COMMENT '计费周期',
  `duration_days` INT DEFAULT 30 COMMENT '有效期天数',
  `max_users` INT DEFAULT 10 COMMENT '最大用户数',
  `max_customers` INT DEFAULT 10000 COMMENT '最大客户数',
  `max_orders` INT DEFAULT 10000 COMMENT '最大订单数',
  `max_storage_gb` INT DEFAULT 5 COMMENT '存储空间(GB)',
  `user_limit_mode` ENUM('total','online','both') NOT NULL DEFAULT 'total' COMMENT '用户限制模式：total-限制总注册数，online-限制同时在线数，both-两种都支持',
  `max_online_seats` INT NOT NULL DEFAULT 0 COMMENT '最大在线席位数（user_limit_mode=online时生效）',
  `yearly_discount_rate` DECIMAL(5,2) DEFAULT 0 COMMENT '年付折扣率（0-100，例如20表示8折）',
  `yearly_bonus_months` INT DEFAULT 0 COMMENT '年付赠送月数',
  `yearly_price` DECIMAL(10,2) NULL COMMENT '年付价格（如果为NULL则自动计算）',
  `features` JSON COMMENT '功能特性列表',
  `modules` JSON NULL COMMENT '授权模块ID列表（JSON数组）',
  `is_trial` TINYINT(1) DEFAULT 0 COMMENT '是否为试用套餐',
  `is_recommended` TINYINT(1) DEFAULT 0 COMMENT '是否推荐',
  `is_visible` TINYINT(1) DEFAULT 1 COMMENT '是否在官网显示',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `status` TINYINT(1) DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_visible` (`is_visible`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户套餐表';

-- =============================================
-- 用户登录会话记录表（在线席位追踪）
-- =============================================

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '会话ID(UUID)',
  `user_id` VARCHAR(36) NOT NULL COMMENT '用户ID',
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `session_token` VARCHAR(512) NOT NULL COMMENT '会话标识（JWT token hash）',
  `device_type` VARCHAR(50) NULL COMMENT '设备类型：web/mobile/h5/app',
  `device_info` VARCHAR(255) NULL COMMENT '设备信息（User-Agent）',
  `ip_address` VARCHAR(50) NULL COMMENT '登录IP',
  `last_active_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后活跃时间（心跳更新）',
  `logged_out_at` DATETIME NULL COMMENT '登出/踢出时间',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '会话状态: active/expired/kicked/logged_out',
  `kicked_by` VARCHAR(36) NULL COMMENT '被谁踢出（管理员ID）',
  `kicked_at` DATETIME NULL COMMENT '被踢出时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_user_sessions_user_id` (`user_id`),
  INDEX `idx_user_sessions_tenant_id` (`tenant_id`),
  INDEX `idx_user_sessions_session_token` (`session_token`(191)),
  INDEX `idx_user_sessions_last_active` (`last_active_at`),
  INDEX `idx_user_sessions_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户登录会话记录（在线席位追踪）';

-- =============================================
-- 更新现有数据库的网站地址
-- =============================================
UPDATE `system_configs`
SET `configValue` = 'https://yunkes.com', `updatedAt` = NOW()
WHERE `configKey` = 'websiteUrl' AND `configGroup` = 'basic_settings';

-- =============================================
-- 企业微信管理模块表
-- =============================================

-- 企微配置表（V2.0: 含双模式授权字段）
CREATE TABLE IF NOT EXISTS `wecom_configs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '配置名称',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `corp_secret` VARCHAR(255) NOT NULL COMMENT '应用Secret',
  `agent_id` INT NULL COMMENT '应用AgentId',
  `callback_token` VARCHAR(100) NULL COMMENT '回调Token',
  `encoding_aes_key` VARCHAR(100) NULL COMMENT '消息加解密密钥',
  `callback_url` VARCHAR(500) NULL COMMENT '回调URL',
  `contact_secret` VARCHAR(255) NULL COMMENT '通讯录同步Secret（用于获取部门和成员列表）',
  `external_contact_secret` VARCHAR(255) NULL COMMENT '客户联系Secret（用于获取外部联系人）',
  `chat_archive_secret` VARCHAR(255) NULL COMMENT '会话存档Secret',
  `chat_archive_private_key` TEXT NULL COMMENT '会话存档私钥',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `connection_status` VARCHAR(20) DEFAULT 'pending' COMMENT '连接状态: pending/connected/failed/cancelled',
  `last_error` TEXT NULL COMMENT '最后错误信息',
  `last_api_call_time` DATETIME NULL COMMENT '最后API调用时间',
  `api_call_count` INT DEFAULT 0 COMMENT 'API调用次数',
  `bind_operator` VARCHAR(50) NULL COMMENT '绑定操作人',
  `bind_time` DATETIME NULL COMMENT '绑定时间',
  `remark` TEXT NULL COMMENT '备注',
  `auth_type` VARCHAR(20) DEFAULT 'self_built' COMMENT '授权类型: third_party/self_built',
  `permanent_code` TEXT NULL COMMENT '第三方应用永久授权码(加密存储)',
  `suite_id` VARCHAR(50) NULL COMMENT '第三方应用SuiteID',
  `auth_corp_info` TEXT NULL COMMENT '授权方企业信息(JSON)',
  `auth_user_info` TEXT NULL COMMENT '授权管理员信息(JSON)',
  `auth_scope` TEXT NULL COMMENT '授权范围(JSON)',
  `data_api_status` TINYINT DEFAULT 0 COMMENT '数据API授权状态: 0未授权 1已授权 2已过期',
  `data_api_expire_time` DATETIME NULL COMMENT '数据API授权到期时间',
  `vas_chat_archive` BOOLEAN DEFAULT FALSE COMMENT '是否开通会话存档增值服务',
  `vas_expire_date` DATE NULL COMMENT '增值服务到期时间',
  `vas_user_count` INT DEFAULT 0 COMMENT '增值服务开通人数',
  `auth_mode` VARCHAR(20) DEFAULT 'self_built' COMMENT 'V4.0: 授权模式 third_party/self_built',
  `auth_corp_name` VARCHAR(200) NULL COMMENT 'V4.0: 授权企业名称',
  `auth_admin_user_id` VARCHAR(100) NULL COMMENT 'V4.0: 授权管理员UserID',
  `auth_time` DATETIME NULL COMMENT 'V4.0: 授权时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_corp_id` (`corp_id`),
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_auth_type` (`auth_type`),
  INDEX `idx_wecom_configs_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微配置表';

-- 企微用户绑定表
CREATE TABLE IF NOT EXISTS `wecom_user_bindings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `wecom_user_id` VARCHAR(100) NOT NULL COMMENT '企微成员UserID',
  `wecom_user_name` VARCHAR(100) NULL COMMENT '企微成员姓名',
  `wecom_avatar` VARCHAR(500) NULL COMMENT '企微成员头像',
  `wecom_department_ids` VARCHAR(500) NULL COMMENT '企微部门ID列表',
  `crm_user_id` VARCHAR(50) NOT NULL COMMENT 'CRM用户ID',
  `crm_user_name` VARCHAR(100) NULL COMMENT 'CRM用户姓名',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `bind_operator` VARCHAR(50) NULL COMMENT '绑定操作人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_config_wecom_user` (`wecom_config_id`, `wecom_user_id`),
  INDEX `idx_crm_user_id` (`crm_user_id`),
  INDEX `idx_corp_id` (`corp_id`),
  INDEX `idx_wecom_user_bindings_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微用户绑定表';

-- 企微客户表（V2.0: 含统计+标签+渠道字段）
CREATE TABLE IF NOT EXISTS `wecom_customers` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `external_user_id` VARCHAR(100) NOT NULL COMMENT '外部联系人ID',
  `name` VARCHAR(100) NULL COMMENT '客户名称',
  `avatar` VARCHAR(500) NULL COMMENT '客户头像',
  `type` INT DEFAULT 1 COMMENT '类型: 1微信用户 2企业微信用户',
  `gender` INT DEFAULT 0 COMMENT '性别: 0未知 1男 2女',
  `corp_name` VARCHAR(200) NULL COMMENT '客户企业名称',
  `position` VARCHAR(100) NULL COMMENT '职位',
  `follow_user_id` VARCHAR(100) NULL COMMENT '跟进成员UserID',
  `follow_user_name` VARCHAR(100) NULL COMMENT '跟进成员姓名',
  `remark` VARCHAR(500) NULL COMMENT '备注',
  `description` TEXT NULL COMMENT '描述',
  `add_time` DATETIME NULL COMMENT '添加时间',
  `add_way` INT NULL COMMENT '添加方式',
  `tag_ids` TEXT NULL COMMENT '标签ID列表(JSON)',
  `status` VARCHAR(20) DEFAULT 'normal' COMMENT '状态: normal/deleted',
  `delete_time` DATETIME NULL COMMENT '删除时间',
  `is_dealt` TINYINT(1) DEFAULT 0 COMMENT '是否成交',
  `crm_customer_id` VARCHAR(50) NULL COMMENT '关联CRM客户ID',
  `tag_names` TEXT NULL COMMENT '客户标签名称列表(JSON)',
  `phone` VARCHAR(20) NULL COMMENT '手机号',
  `state` VARCHAR(100) NULL COMMENT '渠道来源标识',
  `msg_sent_count` INT DEFAULT 0 COMMENT '发送消息数',
  `msg_recv_count` INT DEFAULT 0 COMMENT '接收消息数',
  `last_msg_time` BIGINT NULL COMMENT '最后消息时间戳',
  `active_days_7d` INT DEFAULT 0 COMMENT '近7天活跃天数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_config_external_user` (`wecom_config_id`, `external_user_id`),
  INDEX `idx_follow_user_id` (`follow_user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_add_time` (`add_time`),
  INDEX `idx_wecom_customers_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客户表';

-- 企微获客链接表
CREATE TABLE IF NOT EXISTS `wecom_acquisition_links` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `link_id` VARCHAR(100) NULL COMMENT '企微链接ID',
  `link_name` VARCHAR(200) NOT NULL COMMENT '链接名称',
  `link_url` VARCHAR(500) NULL COMMENT '链接地址',
  `welcome_msg` TEXT NULL COMMENT '欢迎语',
  `user_ids` TEXT NULL COMMENT '接待成员ID列表(JSON)',
  `department_ids` TEXT NULL COMMENT '接待部门ID列表(JSON)',
  `tag_ids` TEXT NULL COMMENT '自动打标签ID列表(JSON)',
  `click_count` INT DEFAULT 0 COMMENT '点击次数',
  `add_count` INT DEFAULT 0 COMMENT '添加次数',
  `loss_count` INT DEFAULT 0 COMMENT '流失数量',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `weight_config` TEXT NULL COMMENT '成员权重配置(JSON)',
  `daily_stats` TEXT NULL COMMENT '每日统计(JSON)',
  `state` VARCHAR(100) NULL COMMENT 'V4.0: 渠道标识',
  `welcome_config` TEXT NULL COMMENT 'V4.0: 欢迎语配置(JSON)',
  `auto_tags` TEXT NULL COMMENT 'V4.0: 自动标签配置(JSON)',
  `auto_group_config` TEXT NULL COMMENT 'V4.0: 自动建群配置(JSON)',
  `created_by` VARCHAR(50) NULL COMMENT '创建人ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_wecom_config_id` (`wecom_config_id`),
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_wecom_acquisition_links_tenant_id` (`tenant_id`),
  INDEX `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微获客链接表';

-- 企微客服账号表
CREATE TABLE IF NOT EXISTS `wecom_service_accounts` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `open_kf_id` VARCHAR(100) NULL COMMENT '客服账号ID',
  `name` VARCHAR(100) NOT NULL COMMENT '客服名称',
  `avatar` VARCHAR(500) NULL COMMENT '客服头像',
  `kf_url` VARCHAR(500) NULL COMMENT '客服链接',
  `servicer_user_ids` TEXT NULL COMMENT '接待人员ID列表(JSON)',
  `welcome_msg` TEXT NULL COMMENT '欢迎语',
  `session_count` INT DEFAULT 0 COMMENT '会话数',
  `message_count` INT DEFAULT 0 COMMENT '消息数',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_by` VARCHAR(50) NULL COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_wecom_config_id` (`wecom_config_id`),
  INDEX `idx_is_enabled` (`is_enabled`),
  INDEX `idx_wecom_service_accounts_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客服账号表';

-- 企微会话存档表（V2.0: 含发送者/接收者类型+OSS路径）
CREATE TABLE IF NOT EXISTS `wecom_chat_records` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `msg_id` VARCHAR(100) NOT NULL COMMENT '消息ID',
  `msg_type` VARCHAR(50) NOT NULL COMMENT '消息类型',
  `action` VARCHAR(20) NOT NULL COMMENT '消息动作: send/recall/switch',
  `from_user_id` VARCHAR(100) NOT NULL COMMENT '发送者ID',
  `from_user_name` VARCHAR(100) NULL COMMENT '发送者姓名',
  `to_user_ids` TEXT NULL COMMENT '接收者ID列表(JSON)',
  `room_id` VARCHAR(100) NULL COMMENT '群聊ID',
  `msg_time` BIGINT NOT NULL COMMENT '消息时间戳(毫秒)',
  `content` TEXT NULL COMMENT '消息内容(JSON)',
  `media_key` VARCHAR(255) NULL COMMENT '媒体文件ID',
  `media_url` VARCHAR(500) NULL COMMENT '媒体文件URL',
  `audit_remark` TEXT NULL COMMENT '质检备注',
  `audit_by` VARCHAR(50) NULL COMMENT '质检人',
  `audit_time` DATETIME NULL COMMENT '质检时间',
  `is_sensitive` TINYINT(1) DEFAULT 0 COMMENT '是否标记敏感',
  `sender_type` TINYINT NULL COMMENT '发送者类型: 1员工 2客户',
  `receiver_type` TINYINT NULL COMMENT '接收者类型: 1员工 2客户 3群聊',
  `oss_path` VARCHAR(256) NULL COMMENT 'OSS存储路径',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_corp_msg` (`corp_id`, `msg_id`),
  INDEX `idx_wecom_config_id` (`wecom_config_id`),
  INDEX `idx_from_user_id` (`from_user_id`),
  INDEX `idx_msg_time` (`msg_time`),
  INDEX `idx_sender_type` (`sender_type`),
  INDEX `idx_wecom_chat_records_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微会话存档表';

-- 企微收款记录表
CREATE TABLE IF NOT EXISTS `wecom_payment_records` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `corp_id` VARCHAR(50) NOT NULL COMMENT '企业ID',
  `trade_no` VARCHAR(100) NOT NULL COMMENT '交易单号',
  `user_id` VARCHAR(100) NULL COMMENT '收款成员ID',
  `user_name` VARCHAR(100) NULL COMMENT '收款成员姓名',
  `external_user_id` VARCHAR(100) NULL COMMENT '付款客户ID',
  `customer_name` VARCHAR(100) NULL COMMENT '付款客户名称',
  `amount` INT NOT NULL COMMENT '收款金额(分)',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/paid/refunded',
  `pay_time` DATETIME NULL COMMENT '支付时间',
  `refund_time` DATETIME NULL COMMENT '退款时间',
  `remark` VARCHAR(500) NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_trade_no` (`trade_no`),
  INDEX `idx_wecom_config_id` (`wecom_config_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_pay_time` (`pay_time`),
  INDEX `idx_wecom_payment_records_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微收款记录表';

-- 企微会话存档设置表（V2.0完整版: 含席位管控+可见性+拉取设置）
CREATE TABLE IF NOT EXISTS `wecom_archive_settings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NULL COMMENT '企微配置ID',
  `storage_type` VARCHAR(20) NOT NULL DEFAULT 'database' COMMENT '存储方式: database/oss',
  `oss_bucket` VARCHAR(200) NULL COMMENT 'OSS存储桶',
  `oss_prefix` VARCHAR(200) NULL COMMENT 'OSS前缀路径',
  `oss_endpoint` VARCHAR(200) NULL COMMENT 'OSS Endpoint',
  `oss_access_key` VARCHAR(200) NULL COMMENT 'OSS AccessKey',
  `oss_secret_key` VARCHAR(200) NULL COMMENT 'OSS SecretKey',
  `retention_days` INT NOT NULL DEFAULT 180 COMMENT '保留天数',
  `max_users` INT NOT NULL DEFAULT 0 COMMENT '开通人数上限(购买的最大席位数)',
  `used_users` INT NOT NULL DEFAULT 0 COMMENT '已使用人数',
  `expire_date` DATE NULL COMMENT '服务到期日期',
  `status` VARCHAR(20) NOT NULL DEFAULT 'inactive' COMMENT '状态: inactive/active/expired/disabled',
  `package_type` VARCHAR(30) NULL DEFAULT 'yearly' COMMENT '套餐类型: monthly/quarterly/yearly',
  `last_cleanup_at` DATETIME NULL COMMENT '最后清理时间',
  `total_messages` INT NOT NULL DEFAULT 0 COMMENT '累计消息数',
  `total_storage_mb` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '累计存储(MB)',
  `fetch_interval` INT DEFAULT 5 COMMENT '拉取间隔(分钟)',
  `fetch_mode` VARCHAR(20) DEFAULT 'default' COMMENT '拉取模式: default/pre_page/adaptive',
  `media_storage` VARCHAR(20) DEFAULT 'local' COMMENT '媒体存储方式: local/oss',
  `auto_inspect` TINYINT(1) DEFAULT 0 COMMENT '是否自动质检',
  `member_scope` TEXT NULL COMMENT '存档成员范围(JSON)',
  `rsa_public_key` TEXT NULL COMMENT 'RSA公钥',
  `visibility` VARCHAR(20) DEFAULT 'all' COMMENT '成员可见性: self/department/all',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_id` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_expire_date` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微会话存档设置表';

-- =============================================
-- 企微V2.0新增表（2026-04-13）
-- =============================================

-- 企微客户群表
CREATE TABLE IF NOT EXISTS `wecom_customer_groups` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `chat_id` VARCHAR(100) NOT NULL COMMENT '群聊ID',
  `name` VARCHAR(200) NULL COMMENT '群名称',
  `owner_user_id` VARCHAR(100) NULL COMMENT '群主UserID',
  `owner_user_name` VARCHAR(100) NULL COMMENT '群主姓名',
  `member_count` INT DEFAULT 0 COMMENT '群成员数量',
  `today_msg_count` INT DEFAULT 0 COMMENT '今日消息数',
  `notice` TEXT NULL COMMENT '群公告',
  `create_time` DATETIME NULL COMMENT '群创建时间',
  `status` VARCHAR(20) DEFAULT 'normal' COMMENT '状态: normal/dismissed',
  `member_list` TEXT NULL COMMENT '群成员列表(JSON)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_config_chat` (`wecom_config_id`, `chat_id`),
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_owner` (`owner_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客户群表';

-- 敏感词表
CREATE TABLE IF NOT EXISTS `wecom_sensitive_words` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NULL COMMENT '企微配置ID(NULL表示全局)',
  `word` VARCHAR(200) NOT NULL COMMENT '敏感词',
  `group_name` VARCHAR(100) DEFAULT 'custom' COMMENT '分组: porn/politics/violence/competitor/custom',
  `level` VARCHAR(20) DEFAULT 'warning' COMMENT '级别: info/warning/danger/critical',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_by` VARCHAR(50) NULL COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_word` (`tenant_id`, `word`),
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_group` (`group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词表';

-- 敏感词命中记录表
CREATE TABLE IF NOT EXISTS `wecom_sensitive_hits` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `chat_record_id` INT NULL COMMENT '关联的聊天记录ID',
  `word_id` INT NOT NULL COMMENT '命中的敏感词ID',
  `word` VARCHAR(200) NOT NULL COMMENT '命中的敏感词内容',
  `context` TEXT NULL COMMENT '消息上下文',
  `from_user_id` VARCHAR(100) NULL COMMENT '发送者ID',
  `from_user_name` VARCHAR(100) NULL COMMENT '发送者姓名',
  `to_user_id` VARCHAR(100) NULL COMMENT '接收者ID',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/processed/ignored',
  `processed_by` VARCHAR(50) NULL COMMENT '处理人',
  `processed_at` DATETIME NULL COMMENT '处理时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词命中记录表';

-- 质检规则表
CREATE TABLE IF NOT EXISTS `wecom_quality_rules` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '规则名称',
  `rule_type` VARCHAR(30) NOT NULL COMMENT '规则类型: response_time/msg_count/keyword/emotion',
  `conditions` TEXT NOT NULL COMMENT '条件参数(JSON)',
  `score_value` INT DEFAULT 0 COMMENT '分值(正加负减)',
  `apply_scope` TEXT NULL COMMENT '适用范围(JSON: 部门/员工)',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_type` (`rule_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='质检规则表';

-- 质检记录表
CREATE TABLE IF NOT EXISTS `wecom_quality_inspections` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `session_key` VARCHAR(200) NULL COMMENT '会话标识',
  `from_user_id` VARCHAR(100) NULL COMMENT '员工UserID',
  `from_user_name` VARCHAR(100) NULL COMMENT '员工姓名',
  `to_user_id` VARCHAR(100) NULL COMMENT '对方UserID',
  `to_user_name` VARCHAR(100) NULL COMMENT '对方姓名',
  `room_id` VARCHAR(100) NULL COMMENT '群聊ID(群聊场景)',
  `message_count` INT DEFAULT 0 COMMENT '消息数量',
  `start_time` DATETIME NULL COMMENT '会话开始时间',
  `end_time` DATETIME NULL COMMENT '会话结束时间',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending/normal/excellent/violation',
  `violation_type` TEXT NULL COMMENT '违规类型(JSON数组)',
  `score` INT NULL COMMENT '质检评分(0-100)',
  `remark` TEXT NULL COMMENT '质检备注',
  `inspector_id` VARCHAR(50) NULL COMMENT '质检员ID',
  `inspector_name` VARCHAR(100) NULL COMMENT '质检员姓名',
  `inspected_at` DATETIME NULL COMMENT '质检时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_from_user` (`from_user_id`),
  INDEX `idx_inspected` (`inspected_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='质检记录表';

-- 存档生效成员表
CREATE TABLE IF NOT EXISTS `wecom_archive_members` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(50) NULL COMMENT '租户ID',
  `wecom_user_id` VARCHAR(100) NOT NULL COMMENT '企微成员userId',
  `wecom_user_name` VARCHAR(200) NULL COMMENT '成员名称(冗余)',
  `crm_user_id` VARCHAR(50) NULL COMMENT '关联CRM用户ID',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用存档',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_user` (`tenant_id`, `wecom_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='存档生效成员表';

-- 企微增值服务订单表（SaaS专属）
CREATE TABLE IF NOT EXISTS `wecom_vas_orders` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `order_no` VARCHAR(32) NOT NULL COMMENT '订单号',
  `wecom_config_id` INT NULL COMMENT '企微配置ID',
  `service_type` VARCHAR(50) DEFAULT 'chat_archive' COMMENT '服务类型',
  `order_type` VARCHAR(20) DEFAULT 'new' COMMENT '订单类型: new/renew/upgrade/addon',
  `user_count` INT DEFAULT 0 COMMENT '开通/增购人数',
  `unit_price` DECIMAL(10,2) NULL COMMENT '单价',
  `total_amount` DECIMAL(10,2) NOT NULL COMMENT '总金额',
  `pay_type` VARCHAR(20) NULL COMMENT '支付方式: wechat/alipay/bank',
  `pay_status` TINYINT DEFAULT 0 COMMENT '0待支付 1已支付 2已取消 3已退款',
  `pay_time` DATETIME NULL COMMENT '支付时间',
  `transaction_id` VARCHAR(64) NULL COMMENT '第三方支付流水号',
  `start_date` DATE NULL COMMENT '服务开始日期',
  `end_date` DATE NULL COMMENT '服务到期日期',
  `detail` TEXT NULL COMMENT '订单详情(JSON)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_order_no` (`order_no`),
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_pay_status` (`pay_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微增值服务订单表';

-- 企微增值服务配置表（Admin专属）
CREATE TABLE IF NOT EXISTS `wecom_vas_configs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `service_type` VARCHAR(50) NOT NULL COMMENT '服务类型',
  `service_name` VARCHAR(100) NULL COMMENT '服务名称',
  `default_price` DECIMAL(10,2) NULL COMMENT '默认价格',
  `min_price` DECIMAL(10,2) NULL COMMENT '最低价格',
  `billing_unit` VARCHAR(20) DEFAULT 'per_user_year' COMMENT '计费单位',
  `trial_days` INT DEFAULT 7 COMMENT '试用天数',
  `tier_pricing` TEXT NULL COMMENT '阶梯定价(JSON)',
  `description` TEXT NULL COMMENT '服务说明',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_service_type` (`service_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微增值服务配置表';

-- 企微客服会话表
CREATE TABLE IF NOT EXISTS `wecom_kf_sessions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `open_kf_id` VARCHAR(100) NOT NULL COMMENT '客服账号ID',
  `external_userid` VARCHAR(100) NULL COMMENT '客户外部ID',
  `customer_name` VARCHAR(100) NULL COMMENT '客户名称',
  `servicer_userid` VARCHAR(100) NULL COMMENT '接待人员ID',
  `servicer_name` VARCHAR(100) NULL COMMENT '接待人员名称',
  `session_status` VARCHAR(20) DEFAULT 'open' COMMENT '会话状态: open/closed/timeout',
  `msg_count` INT DEFAULT 0 COMMENT '消息数量',
  `first_response_time` INT NULL COMMENT '首次响应时间(秒)',
  `avg_response_time` INT NULL COMMENT '平均响应时间(秒)',
  `satisfaction` TINYINT NULL COMMENT '满意度(1-5)',
  `last_msg_content` TEXT NULL COMMENT '最后消息内容',
  `last_msg_time` DATETIME NULL COMMENT '最后消息时间',
  `session_start_time` DATETIME NULL COMMENT '会话开始时间',
  `session_end_time` DATETIME NULL COMMENT '会话结束时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_open_kf_id` (`open_kf_id`),
  INDEX `idx_status` (`session_status`),
  INDEX `idx_start_time` (`session_start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客服会话表';

-- 企微快捷回复表
CREATE TABLE IF NOT EXISTS `wecom_quick_replies` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `category` VARCHAR(20) DEFAULT 'enterprise' COMMENT '类别: enterprise/personal',
  `group_name` VARCHAR(100) NULL COMMENT '分组名称',
  `title` VARCHAR(200) NOT NULL COMMENT '标题',
  `content` TEXT NOT NULL COMMENT '内容',
  `shortcut` VARCHAR(50) NULL COMMENT '快捷键',
  `use_count` INT DEFAULT 0 COMMENT '使用次数',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_by` VARCHAR(50) NULL COMMENT '创建人',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_group` (`group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微快捷回复表';

-- =============================================
-- 企微V4.0新增表（2026-04-15）
-- =============================================

-- 自动匹配建议表
CREATE TABLE IF NOT EXISTS `wecom_auto_match_suggestions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `wecom_customer_id` INT NOT NULL COMMENT '企微客户ID',
  `crm_customer_id` VARCHAR(50) NOT NULL COMMENT 'CRM客户ID',
  `match_type` VARCHAR(20) NOT NULL DEFAULT 'phone' COMMENT '匹配方式: phone/name',
  `match_field` VARCHAR(100) NULL COMMENT '匹配值(如手机号)',
  `confidence` VARCHAR(20) NOT NULL DEFAULT 'medium' COMMENT '置信度: high/medium/low',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态: pending/confirmed/rejected',
  `confirmed_by` VARCHAR(50) NULL COMMENT '确认人',
  `confirmed_at` DATETIME NULL COMMENT '确认时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_wecom_crm` (`tenant_id`, `wecom_customer_id`, `crm_customer_id`),
  INDEX `idx_tenant_status` (`tenant_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微自动匹配建议表';

-- 群模板表
CREATE TABLE IF NOT EXISTS `wecom_group_templates` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `template_name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `group_name_prefix` VARCHAR(100) NULL COMMENT '群名前缀',
  `max_members` INT DEFAULT 200 COMMENT '最大成员数',
  `owner_user_id` VARCHAR(100) NULL COMMENT '群主UserID',
  `welcome_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否启用欢迎语',
  `welcome_text` TEXT NULL COMMENT '欢迎语内容',
  `welcome_media_type` VARCHAR(20) DEFAULT 'none' COMMENT '欢迎语附件类型: none/image/link/miniprogram',
  `welcome_media_content` TEXT NULL COMMENT '欢迎语附件内容(JSON)',
  `anti_spam_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否启用防骚扰',
  `anti_spam_rules` TEXT NULL COMMENT '防骚扰规则(JSON)',
  `notice_template` TEXT NULL COMMENT '群公告模板',
  `auto_tags` TEXT NULL COMMENT '自动标签(JSON)',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_config` (`tenant_id`, `wecom_config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微群模板表';

-- 获客助手智能上下线规则表
CREATE TABLE IF NOT EXISTS `wecom_acquisition_smart_rules` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `link_id` INT NOT NULL COMMENT '获客链接ID',
  `daily_limit_enabled` TINYINT(1) DEFAULT 0,
  `daily_limit_per_user` INT DEFAULT 50,
  `daily_limit_action` VARCHAR(20) DEFAULT 'offline',
  `work_time_enabled` TINYINT(1) DEFAULT 0,
  `work_time_start` VARCHAR(10) DEFAULT '09:00',
  `work_time_end` VARCHAR(10) DEFAULT '18:00',
  `work_days` TEXT NULL COMMENT '工作日(JSON: [1,2,3,4,5])',
  `slow_reply_enabled` TINYINT(1) DEFAULT 0,
  `slow_reply_minutes` INT DEFAULT 30,
  `slow_reply_action` VARCHAR(20) DEFAULT 'offline',
  `loss_rate_enabled` TINYINT(1) DEFAULT 0,
  `loss_rate_threshold` INT DEFAULT 30,
  `next_day_auto_online` TINYINT(1) DEFAULT 1,
  `next_day_online_time` VARCHAR(10) DEFAULT '09:00',
  `next_day_exclude_manual` TINYINT(1) DEFAULT 0,
  `next_day_exclude_loss_rate` TINYINT(1) DEFAULT 0,
  `schedule_enabled` TINYINT(1) DEFAULT 0,
  `schedule_config` TEXT NULL COMMENT '排班配置(JSON)',
  `dept_quota_enabled` TINYINT(1) DEFAULT 0,
  `dept_quotas` TEXT NULL COMMENT '部门配额(JSON)',
  `dept_overflow_enabled` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_link` (`tenant_id`, `link_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='获客助手智能上下线规则表';

-- 活码表
CREATE TABLE IF NOT EXISTS `wecom_contact_ways` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `wecom_config_id` INT NOT NULL,
  `config_id` VARCHAR(100) NULL COMMENT '企微返回的config_id',
  `name` VARCHAR(200) NOT NULL COMMENT '活码名称',
  `type` INT DEFAULT 1 COMMENT '1=单人/多人 2=群聊',
  `scene` INT DEFAULT 2 COMMENT '1=小程序 2=二维码',
  `style` INT DEFAULT 0 COMMENT '样式0-3',
  `state` VARCHAR(100) NULL COMMENT '渠道标识',
  `remark` VARCHAR(500) NULL,
  `skip_verify` TINYINT(1) DEFAULT 1 COMMENT '跳过验证',
  `user_ids` TEXT NULL COMMENT '接待成员列表(JSON)',
  `party_ids` TEXT NULL COMMENT '接待部门列表(JSON)',
  `is_temp` TINYINT(1) DEFAULT 0 COMMENT '是否临时活码',
  `qr_code` VARCHAR(500) NULL COMMENT '二维码链接',
  `welcome_enabled` TINYINT(1) DEFAULT 0,
  `welcome_config` TEXT NULL COMMENT '欢迎语配置(JSON)',
  `auto_tags` TEXT NULL COMMENT '自动标签(JSON)',
  `weight_mode` VARCHAR(20) DEFAULT 'single' COMMENT '分配模式: single/round_robin/weighted',
  `user_weights` TEXT NULL COMMENT '成员权重配置(JSON)',
  `smart_rule_id` INT NULL COMMENT '智能规则ID',
  `auto_group_enabled` TINYINT(1) DEFAULT 0,
  `auto_group_config` TEXT NULL COMMENT '自动建群配置(JSON)',
  `total_add_count` INT DEFAULT 0 COMMENT '总添加数',
  `total_loss_count` INT DEFAULT 0 COMMENT '总流失数',
  `today_add_count` INT DEFAULT 0 COMMENT '今日添加数',
  `today_loss_count` INT DEFAULT 0 COMMENT '今日流失数',
  `abnormal_count` INT DEFAULT 0 COMMENT '异常数',
  `current_reception_count` INT DEFAULT 0 COMMENT '当前接待人数',
  `open_message_count` INT DEFAULT 0 COMMENT '开口消息数',
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_by` VARCHAR(50) NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(100) NULL COMMENT '创建人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_config` (`tenant_id`, `wecom_config_id`),
  INDEX `idx_config_id` (`config_id`),
  INDEX `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微活码表';

-- 活码每日统计表
CREATE TABLE IF NOT EXISTS `wecom_contact_way_daily_stats` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `contact_way_id` INT NOT NULL COMMENT '活码ID',
  `stat_date` DATE NOT NULL COMMENT '统计日期',
  `add_count` INT DEFAULT 0 COMMENT '添加数',
  `loss_count` INT DEFAULT 0 COMMENT '流失数',
  `net_count` INT DEFAULT 0 COMMENT '净增数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_contact_date` (`tenant_id`, `contact_way_id`, `stat_date`),
  INDEX `idx_contact_way` (`contact_way_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活码每日统计表';

-- 客户事件表
CREATE TABLE IF NOT EXISTS `wecom_customer_events` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `wecom_config_id` INT NOT NULL,
  `external_user_id` VARCHAR(100) NOT NULL,
  `event_type` VARCHAR(30) NOT NULL COMMENT 'add/delete/tag/link/group_join/group_leave/crm_link',
  `event_detail` TEXT NULL COMMENT '事件详情(JSON)',
  `operator_id` VARCHAR(100) NULL COMMENT '操作人',
  `event_time` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_external_time` (`tenant_id`, `external_user_id`, `event_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客户事件表';

-- 部门映射表
CREATE TABLE IF NOT EXISTS `wecom_department_mappings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `wecom_config_id` INT NOT NULL,
  `wecom_dept_id` INT NOT NULL COMMENT '企微部门ID',
  `wecom_dept_name` VARCHAR(200) NULL,
  `wecom_parent_id` INT NULL COMMENT '企微父部门ID',
  `crm_dept_id` VARCHAR(50) NULL COMMENT 'CRM部门ID',
  `crm_dept_name` VARCHAR(200) NULL,
  `member_count` INT DEFAULT 0,
  `last_sync_time` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tenant_config_dept` (`tenant_id`, `wecom_config_id`, `wecom_dept_id`),
  INDEX `idx_tenant_config` (`tenant_id`, `wecom_config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门映射表';

-- AI模型配置表
CREATE TABLE IF NOT EXISTS `wecom_ai_models` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `model_name` VARCHAR(100) NOT NULL COMMENT '模型名称',
  `provider` VARCHAR(20) NOT NULL DEFAULT 'openai' COMMENT '提供商: openai/azure/claude/deepseek/qwen/custom',
  `api_url` VARCHAR(500) NULL COMMENT 'API地址',
  `api_key` VARCHAR(500) NULL COMMENT 'API密钥(加密)',
  `model_id` VARCHAR(100) NULL COMMENT '模型标识',
  `temperature` DECIMAL(3,2) DEFAULT 0.70,
  `max_tokens` INT DEFAULT 4096,
  `top_p` DECIMAL(3,2) DEFAULT 1.00,
  `is_default` TINYINT(1) DEFAULT 0,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `last_test_time` DATETIME NULL,
  `last_test_status` VARCHAR(20) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI模型配置表';

-- 智能体配置表
CREATE TABLE IF NOT EXISTS `wecom_ai_agents` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `agent_name` VARCHAR(100) NOT NULL COMMENT '智能体名称',
  `usages` TEXT NULL COMMENT '用途列表(JSON)',
  `model_id` INT NULL COMMENT '关联AI模型ID',
  `knowledge_base_ids` TEXT NULL COMMENT '关联知识库ID列表(JSON)',
  `system_prompt` TEXT NULL COMMENT '系统提示词',
  `max_msg_per_analysis` INT DEFAULT 50,
  `context_window` INT DEFAULT 8000,
  `output_format` VARCHAR(20) DEFAULT 'json' COMMENT 'json/text/markdown',
  `retry_count` INT DEFAULT 3,
  `timeout_seconds` INT DEFAULT 30,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI智能体配置表';

-- AI质检策略表
CREATE TABLE IF NOT EXISTS `wecom_ai_inspect_strategies` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `strategy_name` VARCHAR(100) NOT NULL,
  `detect_types` TEXT NULL COMMENT '检测类型(JSON)',
  `scope` VARCHAR(20) DEFAULT 'all' COMMENT '适用范围',
  `scope_config` TEXT NULL COMMENT '范围配置(JSON)',
  `max_score` INT DEFAULT 100,
  `deduct_rules` TEXT NULL COMMENT '扣分规则(JSON)',
  `risk_levels` TEXT NULL COMMENT '风险等级配置(JSON)',
  `ai_model_id` INT NULL COMMENT '关联AI模型ID',
  `prompt_template` TEXT NULL COMMENT '提示词模板',
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI质检策略表';

-- AI质检结果表
CREATE TABLE IF NOT EXISTS `wecom_ai_inspect_results` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `strategy_id` INT NULL COMMENT '策略ID',
  `conversation_id` VARCHAR(100) NULL COMMENT '会话ID',
  `employee_user_id` VARCHAR(100) NULL,
  `employee_name` VARCHAR(100) NULL,
  `customer_user_id` VARCHAR(100) NULL,
  `customer_name` VARCHAR(100) NULL,
  `total_score` INT NULL COMMENT '总分',
  `dimension_scores` TEXT NULL COMMENT '维度评分(JSON)',
  `highlights` TEXT NULL COMMENT '亮点(JSON)',
  `improvements` TEXT NULL COMMENT '待改进(JSON)',
  `risks` TEXT NULL COMMENT '风险(JSON)',
  `ai_suggestion` TEXT NULL COMMENT 'AI建议',
  `risk_level` VARCHAR(20) NULL COMMENT '风险等级: excellent/pass/fail',
  `analyzed_msg_count` INT NULL,
  `analyzed_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_strategy` (`tenant_id`, `strategy_id`),
  INDEX `idx_tenant_employee` (`tenant_id`, `employee_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI质检结果表';

-- 知识库表
CREATE TABLE IF NOT EXISTS `wecom_knowledge_bases` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `document_count` INT DEFAULT 0,
  `entry_count` INT DEFAULT 0,
  `total_size` BIGINT DEFAULT 0,
  `index_status` VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/indexing/indexed/failed',
  `last_index_time` DATETIME NULL,
  `sync_crm_enabled` TINYINT(1) DEFAULT 0,
  `sync_crm_sources` TEXT NULL COMMENT '同步来源(JSON)',
  `sync_frequency` VARCHAR(20) DEFAULT 'manual' COMMENT 'daily/manual',
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库表';

-- 知识条目表
CREATE TABLE IF NOT EXISTS `wecom_knowledge_entries` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `knowledge_base_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NULL,
  `tags` TEXT NULL COMMENT 'JSON',
  `source_type` VARCHAR(20) DEFAULT 'manual' COMMENT 'manual/document/crm_sync',
  `source_file` VARCHAR(500) NULL,
  `embedding` TEXT NULL,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_kb` (`tenant_id`, `knowledge_base_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识条目表';

-- 话术分类表
CREATE TABLE IF NOT EXISTS `wecom_script_categories` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `name` VARCHAR(100) NOT NULL,
  `color` VARCHAR(100) NULL COMMENT '颜色标识',
  `scope` VARCHAR(100) NULL DEFAULT 'public' COMMENT 'public=全员可见 personal=仅自己',
  `created_by` VARCHAR(100) NULL COMMENT '创建人用户ID',
  `sort_order` INT DEFAULT 0,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='话术分类表';

-- 话术表
CREATE TABLE IF NOT EXISTS `wecom_scripts` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `category_id` INT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NULL,
  `shortcut` VARCHAR(50) NULL COMMENT '快捷短语',
  `attachments` TEXT NULL COMMENT 'JSON附件列表',
  `tags` TEXT NULL COMMENT 'JSON标签',
  `scope` VARCHAR(20) DEFAULT 'public' COMMENT 'public=全员可见 personal=仅自己',
  `created_by` VARCHAR(100) NULL COMMENT '创建人用户ID',
  `created_by_name` VARCHAR(100) NULL,
  `color` VARCHAR(20) NULL COMMENT '颜色标识',
  `sort_order` INT DEFAULT 0,
  `use_count` INT DEFAULT 0,
  `ai_rewrite_enabled` TINYINT(1) DEFAULT 0,
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tenant_category` (`tenant_id`, `category_id`),
  INDEX `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='话术表';

-- AI调用日志表
CREATE TABLE IF NOT EXISTS `wecom_ai_logs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `agent_id` INT NULL,
  `agent_name` VARCHAR(100) NULL,
  `operation_type` VARCHAR(50) NULL COMMENT '操作类型',
  `target_description` VARCHAR(500) NULL COMMENT '目标描述',
  `input_tokens` INT DEFAULT 0,
  `output_tokens` INT DEFAULT 0,
  `total_tokens` INT DEFAULT 0,
  `duration_ms` INT DEFAULT 0,
  `status` VARCHAR(20) DEFAULT 'success' COMMENT 'success/fail/timeout',
  `error_message` TEXT NULL,
  `request_payload` TEXT NULL,
  `response_payload` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant_time` (`tenant_id`, `created_at`),
  INDEX `idx_tenant_agent` (`tenant_id`, `agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI调用日志表';

-- 侧边栏授权码表
CREATE TABLE IF NOT EXISTS `wecom_sidebar_auth_codes` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `tenant_id` VARCHAR(36) NULL,
  `code` VARCHAR(100) NOT NULL COMMENT '授权码',
  `code_type` VARCHAR(20) DEFAULT 'single' COMMENT 'single/multi/permanent',
  `max_uses` INT DEFAULT 1,
  `used_count` INT DEFAULT 0,
  `expire_at` DATETIME NULL,
  `created_by` VARCHAR(50) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_code` (`code`),
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='侧边栏授权码表';

-- 管理后台系统配置表（snake_case，管理后台和企微增值服务使用）
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` VARCHAR(36) NOT NULL,
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `config_value` TEXT COMMENT '配置值',
  `config_type` VARCHAR(50) DEFAULT 'string' COMMENT '配置类型: string/json/number/boolean/system',
  `config_group` VARCHAR(100) DEFAULT 'general' COMMENT '配置分组',
  `description` VARCHAR(255) DEFAULT NULL COMMENT '配置描述',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID（NULL表示全局配置）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key_tenant` (`config_key`, `tenant_id`),
  KEY `idx_config_key` (`config_key`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表（管理后台）';



-- =============================================
-- 增值管理系统表（2026-03-02新增）
-- =============================================

-- 增值订单表
CREATE TABLE IF NOT EXISTS `value_added_orders` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '订单ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `order_id` VARCHAR(50) DEFAULT NULL COMMENT '关联订单ID',
  `order_number` VARCHAR(50) DEFAULT NULL COMMENT '订单号',
  `customer_id` VARCHAR(50) DEFAULT NULL COMMENT '客户ID',
  `customer_name` VARCHAR(100) DEFAULT NULL COMMENT '客户姓名',
  `customer_phone` VARCHAR(20) DEFAULT NULL COMMENT '客户电话',
  `tracking_number` VARCHAR(100) DEFAULT NULL COMMENT '物流单号',
  `express_company` VARCHAR(50) DEFAULT NULL COMMENT '物流公司',
  `order_status` VARCHAR(20) DEFAULT NULL COMMENT '订单状态',
  `order_date` DATETIME DEFAULT NULL COMMENT '下单日期',
  `company_id` VARCHAR(50) NOT NULL COMMENT '外包公司ID',
  `company_name` VARCHAR(200) NOT NULL COMMENT '外包公司名称',
  `unit_price` DECIMAL(10,2) NOT NULL COMMENT '单价',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '有效状态：pending-待处理, valid-有效, invalid-无效, supplemented-已补单',
  `settlement_status` VARCHAR(20) DEFAULT 'unsettled' COMMENT '结算状态：unsettled-未结算, settled-已结算',
  `settlement_amount` DECIMAL(10,2) DEFAULT 0.00 COMMENT '实际结算金额',
  `settlement_date` DATE DEFAULT NULL COMMENT '结算日期',
  `settlement_batch` VARCHAR(50) DEFAULT NULL COMMENT '结算批次号',
  `invalid_reason` VARCHAR(500) DEFAULT NULL COMMENT '无效原因',
  `supplement_order_id` VARCHAR(50) DEFAULT NULL COMMENT '补单关联ID',
  `export_date` DATE DEFAULT NULL COMMENT '导出日期',
  `export_batch` VARCHAR(50) DEFAULT NULL COMMENT '导出批次号',
  `remark` TEXT DEFAULT NULL COMMENT '备注信息',
  `operator_id` VARCHAR(50) DEFAULT NULL COMMENT '操作员ID',
  `operator_name` VARCHAR(50) DEFAULT NULL COMMENT '操作员姓名',
  `created_by` VARCHAR(50) DEFAULT NULL COMMENT '创建人ID',
  `created_by_name` VARCHAR(50) DEFAULT NULL COMMENT '创建人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_order_number` (`order_number`),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_order_date` (`order_date`),
  INDEX `idx_order_status` (`order_status`),
  INDEX `idx_customer_name` (`customer_name`),
  INDEX `idx_status_date` (`status`, `order_date`),
  INDEX `idx_settlement_date` (`settlement_status`, `order_date`),
  INDEX `idx_company_date` (`company_id`, `order_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理订单表';

-- 外包公司表
CREATE TABLE IF NOT EXISTS `outsource_companies` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '公司ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `company_name` VARCHAR(200) NOT NULL COMMENT '公司名称',
  `contact_person` VARCHAR(100) COMMENT '联系人',
  `contact_phone` VARCHAR(20) COMMENT '联系电话',
  `contact_email` VARCHAR(100) COMMENT '联系邮箱',
  `address` TEXT COMMENT '公司地址',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态：active-启用, inactive-停用',
  `sort_order` INT DEFAULT 999 COMMENT '排序顺序，数字越小越靠前',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认公司（0-否，1-是）',
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
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_company_name` (`company_name`),
  INDEX `idx_status` (`status`),
  INDEX `idx_sort_order` (`sort_order`),
  INDEX `idx_is_default` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外包公司表';

-- 价格档位配置表
CREATE TABLE IF NOT EXISTS `value_added_price_config` (
  `id` VARCHAR(50) NOT NULL COMMENT '配置ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
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
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_tier_order` (`tier_order`),
  KEY `idx_date_range` (`start_date`, `end_date`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外包公司价格配置表';

-- 状态配置表
CREATE TABLE IF NOT EXISTS `value_added_status_configs` (
  `id` VARCHAR(50) NOT NULL COMMENT '配置ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `type` VARCHAR(50) NOT NULL COMMENT '配置类型：validStatus-有效状态，settlementStatus-结算状态',
  `value` VARCHAR(50) NOT NULL COMMENT '状态值（英文）',
  `label` VARCHAR(100) NOT NULL COMMENT '状态标签（中文）',
  `sort_order` INT DEFAULT 999 COMMENT '排序顺序',
  `is_system` TINYINT DEFAULT 0 COMMENT '是否系统预设: 0-否(可删除), 1-是(不可删除)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_type_value` (`tenant_id`, `type`, `value`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_type` (`type`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理状态配置表';

-- 备注预设表
CREATE TABLE IF NOT EXISTS `value_added_remark_presets` (
  `id` VARCHAR(50) NOT NULL COMMENT '预设ID',
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `category` VARCHAR(50) NOT NULL COMMENT '预设类型：invalid-无效原因，general-通用备注',
  `remark_text` VARCHAR(500) NOT NULL COMMENT '备注文本',
  `sort_order` INT DEFAULT 0 COMMENT '排序顺序',
  `usage_count` INT DEFAULT 0 COMMENT '使用次数',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用（0-否，1-是）',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_category` (`category`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_usage_count` (`usage_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='增值管理备注预设表';

-- =============================================
-- 增值管理系统初始数据
-- 说明：系统默认预设(is_system=1)全租户生效，不可删除
-- 注意：tenant_id 由后端 ensureSystemDefaultConfigs() 在每个租户首次访问时自动填充
-- 此处仅保留数据结构定义，实际初始化由后端自动完成
-- =============================================

-- 插入状态配置预设数据（示例：仅供参考，实际由后端 ensureSystemDefaultConfigs 自动初始化）
-- INSERT INTO `value_added_status_configs` (`id`, `tenant_id`, `type`, `value`, `label`, `sort_order`, `is_system`, `created_at`) VALUES
-- ('vs-pending-001', NULL, 'validStatus', 'pending', '待处理', 1, 1, NOW()),
-- ('vs-valid-001', NULL, 'validStatus', 'valid', '有效', 2, 1, NOW()),
-- ('vs-invalid-001', NULL, 'validStatus', 'invalid', '无效', 3, 1, NOW()),
-- ('vs-supplemented-001', NULL, 'validStatus', 'supplemented', '已补单', 4, 1, NOW()),
-- ('ss-unsettled-001', NULL, 'settlementStatus', 'unsettled', '未结算', 1, 1, NOW()),
-- ('ss-settled-001', NULL, 'settlementStatus', 'settled', '已结算', 2, 1, NOW());

-- 插入备注预设数据（优化后只保留8个简洁选项）
-- 注意：这些也由后端按租户自动初始化，此处注释保留供参考
-- INSERT INTO `value_added_remark_presets` (`id`, `category`, `sort_order`, `is_active`, `remark_text`) VALUES
-- (REPLACE(UUID(), '-', ''), 'invalid', 1, 1, '七天未联系上'),
-- (REPLACE(UUID(), '-', ''), 'invalid', 2, 1, '重大疾病'),
-- (REPLACE(UUID(), '-', ''), 'invalid', 3, 1, '哺乳期孕期'),
-- (REPLACE(UUID(), '-', ''), 'invalid', 4, 1, '退货'),
-- (REPLACE(UUID(), '-', ''), 'invalid', 5, 1, '拒绝指导'),
-- (REPLACE(UUID(), '-', ''), 'invalid', 6, 1, '以后再用'),
-- (REPLACE(UUID(), '-', ''), 'invalid', 7, 1, '空号'),
-- (REPLACE(UUID(), '-', ''), 'invalid', 8, 1, '其他原因');

-- =============================================
-- 模块管理系统表
-- =============================================

-- 模块表（Admin后台模块管理）
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
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
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
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_key` (`module_id`, `config_key`),
  KEY `idx_module_id` (`module_id`),
  CONSTRAINT `fk_module_configs_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块配置表';

-- 模块状态表（CRM前端模块启停控制）
CREATE TABLE IF NOT EXISTS `module_status` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `module_key` VARCHAR(50) NOT NULL COMMENT '模块标识',
  `module_name` VARCHAR(100) NOT NULL COMMENT '模块名称',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '模块描述',
  `icon` VARCHAR(50) DEFAULT NULL COMMENT '图标名称',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `disabled_reason` VARCHAR(500) DEFAULT NULL COMMENT '停用原因',
  `disabled_at` DATETIME DEFAULT NULL COMMENT '停用时间',
  `disabled_by` VARCHAR(100) DEFAULT NULL COMMENT '停用操作人',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_module_key` (`module_key`),
  KEY `idx_module_key` (`module_key`),
  KEY `idx_is_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块状态表';

-- =============================================
-- API配置表
-- =============================================

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

-- =============================================
-- 通知模板表
-- =============================================

CREATE TABLE IF NOT EXISTS `notification_templates` (
  `id` VARCHAR(36) NOT NULL COMMENT '模板ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
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
  KEY `idx_scene` (`scene`),
  INDEX `idx_notification_templates_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板表';

-- =============================================
-- 微信公众号相关表
-- =============================================

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
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `app_id` VARCHAR(100) NOT NULL COMMENT 'AppID',
  `app_secret` VARCHAR(200) NOT NULL COMMENT 'AppSecret',
  `token` VARCHAR(100) DEFAULT NULL COMMENT 'Token',
  `encoding_aes_key` VARCHAR(200) DEFAULT NULL COMMENT 'EncodingAESKey',
  `server_url` VARCHAR(500) DEFAULT NULL COMMENT '服务器URL',
  `message_encrypt_mode` VARCHAR(20) DEFAULT 'plaintext' COMMENT '消息加密方式',
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
  PRIMARY KEY (`id`),
  INDEX `idx_wechat_official_account_config_tenant_id` (`tenant_id`)
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
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信二维码场景表';

-- =============================================
-- 模块管理初始数据
-- =============================================

-- 插入CRM系统默认模块（12个）
INSERT INTO `modules` (`id`, `name`, `code`, `description`, `icon`, `version`, `status`, `is_system`, `sort_order`) VALUES
(UUID(), '数据看板', 'dashboard_management', '系统数据总览、趋势分析', 'Odometer', '1.0.0', 'enabled', 1, 0),
(UUID(), '订单管理', 'order_management', '订单创建、审核、发货等功能', 'ShoppingCart', '1.0.0', 'enabled', 1, 1),
(UUID(), '客户管理', 'customer_management', '客户信息管理、跟进记录', 'User', '1.0.0', 'enabled', 1, 2),
(UUID(), '财务管理', 'finance_management', '代收管理、结算报表、增值服务', 'Money', '1.0.0', 'enabled', 1, 3),
(UUID(), '物流管理', 'logistics_management', '物流跟踪、状态更新', 'Van', '1.0.0', 'enabled', 1, 4),
(UUID(), '售后管理', 'aftersales_management', '售后申请、处理流程', 'Service', '1.0.0', 'enabled', 1, 5),
(UUID(), '通话管理', 'call_management', '通话记录、录音管理', 'Phone', '1.0.0', 'enabled', 1, 6),
(UUID(), '资料管理', 'data_management', '客户资料、文档管理', 'Folder', '1.0.0', 'enabled', 1, 7),
(UUID(), '业绩统计', 'performance_management', '销售业绩、团队绩效', 'TrendCharts', '1.0.0', 'enabled', 1, 8),
(UUID(), '商品管理', 'product_management', '商品信息、库存、分类管理', 'Goods', '1.0.0', 'enabled', 1, 9),
(UUID(), '系统管理', 'system_management', '用户、角色、权限管理', 'Setting', '1.0.0', 'enabled', 1, 10),
(UUID(), '企微管理', 'wecom_management', '企业微信集成管理，包括企微应用配置、客户同步、会话存档等功能', 'ChatLineSquare', '1.0.0', 'enabled', 0, 11)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 插入模块启停状态（12个前端模块）
INSERT INTO `module_status` (`module_key`, `module_name`, `description`, `icon`, `is_enabled`, `sort_order`) VALUES
('dashboard', '数据看板', '数据统计与可视化看板', 'Odometer', 1, 1),
('customer', '客户管理', '客户信息管理、跟进记录', 'User', 1, 2),
('order', '订单管理', '订单创建、审核、发货等功能', 'ShoppingCart', 1, 3),
('product', '商品管理', '商品信息、库存、分类管理', 'Goods', 1, 4),
('logistics', '物流管理', '物流跟踪、状态更新', 'Van', 1, 5),
('performance', '业绩管理', '销售业绩、团队绩效', 'TrendCharts', 1, 6),
('service', '售后管理', '售后申请、处理流程', 'Service', 1, 7),
('finance', '财务管理', '代收管理、结算报表、增值服务', 'Money', 1, 8),
('data', '资料管理', '客户资料、文档管理', 'Folder', 1, 9),
('serviceManagement', '服务管理', '服务项目与服务记录管理', 'SetUp', 1, 10),
('system', '系统管理', '用户、角色、权限管理', 'Setting', 1, 11),
('wecom', '企微管理', '企业微信集成管理，客户同步、会话存档', 'ChatLineSquare', 1, 12)
ON DUPLICATE KEY UPDATE `module_name` = VALUES(`module_name`), `updated_at` = CURRENT_TIMESTAMP;

-- 插入默认套餐数据（8个套餐：4个SaaS + 1个测试 + 3个私有部署）
INSERT INTO `tenant_packages` (`name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`, `features`, `modules`, `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`, `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`) VALUES
('7天免费试用', 'FREE_TRIAL', 'saas', '体验云客CRM全部基础功能', 0.00, NULL, 'monthly', 7, 3, 1, 'online', 5, '["客户管理", "订单管理", "基础报表", "数据导入导出"]', '["dashboard", "customer", "order", "service-management", "performance", "logistics", "service", "data", "finance", "product", "system"]', 1, 0, 1, 0, 1, 0.00, 0, NULL),
('基础版', 'SAAS_BASIC', 'saas', '适合小型团队起步', 199.00, NULL, 'monthly', 30, 10, 5, 'total', 0, '["客户管理", "订单管理", "基础报表", "数据导入导出", "物流跟踪"]', '["dashboard", "customer", "order", "service-management", "performance", "logistics", "service", "data", "finance", "product", "system"]', 0, 0, 1, 1, 1, 0.00, 2, NULL),
('专业版', 'SAAS_PRO', 'saas', '适合成长型团队', 299.00, NULL, 'monthly', 30, 50, 50, 'total', 0, '["客户管理", "订单管理", "基础报表", "数据导入导出", "物流跟踪", "高级报表分析", "API接口", "自定义字段"]', '["dashboard", "customer", "order", "service-management", "performance", "logistics", "service", "data", "finance", "product", "system"]', 0, 1, 1, 2, 1, 0.00, 2, NULL),
('企业版', 'SAAS_ENTERPRISE', 'saas', '适合大型销售团队', 599.00, NULL, 'monthly', 30, 200, 200, 'total', 0, '["客户管理", "订单管理", "基础报表", "数据导入导出", "物流跟踪", "高级报表分析", "API接口", "自定义字段", "电销外呼系统", "专属客户成功经理", "优先技术支持", "SLA保障"]', '["dashboard", "customer", "order", "service-management", "performance", "logistics", "service", "data", "finance", "product", "system", "wecom"]', 0, 0, 1, 3, 1, 0.00, 2, 5990.00),
('标准版', 'PRIVATE_STANDARD', 'private', '适合中小企业私有部署', 9800.00, NULL, 'once', 36500, 50, 0, 'total', 0, '["永久授权", "全部核心功能", "部署文档", "1年免费升级", "邮件技术支持"]', NULL, 0, 0, 1, 10, 1, 0.00, 0, 3700.00),
('专业版', 'PRIVATE_PRO', 'private', '适合中大型企业', 19800.00, NULL, 'once', 36500, 200, 0, 'total', 0, '["永久授权", "全部功能模块", "远程部署协助", "1年技术支持", "1年免费升级", "专属技术顾问"]', NULL, 0, 1, 1, 11, 1, 0.00, 0, 7500.00),
('企业版', 'PRIVATE_ENTERPRISE', 'private', '适合大型企业/集团', 39800.00, NULL, 'once', 36500, 99999, 0, 'total', 0, '["永久授权", "不限用户数", "全部功能模块", "现场部署支持", "专属技术顾问", "定制开发服务", "7x24技术支持"]', NULL, 0, 0, 1, 12, 1, 0.00, 0, 15100.00)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 插入企微增值服务配置默认数据（5个服务类型）
INSERT INTO `wecom_vas_configs` (`service_type`, `service_name`, `default_price`, `min_price`, `billing_unit`, `trial_days`, `tier_pricing`, `description`, `is_enabled`) VALUES
('chat_archive', '会话存档服务', 100.00, 50.00, 'per_user_year', 7,
 '[{"min":1,"max":10,"price":100},{"min":11,"max":50,"price":90},{"min":51,"max":100,"price":80},{"min":101,"max":999999,"price":70}]',
 '企微会话存档增值服务，可查看员工与客户的聊天记录，支持敏感词检测和质检功能。', 1),
('ai_assistant', 'AI智能助手', 99.00, 0.00, 'per_package', 0,
 '[{"id":"trial","name":"体验包","calls":100,"price":0},{"id":"basic","name":"基础包","calls":1000,"price":99},{"id":"standard","name":"标准包","calls":5000,"price":399},{"id":"pro","name":"专业包","calls":10000,"price":699},{"id":"enterprise","name":"企业包","calls":50000,"price":2999}]',
 'AI智能助手服务，提供智能客服回复、会话质检、客户画像分析等AI能力。按调用次数计费。', 1),
('acquisition', '获客助手', 299.00, 0.00, 'monthly', 0,
 '[{"name":"基础版","price":0,"maxChannels":3},{"name":"专业版","price":299,"maxChannels":50},{"name":"企业版","price":2999,"maxChannels":0}]',
 '企微获客助手，提供智能获客链接、渠道活码、数据分析看板、转化漏斗等功能。', 1),
('wecom_auth', '企微管理授权', 0.00, 0.00, 'yearly', 0,
 '[{"name":"基础版","price":0,"wecomQuota":1},{"name":"企业版","price":2000,"wecomQuota":3},{"name":"旗舰版","price":8000,"wecomQuota":10}]',
 '企微管理授权套餐，授权企业微信接入CRM系统。基础版免费，高级版支持多企业绑定。', 1),
('sms_quota', '短信额度', 5.00, 5.00, 'per_package', 0,
 '[{"id":"pkg-sms-001","name":"体验包","sms_count":100,"price":5.00},{"id":"pkg-sms-002","name":"基础包","sms_count":500,"price":22.50},{"id":"pkg-sms-003","name":"标准包","sms_count":2000,"price":80.00},{"id":"pkg-sms-004","name":"旗舰包","sms_count":10000,"price":350.00}]',
 '短信额度套餐，用于发送短信通知、营销短信、验证码等。按条数购买。', 1)
ON DUPLICATE KEY UPDATE
  `service_name` = VALUES(`service_name`),
  `default_price` = VALUES(`default_price`),
  `tier_pricing` = VALUES(`tier_pricing`),
  `description` = VALUES(`description`),
  `updated_at` = CURRENT_TIMESTAMP;

-- 插入企微定价配置到system_config（企微授权套餐+AI助手+会话存档+获客助手统一配置）
INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `created_at`, `updated_at`)
VALUES (UUID(), 'wecom_pricing_config',
'{"wecomPackages":[{"name":"基础版","wecomQuota":1,"featureScope":"基础功能","yearlyPrice":0,"enabled":true,"recommended":false,"sortOrder":0,"archiveIncluded":"none","aiQuotaIncluded":0,"acquisitionIncluded":false,"description":"免费体验企微基础管理功能","menuAddressBook":true,"menuCustomer":true,"menuCustomerGroup":false,"menuAcquisition":false,"menuContactWay":false,"menuChatArchive":false,"menuAiAssistant":false,"menuCustomerService":false,"menuSidebar":false,"menuPayment":false},{"name":"企业版","wecomQuota":3,"featureScope":"标准功能","yearlyPrice":2000,"enabled":true,"recommended":true,"sortOrder":1,"archiveIncluded":"20","aiQuotaIncluded":500,"acquisitionIncluded":false,"description":"适合中小企业，含会话存档和AI额度","menuAddressBook":true,"menuCustomer":true,"menuCustomerGroup":true,"menuAcquisition":false,"menuContactWay":true,"menuChatArchive":true,"menuAiAssistant":true,"menuCustomerService":true,"menuSidebar":true,"menuPayment":true},{"name":"旗舰版","wecomQuota":10,"featureScope":"全部功能","yearlyPrice":8000,"enabled":true,"recommended":false,"sortOrder":2,"archiveIncluded":"50","aiQuotaIncluded":2000,"acquisitionIncluded":true,"description":"全功能解锁，大型团队首选","menuAddressBook":true,"menuCustomer":true,"menuCustomerGroup":true,"menuAcquisition":true,"menuContactWay":true,"menuChatArchive":true,"menuAiAssistant":true,"menuCustomerService":true,"menuSidebar":true,"menuPayment":true}],"archivePricing":[{"tierLabel":"1-5人","maxMembers":5,"officialPrice":300,"salePrice":160,"costPrice":105,"profitRate":34},{"tierLabel":"6-20人","maxMembers":20,"officialPrice":300,"salePrice":150,"costPrice":105,"profitRate":30},{"tierLabel":"21-50人","maxMembers":50,"officialPrice":250,"salePrice":140,"costPrice":87,"profitRate":38},{"tierLabel":"51-200人","maxMembers":200,"officialPrice":200,"salePrice":120,"costPrice":70,"profitRate":42}],"archiveGlobalConfig":{"purchaseMode":"both","seatServiceFee":50},"aiPackages":[{"id":"trial","name":"体验包","calls":100,"price":0,"description":"免费体验100次AI调用","validity":"forever","recommended":false,"freeTrialOnce":true},{"id":"basic","name":"基础包","calls":1000,"price":99,"description":"1000次AI调用，适合小团队","validity":"90","recommended":false},{"id":"standard","name":"标准包","calls":5000,"price":399,"description":"5000次AI调用，企业常用","validity":"365","recommended":true},{"id":"pro","name":"专业包","calls":10000,"price":699,"description":"10000次AI调用，专业版","validity":"365","recommended":false},{"id":"enterprise","name":"企业包","calls":50000,"price":2999,"description":"50000次AI调用，大型企业","validity":"365","recommended":false}],"acquisitionPricing":[{"name":"基础版","price":0,"billingCycle":"月","maxChannels":3,"dashboardEnabled":true,"funnelEnabled":false,"profileEnabled":false,"recommended":false,"description":"免费使用基础获客管理功能"},{"name":"专业版","price":299,"billingCycle":"月","maxChannels":50,"dashboardEnabled":true,"funnelEnabled":true,"profileEnabled":true,"recommended":true,"description":"完整获客数据分析与转化追踪"},{"name":"企业版","price":2999,"billingCycle":"年","maxChannels":0,"dashboardEnabled":true,"funnelEnabled":true,"profileEnabled":true,"recommended":false,"description":"无限渠道，全功能解锁，年付更优惠"}]}',
'json', NOW(), NOW())
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = NOW();

-- 插入AI套餐全局配置（供CRM前端读取）
INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `created_at`, `updated_at`)
VALUES (UUID(), 'ai_packages_global',
'[{"id":"trial","name":"体验包","calls":100,"price":0,"description":"免费体验100次AI调用","validity":"forever","recommended":false,"freeTrialOnce":true},{"id":"basic","name":"基础包","calls":1000,"price":99,"description":"1000次AI调用，适合小团队","validity":"90","recommended":false},{"id":"standard","name":"标准包","calls":5000,"price":399,"description":"5000次AI调用，企业常用","validity":"365","recommended":true},{"id":"pro","name":"专业包","calls":10000,"price":699,"description":"10000次AI调用，专业版","validity":"365","recommended":false},{"id":"enterprise","name":"企业包","calls":50000,"price":2999,"description":"50000次AI调用，大型企业","validity":"365","recommended":false}]',
'json', NOW(), NOW())
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = NOW();

-- 插入会话存档定价配置（供CRM前端读取）
INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `created_at`, `updated_at`)
VALUES (UUID(), 'wecom_archive_pricing',
'[{"tierLabel":"1-5人","maxMembers":5,"officialPrice":300,"salePrice":160,"costPrice":105,"profitRate":34},{"tierLabel":"6-20人","maxMembers":20,"officialPrice":300,"salePrice":150,"costPrice":105,"profitRate":30},{"tierLabel":"21-50人","maxMembers":50,"officialPrice":250,"salePrice":140,"costPrice":87,"profitRate":38},{"tierLabel":"51-200人","maxMembers":200,"officialPrice":200,"salePrice":120,"costPrice":70,"profitRate":42}]',
'json', NOW(), NOW())
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = NOW();

-- 插入获客助手定价配置
INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `created_at`, `updated_at`)
VALUES (UUID(), 'wecom_acquisition_pricing',
'[{"name":"基础版","price":0,"billingCycle":"月","maxChannels":3,"dashboardEnabled":true,"funnelEnabled":false,"profileEnabled":false,"recommended":false,"description":"免费使用基础获客管理功能"},{"name":"专业版","price":299,"billingCycle":"月","maxChannels":50,"dashboardEnabled":true,"funnelEnabled":true,"profileEnabled":true,"recommended":true,"description":"完整获客数据分析与转化追踪"},{"name":"企业版","price":2999,"billingCycle":"年","maxChannels":0,"dashboardEnabled":true,"funnelEnabled":true,"profileEnabled":true,"recommended":false,"description":"无限渠道，全功能解锁，年付更优惠"}]',
'json', NOW(), NOW())
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = NOW();

-- 插入企微VAS会话存档增值配置
INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `created_at`, `updated_at`)
VALUES (UUID(), 'wecom_vas_config',
'{"chatArchive":{"enabled":true,"defaultPrice":100,"minPrice":50,"billingUnit":"per_user_year","trialDays":7,"tierPricing":[{"min":1,"max":10,"price":100},{"min":11,"max":50,"price":90},{"min":51,"max":100,"price":80},{"min":101,"max":999999,"price":70}],"description":"企微会话存档增值服务","purchaseMode":"both","seatServiceFee":50}}',
'json', NOW(), NOW())
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`), `updated_at` = NOW();

-- 插入通知模板默认数据（13个模板）
INSERT INTO `notification_templates` (`id`, `template_code`, `template_name`, `template_type`, `category`, `scene`, `email_subject`, `email_content`, `sms_content`, `variables`, `variable_description`, `is_system`, `priority`, `send_email`, `send_sms`) VALUES
('tpl-001', 'tenant_register_success', '租户注册成功', 'both', 'tenant', '租户注册成功后发送欢迎邮件和短信',
'欢迎注册{{systemName}}',
'<h2>欢迎注册{{systemName}}</h2><p>尊敬的 <strong>{{tenantName}}</strong>，您好！</p><p>恭喜您成功注册。</p>',
'欢迎注册{{systemName}}！管理员账号：{{adminUsername}}，初始密码：{{adminPassword}}。',
'{"systemName":"系统名称","tenantName":"租户名称","adminUsername":"管理员账号","adminPassword":"初始密码","packageName":"套餐名称","expireDate":"到期时间"}',
'租户注册成功后发送', 1, 'high', 1, 1),

('tpl-002', 'payment_success', '支付成功通知', 'both', 'payment', '支付成功后通知',
'支付成功 - {{orderNumber}}',
'<h2>支付成功</h2><p>订单{{orderNumber}}已支付成功，金额¥{{amount}}。</p>',
'支付成功！订单{{orderNumber}}，金额¥{{amount}}。',
'{"tenantName":"租户名称","orderNumber":"订单号","packageName":"套餐名称","amount":"支付金额","serviceStartDate":"服务开始日期","serviceEndDate":"服务结束日期"}',
'支付成功后立即发送', 1, 'high', 1, 1),

('tpl-003', 'payment_pending', '待支付提醒', 'both', 'payment', '订单创建后待支付提醒',
'订单待支付 - {{orderNumber}}', NULL, NULL,
'{"tenantName":"租户名称","orderNumber":"订单号","packageName":"套餐名称","amount":"应付金额"}',
'订单创建后发送', 1, 'normal', 1, 1),

('tpl-004', 'payment_refund', '退款成功通知', 'both', 'payment', '退款成功通知',
'退款成功 - {{orderNumber}}', NULL, NULL,
'{"tenantName":"租户名称","orderNumber":"订单号","refundAmount":"退款金额","refundReason":"退款原因"}',
'退款成功后发送', 1, 'high', 1, 1),

('tpl-005', 'license_generated', '授权码生成通知', 'email', 'license', '授权码生成后发送',
'授权码已生成 - {{tenantName}}', NULL, NULL,
'{"tenantName":"租户名称","licenseKey":"授权码","licenseType":"授权类型","expireDate":"到期时间","maxUsers":"最大用户数"}',
'授权码生成后发送', 1, 'high', 1, 0),

('tpl-006', 'license_expire_soon', '授权即将到期提醒', 'both', 'license', '授权到期前7天提醒',
'授权即将到期提醒', NULL, NULL,
'{"tenantName":"租户名称","licenseKey":"授权码","expireDate":"到期时间","remainDays":"剩余天数"}',
'到期前7天、3天、1天各发送一次', 1, 'high', 1, 1),

('tpl-007', 'license_expired', '授权已到期通知', 'both', 'license', '授权到期后通知',
'授权已到期', NULL, NULL,
'{"tenantName":"租户名称","licenseKey":"授权码","expireDate":"到期时间"}',
'授权到期后发送', 1, 'urgent', 1, 1),

('tpl-008', 'tenant_activated', '账号激活成功', 'both', 'tenant', '账号激活成功通知',
'账号激活成功', NULL, NULL,
'{"tenantName":"租户名称","activateTime":"激活时间","serviceEndDate":"服务结束日期"}',
'账号激活后发送', 1, 'high', 1, 1),

('tpl-009', 'tenant_suspended', '账号已暂停', 'both', 'tenant', '账号暂停通知',
'账号已暂停', NULL, NULL,
'{"tenantName":"租户名称","reason":"暂停原因","suspendTime":"暂停时间"}',
'账号暂停时发送', 1, 'urgent', 1, 1),

('tpl-010', 'tenant_resumed', '账号已恢复', 'both', 'tenant', '账号恢复通知',
'账号已恢复', NULL, NULL,
'{"tenantName":"租户名称","resumeTime":"恢复时间"}',
'账号恢复时发送', 1, 'high', 1, 1),

('tpl-011', 'renew_success', '续费成功通知', 'both', 'payment', '续费成功通知',
'续费成功', NULL, NULL,
'{"tenantName":"租户名称","amount":"续费金额","duration":"续费时长","newExpireDate":"新到期时间"}',
'续费成功后发送', 1, 'high', 1, 1),

('tpl-012', 'package_upgraded', '套餐升级成功', 'both', 'tenant', '套餐升级成功通知',
'套餐升级成功', NULL, NULL,
'{"tenantName":"租户名称","oldPackage":"原套餐","newPackage":"新套餐","upgradeTime":"升级时间"}',
'套餐升级后发送', 1, 'high', 1, 1),

('tpl-013', 'capacity_expanded', '容量扩容成功', 'email', 'tenant', '容量扩容成功通知',
'容量扩容成功', NULL, NULL,
'{"tenantName":"租户名称","item":"扩容项目","oldCapacity":"原容量","newCapacity":"新容量","expandTime":"扩容时间"}',
'容量扩容后发送', 1, 'normal', 1, 0)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 插入微信公众号默认配置
INSERT INTO `wechat_official_account_config` (`id`, `app_id`, `app_secret`, `welcome_message`, `default_reply`, `is_enabled`) VALUES
('wechat-config-001', '', '',
'欢迎关注云客CRM！回复"绑定"绑定账号，回复"帮助"查看更多。',
'感谢您的消息！回复"绑定"绑定账号，回复"帮助"查看帮助。',
0)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- =============================================
-- 缺失表补充（2026-04-03 审查后添加）
-- =============================================

-- 代收取消申请表
CREATE TABLE IF NOT EXISTS `cod_cancel_applications` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '申请ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `order_id` VARCHAR(36) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NOT NULL COMMENT '订单号',
  `applicant_id` VARCHAR(36) NOT NULL COMMENT '申请人ID',
  `applicant_name` VARCHAR(50) NOT NULL COMMENT '申请人姓名',
  `department_id` VARCHAR(36) NULL COMMENT '申请人部门ID',
  `department_name` VARCHAR(50) NULL COMMENT '申请人部门名称',
  `original_cod_amount` DECIMAL(10,2) NOT NULL COMMENT '原代收金额',
  `modified_cod_amount` DECIMAL(10,2) NOT NULL COMMENT '修改后代收金额',
  `cancel_reason` TEXT NOT NULL COMMENT '取消原因',
  `payment_proof` JSON NULL COMMENT '尾款凭证（JSON数组）',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '申请状态: pending-待审核, approved-已通过, rejected-已拒绝',
  `reviewer_id` VARCHAR(36) NULL COMMENT '审核人ID',
  `reviewer_name` VARCHAR(50) NULL COMMENT '审核人姓名',
  `review_remark` TEXT NULL COMMENT '审核意见',
  `reviewed_at` DATETIME NULL COMMENT '审核时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_cod_tenant_id` (`tenant_id`),
  INDEX `idx_cod_order_id` (`order_id`),
  INDEX `idx_cod_order_number` (`order_number`),
  INDEX `idx_cod_status` (`status`),
  INDEX `idx_cod_applicant_id` (`applicant_id`),
  INDEX `idx_cod_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代收取消申请表';

-- 版本更新日志表（与versions表关联，记录每个版本的更新明细）
CREATE TABLE IF NOT EXISTS `changelogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  `version_id` VARCHAR(36) NOT NULL COMMENT '版本ID',
  `type` ENUM('feature', 'bugfix', 'improvement', 'security', 'breaking') DEFAULT 'feature' COMMENT '类型：feature-新功能，bugfix-修复，improvement-改进，security-安全，breaking-破坏性变更',
  `content` TEXT NOT NULL COMMENT '更新内容',
  `sort_order` INT DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_changelogs_version_id` (`version_id`),
  INDEX `idx_changelogs_type` (`type`),
  INDEX `idx_changelogs_sort_order` (`sort_order`),
  CONSTRAINT `fk_changelogs_version` FOREIGN KEY (`version_id`) REFERENCES `versions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='版本更新日志表';

-- 私有部署客户表（管理后台管理私有客户信息）
CREATE TABLE IF NOT EXISTS `private_customers` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '客户ID',
  `customer_name` VARCHAR(200) NOT NULL COMMENT '客户名称',
  `contact_person` VARCHAR(100) NULL COMMENT '联系人',
  `contact_phone` VARCHAR(50) NULL COMMENT '联系电话',
  `contact_email` VARCHAR(100) NULL COMMENT '联系邮箱',
  `company_address` VARCHAR(500) NULL COMMENT '公司地址',
  `industry` VARCHAR(100) NULL COMMENT '所属行业',
  `company_size` VARCHAR(50) NULL COMMENT '公司规模: 10人以下, 10-50人, 50-200人, 200人以上',
  `deployment_type` VARCHAR(50) DEFAULT 'on-premise' COMMENT '部署类型: on-premise-本地部署, cloud-云部署',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active-正常, inactive-停用',
  `notes` TEXT NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_private_customers_name` (`customer_name`),
  INDEX `idx_private_customers_status` (`status`),
  INDEX `idx_private_customers_industry` (`industry`),
  INDEX `idx_private_customers_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私有部署客户表（平台管理后台专用）';

-- 租户操作日志表（记录租户的关键操作，用于审计和追踪）
CREATE TABLE IF NOT EXISTS `tenant_logs` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '日志ID',
  `tenant_id` VARCHAR(255) NOT NULL COMMENT '租户ID',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型: create/update/delete/suspend/resume/enable/disable/renew/regenerate_license/adjust_quota',
  `operator` VARCHAR(100) NOT NULL COMMENT '操作人名称',
  `operator_id` VARCHAR(255) NOT NULL COMMENT '操作人ID',
  `details` TEXT NULL COMMENT '操作详情（JSON格式）',
  `ip_address` VARCHAR(45) NULL COMMENT 'IP地址',
  `user_agent` VARCHAR(500) NULL COMMENT '用户代理',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_tenant_logs_tenant_id` (`tenant_id`),
  INDEX `idx_tenant_logs_tenant_created` (`tenant_id`, `created_at`),
  INDEX `idx_tenant_logs_action` (`action`),
  INDEX `idx_tenant_logs_operator_id` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户操作日志表';

-- 租户配置表（存储租户的个性化配置信息，键值对存储）
CREATE TABLE IF NOT EXISTS `tenant_settings` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `setting_key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `setting_value` TEXT NULL COMMENT '配置值',
  `setting_type` VARCHAR(20) DEFAULT 'string' COMMENT '配置类型: string, number, boolean, json, array',
  `description` VARCHAR(500) NULL COMMENT '配置说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY `uk_tenant_setting` (`tenant_id`, `setting_key`),
  INDEX `idx_tenant_settings_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户配置表';

-- =============================================
-- 管理后台客户管理模块
-- =============================================

-- 客户跟进记录表（管理后台统一管理私有+租户客户的跟进记录）
CREATE TABLE IF NOT EXISTS `customer_follow_ups` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '跟进记录ID(UUID)',
  `customer_id` VARCHAR(36) NOT NULL COMMENT '客户ID（licenses.id 或 tenants.id）',
  `customer_type` ENUM('private', 'tenant') NOT NULL COMMENT '客户类型：private-私有客户，tenant-租户客户',
  `content` TEXT NOT NULL COMMENT '跟进内容',
  `operator_id` VARCHAR(36) DEFAULT NULL COMMENT '操作人ID（admin_users.id）',
  `operator_name` VARCHAR(100) DEFAULT NULL COMMENT '操作人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_customer` (`customer_id`, `customer_type`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户跟进记录表（管理后台专用）';

-- =============================================
-- 管理后台通知服务相关表
-- =============================================

-- 管理后台通知记录表
CREATE TABLE IF NOT EXISTS `admin_notifications` (
  `id` VARCHAR(36) PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL COMMENT '通知标题',
  `content` TEXT COMMENT '通知内容',
  `event_type` VARCHAR(50) NOT NULL COMMENT '事件类型',
  `level` ENUM('info','success','warning','error') DEFAULT 'info' COMMENT '级别',
  `is_read` TINYINT(1) DEFAULT 0 COMMENT '是否已读',
  `related_id` VARCHAR(36) DEFAULT NULL COMMENT '关联ID',
  `related_type` VARCHAR(50) DEFAULT NULL COMMENT '关联类型',
  `extra_data` JSON DEFAULT NULL COMMENT '额外数据',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_event_type` (`event_type`),
  INDEX `idx_is_read` (`is_read`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理后台通知记录表';

-- 管理后台通知渠道配置表
CREATE TABLE IF NOT EXISTS `admin_notification_channels` (
  `id` VARCHAR(36) PRIMARY KEY,
  `channel_type` VARCHAR(30) NOT NULL UNIQUE COMMENT '渠道类型: system/dingtalk/wecom/wechat_mp/email',
  `name` VARCHAR(50) NOT NULL COMMENT '渠道名称',
  `is_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否启用',
  `config_data` JSON DEFAULT NULL COMMENT '渠道配置数据(JSON)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_channel_type` (`channel_type`),
  INDEX `idx_is_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理后台通知渠道配置表';

-- 管理后台通知规则表
CREATE TABLE IF NOT EXISTS `admin_notification_rules` (
  `id` VARCHAR(36) PRIMARY KEY,
  `event_type` VARCHAR(50) NOT NULL COMMENT '事件类型',
  `channel_type` VARCHAR(30) NOT NULL COMMENT '渠道类型',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_event_channel` (`event_type`, `channel_type`),
  INDEX `idx_event_type` (`event_type`),
  INDEX `idx_channel_type` (`channel_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理后台通知规则表';

-- 插入默认通知渠道
INSERT INTO `admin_notification_channels` (`id`, `channel_type`, `name`, `is_enabled`, `config_data`) VALUES
(UUID(), 'system', '系统消息', 1, '{}'),
(UUID(), 'dingtalk', '钉钉机器人', 0, '{"webhook":"","secret":""}'),
(UUID(), 'wecom', '企业微信', 0, '{"webhook":""}'),
(UUID(), 'wechat_mp', '微信公众号', 0, '{"app_id":"","app_secret":"","template_id":"","openids":[]}'),
(UUID(), 'email', '邮件通知', 0, '{"smtp_host":"","smtp_port":465,"username":"","password":"","from_name":"CRM管理后台","to_emails":[]}')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 插入默认管理后台角色
INSERT INTO `admin_roles` (`id`, `name`, `code`, `description`, `permissions`, `is_system`, `status`)
SELECT UUID(), '超级管理员', 'super_admin', '拥有所有权限，不可删除', '["*"]', 1, 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `admin_roles` WHERE `code` = 'super_admin');

INSERT INTO `admin_roles` (`id`, `name`, `code`, `description`, `permissions`, `is_system`, `status`)
SELECT UUID(), '运营管理员', 'operation_admin', '负责日常运营管理，包括客户管理、支付管理等',
'["dashboard:view","customer-management:all:view","customer-management:all:edit","customer-management:renewal:view","private-customers:list:view","private-customers:list:edit","tenant-customers:list:view","tenant-customers:list:edit","tenant-customers:packages:view","payment:list:view","payment:reports:view","versions:list:view","versions:changelog:view","settings:operation-logs:view"]',
1, 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `admin_roles` WHERE `code` = 'operation_admin');

INSERT INTO `admin_roles` (`id`, `name`, `code`, `description`, `permissions`, `is_system`, `status`)
SELECT UUID(), '销售员', 'sales', '仅可查看和管理客户信息',
'["dashboard:view","customer-management:all:view","customer-management:renewal:view","private-customers:list:view","tenant-customers:list:view"]',
1, 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `admin_roles` WHERE `code` = 'sales');

INSERT INTO `admin_roles` (`id`, `name`, `code`, `description`, `permissions`, `is_system`, `status`)
SELECT UUID(), '技术支持', 'tech_support', '负责版本管理、模块配置、接口管理等技术支持工作',
'["dashboard:view","modules:list:view","modules:list:edit","modules:config:view","modules:config:edit","modules:distribute:view","modules:distribute:edit","modules:message:view","versions:list:view","versions:upload:view","versions:upload:edit","versions:changelog:view","versions:changelog:edit","api:list:view","api:list:edit"]',
1, 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `admin_roles` WHERE `code` = 'tech_support');

-- 插入默认超级管理员账号
-- 用户名: admin  密码: admin123456（bcrypt加密）
-- ⚠️ 部署后请立即修改密码！
INSERT INTO `admin_users` (`id`, `username`, `password`, `name`, `role`, `status`)
SELECT UUID(), 'admin', '$2a$10$LOLligcAD1bzURm2272gruV1iz8HA6YZn1LQB7ljX.FQZwohqAFRK', '超级管理员', 'super_admin', 'active'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `admin_users` WHERE `username` = 'admin');

-- =============================================
-- 扩容管理相关表（2026-04-05新增）
-- =============================================

-- 扩容价格配置表
CREATE TABLE IF NOT EXISTS `capacity_price_configs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `type` ENUM('user', 'storage', 'online_seat') NOT NULL COMMENT '扩容类型: user=用户数, storage=存储空间, online_seat=在线席位',
  `billing_cycle` ENUM('monthly', 'yearly', 'permanent', 'follow_package') NOT NULL DEFAULT 'follow_package' COMMENT '计费周期',
  `unit_price` DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '单价(每用户/每GB/每席位)',
  `min_qty` INT NOT NULL DEFAULT 1 COMMENT '最小购买量',
  `max_qty` INT NOT NULL DEFAULT 100 COMMENT '最大购买量',
  `description` VARCHAR(255) DEFAULT '' COMMENT '描述',
  `discount_rules` JSON DEFAULT NULL COMMENT '折扣规则：[{min_qty, discount_percent}]',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_type_active` (`type`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='扩容价格配置表';

-- 扩容订单表
CREATE TABLE IF NOT EXISTS `capacity_orders` (
  `id` VARCHAR(36) PRIMARY KEY,
  `order_no` VARCHAR(64) NOT NULL UNIQUE COMMENT '订单号',
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `type` ENUM('user', 'storage', 'online_seat') NOT NULL COMMENT '扩容类型',
  `quantity` INT NOT NULL DEFAULT 1 COMMENT '购买数量',
  `unit_price` DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '单价',
  `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '总金额',
  `discount_percent` DECIMAL(5, 2) DEFAULT 0 COMMENT '折扣百分比',
  `billing_cycle` VARCHAR(20) NOT NULL DEFAULT 'follow_package' COMMENT '计费周期',
  `pay_type` VARCHAR(20) DEFAULT NULL COMMENT '支付方式: wechat/alipay',
  `status` ENUM('pending', 'paid', 'closed', 'refunded', 'expired') NOT NULL DEFAULT 'pending' COMMENT '订单状态',
  `trade_no` VARCHAR(128) DEFAULT NULL COMMENT '第三方交易号',
  `paid_at` DATETIME DEFAULT NULL COMMENT '支付时间',
  `expire_date` DATETIME DEFAULT NULL COMMENT '扩容到期日',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_order_no` (`order_no`),
  INDEX `idx_expire` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='扩容订单表';

-- 插入默认扩容价格配置
INSERT IGNORE INTO `capacity_price_configs` (`id`, `type`, `billing_cycle`, `unit_price`, `min_qty`, `max_qty`, `description`, `is_active`) VALUES
  (UUID(), 'user', 'monthly', 50.00, 1, 200, '按月扩容用户数，每人每月50元', 1),
  (UUID(), 'user', 'yearly', 300.00, 1, 200, '按年扩容用户数，每人每年300元', 1),
  (UUID(), 'storage', 'monthly', 10.00, 1, 500, '按月扩容存储空间，每GB每月10元', 1),
  (UUID(), 'storage', 'yearly', 100.00, 1, 500, '按年扩容存储空间，每GB每年100元', 1),
  (UUID(), 'online_seat', 'monthly', 50.00, 1, 200, '按月扩容在线席位，每席位每月50元', 1),
  (UUID(), 'online_seat', 'yearly', 300.00, 1, 200, '按年扩容在线席位，每席位每年300元', 1),
  (UUID(), 'online_seat', 'permanent', 800.00, 1, 200, '永久扩容在线席位，每席位800元（一次性）', 1);

-- =============================================
-- 面单打印记录表
-- =============================================
CREATE TABLE IF NOT EXISTS `print_label_logs` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '记录ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `order_id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(50) NOT NULL COMMENT '订单号',
  `tracking_number` VARCHAR(100) NULL COMMENT '运单号',
  `logistics_company_code` VARCHAR(50) NULL COMMENT '物流公司代码',
  `logistics_company_name` VARCHAR(100) NULL COMMENT '物流公司名称',
  `template_id` VARCHAR(100) NULL COMMENT '使用的面单模板ID',
  `template_name` VARCHAR(200) NULL COMMENT '使用的面单模板名称',
  `printer_name` VARCHAR(200) NULL COMMENT '使用的打印机名称',
  `print_copies` INT DEFAULT 1 COMMENT '打印份数',
  `print_type` ENUM('single', 'batch') DEFAULT 'single' COMMENT '打印类型(single-单张/batch-批量)',
  `print_status` ENUM('success', 'failed', 'cancelled') DEFAULT 'success' COMMENT '打印状态',
  `auto_shipped` TINYINT(1) DEFAULT 1 COMMENT '是否自动标记已发货(0-否/1-是)',
  `receiver_name` VARCHAR(100) NULL COMMENT '收件人姓名',
  `receiver_phone` VARCHAR(50) NULL COMMENT '收件人电话(加密存储)',
  `receiver_address` VARCHAR(500) NULL COMMENT '收件人地址',
  `operator_id` VARCHAR(50) NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(100) NULL COMMENT '操作人姓名',
  `print_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '打印时间',
  `remark` TEXT NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_order_number` (`order_number`),
  INDEX `idx_tracking_number` (`tracking_number`),
  INDEX `idx_logistics_company` (`logistics_company_code`),
  INDEX `idx_print_type` (`print_type`),
  INDEX `idx_print_status` (`print_status`),
  INDEX `idx_operator_id` (`operator_id`),
  INDEX `idx_print_time` (`print_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='面单打印记录表';

-- 寄件人/退货地址表
DROP TABLE IF EXISTS `sender_addresses`;
CREATE TABLE IF NOT EXISTS `sender_addresses` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '地址ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `type` VARCHAR(20) NOT NULL DEFAULT 'sender' COMMENT '类型: sender=寄件人, return=退货地址',
  `name` VARCHAR(50) NOT NULL COMMENT '联系人姓名',
  `phone` VARCHAR(20) NOT NULL COMMENT '联系电话',
  `province` VARCHAR(50) NULL COMMENT '省',
  `city` VARCHAR(50) NULL COMMENT '市',
  `district` VARCHAR(50) NULL COMMENT '区/县',
  `address` VARCHAR(500) NOT NULL COMMENT '详细地址',
  `full_address` VARCHAR(600) NULL COMMENT '完整地址(省市区+详细)',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认: 0否 1是',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `remark` TEXT NULL COMMENT '备注',
  `linked_service_types` JSON NULL COMMENT '关联售后类型(退货地址用): ["return","exchange"]',
  `created_by` VARCHAR(50) NULL COMMENT '创建人ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_sender_addresses_tenant_type` (`tenant_id`, `type`),
  INDEX `idx_sender_addresses_tenant_default` (`tenant_id`, `type`, `is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='寄件人/退货地址表';

-- 客户操作日志表（审计追踪）
DROP TABLE IF EXISTS `customer_logs`;
CREATE TABLE IF NOT EXISTS `customer_logs` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '日志ID',
  `tenant_id` VARCHAR(36) NULL COMMENT '租户ID',
  `customer_id` VARCHAR(50) NOT NULL COMMENT '客户ID',
  `log_type` VARCHAR(30) NOT NULL COMMENT '操作类型: create/edit/delete/share/add_phone/edit_info/add_order/add_tag/remove_tag/add_followup/edit_followup/add_medical/edit_notes/view/other',
  `content` TEXT NOT NULL COMMENT '日志内容描述',
  `detail` JSON NULL COMMENT '详细变更数据(JSON)',
  `operator_id` VARCHAR(50) NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(100) NULL COMMENT '操作人姓名',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_customer_logs_tenant` (`tenant_id`),
  INDEX `idx_customer_logs_customer_time` (`customer_id`, `created_at` DESC),
  INDEX `idx_customer_logs_type` (`log_type`),
  INDEX `idx_customer_logs_operator` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户操作日志表（审计追踪）';

-- =============================================
-- 虚拟商品功能相关表 (v1.8.0)
-- =============================================

-- 卡密库存表
DROP TABLE IF EXISTS `card_key_inventory`;
CREATE TABLE `card_key_inventory` (
  `id` VARCHAR(36) PRIMARY KEY,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(36) NOT NULL COMMENT '关联商品ID',
  `card_key` VARCHAR(255) NOT NULL COMMENT '卡密编码',
  `status` VARCHAR(20) DEFAULT 'unused' COMMENT '状态: unused-未使用, reserved-已预占, used-已使用, claimed-已领取, expired-已过期, voided-已作废',
  `order_id` VARCHAR(36) DEFAULT NULL COMMENT '关联订单ID（发货后填充）',
  `reserved_order_id` VARCHAR(36) DEFAULT NULL COMMENT '预占订单ID（下单时填充）',
  `claim_token` VARCHAR(100) DEFAULT NULL COMMENT '客户领取令牌',
  `claim_method` VARCHAR(20) DEFAULT NULL COMMENT '领取方式: customer_self/member_send/email_send',
  `claimed_at` DATETIME DEFAULT NULL COMMENT '客户领取时间',
  `usage_instructions` TEXT DEFAULT NULL COMMENT '使用说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_tenant_card_key` (`tenant_id`, `card_key`),
  INDEX `idx_product_status` (`product_id`, `status`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_claim_token` (`claim_token`),
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='卡密库存表';

-- 网盘资源库存表
DROP TABLE IF EXISTS `resource_inventory`;
CREATE TABLE `resource_inventory` (
  `id` VARCHAR(36) PRIMARY KEY,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `product_id` VARCHAR(36) NOT NULL COMMENT '关联商品ID',
  `resource_link` VARCHAR(500) NOT NULL COMMENT '资源链接',
  `resource_password` VARCHAR(100) DEFAULT NULL COMMENT '提取码',
  `resource_description` TEXT DEFAULT NULL COMMENT '资源说明',
  `status` VARCHAR(20) DEFAULT 'unused' COMMENT '状态: unused/reserved/used/claimed/expired/voided',
  `order_id` VARCHAR(36) DEFAULT NULL COMMENT '关联订单ID',
  `reserved_order_id` VARCHAR(36) DEFAULT NULL COMMENT '预占订单ID',
  `claim_token` VARCHAR(100) DEFAULT NULL COMMENT '客户领取令牌',
  `claim_method` VARCHAR(20) DEFAULT NULL COMMENT '领取方式',
  `claimed_at` DATETIME DEFAULT NULL COMMENT '客户领取时间',
  `usage_instructions` TEXT DEFAULT NULL COMMENT '使用说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_product_status` (`product_id`, `status`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_claim_token` (`claim_token`),
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网盘资源库存表';

-- 虚拟商品发货记录表
DROP TABLE IF EXISTS `virtual_delivery_records`;
CREATE TABLE `virtual_delivery_records` (
  `id` VARCHAR(36) PRIMARY KEY,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `order_id` VARCHAR(36) NOT NULL COMMENT '订单ID',
  `delivery_type` VARCHAR(20) NOT NULL COMMENT '发货类型: none/card_key/resource_link',
  `card_key_content` TEXT DEFAULT NULL COMMENT '卡密内容',
  `resource_link` VARCHAR(500) DEFAULT NULL COMMENT '资源链接',
  `resource_password` VARCHAR(100) DEFAULT NULL COMMENT '提取码',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `operator_id` VARCHAR(36) NOT NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
  `delivered_at` DATETIME NOT NULL COMMENT '发货时间',
  `email_sent` TINYINT(1) DEFAULT 0 COMMENT '是否已发送邮件',
  `email_sent_at` DATETIME DEFAULT NULL COMMENT '邮件发送时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='虚拟商品发货记录表';

-- 虚拟商品领取配置表
DROP TABLE IF EXISTS `virtual_claim_settings`;
CREATE TABLE `virtual_claim_settings` (
  `id` VARCHAR(36) PRIMARY KEY,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `delivery_mode` VARCHAR(20) DEFAULT 'link' COMMENT '发货方式: link/manual',
  `claim_link_expiry_days` INT DEFAULT 30 COMMENT '领取链接有效天数',
  `login_methods` VARCHAR(50) DEFAULT 'password' COMMENT '登录方式: sms/password/sms,password',
  `initial_password` VARCHAR(255) DEFAULT '123456' COMMENT '初始登录密码',
  `claim_page_notice` TEXT DEFAULT NULL COMMENT '领取页面提示语',
  `email_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否开启邮件发送',
  `email_source` VARCHAR(20) DEFAULT 'official' COMMENT '邮箱来源: official/custom',
  `email_content_mode` VARCHAR(20) DEFAULT 'link' COMMENT '邮件模式: link/content/both',
  `email_auto_send` TINYINT(1) DEFAULT 0 COMMENT '自动发送邮件',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='虚拟商品领取配置表';

-- 租户自定义邮箱配置表
DROP TABLE IF EXISTS `tenant_email_config`;
CREATE TABLE `tenant_email_config` (
  `id` VARCHAR(36) PRIMARY KEY,
  `tenant_id` VARCHAR(36) NOT NULL COMMENT '租户ID',
  `smtp_host` VARCHAR(200) NOT NULL COMMENT 'SMTP服务器',
  `smtp_port` INT DEFAULT 465 COMMENT 'SMTP端口',
  `encryption` VARCHAR(10) DEFAULT 'ssl' COMMENT '加密方式: ssl/tls/none',
  `sender_email` VARCHAR(200) NOT NULL COMMENT '发件邮箱',
  `sender_password` VARCHAR(500) NOT NULL COMMENT '邮箱密码（加密存储）',
  `sender_name` VARCHAR(100) DEFAULT '' COMMENT '发件人名称',
  `is_verified` TINYINT(1) DEFAULT 0 COMMENT '是否已验证',
  `verified_at` DATETIME DEFAULT NULL COMMENT '验证时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户自定义邮箱配置表';

-- =============================================
-- [v4.1.0] 企微扩展表 - 防骚扰/群发/欢迎语/收款/退款/服务商
-- =============================================

-- 企微防骚扰规则表
CREATE TABLE IF NOT EXISTS `wecom_anti_spam_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `wecom_config_id` INT DEFAULT NULL COMMENT '企微配置ID',
  `name` VARCHAR(100) NOT NULL COMMENT '规则名称',
  `scope` VARCHAR(20) DEFAULT 'all' COMMENT '适用范围',
  `detect_types` TEXT DEFAULT NULL COMMENT '检测类型(JSON: ["keyword","link","frequency"])',
  `punishments` TEXT DEFAULT NULL COMMENT '处罚措施(JSON数组)',
  `keywords` TEXT DEFAULT NULL COMMENT '关键词列表',
  `keyword_mode` VARCHAR(20) DEFAULT 'any' COMMENT '关键词匹配模式',
  `link_mode` VARCHAR(20) DEFAULT 'block_all' COMMENT '链接拦截模式',
  `link_whitelist` TEXT DEFAULT NULL COMMENT '链接白名单',
  `freq_minutes` INT DEFAULT 5 COMMENT '频率检测时间窗口(分钟)',
  `freq_max_msg` INT DEFAULT 10 COMMENT '频率上限(条数)',
  `exempt_employee` TINYINT(1) DEFAULT 1 COMMENT '豁免员工',
  `exempt_admin` TINYINT(1) DEFAULT 0 COMMENT '豁免管理员',
  `specified_groups` TEXT DEFAULT NULL COMMENT '指定群组(JSON)',
  `specified_templates` TEXT DEFAULT NULL COMMENT '指定模板(JSON)',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `IDX_wasr_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微防骚扰规则表';

-- 企微群发消息任务表
CREATE TABLE IF NOT EXISTS `wecom_group_broadcasts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `wecom_config_id` INT DEFAULT NULL COMMENT '企微配置ID',
  `task_name` VARCHAR(100) NOT NULL COMMENT '任务名称',
  `target` VARCHAR(20) DEFAULT 'all' COMMENT '发送目标: all/specified/template',
  `target_desc` VARCHAR(100) DEFAULT NULL COMMENT '目标描述',
  `text` TEXT NOT NULL COMMENT '消息内容',
  `attachments` TEXT DEFAULT NULL COMMENT '附件(JSON)',
  `content_type` VARCHAR(50) DEFAULT '文本' COMMENT '内容类型',
  `send_mode` VARCHAR(20) DEFAULT 'now' COMMENT '发送模式: now/scheduled',
  `scheduled_time` DATETIME DEFAULT NULL COMMENT '计划发送时间',
  `status` VARCHAR(20) DEFAULT 'draft' COMMENT '状态: draft/pending/sent/failed/cancelled',
  `target_count` INT DEFAULT 0 COMMENT '目标数量',
  `success_count` INT DEFAULT 0 COMMENT '成功数量',
  `fail_count` INT DEFAULT 0 COMMENT '失败数量',
  `specified_groups` TEXT DEFAULT NULL COMMENT '指定群组(JSON)',
  `specified_templates` TEXT DEFAULT NULL COMMENT '指定模板(JSON)',
  `detail_results` TEXT DEFAULT NULL COMMENT '详细结果(JSON)',
  `wecom_msg_id` VARCHAR(100) DEFAULT NULL COMMENT '企微消息ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `IDX_wgb_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微群发消息任务表';

-- 企微入群欢迎语表
CREATE TABLE IF NOT EXISTS `wecom_group_welcomes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `wecom_config_id` INT DEFAULT NULL COMMENT '企微配置ID',
  `name` VARCHAR(100) NOT NULL COMMENT '欢迎语名称',
  `scope` VARCHAR(20) DEFAULT 'all' COMMENT '适用范围: all/specified/template',
  `text` TEXT NOT NULL COMMENT '欢迎语内容',
  `media_type` VARCHAR(20) DEFAULT 'none' COMMENT '媒体类型',
  `link_title` VARCHAR(200) DEFAULT NULL COMMENT '链接标题',
  `link_url` VARCHAR(500) DEFAULT NULL COMMENT '链接地址',
  `specified_groups` TEXT DEFAULT NULL COMMENT '指定群组(JSON)',
  `specified_templates` TEXT DEFAULT NULL COMMENT '指定模板(JSON)',
  `wecom_template_id` VARCHAR(100) DEFAULT NULL COMMENT '企微欢迎语模板ID',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `IDX_wgw_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微入群欢迎语表';

-- 企微收款码表
CREATE TABLE IF NOT EXISTS `wecom_payment_qrcodes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `name` VARCHAR(100) NOT NULL COMMENT '收款码名称',
  `amount_type` VARCHAR(20) DEFAULT 'custom' COMMENT '金额类型: fixed/custom',
  `fixed_amount` INT DEFAULT 0 COMMENT '固定金额(分)',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '收款码描述',
  `member_user_ids` TEXT DEFAULT NULL COMMENT '使用成员UserID(JSON)',
  `member_names` VARCHAR(500) DEFAULT NULL COMMENT '使用成员姓名',
  `remark_template` VARCHAR(200) DEFAULT NULL COMMENT '备注模板',
  `qr_url` VARCHAR(500) DEFAULT NULL COMMENT '二维码URL',
  `total_amount` BIGINT DEFAULT 0 COMMENT '累计收款(分)',
  `total_count` INT DEFAULT 0 COMMENT '累计笔数',
  `is_enabled` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `IDX_wecom_qrcode_tenant` (`tenant_id`),
  INDEX `IDX_wecom_qrcode_config` (`wecom_config_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微收款码表';

-- 企微退款记录表
CREATE TABLE IF NOT EXISTS `wecom_payment_refunds` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
  `wecom_config_id` INT NOT NULL COMMENT '企微配置ID',
  `refund_no` VARCHAR(100) NOT NULL COMMENT '退款单号',
  `original_payment_no` VARCHAR(100) NOT NULL COMMENT '原收款单号',
  `original_trade_no` VARCHAR(100) DEFAULT NULL COMMENT '原交易单号',
  `payer_name` VARCHAR(100) DEFAULT NULL COMMENT '原付款人',
  `operator_id` VARCHAR(100) DEFAULT NULL COMMENT '操作人UserID',
  `operator_name` VARCHAR(100) DEFAULT NULL COMMENT '操作人姓名',
  `original_amount` INT NOT NULL COMMENT '原交易金额(分)',
  `refund_amount` INT NOT NULL COMMENT '退款金额(分)',
  `reason` VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
  `status` VARCHAR(20) DEFAULT 'processing' COMMENT '状态: processing/completed/rejected',
  `refund_time` DATETIME DEFAULT NULL COMMENT '退款完成时间',
  `reject_reason` VARCHAR(500) DEFAULT NULL COMMENT '拒绝原因',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `IDX_wecom_refund_tenant` (`tenant_id`),
  UNIQUE INDEX `IDX_wecom_refund_no` (`refund_no`),
  INDEX `IDX_wecom_refund_payment` (`original_payment_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微退款记录表';

-- 企微服务商应用配置表
CREATE TABLE IF NOT EXISTS `wecom_suite_configs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `suite_id` VARCHAR(100) DEFAULT NULL COMMENT 'Suite ID',
  `suite_secret` VARCHAR(255) DEFAULT NULL COMMENT 'Suite Secret',
  `suite_ticket` TEXT DEFAULT NULL COMMENT '企微推送的suite_ticket',
  `suite_ticket_updated_at` DATETIME DEFAULT NULL COMMENT 'suite_ticket最后更新时间',
  `provider_corp_id` VARCHAR(100) DEFAULT NULL COMMENT '服务商CorpID',
  `provider_secret` VARCHAR(255) DEFAULT NULL COMMENT '服务商Secret',
  `callback_token` VARCHAR(100) DEFAULT NULL COMMENT '回调Token',
  `callback_encoding_aes_key` VARCHAR(100) DEFAULT NULL COMMENT '回调EncodingAESKey',
  `app_name` VARCHAR(200) DEFAULT NULL COMMENT '应用名称',
  `app_description` TEXT DEFAULT NULL COMMENT '应用描述',
  `app_status` VARCHAR(20) DEFAULT 'offline' COMMENT '应用状态: online/offline',
  `permissions` TEXT DEFAULT NULL COMMENT '权限范围(JSON)',
  `chat_archive_rsa_private_key` TEXT DEFAULT NULL COMMENT '会话存档RSA私钥(服务商级别，所有授权企业共用)',
  `is_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微服务商应用配置表';

-- 企微服务商回调日志表
CREATE TABLE IF NOT EXISTS `wecom_suite_callback_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `info_type` VARCHAR(50) NOT NULL COMMENT '事件类型: suite_ticket/create_auth/cancel_auth/change_auth等',
  `suite_id` VARCHAR(100) DEFAULT NULL COMMENT 'Suite ID',
  `auth_corp_id` VARCHAR(100) DEFAULT NULL COMMENT '授权企业CorpID',
  `detail` TEXT DEFAULT NULL COMMENT '事件详情/解密后的XML摘要',
  `status` VARCHAR(20) DEFAULT 'success' COMMENT '处理状态: success/failed',
  `error_message` TEXT DEFAULT NULL COMMENT '错误信息',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `IDX_suite_cb_info_type` (`info_type`),
  INDEX `IDX_suite_cb_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微服务商回调日志表';

-- 移动应用安装包管理表
CREATE TABLE IF NOT EXISTS `mobile_app_packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `platform` VARCHAR(20) NOT NULL COMMENT '平台: android/ios',
  `app_name` VARCHAR(100) DEFAULT '' COMMENT '应用名称',
  `version` VARCHAR(50) DEFAULT '' COMMENT '版本号',
  `package_url` VARCHAR(500) DEFAULT '' COMMENT '上传的安装包路径',
  `external_url` VARCHAR(500) DEFAULT '' COMMENT '外部下载地址',
  `file_size` BIGINT DEFAULT 0 COMMENT '文件大小(字节)',
  `file_hash` VARCHAR(64) DEFAULT '' COMMENT '文件SHA256哈希',
  `download_count` INT DEFAULT 0 COMMENT '下载次数',
  `is_enabled` TINYINT DEFAULT 1 COMMENT '是否启用: 1启用 0禁用',
  `description` TEXT COMMENT '版本说明',
  `uploaded_by` VARCHAR(100) DEFAULT '' COMMENT '上传者',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY `idx_platform` (`platform`),
  KEY `idx_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='移动应用安装包管理';

-- =============================================
-- 数据库初始化完成
-- =============================================
SET FOREIGN_KEY_CHECKS = 1;

-- CRM数据库初始化完成
-- 预设账号：
-- superadmin / super123456 (超级管理员)
-- admin / admin123 (管理员)
-- manager / manager123 (部门经理)
-- sales / sales123 (销售员)
-- service / service123 (客服)

