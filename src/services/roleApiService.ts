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
  roleType?: 'system' | 'business' | 'temporary' | 'custom'  // 角色类型
  dataScope?: 'all' | 'department' | 'self'  // 数据范围
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
  roleType?: 'system' | 'business' | 'temporary' | 'custom'  // 角色类型
  dataScope?: 'all' | 'department' | 'self'  // 数据范围
}

export interface UpdateRoleData extends Partial<CreateRoleData> {
  id: string
  status?: 'active' | 'inactive'
}

class RoleApiService {
  /**
   * 获取角色列表
   */
  async getRoles(): Promise<Role[]> {
    try {
      console.log('[RoleAPI] 开始获取角色列表...')
      const response: any = await apiService.get('/roles')
      console.log('[RoleAPI] 获取角色列表响应:', response)

      // 后端返回的数据结构是 { success: true, data: { roles: [...] } }
      // axios 响应结构: response.data 是后端返回的 JSON
      // 但apiService可能已经解包了一层，需要检查多种情况
      let roles: Role[] = []

      // 情况1: response.data.data.roles (完整axios响应)
      if (response?.data?.data?.roles) {
        roles = response.data.data.roles
        console.log('[RoleAPI] 从 response.data.data.roles 获取角色')
      }
      // 情况2: response.data.roles (apiService已解包一层)
      else if (response?.data?.roles) {
        roles = response.data.roles
        console.log('[RoleAPI] 从 response.data.roles 获取角色')
      }
      // 情况3: response.roles (apiService已解包两层)
      else if (response?.roles) {
        roles = response.roles
        console.log('[RoleAPI] 从 response.roles 获取角色')
      }
      // 情况4: response 本身就是数组
      else if (Array.isArray(response)) {
        roles = response
        console.log('[RoleAPI] response 本身就是角色数组')
      }

      console.log('[RoleAPI] 解析后的角色数量:', roles.length)

      // 如果API返回空数组，使用默认角色
      if (roles.length === 0) {
        console.log('[RoleAPI] API返回空数组，使用默认角色')
        return this.getDefaultRoles()
      }

      return roles
    } catch (error: any) {
      console.warn('[RoleAPI] API获取失败，尝试从localStorage获取')
      console.warn('[RoleAPI] 错误详情:', {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data
      })

      // 降级方案1: 优先从localStorage读取
      try {
        const savedRoles = localStorage.getItem('crm_roles')
        if (savedRoles) {
          const roles = JSON.parse(savedRoles)
          if (roles.length > 0) {
            console.log('[RoleAPI] 从localStorage获取角色成功:', roles.length)
            return roles
          }
        }
      } catch (localError) {
        console.warn('[RoleAPI] localStorage读取失败:', localError)
      }

      // 降级方案2: 如果localStorage也没有,返回默认角色并保存到localStorage
      console.log('[RoleAPI] 使用默认角色数据')
      const defaultRoles = this.getDefaultRoles()
      try {
        localStorage.setItem('crm_roles', JSON.stringify(defaultRoles))
        console.log('[RoleAPI] 默认角色已保存到localStorage')
      } catch (saveError) {
        console.warn('[RoleAPI] 保存默认角色到localStorage失败:', saveError)
      }
      return defaultRoles
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
      console.warn('[RoleAPI] API创建失败，使用localStorage创建角色', error)

      // 降级方案:直接操作localStorage
      try {
        const roles = JSON.parse(localStorage.getItem('crm_roles') || '[]')

        // 生成新ID
        const maxId = roles.reduce((max: number, role: any) => {
          const id = parseInt(role.id)
          return id > max ? id : max
        }, 0)

        const newRole: Role = {
          id: String(maxId + 1),
          name: data.name,
          code: data.code,
          description: data.description || '',
          status: 'active',
          roleType: data.roleType || 'custom',
          permissions: data.permissions || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        roles.push(newRole)
        localStorage.setItem('crm_roles', JSON.stringify(roles))

        console.log('[RoleAPI] localStorage创建角色成功:', newRole)
        return newRole
      } catch (localError) {
        console.error('[RoleAPI] localStorage创建角色也失败', localError)
        throw localError
      }
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
      console.warn(`[RoleAPI] API更新失败，使用localStorage更新角色: ${data.id}`, error)

      // 降级方案:直接操作localStorage
      try {
        const roles = JSON.parse(localStorage.getItem('crm_roles') || '[]')
        const roleIndex = roles.findIndex((r: any) => r.id === data.id)

        if (roleIndex === -1) {
          throw new Error(`未找到角色 ID: ${data.id}`)
        }

        // 更新角色数据
        const updatedRole: Role = {
          ...roles[roleIndex],
          name: data.name || roles[roleIndex].name,
          code: data.code || roles[roleIndex].code,
          description: data.description !== undefined ? data.description : roles[roleIndex].description,
          status: data.status || roles[roleIndex].status,
          roleType: data.roleType || roles[roleIndex].roleType,
          dataScope: data.dataScope || roles[roleIndex].dataScope,
          permissions: data.permissions || roles[roleIndex].permissions,
          updatedAt: new Date().toISOString()
        }

        roles[roleIndex] = updatedRole
        localStorage.setItem('crm_roles', JSON.stringify(roles))

        console.log('[RoleAPI] localStorage更新角色成功:', updatedRole)
        return updatedRole
      } catch (localError) {
        console.error('[RoleAPI] localStorage更新角色也失败', localError)
        throw localError
      }
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
      console.warn(`[RoleAPI] API删除失败，使用localStorage删除角色: ${id}`, error)

      // 降级方案:直接操作localStorage
      try {
        const roles = JSON.parse(localStorage.getItem('crm_roles') || '[]')
        const filteredRoles = roles.filter((r: any) => r.id !== id)

        if (filteredRoles.length === roles.length) {
          throw new Error(`未找到角色 ID: ${id}`)
        }

        localStorage.setItem('crm_roles', JSON.stringify(filteredRoles))
        console.log('[RoleAPI] localStorage删除角色成功:', id)
      } catch (localError) {
        console.error('[RoleAPI] localStorage删除角色也失败', localError)
        throw localError
      }
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
   * 更新单个角色状态
   */
  async updateRoleStatus(id: string, status: 'active' | 'inactive'): Promise<Role> {
    try {
      const response = await apiService.patch<{ success: boolean; data: Role; message: string }>(`/roles/${id}/status`, { status })
      console.log(`[RoleAPI] 更新角色状态成功: ${id} -> ${status}`)
      return response.data
    } catch (error) {
      console.error(`[RoleAPI] 更新角色状态失败: ${id}`, error)
      throw error
    }
  }

  /**
   * 获取角色统计信息
   */
  async getRoleStats(): Promise<unknown> {
    try {
      console.log('[RoleAPI] 开始获取角色统计...')
      const response = await apiService.get<{ success: boolean; data: unknown }>('/roles/stats')
      console.log('[RoleAPI] 获取角色统计成功:', response)
      return response.data
    } catch (error: unknown) {
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
   * 注意: 角色编码必须与 src/config/defaultRolePermissions.ts 中的配置保持一致
   */
  private getDefaultRoles(): Role[] {
    return [
      {
        id: '1',
        name: '超级管理员',
        code: 'super_admin',  // 与权限配置保持一致
        description: '系统超级管理员，拥有所有权限',
        color: 'danger',
        level: 1,
        status: 'active',
        roleType: 'system',
        permissions: [],  // 留空,从配置文件加载
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        name: '管理员',
        code: 'admin',  // 与权限配置保持一致
        description: '系统管理员，拥有所有权限',
        color: 'warning',
        level: 2,
        status: 'active',
        roleType: 'system',
        permissions: [],  // 留空,从配置文件加载
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '3',
        name: '部门经理',
        code: 'department_manager',  // 与权限配置保持一致
        description: '部门经理，拥有部门管理权限',
        color: 'primary',
        level: 3,
        status: 'active',
        roleType: 'business',
        permissions: [],  // 留空,从配置文件加载
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '4',
        name: '销售员',
        code: 'sales_staff',  // 与权限配置保持一致
        description: '销售人员，负责客户和订单管理',
        color: 'success',
        level: 4,
        status: 'active',
        roleType: 'business',
        permissions: [],  // 留空,从配置文件加载
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '5',
        name: '客服',
        code: 'customer_service',  // 与权限配置保持一致
        description: '客户服务人员，负责客户支持',
        color: 'info',
        level: 5,
        status: 'active',
        roleType: 'business',
        permissions: [],  // 留空,从配置文件加载
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]
  }

  /**
   * 获取默认角色统计数据（当API不可用时使用）
   */
  private getDefaultRoleStats(): unknown {
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

  /**
   * 获取角色模板列表
   */
  async getRoleTemplates(): Promise<Role[]> {
    try {
      console.log('[RoleAPI] 开始获取角色模板列表...')
      const response: any = await apiService.get('/roles/templates')
      console.log('[RoleAPI] 获取角色模板列表响应:', response)

      let templates: Role[] = []
      if (response?.data?.data) {
        templates = response.data.data
      } else if (response?.data) {
        templates = Array.isArray(response.data) ? response.data : []
      } else if (Array.isArray(response)) {
        templates = response
      }

      console.log('[RoleAPI] 解析后的模板数量:', templates.length)
      return templates
    } catch (error: any) {
      console.warn('[RoleAPI] 获取角色模板失败:', error?.message)
      return []
    }
  }

  /**
   * 创建角色模板
   */
  async createRoleTemplate(data: CreateRoleData & { isTemplate: true }): Promise<Role> {
    try {
      const response = await apiService.post<{ success: boolean; data: Role; message: string }>('/roles', {
        ...data,
        isTemplate: true
      })
      console.log('[RoleAPI] 创建角色模板成功')
      return response.data
    } catch (error) {
      console.error('[RoleAPI] 创建角色模板失败', error)
      throw error
    }
  }

  /**
   * 从模板创建角色
   */
  async createRoleFromTemplate(templateId: string, data: { name: string; code: string; description?: string }): Promise<Role> {
    try {
      const response = await apiService.post<{ success: boolean; data: Role; message: string }>('/roles/from-template', {
        templateId,
        ...data
      })
      console.log('[RoleAPI] 从模板创建角色成功')
      return response.data
    } catch (error) {
      console.error('[RoleAPI] 从模板创建角色失败', error)
      throw error
    }
  }
}

export const roleApiService = new RoleApiService()
export default roleApiService
