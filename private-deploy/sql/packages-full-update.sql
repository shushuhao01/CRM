-- =============================================
-- 云客CRM 套餐数据完整更新脚本
-- 版本: v1.8.0+ | 日期: 2026-05-06
-- 适用: MySQL 5.7+ / MariaDB 10.2+ / phpMyAdmin
-- 说明: 覆盖更新所有SaaS和私有部署套餐（含功能特性对比数据）
-- 配置: 默认不支持订阅 | 年付9折不赠月数 | 在线席位制(SaaS)
-- =============================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- =============================================
-- Part 1: 确保表结构完整（安全添加新列）
-- 如果列已存在会报 Duplicate column 错误，可安全忽略
-- =============================================

ALTER TABLE `tenant_packages` ADD COLUMN `feature_details` JSON NULL COMMENT '功能特性详情(对比表用)' AFTER `features`;

ALTER TABLE `tenant_packages` ADD COLUMN `subscription_enabled` TINYINT(1) DEFAULT 0 COMMENT '是否启用订阅' AFTER `yearly_price`;

ALTER TABLE `tenant_packages` ADD COLUMN `subscription_channels` VARCHAR(50) DEFAULT 'all' COMMENT '订阅渠道: wechat/alipay/all' AFTER `subscription_enabled`;

ALTER TABLE `tenant_packages` ADD COLUMN `subscription_billing_cycle` VARCHAR(20) DEFAULT 'monthly' COMMENT '订阅计费周期: monthly/yearly/both' AFTER `subscription_channels`;

ALTER TABLE `tenant_packages` ADD COLUMN `subscription_discount_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '订阅折扣率(0-100)' AFTER `subscription_billing_cycle`;

ALTER TABLE `tenant_packages` ADD COLUMN `modules` JSON NULL COMMENT '授权模块ID列表(JSON数组)' AFTER `feature_details`;

-- =============================================
-- Part 2: 覆盖更新套餐数据
-- 使用 INSERT ... ON DUPLICATE KEY UPDATE 保留已有套餐ID
-- unique key = code 列
-- =============================================

-- ----- 1. 14天免费试用 (FREE_TRIAL) — 试用期体验全部功能 -----
INSERT INTO `tenant_packages` (
  `name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`,
  `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`,
  `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`,
  `subscription_enabled`, `subscription_channels`, `subscription_billing_cycle`, `subscription_discount_rate`,
  `features`, `feature_details`, `modules`,
  `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`
) VALUES (
  '14天免费试用', 'FREE_TRIAL', 'saas', '14天全功能体验，零风险评估', 0.00, NULL, 'monthly',
  14, 5, 1, 'online', 5,
  0.00, 0, NULL,
  0, 'all', 'monthly', 0.00,
  '["全部功能14天体验", "客户管理", "订单管理", "财务管理", "物流管理", "售后管理", "企微管理"]',
  '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":true,"结算报表":true,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"物流公司管理":true,"商品列表分类":true,"库存管理":true,"商品分析":true,"虚拟商品卡密":true,"个人业绩统计":true,"团队业绩排行":true,"业绩分析":true,"业绩分享":true,"通话记录管理":true,"通话数据汇总":true,"录音管理":true,"电话配置":true,"短信发送":true,"短信模板管理":true,"短信审核统计":true,"售后工单":true,"售后数据统计":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"企微客户同步":true,"客户群管理":true,"获客助手":true,"活码管理":true,"企微对外收款":true,"微信客服":true,"会话存档":true,"AI智能助手":true,"H5移动端":true,"微信小程序":true,"移动APP":true,"API接口":true,"WebSocket推送":true,"邮件工单":true,"在线客服":true,"专属技术顾问":false,"7x24电话远程":false}',
  '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system","wecom"]',
  1, 0, 1, 0, 1
) ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `description`=VALUES(`description`), `price`=VALUES(`price`),
  `original_price`=VALUES(`original_price`), `billing_cycle`=VALUES(`billing_cycle`),
  `duration_days`=VALUES(`duration_days`), `max_users`=VALUES(`max_users`),
  `max_storage_gb`=VALUES(`max_storage_gb`), `user_limit_mode`=VALUES(`user_limit_mode`),
  `max_online_seats`=VALUES(`max_online_seats`), `yearly_discount_rate`=VALUES(`yearly_discount_rate`),
  `yearly_bonus_months`=VALUES(`yearly_bonus_months`), `yearly_price`=VALUES(`yearly_price`),
  `subscription_enabled`=VALUES(`subscription_enabled`), `subscription_channels`=VALUES(`subscription_channels`),
  `subscription_billing_cycle`=VALUES(`subscription_billing_cycle`), `subscription_discount_rate`=VALUES(`subscription_discount_rate`),
  `features`=VALUES(`features`), `feature_details`=VALUES(`feature_details`), `modules`=VALUES(`modules`),
  `is_trial`=VALUES(`is_trial`), `is_recommended`=VALUES(`is_recommended`),
  `is_visible`=VALUES(`is_visible`), `sort_order`=VALUES(`sort_order`), `status`=VALUES(`status`);

-- ----- 2. 入门版 (SAAS_STARTER) ¥149/月 -----
INSERT INTO `tenant_packages` (
  `name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`,
  `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`,
  `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`,
  `subscription_enabled`, `subscription_channels`, `subscription_billing_cycle`, `subscription_discount_rate`,
  `features`, `feature_details`, `modules`,
  `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`
) VALUES (
  '入门版', 'SAAS_STARTER', 'saas', '微型团队轻松起步', 149.00, NULL, 'monthly',
  30, 5, 3, 'online', 5,
  10.00, 0, NULL,
  0, 'all', 'monthly', 0.00,
  '["客户管理", "订单管理", "数据导入导出", "团队业绩", "售后管理", "邮件支持"]',
  '{"核心数据仪表盘":true,"多维度趋势图表":false,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"数据导入导出":true,"批量导入Excel":false,"客户分享转移":false,"隐私信息脱敏":false,"订单创建编辑":true,"订单审核工作流":false,"批量审核":false,"退款管理":false,"绩效数据查看":true,"绩效管理":false,"COD代收管理":false,"增值服务管理":false,"结算报表":false,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":false,"物流公司管理":false,"商品列表分类":true,"库存管理":false,"商品分析":false,"虚拟商品卡密":false,"个人业绩统计":true,"团队业绩排行":true,"业绩分析":false,"业绩分享":false,"通话记录管理":false,"通话数据汇总":false,"录音管理":false,"电话配置":false,"短信发送":false,"短信模板管理":false,"短信审核统计":false,"售后工单":true,"售后数据统计":false,"资料列表":true,"客户查询":true,"回收站":false,"部门用户角色":"基础","权限精细控制":false,"操作日志审计":false,"消息管理":false,"企微客户同步":false,"客户群管理":false,"获客助手":false,"活码管理":false,"企微对外收款":false,"微信客服":false,"会话存档":false,"AI智能助手":false,"H5移动端":true,"微信小程序":true,"移动APP":false,"API接口":false,"WebSocket推送":false,"邮件工单":true,"在线客服":false,"专属技术顾问":false,"7x24电话远程":false}',
  '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system"]',
  0, 0, 1, 1, 1
) ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `description`=VALUES(`description`), `price`=VALUES(`price`),
  `original_price`=VALUES(`original_price`), `billing_cycle`=VALUES(`billing_cycle`),
  `duration_days`=VALUES(`duration_days`), `max_users`=VALUES(`max_users`),
  `max_storage_gb`=VALUES(`max_storage_gb`), `user_limit_mode`=VALUES(`user_limit_mode`),
  `max_online_seats`=VALUES(`max_online_seats`), `yearly_discount_rate`=VALUES(`yearly_discount_rate`),
  `yearly_bonus_months`=VALUES(`yearly_bonus_months`), `yearly_price`=VALUES(`yearly_price`),
  `subscription_enabled`=VALUES(`subscription_enabled`), `subscription_channels`=VALUES(`subscription_channels`),
  `subscription_billing_cycle`=VALUES(`subscription_billing_cycle`), `subscription_discount_rate`=VALUES(`subscription_discount_rate`),
  `features`=VALUES(`features`), `feature_details`=VALUES(`feature_details`), `modules`=VALUES(`modules`),
  `is_trial`=VALUES(`is_trial`), `is_recommended`=VALUES(`is_recommended`),
  `is_visible`=VALUES(`is_visible`), `sort_order`=VALUES(`sort_order`), `status`=VALUES(`status`);

-- ----- 3. 基础版 (SAAS_BASIC) ¥399/月 -----
INSERT INTO `tenant_packages` (
  `name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`,
  `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`,
  `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`,
  `subscription_enabled`, `subscription_channels`, `subscription_billing_cycle`, `subscription_discount_rate`,
  `features`, `feature_details`, `modules`,
  `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`
) VALUES (
  '基础版', 'SAAS_BASIC', 'saas', '小型团队高效协作', 399.00, NULL, 'monthly',
  30, 10, 10, 'online', 10,
  10.00, 0, NULL,
  0, 'all', 'monthly', 0.00,
  '["客户管理", "订单管理", "财务管理", "通话管理", "短信100条/月", "数据导入导出", "售后管理"]',
  '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":false,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":false,"结算报表":false,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":false,"物流公司管理":true,"商品列表分类":true,"库存管理":true,"商品分析":false,"虚拟商品卡密":false,"个人业绩统计":true,"团队业绩排行":true,"业绩分析":false,"业绩分享":false,"通话记录管理":true,"通话数据汇总":false,"录音管理":false,"电话配置":false,"短信发送":"100条/月","短信模板管理":true,"短信审核统计":false,"售后工单":true,"售后数据统计":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"企微客户同步":false,"客户群管理":false,"获客助手":false,"活码管理":false,"企微对外收款":false,"微信客服":false,"会话存档":false,"AI智能助手":false,"H5移动端":true,"微信小程序":true,"移动APP":false,"API接口":false,"WebSocket推送":true,"邮件工单":true,"在线客服":true,"专属技术顾问":false,"7x24电话远程":false}',
  '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system"]',
  0, 0, 1, 2, 1
) ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `description`=VALUES(`description`), `price`=VALUES(`price`),
  `original_price`=VALUES(`original_price`), `billing_cycle`=VALUES(`billing_cycle`),
  `duration_days`=VALUES(`duration_days`), `max_users`=VALUES(`max_users`),
  `max_storage_gb`=VALUES(`max_storage_gb`), `user_limit_mode`=VALUES(`user_limit_mode`),
  `max_online_seats`=VALUES(`max_online_seats`), `yearly_discount_rate`=VALUES(`yearly_discount_rate`),
  `yearly_bonus_months`=VALUES(`yearly_bonus_months`), `yearly_price`=VALUES(`yearly_price`),
  `subscription_enabled`=VALUES(`subscription_enabled`), `subscription_channels`=VALUES(`subscription_channels`),
  `subscription_billing_cycle`=VALUES(`subscription_billing_cycle`), `subscription_discount_rate`=VALUES(`subscription_discount_rate`),
  `features`=VALUES(`features`), `feature_details`=VALUES(`feature_details`), `modules`=VALUES(`modules`),
  `is_trial`=VALUES(`is_trial`), `is_recommended`=VALUES(`is_recommended`),
  `is_visible`=VALUES(`is_visible`), `sort_order`=VALUES(`sort_order`), `status`=VALUES(`status`);

-- ----- 4. 专业版 (SAAS_PRO) ¥699/月 ⭐推荐 -----
INSERT INTO `tenant_packages` (
  `name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`,
  `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`,
  `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`,
  `subscription_enabled`, `subscription_channels`, `subscription_billing_cycle`, `subscription_discount_rate`,
  `features`, `feature_details`, `modules`,
  `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`
) VALUES (
  '专业版', 'SAAS_PRO', 'saas', '成长型团队全面赋能', 699.00, NULL, 'monthly',
  30, 20, 50, 'online', 20,
  10.00, 0, NULL,
  0, 'all', 'monthly', 0.00,
  '["全部核心功能", "高级报表", "API接口", "移动APP", "专属顾问", "短信500条/月"]',
  '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":true,"结算报表":false,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"物流公司管理":true,"商品列表分类":true,"库存管理":true,"商品分析":true,"虚拟商品卡密":true,"个人业绩统计":true,"团队业绩排行":true,"业绩分析":true,"业绩分享":false,"通话记录管理":true,"通话数据汇总":true,"录音管理":true,"电话配置":true,"短信发送":"500条/月","短信模板管理":true,"短信审核统计":true,"售后工单":true,"售后数据统计":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"企微客户同步":false,"客户群管理":false,"获客助手":false,"活码管理":false,"企微对外收款":false,"微信客服":false,"会话存档":false,"AI智能助手":false,"H5移动端":true,"微信小程序":true,"移动APP":true,"API接口":true,"WebSocket推送":true,"邮件工单":true,"在线客服":true,"专属技术顾问":true,"7x24电话远程":false}',
  '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system","wecom"]',
  0, 1, 1, 3, 1
) ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `description`=VALUES(`description`), `price`=VALUES(`price`),
  `original_price`=VALUES(`original_price`), `billing_cycle`=VALUES(`billing_cycle`),
  `duration_days`=VALUES(`duration_days`), `max_users`=VALUES(`max_users`),
  `max_storage_gb`=VALUES(`max_storage_gb`), `user_limit_mode`=VALUES(`user_limit_mode`),
  `max_online_seats`=VALUES(`max_online_seats`), `yearly_discount_rate`=VALUES(`yearly_discount_rate`),
  `yearly_bonus_months`=VALUES(`yearly_bonus_months`), `yearly_price`=VALUES(`yearly_price`),
  `subscription_enabled`=VALUES(`subscription_enabled`), `subscription_channels`=VALUES(`subscription_channels`),
  `subscription_billing_cycle`=VALUES(`subscription_billing_cycle`), `subscription_discount_rate`=VALUES(`subscription_discount_rate`),
  `features`=VALUES(`features`), `feature_details`=VALUES(`feature_details`), `modules`=VALUES(`modules`),
  `is_trial`=VALUES(`is_trial`), `is_recommended`=VALUES(`is_recommended`),
  `is_visible`=VALUES(`is_visible`), `sort_order`=VALUES(`sort_order`), `status`=VALUES(`status`);

-- ----- 5. 企业版 (SAAS_ENTERPRISE) ¥1,299/月 -----
INSERT INTO `tenant_packages` (
  `name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`,
  `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`,
  `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`,
  `subscription_enabled`, `subscription_channels`, `subscription_billing_cycle`, `subscription_discount_rate`,
  `features`, `feature_details`, `modules`,
  `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`
) VALUES (
  '企业版', 'SAAS_ENTERPRISE', 'saas', '大型团队企微深度整合', 1299.00, NULL, 'monthly',
  30, 50, 200, 'online', 50,
  10.00, 0, NULL,
  0, 'all', 'monthly', 0.00,
  '["全部专业版功能", "企微全集成", "结算报表", "7×24支持", "短信2000条/月"]',
  '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":true,"结算报表":true,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"物流公司管理":true,"商品列表分类":true,"库存管理":true,"商品分析":true,"虚拟商品卡密":true,"个人业绩统计":true,"团队业绩排行":true,"业绩分析":true,"业绩分享":true,"通话记录管理":true,"通话数据汇总":true,"录音管理":true,"电话配置":true,"短信发送":"2000条/月","短信模板管理":true,"短信审核统计":true,"售后工单":true,"售后数据统计":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"企微客户同步":true,"客户群管理":true,"获客助手":true,"活码管理":true,"企微对外收款":true,"微信客服":true,"会话存档":"加购","AI智能助手":"加购","H5移动端":true,"微信小程序":true,"移动APP":true,"API接口":true,"WebSocket推送":true,"邮件工单":true,"在线客服":true,"专属技术顾问":true,"7x24电话远程":true}',
  '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system","wecom"]',
  0, 0, 1, 4, 1
) ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `description`=VALUES(`description`), `price`=VALUES(`price`),
  `original_price`=VALUES(`original_price`), `billing_cycle`=VALUES(`billing_cycle`),
  `duration_days`=VALUES(`duration_days`), `max_users`=VALUES(`max_users`),
  `max_storage_gb`=VALUES(`max_storage_gb`), `user_limit_mode`=VALUES(`user_limit_mode`),
  `max_online_seats`=VALUES(`max_online_seats`), `yearly_discount_rate`=VALUES(`yearly_discount_rate`),
  `yearly_bonus_months`=VALUES(`yearly_bonus_months`), `yearly_price`=VALUES(`yearly_price`),
  `subscription_enabled`=VALUES(`subscription_enabled`), `subscription_channels`=VALUES(`subscription_channels`),
  `subscription_billing_cycle`=VALUES(`subscription_billing_cycle`), `subscription_discount_rate`=VALUES(`subscription_discount_rate`),
  `features`=VALUES(`features`), `feature_details`=VALUES(`feature_details`), `modules`=VALUES(`modules`),
  `is_trial`=VALUES(`is_trial`), `is_recommended`=VALUES(`is_recommended`),
  `is_visible`=VALUES(`is_visible`), `sort_order`=VALUES(`sort_order`), `status`=VALUES(`status`);

-- ===== 私有部署套餐 =====

-- ----- 6. 私有标准版 (PRIVATE_STANDARD) ¥29,800 买断 | ¥11,800/年 -----
INSERT INTO `tenant_packages` (
  `name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`,
  `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`,
  `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`,
  `subscription_enabled`, `subscription_channels`, `subscription_billing_cycle`, `subscription_discount_rate`,
  `features`, `feature_details`, `modules`,
  `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`
) VALUES (
  '标准版', 'PRIVATE_STANDARD', 'private', '小微企业自主掌控数据', 29800.00, NULL, 'once',
  36500, 30, 0, 'total', 0,
  0.00, 0, 11800.00,
  0, 'all', 'monthly', 0.00,
  '["永久授权", "全部核心功能", "完整源码交付", "Docker一键部署", "部署文档全套", "1年免费升级", "邮件技术支持"]',
  '{"全部CRM功能模块":true,"企微完整集成":true,"通话短信模块":true,"完整后端源码":true,"完整前端源码":true,"移动APP源码":false,"数据100%私有":true,"Docker一键部署":true,"部署文档全套":true,"远程部署协助":false,"现场部署支持":false,"免费版本升级":"1年","技术支持方式":"邮件","专属技术顾问":false,"定制开发服务":false,"源码加密部署":false,"多服务器集群":false}',
  NULL,
  0, 0, 1, 10, 1
) ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `description`=VALUES(`description`), `price`=VALUES(`price`),
  `original_price`=VALUES(`original_price`), `billing_cycle`=VALUES(`billing_cycle`),
  `duration_days`=VALUES(`duration_days`), `max_users`=VALUES(`max_users`),
  `max_storage_gb`=VALUES(`max_storage_gb`), `user_limit_mode`=VALUES(`user_limit_mode`),
  `max_online_seats`=VALUES(`max_online_seats`), `yearly_discount_rate`=VALUES(`yearly_discount_rate`),
  `yearly_bonus_months`=VALUES(`yearly_bonus_months`), `yearly_price`=VALUES(`yearly_price`),
  `subscription_enabled`=VALUES(`subscription_enabled`), `subscription_channels`=VALUES(`subscription_channels`),
  `subscription_billing_cycle`=VALUES(`subscription_billing_cycle`), `subscription_discount_rate`=VALUES(`subscription_discount_rate`),
  `features`=VALUES(`features`), `feature_details`=VALUES(`feature_details`), `modules`=VALUES(`modules`),
  `is_trial`=VALUES(`is_trial`), `is_recommended`=VALUES(`is_recommended`),
  `is_visible`=VALUES(`is_visible`), `sort_order`=VALUES(`sort_order`), `status`=VALUES(`status`);

-- ----- 7. 私有专业版 (PRIVATE_PRO) ¥59,800 买断 | ¥23,800/年 ⭐推荐 -----
INSERT INTO `tenant_packages` (
  `name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`,
  `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`,
  `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`,
  `subscription_enabled`, `subscription_channels`, `subscription_billing_cycle`, `subscription_discount_rate`,
  `features`, `feature_details`, `modules`,
  `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`
) VALUES (
  '专业版', 'PRIVATE_PRO', 'private', '中型企业专业级私有部署', 59800.00, NULL, 'once',
  36500, 100, 0, 'total', 0,
  0.00, 0, 23800.00,
  0, 'all', 'monthly', 0.00,
  '["永久授权", "全部功能模块", "移动APP源码", "远程部署协助(1次)", "1年技术支持", "1年免费升级", "在线+邮件支持", "专属技术顾问"]',
  '{"全部CRM功能模块":true,"企微完整集成":true,"通话短信模块":true,"完整后端源码":true,"完整前端源码":true,"移动APP源码":true,"数据100%私有":true,"Docker一键部署":true,"部署文档全套":true,"远程部署协助":"1次","现场部署支持":false,"免费版本升级":"1年","技术支持方式":"在线+邮件","专属技术顾问":true,"定制开发服务":false,"源码加密部署":false,"多服务器集群":false}',
  NULL,
  0, 1, 1, 11, 1
) ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `description`=VALUES(`description`), `price`=VALUES(`price`),
  `original_price`=VALUES(`original_price`), `billing_cycle`=VALUES(`billing_cycle`),
  `duration_days`=VALUES(`duration_days`), `max_users`=VALUES(`max_users`),
  `max_storage_gb`=VALUES(`max_storage_gb`), `user_limit_mode`=VALUES(`user_limit_mode`),
  `max_online_seats`=VALUES(`max_online_seats`), `yearly_discount_rate`=VALUES(`yearly_discount_rate`),
  `yearly_bonus_months`=VALUES(`yearly_bonus_months`), `yearly_price`=VALUES(`yearly_price`),
  `subscription_enabled`=VALUES(`subscription_enabled`), `subscription_channels`=VALUES(`subscription_channels`),
  `subscription_billing_cycle`=VALUES(`subscription_billing_cycle`), `subscription_discount_rate`=VALUES(`subscription_discount_rate`),
  `features`=VALUES(`features`), `feature_details`=VALUES(`feature_details`), `modules`=VALUES(`modules`),
  `is_trial`=VALUES(`is_trial`), `is_recommended`=VALUES(`is_recommended`),
  `is_visible`=VALUES(`is_visible`), `sort_order`=VALUES(`sort_order`), `status`=VALUES(`status`);

-- ----- 8. 私有企业版 (PRIVATE_ENTERPRISE) ¥99,800 买断 | ¥39,800/年 -----
INSERT INTO `tenant_packages` (
  `name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`,
  `duration_days`, `max_users`, `max_storage_gb`, `user_limit_mode`, `max_online_seats`,
  `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`,
  `subscription_enabled`, `subscription_channels`, `subscription_billing_cycle`, `subscription_discount_rate`,
  `features`, `feature_details`, `modules`,
  `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`
) VALUES (
  '企业版', 'PRIVATE_ENTERPRISE', 'private', '大型企业/集团定制级方案', 99800.00, NULL, 'once',
  36500, 99999, 0, 'total', 0,
  0.00, 0, 39800.00,
  0, 'all', 'monthly', 0.00,
  '["永久授权", "不限用户数", "全部功能+源码", "远程部署协助(3次)", "现场部署支持", "3年免费升级", "专属+7×24支持", "可协商定制开发", "源码加密部署", "多服务器集群"]',
  '{"全部CRM功能模块":true,"企微完整集成":true,"通话短信模块":true,"完整后端源码":true,"完整前端源码":true,"移动APP源码":true,"数据100%私有":true,"Docker一键部署":true,"部署文档全套":true,"远程部署协助":"3次","现场部署支持":true,"免费版本升级":"3年","技术支持方式":"专属+7×24","专属技术顾问":true,"定制开发服务":"可协商","源码加密部署":true,"多服务器集群":true}',
  NULL,
  0, 0, 1, 12, 1
) ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `description`=VALUES(`description`), `price`=VALUES(`price`),
  `original_price`=VALUES(`original_price`), `billing_cycle`=VALUES(`billing_cycle`),
  `duration_days`=VALUES(`duration_days`), `max_users`=VALUES(`max_users`),
  `max_storage_gb`=VALUES(`max_storage_gb`), `user_limit_mode`=VALUES(`user_limit_mode`),
  `max_online_seats`=VALUES(`max_online_seats`), `yearly_discount_rate`=VALUES(`yearly_discount_rate`),
  `yearly_bonus_months`=VALUES(`yearly_bonus_months`), `yearly_price`=VALUES(`yearly_price`),
  `subscription_enabled`=VALUES(`subscription_enabled`), `subscription_channels`=VALUES(`subscription_channels`),
  `subscription_billing_cycle`=VALUES(`subscription_billing_cycle`), `subscription_discount_rate`=VALUES(`subscription_discount_rate`),
  `features`=VALUES(`features`), `feature_details`=VALUES(`feature_details`), `modules`=VALUES(`modules`),
  `is_trial`=VALUES(`is_trial`), `is_recommended`=VALUES(`is_recommended`),
  `is_visible`=VALUES(`is_visible`), `sort_order`=VALUES(`sort_order`), `status`=VALUES(`status`);

-- =============================================
-- 完成！共8个套餐（5个SaaS + 3个私有部署）
-- SaaS: 免费试用 | 入门版¥149 | 基础版¥399 | 专业版¥699⭐ | 企业版¥1,299
-- 私有: 标准版¥29,800 | 专业版¥59,800⭐ | 企业版¥99,800
-- 年付: SaaS统一9折 | 私有年度授权另计
-- 订阅: 全部默认关闭
-- 用户限制: SaaS=在线席位 | 私有=注册用户总数
-- =============================================
