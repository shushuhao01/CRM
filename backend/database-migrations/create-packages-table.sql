-- 套餐管理表
-- 用于管理SaaS云端版和私有部署版的套餐配置
-- 创建时间: 2026-03-04

-- 创建套餐表
CREATE TABLE IF NOT EXISTS `packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '套餐ID',
  `name` VARCHAR(100) NOT NULL COMMENT '套餐名称',
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT '套餐代码（唯一标识）',
  `type` ENUM('saas', 'private') NOT NULL DEFAULT 'saas' COMMENT '套餐类型：saas-SaaS云端版，private-私有部署版',
  `description` TEXT COMMENT '套餐描述',
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '价格',
  `original_price` DECIMAL(10, 2) DEFAULT NULL COMMENT '原价（用于显示折扣）',
  `billing_cycle` ENUM('monthly', 'yearly', 'once') NOT NULL DEFAULT 'monthly' COMMENT '计费周期：monthly-月付，yearly-年付，once-一次性',
  `duration_days` INT NOT NULL DEFAULT 30 COMMENT '有效期（天）',
  `max_users` INT NOT NULL DEFAULT 10 COMMENT '最大用户数',
  `max_storage_gb` INT NOT NULL DEFAULT 5 COMMENT '最大存储空间（GB）',
  `features` JSON COMMENT '功能特性列表（JSON数组）',
  `is_trial` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否为试用套餐',
  `is_recommended` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否为推荐套餐',
  `is_visible` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否在官网显示',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序（数字越小越靠前）',
  `status` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '状态：1-启用，0-禁用',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX `idx_code` (`code`),
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='套餐管理表';

-- 插入默认套餐数据（SaaS云端版）
INSERT INTO `packages` (`name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `features`, `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`) VALUES
('免费试用版', 'SAAS_TRIAL', 'saas', '适合个人或小团队试用', 0.00, NULL, 'monthly', 30, 3, 1, '["基础CRM功能", "3个用户账号", "1GB存储空间", "30天试用期"]', 1, 0, 1, 1, 1),
('基础版', 'SAAS_BASIC', 'saas', '适合小型团队使用', 299.00, 399.00, 'monthly', 30, 10, 5, '["完整CRM功能", "10个用户账号", "5GB存储空间", "基础数据报表", "邮件支持"]', 0, 0, 1, 2, 1),
('专业版', 'SAAS_PRO', 'saas', '适合中型企业使用', 899.00, 1199.00, 'monthly', 30, 50, 20, '["完整CRM功能", "50个用户账号", "20GB存储空间", "高级数据报表", "自定义字段", "API接口", "优先技术支持"]', 0, 1, 1, 3, 1),
('企业版', 'SAAS_ENTERPRISE', 'saas', '适合大型企业使用', 2999.00, 3999.00, 'monthly', 30, 200, 100, '["完整CRM功能", "200个用户账号", "100GB存储空间", "高级数据报表", "自定义字段", "API接口", "数据导入导出", "专属客户经理", "7x24小时支持"]', 0, 0, 1, 4, 1);

-- 插入默认套餐数据（私有部署版）
INSERT INTO `packages` (`name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`, `features`, `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`) VALUES
('标准版', 'PRIVATE_STANDARD', 'private', '适合中小企业私有部署', 19999.00, 29999.00, 'once', 365, 50, 50, '["完整CRM功能", "50个用户账号", "50GB存储空间", "私有化部署", "源码交付", "1年免费升级", "技术支持"]', 0, 0, 1, 1, 1),
('专业版', 'PRIVATE_PRO', 'private', '适合大型企业私有部署', 49999.00, 69999.00, 'once', 365, 200, 200, '["完整CRM功能", "200个用户账号", "200GB存储空间", "私有化部署", "源码交付", "定制开发", "2年免费升级", "专属技术支持"]', 0, 1, 1, 2, 1),
('旗舰版', 'PRIVATE_ULTIMATE', 'private', '适合集团企业私有部署', 99999.00, 149999.00, 'once', 365, 99999, 1000, '["完整CRM功能", "不限用户数", "1TB存储空间", "私有化部署", "源码交付", "深度定制开发", "永久免费升级", "7x24小时专属支持", "现场实施服务"]', 0, 0, 1, 3, 1);

-- 验证数据
SELECT * FROM `packages` ORDER BY `type`, `sort_order`;
