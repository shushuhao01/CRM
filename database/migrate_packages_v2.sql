-- =============================================
-- 套餐数据全量更新脚本 v2.0
-- 更新内容：
--   1. SaaS定价调整：合并免费版→14天试用，基础¥399/专业¥699/企业¥1299
--   2. 私有部署提价：标准¥19800/专业¥38800/企业¥68800
--   3. 新增 feature_details 列（功能对比表数据）
--   4. 默认不支持订阅，年付9折不赠送月数
-- 兼容：MySQL 8.0+ / phpMyAdmin
-- =============================================

SET NAMES utf8mb4;

-- Step 1: 添加 feature_details 列（如不存在）
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_packages' AND COLUMN_NAME = 'feature_details');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `tenant_packages` ADD COLUMN `feature_details` JSON NULL COMMENT ''功能特性详情(对比表用)'' AFTER `features`',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: 清空现有套餐数据
DELETE FROM `tenant_packages`;
ALTER TABLE `tenant_packages` AUTO_INCREMENT = 1;

-- Step 3: 插入新套餐数据（5个SaaS + 3个私有部署 = 8个套餐）
-- 规则：subscription_enabled=0(默认不支持订阅)，年付9折(yearly_discount_rate=10)，不赠送月数(yearly_bonus_months=0)

INSERT INTO `tenant_packages`
  (`name`, `code`, `type`, `description`, `price`, `original_price`, `billing_cycle`, `duration_days`,
   `max_users`, `user_limit_mode`, `max_online_seats`, `max_storage_gb`,
   `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`,
   `features`, `modules`,
   `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`,
   `subscription_enabled`, `subscription_channels`, `subscription_billing_cycle`, `subscription_discount_rate`)
VALUES
-- 1. SaaS: 14天免费试用
('14天免费试用', 'FREE_TRIAL', 'saas', '体验云客CRM全部基础功能，14天全功能免费', 0.00, NULL, 'monthly', 14,
 5, 'online', 5, 1,
 0.00, 0, NULL,
 '["客户管理","订单管理","基础报表","物流跟踪","售后管理"]',
 '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system"]',
 1, 0, 1, 0, 1,
 0, 'all', 'monthly', 0.00),

-- 2. SaaS: 基础版 ¥399/月
('基础版', 'SAAS_BASIC', 'saas', '适合小型销售团队起步', 399.00, NULL, 'monthly', 30,
 10, 'online', 10, 10,
 10.00, 0, NULL,
 '["客户管理","订单管理","财务管理","物流打单发货","通话功能","短信100条/月","数据导入导出","售后管理"]',
 '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system"]',
 0, 0, 1, 1, 1,
 0, 'all', 'monthly', 0.00),

-- 3. SaaS: 专业版 ¥699/月（推荐）
('专业版', 'SAAS_PRO', 'saas', '适合成长型团队，功能全面', 699.00, NULL, 'monthly', 30,
 20, 'online', 20, 50,
 10.00, 0, NULL,
 '["全部基础版功能","批量操作","业绩薪酬提成","公海池管理","API接口","自定义字段","话术库","移动APP","专属技术顾问"]',
 '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system"]',
 0, 1, 1, 2, 1,
 0, 'all', 'monthly', 0.00),

-- 4. SaaS: 企业版 ¥1299/月
('企业版', 'SAAS_ENTERPRISE', 'saas', '适合大型销售团队，含企微全模块', 1299.00, NULL, 'monthly', 30,
 50, 'online', 50, 200,
 10.00, 0, NULL,
 '["全部专业版功能","企微完整集成","电话外呼系统","批量发货打单","财务结算报表","7×24技术支持","一对一培训(本地免费)"]',
 '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system","wecom"]',
 0, 0, 1, 3, 1,
 0, 'all', 'monthly', 0.00),

-- 5. 私有部署: 标准版 ¥19,800 永久 / ¥7,800/年
('标准版', 'PRIVATE_STANDARD', 'private', '适合小微企业私有部署', 19800.00, NULL, 'once', 36500,
 30, 'total', 0, 0,
 0.00, 0, 7800.00,
 '["永久授权","全部核心功能","完整源码交付","Docker一键部署","部署文档全套","1年免费升级","邮件技术支持"]',
 NULL,
 0, 0, 1, 10, 1,
 0, 'all', 'monthly', 0.00),

-- 6. 私有部署: 专业版 ¥38,800 永久 / ¥15,800/年（推荐）
('专业版', 'PRIVATE_PRO', 'private', '适合中型企业，含完整功能+部署协助', 38800.00, NULL, 'once', 36500,
 100, 'total', 0, 0,
 0.00, 0, 15800.00,
 '["永久授权","全部功能模块","含移动APP源码","远程部署协助1次","1年免费升级","在线+邮件支持","专属技术顾问"]',
 NULL,
 0, 1, 1, 11, 1,
 0, 'all', 'monthly', 0.00),

-- 7. 私有部署: 企业版 ¥68,800 永久 / ¥28,800/年
('企业版', 'PRIVATE_ENTERPRISE', 'private', '适合大型企业/集团，全功能+专属服务', 68800.00, NULL, 'once', 36500,
 99999, 'total', 0, 0,
 0.00, 0, 28800.00,
 '["永久授权","不限用户数","全部功能+源码","远程部署协助3次","现场部署支持","3年免费升级","专属+7×24支持","可协商定制开发"]',
 NULL,
 0, 0, 1, 12, 1,
 0, 'all', 'monthly', 0.00);

-- Step 4: 更新 feature_details（SaaS套餐 - 功能对比表数据）

UPDATE `tenant_packages` SET `feature_details` = '{
  "核心数据仪表盘":true,"多维度趋势图表":false,"自定义看板":false,
  "客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"数据导入导出":false,"批量导入Excel":false,"客户分享转移":false,"客户公海池":false,"隐私信息脱敏":false,
  "订单创建编辑":true,"订单审核工作流":false,"批量审核":false,"退款管理":false,
  "基础财务统计":false,"COD代收管理":false,"增值服务管理":false,"财务结算报表":false,
  "物流轨迹追踪":true,"发货管理":true,"批量发货打单":false,"支持快递公司":"3家",
  "商品管理分类":true,"库存预警":false,"虚拟商品卡密":false,
  "个人业绩统计":true,"团队业绩排行":false,"佣金阶梯计算":false,"业绩分享导出":false,
  "通话记录管理":false,"外呼线路配置":false,"电话外呼系统":false,
  "短信发送":false,"短信模板管理":false,"自动发送规则":false,
  "售后工单":true,"售后统计分析":false,
  "部门用户角色":false,"权限精细控制":false,"操作日志审计":false,
  "企微客户同步":false,"获客助手活码":false,"企微对外收款":false,"话术库":false,"会话存档":false,"AI智能助手":false,
  "H5移动端":true,"微信小程序":true,"移动APP":false,
  "API接口":false,"Webhook回调":false,"WebSocket推送":false,
  "邮件工单":false,"在线客服":false,"专属技术顾问":false,"7x24电话远程":false
}' WHERE `code` = 'FREE_TRIAL';

UPDATE `tenant_packages` SET `feature_details` = '{
  "核心数据仪表盘":true,"多维度趋势图表":true,"自定义看板":false,
  "客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"客户公海池":false,"隐私信息脱敏":true,
  "订单创建编辑":true,"订单审核工作流":true,"批量审核":false,"退款管理":true,
  "基础财务统计":true,"COD代收管理":true,"增值服务管理":false,"财务结算报表":false,
  "物流轨迹追踪":true,"发货管理":true,"批量发货打单":false,"支持快递公司":"5家",
  "商品管理分类":true,"库存预警":true,"虚拟商品卡密":false,
  "个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":false,"业绩分享导出":false,
  "通话记录管理":true,"外呼线路配置":false,"电话外呼系统":false,
  "短信发送":"100条/月","短信模板管理":true,"自动发送规则":false,
  "售后工单":true,"售后统计分析":true,
  "部门用户角色":true,"权限精细控制":true,"操作日志审计":true,
  "企微客户同步":false,"获客助手活码":false,"企微对外收款":false,"话术库":false,"会话存档":false,"AI智能助手":false,
  "H5移动端":true,"微信小程序":true,"移动APP":false,
  "API接口":false,"Webhook回调":false,"WebSocket推送":true,
  "邮件工单":true,"在线客服":true,"专属技术顾问":false,"7x24电话远程":false
}' WHERE `code` = 'SAAS_BASIC';

UPDATE `tenant_packages` SET `feature_details` = '{
  "核心数据仪表盘":true,"多维度趋势图表":true,"自定义看板":true,
  "客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"客户公海池":true,"隐私信息脱敏":true,
  "订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,
  "基础财务统计":true,"COD代收管理":true,"增值服务管理":true,"财务结算报表":false,
  "物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"支持快递公司":"全部",
  "商品管理分类":true,"库存预警":true,"虚拟商品卡密":true,
  "个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":true,"业绩分享导出":false,
  "通话记录管理":true,"外呼线路配置":true,"电话外呼系统":false,
  "短信发送":"500条/月","短信模板管理":true,"自动发送规则":true,
  "售后工单":true,"售后统计分析":true,
  "部门用户角色":true,"权限精细控制":true,"操作日志审计":true,
  "企微客户同步":false,"获客助手活码":false,"企微对外收款":false,"话术库":true,"会话存档":false,"AI智能助手":false,
  "H5移动端":true,"微信小程序":true,"移动APP":true,
  "API接口":true,"Webhook回调":true,"WebSocket推送":true,
  "邮件工单":true,"在线客服":true,"专属技术顾问":true,"7x24电话远程":false
}' WHERE `code` = 'SAAS_PRO';

UPDATE `tenant_packages` SET `feature_details` = '{
  "核心数据仪表盘":true,"多维度趋势图表":true,"自定义看板":true,
  "客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"客户公海池":true,"隐私信息脱敏":true,
  "订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,
  "基础财务统计":true,"COD代收管理":true,"增值服务管理":true,"财务结算报表":true,
  "物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"支持快递公司":"全部",
  "商品管理分类":true,"库存预警":true,"虚拟商品卡密":true,
  "个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":true,"业绩分享导出":true,
  "通话记录管理":true,"外呼线路配置":true,"电话外呼系统":true,
  "短信发送":"2000条/月","短信模板管理":true,"自动发送规则":true,
  "售后工单":true,"售后统计分析":true,
  "部门用户角色":true,"权限精细控制":true,"操作日志审计":true,
  "企微客户同步":true,"获客助手活码":true,"企微对外收款":true,"话术库":true,"会话存档":"加购","AI智能助手":"加购",
  "H5移动端":true,"微信小程序":true,"移动APP":true,
  "API接口":true,"Webhook回调":true,"WebSocket推送":true,
  "邮件工单":true,"在线客服":true,"专属技术顾问":true,"7x24电话远程":true
}' WHERE `code` = 'SAAS_ENTERPRISE';

-- Step 5: 更新 feature_details（私有部署套餐）

UPDATE `tenant_packages` SET `feature_details` = '{
  "全部CRM功能模块":true,"企微完整集成":true,"通话短信模块":true,
  "完整后端源码":true,"完整前端源码":true,"移动APP源码":false,
  "数据100%私有":true,"Docker一键部署":true,"部署文档全套":true,"远程部署协助":false,"现场部署支持":false,
  "免费版本升级":"1年","技术支持方式":"邮件",
  "专属技术顾问":false,"定制开发服务":false,"源码加密部署":false,"多服务器集群":false
}' WHERE `code` = 'PRIVATE_STANDARD';

UPDATE `tenant_packages` SET `feature_details` = '{
  "全部CRM功能模块":true,"企微完整集成":true,"通话短信模块":true,
  "完整后端源码":true,"完整前端源码":true,"移动APP源码":true,
  "数据100%私有":true,"Docker一键部署":true,"部署文档全套":true,"远程部署协助":"1次","现场部署支持":false,
  "免费版本升级":"1年","技术支持方式":"在线+邮件",
  "专属技术顾问":true,"定制开发服务":false,"源码加密部署":false,"多服务器集群":false
}' WHERE `code` = 'PRIVATE_PRO';

UPDATE `tenant_packages` SET `feature_details` = '{
  "全部CRM功能模块":true,"企微完整集成":true,"通话短信模块":true,
  "完整后端源码":true,"完整前端源码":true,"移动APP源码":true,
  "数据100%私有":true,"Docker一键部署":true,"部署文档全套":true,"远程部署协助":"3次","现场部署支持":true,
  "免费版本升级":"3年","技术支持方式":"专属+7×24",
  "专属技术顾问":true,"定制开发服务":"可协商","源码加密部署":true,"多服务器集群":true
}' WHERE `code` = 'PRIVATE_ENTERPRISE';

-- 验证插入结果
SELECT id, name, code, type, price, yearly_price, max_users, user_limit_mode, max_online_seats, max_storage_gb, is_trial, is_recommended, subscription_enabled
FROM `tenant_packages` ORDER BY type, sort_order;
