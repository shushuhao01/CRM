-- ============================================================
-- 迁移脚本：套餐 feature_details 全面重构
-- 日期：2026-05-06 v2
-- 核心理念：各版本功能丰富、大体一致，仅在企微模块、
--   批量导入导出、短信额度、移动APP、技术支持级别上区分
-- 兼容 phpMyAdmin 直接执行
-- ============================================================

UPDATE `tenant_packages` SET
  `features` = '["全功能体验", "客户管理", "订单管理", "财务管理", "物流管理", "商品管理", "业绩管理", "通话短信", "售后管理", "企微管理", "移动APP"]',
  `feature_details` = '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"客户全景画像":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":true,"财务结算报表":true,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"寄件人地址管理":true,"快递公司管理":true,"商品列表分类":true,"库存管理":true,"库存预警":true,"虚拟商品卡密":true,"商品分析报表":true,"个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":true,"业绩分析":true,"业绩分享导出":true,"通话记录管理":true,"通话录音存储":true,"坐席状态管理":true,"外呼线路配置":true,"工作手机绑定":true,"短信发送":true,"短信模板管理":true,"短信审核统计":true,"自动发送规则":true,"售后工单":true,"售后统计分析":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"自定义字段":true,"企微客户同步":true,"客户群管理":true,"获客助手活码":true,"企微对外收款":true,"微信客服":true,"话术库":true,"敏感词监控":true,"企微侧边栏":true,"会话存档":true,"AI智能助手":true,"H5企微侧边栏(5个内置应用)":true,"微信小程序(客户自助填写地址)":true,"移动APP":true,"API接口":true,"Webhook回调":true,"WebSocket推送":true,"数据批量导出":true,"在线文档帮助中心":true,"邮件工单":true,"在线客服":true,"专属技术顾问":true,"7x24电话远程":true}',
  `modules` = '["dashboard","customer","order","service-management","performance","logistics","service","data","finance","product","system","wecom"]',
  `updated_at` = NOW()
WHERE `code` = 'FREE_TRIAL';

UPDATE `tenant_packages` SET
  `features` = '["客户管理", "订单管理", "财务管理", "物流管理", "通话管理", "短信50条/月", "售后管理", "邮件支持"]',
  `feature_details` = '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"客户全景画像":true,"数据导入导出":true,"批量导入Excel":false,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":true,"财务结算报表":true,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"寄件人地址管理":true,"快递公司管理":true,"商品列表分类":true,"库存管理":true,"库存预警":true,"虚拟商品卡密":true,"商品分析报表":true,"个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":true,"业绩分析":true,"业绩分享导出":true,"通话记录管理":true,"通话录音存储":true,"坐席状态管理":true,"外呼线路配置":true,"工作手机绑定":true,"短信发送":"50条/月","短信模板管理":true,"短信审核统计":true,"自动发送规则":false,"售后工单":true,"售后统计分析":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"自定义字段":true,"企微客户同步":false,"客户群管理":false,"获客助手活码":false,"企微对外收款":false,"微信客服":false,"话术库":false,"敏感词监控":false,"企微侧边栏":false,"会话存档":false,"AI智能助手":false,"H5企微侧边栏(5个内置应用)":true,"微信小程序(客户自助填写地址)":true,"移动APP":false,"API接口":true,"Webhook回调":true,"WebSocket推送":true,"数据批量导出":false,"在线文档帮助中心":true,"邮件工单":true,"在线客服":false,"专属技术顾问":false,"7x24电话远程":false}',
  `updated_at` = NOW()
WHERE `code` = 'SAAS_STARTER';

UPDATE `tenant_packages` SET
  `features` = '["全部核心功能", "批量导入导出", "通话管理", "短信100条/月", "数据批量导出", "在线客服"]',
  `feature_details` = '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"客户全景画像":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":true,"财务结算报表":true,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"寄件人地址管理":true,"快递公司管理":true,"商品列表分类":true,"库存管理":true,"库存预警":true,"虚拟商品卡密":true,"商品分析报表":true,"个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":true,"业绩分析":true,"业绩分享导出":true,"通话记录管理":true,"通话录音存储":true,"坐席状态管理":true,"外呼线路配置":true,"工作手机绑定":true,"短信发送":"100条/月","短信模板管理":true,"短信审核统计":true,"自动发送规则":true,"售后工单":true,"售后统计分析":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"自定义字段":true,"企微客户同步":false,"客户群管理":false,"获客助手活码":false,"企微对外收款":false,"微信客服":false,"话术库":false,"敏感词监控":false,"企微侧边栏":false,"会话存档":false,"AI智能助手":false,"H5企微侧边栏(5个内置应用)":true,"微信小程序(客户自助填写地址)":true,"移动APP":false,"API接口":true,"Webhook回调":true,"WebSocket推送":true,"数据批量导出":true,"在线文档帮助中心":true,"邮件工单":true,"在线客服":true,"专属技术顾问":false,"7x24电话远程":false}',
  `updated_at` = NOW()
WHERE `code` = 'SAAS_BASIC';

UPDATE `tenant_packages` SET
  `features` = '["全部功能", "企微管理", "短信500条/月", "移动APP", "数据批量导出", "专属技术顾问"]',
  `feature_details` = '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"客户全景画像":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":true,"财务结算报表":true,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"寄件人地址管理":true,"快递公司管理":true,"商品列表分类":true,"库存管理":true,"库存预警":true,"虚拟商品卡密":true,"商品分析报表":true,"个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":true,"业绩分析":true,"业绩分享导出":true,"通话记录管理":true,"通话录音存储":true,"坐席状态管理":true,"外呼线路配置":true,"工作手机绑定":true,"短信发送":"500条/月","短信模板管理":true,"短信审核统计":true,"自动发送规则":true,"售后工单":true,"售后统计分析":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"自定义字段":true,"企微客户同步":true,"客户群管理":true,"获客助手活码":true,"企微对外收款":true,"微信客服":true,"话术库":true,"敏感词监控":true,"企微侧边栏":true,"会话存档":"加购","AI智能助手":"加购","H5企微侧边栏(5个内置应用)":true,"微信小程序(客户自助填写地址)":true,"移动APP":true,"API接口":true,"Webhook回调":true,"WebSocket推送":true,"数据批量导出":true,"在线文档帮助中心":true,"邮件工单":true,"在线客服":true,"专属技术顾问":true,"7x24电话远程":false}',
  `updated_at` = NOW()
WHERE `code` = 'SAAS_PRO';

UPDATE `tenant_packages` SET
  `features` = '["全部专业版功能", "企微全集成", "短信2000条/月", "会话存档", "7×24支持"]',
  `feature_details` = '{"核心数据仪表盘":true,"多维度趋势图表":true,"客户信息管理":true,"客户标签与分组":true,"跟进记录与提醒":true,"客户全景画像":true,"数据导入导出":true,"批量导入Excel":true,"客户分享转移":true,"隐私信息脱敏":true,"订单创建编辑":true,"订单审核工作流":true,"批量审核":true,"退款管理":true,"绩效数据查看":true,"绩效管理":true,"COD代收管理":true,"增值服务管理":true,"财务结算报表":true,"物流轨迹追踪":true,"发货管理":true,"批量发货打单":true,"寄件人地址管理":true,"快递公司管理":true,"商品列表分类":true,"库存管理":true,"库存预警":true,"虚拟商品卡密":true,"商品分析报表":true,"个人业绩统计":true,"团队业绩排行":true,"佣金阶梯计算":true,"业绩分析":true,"业绩分享导出":true,"通话记录管理":true,"通话录音存储":true,"坐席状态管理":true,"外呼线路配置":true,"工作手机绑定":true,"短信发送":"2000条/月","短信模板管理":true,"短信审核统计":true,"自动发送规则":true,"售后工单":true,"售后统计分析":true,"资料列表":true,"客户查询":true,"回收站":true,"部门用户角色":true,"权限精细控制":true,"操作日志审计":true,"消息管理":true,"自定义字段":true,"企微客户同步":true,"客户群管理":true,"获客助手活码":true,"企微对外收款":true,"微信客服":true,"话术库":true,"敏感词监控":true,"企微侧边栏":true,"会话存档":true,"AI智能助手":"加购","H5企微侧边栏(5个内置应用)":true,"微信小程序(客户自助填写地址)":true,"移动APP":true,"API接口":true,"Webhook回调":true,"WebSocket推送":true,"数据批量导出":true,"在线文档帮助中心":true,"邮件工单":true,"在线客服":true,"专属技术顾问":true,"7x24电话远程":true}',
  `updated_at` = NOW()
WHERE `code` = 'SAAS_ENTERPRISE';
