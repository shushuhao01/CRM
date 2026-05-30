-- =============================================
-- 修复角色权限代码：将旧格式代码更正为与permissions表一致的代码
-- 修复内容：
--   1. customer_service: afterSales.* → aftersale.*, dashboard.personal → dashboard.view
--   2. department_manager: finance.cod_application → order.cod_application
--   3. sales_staff: finance.cod_application → order.cod_application
-- =============================================

-- 1. 修复 customer_service 角色权限
-- 旧代码问题：afterSales.*(驼峰) → aftersale.*(小写), dashboard.personal → dashboard.view
-- 同时按照 PERMISSION_TREE 补全客服应有的售后完整权限
UPDATE `roles` SET `permissions` = JSON_ARRAY(
  'dashboard', 'dashboard.view',
  'order', 'order.audit', 'order.audit.view', 'order.audit.approve', 'order.audit.reject',
  'logistics', 'logistics.list', 'logistics.list.view',
  'logistics.shipping', 'logistics.shipping.view', 'logistics.shipping.create',
  'logistics.track', 'logistics.track.view', 'logistics.track.update',
  'logistics.status', 'logistics.status.view', 'logistics.status.update',
  'aftersale', 'aftersale.list', 'aftersale.list.view', 'aftersale.list.edit', 'aftersale.list.delete', 'aftersale.list.export',
  'aftersale.add', 'aftersale.add.create',
  'aftersale.data', 'aftersale.data.view', 'aftersale.data.export',
  'data', 'data.list', 'data.list.view',
  'data.search', 'data.search.basic', 'data.search.advanced'
) WHERE `id` = 'customer_service';

-- 2. 修复 department_manager 角色权限
-- 旧代码问题：finance.cod_application → order.cod_application
UPDATE `roles` SET `permissions` = JSON_ARRAY(
  'dashboard', 'dashboard.view', 'dashboard.export',
  'customer', 'customer.list', 'customer.list.view', 'customer.list.edit', 'customer.list.export', 'customer.list.import',
  'customer.add', 'customer.add.create',
  'order', 'order.list', 'order.list.view', 'order.list.edit',
  'order.add', 'order.add.create',
  'order.cod_application', 'order.cod_application.view', 'order.cod_application.create',
  'communication', 'communication.call', 'communication.call.view', 'communication.call.make', 'communication.call.record',
  'performance', 'performance.personal', 'performance.personal.view',
  'performance.team', 'performance.team.view',
  'performance.analysis', 'performance.analysis.view',
  'performance.share', 'performance.share.view',
  'logistics', 'logistics.list', 'logistics.list.view',
  'logistics.track', 'logistics.track.view',
  'aftersale', 'aftersale.list', 'aftersale.list.view',
  'aftersale.add', 'aftersale.add.create',
  'aftersale.data', 'aftersale.data.view',
  'data', 'data.search', 'data.search.basic', 'data.search.advanced',
  'finance', 'finance.performance_data', 'finance.performance_data.view',
  'wecom', 'wecom.customer', 'wecom.customer.view',
  'wecom.customer_group', 'wecom.customer_group.view',
  'wecom.chat_archive', 'wecom.chat_archive.view',
  'wecom.acquisition', 'wecom.acquisition.view', 'wecom.acquisition.create', 'wecom.acquisition.edit', 'wecom.acquisition.delete',
  'wecom.contact_way', 'wecom.contact_way.view', 'wecom.contact_way.create', 'wecom.contact_way.edit', 'wecom.contact_way.delete'
) WHERE `id` = 'department_manager';

-- 3. 修复 sales_staff 角色权限
-- 旧代码问题：finance.cod_application → order.cod_application
UPDATE `roles` SET `permissions` = JSON_ARRAY(
  'dashboard', 'dashboard.view',
  'customer', 'customer.list', 'customer.list.view',
  'customer.add', 'customer.add.create',
  'order', 'order.list', 'order.list.view', 'order.list.edit',
  'order.add', 'order.add.create',
  'order.cod_application', 'order.cod_application.view', 'order.cod_application.create',
  'communication', 'communication.call', 'communication.call.view', 'communication.call.make',
  'performance', 'performance.personal', 'performance.personal.view',
  'performance.team', 'performance.team.view',
  'logistics', 'logistics.list', 'logistics.list.view',
  'logistics.track', 'logistics.track.view',
  'aftersale', 'aftersale.list', 'aftersale.list.view',
  'aftersale.add', 'aftersale.add.create',
  'data', 'data.search', 'data.search.basic',
  'finance', 'finance.performance_data', 'finance.performance_data.view',
  'wecom', 'wecom.customer', 'wecom.customer.view',
  'wecom.customer_group', 'wecom.customer_group.view',
  'wecom.chat_archive', 'wecom.chat_archive.view'
) WHERE `id` = 'sales_staff';
