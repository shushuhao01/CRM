/**
 * 权限API服务
 * 处理权限相关的API请求
 */
import { apiService } from './apiService'

export interface Permission {
  id: number
  name: string
  code: string
  description?: string
  module: string
  type: 'menu' | 'button' | 'api'
  path?: string
  icon?: string
  sort: number
  status: 'active' | 'inactive'
  parent?: Permission
  children?: Permission[]
  createdAt: string
  updatedAt: string
}

export interface CreatePermissionData {
  name: string
  code: string
  description?: string
  module: string
  type?: 'menu' | 'button' | 'api'
  path?: string
  icon?: string
  sort?: number
  status?: 'active' | 'inactive'
  parentId?: number
}

export interface UpdatePermissionData extends Partial<CreatePermissionData> {
  id: number
}

class PermissionApiService {
  /**
   * 获取权限树
   */
  async getPermissionTree(): Promise<Permission[]> {
    try {
      const response = await apiService.get<{ success: boolean; data: Permission[] }>('/permissions/tree')
      console.log('[PermissionAPI] 获取权限树成功')
      return response.data
    } catch (error) {
      console.warn('[PermissionAPI] API获取失败，使用默认权限数据', error)
      return this.getDefaultPermissions()
    }
  }

  /**
   * 获取权限列表（平铺）
   */
  async getPermissions(params?: { type?: string; module?: string; status?: string }): Promise<Permission[]> {
    try {
      const response = await apiService.get<{ success: boolean; data: Permission[] }>('/permissions', { params })
      console.log('[PermissionAPI] 获取权限列表成功')
      return response.data
    } catch (error) {
      console.warn('[PermissionAPI] API获取失败，使用默认权限数据', error)
      return this.getDefaultPermissions()
    }
  }

  /**
   * 创建权限
   */
  async createPermission(data: CreatePermissionData): Promise<Permission> {
    try {
      const response = await apiService.post<{ success: boolean; data: Permission; message: string }>('/permissions', data)
      console.log('[PermissionAPI] 创建权限成功')
      return response.data
    } catch (error) {
      console.error('[PermissionAPI] 创建权限失败', error)
      throw error
    }
  }

  /**
   * 更新权限
   */
  async updatePermission(data: UpdatePermissionData): Promise<Permission> {
    try {
      const response = await apiService.put<{ success: boolean; data: Permission; message: string }>(`/permissions/${data.id}`, data)
      console.log(`[PermissionAPI] 更新权限成功: ${data.id}`)
      return response.data
    } catch (error) {
      console.error(`[PermissionAPI] 更新权限失败: ${data.id}`, error)
      throw error
    }
  }

  /**
   * 删除权限
   */
  async deletePermission(id: number): Promise<void> {
    try {
      await apiService.delete(`/permissions/${id}`)
      console.log(`[PermissionAPI] 删除权限成功: ${id}`)
    } catch (error) {
      console.error(`[PermissionAPI] 删除权限失败: ${id}`, error)
      throw error
    }
  }

  /**
   * 获取默认权限数据（当API不可用时使用）
   */
  private getDefaultPermissions(): Permission[] {
    return [
      {
        id: 1,
        name: '系统管理',
        code: 'system',
        description: '系统管理模块',
        module: 'system',
        type: 'menu',
        path: '/system',
        icon: 'Setting',
        sort: 1,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        children: [
          {
            id: 2,
            name: '用户管理',
            code: 'system:user',
            description: '用户管理页面',
            module: 'system',
            type: 'menu',
            path: '/system/user',
            icon: 'User',
            sort: 1,
            status: 'active',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            children: [
              {
                id: 3,
                name: '查看用户',
                code: 'system:user:view',
                module: 'system',
                type: 'button',
                sort: 1,
                status: 'active',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z'
              },
              {
                id: 4,
                name: '新增用户',
                code: 'system:user:add',
                module: 'system',
                type: 'button',
                sort: 2,
                status: 'active',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z'
              }
            ]
          },
          {
            id: 5,
            name: '角色管理',
            code: 'system:role',
            description: '角色管理页面',
            module: 'system',
            type: 'menu',
            path: '/system/role',
            icon: 'UserFilled',
            sort: 2,
            status: 'active',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ]
      },
      {
        id: 6,
        name: '客户管理',
        code: 'customer',
        description: '客户管理模块',
        module: 'customer',
        type: 'menu',
        path: '/customer',
        icon: 'Avatar',
        sort: 2,
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]
  }
}

export const permissionApiService = new PermissionApiService()
export default permissionApiService