/**
 * 敏感信息权限服务
 * 从后端API获取权限配置，与数据库中的sensitive_info_permissions表同步
 */

import { getSensitiveInfoPermissions } from '@/api/sensitiveInfoPermission'

// 权限矩阵类型
export interface SensitiveInfoPermissionMatrix {
  [infoType: string]: {
    [roleCode: string]: boolean
  }
}

// 缓存配置
const CACHE_KEY = 'crm_sensitive_info_permissions_cache'
const CACHE_EXPIRY_KEY = 'crm_sensitive_info_permissions_expiry'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时缓存（登出时会清除）

class SensitiveInfoPermissionService {
  private static instance: SensitiveInfoPermissionService
  private permissionMatrix: SensitiveInfoPermissionMatrix | null = null
  private isLoading = false
  private loadPromise: Promise<void> | null = null

  public static getInstance(): SensitiveInfoPermissionService {
    if (!SensitiveInfoPermissionService.instance) {
      SensitiveInfoPermissionService.instance = new SensitiveInfoPermissionService()
    }
    return SensitiveInfoPermissionService.instance
  }

  constructor() {
    // 尝试从缓存加载
    this.loadFromCache()
  }

  /**
   * 从localStorage缓存加载权限配置
   */
  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      const expiry = localStorage.getItem(CACHE_EXPIRY_KEY)

      if (cached && expiry) {
        const expiryTime = parseInt(expiry, 10)
        if (Date.now() < expiryTime) {
          this.permissionMatrix = JSON.parse(cached)
          console.log('[SensitiveInfoPermission] 从缓存加载权限配置')
        }
      }
    } catch (error) {
      console.warn('[SensitiveInfoPermission] 加载缓存失败:', error)
    }
  }

  /**
   * 保存权限配置到缓存
   */
  private saveToCache(): void {
    try {
      if (this.permissionMatrix) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(this.permissionMatrix))
        localStorage.setItem(CACHE_EXPIRY_KEY, String(Date.now() + CACHE_DURATION))
      }
    } catch (error) {
      console.warn('[SensitiveInfoPermission] 保存缓存失败:', error)
    }
  }

  /**
   * 从API加载权限配置
   */
  public async loadPermissions(): Promise<void> {
    // 如果正在加载，等待加载完成
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise
    }

    this.isLoading = true
    this.loadPromise = this._loadPermissionsInternal()

    try {
      await this.loadPromise
    } finally {
      this.isLoading = false
      this.loadPromise = null
    }
  }

  private async _loadPermissionsInternal(): Promise<void> {
    try {
      // request 拦截器已解包 response.data，返回的就是 data 字段的值（权限矩阵对象）
      const data = await getSensitiveInfoPermissions() as any

      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        this.permissionMatrix = data
        this.saveToCache()
        console.log('[SensitiveInfoPermission] 权限配置加载成功')
      } else {
        console.warn('[SensitiveInfoPermission] API返回数据格式不正确，使用默认配置')
        this.useDefaultPermissions()
      }
    } catch (error) {
      console.error('[SensitiveInfoPermission] 加载权限配置失败:', error)
      // 加载失败时使用默认配置
      this.useDefaultPermissions()
    }
  }

  /**
   * 使用默认权限配置（只有超级管理员有权限，其他角色无权限）
   */
  private useDefaultPermissions(): void {
    const infoTypes = ['phone', 'id_card', 'email', 'wechat', 'address', 'bank', 'financial']
    const roles = ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service']

    this.permissionMatrix = {}

    infoTypes.forEach(infoType => {
      this.permissionMatrix![infoType] = {}
      roles.forEach(role => {
        // 默认只有超级管理员有权限，其他角色无权限（加密显示）
        this.permissionMatrix![infoType][role] = role === 'super_admin'
      })
    })

    this.saveToCache()
  }

  // 常见角色名称到角色代码的映射（容错）
  private static ROLE_NAME_MAP: Record<string, string> = {
    '销售员': 'sales_staff',
    '销售': 'sales_staff',
    '客服': 'customer_service',
    '客服人员': 'customer_service',
    '部门经理': 'department_manager',
    '经理': 'department_manager',
    '管理员': 'admin',
    '系统管理员': 'super_admin',
    '超级管理员': 'super_admin',
    'sales': 'sales_staff',
    'service': 'customer_service',
    'manager': 'department_manager'
  }

  /**
   * 检查用户角色是否有权限查看特定敏感信息
   * @param roleCode 角色代码
   * @param infoType 敏感信息类型（字符串）
   * @returns 是否有权限
   */
  public hasPermission(roleCode: string, infoType: string): boolean {
    // 如果权限矩阵未加载，尝试从缓存加载
    if (!this.permissionMatrix) {
      this.loadFromCache()
    }

    // 如果仍然没有权限矩阵，触发异步加载并使用默认规则
    if (!this.permissionMatrix) {
      console.warn(`[SensitiveInfoPermission] 权限矩阵未加载，角色=${roleCode}, 类型=${infoType}，使用默认规则`)
      // 触发异步加载（下次调用时可能就有了）
      this.loadPermissions().catch(() => {})
      return roleCode === 'super_admin'
    }

    // 检查权限矩阵
    const typePermissions = this.permissionMatrix[infoType]
    if (!typePermissions) {
      console.warn(`[SensitiveInfoPermission] 类型 ${infoType} 未在权限矩阵中找到`)
      return roleCode === 'super_admin'
    }

    // 精确匹配
    if (typePermissions[roleCode] !== undefined) {
      return !!typePermissions[roleCode]
    }

    // 角色名称容错：尝试将中文角色名映射为标准代码
    const mappedCode = SensitiveInfoPermissionService.ROLE_NAME_MAP[roleCode]
    if (mappedCode && typePermissions[mappedCode] !== undefined) {
      console.log(`[SensitiveInfoPermission] 角色名映射: ${roleCode} → ${mappedCode}, 权限=${typePermissions[mappedCode]}`)
      return !!typePermissions[mappedCode]
    }

    // 反向查找：如果 roleCode 不在矩阵中，遍历矩阵键看是否有大小写不敏感匹配
    const lowerRoleCode = roleCode.toLowerCase()
    for (const key of Object.keys(typePermissions)) {
      if (key.toLowerCase() === lowerRoleCode) {
        console.log(`[SensitiveInfoPermission] 大小写容错匹配: ${roleCode} → ${key}, 权限=${typePermissions[key]}`)
        return !!typePermissions[key]
      }
    }

    console.warn(`[SensitiveInfoPermission] 角色 "${roleCode}" 未在 ${infoType} 权限矩阵中找到。矩阵键: [${Object.keys(typePermissions).join(', ')}]`)
    return false
  }

  /**
   * 获取角色对所有敏感信息类型的权限
   * @param roleCode 角色代码
   * @returns 权限映射
   */
  public getRolePermissions(roleCode: string): Record<string, boolean> {
    const result: Record<string, boolean> = {}
    const infoTypes = ['phone', 'id_card', 'email', 'wechat', 'address', 'bank', 'financial']

    infoTypes.forEach(infoType => {
      result[infoType] = this.hasPermission(roleCode, infoType)
    })

    return result
  }

  /**
   * 清除缓存并重新加载
   */
  public async refresh(): Promise<void> {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_EXPIRY_KEY)
    this.permissionMatrix = null
    await this.loadPermissions()
  }

  /**
   * 获取当前权限矩阵
   */
  public getPermissionMatrix(): SensitiveInfoPermissionMatrix | null {
    return this.permissionMatrix
  }

  /**
   * 检查权限是否已加载
   */
  public isLoaded(): boolean {
    return this.permissionMatrix !== null
  }
}

// 导出单例实例
export const sensitiveInfoPermissionService = SensitiveInfoPermissionService.getInstance()

// 导出便捷函数
export const hasSensitiveInfoPermission = (roleCode: string, infoType: string): boolean => {
  return sensitiveInfoPermissionService.hasPermission(roleCode, infoType)
}

export const loadSensitiveInfoPermissions = async (): Promise<void> => {
  return sensitiveInfoPermissionService.loadPermissions()
}

export const refreshSensitiveInfoPermissions = async (): Promise<void> => {
  return sensitiveInfoPermissionService.refresh()
}
