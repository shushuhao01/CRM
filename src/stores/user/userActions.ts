/**
 * 用户Store — 用户管理与工具方法
 * 从 stores/user.ts 提取，包含用户列表管理、权限检查、手机号设置等
 *
 * 🔧 任务3.5 拆分产物 — 2026-03-31
 */
import type { Ref, ComputedRef } from 'vue'
import { permissionService, UserRole, PermissionLevel, SensitiveInfoType, DataScope } from '@/services/permission'
import type { User, PhoneViewSettings, UserStoreDeps } from './types'

interface UserActionsDeps extends UserStoreDeps {
  isAdmin: ComputedRef<boolean>
  phoneViewSettings: Ref<PhoneViewSettings>
}

/**
 * 创建用户管理相关的动作方法
 * @param deps - Store 核心响应式状态引用 + 额外依赖
 */
export function createUserActions(deps: UserActionsDeps) {
  const { currentUser, permissions, users, isAdmin, phoneViewSettings } = deps

  // ── 用户列表管理 ──────────────────────────────────────

  const loadUsers = async () => {
    console.log('[UserStore] 开始加载用户列表...')
    try {
      const { default: userDataService } = await import('@/services/userDataService')
      const loadedUsers = await userDataService.getUsers()

      if (loadedUsers.length > 0) {
        users.value = loadedUsers.map((user: any) => ({
          id: user.id,
          name: user.realName || user.name || user.username,
          username: user.username,
          realName: user.realName || user.name,
          employeeNumber: user.employeeNumber,
          email: user.email,
          role: user.role,
          department: user.departmentName || user.department || '未分配',
          departmentId: user.departmentId,
          departmentName: user.departmentName || user.department || '未分配',
          position: user.position || '员工',
          avatar: user.avatar,
          status: user.status || 'active',
          createTime: user.createTime || user.createdAt,
          createdAt: user.createdAt,
          employmentStatus: user.employmentStatus || 'active',
          isOnline: user.isOnline || false,
          loginCount: user.loginCount || 0,
          lastLoginTime: user.lastLoginTime || user.lastLoginAt || ''
        }))

        console.log('[UserStore] ✅ 用户列表已加载:', users.value.length, '个用户')
        console.log('[UserStore] 数据来源:', userDataService.getCurrentMode())
        console.log('[UserStore] 用户列表:', users.value.map(u => ({ id: u.id, name: u.name, department: u.department })))
      } else {
        console.warn('[UserStore] ⚠️ 未获取到用户数据，用户列表为空')
        users.value = []
      }
    } catch (error) {
      console.error('[UserStore] ❌ 加载用户列表失败:', error)
      users.value = []
    }
  }

  const getUserById = (userId: string) => {
    return users.value.find(user => String(user.id) === String(userId))
  }

  const updateUser = (userData: Partial<User>) => {
    if (currentUser.value) {
      currentUser.value = { ...currentUser.value, ...userData }
    }
  }

  // ── 权限检查 ──────────────────────────────────────────

  const hasPermission = (permission: string) => {
    if (permissions.value.includes('*')) {
      return true
    }
    return permissions.value.includes(permission) || isAdmin.value
  }

  // ── 手机号查看权限管理 ────────────────────────────────

  const updatePhoneViewSettings = (settings: Partial<PhoneViewSettings>) => {
    phoneViewSettings.value = { ...phoneViewSettings.value, ...settings }
    localStorage.setItem('phoneViewSettings', JSON.stringify(phoneViewSettings.value))
  }

  const addToPhoneWhitelist = (userId: string) => {
    if (!phoneViewSettings.value.whitelist.includes(userId)) {
      phoneViewSettings.value.whitelist.push(userId)
      localStorage.setItem('phoneViewSettings', JSON.stringify(phoneViewSettings.value))
    }
  }

  const removeFromPhoneWhitelist = (userId: string) => {
    const index = phoneViewSettings.value.whitelist.indexOf(userId)
    if (index > -1) {
      phoneViewSettings.value.whitelist.splice(index, 1)
      localStorage.setItem('phoneViewSettings', JSON.stringify(phoneViewSettings.value))
    }
  }

  const initPhoneViewSettings = () => {
    const saved = localStorage.getItem('phoneViewSettings')
    if (saved) {
      phoneViewSettings.value = JSON.parse(saved)
    }
  }

  // ── 权限管理方法 ──────────────────────────────────────

  const checkSensitiveInfoAccess = (infoType: SensitiveInfoType) => {
    if (!currentUser.value) return false
    const result = permissionService.checkSensitiveInfoAccess(currentUser.value.id, infoType)
    return result
  }

  const getUserPermissionInfo = () => {
    if (!currentUser.value) return null
    return permissionService.getUserPermission(currentUser.value.id)
  }

  const updateUserPermission = (userRole: UserRole, sensitiveInfoTypes?: SensitiveInfoType[]) => {
    if (!currentUser.value) return false

    const permission = {
      userId: currentUser.value.id,
      role: userRole,
      permissions: userRole === UserRole.SUPER_ADMIN
        ? [PermissionLevel.FULL_ACCESS]
        : userRole === UserRole.WHITELIST_MEMBER
          ? [PermissionLevel.PARTIAL_ACCESS]
          : [PermissionLevel.RESTRICTED],
      dataScope: userRole === UserRole.SUPER_ADMIN ? DataScope.ALL
        : userRole === UserRole.DEPARTMENT_MANAGER ? DataScope.DEPARTMENT
        : DataScope.SELF,
      whitelistTypes: sensitiveInfoTypes
    }

    permissionService.setUserPermission(permission)

    currentUser.value.userRole = userRole
    currentUser.value.permissionLevel = permission.permissions[0]
    currentUser.value.sensitiveInfoAccess = sensitiveInfoTypes

    return true
  }

  // ── 开发工具 ──────────────────────────────────────────

  const clearUserDatabaseCache = () => {
    localStorage.removeItem('userDatabase')
    console.log('[Dev] 用户数据库缓存已清除，将使用最新的默认数据')
  }

  return {
    loadUsers,
    getUserById,
    updateUser,
    hasPermission,
    updatePhoneViewSettings,
    addToPhoneWhitelist,
    removeFromPhoneWhitelist,
    initPhoneViewSettings,
    checkSensitiveInfoAccess,
    getUserPermissionInfo,
    updateUserPermission,
    clearUserDatabaseCache,
  }
}




