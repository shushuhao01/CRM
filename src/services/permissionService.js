/**
 * 权限服务 - 统一管理系统权限数据
 * 确保用户权限设置与角色权限管理使用相同的权限树结构
 */

// 统一的权限树结构
const PERMISSION_TREE = [
  {
    id: 'system',
    name: '系统管理',
    code: 'system',
    type: 'menu',
    path: '/system',
    icon: 'Setting',
    sort: 1,
    status: 'active',
    children: [
      {
        id: 'system.user',
        name: '用户管理',
        code: 'system.user',
        type: 'menu',
        path: '/system/user',
        icon: 'User',
        sort: 1,
        status: 'active',
        children: [
          {
            id: 'system.user.view',
            name: '查看用户',
            code: 'system.user.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'system.user.create',
            name: '创建用户',
            code: 'system.user.create',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'system.user.edit',
            name: '编辑用户',
            code: 'system.user.edit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'system.user.delete',
            name: '删除用户',
            code: 'system.user.delete',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'system.user.permissions',
            name: '权限设置',
            code: 'system.user.permissions',
            type: 'action',
            sort: 5,
            status: 'active'
          },
          {
            id: 'system.user.reset_password',
            name: '重置密码',
            code: 'system.user.reset_password',
            type: 'action',
            sort: 6,
            status: 'active'
          }
        ]
      },
      {
        id: 'system.role',
        name: '角色管理',
        code: 'system.role',
        type: 'menu',
        path: '/system/role',
        icon: 'UserFilled',
        sort: 2,
        status: 'active',
        children: [
          {
            id: 'system.role.view',
            name: '查看角色',
            code: 'system.role.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'system.role.create',
            name: '创建角色',
            code: 'system.role.create',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'system.role.edit',
            name: '编辑角色',
            code: 'system.role.edit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'system.role.delete',
            name: '删除角色',
            code: 'system.role.delete',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'system.role.assign_permissions',
            name: '分配权限',
            code: 'system.role.assign_permissions',
            type: 'action',
            sort: 5,
            status: 'active'
          }
        ]
      },
      {
        id: 'system.department',
        name: '部门管理',
        code: 'system.department',
        type: 'menu',
        path: '/system/department',
        icon: 'OfficeBuilding',
        sort: 3,
        status: 'active',
        children: [
          {
            id: 'system.department.view',
            name: '查看部门',
            code: 'system.department.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'system.department.create',
            name: '创建部门',
            code: 'system.department.create',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'system.department.edit',
            name: '编辑部门',
            code: 'system.department.edit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'system.department.delete',
            name: '删除部门',
            code: 'system.department.delete',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'system.department.members',
            name: '管理成员',
            code: 'system.department.members',
            type: 'action',
            sort: 5,
            status: 'active'
          }
        ]
      },
      {
        id: 'system.permission',
        name: '权限管理',
        code: 'system.permission',
        type: 'menu',
        path: '/system/permission',
        icon: 'Lock',
        sort: 4,
        status: 'active',
        children: [
          {
            id: 'system.permission.view',
            name: '查看权限',
            code: 'system.permission.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'system.permission.assign',
            name: '分配权限',
            code: 'system.permission.assign',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'system.permission.sensitive',
            name: '敏感信息权限',
            code: 'system.permission.sensitive',
            type: 'action',
            sort: 3,
            status: 'active'
          }
        ]
      },
      {
        id: 'system.settings',
        name: '系统设置',
        code: 'system.settings',
        type: 'menu',
        path: '/system/settings',
        icon: 'Tools',
        sort: 5,
        status: 'active',
        children: [
          {
            id: 'system.settings.view',
            name: '查看设置',
            code: 'system.settings.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'system.settings.edit',
            name: '修改设置',
            code: 'system.settings.edit',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'system.settings.sms',
            name: '短信配置',
            code: 'system.settings.sms',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'system.settings.call',
            name: '通话配置',
            code: 'system.settings.call',
            type: 'action',
            sort: 4,
            status: 'active'
          }
        ]
      }
    ]
  },
  {
    id: 'customer',
    name: '客户管理',
    code: 'customer',
    type: 'menu',
    path: '/customer',
    icon: 'Avatar',
    sort: 2,
    status: 'active',
    children: [
      {
        id: 'customer.list',
        name: '客户列表',
        code: 'customer.list',
        type: 'menu',
        path: '/customer/list',
        icon: 'List',
        sort: 1,
        status: 'active',
        children: [
          {
            id: 'customer.list.view',
            name: '查看客户列表',
            code: 'customer.list.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'customer.list.export',
            name: '导出客户数据',
            code: 'customer.list.export',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'customer.list.import',
            name: '导入客户数据',
            code: 'customer.list.import',
            type: 'action',
            sort: 3,
            status: 'active'
          }
        ]
      },
      {
        id: 'customer.add',
        name: '新增客户',
        code: 'customer.add',
        type: 'menu',
        path: '/customer/add',
        icon: 'Plus',
        sort: 2,
        status: 'active',
        children: [
          {
            id: 'customer.add.create',
            name: '创建客户',
            code: 'customer.add.create',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'customer.add.batch',
            name: '批量新增',
            code: 'customer.add.batch',
            type: 'action',
            sort: 2,
            status: 'active'
          }
        ]
      },
      {
        id: 'customer.edit',
        name: '编辑客户',
        code: 'customer.edit',
        type: 'action',
        sort: 3,
        status: 'active'
      },
      {
        id: 'customer.delete',
        name: '删除客户',
        code: 'customer.delete',
        type: 'action',
        sort: 4,
        status: 'active'
      },
      {
        id: 'customer.follow',
        name: '客户跟进',
        code: 'customer.follow',
        type: 'action',
        sort: 5,
        status: 'active'
      },
      {
        id: 'customer.tags',
        name: '客户标签',
        code: 'customer.tags',
        type: 'menu',
        path: '/customer/tags',
        icon: 'PriceTag',
        sort: 6,
        status: 'active',
        children: [
          {
            id: 'customer.tags.view',
            name: '查看标签',
            code: 'customer.tags.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'customer.tags.create',
            name: '新增标签',
            code: 'customer.tags.create',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'customer.tags.edit',
            name: '编辑标签',
            code: 'customer.tags.edit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'customer.tags.delete',
            name: '删除标签',
            code: 'customer.tags.delete',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'customer.tags.assign',
            name: '分配标签',
            code: 'customer.tags.assign',
            type: 'action',
            sort: 5,
            status: 'active'
          }
        ]
      },
      {
        id: 'customer.groups',
        name: '客户分组',
        code: 'customer.groups',
        type: 'menu',
        path: '/customer/groups',
        icon: 'Collection',
        sort: 7,
        status: 'active',
        children: [
          {
            id: 'customer.groups.view',
            name: '查看分组',
            code: 'customer.groups.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'customer.groups.create',
            name: '新增分组',
            code: 'customer.groups.create',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'customer.groups.edit',
            name: '编辑分组',
            code: 'customer.groups.edit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'customer.groups.delete',
            name: '删除分组',
            code: 'customer.groups.delete',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'customer.groups.manage',
            name: '管理分组',
            code: 'customer.groups.manage',
            type: 'action',
            sort: 5,
            status: 'active'
          }
        ]
      }
    ]
  },
  {
    id: 'order',
    name: '订单管理',
    code: 'order',
    type: 'menu',
    path: '/order',
    icon: 'Document',
    sort: 3,
    status: 'active',
    children: [
      {
        id: 'order.list',
        name: '订单列表',
        code: 'order.list',
        type: 'menu',
        path: '/order/list',
        icon: 'List',
        sort: 1,
        status: 'active',
        children: [
          {
            id: 'order.list.view',
            name: '查看订单',
            code: 'order.list.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'order.list.export',
            name: '导出订单',
            code: 'order.list.export',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'order.list.edit',
            name: '编辑订单',
            code: 'order.list.edit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'order.list.delete',
            name: '删除订单',
            code: 'order.list.delete',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'order.list.cancel',
            name: '取消订单',
            code: 'order.list.cancel',
            type: 'action',
            sort: 5,
            status: 'active'
          },
          {
            id: 'order.list.batchOperation',
            name: '批量操作',
            code: 'order.list.batchOperation',
            type: 'action',
            sort: 6,
            status: 'active'
          }
        ]
      },
      {
        id: 'order.create',
        name: '创建订单',
        code: 'order.create',
        type: 'action',
        sort: 2,
        status: 'active'
      },
      {
        id: 'order.edit',
        name: '编辑订单',
        code: 'order.edit',
        type: 'action',
        sort: 3,
        status: 'active'
      },
      {
        id: 'order.delete',
        name: '删除订单',
        code: 'order.delete',
        type: 'action',
        sort: 4,
        status: 'active'
      },
      {
        id: 'order.status',
        name: '订单状态管理',
        code: 'order.status',
        type: 'action',
        sort: 5,
        status: 'active'
      },
      {
        id: 'order.audit',
        name: '订单审核',
        code: 'order.audit',
        type: 'menu',
        path: '/order/audit',
        icon: 'Check',
        sort: 6,
        status: 'active',
        children: [
          {
            id: 'order.audit.view',
            name: '查看审核',
            code: 'order.audit.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'order.audit.approve',
            name: '通过审核',
            code: 'order.audit.approve',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'order.audit.reject',
            name: '拒绝审核',
            code: 'order.audit.reject',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'order.audit.revoke',
            name: '撤销审核',
            code: 'order.audit.revoke',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'order.audit.batchApprove',
            name: '批量审核',
            code: 'order.audit.batchApprove',
            type: 'action',
            sort: 5,
            status: 'active'
          }
        ]
      }
    ]
  },
  {
    id: 'product',
    name: '商品管理',
    code: 'product',
    type: 'menu',
    path: '/product',
    icon: 'Goods',
    sort: 4,
    status: 'active',
    children: [
      {
        id: 'product.list',
        name: '商品列表',
        code: 'product.list',
        type: 'menu',
        path: '/product/list',
        icon: 'List',
        sort: 1,
        status: 'active',
        children: [
          {
            id: 'product.list.view',
            name: '查看商品',
            code: 'product.list.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'product.list.export',
            name: '导出商品',
            code: 'product.list.export',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'product.list.edit',
            name: '编辑商品',
            code: 'product.list.edit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'product.list.delete',
            name: '删除商品',
            code: 'product.list.delete',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'product.list.batchOperation',
            name: '批量操作',
            code: 'product.list.batchOperation',
            type: 'action',
            sort: 5,
            status: 'active'
          },
          {
            id: 'product.list.priceAdjust',
            name: '价格调整',
            code: 'product.list.priceAdjust',
            type: 'action',
            sort: 6,
            status: 'active'
          }
        ]
      },
      {
        id: 'product.add',
        name: '新增商品',
        code: 'product.add',
        type: 'menu',
        path: '/product/add',
        icon: 'Plus',
        sort: 2,
        status: 'active',
        children: [
          {
            id: 'product.add.create',
            name: '创建商品',
            code: 'product.add.create',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'product.add.batch',
            name: '批量新增',
            code: 'product.add.batch',
            type: 'action',
            sort: 2,
            status: 'active'
          }
        ]
      },
      {
        id: 'product.category',
        name: '商品分类',
        code: 'product.category',
        type: 'menu',
        path: '/product/category',
        icon: 'Collection',
        sort: 3,
        status: 'active',
        children: [
          {
            id: 'product.category.view',
            name: '查看分类',
            code: 'product.category.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'product.category.create',
            name: '新增分类',
            code: 'product.category.create',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'product.category.edit',
            name: '编辑分类',
            code: 'product.category.edit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'product.category.delete',
            name: '删除分类',
            code: 'product.category.delete',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'product.category.manage',
            name: '管理分类',
            code: 'product.category.manage',
            type: 'action',
            sort: 5,
            status: 'active'
          }
        ]
      },
      {
        id: 'product.inventory',
        name: '库存管理',
        code: 'product.inventory',
        type: 'menu',
        path: '/product/inventory',
        icon: 'Box',
        sort: 4,
        status: 'active',
        children: [
          {
            id: 'product.inventory.view',
            name: '查看库存',
            code: 'product.inventory.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'product.inventory.adjust',
            name: '库存调整',
            code: 'product.inventory.adjust',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'product.inventory.inbound',
            name: '入库管理',
            code: 'product.inventory.inbound',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'product.inventory.outbound',
            name: '出库管理',
            code: 'product.inventory.outbound',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'product.inventory.transfer',
            name: '库存转移',
            code: 'product.inventory.transfer',
            type: 'action',
            sort: 5,
            status: 'active'
          },
          {
            id: 'product.inventory.alert',
            name: '库存预警',
            code: 'product.inventory.alert',
            type: 'action',
            sort: 6,
            status: 'active'
          }
        ]
      },
      {
        id: 'product.analytics',
        name: '商品分析',
        code: 'product.analytics',
        type: 'menu',
        path: '/product/analytics',
        icon: 'DataAnalysis',
        sort: 5,
        status: 'active',
        children: [
          {
            id: 'product.analytics.view',
            name: '查看分析',
            code: 'product.analytics.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'product.analytics.sales',
            name: '销售分析',
            code: 'product.analytics.sales',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'product.analytics.profit',
            name: '利润分析',
            code: 'product.analytics.profit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'product.analytics.trend',
            name: '趋势分析',
            code: 'product.analytics.trend',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'product.analytics.export',
            name: '导出报表',
            code: 'product.analytics.export',
            type: 'action',
            sort: 5,
            status: 'active'
          }
        ]
      }
    ]
  },
  {
    id: 'service',
    name: '服务管理',
    code: 'service',
    type: 'menu',
    path: '/service',
    icon: 'Headset',
    sort: 5,
    status: 'active',
    children: [
      {
        id: 'service.ticket',
        name: '工单管理',
        code: 'service.ticket',
        type: 'menu',
        path: '/service/ticket',
        icon: 'Tickets',
        sort: 1,
        status: 'active',
        children: [
          {
            id: 'service.ticket.view',
            name: '查看工单',
            code: 'service.ticket.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'service.ticket.create',
            name: '创建工单',
            code: 'service.ticket.create',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'service.ticket.edit',
            name: '编辑工单',
            code: 'service.ticket.edit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'service.ticket.delete',
            name: '删除工单',
            code: 'service.ticket.delete',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'service.ticket.assign',
            name: '分配工单',
            code: 'service.ticket.assign',
            type: 'action',
            sort: 5,
            status: 'active'
          },
          {
            id: 'service.ticket.close',
            name: '关闭工单',
            code: 'service.ticket.close',
            type: 'action',
            sort: 6,
            status: 'active'
          },
          {
            id: 'service.ticket.export',
            name: '导出工单',
            code: 'service.ticket.export',
            type: 'action',
            sort: 7,
            status: 'active'
          }
        ]
      },
      {
        id: 'service.chat',
        name: '在线客服',
        code: 'service.chat',
        type: 'menu',
        path: '/service/chat',
        icon: 'ChatDotRound',
        sort: 2,
        status: 'active',
        children: [
          {
            id: 'service.chat.view',
            name: '查看对话',
            code: 'service.chat.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'service.chat.reply',
            name: '回复消息',
            code: 'service.chat.reply',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'service.chat.transfer',
            name: '转接客服',
            code: 'service.chat.transfer',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'service.chat.history',
            name: '查看历史',
            code: 'service.chat.history',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'service.chat.settings',
            name: '客服设置',
            code: 'service.chat.settings',
            type: 'action',
            sort: 5,
            status: 'active'
          }
        ]
      },
      {
        id: 'service.knowledge',
        name: '知识库',
        code: 'service.knowledge',
        type: 'menu',
        path: '/service/knowledge',
        icon: 'Collection',
        sort: 3,
        status: 'active',
        children: [
          {
            id: 'service.knowledge.view',
            name: '查看知识库',
            code: 'service.knowledge.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'service.knowledge.create',
            name: '创建文档',
            code: 'service.knowledge.create',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'service.knowledge.edit',
            name: '编辑文档',
            code: 'service.knowledge.edit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'service.knowledge.delete',
            name: '删除文档',
            code: 'service.knowledge.delete',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'service.knowledge.category',
            name: '分类管理',
            code: 'service.knowledge.category',
            type: 'action',
            sort: 5,
            status: 'active'
          },
          {
            id: 'service.knowledge.publish',
            name: '发布文档',
            code: 'service.knowledge.publish',
            type: 'action',
            sort: 6,
            status: 'active'
          }
        ]
      },
      {
        id: 'service.call',
        name: '通话管理',
        code: 'service.call',
        type: 'menu',
        path: '/service/call',
        icon: 'Phone',
        sort: 4,
        status: 'active',
        children: [
          {
            id: 'service.call.view',
            name: '查看通话记录',
            code: 'service.call.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'service.call.make',
            name: '发起通话',
            code: 'service.call.make',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'service.call.record',
            name: '录音管理',
            code: 'service.call.record',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'service.call.statistics',
            name: '通话统计',
            code: 'service.call.statistics',
            type: 'action',
            sort: 4,
            status: 'active'
          }
        ]
      },
      {
        id: 'service.sms',
        name: '短信管理',
        code: 'service.sms',
        type: 'menu',
        path: '/service/sms',
        icon: 'Message',
        sort: 5,
        status: 'active',
        children: [
          {
            id: 'service.sms.view',
            name: '查看短信记录',
            code: 'service.sms.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'service.sms.send',
            name: '发送短信',
            code: 'service.sms.send',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'service.sms.template',
            name: '模板管理',
            code: 'service.sms.template',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'service.sms.batch',
            name: '批量发送',
            code: 'service.sms.batch',
            type: 'action',
            sort: 4,
            status: 'active'
          },
          {
            id: 'service.sms.statistics',
            name: '短信统计',
            code: 'service.sms.statistics',
            type: 'action',
            sort: 5,
            status: 'active'
          }
        ]
      }
    ]
  },
  {
    id: 'data',
    name: '资料管理',
    code: 'data',
    type: 'menu',
    path: '/data',
    icon: 'FolderOpened',
    sort: 6,
    status: 'active',
    children: [
      {
        id: 'data.list',
        name: '资料列表',
        code: 'data.list',
        type: 'menu',
        path: '/data/list',
        icon: 'List',
        sort: 1,
        status: 'active',
        children: [
          {
            id: 'data.list.view',
            name: '查看资料列表',
            code: 'data.list.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'data.list.export',
            name: '导出资料',
            code: 'data.list.export',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'data.list.import',
            name: '导入资料',
            code: 'data.list.import',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'data.list.assign',
            name: '分配资料',
            code: 'data.list.assign',
            type: 'action',
            sort: 4,
            status: 'active'
          }
        ]
      },
      {
        id: 'data.search',
        name: '客户查询',
        code: 'data.search',
        type: 'menu',
        path: '/data/search',
        icon: 'Search',
        sort: 2,
        status: 'active',
        children: [
          {
            id: 'data.search.basic',
            name: '基础查询',
            code: 'data.search.basic',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'data.search.advanced',
            name: '高级查询',
            code: 'data.search.advanced',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'data.search.export',
            name: '导出查询结果',
            code: 'data.search.export',
            type: 'action',
            sort: 3,
            status: 'active'
          }
        ]
      },
      {
        id: 'data.recycle',
        name: '回收站',
        code: 'data.recycle',
        type: 'menu',
        path: '/data/recycle',
        icon: 'Delete',
        sort: 3,
        status: 'active',
        children: [
          {
            id: 'data.recycle.view',
            name: '查看回收站',
            code: 'data.recycle.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'data.recycle.restore',
            name: '恢复数据',
            code: 'data.recycle.restore',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'data.recycle.delete',
            name: '彻底删除',
            code: 'data.recycle.delete',
            type: 'action',
            sort: 3,
            status: 'active'
          }
        ]
      }
    ]
  },
  {
    id: 'performance',
    name: '业绩统计',
    code: 'performance',
    type: 'menu',
    path: '/performance',
    icon: 'TrendCharts',
    sort: 7,
    status: 'active',
    children: [
      {
        id: 'performance.personal',
        name: '个人业绩',
        code: 'performance.personal',
        type: 'menu',
        path: '/performance/personal',
        icon: 'User',
        sort: 1,
        status: 'active',
        children: [
          {
            id: 'performance.personal.view',
            name: '查看个人业绩',
            code: 'performance.personal.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'performance.personal.export',
            name: '导出个人数据',
            code: 'performance.personal.export',
            type: 'action',
            sort: 2,
            status: 'active'
          }
        ]
      },
      {
        id: 'performance.team',
        name: '团队业绩',
        code: 'performance.team',
        type: 'menu',
        path: '/performance/team',
        icon: 'UserFilled',
        sort: 2,
        status: 'active',
        children: [
          {
            id: 'performance.team.view',
            name: '查看团队业绩',
            code: 'performance.team.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'performance.team.export',
            name: '导出团队数据',
            code: 'performance.team.export',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'performance.team.compare',
            name: '业绩对比',
            code: 'performance.team.compare',
            type: 'action',
            sort: 3,
            status: 'active'
          }
        ]
      },
      {
        id: 'performance.analysis',
        name: '业绩分析',
        code: 'performance.analysis',
        type: 'menu',
        path: '/performance/analysis',
        icon: 'DataAnalysis',
        sort: 3,
        status: 'active',
        children: [
          {
            id: 'performance.analysis.view',
            name: '查看分析报告',
            code: 'performance.analysis.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'performance.analysis.trend',
            name: '趋势分析',
            code: 'performance.analysis.trend',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'performance.analysis.forecast',
            name: '业绩预测',
            code: 'performance.analysis.forecast',
            type: 'action',
            sort: 3,
            status: 'active'
          }
        ]
      },
      {
        id: 'performance.share',
        name: '业绩分享',
        code: 'performance.share',
        type: 'menu',
        path: '/performance/share',
        icon: 'Share',
        sort: 4,
        status: 'active',
        children: [
          {
            id: 'performance.share.view',
            name: '查看分享',
            code: 'performance.share.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'performance.share.create',
            name: '创建分享',
            code: 'performance.share.create',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'performance.share.manage',
            name: '管理分享',
            code: 'performance.share.manage',
            type: 'action',
            sort: 3,
            status: 'active'
          }
        ]
      }
    ]
  },
  {
    id: 'afterSales',
    name: '售后管理',
    code: 'afterSales',
    type: 'menu',
    path: '/afterSales',
    icon: 'Tools',
    sort: 8,
    status: 'active',
    children: [
      {
        id: 'afterSales.list',
        name: '售后订单',
        code: 'afterSales.list',
        type: 'menu',
        path: '/afterSales/list',
        icon: 'List',
        sort: 1,
        status: 'active',
        children: [
          {
            id: 'afterSales.list.view',
            name: '查看售后订单',
            code: 'afterSales.list.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'afterSales.list.export',
            name: '导出售后数据',
            code: 'afterSales.list.export',
            type: 'action',
            sort: 2,
            status: 'active'
          }
        ]
      },
      {
        id: 'afterSales.add',
        name: '新建售后',
        code: 'afterSales.add',
        type: 'menu',
        path: '/afterSales/add',
        icon: 'Plus',
        sort: 2,
        status: 'active',
        children: [
          {
            id: 'afterSales.add.create',
            name: '创建售后单',
            code: 'afterSales.add.create',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'afterSales.add.batch',
            name: '批量创建',
            code: 'afterSales.add.batch',
            type: 'action',
            sort: 2,
            status: 'active'
          }
        ]
      },
      {
        id: 'afterSales.detail',
        name: '售后详情',
        code: 'afterSales.detail',
        type: 'menu',
        path: '/afterSales/detail',
        icon: 'View',
        sort: 3,
        status: 'active',
        children: [
          {
            id: 'afterSales.detail.view',
            name: '查看售后详情',
            code: 'afterSales.detail.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'afterSales.detail.edit',
            name: '编辑售后单',
            code: 'afterSales.detail.edit',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'afterSales.detail.process',
            name: '处理售后',
            code: 'afterSales.detail.process',
            type: 'action',
            sort: 3,
            status: 'active'
          }
        ]
      },
      {
        id: 'afterSales.data',
        name: '售后数据',
        code: 'afterSales.data',
        type: 'menu',
        path: '/afterSales/data',
        icon: 'DataAnalysis',
        sort: 4,
        status: 'active',
        children: [
          {
            id: 'afterSales.data.view',
            name: '查看售后数据',
            code: 'afterSales.data.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'afterSales.data.analysis',
            name: '售后分析',
            code: 'afterSales.data.analysis',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'afterSales.data.report',
            name: '售后报告',
            code: 'afterSales.data.report',
            type: 'action',
            sort: 3,
            status: 'active'
          }
        ]
      }
    ]
  },
  {
    id: 'logistics',
    name: '物流管理',
    code: 'logistics',
    type: 'menu',
    path: '/logistics',
    icon: 'Van',
    sort: 9,
    status: 'active',
    children: [
      {
        id: 'logistics.list',
        name: '物流列表',
        code: 'logistics.list',
        type: 'menu',
        path: '/logistics/list',
        icon: 'List',
        sort: 1,
        status: 'active',
        children: [
          {
            id: 'logistics.list.view',
            name: '查看物流列表',
            code: 'logistics.list.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'logistics.list.export',
            name: '导出物流数据',
            code: 'logistics.list.export',
            type: 'action',
            sort: 2,
            status: 'active'
          }
        ]
      },
      {
        id: 'logistics.track',
        name: '物流跟踪',
        code: 'logistics.track',
        type: 'menu',
        path: '/logistics/track',
        icon: 'Position',
        sort: 2,
        status: 'active',
        children: [
          {
            id: 'logistics.track.view',
            name: '查看跟踪信息',
            code: 'logistics.track.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'logistics.track.update',
            name: '更新跟踪状态',
            code: 'logistics.track.update',
            type: 'action',
            sort: 2,
            status: 'active'
          }
        ]
      },
      {
        id: 'logistics.companies',
        name: '物流公司',
        code: 'logistics.companies',
        type: 'menu',
        path: '/logistics/companies',
        icon: 'OfficeBuilding',
        sort: 3,
        status: 'active',
        children: [
          {
            id: 'logistics.companies.view',
            name: '查看物流公司',
            code: 'logistics.companies.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'logistics.companies.create',
            name: '添加物流公司',
            code: 'logistics.companies.create',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'logistics.companies.edit',
            name: '编辑物流公司',
            code: 'logistics.companies.edit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'logistics.companies.delete',
            name: '删除物流公司',
            code: 'logistics.companies.delete',
            type: 'action',
            sort: 4,
            status: 'active'
          }
        ]
      },
      {
        id: 'logistics.shipping',
        name: '发货列表',
        code: 'logistics.shipping',
        type: 'menu',
        path: '/logistics/shipping',
        icon: 'Box',
        sort: 4,
        status: 'active',
        children: [
          {
            id: 'logistics.shipping.view',
            name: '查看发货列表',
            code: 'logistics.shipping.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'logistics.shipping.create',
            name: '创建发货单',
            code: 'logistics.shipping.create',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'logistics.shipping.edit',
            name: '编辑发货单',
            code: 'logistics.shipping.edit',
            type: 'action',
            sort: 3,
            status: 'active'
          },
          {
            id: 'logistics.shipping.batchExport',
            name: '批量导出',
            code: 'logistics.shipping.batchExport',
            type: 'action',
            sort: 4,
            status: 'active'
          }
        ]
      },
      {
        id: 'logistics.status',
        name: '状态更新',
        code: 'logistics.status',
        type: 'menu',
        path: '/logistics/status',
        icon: 'Refresh',
        sort: 5,
        status: 'active',
        children: [
          {
            id: 'logistics.status.view',
            name: '查看状态',
            code: 'logistics.status.view',
            type: 'action',
            sort: 1,
            status: 'active'
          },
          {
            id: 'logistics.status.update',
            name: '更新状态',
            code: 'logistics.status.update',
            type: 'action',
            sort: 2,
            status: 'active'
          },
          {
            id: 'logistics.status.batch',
            name: '批量更新',
            code: 'logistics.status.batch',
            type: 'action',
            sort: 3,
            status: 'active'
          }
        ]
      }
    ]
  }
]

// 角色默认权限配置
const ROLE_DEFAULT_PERMISSIONS = {
  'SUPER_ADMIN': [], // 超级管理员拥有所有权限，通过代码逻辑处理
  'ADMIN': [
    'system.user.view', 'system.user.create', 'system.user.edit', 'system.user.permissions', 'system.user.reset_password',
    'system.role.view', 'system.role.create', 'system.role.edit', 'system.role.assign_permissions',
    'system.department.view', 'system.department.create', 'system.department.edit', 'system.department.members',
    'system.permission.view', 'system.permission.assign',
    'system.settings.view', 'system.settings.edit', 'system.settings.sms', 'system.settings.call',
    'customer.list.view', 'customer.list.export', 'customer.add.create', 'customer.edit', 'customer.follow',
    'order.list.view', 'order.create', 'order.edit', 'order.status',
    'product.list', 'product.add', 'product.edit', 'product.category', 'product.inventory', 'product.analytics',
    'service.ticket.view', 'service.ticket.create', 'service.ticket.edit', 'service.ticket.delete', 'service.ticket.assign', 'service.ticket.close', 'service.ticket.export',
    'service.chat.view', 'service.chat.reply', 'service.chat.transfer', 'service.chat.history', 'service.chat.settings',
    'service.knowledge.view', 'service.knowledge.create', 'service.knowledge.edit', 'service.knowledge.delete', 'service.knowledge.category', 'service.knowledge.publish',
    'service.call.view', 'service.call.make', 'service.call.record', 'service.call.statistics',
    'service.sms.view', 'service.sms.send', 'service.sms.template', 'service.sms.batch', 'service.sms.statistics',
    'data.list.view', 'data.list.export', 'data.list.import', 'data.list.assign',
    'data.search.basic', 'data.search.advanced', 'data.search.export',
    'performance.personal.view', 'performance.team.view', 'performance.analysis.view'
  ],
  'MANAGER': [
    'system.user.view',
    'system.department.view',
    'customer.list.view', 'customer.list.export', 'customer.add.create', 'customer.edit', 'customer.follow',
    'order.list.view', 'order.create', 'order.edit', 'order.status',
    'product.list', 'product.add', 'product.edit', 'product.category', 'product.analytics',
    'service.ticket.view', 'service.ticket.create', 'service.ticket.edit', 'service.ticket.assign', 'service.ticket.close', 'service.ticket.export',
    'service.chat.view', 'service.chat.reply', 'service.chat.transfer', 'service.chat.history', 'service.chat.settings',
    'service.knowledge.view', 'service.knowledge.create', 'service.knowledge.edit', 'service.knowledge.category', 'service.knowledge.publish',
    'service.call.view', 'service.call.make', 'service.call.record', 'service.call.statistics',
    'service.sms.view', 'service.sms.send', 'service.sms.template', 'service.sms.batch', 'service.sms.statistics',
    'data.list.view', 'data.search.basic', 'data.search.advanced',
    'performance.personal.view', 'performance.team.view', 'performance.analysis.view'
  ],
  'EMPLOYEE': [
    'customer.list.view', 'customer.follow',
    'order.list.view', 'order.create',
    'product.list',
    'service.ticket.view', 'service.ticket.create', 'service.ticket.edit',
    'service.chat.view', 'service.chat.reply', 'service.chat.history',
    'service.knowledge.view',
    'service.call.view', 'service.call.make',
    'service.sms.view', 'service.sms.send',
    'data.list.view', 'data.search.basic',
    'performance.personal.view'
  ],
  'CUSTOMER_SERVICE': [
    'customer.list.view', 'customer.follow',
    'order.list.view',
    'service.ticket.view', 'service.ticket.create', 'service.ticket.edit', 'service.ticket.assign', 'service.ticket.close',
    'service.chat.view', 'service.chat.reply', 'service.chat.transfer', 'service.chat.history', 'service.chat.settings',
    'service.knowledge.view', 'service.knowledge.create', 'service.knowledge.edit', 'service.knowledge.category',
    'service.call.view', 'service.call.make', 'service.call.record',
    'service.sms.view', 'service.sms.send', 'service.sms.template',
    'data.list.view', 'data.search.basic'
  ]
}

/**
 * 权限服务类
 */
class PermissionService {
  constructor() {
    // 权限更新监听器列表
    this.permissionUpdateListeners = []
  }

  /**
   * 添加权限更新监听器
   * @param {Function} listener 监听器函数
   */
  addPermissionUpdateListener(listener) {
    this.permissionUpdateListeners.push(listener)
  }

  /**
   * 移除权限更新监听器
   * @param {Function} listener 监听器函数
   */
  removePermissionUpdateListener(listener) {
    const index = this.permissionUpdateListeners.indexOf(listener)
    if (index > -1) {
      this.permissionUpdateListeners.splice(index, 1)
    }
  }

  /**
   * 通知权限更新
   * @param {string} roleId 更新的角色ID
   */
  notifyPermissionUpdate(roleId) {
    console.log(`通知权限更新: 角色${roleId}`)
    this.permissionUpdateListeners.forEach(listener => {
      try {
        listener(roleId)
      } catch (error) {
        console.error('权限更新监听器执行失败:', error)
      }
    })
  }

  /**
   * 获取完整的权限树
   * @returns {Array} 权限树数组
   */
  getAllPermissions() {
    return JSON.parse(JSON.stringify(PERMISSION_TREE))
  }

  /**
   * 获取扁平化的权限列表
   * @returns {Array} 扁平化权限数组
   */
  getFlatPermissions() {
    const flatPermissions = []
    
    const flatten = (permissions, parent = null) => {
      permissions.forEach(permission => {
        flatPermissions.push({
          ...permission,
          parentId: parent?.id || null,
          module: parent?.name || permission.name
        })
        
        if (permission.children && permission.children.length > 0) {
          flatten(permission.children, permission)
        }
      })
    }
    
    flatten(PERMISSION_TREE)
    return flatPermissions
  }

  /**
   * 根据角色代码获取默认权限
   * @param {string} roleCode 角色代码
   * @returns {Array} 权限ID数组
   */
  getRoleDefaultPermissions(roleCode) {
    if (roleCode === 'SUPER_ADMIN') {
      // 超级管理员拥有所有权限
      return this.getFlatPermissions()
        .filter(p => p.type === 'action')
        .map(p => p.id)
    }
    
    return ROLE_DEFAULT_PERMISSIONS[roleCode] || []
  }

  /**
   * 获取角色权限（优先从localStorage读取，否则使用默认权限）
   * @param {string} roleId 角色ID
   * @returns {Promise} 角色权限数据
   */
  async getRolePermissions(roleId) {
    try {
      // 首先尝试从localStorage读取保存的角色权限配置
      const savedRolePermissions = localStorage.getItem('role_permissions')
      if (savedRolePermissions) {
        const rolePermissionsData = JSON.parse(savedRolePermissions)
        if (rolePermissionsData[roleId]) {
          console.log(`从localStorage读取角色${roleId}的权限配置`)
          return rolePermissionsData[roleId]
        }
      }
    } catch (error) {
      console.warn('从localStorage读取角色权限失败:', error)
    }
    
    // 如果localStorage中没有配置，则使用默认权限
    console.log(`使用角色${roleId}的默认权限配置`)
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 模拟根据角色ID获取角色信息
    const roleMap = {
      '1': { code: 'SUPER_ADMIN', name: '超级管理员' },
      '2': { code: 'ADMIN', name: '管理员' },
      '3': { code: 'MANAGER', name: '经理' },
      '4': { code: 'EMPLOYEE', name: '员工' },
      '5': { code: 'CUSTOMER_SERVICE', name: '客服' }
    }
    
    const role = roleMap[roleId] || { code: 'EMPLOYEE', name: '员工' }
    const permissionIds = this.getRoleDefaultPermissions(role.code)
    const allPermissions = this.getFlatPermissions()
    
    const permissions = allPermissions.filter(p => permissionIds.includes(p.id))
    
    return {
      roleId,
      roleName: role.name,
      roleCode: role.code,
      permissions
    }
  }

  /**
   * 获取用户个人权限（模拟API调用）
   * @param {number} userId 用户ID
   * @returns {Promise} 用户个人权限数据
   */
  async getUserPersonalPermissions(userId) {
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 模拟用户个人权限数据
    const userPersonalPermissions = {
      1: ['customer.list.import', 'order.list.export'], // 超管额外权限
      2: ['customer.list.import'], // 管理员额外权限
      3: ['order.list.export'], // 经理额外权限
      4: [], // 员工无额外权限
      5: ['customer.list.export'] // 客服额外权限
    }
    
    const permissionIds = userPersonalPermissions[userId] || []
    const allPermissions = this.getFlatPermissions()
    const permissions = allPermissions.filter(p => permissionIds.includes(p.id))
    
    return {
      userId,
      permissions
    }
  }

  /**
   * 保存用户个人权限（模拟API调用）
   * @param {number} userId 用户ID
   * @param {Array} permissionIds 权限ID数组
   * @returns {Promise} 保存结果
   */
  async saveUserPersonalPermissions(userId, permissionIds) {
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 500))
    
    console.log(`保存用户 ${userId} 的个人权限:`, permissionIds)
    
    return {
      success: true,
      message: '个人权限保存成功'
    }
  }

  /**
   * 获取用户部门权限
   * @param {number} userId 用户ID
   * @returns {Promise} 用户部门权限数据
   */
  async getUserDepartmentPermissions(userId) {
    try {
      // 获取用户部门信息
      const userStore = await import('@/stores/user')
      const departmentPermissionService = await import('@/services/departmentPermissionService')
      
      const user = userStore.default.getUserById(userId)
      if (!user || !user.departmentId) {
        return {
          departmentId: null,
          departmentName: null,
          permissions: [],
          inheritedPermissions: [],
          managerExtraPermissions: [],
          isManager: false
        }
      }

      // 获取部门权限配置
      const departmentConfig = await departmentPermissionService.default.getDepartmentPermissions(user.departmentId)
      
      // 检查用户是否为部门负责人
      const departmentStore = await import('@/stores/department')
      const department = departmentStore.default.getDepartmentById(user.departmentId)
      const isManager = department?.managerId === userId

      let allDepartmentPermissions = [...(departmentConfig.permissions || [])]
      let inheritedPermissions = []

      // 如果启用了权限继承，获取父部门权限
      if (departmentConfig.inheritFromParent && department?.parentId) {
        const parentConfig = await departmentPermissionService.default.getDepartmentPermissions(department.parentId)
        inheritedPermissions = parentConfig.permissions || []
        allDepartmentPermissions = [...allDepartmentPermissions, ...inheritedPermissions]
      }

      // 如果是部门负责人，添加额外权限
      let managerExtraPermissions = []
      if (isManager) {
        managerExtraPermissions = departmentConfig.managerExtraPermissions || [
          'data.department.view_all',
          'performance.department.view_all',
          'customer.department.view_all'
        ]
        allDepartmentPermissions = [...allDepartmentPermissions, ...managerExtraPermissions]
      }

      // 去重
      allDepartmentPermissions = [...new Set(allDepartmentPermissions)]

      return {
        departmentId: user.departmentId,
        departmentName: department?.name || '',
        permissions: allDepartmentPermissions,
        inheritedPermissions,
        managerExtraPermissions,
        isManager,
        dataScope: departmentConfig.dataScope || 'department'
      }
    } catch (error) {
      console.error('获取用户部门权限失败:', error)
      return {
        departmentId: null,
        departmentName: null,
        permissions: [],
        inheritedPermissions: [],
        managerExtraPermissions: [],
        isManager: false
      }
    }
  }

  /**
   * 获取用户完整权限（部门权限 + 角色权限 + 个人权限）
   * @param {number} userId 用户ID
   * @param {string} roleId 角色ID
   * @returns {Promise} 用户完整权限数据
   */
  async getUserFullPermissions(userId, roleId) {
    const [rolePermissions, personalPermissions, departmentPermissions] = await Promise.all([
      this.getRolePermissions(roleId),
      this.getUserPersonalPermissions(userId),
      this.getUserDepartmentPermissions(userId)
    ])
    
    // 合并所有权限
    const rolePermissionIds = rolePermissions.permissions.map(p => p.id)
    const personalPermissionIds = personalPermissions.permissions.map(p => p.id)
    const departmentPermissionIds = departmentPermissions.permissions || []
    
    // 将部门权限代码转换为权限ID（如果需要）
    const allPermissions = this.getFlatPermissions()
    const departmentPermissionObjects = allPermissions.filter(p => 
      departmentPermissionIds.includes(p.code) || departmentPermissionIds.includes(p.id)
    )
    const departmentPermissionObjectIds = departmentPermissionObjects.map(p => p.id)
    
    const allPermissionIds = [...new Set([
      ...rolePermissionIds, 
      ...personalPermissionIds, 
      ...departmentPermissionObjectIds
    ])]
    
    const userPermissions = allPermissions.filter(p => allPermissionIds.includes(p.id))
    
    return {
      userId,
      roleId,
      roleName: rolePermissions.roleName,
      rolePermissions: rolePermissions.permissions,
      personalPermissions: personalPermissions.permissions,
      departmentPermissions: {
        departmentId: departmentPermissions.departmentId,
        departmentName: departmentPermissions.departmentName,
        permissions: departmentPermissionObjects,
        inheritedPermissions: departmentPermissions.inheritedPermissions,
        managerExtraPermissions: departmentPermissions.managerExtraPermissions,
        isManager: departmentPermissions.isManager,
        dataScope: departmentPermissions.dataScope
      },
      allPermissions: userPermissions
    }
  }

  /**
   * 检查用户是否有指定权限
   * @param {number} userId 用户ID
   * @param {string} roleId 角色ID
   * @param {string} permissionCode 权限代码
   * @param {Object} options 额外选项
   * @returns {Promise<boolean>} 是否有权限
   */
  async hasPermission(userId, roleId, permissionCode, options = {}) {
    const userPermissions = await this.getUserFullPermissions(userId, roleId)
    
    // 检查基础权限
    const hasBasicPermission = userPermissions.allPermissions.some(p => p.code === permissionCode)
    if (hasBasicPermission) {
      return true
    }

    // 部门负责人特殊权限逻辑
    if (userPermissions.departmentPermissions.isManager) {
      // 部门负责人可以查看部门全部成员数据
      const managerPermissions = [
        'customer.list.view',  // 查看客户列表
        'order.list.view',     // 查看订单列表
        'data.list.view',      // 查看数据列表
        'performance.personal.view',  // 查看个人绩效
        'performance.team.view',      // 查看团队绩效
        'user.department.view'        // 查看部门用户
      ]
      
      if (managerPermissions.includes(permissionCode)) {
        return true
      }

      // 检查是否为部门相关的数据权限
      if (options.targetDepartmentId && 
          options.targetDepartmentId === userPermissions.departmentPermissions.departmentId) {
        const departmentDataPermissions = [
          'data.department.view_all',
          'performance.department.view_all', 
          'customer.department.view_all'
        ]
        
        if (departmentDataPermissions.some(p => permissionCode.includes(p.split('.')[0]))) {
          return true
        }
      }
    }

    return false
  }

  /**
   * 检查用户是否可以访问指定部门的数据
   * @param {number} userId 用户ID
   * @param {string} roleId 角色ID
   * @param {string} targetDepartmentId 目标部门ID
   * @returns {Promise<boolean>} 是否可以访问
   */
  async canAccessDepartmentData(userId, roleId, targetDepartmentId) {
    const userPermissions = await this.getUserFullPermissions(userId, roleId)
    
    // 超级管理员可以访问所有部门数据
    if (userPermissions.allPermissions.some(p => p.code === 'system')) {
      return true
    }

    // 用户可以访问自己所在部门的数据
    if (userPermissions.departmentPermissions.departmentId === targetDepartmentId) {
      return true
    }

    // 部门负责人可以访问管理的部门数据
    if (userPermissions.departmentPermissions.isManager && 
        userPermissions.departmentPermissions.departmentId === targetDepartmentId) {
      return true
    }

    return false
  }

  /**
   * 获取用户可访问的数据范围
   * @param {number} userId 用户ID
   * @param {string} roleId 角色ID
   * @returns {Promise<Object>} 数据范围配置
   */
  async getUserDataScope(userId, roleId) {
    const userPermissions = await this.getUserFullPermissions(userId, roleId)
    
    // 超级管理员可以访问所有数据
    if (userPermissions.allPermissions.some(p => p.code === 'system')) {
      return {
        scope: 'all',
        departmentIds: [],
        userIds: []
      }
    }

    // 部门负责人可以访问部门数据
    if (userPermissions.departmentPermissions.isManager) {
      return {
        scope: 'department',
        departmentIds: [userPermissions.departmentPermissions.departmentId],
        userIds: []
      }
    }

    // 普通用户只能访问自己的数据
    return {
      scope: 'self',
      departmentIds: [],
      userIds: [userId]
    }
  }
}

// 导出单例实例
export default new PermissionService()