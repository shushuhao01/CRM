import type { MenuItem } from '@/config/menu'
import { useUserStore } from '@/stores/user'

/**
 * 检查用户是否有权限访问菜单项
 * @param menuItem 菜单项
 * @param userRole 用户角色
 * @param userPermissions 用户权限列表
 * @returns 是否有权限
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

  // 超级管理员拥有所有权限，跳过所有权限检查
  if (userRole === 'super_admin' || userPermissions.includes('*')) {
    return true
  }

  // 检查角色权限
  if (menuItem.roles && menuItem.roles.length > 0) {
    if (!menuItem.roles.includes(userRole)) {
      return false
    }
  }

  // 检查具体权限
  if (menuItem.permissions && menuItem.permissions.length > 0) {
    if (menuItem.requireAll) {
      // 需要所有权限
      return menuItem.permissions.every(permission => userPermissions.includes(permission))
    } else {
      // 只需要其中一个权限
      return menuItem.permissions.some(permission => userPermissions.includes(permission))
    }
  }

  return true
}

/**
 * 过滤菜单项，只返回用户有权限访问的菜单
 * @param menuItems 菜单项列表
 * @param userRole 用户角色
 * @param userPermissions 用户权限列表
 * @returns 过滤后的菜单项列表
 */
export function filterMenuItems(
  menuItems: MenuItem[],
  userRole: string,
  userPermissions: string[]
): MenuItem[] {
  const filteredItems: MenuItem[] = []

  for (const item of menuItems) {
    // 检查当前菜单项权限
    if (hasMenuPermission(item, userRole, userPermissions)) {
      const filteredItem: MenuItem = { ...item }

      // 如果有子菜单，递归过滤
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuItems(item.children, userRole, userPermissions)

        // 只有当子菜单不为空时才添加父菜单
        if (filteredChildren.length > 0) {
          filteredItem.children = filteredChildren
          filteredItems.push(filteredItem)
        }
      } else {
        // 没有子菜单的直接添加
        filteredItems.push(filteredItem)
      }
    }
  }

  return filteredItems
}

/**
 * 获取用户可访问的菜单
 * @param menuItems 完整菜单配置
 * @returns 用户可访问的菜单
 */
export function getUserAccessibleMenus(menuItems: MenuItem[]): MenuItem[] {
  const userStore = useUserStore()

  if (!userStore.currentUser) {
    return []
  }

  const userRole = userStore.currentUser.role
  const userPermissions = userStore.permissions

  // 超级管理员和管理员拥有所有权限
  if (userRole === 'super_admin' || userRole === 'admin' || userPermissions.includes('*')) {
    return menuItems
  }

  return filterMenuItems(menuItems, userRole, userPermissions)
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
