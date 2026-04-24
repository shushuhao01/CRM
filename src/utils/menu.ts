import type { MenuItem } from '@/config/menu'
import { useUserStore } from '@/stores/user'
import { moduleStatusService } from '@/services/moduleStatusService'

// 只在开发环境输出详细日志
const DEBUG = import.meta.env.DEV
const debugLog = (...args: any[]) => { if (DEBUG) console.log(...args) }

/**
 * 检查用户是否有权限访问菜单项
 */
export function hasMenuPermission(
  menuItem: MenuItem,
  userRole: string,
  userPermissions: string[]
): boolean {
  // 如果菜单项被隐藏，直接返回false
  if (menuItem.hidden) {
    return false
  }

  // 超级管理员拥有所有权限
  if (userRole === 'super_admin' || userPermissions.includes('*')) {
    return true
  }

  // 🔥 角色名规范化：manager 视为 department_manager
  const effectiveRole = userRole === 'manager' ? 'department_manager' : userRole

  // 🔥 定义系统预设角色列表
  const systemRoles = ['super_admin', 'admin', 'department_manager', 'manager', 'sales_staff', 'customer_service']
  const isSystemRole = systemRoles.includes(userRole)

  // 检查角色权限 - 只对系统预设角色进行角色检查，自定义角色跳过角色检查
  // 🔥 customer_service 角色的菜单可见性完全由自定义权限决定，跳过 roles 数组检查
  if (menuItem.roles && menuItem.roles.length > 0 && isSystemRole && effectiveRole !== 'customer_service') {
    if (!menuItem.roles.includes(effectiveRole)) {
      return false
    }
  }

  // 检查具体权限
  if (menuItem.permissions && menuItem.permissions.length > 0) {
    // 🔥 权限匹配函数，同时支持冒号格式(customer:list)和点号格式(customer.list)
    const matchPermission = (requiredPerm: string, userPerms: string[]): boolean => {
      if (userPerms.includes(requiredPerm)) return true
      const dotFormat = requiredPerm.replace(/:/g, '.')
      if (userPerms.includes(dotFormat)) return true
      const colonFormat = requiredPerm.replace(/\./g, ':')
      if (userPerms.includes(colonFormat)) return true
      const parentPerm = requiredPerm.split(/[:.]/)[0]
      if (userPerms.includes(parentPerm)) return true
      // 🔥 前缀匹配：检查用户是否拥有更细粒度的子权限（如 requiredPerm='customer' 且用户有 'customer:list:view'）
      const colonPrefix = colonFormat + ':'
      const dotPrefix = dotFormat + '.'
      if (userPerms.some(p => p.startsWith(colonPrefix) || p.startsWith(dotPrefix))) return true
      return false
    }

    if (menuItem.requireAll) {
      return menuItem.permissions.every(permission => matchPermission(permission, userPermissions))
    } else {
      return menuItem.permissions.some(permission => matchPermission(permission, userPermissions))
    }
  }

  return true
}

/**
 * 过滤菜单项，只返回用户有权限访问的菜单
 */
export function filterMenuItems(
  menuItems: MenuItem[],
  userRole: string,
  userPermissions: string[]
): MenuItem[] {
  debugLog('[filterMenuItems] 输入菜单项数量:', menuItems.length, '用户角色:', userRole)

  const filteredItems: MenuItem[] = []

  for (const item of menuItems) {
    // 跳过隐藏的菜单项
    if (item.hidden) continue

    const hasPermission = hasMenuPermission(item, userRole, userPermissions)

    if (hasPermission) {
      const filteredItem: MenuItem = { ...item }

      // 如果有子菜单，递归过滤
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuItems(item.children, userRole, userPermissions)

        if (filteredChildren.length > 0) {
          filteredItem.children = filteredChildren
          filteredItems.push(filteredItem)
        }
      } else {
        filteredItems.push(filteredItem)
      }
    }
  }

  debugLog('[filterMenuItems] 过滤完成，结果数量:', filteredItems.length)
  return filteredItems
}

/**
 * 获取用户可访问的菜单
 */
export async function getUserAccessibleMenus(menuItems: MenuItem[]): Promise<MenuItem[]> {
  const userStore = useUserStore()

  if (!userStore.currentUser) {
    debugLog('[getUserAccessibleMenus] 用户未登录，返回空菜单')
    return []
  }

  const userRole = userStore.currentUser.role
  const userPermissions = userStore.permissions

  debugLog('[getUserAccessibleMenus] 用户角色:', userRole, '权限数量:', userPermissions.length)

  // ========== 第一步: 模块过滤(功能级控制) ==========
  let enabledModules: string[] = []
  try {
    enabledModules = await moduleStatusService.getEnabledModules()
    debugLog('[模块过滤] 启用的模块:', enabledModules)
  } catch (error) {
    console.error('[模块过滤] 获取模块状态失败，使用默认配置:', error)
    enabledModules = [
      'dashboard', 'customer', 'order', 'finance', 'logistics',
      'service', 'data', 'performance', 'product', 'service-management', 'wecom', 'system'
    ]
  }

  // 根据模块状态过滤菜单
  const filterByModuleStatus = (items: MenuItem[], isTopLevel = true): MenuItem[] => {
    const result = items.filter(item => {
      // dashboard始终显示
      if (item.id === 'dashboard') return true

      // 只对顶层菜单检查模块状态，子菜单不检查
      if (isTopLevel && item.id && !enabledModules.includes(item.id)) {
        debugLog(`[filterByModuleStatus] 模块未启用: ${item.title} (${item.id})`)
        return false
      }

      return true
    }).map(item => {
      if (item.children && item.children.length > 0) {
        return { ...item, children: item.children.map(child => ({ ...child })) }
      }
      return { ...item }
    })

    return result
  }

  const filteredByModule = filterByModuleStatus([...menuItems])
  debugLog('[模块过滤] 过滤后菜单数量:', filteredByModule.length)

  // ========== 第二步: 权限过滤(用户级控制) ==========
  if (userRole === 'super_admin' || userRole === 'admin' || userPermissions.includes('*')) {
    debugLog('[权限过滤] 管理员权限，返回所有启用模块')
    const result = filteredByModule.filter(item => !item.hidden).map(item => {
      if (item.children) {
        return { ...item, children: item.children.filter(child => !child.hidden) }
      }
      return item
    })
    return result
  }

  // 普通用户根据权限过滤
  const filteredMenus = filterMenuItems(filteredByModule, userRole, userPermissions)
  debugLog('[权限过滤] 最终菜单数量:', filteredMenus.length)

  return filteredMenus
}

/**
 * 检查用户是否可以访问指定路径
 * @param path 路径
 * @param menuItems 菜单配置
 * @returns 是否可以访问
 */
export function canAccessPath(path: string, menuItems: MenuItem[]): boolean {
  const userStore = useUserStore()

  if (!userStore.currentUser) {
    return false
  }

  // 超级管理员和管理员可以访问所有路径
  if (userStore.currentUser.role === 'super_admin' || userStore.currentUser.role === 'admin' || userStore.permissions.includes('*')) {
    return true
  }

  const userRole = userStore.currentUser.role
  const userPermissions = userStore.permissions

  // 递归查找路径对应的菜单项
  function findMenuItemByPath(items: MenuItem[], targetPath: string): MenuItem | null {
    for (const item of items) {
      if (item.path === targetPath) {
        return item
      }
      if (item.children) {
        const found = findMenuItemByPath(item.children, targetPath)
        if (found) {
          return found
        }
      }
    }
    return null
  }

  const menuItem = findMenuItemByPath(menuItems, path)
  if (!menuItem) {
    // 如果找不到对应的菜单项，默认允许访问（可能是动态路由）
    return true
  }

  return hasMenuPermission(menuItem, userRole, userPermissions)
}

/**
 * 获取菜单项的面包屑路径
 * @param path 当前路径
 * @param menuItems 菜单配置
 * @returns 面包屑路径
 */
export function getMenuBreadcrumb(path: string, menuItems: MenuItem[]): MenuItem[] {
  const breadcrumb: MenuItem[] = []

  function findPath(items: MenuItem[], targetPath: string, currentPath: MenuItem[] = []): boolean {
    for (const item of items) {
      const newPath = [...currentPath, item]

      if (item.path === targetPath) {
        breadcrumb.push(...newPath)
        return true
      }

      if (item.children && findPath(item.children, targetPath, newPath)) {
        return true
      }
    }
    return false
  }

  findPath(menuItems, path)
  return breadcrumb
}

/**
 * 根据角色获取默认首页路径
 * @param role 用户角色
 * @returns 默认首页路径
 */
export function getDefaultHomePath(role: string): string {
  const roleHomeMap: Record<string, string> = {
    admin: '/dashboard',
    manager: '/dashboard',
    employee: '/customer/list',
    sales_staff: '/customer/list',
    customer_service: '/service/list'
  }

  return roleHomeMap[role] || '/dashboard'
}
