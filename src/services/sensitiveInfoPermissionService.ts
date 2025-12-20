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
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

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
      const response = await getSensitiveInfoPermissions()

      if (response && response.data && response.data.success && response.data.data) {
        this.permissionMatrix = response.data.data
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
   * 使用默认权限配置（超级管理员和管理员有权限，其他角色无权限）
   */
  private useDefaultPermissions(): void {
    const infoTypes = ['phone', 'id_card', 'email', 'wechat', 'address', 'bank', 'financial']
    const roles = ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service']

    this.permissionMatrix = {}

    infoTypes.forEach(infoType => {
      this.permissionMatrix![infoType] = {}
      roles.forEach(role => {
        // 默认只有超级管理员和管理员有权限
        this.permissionMatrix![infoType][role] = role === 'super_admin' || role === 'admin'
      })
    })

    this.saveToCache()
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

    // 如果仍然没有权限矩阵，使用默认规则
    if (!this.permissionMatrix) {
      // 默认规则：超级管理员和管理员有权限
      return roleCode === 'super_admin' || roleCode === 'admin'
    }

    // 转换infoType为字符串
    const infoTypeStr = infoType

    // 检查权限矩阵
    const typePermissions = this.permissionMatrix[infoTypeStr]
    if (!typePermissions) {
      // 如果没有配置该类型，默认只有超级管理员和管理员有权限
      return roleCode === 'super_admin' || roleCode === 'admin'
    }

    // 返回配置的权限值
    const hasAccess = typePermissions[roleCode]
    return hasAccess === true
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
