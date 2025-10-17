import type { Component } from 'vue'

export interface MenuItem {
  id: string
  title: string
  icon?: Component | string
  path?: string
  children?: MenuItem[]
  roles?: string[] // 允许访问的角色
  permissions?: string[] // 需要的权限
  requireAll?: boolean // 是否需要所有权限（默认false，只需要其中一个）
  hidden?: boolean // 是否隐藏
  dataScope?: 'all' | 'department' | 'self' // 数据范围：全部、本部门、个人
}

/**
 * 菜单配置
 * 基于角色和权限的菜单显示控制
 */
export const menuConfig: MenuItem[] = [
  {
    id: 'dashboard',
    title: '数据看板',
    icon: 'Odometer',
    path: '/dashboard',
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
    permissions: ['dashboard'],
    dataScope: 'all' // 超级管理员看全部，部门管理员看本部门，销售员看个人
  },
  {
    id: 'customer',
    title: '客户管理',
    icon: 'User',
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
    permissions: ['customer'],
    children: [
      {
        id: 'customer-list',
        title: '客户列表',
        path: '/customer/list',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['customer:list'],
        dataScope: 'department' // 部门管理员看本部门，销售员看个人
      },
      {
        id: 'customer-add',
        title: '新增客户',
        path: '/customer/add',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['customer:add']
      },
      {
        id: 'customer-groups',
        title: '客户分组',
        path: '/customer/groups',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['customer:groups']
      },
      {
        id: 'customer-tags',
        title: '客户标签',
        path: '/customer/tags',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['customer:tags']
      }
    ]
  },
  {
    id: 'order',
    title: '订单管理',
    icon: 'ShoppingCart',
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
    permissions: ['order'],
    children: [
      {
        id: 'order-list',
        title: '订单列表',
        path: '/order/list',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['order:list'],
        dataScope: 'department' // 部门管理员看本部门，销售员看个人
      },
      {
        id: 'order-add',
        title: '新增订单',
        path: '/order/add',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['order:add']
      },
      {
        id: 'order-audit',
        title: '订单审核',
        path: '/order/audit',
        roles: ['super_admin', 'admin', 'department_manager'], // 如果有独立审核员就不给部门管理员
        permissions: ['order:audit']
      }
    ]
  },
  {
    id: 'service-management',
    title: '服务管理',
    icon: 'IconCustomerService',
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
    permissions: ['service'],
    children: [
      {
        id: 'service-call',
        title: '通话管理',
        path: '/service-management/call',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['service:call']
      },
      {
        id: 'service-sms',
        title: '短信管理',
        path: '/service-management/sms',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['service:sms']
      }
    ]
  },
  {
    id: 'performance',
    title: '业绩统计',
    icon: 'TrendCharts',
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
    permissions: ['performance'],
    children: [
      {
        id: 'performance-personal',
        title: '个人业绩',
        path: '/performance/personal',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['performance:personal'],
        dataScope: 'self'
      },
      {
        id: 'performance-team',
        title: '团队业绩',
        path: '/performance/team',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['performance:team'],
        dataScope: 'department' // 部门管理员看本部门，销售员看团队
      },
      {
        id: 'performance-analysis',
        title: '业绩分析',
        path: '/performance/analysis',
        roles: ['super_admin', 'admin', 'department_manager'],
        permissions: ['performance:analysis'],
        dataScope: 'department' // 部门管理员看本部门数据分析
      },
      {
        id: 'performance-share',
        title: '业绩分享',
        path: '/performance/share',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['performance:share']
      }
    ]
  },
  {
    id: 'logistics',
    title: '物流管理',
    icon: 'Van',
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
    permissions: ['logistics'],
    children: [
      {
        id: 'logistics-shipping',
        title: '发货列表',
        path: '/logistics/shipping',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['logistics:shipping']
      },
      {
        id: 'logistics-list',
        title: '物流列表',
        path: '/logistics/list',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['logistics:list']
      },
      {
        id: 'logistics-track',
        title: '物流跟踪',
        path: '/logistics/track',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['logistics:tracking']
      },
      {
        id: 'logistics-status-update',
        title: '状态更新',
        path: '/logistics/status-update',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['logistics:status']
      },
      {
        id: 'logistics-companies',
        title: '物流公司',
        path: '/logistics/companies',
        roles: ['super_admin', 'admin', 'department_manager'],
        permissions: ['logistics:companies']
      }
    ]
  },
  {
    id: 'service',
    title: '售后管理',
    icon: 'IconHeadset',
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
    permissions: ['aftersale'],
    children: [
      {
        id: 'service-list',
        title: '售后订单',
        path: '/service/list',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['aftersale:order'],
        dataScope: 'department' // 部门管理员看本部门，销售员看个人
      },
      {
        id: 'service-add',
        title: '新建售后',
        path: '/service/add',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['aftersale:add']
      },
      {
        id: 'service-data',
        title: '售后数据',
        path: '/service/data',
        roles: ['super_admin', 'admin', 'department_manager'],
        permissions: ['aftersale:analysis'],
        dataScope: 'department' // 部门管理员看本部门售后数据
      }
    ]
  },
  {
    id: 'data',
    title: '资料管理',
    icon: 'Files',
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
    permissions: ['data'],
    children: [
      {
        id: 'data-list',
        title: '资料列表',
        path: '/data/list',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['data:list']
      },
      {
        id: 'data-search',
        title: '客户查询',
        path: '/data/search',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['data:customer']
      },
      {
        id: 'data-recycle',
        title: '回收站',
        path: '/data/recycle',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['data:recycle']
      }
    ]
  },
  {
    id: 'product',
    title: '商品管理',
    icon: 'Box',
    roles: ['super_admin', 'admin'],
    permissions: ['sales:product'],
    children: [
      {
        id: 'product-list',
        title: '商品列表',
        path: '/product/list',
        roles: ['super_admin', 'admin'],
        permissions: ['sales:product:view']
      },
      {
        id: 'product-add',
        title: '新增商品',
        path: '/product/add',
        roles: ['super_admin', 'admin'],
        permissions: ['sales:product:add']
      },
      {
        id: 'product-inventory',
        title: '库存管理',
        path: '/product/inventory',
        roles: ['super_admin', 'admin'],
        permissions: ['sales:product:edit']
      },
      {
        id: 'product-analytics',
        title: '商品分析',
        path: '/product/analytics',
        roles: ['super_admin', 'admin'],
        permissions: ['product:analytics']
      }
    ]
  },
  {
    id: 'system',
    title: '系统管理',
    icon: 'Setting',
    roles: ['super_admin', 'admin'],
    permissions: ['system'],
    children: [
      {
        id: 'system-departments',
        title: '部门管理',
        path: '/system/departments',
        roles: ['super_admin', 'admin'],
        permissions: ['system:department']
      },
      {
        id: 'system-users',
        title: '用户管理',
        path: '/system/users',
        roles: ['super_admin', 'admin'],
        permissions: ['system:user']
      },
      {
        id: 'system-roles',
        title: '角色权限',
        path: '/system/roles',
        roles: ['super_admin', 'admin'],
        permissions: ['system:role']
      },
      {
        id: 'system-permissions',
        title: '权限管理',
        path: '/system/permissions',
        roles: ['super_admin', 'admin'],
        permissions: ['system:permission']
      },
      {
        id: 'system-settings',
        title: '系统设置',
        path: '/system/settings',
        roles: ['super_admin', 'admin'],
        permissions: ['system:settings']
      },
      {
        id: 'system-super-admin-panel',
        title: '超管面板',
        path: '/system/super-admin-panel',
        roles: ['super_admin'],
        permissions: ['system:admin']
      },
      {
        id: 'system-customer-service-permissions',
        title: '客服管理',
        path: '/system/customer-service-permissions',
        roles: ['super_admin', 'admin'],
        permissions: ['customer_service:manage']
      }
    ]
  }
]

/**
 * 角色权限映射
 */
export const rolePermissions: Record<string, string[]> = {
  // 超级管理员：拥有全部权限，没有设限
  super_admin: ['*'], // 特殊标识，表示拥有所有权限

  // 管理员（部门负责人）
  admin: [
    // 数据看板（全部数据）
    'dashboard', 'dashboard:personal', 'dashboard:department', 'dashboard:all',

    // 客户管理（全部权限）
    'customer', 'customer:list', 'customer:view:personal', 'customer:view:department', 'customer:view:all',
    'customer:add', 'customer:edit', 'customer:delete', 'customer:import', 'customer:export',
    'customer:groups', 'customer:tags',

    // 订单管理（全部权限）
    'order', 'order:list', 'order:view:personal', 'order:view:department', 'order:view:all',
    'order:add', 'order:edit', 'order:delete', 'order:audit',

    // 服务管理（全部权限）
    'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit', 'service:call:delete',
    'service:sms',

    // 业绩统计（全部权限）
    'performance', 'performance:personal', 'performance:personal:view',
    'performance:team', 'performance:team:view', 'performance:analysis', 'performance:share',

    // 物流管理（全部权限）
    'logistics', 'logistics:list', 'logistics:view', 'logistics:add', 'logistics:edit', 'logistics:delete',
    'logistics:tracking', 'logistics:tracking:view', 'logistics:shipping', 'logistics:status', 'logistics:companies',

    // 售后管理（全部权限）
    'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:view:department', 'aftersale:view:all',
    'aftersale:add', 'aftersale:edit', 'aftersale:delete', 'aftersale:analysis',

    // 资料管理（全部权限）
    'data', 'data:customer', 'data:customer:search', 'data:import', 'data:export',
    'data:list', 'data:recycle',

    // 商品管理（全部权限）
    'sales:product', 'sales:product:view', 'sales:product:add', 'sales:product:edit',
    'product:analytics',

    // 系统管理（全部权限）
    'system', 'system:user', 'system:user:view', 'system:user:add', 'system:user:edit', 'system:user:delete', 'system:user:reset-password',
    'system:role', 'system:role:view', 'system:role:add', 'system:role:edit', 'system:role:delete', 'system:role:assign-permission',
    'system:department', 'system:department:view', 'system:department:add', 'system:department:edit', 'system:department:delete',
    'system:permission', 'system:permission:view', 'system:permission:edit',
    'system:settings', 'system:admin', 'customer_service:manage'
  ],

  // 部门管理员：管理本部门的业务
  department_manager: [
    // 数据看板（本部门数据）
    'dashboard', 'dashboard:personal', 'dashboard:department',

    // 客户管理（本部门权限）
    'customer', 'customer:list', 'customer:view:personal', 'customer:view:department',
    'customer:add', 'customer:edit', 'customer:import', 'customer:export',
    'customer:groups', 'customer:tags',

    // 订单管理（本部门权限）
    'order', 'order:list', 'order:view:personal', 'order:view:department',
    'order:add', 'order:edit', 'order:audit',

    // 服务管理
    'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',
    'service:sms',

    // 业绩统计
    'performance', 'performance:personal', 'performance:personal:view',
    'performance:team', 'performance:team:view', 'performance:analysis', 'performance:share',

    // 物流管理
    'logistics', 'logistics:list', 'logistics:view', 'logistics:add', 'logistics:edit',
    'logistics:tracking', 'logistics:tracking:view', 'logistics:shipping', 'logistics:status',

    // 售后管理（本部门权限）
    'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:view:department',
    'aftersale:add', 'aftersale:edit', 'aftersale:analysis',

    // 资料管理
    'data', 'data:customer', 'data:customer:search', 'data:list', 'data:recycle'
  ],

  // 销售员：只能管理自己的客户和订单
  sales_staff: [
    // 数据看板（仅限个人数据）
    'dashboard', 'dashboard:personal',

    // 客户管理和子菜单：客户列表（可查看本人的），新增客户
    'customer', 'customer:list', 'customer:view:personal', 'customer:add',
    'customer:groups', 'customer:tags',

    // 订单管理和子菜单订单列表，新增订单
    'order', 'order:list', 'order:view:personal', 'order:add',

    // 服务管理和子菜单通话管理
    'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',
    'service:sms',

    // 业绩统计和子菜单个人业绩，团队业绩
    'performance', 'performance:personal', 'performance:personal:view',
    'performance:team', 'performance:team:view', 'performance:share',

    // 物流管理和子菜单物流列表，物流跟踪
    'logistics', 'logistics:list', 'logistics:view',
    'logistics:tracking', 'logistics:tracking:view', 'logistics:shipping',

    // 售后管理和子菜单售后订单（本人的），新建售后
    'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:add',

    // 资料管理和子菜单客户查询
    'data', 'data:customer', 'data:customer:search', 'data:list'
  ],

  // 客服：基础权限，具体权限由超级管理员配置
  customer_service: [
    // 基础权限，具体权限由超级管理员配置
    'customer', 'customer:list', 'customer:view:personal',
    'service', 'service:call', 'service:call:view', 'service:call:add', 'service:sms',
    'data', 'data:customer', 'data:list'
  ]
}
