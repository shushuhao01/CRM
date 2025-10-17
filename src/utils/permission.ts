// 权限验证工具类
import { PERMISSION_TREE, type Permission } from '@/types/permissions'

// 用户权限存储
let userPermissions: string[] = []

/**
 * 设置用户权限
 * @param permissions 用户权限代码数组
 */
export function setUserPermissions(permissions: string[]) {
  userPermissions = permissions
}

/**
 * 获取用户权限
 * @returns 用户权限代码数组
 */
export function getUserPermissions(): string[] {
  return userPermissions
}

/**
 * 检查用户是否有指定权限
 * @param permissionCode 权限代码
 * @returns 是否有权限
 */
export function hasPermission(permissionCode: string): boolean {
  if (!permissionCode) return true
  
  // 超级管理员拥有所有权限（检查特殊权限标识 *）
  if (userPermissions.includes('*')) {
    return true
  }
  
  // 如果用户有管理员权限，则拥有所有权限
  if (userPermissions.includes('admin') || userPermissions.includes('system')) {
    return true
  }
  
  // 检查是否有直接权限
  if (userPermissions.includes(permissionCode)) {
    return true
  }
  
  // 检查是否有父级权限
  const permission = findPermissionByCode(permissionCode)
  if (permission && permission.parentId) {
    const parentPermission = findPermissionById(permission.parentId)
    if (parentPermission) {
      return hasPermission(parentPermission.code)
    }
  }
  
  return false
}

/**
 * 检查用户是否有任意一个权限
 * @param permissionCodes 权限代码数组
 * @returns 是否有任意一个权限
 */
export function hasAnyPermission(permissionCodes: string[]): boolean {
  return permissionCodes.some(code => hasPermission(code))
}

/**
 * 检查用户是否有所有权限
 * @param permissionCodes 权限代码数组
 * @returns 是否有所有权限
 */
export function hasAllPermissions(permissionCodes: string[]): boolean {
  return permissionCodes.every(code => hasPermission(code))
}

/**
 * 根据权限代码查找权限
 * @param code 权限代码
 * @returns 权限对象或null
 */
function findPermissionByCode(code: string): Permission | null {
  function search(permissions: Permission[]): Permission | null {
    for (const permission of permissions) {
      if (permission.code === code) {
        return permission
      }
      if (permission.children) {
        const found = search(permission.children)
        if (found) return found
      }
    }
    return null
  }
  
  return search(PERMISSION_TREE)
}

/**
 * 根据权限ID查找权限
 * @param id 权限ID
 * @returns 权限对象或null
 */
function findPermissionById(id: string): Permission | null {
  function search(permissions: Permission[]): Permission | null {
    for (const permission of permissions) {
      if (permission.id === id) {
        return permission
      }
      if (permission.children) {
        const found = search(permission.children)
        if (found) return found
      }
    }
    return null
  }
  
  return search(PERMISSION_TREE)
}

/**
 * 获取用户可访问的菜单
 * @returns 可访问的菜单数组
 */
export function getAccessibleMenus(): Permission[] {
  function filterMenus(permissions: Permission[]): Permission[] {
    return permissions.filter(permission => {
      // 检查是否有权限访问此菜单
      if (!hasPermission(permission.code)) {
        return false
      }
      
      // 递归过滤子菜单
      if (permission.children) {
        permission.children = filterMenus(permission.children)
      }
      
      return true
    })
  }
  
  return filterMenus(JSON.parse(JSON.stringify(PERMISSION_TREE)))
}

/**
 * 检查按钮权限
 * @param actionCode 操作代码
 * @param menuCode 菜单代码（可选）
 * @returns 是否有权限
 */
export function hasButtonPermission(actionCode: string, menuCode?: string): boolean {
  if (menuCode) {
    return hasPermission(`${menuCode}:${actionCode}`)
  }
  return hasPermission(actionCode)
}

/**
 * 权限指令，用于v-permission
 * @param el 元素
 * @param binding 绑定值
 */
export function permissionDirective(el: HTMLElement, binding: any) {
  const { value } = binding
  
  if (value) {
    let hasAuth = false
    
    if (Array.isArray(value)) {
      // 如果是数组，检查是否有任意一个权限
      hasAuth = hasAnyPermission(value)
    } else {
      // 如果是字符串，检查单个权限
      hasAuth = hasPermission(value)
    }
    
    if (!hasAuth) {
      // 没有权限则隐藏元素
      el.style.display = 'none'
    }
  }
}

/**
 * 权限检查装饰器（用于Vue组件方法）
 * @param permissionCode 权限代码
 */
export function requirePermission(permissionCode: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = function (...args: any[]) {
      if (hasPermission(permissionCode)) {
        return originalMethod.apply(this, args)
      } else {
        console.warn(`权限不足: ${permissionCode}`)
        // 可以在这里显示权限不足的提示
        return false
      }
    }
    
    return descriptor
  }
}