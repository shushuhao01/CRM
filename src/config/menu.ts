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
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
    permissions: ['dashboard'],
    dataScope: 'department' // 部门管理员看本部门数据，销售员看个人数据
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
        dataScope: 'self' // 销售员看个人客户，部门管理员看本部门
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
        roles: ['super_admin', 'admin'],
        permissions: ['customer:groups']
      },
      {
        id: 'customer-tags',
        title: '客户标签',
        path: '/customer/tags',
        roles: ['super_admin', 'admin'],
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
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['order:list'],
        dataScope: 'all' // 销售员看个人订单，部门管理员看本部门
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
        roles: ['super_admin', 'admin', 'customer_service'],
        permissions: ['order:audit'],
        dataScope: 'all' // 客服处理全公司订单审核
      },
      {
        id: 'order-my-cod-application',
        title: '取消代收申请',
        path: '/order/my-cod-application',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['order']
      },
      {
        id: 'order-cod-application-review',
        title: '取消代收审核',
        path: '/order/cod-application-review',
        roles: ['super_admin', 'admin'],
        permissions: ['finance:cod']
      }
    ]
  },
  {
    id: 'service-management',
    title: '服务管理',
    icon: 'Phone',
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
    permissions: ['service'],
    children: [
      {
        id: 'service-call',
        title: '通话管理',
        path: '/service-management/call',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['service:call'],
        dataScope: 'self' // 销售员看个人通话记录，部门管理员看本部门
      },
      {
        id: 'service-sms',
        title: '短信管理',
        path: '/service-management/sms',
        roles: ['super_admin', 'admin', 'customer_service'],
        permissions: ['service:sms'],
        dataScope: 'all' // 客服查看全公司短信记录
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
        dataScope: 'self' // 部门管理员看本部门
      },
      {
        id: 'performance-share',
        title: '业绩分享',
        path: '/performance/share',
        roles: ['super_admin', 'admin', 'department_manager'],
        permissions: ['performance:share']
      }
    ]
  },
  {
    id: 'logistics',
    title: '物流管理',
    icon: 'Van',
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
    permissions: ['logistics'],
    children: [
      {
        id: 'logistics-shipping',
        title: '发货列表',
        path: '/logistics/shipping',
        roles: ['super_admin', 'admin', 'customer_service'],
        permissions: ['logistics:shipping'],
        dataScope: 'all' // 客服处理全公司发货
      },
      {
        id: 'logistics-list',
        title: '物流列表',
        path: '/logistics/list',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['logistics:list'],
        dataScope: 'all' // 客服处理全公司物流
      },
      {
        id: 'logistics-track',
        title: '物流跟踪',
        path: '/logistics/track',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['logistics:tracking'],
        dataScope: 'all' // 客服处理全公司物流跟踪
      },
      {
        id: 'logistics-status-update',
        title: '状态更新',
        path: '/logistics/status-update',
        roles: ['super_admin', 'admin', 'customer_service'],
        permissions: ['logistics:status'],
        dataScope: 'all' // 客服处理全公司状态更新
      },
      {
        id: 'logistics-companies',
        title: '物流公司',
        path: '/logistics/companies',
        roles: ['super_admin', 'admin'],
        permissions: ['logistics:companies']
      }
    ]
  },
  {
    id: 'service',
    title: '售后管理',
    icon: 'Headset',
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
    permissions: ['aftersale'],
    children: [
      {
        id: 'service-list',
        title: '售后订单',
        path: '/service/list',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['aftersale:order'],
        dataScope: 'all' // 客服处理全公司售后订单
      },
      {
        id: 'service-add',
        title: '新建售后',
        path: '/service/add',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['aftersale:add']
      },
      {
        id: 'service-data',
        title: '售后数据',
        path: '/service/data',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['aftersale:analysis'],
        dataScope: 'all' // 客服处理全公司售后数据
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
        roles: ['super_admin', 'admin', 'department_manager', 'customer_service'],
        permissions: ['data:list'],
        dataScope: 'all' // 客服处理全公司资料
      },
      {
        id: 'data-search',
        title: '客户查询',
        path: '/data/search',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service'],
        permissions: ['data:customer'],
        dataScope: 'all' // 客服查询全公司客户
      },
      {
        id: 'data-recycle',
        title: '回收站',
        path: '/data/recycle',
        roles: ['super_admin', 'admin'],
        permissions: ['data:recycle']
      }
    ]
  },
  {
    id: 'finance',
    title: '财务管理',
    icon: 'Money',
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
    permissions: ['finance'],
    children: [
      {
        id: 'finance-performance-data',
        title: '绩效数据',
        path: '/finance/performance-data',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['finance:data'],
        dataScope: 'self' // 销售员看个人，经理看部门，管理员看全部
      },
      {
        id: 'finance-performance-manage',
        title: '绩效管理',
        path: '/finance/performance-manage',
        roles: ['super_admin', 'admin'],
        permissions: ['finance:manage']
      },
      {
        id: 'finance-cod-collection',
        title: '代收管理',
        path: '/finance/cod-collection',
        roles: ['super_admin', 'admin'],
        permissions: ['finance:cod']
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
        id: 'product-category',
        title: '商品分类',
        path: '/product/category',
        roles: ['super_admin', 'admin'],
        permissions: ['sales:product:view']
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
    id: 'wecom',
    title: '企微管理',
    icon: 'ChatLineSquare',
    hidden: true, // 🔥 暂停开发，临时隐藏企微管理模块
    roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
    permissions: ['wecom'],
    children: [
      {
        id: 'wecom-customer',
        title: '企业客户',
        path: '/wecom/customer',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['wecom:customer']
      },
      {
        id: 'wecom-binding',
        title: '企微联动',
        path: '/wecom/binding',
        roles: ['super_admin', 'admin'],
        permissions: ['wecom:binding']
      },
      {
        id: 'wecom-acquisition',
        title: '获客助手',
        path: '/wecom/acquisition',
        roles: ['super_admin', 'admin', 'department_manager'],
        permissions: ['wecom:acquisition']
      },
      {
        id: 'wecom-service',
        title: '微信客服',
        path: '/wecom/service',
        roles: ['super_admin', 'admin'],
        permissions: ['wecom:service']
      },
      {
        id: 'wecom-chat-archive',
        title: '会话存档',
        path: '/wecom/chat-archive',
        roles: ['super_admin', 'admin'],
        permissions: ['wecom:chat']
      },
      {
        id: 'wecom-payment',
        title: '对外收款',
        path: '/wecom/payment',
        roles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
        permissions: ['wecom:payment']
      },
      {
        id: 'wecom-config',
        title: '企微配置',
        path: '/wecom/config',
        roles: ['super_admin', 'admin'],
        permissions: ['wecom:config']
      },
      {
        id: 'wecom-sidebar',
        title: '侧边栏应用',
        path: '/wecom/sidebar',
        roles: ['super_admin', 'admin'],
        permissions: ['wecom:sidebar']
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
      },
      {
        id: 'system-message-management',
        title: '消息管理',
        path: '/system/message-management',
        roles: ['super_admin', 'admin'],
        permissions: ['system:message']
      },
      {
        id: 'system-settings',
        title: '系统设置',
        path: '/system/settings',
        roles: ['super_admin', 'admin'],
        permissions: ['system:settings']
      },
      {
        id: 'system-api-management',
        title: '接口管理',
        path: '/system/api-management',
        roles: ['super_admin', 'admin'],
        permissions: ['system:api']
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

    // 财务管理（全部权限）
    'finance', 'finance:data', 'finance:manage',

    // 商品管理（全部权限）
    'sales:product', 'sales:product:view', 'sales:product:add', 'sales:product:edit',
    'product:analytics',

    // 系统管理（全部权限）
    'system', 'system:user', 'system:user:view', 'system:user:add', 'system:user:edit', 'system:user:delete', 'system:user:reset-password',
    'system:role', 'system:role:view', 'system:role:add', 'system:role:edit', 'system:role:delete', 'system:role:assign-permission',
    'system:department', 'system:department:view', 'system:department:add', 'system:department:edit', 'system:department:delete',
    'system:permission', 'system:permission:view', 'system:permission:edit',
    'system:settings', 'system:admin', 'customer_service:manage',
    'system:message', 'system:message:view', 'system:message:subscription', 'system:message:announcement', 'system:message:config',

    // 企微管理（全部权限）
    'wecom', 'wecom:config', 'wecom:binding', 'wecom:customer', 'wecom:acquisition',
    'wecom:service', 'wecom:chat', 'wecom:payment', 'wecom:sidebar'
  ],

  // 部门管理员：管理本部门的业务
  department_manager: [
    // 数据看板权限
    'dashboard', 'dashboard:personal', 'dashboard:department',

    // 客户管理权限 - 一级菜单和二级菜单
    'customer', 'customer:list', 'customer:view:personal', 'customer:view:department',
    'customer:add', 'customer:edit', 'customer:import', 'customer:export',

    // 订单管理权限 - 一级菜单和二级菜单
    'order', 'order:list', 'order:view:personal', 'order:view:department',
    'order:add', 'order:edit',

    // 服务管理权限 - 一级菜单和二级菜单
    'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',

    // 业绩统计权限 - 一级菜单和二级菜单
    'performance', 'performance:personal', 'performance:personal:view',
    'performance:team', 'performance:team:view', 'performance:analysis', 'performance:share',

    // 物流管理权限 - 一级菜单和二级菜单
    'logistics', 'logistics:list', 'logistics:view', 'logistics:add', 'logistics:edit',
    'logistics:tracking', 'logistics:tracking:view',

    // 售后管理权限 - 一级菜单和二级菜单
    'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:view:department',
    'aftersale:add', 'aftersale:edit', 'aftersale:analysis',

    // 资料管理权限 - 一级菜单和二级菜单
    'data', 'data:customer', 'data:customer:search', 'data:list',

    // 财务管理权限 - 一级菜单和二级菜单
    'finance', 'finance:data'
  ],

  // 销售员：只能管理自己的客户和订单
  sales_staff: [
    // 数据看板
    'dashboard', 'dashboard:personal',

    // 客户管理（移除客户分组、客户标签）
    'customer', 'customer:list', 'customer:view:personal', 'customer:add',

    // 订单管理
    'order', 'order:list', 'order:view:personal', 'order:add',

    // 服务管理（移除短信管理）
    'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',

    // 业绩统计
    'performance', 'performance:personal', 'performance:personal:view',
    'performance:team', 'performance:team:view',

    // 物流管理（移除发货列表、状态更新）
    'logistics', 'logistics:list', 'logistics:view',
    'logistics:tracking', 'logistics:tracking:view',

    // 售后管理
    'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:add', 'aftersale:analysis',

    // 资料管理（移除回收站）
    'data', 'data:customer', 'data:customer:search',

    // 财务管理（只看个人绩效数据）
    'finance', 'finance:data'
  ],

  // 客服默认权限：根据客服类型动态配置
  customer_service: [
    // 订单审核权限（保留）
    'order:audit', 'order:audit:view',

    // 物流管理权限
    'logistics', 'logistics:list', 'logistics:list:view', 'logistics:shipping', 'logistics:shipping:view',
    'logistics:tracking', 'logistics:tracking:view', 'logistics:status_update',

    // 售后管理权限
    'aftersale', 'aftersale:order', 'aftersale:order:view', 'aftersale:add', 'aftersale:data',

    // 资料管理权限
    'data', 'data:customer', 'data:customer:search', 'data:list'
  ],

  // 售后客服专用权限
  customer_service_after_sales: [
    'dashboard', 'dashboard:view',
    'order', 'order:list', 'order:list:view',
    'aftersale', 'aftersale:order', 'aftersale:order:view', 'aftersale:order:edit',
    'aftersale:add', 'aftersale:data', 'aftersale:data:view',
    'service', 'service:afterSales:view', 'service:afterSales:edit',
    'data', 'data:customer', 'data:customer:search'
  ],

  // 审核客服专用权限
  customer_service_audit: [
    'dashboard', 'dashboard:view',
    'order', 'order:list', 'order:list:view', 'order:audit', 'order:audit:view',
    'order:audit:approve', 'order:audit:reject',
    'customer', 'customer:list', 'customer:list:view',
    'data', 'data:customer', 'data:customer:search'
  ],

  // 物流客服专用权限
  customer_service_logistics: [
    'dashboard', 'dashboard:view',
    'order', 'order:list', 'order:list:view',
    'logistics', 'logistics:list', 'logistics:list:view', 'logistics:shipping', 'logistics:shipping:view',
    'logistics:shipping:edit', 'logistics:tracking', 'logistics:tracking:view', 'logistics:tracking:edit',
    'logistics:status_update', 'logistics:status_update:edit',
    'data', 'data:customer', 'data:customer:search'
  ],

  // 商品客服专用权限
  customer_service_product: [
    'dashboard', 'dashboard:view',
    'customer', 'customer:list', 'customer:list:view',
    'order', 'order:list', 'order:list:view',
    'product', 'product:list', 'product:list:view',
    'data', 'data:customer', 'data:customer:search'
  ]
}
