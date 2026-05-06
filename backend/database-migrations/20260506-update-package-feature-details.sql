-- ============================================================
-- 迁移脚本：更新套餐 feature_details 与系统实际功能对齐
-- 日期：2026-05-06
-- 变更说明：
--   1. FREE_TRIAL: 改为全功能体验（所有特性 true）
--   2. 所有 SaaS 套餐: feature_details key 与 FeatureCompare.vue saasGroups 对齐
--   3. 移除不存在的特性: 自定义看板、客户公海池、客户分配规则、基础财务统计、支持快递公司、商品管理分类、电话外呼系统
--   4. 新增实际存在的特性: 客户360°画像、寄件人地址管理、快递公司管理、库存管理、库存预警、商品分析报表、
--      通话录音存储、坐席状态管理、工作手机绑定、短信审核统计、资料列表、客户查询、回收站、
--      消息管理、自定义字段、敏感词监控、企微侧边栏、微信客服、数据批量导出、在线文档帮助中心
-- ============================================================

-- 1. 14天免费试用 → 全功能体验
UPDATE `tenant_packages` SET
  `features` = '["全功能体验", "客户管理", "订单管理", "财务管理", "物流管理", "商品管理", "业绩管理", "通话管理", "短信管理", "售后管理", "企微集成"]',
  `feature_details` = '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"客户360°画像":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":true,"财务结算报表":true,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"寄件人地址管理":true,"快递公司管理":true,"商品列表分类":true,"库存管理":true,"库存预警":true,"虚拟商品卡密":true,"商品分析报表":true,"个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":true,"业绩分析":true,"业绩分享导出":true,"通话记录管理":true,"通话录音存储":true,"坐席状态管理":true,"外呼线路配置":true,"工作手机绑定":true,"短信发送":true,"短信模板管理":true,"短信审核统计":true,"自动发送规则":true,"售后工单":true,"售后统计分析":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"自定义字段":true,"企微客户同步":true,"客户群管理":true,"获客助手活码":true,"企微对外收款":true,"微信客服":true,"话术库":true,"敏感词监控":true,"企微侧边栏":true,"会话存档":true,"AI智能助手":true,"H5移动端":true,"微信小程序":true,"移动APP":true,"API接口":true,"Webhook回调":true,"WebSocket推送":true,"数据批量导出":true,"在线文档帮助中心":true,"邮件工单":true,"在线客服":true,"专属技术顾问":true,"7x24电话远程":true}',
  `modules` = '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system","wecom"]',
  `updated_at` = NOW()
WHERE `code` = 'FREE_TRIAL';

-- 2. 入门版 ¥149/月
UPDATE `tenant_packages` SET
  `feature_details` = '{"核心数据仪表盘":true,"多维度趋势图表":false,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"客户360°画像":true,"数据导入导出":true,"批量导入Excel":false,"客户分享转移":false,"隐私信息脱敏":false,"订单创建编辑":true,"订单审核工作流":false,"批量审核":false,"退款管理":false,"绩效数据查看":false,"绩效管理":false,"COD代收管理":false,"增值服务管理":false,"财务结算报表":false,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":false,"寄件人地址管理":false,"快递公司管理":false,"商品列表分类":true,"库存管理":true,"库存预警":false,"虚拟商品卡密":false,"商品分析报表":false,"个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":false,"业绩分析":false,"业绩分享导出":false,"通话记录管理":false,"通话录音存储":false,"坐席状态管理":false,"外呼线路配置":false,"工作手机绑定":false,"短信发送":false,"短信模板管理":false,"短信审核统计":false,"自动发送规则":false,"售后工单":true,"售后统计分析":false,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":"基础","权限精细控制":false,"操作日志审计":false,"消息管理":false,"自定义字段":false,"企微客户同步":false,"客户群管理":false,"获客助手活码":false,"企微对外收款":false,"微信客服":false,"话术库":false,"敏感词监控":false,"企微侧边栏":false,"会话存档":false,"AI智能助手":false,"H5移动端":true,"微信小程序":true,"移动APP":false,"API接口":false,"Webhook回调":false,"WebSocket推送":false,"数据批量导出":true,"在线文档帮助中心":true,"邮件工单":true,"在线客服":false,"专属技术顾问":false,"7x24电话远程":false}',
  `updated_at` = NOW()
WHERE `code` = 'SAAS_STARTER';

-- 3. 基础版 ¥399/月
UPDATE `tenant_packages` SET
  `features` = '["客户管理", "订单管理", "财务管理", "通话管理", "短信100条/月", "数据导入导出", "售后管理"]',
  `feature_details` = '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"客户360°画像":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":false,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":false,"财务结算报表":false,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":false,"寄件人地址管理":true,"快递公司管理":true,"商品列表分类":true,"库存管理":true,"库存预警":true,"虚拟商品卡密":false,"商品分析报表":false,"个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":false,"业绩分析":true,"业绩分享导出":false,"通话记录管理":true,"通话录音存储":true,"坐席状态管理":true,"外呼线路配置":false,"工作手机绑定":false,"短信发送":"100条/月","短信模板管理":true,"短信审核统计":true,"自动发送规则":false,"售后工单":true,"售后统计分析":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"自定义字段":true,"企微客户同步":false,"客户群管理":false,"获客助手活码":false,"企微对外收款":false,"微信客服":false,"话术库":false,"敏感词监控":false,"企微侧边栏":false,"会话存档":false,"AI智能助手":false,"H5移动端":true,"微信小程序":true,"移动APP":false,"API接口":false,"Webhook回调":false,"WebSocket推送":true,"数据批量导出":true,"在线文档帮助中心":true,"邮件工单":true,"在线客服":true,"专属技术顾问":false,"7x24电话远程":false}',
  `updated_at` = NOW()
WHERE `code` = 'SAAS_BASIC';

-- 4. 专业版 ¥699/月 ⭐推荐
UPDATE `tenant_packages` SET
  `features` = '["全部功能", "佣金阶梯", "业绩分析", "API接口", "自定义字段", "话术库", "移动APP", "专属顾问"]',
  `feature_details` = '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"客户360°画像":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":true,"财务结算报表":false,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"寄件人地址管理":true,"快递公司管理":true,"商品列表分类":true,"库存管理":true,"库存预警":true,"虚拟商品卡密":true,"商品分析报表":true,"个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":true,"业绩分析":true,"业绩分享导出":false,"通话记录管理":true,"通话录音存储":true,"坐席状态管理":true,"外呼线路配置":true,"工作手机绑定":true,"短信发送":"500条/月","短信模板管理":true,"短信审核统计":true,"自动发送规则":true,"售后工单":true,"售后统计分析":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"自定义字段":true,"企微客户同步":false,"客户群管理":false,"获客助手活码":false,"企微对外收款":false,"微信客服":false,"话术库":true,"敏感词监控":false,"企微侧边栏":false,"会话存档":false,"AI智能助手":false,"H5移动端":true,"微信小程序":true,"移动APP":true,"API接口":true,"Webhook回调":true,"WebSocket推送":true,"数据批量导出":true,"在线文档帮助中心":true,"邮件工单":true,"在线客服":true,"专属技术顾问":true,"7x24电话远程":false}',
  `updated_at` = NOW()
WHERE `code` = 'SAAS_PRO';

-- 5. 企业版 ¥1,299/月
UPDATE `tenant_packages` SET
  `features` = '["全部专业版功能", "企微全集成", "财务结算报表", "7×24支持", "一对一培训(免费)"]',
  `feature_details` = '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"客户360°画像":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":true,"财务结算报表":true,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"寄件人地址管理":true,"快递公司管理":true,"商品列表分类":true,"库存管理":true,"库存预警":true,"虚拟商品卡密":true,"商品分析报表":true,"个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":true,"业绩分析":true,"业绩分享导出":true,"通话记录管理":true,"通话录音存储":true,"坐席状态管理":true,"外呼线路配置":true,"工作手机绑定":true,"短信发送":"2000条/月","短信模板管理":true,"短信审核统计":true,"自动发送规则":true,"售后工单":true,"售后统计分析":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"自定义字段":true,"企微客户同步":true,"客户群管理":true,"获客助手活码":true,"企微对外收款":true,"微信客服":true,"话术库":true,"敏感词监控":true,"企微侧边栏":true,"会话存档":"加购","AI智能助手":"加购","H5移动端":true,"微信小程序":true,"移动APP":true,"API接口":true,"Webhook回调":true,"WebSocket推送":true,"数据批量导出":true,"在线文档帮助中心":true,"邮件工单":true,"在线客服":true,"专属技术顾问":true,"7x24电话远程":true}',
  `updated_at` = NOW()
WHERE `code` = 'SAAS_ENTERPRISE';

-- 私有部署套餐 feature_details 无变化（key 已正确），无需更新
