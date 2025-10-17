/**
 * 角色权限API服务
 * 处理角色权限、用户权限等功能
 */
import { apiService, ApiService } from './apiService'
import type { PaginationParams, PaginatedResponse } from './apiService'
import permissionService from './permissionService.js'

export interface Permission {
  id: string
  name: string
  code: string
  description?: string
  module: string
  type: 'menu' | 'button' | 'api'
  parentId?: string
  children?: Permission[]
}

export interface RolePermission {
  roleId: string
  roleName: string
  permissions: Permission[]
}

export interface UserPersonalPermission {
  userId: number
  permissions: Permission[]
  grantedBy?: string
  grantedAt?: string
}

export interface OperationLog {
  id: string
  userId: number
  username: string
  action: string
  module: string
  description: string
  ip: string
  userAgent: string
  createdAt: string
}

export class RolePermissionService {
  private static instance: RolePermissionService
  private api: ApiService

  constructor() {
    this.api = apiService
  }

  static getInstance(): RolePermissionService {
    if (!RolePermissionService.instance) {
      RolePermissionService.instance = new RolePermissionService()
    }
    return RolePermissionService.instance
  }

  /**
   * 根据角色ID获取角色名称
   */
  private getRoleNameById(roleId: string): string {
    const roleMap: Record<string, string> = {
      '1': '超级管理员',
      '2': '管理员',
      '3': '经理',
      '4': '员工',
      '5': '客服'
    }
    return roleMap[roleId] || '未知角色'
  }

  /**
   * 获取角色权限
   */
  async getRolePermissions(roleId: string): Promise<RolePermission> {
    try {
      // 首先尝试从本地存储获取
      const rolePermissionsKey = 'crm_role_permissions'
      const localData = JSON.parse(localStorage.getItem(rolePermissionsKey) || '{}')
      
      if (localData[roleId]) {
        console.log(`[RolePermissionAPI] 从本地存储获取角色权限: ${roleId}`)
        // 从本地存储构建返回数据
        const allPermissions = await this.getAllPermissions()
        const rolePermissionIds = localData[roleId].permissionIds
        const permissions = allPermissions.filter(p => rolePermissionIds.includes(p.id))
        
        return {
          roleId,
          roleName: this.getRoleNameById(roleId),
          permissions
        }
      }
      
      // 如果本地没有，尝试从API获取
      try {
        const response = await this.api.get<RolePermission>(`/roles/${roleId}/permissions`)
        console.log(`[RolePermissionAPI] 从API获取角色权限成功: ${roleId}`)
        return response
      } catch (apiError) {
        console.warn(`[RolePermissionAPI] API获取失败，使用默认权限: ${roleId}`, apiError)
        // 如果API也失败，返回默认权限
        return {
          roleId,
          roleName: this.getRoleNameById(roleId),
          permissions: []
        }
      }
    } catch (error) {
      console.error(`[RolePermissionAPI] 获取角色权限失败 (Role: ${roleId}):`, error)
      throw error
    }
  }

  /**
   * 保存角色权限
   */
  async saveRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    try {
      // 先保存到本地存储以实现持久化
      const rolePermissionsKey = 'crm_role_permissions'
      const existingData = JSON.parse(localStorage.getItem(rolePermissionsKey) || '{}')
      existingData[roleId] = {
        roleId,
        permissionIds,
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem(rolePermissionsKey, JSON.stringify(existingData))
      
      // 然后调用后端API（如果后端可用）
      try {
        await this.api.put(`/roles/${roleId}/permissions`, { permissionIds })
      } catch (apiError) {
        console.warn(`[RolePermissionAPI] 后端API调用失败，但本地存储已保存: ${roleId}`, apiError)
      }
      
      // 通知权限更新
      permissionService.notifyPermissionUpdate(roleId)
      
      console.log(`[RolePermissionAPI] 保存角色权限成功: ${roleId}`, permissionIds)
    } catch (error) {
      console.error(`[RolePermissionAPI] 保存角色权限失败 (Role: ${roleId}):`, error)
      throw error
    }
  }

  /**
   * 获取所有权限列表
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const response = await this.api.get<Permission[]>('/permissions')
      console.log('[RolePermissionAPI] 获取所有权限成功')
      return response
    } catch (error) {
      console.error('[RolePermissionAPI] 获取所有权限失败:', error)
      throw error
    }
  }

  /**
   * 获取用户个人权限
   */
  async getUserPersonalPermissions(userId: number): Promise<UserPersonalPermission> {
    try {
      const response = await this.api.get<UserPersonalPermission>(`/users/${userId}/personal-permissions`)
      console.log(`[RolePermissionAPI] 获取用户个人权限成功: ${userId}`)
      return response
    } catch (error) {
      console.error(`[RolePermissionAPI] 获取用户个人权限失败 (User: ${userId}):`, error)
      throw error
    }
  }

  /**
   * 保存用户个人权限
   */
  async saveUserPersonalPermissions(userId: number, permissionIds: string[]): Promise<void> {
    try {
      await this.api.put(`/users/${userId}/personal-permissions`, { permissionIds })
      console.log(`[RolePermissionAPI] 保存用户个人权限成功: ${userId}`)
    } catch (error) {
      console.error(`[RolePermissionAPI] 保存用户个人权限失败 (User: ${userId}):`, error)
      throw error
    }
  }

  /**
   * 获取用户操作日志
   */
  async getUserOperationLogs(
    userId: number,
    params: PaginationParams & {
      startDate?: string
      endDate?: string
      action?: string
      module?: string
    } = {}
  ): Promise<PaginatedResponse<OperationLog>> {
    try {
      const response = await this.api.paginate<OperationLog>(`/users/${userId}/operation-logs`, params)
      console.log(`[RolePermissionAPI] 获取用户操作日志成功: ${userId}`)
      return response
    } catch (error) {
      console.error(`[RolePermissionAPI] 获取用户操作日志失败 (User: ${userId}):`, error)
      throw error
    }
  }

  /**
   * 导出用户操作日志
   */
  async exportUserOperationLogs(
    userId: number,
    params: {
      startDate?: string
      endDate?: string
      action?: string
      module?: string
      format?: 'excel' | 'csv'
    } = {}
  ): Promise<Blob> {
    try {
      const response = await this.api.download(`/users/${userId}/operation-logs/export`, params)
      console.log(`[RolePermissionAPI] 导出用户操作日志成功: ${userId}`)
      return response
    } catch (error) {
      console.error(`[RolePermissionAPI] 导出用户操作日志失败 (User: ${userId}):`, error)
      throw error
    }
  }
}

export const rolePermissionService = RolePermissionService.getInstance()