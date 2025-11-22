/**
 * 角色默认权限配置
 *
 * 这个文件定义了每个角色的默认权限
 * - 部署后全局生效
 * - 超级管理员可以在"系统管理 → 角色权限"中动态调整
 * - 所有用户、所有设备权限一致
 */

export interface RolePermissionConfig {
  roleId: string
  roleName: string
  permissions: string[]
  description?: string
}

/**
 * 默认角色权限配置
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, RolePermissionConfig> = {
  // 超级管理员
  super_admin: {
    roleId: 'super_admin',
    roleName: '超级管理员',
    permissions: ['*'], // 所有权限
    description: '拥有系统所有权限，可以管理所有功能和数据'
  },

  // 管理员
  admin: {
    roleId: 'admin',
    roleName: '管理员',
    permissions: ['*'], // 所有权限
    description: '拥有系统所有权限，可以管理所有功能和数据'
  },

  // 部门经理
  department_manager: {
    roleId: 'department_manager',
    roleName: '部门经理',
    permissions: [
      // 数据看板
      'dashboard',
      'dashboard.view',
      'dashboard.export',

      // 客户管理
      'customer',
      'customer.list',
      'customer.list.view',
      'customer.list.export',
      'customer.list.import',
      'customer.list.edit',
      'customer.add',
      'customer.add.create',

      // 订单管理
      'order',
      'order.list',
      'order.list.view',
      'order.add',
      'order.add.create',

      // 服务管理
      'service',
      'service.call',
      'service.call.view',
      'service.call.make',

      // 业绩统计
      'performance',
      'performance.personal',
      'performance.personal.view',
      'performance.team',
      'performance.team.view',

      // 物流管理
      'logistics',
      'logistics.list',
      'logistics.list.view',
      'logistics.track',
      'logistics.track.view',

      // 售后管理
      'aftersale',
      'aftersale.list',
      'aftersale.list.view',
      'aftersale.add',
      'aftersale.add.create',

      // 资料管理
      'data',
      'data.list',
      'data.list.view',
      'data.search',
      'data.search.basic'
    ],
    description: '管理本部门业务和团队，查看部门数据'
  },

  // 销售员
  sales_staff: {
    roleId: 'sales_staff',
    roleName: '销售员',
    permissions: [
      // 数据看板
      'dashboard',
      'dashboard.view',

      // 客户管理
      'customer',
      'customer.list',
      'customer.list.view',
      'customer.add',
      'customer.add.create',

      // 订单管理
      'order',
      'order.list',
      'order.list.view',
      'order.add',
      'order.add.create',

      // 服务管理
      'service',
      'service.call',
      'service.call.view',
      'service.call.make',

      // 业绩统计
      'performance',
      'performance.personal',
      'performance.personal.view',
      'performance.team',
      'performance.team.view',

      // 物流管理
      'logistics',
      'logistics.list',
      'logistics.list.view',
      'logistics.track',
      'logistics.track.view',

      // 售后管理
      'aftersale',
      'aftersale.list',
      'aftersale.list.view',
      'aftersale.add',
      'aftersale.add.create',

      // 资料管理
      'data',
      'data.list',
      'data.list.view',
      'data.search',
      'data.search.basic'
    ],
    description: '专注于客户开发和订单管理，查看个人数据'
  },

  // 客服
  customer_service: {
    roleId: 'customer_service',
    roleName: '客服',
    permissions: [
      // 数据看板
      'dashboard',
      'dashboard.view',

      // 订单管理
      'order',
      'order.list',
      'order.list.view',
      'order.audit',
      'order.audit.view',

      // 物流管理 ⭐ 客服特有权限
      'logistics',
      'logistics.list',
      'logistics.list.view',
      'logistics.track',
      'logistics.track.view',
      'logistics.shipping',        // ⭐ 发货列表
      'logistics.shipping.view',
      'logistics.status',          // ⭐⭐⭐ 状态更新（关键权限）
      'logistics.status.update',

      // 售后管理 ⭐ 完整权限
      'aftersale',
      'aftersale.list',
      'aftersale.list.view',
      'aftersale.add',             // ⭐⭐⭐ 新建售后（关键权限）
      'aftersale.add.create',
      'aftersale.data',            // ⭐⭐⭐ 售后数据菜单（关键权限）
      'aftersale.data.view',       // ⭐⭐⭐ 售后数据查看（关键权限）

      // 资料管理 ⭐ 完整权限
      'data',
      'data.list',
      'data.list.view',
      'data.search',
      'data.search.basic'
    ],
    description: '处理订单、物流和售后服务，查看全公司数据'
  }
}

/**
 * 获取角色的默认权限
 */
export function getDefaultRolePermissions(roleId: string): string[] {
  const config = DEFAULT_ROLE_PERMISSIONS[roleId]
  return config ? config.permissions : []
}

/**
 * 获取所有角色配置
 */
export function getAllRoleConfigs(): RolePermissionConfig[] {
  return Object.values(DEFAULT_ROLE_PERMISSIONS)
}

/**
 * 检查角色是否存在
 */
export function isValidRole(roleId: string): boolean {
  return roleId in DEFAULT_ROLE_PERMISSIONS
}
