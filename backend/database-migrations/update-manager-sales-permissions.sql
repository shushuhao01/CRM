-- 更新部门经理和销售员的权限数据
-- 将一级菜单权限扩展为包含所有层级的权限ID

-- 更新部门经理权限
UPDATE roles 
SET permissions = JSON_ARRAY(
  -- 数据看板
  'dashboard', 'dashboard.view', 'dashboard.export',
  
  -- 客户管理
  'customer', 'customer.list', 'customer.list.view', 'customer.list.edit', 'customer.list.export', 'customer.list.import',
  'customer.add', 'customer.add.create',
  
  -- 订单管理
  'order', 'order.list', 'order.list.view', 'order.list.edit',
  'order.add', 'order.add.create',
  
  -- 服务管理（通话管理）
  'communication', 'communication.call', 'communication.call.view', 'communication.call.make', 'communication.call.record',
  
  -- 业绩统计
  'performance', 'performance.personal', 'performance.personal.view',
  'performance.team', 'performance.team.view', 
  'performance.analysis', 'performance.analysis.view',
  'performance.share', 'performance.share.view',
  
  -- 物流管理
  'logistics', 'logistics.list', 'logistics.list.view',
  'logistics.track', 'logistics.track.view',
  
  -- 售后管理
  'afterSales', 'afterSales.list', 'afterSales.list.view',
  'afterSales.add', 'afterSales.add.create',
  'afterSales.data', 'afterSales.data.view', 'afterSales.data.analysis',
  
  -- 资料管理
  'data', 'data.search', 'data.search.basic', 'data.search.advanced',
  
  -- 财务管理
  'finance', 'finance.performance_data', 'finance.performance_data.view',
  'finance.cod_application', 'finance.cod_application.view', 'finance.cod_application.create'
)
WHERE code = 'department_manager';

-- 更新销售员权限
UPDATE roles 
SET permissions = JSON_ARRAY(
  -- 数据看板
  'dashboard', 'dashboard.view',
  
  -- 客户管理
  'customer', 'customer.list', 'customer.list.view',
  'customer.add', 'customer.add.create',
  
  -- 订单管理
  'order', 'order.list', 'order.list.view', 'order.list.edit',
  'order.add', 'order.add.create',
  
  -- 服务管理（通话管理）
  'communication', 'communication.call', 'communication.call.view', 'communication.call.make',
  
  -- 业绩统计
  'performance', 'performance.personal', 'performance.personal.view',
  'performance.team', 'performance.team.view',
  
  -- 物流管理
  'logistics', 'logistics.list', 'logistics.list.view',
  'logistics.track', 'logistics.track.view',
  
  -- 售后管理
  'afterSales', 'afterSales.list', 'afterSales.list.view',
  'afterSales.add', 'afterSales.add.create',
  
  -- 资料管理
  'data', 'data.search', 'data.search.basic',
  
  -- 财务管理
  'finance', 'finance.performance_data', 'finance.performance_data.view',
  'finance.cod_application', 'finance.cod_application.view', 'finance.cod_application.create'
)
WHERE code = 'sales_staff';
