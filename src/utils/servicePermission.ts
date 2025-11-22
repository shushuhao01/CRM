import { useAuthStore } from '@/stores/auth'

// 售后模块权限定义
export const ServicePermissions = {
  // 查看权限
  VIEW_LIST: 'service:list:view',
  VIEW_DETAIL: 'service:detail:view',
  VIEW_DATA: 'service:data:view',

  // 操作权限
  ADD: 'service:add',
  EDIT: 'service:edit',
  DELETE: 'service:delete',
  ASSIGN: 'service:assign',
  CLOSE: 'service:close',

  // 数据权限
  VIEW_ALL: 'service:view:all',
  VIEW_DEPARTMENT: 'service:view:department',
  VIEW_OWN: 'service:view:own',

  // 敏感信息权限
  VIEW_PHONE: 'service:view:phone',
  EXPORT: 'service:export'
}

// 检查权限
export function hasServicePermission(permission: string): boolean {
  const authStore = useAuthStore()
  return authStore.hasPermission(permission)
}

// 检查多个权限(需要全部满足)
export function hasAllServicePermissions(permissions: string[]): boolean {
  return permissions.every((p) => hasServicePermission(p))
}

// 检查多个权限(满足任一即可)
export function hasAnyServicePermission(permissions: string[]): boolean {
  return permissions.some((p) => hasServicePermission(p))
}

// 获取数据权限范围
export function getServiceDataScope(): 'all' | 'department' | 'own' {
  if (hasServicePermission(ServicePermissions.VIEW_ALL)) {
    return 'all'
  }
  if (hasServicePermission(ServicePermissions.VIEW_DEPARTMENT)) {
    return 'department'
  }
  return 'own'
}
