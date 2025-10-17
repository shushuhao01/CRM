/**
 * 角色API服务
 * 处理角色相关的API请求
 */
import { apiService } from './apiService'

export interface Role {
  id: string
  name: string
  code: string
  description?: string
  color?: string
  level?: number
  status: 'active' | 'inactive'
  permissions?: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateRoleData {
  name: string
  code: string
  description?: string
  permissions?: string[]
  level?: number
}

export interface UpdateRoleData extends Partial<CreateRoleData> {
  id: string
}

class RoleApiService {
  /**
   * 获取角色列表
   */
  async getRoles(): Promise<Role[]> {
    try {
      console.log('[RoleAPI] 开始获取角色列表...')
      const response = await apiService.get<{ success: boolean; data: { roles: Role[] } }>('/roles')
      console.log('[RoleAPI] 获取角色列表成功:', response)
      // 后端返回的数据结构是 { success: true, data: { roles: [...] } }
      return response.data.roles || []
    } catch (error: any) {
      console.warn('[RoleAPI] API获取失败，使用默认角色数据')
      console.warn('[RoleAPI] 错误详情:', {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data
      })
      // 如果API失败，返回默认角色数据
      return this.getDefaultRoles()
    }
  }

  /**
   * 根据ID获取角色详情
   */
  async getRoleById(id: string): Promise<Role> {
    try {
      const response = await apiService.get<{ success: boolean; data: Role }>(`/roles/${id}`)
      console.log(`[RoleAPI] 获取角色详情成功: ${id}`)
      return response.data
    } catch (error) {
      console.error(`[RoleAPI] 获取角色详情失败: ${id}`, error)
      throw error
    }
  }

  /**
   * 创建角色
   */
  async createRole(data: CreateRoleData): Promise<Role> {
    try {
      const response = await apiService.post<{ success: boolean; data: Role; message: string }>('/roles', data)
      console.log('[RoleAPI] 创建角色成功')
      return response.data
    } catch (error) {
      console.error('[RoleAPI] 创建角色失败', error)
      throw error
    }
  }

  /**
   * 更新角色
   */
  async updateRole(data: UpdateRoleData): Promise<Role> {
    try {
      const response = await apiService.put<{ success: boolean; data: Role; message: string }>(`/roles/${data.id}`, data)
      console.log(`[RoleAPI] 更新角色成功: ${data.id}`)
      return response.data
    } catch (error) {
      console.error(`[RoleAPI] 更新角色失败: ${data.id}`, error)
      throw error
    }
  }

  /**
   * 删除角色
   */
  async deleteRole(id: string): Promise<void> {
    try {
      await apiService.delete(`/roles/${id}`)
      console.log(`[RoleAPI] 删除角色成功: ${id}`)
    } catch (error) {
      console.error(`[RoleAPI] 删除角色失败: ${id}`, error)
      throw error
    }
  }

  /**
   * 批量删除角色
   */
  async batchDeleteRoles(ids: string[]): Promise<void> {
    try {
      await apiService.post('/roles/batch-delete', { ids })
      console.log('[RoleAPI] 批量删除角色成功')
    } catch (error) {
      console.error('[RoleAPI] 批量删除角色失败', error)
      throw error
    }
  }

  /**
   * 批量更新角色状态
   */
  async batchUpdateRoleStatus(ids: string[], status: 'active' | 'inactive'): Promise<void> {
    try {
      await apiService.post('/roles/batch-status', { ids, status })
      console.log('[RoleAPI] 批量更新角色状态成功')
    } catch (error) {
      console.error('[RoleAPI] 批量更新角色状态失败', error)
      throw error
    }
  }

  /**
   * 获取角色统计信息
   */
  async getRoleStats(): Promise<any> {
    try {
      console.log('[RoleAPI] 开始获取角色统计...')
      const response = await apiService.get<{ success: boolean; data: any }>('/roles/stats')
      console.log('[RoleAPI] 获取角色统计成功:', response)
      return response.data
    } catch (error: any) {
      console.warn('[RoleAPI] 获取角色统计失败，使用默认数据')
      console.warn('[RoleAPI] 错误详情:', {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data
      })
      // 返回默认统计数据
      return this.getDefaultRoleStats()
    }
  }

  /**
   * 获取默认角色数据（当API不可用时使用）
   */
  private getDefaultRoles(): Role[] {
    return [
      {
        id: '1',
        name: '超级管理员',
        code: 'SUPER_ADMIN',
        description: '系统超级管理员，拥有所有权限',
        color: 'danger',
        level: 1,
        status: 'active',
        permissions: ['*'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        name: '管理员',
        code: 'ADMIN',
        description: '系统管理员，拥有大部分管理权限',
        color: 'warning',
        level: 2,
        status: 'active',
        permissions: ['system:manage', 'user:manage', 'department:manage'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '3',
        name: '经理',
        code: 'MANAGER',
        description: '部门经理，拥有部门管理权限',
        color: 'primary',
        level: 3,
        status: 'active',
        permissions: ['department:manage', 'user:view', 'customer:manage', 'order:manage'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '4',
        name: '销售员',
        code: 'SALES',
        description: '销售人员，负责客户和订单管理',
        color: 'success',
        level: 4,
        status: 'active',
        permissions: ['customer:manage', 'order:create', 'order:view'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '5',
        name: '客服',
        code: 'CUSTOMER_SERVICE',
        description: '客户服务人员，负责客户支持',
        color: 'info',
        level: 5,
        status: 'active',
        permissions: ['customer:view', 'order:view', 'support:manage'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]
  }

  /**
   * 获取默认角色统计数据（当API不可用时使用）
   */
  private getDefaultRoleStats(): any {
    return {
      total: 6,
      active: 5,
      inactive: 1,
      byLevel: {
        1: 1, // 超级管理员
        2: 1, // 管理员
        3: 1, // 经理
        4: 2, // 销售员
        5: 1  // 客服
      },
      distribution: [
        { name: '超级管理员', count: 1, percentage: 16.7 },
        { name: '管理员', count: 1, percentage: 16.7 },
        { name: '经理', count: 1, percentage: 16.7 },
        { name: '销售员', count: 2, percentage: 33.3 },
        { name: '客服', count: 1, percentage: 16.7 }
      ]
    }
  }
}

export const roleApiService = new RoleApiService()
export default roleApiService