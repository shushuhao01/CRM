-- =============================================
-- 开源社区版数据库迁移 (v1.8.0)
-- 适用于：MySQL 8.0+ / phpMyAdmin
-- 执行前请备份数据库
-- =============================================

-- 1. licenses 表：确保 license_type 包含 community 枚举值
-- 如果已执行过可安全重复运行（ALTER TABLE 幂等）
ALTER TABLE `licenses`
  MODIFY COLUMN `license_type`
    ENUM('trial','perpetual','annual','monthly','community')
    DEFAULT 'trial'
    COMMENT '授权类型：trial-试用，perpetual-永久，annual-年度，monthly-月度，community-社区版';

-- 2. tenant_packages 表：确保 type 包含 community 枚举值
ALTER TABLE `tenant_packages`
  MODIFY COLUMN `type`
    ENUM('saas','private','community')
    NOT NULL DEFAULT 'saas'
    COMMENT '套餐类型：saas-云端版，private-私有部署，community-开源社区版';

-- 3. system_license 表：更新 license_type 注释（字段为 VARCHAR，无需改类型）
ALTER TABLE `system_license`
  MODIFY COLUMN `license_type`
    VARCHAR(50) DEFAULT 'perpetual'
    COMMENT '授权类型: trial试用, perpetual永久, annual年度, monthly月度, community社区版';

-- 4. 插入/更新社区版套餐数据
INSERT INTO `tenant_packages`
  (`name`, `code`, `type`, `description`, `price`, `original_price`,
   `billing_cycle`, `duration_days`, `max_users`, `max_storage_gb`,
   `user_limit_mode`, `max_online_seats`,
   `yearly_discount_rate`, `yearly_bonus_months`, `yearly_price`,
   `subscription_enabled`, `subscription_channels`, `subscription_billing_cycle`, `subscription_discount_rate`,
   `features`, `feature_details`, `modules`,
   `is_trial`, `is_recommended`, `is_visible`, `sort_order`, `status`)
VALUES
  ('社区版', 'COMMUNITY_FREE', 'community',
   '开源社区版，包含核心CRM功能，适合小团队免费使用',
   0.00, NULL, 'once', 36500, 3, 2, 'total', 0,
   0.00, 0, NULL, 0, 'all', 'monthly', 0.00,
   '["客户管理", "订单管理", "物流管理", "售后管理", "数据看板", "3用户上限", "社区支持"]',
   '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"客户全景画像":true,"数据导入导出":"100条/次","批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":false,"订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,"绩效数据查看":false,"绩效管理":false,"COD代收管理":false,"增值服务管理":false,"财务结算报表":false,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"寄件人地址管理":true,"快递公司管理":true,"商品列表分类":true,"库存管理":true,"库存预警":true,"虚拟商品卡密":false,"商品分析报表":false,"个人业绩统计":false,"团队业绩排行":false,"佣金阶梯计算":false,"业绩分析":false,"业绩分享导出":false,"通话记录管理":false,"通话录音存储":false,"坐席状态管理":false,"外呼线路配置":false,"工作手机绑定":false,"短信发送":false,"短信模板管理":false,"短信审核统计":false,"自动发送规则":false,"售后工单":true,"售后统计分析":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":false,"操作日志审计":true,"消息管理":true,"自定义字段":true,"企微客户同步":false,"客户群管理":false,"获客助手活码":false,"企微对外收款":false,"微信客服":false,"话术库":false,"敏感词监控":false,"企微侧边栏":false,"会话存档":false,"AI智能助手":false,"H5企微侧边栏(5个内置应用)":false,"微信小程序(客户自助填写地址)":false,"移动APP":false,"API接口":false,"Webhook回调":false,"WebSocket推送":false,"数据批量导出":false}',
   '["dashboard","customer","order","logistics","service"]',
   0, 0, 1, 20, 1)
ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`), `description`=VALUES(`description`),
  `price`=VALUES(`price`), `billing_cycle`=VALUES(`billing_cycle`),
  `duration_days`=VALUES(`duration_days`), `max_users`=VALUES(`max_users`),
  `max_storage_gb`=VALUES(`max_storage_gb`), `user_limit_mode`=VALUES(`user_limit_mode`),
  `features`=VALUES(`features`), `feature_details`=VALUES(`feature_details`),
  `modules`=VALUES(`modules`), `is_visible`=VALUES(`is_visible`),
  `sort_order`=VALUES(`sort_order`), `status`=VALUES(`status`);
