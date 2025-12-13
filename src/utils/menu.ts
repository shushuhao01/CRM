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
  console.log(`[hasMenuPermission] 检查菜单权限: ${menuItem.title}`)

  // 如果菜单项被隐藏，直接返回false
  if (menuItem.hidden) {
    console.log(`[hasMenuPermission] 菜单项被隐藏: ${menuItem.title}`)
    return false
  }

  // 超级管理员拥有所有权限，跳过所有权限检查
  if (userRole === 'super_admin' || userPermissions.includes('*')) {
    console.log(`[hasMenuPermission] 超级管理员权限，允许访问: ${menuItem.title}`)
    return true
  }

  // 检查角色权限
  if (menuItem.roles && menuItem.roles.length > 0) {
    console.log(`[hasMenuPermission] 检查角色权限 - 要求角色:`, menuItem.roles, '用户角色:', userRole)
    if (!menuItem.roles.includes(userRole)) {
      console.log(`[hasMenuPermission] 角色权限不匹配: ${menuItem.title}`)
      return false
    }
    console.log(`[hasMenuPermission] 角色权限匹配: ${menuItem.title}`)
  }

  // 检查具体权限
  if (menuItem.permissions && menuItem.permissions.length > 0) {
    console.log(`[hasMenuPermission] 检查具体权限 - 要求权限:`, menuItem.permissions, '用户权限:', userPermissions)

    // 🔥 修复：权限匹配函数，同时支持冒号格式(customer:list)和点号格式(customer.list)
    const matchPermission = (requiredPerm: string, userPerms: string[]): boolean => {
      // 直接匹配
      if (userPerms.includes(requiredPerm)) return true
      // 转换冒号为点号后匹配
      const dotFormat = requiredPerm.replace(/:/g, '.')
      if (userPerms.includes(dotFormat)) return true
      // 转换点号为冒号后匹配
      const colonFormat = requiredPerm.replace(/\./g, ':')
      if (userPerms.includes(colonFormat)) return true
      // 检查父级权限（如 customer 包含 customer:list）
      const parentPerm = requiredPerm.split(/[:.]/)[0]
      if (userPerms.includes(parentPerm)) return true
      return false
    }

    if (menuItem.requireAll) {
      // 需要所有权限
      const hasAllPerms = menuItem.permissions.every(permission => matchPermission(permission, userPermissions))
      console.log(`[hasMenuPermission] 需要所有权限，检查结果: ${hasAllPerms}`)
      return hasAllPerms
    } else {
      // 只需要其中一个权限
      const hasAnyPerm = menuItem.permissions.some(permission => matchPermission(permission, userPermissions))
      console.log(`[hasMenuPermission] 需要任一权限，检查结果: ${hasAnyPerm}`)
      return hasAnyPerm
    }
  }

  console.log(`[hasMenuPermission] 无特殊权限要求，允许访问: ${menuItem.title}`)
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
  console.log('[filterMenuItems] 开始过滤菜单项')
  console.log('[filterMenuItems] 输入菜单项数量:', menuItems.length)
  console.log('[filterMenuItems] 用户角色:', userRole)
  console.log('[filterMenuItems] 用户权限:', userPermissions)

  const filteredItems: MenuItem[] = []

  for (const item of menuItems) {
    console.log(`[filterMenuItems] 检查菜单项: ${item.title} (${item.id})`)
    console.log(`[filterMenuItems] 菜单项角色要求:`, item.roles)
    console.log(`[filterMenuItems] 菜单项权限要求:`, item.permissions)

    // 检查当前菜单项权限
    const hasPermission = hasMenuPermission(item, userRole, userPermissions)
    console.log(`[filterMenuItems] 权限检查结果: ${hasPermission}`)

    if (hasPermission) {
      const filteredItem: MenuItem = { ...item }

      // 如果有子菜单，递归过滤
      if (item.children && item.children.length > 0) {
        console.log(`[filterMenuItems] 菜单项 ${item.title} 有子菜单，递归过滤`)
        const filteredChildren = filterMenuItems(item.children, userRole, userPermissions)
        console.log(`[filterMenuItems] 子菜单过滤结果数量: ${filteredChildren.length}`)

        // 只有当子菜单不为空时才添加父菜单
        if (filteredChildren.length > 0) {
          filteredItem.children = filteredChildren
          filteredItems.push(filteredItem)
          console.log(`[filterMenuItems] 添加父菜单: ${item.title}`)
        } else {
          console.log(`[filterMenuItems] 子菜单为空，不添加父菜单: ${item.title}`)
        }
      } else {
        // 没有子菜单的直接添加
        filteredItems.push(filteredItem)
        console.log(`[filterMenuItems] 添加菜单项: ${item.title}`)
      }
    } else {
      console.log(`[filterMenuItems] 跳过菜单项: ${item.title}`)
    }
  }

  console.log('[filterMenuItems] 过滤完成，结果数量:', filteredItems.length)
  return filteredItems
}

/**
 * 获取用户可访问的菜单
 * @param menuItems 完整菜单配置
 * @returns 用户可访问的菜单
 */
export function getUserAccessibleMenus(menuItems: MenuItem[]): MenuItem[] {
  const userStore = useUserStore()

  console.log('[getUserAccessibleMenus] 开始获取用户可访问菜单')
  console.log('[getUserAccessibleMenus] userStore.currentUser:', userStore.currentUser)
  console.log('[getUserAccessibleMenus] userStore.permissions:', userStore.permissions)

  if (!userStore.currentUser) {
    console.log('[getUserAccessibleMenus] 用户未登录，返回空菜单')
    return []
  }

  const userRole = userStore.currentUser.role
  const userPermissions = userStore.permissions

  console.log('[getUserAccessibleMenus] 用户角色:', userRole)
  console.log('[getUserAccessibleMenus] 用户权限列表:', userPermissions)

  // 超级管理员和管理员拥有所有权限
  if (userRole === 'super_admin' || userRole === 'admin' || userPermissions.includes('*')) {
    console.log('[getUserAccessibleMenus] 超级管理员或管理员，返回所有菜单')
    return menuItems
  }

  console.log('[getUserAccessibleMenus] 普通用户，开始过滤菜单')
  const filteredMenus = filterMenuItems(menuItems, userRole, userPermissions)
  console.log('[getUserAccessibleMenus] 过滤后的菜单:', filteredMenus)

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
