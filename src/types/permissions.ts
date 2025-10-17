// 权限类型定义
export interface Permission {
  id: string
  name: string
  code: string
  type: 'menu' | 'page' | 'action'
  parentId?: string
  description?: string
  icon?: string
  sort?: number
  children?: Permission[]
}

// 权限级别枚举
export enum PermissionLevel {
  MENU = 'menu',        // 一级菜单权限
  PAGE = 'page',        // 二级菜单/页面权限
  ACTION = 'action'     // 操作按钮权限
}

// 权限操作类型
export enum ActionType {
  VIEW = 'view',           // 查看
  CREATE = 'create',       // 创建
  EDIT = 'edit',          // 编辑
  DELETE = 'delete',      // 删除
  EXPORT = 'export',      // 导出
  IMPORT = 'import',      // 导入
  AUDIT = 'audit',        // 审核
  APPROVE = 'approve',    // 通过
  REJECT = 'reject',      // 拒绝
  ASSIGN = 'assign',      // 分配
  TRANSFER = 'transfer',  // 转移
  RESTORE = 'restore',    // 恢复
  SEND = 'send',          // 发送
  TRACK = 'track',        // 跟踪
  ANALYZE = 'analyze',    // 分析
  SHARE = 'share',        // 分享
  CONFIG = 'config',      // 配置
  MANAGE = 'manage'       // 管理
}

// 完整的权限树结构
export const PERMISSION_TREE: Permission[] = [
  {
    id: 'dashboard',
    name: '数据看板',
    code: 'dashboard',
    type: 'menu',
    icon: 'Odometer',
    sort: 1,
    children: [
      {
        id: 'dashboard_view',
        name: '查看数据看板',
        code: 'dashboard:view',
        type: 'action',
        parentId: 'dashboard'
      }
    ]
  },
  {
    id: 'customer',
    name: '客户管理',
    code: 'customer',
    type: 'menu',
    icon: 'User',
    sort: 2,
    children: [
      {
        id: 'customer_list',
        name: '客户列表',
        code: 'customer:list',
        type: 'page',
        parentId: 'customer',
        children: [
          { id: 'customer_list_view', name: '查看客户', code: 'customer:list:view', type: 'action', parentId: 'customer_list' },
          { id: 'customer_list_create', name: '新增客户', code: 'customer:list:create', type: 'action', parentId: 'customer_list' },
          { id: 'customer_list_edit', name: '编辑客户', code: 'customer:list:edit', type: 'action', parentId: 'customer_list' },
          { id: 'customer_list_delete', name: '删除客户', code: 'customer:list:delete', type: 'action', parentId: 'customer_list' },
          { id: 'customer_list_export', name: '导出客户', code: 'customer:list:export', type: 'action', parentId: 'customer_list' },
          { id: 'customer_list_assign', name: '分配客户', code: 'customer:list:assign', type: 'action', parentId: 'customer_list' }
        ]
      },
      {
        id: 'customer_add',
        name: '新增客户',
        code: 'customer:add',
        type: 'page',
        parentId: 'customer',
        children: [
          { id: 'customer_add_create', name: '创建客户', code: 'customer:add:create', type: 'action', parentId: 'customer_add' }
        ]
      },
      {
        id: 'customer_tags',
        name: '客户标签',
        code: 'customer:tags',
        type: 'page',
        parentId: 'customer',
        children: [
          { id: 'customer_tags_view', name: '查看标签', code: 'customer:tags:view', type: 'action', parentId: 'customer_tags' },
          { id: 'customer_tags_manage', name: '管理标签', code: 'customer:tags:manage', type: 'action', parentId: 'customer_tags' }
        ]
      },
      {
        id: 'customer_groups',
        name: '客户分组',
        code: 'customer:groups',
        type: 'page',
        parentId: 'customer',
        children: [
          { id: 'customer_groups_view', name: '查看分组', code: 'customer:groups:view', type: 'action', parentId: 'customer_groups' },
          { id: 'customer_groups_manage', name: '管理分组', code: 'customer:groups:manage', type: 'action', parentId: 'customer_groups' }
        ]
      }
    ]
  },
  {
    id: 'order',
    name: '订单管理',
    code: 'order',
    type: 'menu',
    icon: 'ShoppingCart',
    sort: 3,
    children: [
      {
        id: 'order_list',
        name: '订单列表',
        code: 'order:list',
        type: 'page',
        parentId: 'order',
        children: [
          { id: 'order_list_view', name: '查看订单', code: 'order:list:view', type: 'action', parentId: 'order_list' },
          { id: 'order_list_edit', name: '编辑订单', code: 'order:list:edit', type: 'action', parentId: 'order_list' },
          { id: 'order_list_delete', name: '删除订单', code: 'order:list:delete', type: 'action', parentId: 'order_list' },
          { id: 'order_list_export', name: '导出订单', code: 'order:list:export', type: 'action', parentId: 'order_list' }
        ]
      },
      {
        id: 'order_add',
        name: '新增订单',
        code: 'order:add',
        type: 'page',
        parentId: 'order',
        children: [
          { id: 'order_add_create', name: '创建订单', code: 'order:add:create', type: 'action', parentId: 'order_add' }
        ]
      },
      {
        id: 'order_audit',
        name: '订单审核',
        code: 'order:audit',
        type: 'page',
        parentId: 'order',
        children: [
          { id: 'order_audit_view', name: '查看审核', code: 'order:audit:view', type: 'action', parentId: 'order_audit' },
          { id: 'order_audit_approve', name: '通过审核', code: 'order:audit:approve', type: 'action', parentId: 'order_audit' },
          { id: 'order_audit_reject', name: '拒绝审核', code: 'order:audit:reject', type: 'action', parentId: 'order_audit' }
        ]
      }
    ]
  },
  {
    id: 'service_management',
    name: '服务管理',
    code: 'service_management',
    type: 'menu',
    icon: 'Headset',
    sort: 4,
    children: [
      {
        id: 'service_call',
        name: '通话管理',
        code: 'service:call',
        type: 'page',
        parentId: 'service_management',
        children: [
          { id: 'service_call_view', name: '查看通话', code: 'service:call:view', type: 'action', parentId: 'service_call' },
          { id: 'service_call_record', name: '录音管理', code: 'service:call:record', type: 'action', parentId: 'service_call' },
          { id: 'service_call_config', name: '电话配置', code: 'service:call:config', type: 'action', parentId: 'service_call' }
        ]
      },
      {
        id: 'service_sms',
        name: '短信管理',
        code: 'service:sms',
        type: 'page',
        parentId: 'service_management',
        children: [
          { id: 'service_sms_view', name: '查看短信', code: 'service:sms:view', type: 'action', parentId: 'service_sms' },
          { id: 'service_sms_send', name: '发送短信', code: 'service:sms:send', type: 'action', parentId: 'service_sms' },
          { id: 'service_sms_audit', name: '短信审核', code: 'service:sms:audit', type: 'action', parentId: 'service_sms' },
          { id: 'service_sms_analyze', name: '短信统计', code: 'service:sms:analyze', type: 'action', parentId: 'service_sms' }
        ]
      }
    ]
  },
  {
    id: 'performance',
    name: '业绩统计',
    code: 'performance',
    type: 'menu',
    icon: 'TrendCharts',
    sort: 5,
    children: [
      {
        id: 'performance_personal',
        name: '个人业绩',
        code: 'performance:personal',
        type: 'page',
        parentId: 'performance',
        children: [
          { id: 'performance_personal_view', name: '查看个人业绩', code: 'performance:personal:view', type: 'action', parentId: 'performance_personal' }
        ]
      },
      {
        id: 'performance_team',
        name: '团队业绩',
        code: 'performance:team',
        type: 'page',
        parentId: 'performance',
        children: [
          { id: 'performance_team_view', name: '查看团队业绩', code: 'performance:team:view', type: 'action', parentId: 'performance_team' }
        ]
      },
      {
        id: 'performance_analysis',
        name: '业绩分析',
        code: 'performance:analysis',
        type: 'page',
        parentId: 'performance',
        children: [
          { id: 'performance_analysis_view', name: '查看业绩分析', code: 'performance:analysis:view', type: 'action', parentId: 'performance_analysis' }
        ]
      },
      {
        id: 'performance_share',
        name: '业绩分享',
        code: 'performance:share',
        type: 'page',
        parentId: 'performance',
        children: [
          { id: 'performance_share_view', name: '查看分享', code: 'performance:share:view', type: 'action', parentId: 'performance_share' },
          { id: 'performance_share_create', name: '创建分享', code: 'performance:share:create', type: 'action', parentId: 'performance_share' }
        ]
      }
    ]
  },
  {
    id: 'logistics',
    name: '物流管理',
    code: 'logistics',
    type: 'menu',
    icon: 'Van',
    sort: 6,
    children: [
      {
        id: 'logistics_shipping',
        name: '发货列表',
        code: 'logistics:shipping',
        type: 'page',
        parentId: 'logistics',
        children: [
          { id: 'logistics_shipping_view', name: '查看发货', code: 'logistics:shipping:view', type: 'action', parentId: 'logistics_shipping' },
          { id: 'logistics_shipping_edit', name: '编辑发货', code: 'logistics:shipping:edit', type: 'action', parentId: 'logistics_shipping' },
          { id: 'logistics_shipping_send', name: '确认发货', code: 'logistics:shipping:send', type: 'action', parentId: 'logistics_shipping' }
        ]
      },
      {
        id: 'logistics_list',
        name: '物流列表',
        code: 'logistics:list',
        type: 'page',
        parentId: 'logistics',
        children: [
          { id: 'logistics_list_view', name: '查看物流', code: 'logistics:list:view', type: 'action', parentId: 'logistics_list' }
        ]
      },
      {
        id: 'logistics_status_update',
        name: '状态更新',
        code: 'logistics:status_update',
        type: 'page',
        parentId: 'logistics',
        children: [
          { id: 'logistics_status_update_edit', name: '更新状态', code: 'logistics:status_update:edit', type: 'action', parentId: 'logistics_status_update' }
        ]
      },
      {
        id: 'logistics_track',
        name: '物流跟踪',
        code: 'logistics:track',
        type: 'page',
        parentId: 'logistics',
        children: [
          { id: 'logistics_track_view', name: '查看跟踪', code: 'logistics:track:view', type: 'action', parentId: 'logistics_track' }
        ]
      },
      {
        id: 'logistics_companies',
        name: '物流公司',
        code: 'logistics:companies',
        type: 'page',
        parentId: 'logistics',
        children: [
          { id: 'logistics_companies_view', name: '查看公司', code: 'logistics:companies:view', type: 'action', parentId: 'logistics_companies' },
          { id: 'logistics_companies_manage', name: '管理公司', code: 'logistics:companies:manage', type: 'action', parentId: 'logistics_companies' }
        ]
      }
    ]
  },
  {
    id: 'service',
    name: '售后管理',
    code: 'service',
    type: 'menu',
    icon: 'CustomerService',
    sort: 7,
    children: [
      {
        id: 'service_list',
        name: '售后订单',
        code: 'service:list',
        type: 'page',
        parentId: 'service',
        children: [
          { id: 'service_list_view', name: '查看售后', code: 'service:list:view', type: 'action', parentId: 'service_list' },
          { id: 'service_list_edit', name: '处理售后', code: 'service:list:edit', type: 'action', parentId: 'service_list' },
          { id: 'service_list_close', name: '关闭售后', code: 'service:list:close', type: 'action', parentId: 'service_list' }
        ]
      },
      {
        id: 'service_add',
        name: '新建售后',
        code: 'service:add',
        type: 'page',
        parentId: 'service',
        children: [
          { id: 'service_add_create', name: '创建售后', code: 'service:add:create', type: 'action', parentId: 'service_add' }
        ]
      },
      {
        id: 'service_data',
        name: '售后数据',
        code: 'service:data',
        type: 'page',
        parentId: 'service',
        children: [
          { id: 'service_data_view', name: '查看数据', code: 'service:data:view', type: 'action', parentId: 'service_data' }
        ]
      }
    ]
  },
  {
    id: 'data',
    name: '资料管理',
    code: 'data',
    type: 'menu',
    icon: 'Files',
    sort: 8,
    children: [
      {
        id: 'data_list',
        name: '资料列表',
        code: 'data:list',
        type: 'page',
        parentId: 'data',
        children: [
          { id: 'data_list_view', name: '查看资料', code: 'data:list:view', type: 'action', parentId: 'data_list' },
          { id: 'data_list_assign', name: '分配资料', code: 'data:list:assign', type: 'action', parentId: 'data_list' },
          { id: 'data_list_transfer', name: '转移资料', code: 'data:list:transfer', type: 'action', parentId: 'data_list' }
        ]
      },
      {
        id: 'data_search',
        name: '客户查询',
        code: 'data:search',
        type: 'page',
        parentId: 'data',
        children: [
          { id: 'data_search_view', name: '查询客户', code: 'data:search:view', type: 'action', parentId: 'data_search' }
        ]
      },
      {
        id: 'data_recycle',
        name: '回收站',
        code: 'data:recycle',
        type: 'page',
        parentId: 'data',
        children: [
          { id: 'data_recycle_view', name: '查看回收站', code: 'data:recycle:view', type: 'action', parentId: 'data_recycle' },
          { id: 'data_recycle_restore', name: '恢复数据', code: 'data:recycle:restore', type: 'action', parentId: 'data_recycle' },
          { id: 'data_recycle_delete', name: '永久删除', code: 'data:recycle:delete', type: 'action', parentId: 'data_recycle' }
        ]
      }
    ]
  },
  {
    id: 'product',
    name: '商品管理',
    code: 'product',
    type: 'menu',
    icon: 'Box',
    sort: 9,
    children: [
      {
        id: 'product_list',
        name: '商品列表',
        code: 'product:list',
        type: 'page',
        parentId: 'product',
        children: [
          { id: 'product_list_view', name: '查看商品', code: 'product:list:view', type: 'action', parentId: 'product_list' },
          { id: 'product_list_edit', name: '编辑商品', code: 'product:list:edit', type: 'action', parentId: 'product_list' }
        ]
      },
      {
        id: 'product_add',
        name: '新增商品',
        code: 'product:add',
        type: 'page',
        parentId: 'product',
        children: [
          { id: 'product_add_create', name: '创建商品', code: 'product:add:create', type: 'action', parentId: 'product_add' }
        ]
      },
      {
        id: 'product_category',
        name: '商品分类',
        code: 'product:category',
        type: 'page',
        parentId: 'product',
        children: [
          { id: 'product_category_view', name: '查看分类', code: 'product:category:view', type: 'action', parentId: 'product_category' },
          { id: 'product_category_manage', name: '管理分类', code: 'product:category:manage', type: 'action', parentId: 'product_category' }
        ]
      },
      {
        id: 'product_inventory',
        name: '库存管理',
        code: 'product:inventory',
        type: 'page',
        parentId: 'product',
        children: [
          { id: 'product_inventory_view', name: '查看库存', code: 'product:inventory:view', type: 'action', parentId: 'product_inventory' },
          { id: 'product_inventory_manage', name: '管理库存', code: 'product:inventory:manage', type: 'action', parentId: 'product_inventory' }
        ]
      },
      {
        id: 'product_analytics',
        name: '商品分析',
        code: 'product:analytics',
        type: 'page',
        parentId: 'product',
        children: [
          { id: 'product_analytics_view', name: '查看分析', code: 'product:analytics:view', type: 'action', parentId: 'product_analytics' }
        ]
      }
    ]
  },
  {
    id: 'system',
    name: '系统管理',
    code: 'system',
    type: 'menu',
    icon: 'Setting',
    sort: 10,
    children: [
      {
        id: 'system_departments',
        name: '部门管理',
        code: 'system:departments',
        type: 'page',
        parentId: 'system',
        children: [
          { id: 'system_departments_view', name: '查看部门', code: 'system:departments:view', type: 'action', parentId: 'system_departments' },
          { id: 'system_departments_manage', name: '管理部门', code: 'system:departments:manage', type: 'action', parentId: 'system_departments' }
        ]
      },
      {
        id: 'system_users',
        name: '用户管理',
        code: 'system:users',
        type: 'page',
        parentId: 'system',
        children: [
          { id: 'system_users_view', name: '查看用户', code: 'system:users:view', type: 'action', parentId: 'system_users' },
          { id: 'system_users_create', name: '创建用户', code: 'system:users:create', type: 'action', parentId: 'system_users' },
          { id: 'system_users_edit', name: '编辑用户', code: 'system:users:edit', type: 'action', parentId: 'system_users' },
          { id: 'system_users_delete', name: '删除用户', code: 'system:users:delete', type: 'action', parentId: 'system_users' }
        ]
      },
      {
        id: 'system_roles',
        name: '角色权限',
        code: 'system:roles',
        type: 'page',
        parentId: 'system',
        children: [
          { id: 'system_roles_view', name: '查看角色', code: 'system:roles:view', type: 'action', parentId: 'system_roles' },
          { id: 'system_roles_create', name: '创建角色', code: 'system:roles:create', type: 'action', parentId: 'system_roles' },
          { id: 'system_roles_edit', name: '编辑角色', code: 'system:roles:edit', type: 'action', parentId: 'system_roles' },
          { id: 'system_roles_delete', name: '删除角色', code: 'system:roles:delete', type: 'action', parentId: 'system_roles' },
          { id: 'system_roles_permission', name: '权限设置', code: 'system:roles:permission', type: 'action', parentId: 'system_roles' }
        ]
      },
      {
        id: 'system_permissions',
        name: '权限管理',
        code: 'system:permissions',
        type: 'page',
        parentId: 'system',
        children: [
          { id: 'system_permissions_view', name: '查看权限', code: 'system:permissions:view', type: 'action', parentId: 'system_permissions' },
          { id: 'system_permissions_manage', name: '管理权限', code: 'system:permissions:manage', type: 'action', parentId: 'system_permissions' }
        ]
      },
      {
        id: 'system_message',
        name: '消息管理',
        code: 'system:message',
        type: 'page',
        parentId: 'system',
        children: [
          { id: 'system_message_view', name: '查看消息', code: 'system:message:view', type: 'action', parentId: 'system_message' },
          { id: 'system_message_send', name: '发送消息', code: 'system:message:send', type: 'action', parentId: 'system_message' }
        ]
      },
      {
        id: 'system_settings',
        name: '系统设置',
        code: 'system:settings',
        type: 'page',
        parentId: 'system',
        children: [
          { id: 'system_settings_view', name: '查看设置', code: 'system:settings:view', type: 'action', parentId: 'system_settings' },
          { id: 'system_settings_edit', name: '修改设置', code: 'system:settings:edit', type: 'action', parentId: 'system_settings' }
        ]
      }
    ]
  }
]

// 权限模板定义
export const PERMISSION_TEMPLATES = {
  basic: {
    name: '基础权限',
    description: '基本的查看和操作权限',
    permissions: [
      'dashboard:view',
      'customer:list:view',
      'order:list:view',
      'performance:personal:view'
    ]
  },
  advanced: {
    name: '高级权限',
    description: '包含编辑和管理权限',
    permissions: [
      'dashboard:view',
      'customer:list:view',
      'customer:list:edit',
      'customer:list:create',
      'order:list:view',
      'order:list:edit',
      'order:add:create',
      'performance:personal:view',
      'performance:team:view'
    ]
  },
  manager: {
    name: '经理权限',
    description: '部门经理级别权限',
    permissions: [
      'dashboard:view',
      'customer:list:view',
      'customer:list:edit',
      'customer:list:create',
      'customer:list:assign',
      'order:list:view',
      'order:list:edit',
      'order:add:create',
      'order:audit:view',
      'order:audit:approve',
      'performance:personal:view',
      'performance:team:view',
      'performance:analysis:view',
      'product:add:create',
      'product:inventory:manage'
    ]
  },
  admin: {
    name: '管理员权限',
    description: '系统管理员权限',
    permissions: [
      'dashboard:view',
      'customer',
      'order',
      'service_management',
      'performance',
      'logistics',
      'service',
      'data',
      'product',
      'system:departments',
      'system:users',
      'system:roles',
      'system:message',
      'system:settings'
    ]
  }
}