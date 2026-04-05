/**
 * 权限树降级数据 - 从 Role.vue 中提取
 * 当 permissionService.getAllPermissions() 失败时使用此降级数据
 */

// 权限树降级数据（用于 loadPermissionTree 失败时）
export const FALLBACK_PERMISSION_TREE = [
  {
    id: 'dashboard', name: '数据看板', icon: 'DataBoard', type: 'menu',
    children: [
      { id: 'dashboard.personal', name: '个人看板', icon: 'User', type: 'menu', children: [{ id: 'dashboard.personal.view', name: '查看个人数据', type: 'action' }] },
      { id: 'dashboard.department', name: '部门看板', icon: 'OfficeBuilding', type: 'menu', children: [{ id: 'dashboard.department.view', name: '查看部门数据', type: 'action' }] },
      { id: 'dashboard.company', name: '公司看板', icon: 'TrendCharts', type: 'menu', children: [{ id: 'dashboard.company.view', name: '查看公司数据', type: 'action' }] }
    ]
  },
  {
    id: 'system', name: '系统管理', icon: 'Setting', type: 'menu',
    children: [
      { id: 'system.department', name: '部门管理', icon: 'OfficeBuilding', type: 'menu', children: [
        { id: 'system.department.view', name: '查看部门', type: 'action' },
        { id: 'system.department.create', name: '新增部门', type: 'action' },
        { id: 'system.department.edit', name: '编辑部门', type: 'action' },
        { id: 'system.department.delete', name: '删除部门', type: 'action' },
        { id: 'system.department.manage', name: '管理部门', type: 'action' }
      ]},
      { id: 'system.user', name: '用户管理', icon: 'User', type: 'menu', children: [
        { id: 'system.user.view', name: '查看用户', type: 'action' },
        { id: 'system.user.create', name: '新增用户', type: 'action' },
        { id: 'system.user.edit', name: '编辑用户', type: 'action' },
        { id: 'system.user.delete', name: '删除用户', type: 'action' },
        { id: 'system.user.resetPassword', name: '重置密码', type: 'action' },
        { id: 'system.user.setPermissions', name: '权限设置', type: 'action' },
        { id: 'system.user.viewLogs', name: '操作日志', type: 'action' }
      ]},
      { id: 'system.role', name: '角色权限', icon: 'UserFilled', type: 'menu', children: [
        { id: 'system.role.view', name: '查看角色', type: 'action' },
        { id: 'system.role.create', name: '新增角色', type: 'action' },
        { id: 'system.role.edit', name: '编辑角色', type: 'action' },
        { id: 'system.role.delete', name: '删除角色', type: 'action' },
        { id: 'system.role.setPermissions', name: '设置权限', type: 'action' }
      ]},
      { id: 'system.permission', name: '权限管理', icon: 'Lock', type: 'menu', children: [
        { id: 'system.permission.view', name: '查看权限', type: 'action' },
        { id: 'system.permission.manage', name: '权限管理', type: 'action' },
        { id: 'system.permission.roleManage', name: '角色管理', type: 'action' },
        { id: 'system.permission.sensitivePermission', name: '敏感权限', type: 'action' },
        { id: 'system.permission.customerServiceManage', name: '客服管理', type: 'action' }
      ]},
      { id: 'system.superAdmin', name: '超管面板', icon: 'Crown', type: 'menu', children: [
        { id: 'system.superAdmin.view', name: '查看面板', type: 'action' },
        { id: 'system.superAdmin.editPermissions', name: '编辑权限', type: 'action' },
        { id: 'system.superAdmin.viewDetails', name: '查看详情', type: 'action' },
        { id: 'system.superAdmin.resetPassword', name: '重置密码', type: 'action' },
        { id: 'system.superAdmin.memberManage', name: '成员管理', type: 'action' },
        { id: 'system.superAdmin.permissionDetails', name: '权限详情', type: 'action' }
      ]},
      { id: 'system.customerService', name: '客服管理', icon: 'Headset', type: 'menu', children: [
        { id: 'system.customerService.view', name: '查看客服', type: 'action' },
        { id: 'system.customerService.manage', name: '管理客服', type: 'action' },
        { id: 'system.customerService.setPermissions', name: '设置权限', type: 'action' },
        { id: 'system.customerService.enableAll', name: '全部启用', type: 'action' },
        { id: 'system.customerService.disableAll', name: '全部禁用', type: 'action' }
      ]},
      { id: 'system.message', name: '消息管理', icon: 'ChatDotSquare', type: 'menu', children: [
        { id: 'system.message.view', name: '查看消息', type: 'action' },
        { id: 'system.message.send', name: '发送消息', type: 'action' },
        { id: 'system.message.delete', name: '删除消息', type: 'action' },
        { id: 'system.message.manage', name: '消息管理', type: 'action' }
      ]},
      { id: 'system.settings', name: '系统设置', icon: 'Tools', type: 'menu', children: [
        { id: 'system.settings.view', name: '查看设置', type: 'action' },
        { id: 'system.settings.edit', name: '编辑设置', type: 'action' },
        { id: 'system.settings.backup', name: '数据备份', type: 'action' },
        { id: 'system.settings.restore', name: '数据恢复', type: 'action' }
      ]}
    ]
  },
  {
    id: 'customer', name: '客户管理', icon: 'Avatar', type: 'menu',
    children: [
      { id: 'customer.list', name: '客户列表', icon: 'List', type: 'menu', children: [
        { id: 'customer.list.view', name: '查看客户', type: 'action' },
        { id: 'customer.list.export', name: '导出客户', type: 'action' },
        { id: 'customer.list.import', name: '导入客户', type: 'action' },
        { id: 'customer.list.edit', name: '编辑客户', type: 'action' },
        { id: 'customer.list.delete', name: '删除客户', type: 'action' },
        { id: 'customer.list.assign', name: '分配客户', type: 'action' },
        { id: 'customer.list.batchOperation', name: '批量操作', type: 'action' }
      ]},
      { id: 'customer.add', name: '新增客户', icon: 'Plus', type: 'menu', children: [{ id: 'customer.add.create', name: '创建客户', type: 'action' }] },
      { id: 'customer.tags', name: '客户标签', icon: 'PriceTag', type: 'menu', children: [
        { id: 'customer.tags.view', name: '查看标签', type: 'action' },
        { id: 'customer.tags.create', name: '新增标签', type: 'action' },
        { id: 'customer.tags.edit', name: '编辑标签', type: 'action' },
        { id: 'customer.tags.delete', name: '删除标签', type: 'action' },
        { id: 'customer.tags.assign', name: '分配标签', type: 'action' }
      ]},
      { id: 'customer.groups', name: '客户分组', icon: 'Collection', type: 'menu', children: [
        { id: 'customer.groups.view', name: '查看分组', type: 'action' },
        { id: 'customer.groups.create', name: '新增分组', type: 'action' },
        { id: 'customer.groups.edit', name: '编辑分组', type: 'action' },
        { id: 'customer.groups.delete', name: '删除分组', type: 'action' },
        { id: 'customer.groups.manage', name: '管理分组', type: 'action' }
      ]}
    ]
  },
  {
    id: 'order', name: '订单管理', icon: 'Document', type: 'menu',
    children: [
      { id: 'order.list', name: '订单列表', icon: 'List', type: 'menu', children: [
        { id: 'order.list.view', name: '查看订单', type: 'action' },
        { id: 'order.list.export', name: '导出订单', type: 'action' },
        { id: 'order.list.edit', name: '编辑订单', type: 'action' },
        { id: 'order.list.delete', name: '删除订单', type: 'action' },
        { id: 'order.list.cancel', name: '取消订单', type: 'action' },
        { id: 'order.list.batchOperation', name: '批量操作', type: 'action' }
      ]},
      { id: 'order.add', name: '新增订单', icon: 'Plus', type: 'menu', children: [{ id: 'order.add.create', name: '创建订单', type: 'action' }] },
      { id: 'order.audit', name: '订单审核', icon: 'DocumentChecked', type: 'menu', children: [
        { id: 'order.audit.view', name: '查看审核', type: 'action' },
        { id: 'order.audit.approve', name: '通过审核', type: 'action' },
        { id: 'order.audit.reject', name: '拒绝审核', type: 'action' },
        { id: 'order.audit.revoke', name: '撤销审核', type: 'action' },
        { id: 'order.audit.batchAudit', name: '批量审核', type: 'action' }
      ]}
    ]
  },
  {
    id: 'service', name: '服务管理', icon: 'Headset', type: 'menu',
    children: [
      { id: 'service.ticket', name: '工单管理', icon: 'Tickets', type: 'menu', children: [
        { id: 'service.ticket.view', name: '查看工单', type: 'action' },
        { id: 'service.ticket.create', name: '创建工单', type: 'action' },
        { id: 'service.ticket.edit', name: '编辑工单', type: 'action' },
        { id: 'service.ticket.delete', name: '删除工单', type: 'action' },
        { id: 'service.ticket.assign', name: '分配工单', type: 'action' },
        { id: 'service.ticket.close', name: '关闭工单', type: 'action' },
        { id: 'service.ticket.export', name: '导出工单', type: 'action' }
      ]},
      { id: 'service.call', name: '通话管理', icon: 'Phone', type: 'menu', children: [
        { id: 'service.call.view', name: '查看通话记录', type: 'action' },
        { id: 'service.call.make', name: '发起通话', type: 'action' },
        { id: 'service.call.record', name: '录音管理', type: 'action' },
        { id: 'service.call.statistics', name: '通话统计', type: 'action' }
      ]},
      { id: 'service.sms', name: '短信管理', icon: 'Message', type: 'menu', children: [
        { id: 'service.sms.view', name: '查看短信记录', type: 'action' },
        { id: 'service.sms.send', name: '发送短信', type: 'action' },
        { id: 'service.sms.template', name: '模板管理', type: 'action' },
        { id: 'service.sms.batch', name: '批量发送', type: 'action' },
        { id: 'service.sms.statistics', name: '短信统计', type: 'action' }
      ]}
    ]
  },
  {
    id: 'performance', name: '业绩统计', icon: 'TrendCharts', type: 'menu',
    children: [
      { id: 'performance.personal', name: '个人业绩', icon: 'User', type: 'menu', children: [
        { id: 'performance.personal.view', name: '查看个人业绩', type: 'action' },
        { id: 'performance.personal.export', name: '导出个人数据', type: 'action' }
      ]},
      { id: 'performance.team', name: '团队业绩', icon: 'UserFilled', type: 'menu', children: [
        { id: 'performance.team.view', name: '查看团队业绩', type: 'action' },
        { id: 'performance.team.export', name: '导出团队数据', type: 'action' },
        { id: 'performance.team.compare', name: '业绩对比', type: 'action' }
      ]},
      { id: 'performance.share', name: '业绩分享', icon: 'Share', type: 'menu', children: [
        { id: 'performance.share.view', name: '查看分享', type: 'action' },
        { id: 'performance.share.create', name: '创建分享', type: 'action' },
        { id: 'performance.share.manage', name: '管理分享', type: 'action' }
      ]}
    ]
  },
  {
    id: 'logistics', name: '物流管理', icon: 'Van', type: 'menu',
    children: [
      { id: 'logistics.list', name: '物流列表', icon: 'List', type: 'menu', children: [
        { id: 'logistics.list.view', name: '查看物流列表', type: 'action' },
        { id: 'logistics.list.export', name: '导出物流数据', type: 'action' }
      ]},
      { id: 'logistics.companies', name: '物流公司', icon: 'OfficeBuilding', type: 'menu', children: [
        { id: 'logistics.companies.view', name: '查看物流公司', type: 'action' },
        { id: 'logistics.companies.create', name: '添加物流公司', type: 'action' },
        { id: 'logistics.companies.edit', name: '编辑物流公司', type: 'action' },
        { id: 'logistics.companies.delete', name: '删除物流公司', type: 'action' }
      ]},
      { id: 'logistics.shipping', name: '发货列表', icon: 'Box', type: 'menu', children: [
        { id: 'logistics.shipping.view', name: '查看发货列表', type: 'action' },
        { id: 'logistics.shipping.create', name: '创建发货单', type: 'action' },
        { id: 'logistics.shipping.edit', name: '编辑发货单', type: 'action' },
        { id: 'logistics.shipping.batchExport', name: '批量导出', type: 'action' }
      ]}
    ]
  },
  {
    id: 'afterSales', name: '售后管理', icon: 'Tools', type: 'menu',
    children: [
      { id: 'afterSales.list', name: '售后订单', icon: 'List', type: 'menu', children: [
        { id: 'afterSales.list.view', name: '查看售后订单', type: 'action' },
        { id: 'afterSales.list.export', name: '导出售后数据', type: 'action' }
      ]},
      { id: 'afterSales.add', name: '新建售后', icon: 'Plus', type: 'menu', children: [
        { id: 'afterSales.add.create', name: '创建售后单', type: 'action' },
        { id: 'afterSales.add.batch', name: '批量创建', type: 'action' }
      ]},
      { id: 'afterSales.detail', name: '售后详情', icon: 'View', type: 'menu', children: [
        { id: 'afterSales.detail.view', name: '查看售后详情', type: 'action' },
        { id: 'afterSales.detail.edit', name: '编辑售后单', type: 'action' },
        { id: 'afterSales.detail.process', name: '处理售后', type: 'action' }
      ]}
    ]
  },
  {
    id: 'data', name: '资料管理', icon: 'FolderOpened', type: 'menu',
    children: [
      { id: 'data.list', name: '资料列表', icon: 'List', type: 'menu', children: [
        { id: 'data.list.view', name: '查看资料列表', type: 'action' },
        { id: 'data.list.export', name: '导出资料', type: 'action' },
        { id: 'data.list.import', name: '导入资料', type: 'action' },
        { id: 'data.list.assign', name: '分配资料', type: 'action' }
      ]},
      { id: 'data.search', name: '客户查询', icon: 'Search', type: 'menu', children: [
        { id: 'data.search.basic', name: '基础查询', type: 'action' },
        { id: 'data.search.advanced', name: '高级查询', type: 'action' },
        { id: 'data.search.export', name: '导出查询结果', type: 'action' }
      ]},
      { id: 'data.recycle', name: '回收站', icon: 'Delete', type: 'menu', children: [
        { id: 'data.recycle.view', name: '查看回收站', type: 'action' },
        { id: 'data.recycle.restore', name: '恢复数据', type: 'action' },
        { id: 'data.recycle.delete', name: '彻底删除', type: 'action' }
      ]}
    ]
  },
  {
    id: 'product', name: '商品管理', icon: 'Goods', type: 'menu',
    children: [
      { id: 'product.list', name: '商品列表', icon: 'List', type: 'menu', children: [
        { id: 'product.list.view', name: '查看商品', type: 'action' },
        { id: 'product.list.export', name: '导出商品', type: 'action' },
        { id: 'product.list.edit', name: '编辑商品', type: 'action' },
        { id: 'product.list.delete', name: '删除商品', type: 'action' }
      ]},
      { id: 'product.add', name: '新增商品', icon: 'Plus', type: 'menu', children: [{ id: 'product.add.create', name: '创建商品', type: 'action' }] },
      { id: 'product.category', name: '商品分类', icon: 'Collection', type: 'menu', children: [
        { id: 'product.category.view', name: '查看分类', type: 'action' },
        { id: 'product.category.create', name: '新增分类', type: 'action' },
        { id: 'product.category.edit', name: '编辑分类', type: 'action' },
        { id: 'product.category.delete', name: '删除分类', type: 'action' }
      ]}
    ]
  }
]

// 所有权限降级数据（用于 loadAllPermissions 失败时）
export const FALLBACK_ALL_PERMISSIONS = [
  {
    id: 'system', name: '系统管理', code: 'system', type: 'menu', path: '/system', icon: 'Setting', sort: 1, status: 'active',
    children: [
      { id: 'system.user', name: '用户管理', code: 'system.user', type: 'menu', path: '/system/user', icon: 'User', sort: 1, status: 'active', children: [
        { id: 'system.user.view', name: '查看用户', code: 'system.user.view', type: 'action', sort: 1, status: 'active' },
        { id: 'system.user.create', name: '创建用户', code: 'system.user.create', type: 'action', sort: 2, status: 'active' },
        { id: 'system.user.edit', name: '编辑用户', code: 'system.user.edit', type: 'action', sort: 3, status: 'active' },
        { id: 'system.user.delete', name: '删除用户', code: 'system.user.delete', type: 'action', sort: 4, status: 'active' }
      ]},
      { id: 'system.role', name: '角色管理', code: 'system.role', type: 'menu', path: '/system/role', icon: 'UserFilled', sort: 2, status: 'active', children: [
        { id: 'system.role.view', name: '查看角色', code: 'system.role.view', type: 'action', sort: 1, status: 'active' },
        { id: 'system.role.create', name: '创建角色', code: 'system.role.create', type: 'action', sort: 2, status: 'active' },
        { id: 'system.role.edit', name: '编辑角色', code: 'system.role.edit', type: 'action', sort: 3, status: 'active' },
        { id: 'system.role.delete', name: '删除角色', code: 'system.role.delete', type: 'action', sort: 4, status: 'active' }
      ]},
      { id: 'system.permission', name: '权限管理', code: 'system.permission', type: 'menu', path: '/system/permission', icon: 'Lock', sort: 3, status: 'active', children: [
        { id: 'system.permission.view', name: '查看权限', code: 'system.permission.view', type: 'action', sort: 1, status: 'active' },
        { id: 'system.permission.assign', name: '分配权限', code: 'system.permission.assign', type: 'action', sort: 2, status: 'active' }
      ]}
    ]
  },
  {
    id: 'customer', name: '客户管理', code: 'customer', type: 'menu', path: '/customer', icon: 'Avatar', sort: 2, status: 'active',
    children: [
      { id: 'customer.list', name: '客户列表', code: 'customer.list', type: 'menu', path: '/customer/list', icon: 'List', sort: 1, status: 'active', children: [
        { id: 'customer.list.view', name: '查看客户列表', code: 'customer.list.view', type: 'action', sort: 1, status: 'active' },
        { id: 'customer.list.export', name: '导出客户数据', code: 'customer.list.export', type: 'action', sort: 2, status: 'active' }
      ]}
    ]
  },
  {
    id: 'order', name: '订单管理', code: 'order', type: 'menu', path: '/order', icon: 'Document', sort: 3, status: 'active',
    children: [
      { id: 'order.list', name: '订单列表', code: 'order.list', type: 'menu', path: '/order/list', icon: 'List', sort: 1, status: 'active', children: [
        { id: 'order.list.view', name: '查看订单列表', code: 'order.list.view', type: 'action', sort: 1, status: 'active' },
        { id: 'order.list.export', name: '导出订单数据', code: 'order.list.export', type: 'action', sort: 2, status: 'active' }
      ]}
    ]
  }
]

