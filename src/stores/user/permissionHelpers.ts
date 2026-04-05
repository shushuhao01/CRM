/**
 * 用户Store - 权限计算属性
 * 从 user/index.ts 中提取，集中管理角色判断和权限检查逻辑
 */
import { computed, type Ref } from 'vue'
import { permissionService, UserRole, PermissionLevel, SensitiveInfoType, DataScope } from '@/services/permission'
import { sensitiveInfoPermissionService } from '@/services/sensitiveInfoPermissionService'
import type { User } from './types'

/**
 * 创建权限相关的计算属性和方法
 * @param currentUser - 当前用户的响应式引用
 * @param permissions - 用户权限码列表的响应式引用
 */
export function createPermissionHelpers(
  currentUser: Ref<User | null>,
  permissions: Ref<string[]>
) {
  // ── 角色判断（同时支持英文代码和中文名称）──────────────

  const isAdmin = computed(() => {
    const role = currentUser.value?.role
    return role === 'super_admin' || role === 'admin' ||
           role === '超级管理员' || role === '管理员' || role === '系统管理员'
  })
  const isDepartmentManager = computed(() => {
    const role = currentUser.value?.role
    return role === 'department_manager' || role === '部门经理' || role === '部门负责人'
  })
  const isSalesStaff = computed(() => {
    const role = currentUser.value?.role
    return role === 'sales_staff' || role === 'sales' || role === '销售员' || role === '销售'
  })
  const isCustomerService = computed(() => {
    const role = currentUser.value?.role
    return role === 'customer_service' || role === '客服' || role === '客服人员'
  })

  // 兼容性计算属性
  const isManager = computed(() => isDepartmentManager.value || isAdmin.value)
  const isEmployee = computed(() => isSalesStaff.value)
  const isDepartmentHead = computed(() => isAdmin.value || isDepartmentManager.value)
  const user = computed(() => currentUser.value)

  // 新的权限系统计算属性
  const isSuperAdmin = computed(() => {
    if (!currentUser.value) return false
    return currentUser.value.role === 'super_admin' ||
           currentUser.value.role === 'admin' ||
           currentUser.value.userRole === UserRole.SUPER_ADMIN
  })

  const isWhitelistMember = computed(() => {
    if (!currentUser.value) return false
    return currentUser.value.userRole === UserRole.WHITELIST_MEMBER ||
           isDepartmentManager.value ||
           isSuperAdmin.value
  })

  const userPermissionLevel = computed(() => {
    if (!currentUser.value) return PermissionLevel.RESTRICTED
    const permission = permissionService.getUserPermission(currentUser.value.id)
    return permission?.permissions[0] || PermissionLevel.RESTRICTED
  })

  // ── 敏感信息权限 ──────────────────────────────────────

  const canViewPhone = computed(() => {
    if (!currentUser.value) return false
    return sensitiveInfoPermissionService.hasPermission(currentUser.value.role || '', 'phone')
  })

  const canAccessSensitiveInfo = computed(() => {
    return (infoType: SensitiveInfoType) => {
      if (!currentUser.value) return false
      const INFO_TYPE_DB_KEY: Record<string, string> = {
        [SensitiveInfoType.PHONE]: 'phone',
        [SensitiveInfoType.ID_CARD]: 'id_card',
        [SensitiveInfoType.EMAIL]: 'email',
        [SensitiveInfoType.WECHAT]: 'wechat',
        [SensitiveInfoType.ADDRESS]: 'address',
        [SensitiveInfoType.BANK_ACCOUNT]: 'bank',
        [SensitiveInfoType.FINANCIAL]: 'financial'
      }
      const dbKey = INFO_TYPE_DB_KEY[infoType] || infoType.toString()
      return sensitiveInfoPermissionService.hasPermission(currentUser.value.role || '', dbKey)
    }
  })

  // ── 数据访问权限 ──────────────────────────────────────

  const canAccessData = computed(() => {
    return (dataOwnerId?: string, dataDepartmentId?: string) => {
      if (!currentUser.value) return false
      const result = permissionService.checkDataAccess(currentUser.value.id, dataOwnerId, dataDepartmentId)
      return result.hasAccess
    }
  })

  const userDataScope = computed(() => {
    if (!currentUser.value) return DataScope.SELF
    const permission = permissionService.getUserPermission(currentUser.value.id)
    return permission?.dataScope || DataScope.SELF
  })

  const accessibleDepartments = computed(() => {
    if (!currentUser.value) return []
    return permissionService.getAccessibleDepartments(currentUser.value.id)
  })

  // ── 业务权限检查 ──────────────────────────────────────

  const canProcessAfterSales = computed(() => {
    if (!currentUser.value) return false
    if (isAdmin.value) return true
    return permissions.value.includes('service:process') ||
           permissions.value.includes('service:write') ||
           isDepartmentManager.value
  })

  const canEditAfterSales = computed(() => {
    if (!currentUser.value) return false
    if (isAdmin.value) return true
    return permissions.value.includes('service:edit') ||
           permissions.value.includes('service:write') ||
           isDepartmentManager.value
  })

  const canCloseAfterSales = computed(() => {
    if (!currentUser.value) return false
    if (isAdmin.value) return true
    return permissions.value.includes('service:close') ||
           permissions.value.includes('service:write') ||
           isDepartmentManager.value
  })

  const hasAfterSalesPermission = (permission: string) => {
    if (!currentUser.value) return false
    if (isAdmin.value) return true
    return permissions.value.includes(permission)
  }

  const canAccessLogisticsStatusUpdate = computed(() => {
    if (!currentUser.value) return false
    if (isSuperAdmin.value) return true
    if (isWhitelistMember.value) return true
    if (permissions.value.includes('logistics:status')) return true
    if (isDepartmentManager.value) return true
    if (currentUser.value.department === 'logistics' &&
        currentUser.value.position === 'supervisor') return true
    return false
  })

  const hasLogisticsPermission = (permission: string) => {
    if (!currentUser.value) return false
    if (isAdmin.value) return true
    return permissions.value.includes(permission)
  }

  return {
    // 角色判断
    isAdmin,
    isDepartmentManager,
    isSalesStaff,
    isCustomerService,
    isManager,
    isEmployee,
    isDepartmentHead,
    user,
    isSuperAdmin,
    isWhitelistMember,
    // 权限级别
    userPermissionLevel,
    // 敏感信息
    canViewPhone,
    canAccessSensitiveInfo,
    // 数据访问
    canAccessData,
    userDataScope,
    accessibleDepartments,
    // 业务权限
    canProcessAfterSales,
    canEditAfterSales,
    canCloseAfterSales,
    hasAfterSalesPermission,
    canAccessLogisticsStatusUpdate,
    hasLogisticsPermission,
  }
}

