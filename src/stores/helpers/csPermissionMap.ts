/**
 * 客服自定义权限 → 菜单权限映射表
 * 将客服权限管理模块配置的 customPermissions 转换为菜单系统能识别的权限 key
 *
 * 从 stores/user.ts 提取，保持职责单一
 */

export const CS_PERM_TO_MENU_MAP: Record<string, string[]> = {
  // 客户管理
  'customer:list:view': ['customer', 'customer:list', 'customer.list', 'customer.list.view'],
  'customer:list:edit': ['customer', 'customer:list', 'customer.list', 'customer.list.edit'],
  'customer:list:create': ['customer', 'customer:list', 'customer:add', 'customer.list', 'customer.add'],
  'customer:list:assign': ['customer', 'customer:list', 'customer.list'],
  // 订单管理
  'order:list:view': ['order', 'order:list', 'order.list', 'order.list.view'],
  'order:list:edit': ['order', 'order:list', 'order.list', 'order.list.edit'],
  'order:add:create': ['order', 'order:add', 'order.add', 'order.add.create'],
  'order:audit:view': ['order', 'order:audit', 'order.audit', 'order.audit.view'],
  'order:audit:approve': ['order', 'order:audit', 'order.audit', 'order.audit.approve'],
  'order:detail:cancel': ['order', 'order:list', 'order.list'],
  'order:cod:cancelAudit': ['order', 'finance:cod'],
  // 售后管理
  'service:list:view': ['aftersale', 'aftersale:order', 'aftersale.list', 'aftersale.list.view'],
  'service:list:edit': ['aftersale', 'aftersale:order', 'aftersale.list', 'aftersale.list.edit'],
  'service:afterSales:view': ['aftersale', 'aftersale:order', 'aftersale.list'],
  'service:afterSales:edit': ['aftersale', 'aftersale:order', 'aftersale:add', 'aftersale.add'],
  // 服务管理（通话/短信）
  'callService:call:view': ['communication', 'communication.call'],
  'callService:call:create': ['communication', 'communication.call'],
  'callService:record:view': ['communication', 'communication.call'],
  'callService:sms:view': ['communication', 'communication.sms'],
  'callService:sms:send': ['communication', 'communication.sms'],
  // 物流管理
  'logistics:shipping:view': ['logistics', 'logistics:shipping', 'logistics:list', 'logistics:tracking', 'logistics.shipping', 'logistics.list'],
  'logistics:shipping:edit': ['logistics', 'logistics:shipping', 'logistics:list', 'logistics:status', 'logistics.shipping'],
  'logistics:shipping:batchExport': ['logistics', 'logistics:shipping', 'logistics.shipping'],
  // 资料管理
  'data:record:view': ['data', 'data:list', 'data:customer', 'data.list', 'data.list.view', 'data.search', 'data.search.basic'],
  'data:record:edit': ['data', 'data:list', 'data.list', 'data.list.edit'],
  'data:record:create': ['data', 'data:list', 'data.list'],
  'data:record:export': ['data', 'data:list', 'data.list', 'data.list.export'],
  // 商品管理
  'product:list:view': ['sales:product', 'sales:product:view', 'product:analytics'],
  'product:list:edit': ['sales:product', 'sales:product:view', 'sales:product:edit'],
  'product:add:create': ['sales:product', 'sales:product:add'],
  'product:inventory:manage': ['sales:product', 'sales:product:edit'],
  // 财务管理
  'finance:payment:view': ['finance', 'finance:data'],
  'finance:payment:edit': ['finance', 'finance:data', 'finance:manage'],
  'finance:report:view': ['finance', 'finance:data'],
  'finance:report:export': ['finance', 'finance:data'],
  'finance:refund:manage': ['finance', 'finance:manage'],
  // 业绩统计
  'performance:personal:view': ['performance', 'performance:personal'],
  'performance:team:view': ['performance', 'performance:team'],
  'performance:report:export': ['performance', 'performance:analysis'],
  'performance:ranking:view': ['performance', 'performance:analysis'],
}

/**
 * 将客服 customPermissions 转换为菜单系统权限列表
 */
export function convertCsPermsToMenuPerms(customPermissions: string[]): string[] {
  const menuPerms = new Set<string>()
  // 客服始终拥有数据看板权限
  menuPerms.add('dashboard')
  menuPerms.add('dashboard.view')
  for (const perm of customPermissions) {
    // 通过映射表转换
    const mapped = CS_PERM_TO_MENU_MAP[perm]
    if (mapped) {
      mapped.forEach(p => menuPerms.add(p))
    }
    // 同时保留原始 key 和父级 key
    menuPerms.add(perm)
    const parts = perm.split(':')
    for (let i = 1; i < parts.length; i++) {
      menuPerms.add(parts.slice(0, i).join(':'))
    }
  }
  return Array.from(menuPerms)
}

