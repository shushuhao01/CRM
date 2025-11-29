/**
 * 用户管理API服务
 * 处理用户列表、创建、更新、删除等功能
 */
import { api } from '@/api/request'
import { apiService, ApiService } from './apiService'
import type { PaginationParams, PaginatedResponse } from './apiService'
import type { User } from './authApiService'

export interface UserListParams extends PaginationParams {
  departmentId?: number
  role?: string
  status?: string
}

export interface CreateUserRequest {
  username: string
  password: string
  email?: string
  realName: string
  phone: string
  role: string  // 角色code（如'sales_staff', 'department_manager'等）
  departmentId?: number
  avatar?: string
  position?: string
  employeeNumber?: string
  status?: string
  department?: string
  remark?: string
}

export interface UpdateUserRequest {
  email?: string
  realName?: string
  phone?: string
  role?: string  // 角色code（如'sales_staff', 'department_manager'等）
  roleId?: string  // 角色code（同role）
  departmentId?: number
  position?: string
  employeeNumber?: string
  avatar?: string
  status?: 'active' | 'inactive' | 'locked'
  remark?: string
  name?: string  // 姓名（兼容字段）
}

export interface ResetPasswordRequest {
  userId: number
  newPassword: string
}

export interface UserStatistics {
  total: number
  active: number
  inactive: number
  locked: number
  byRole: {
    admin: number
    manager: number
    sales: number
    service: number
  }
  byDepartment: Array<{
    departmentId: number
    departmentName: string
    count: number
  }>
}

export class UserApiService {
  private static instance: UserApiService
  private api: ApiService

  constructor() {
    this.api = apiService
  }

  static getInstance(): UserApiService {
    if (!UserApiService.instance) {
      UserApiService.instance = new UserApiService()
    }
    return UserApiService.instance
  }

  /**
   * 获取用户列表
   */
  async getUsers(params: UserListParams = {}): Promise<PaginatedResponse<User>> {
    try {
      const response = await api.get<any>('/users', params)
      console.log(`[UserAPI] 获取用户列表成功，共 ${response.data.total} 个用户`)

      // 适配Mock API返回的数据结构
      return {
        data: response.data.items || response.data || [],
        total: response.data.total || 0,
        page: response.data.page || 1,
        limit: response.data.limit || 20,
        totalPages: response.data.totalPages || 1
      }
    } catch (error) {
      console.error('[UserAPI] 获取用户列表失败:', error)
      throw error
    }
  }

  /**
   * 获取用户列表（别名方法，保持向后兼容）
   */
  async getUserList(params: UserListParams = {}): Promise<{ data: User[], total: number }> {
    try {
      const response = await this.getUsers(params)
      return {
        data: response.data,
        total: response.total
      }
    } catch (error) {
      console.error('[UserAPI] 获取用户列表失败:', error)
      throw error
    }
  }

  /**
   * 根据ID获取用户详情
   */
  async getUserById(id: number): Promise<User> {
    try {
      const response = await this.api.get<User>(`/users/${id}`)
      console.log(`[UserAPI] 获取用户详情成功: ${response.username}`)
      return response
    } catch (error) {
      console.error(`[UserAPI] 获取用户详情失败 (ID: ${id}):`, error)
      throw error
    }
  }

  /**
   * 创建新用户
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      const response = await api.post<User>('/users', userData)
      console.log(`[UserAPI] 创建用户成功: ${response.username}`)
      return response
    } catch (error) {
      // 【生产环境修复】生产环境不降级到localStorage
      if (import.meta.env.PROD) {
        console.error('[UserAPI] 生产环境：API创建用户失败', error)
        throw error
      }

      console.warn('[UserAPI] 开发环境：API创建失败，使用localStorage创建用户', error)

      // 降级方案:直接操作localStorage（仅开发环境）
      try {
        const users = JSON.parse(localStorage.getItem('crm_mock_users') || '[]')

        // 生成新ID
        const maxId = users.reduce((max: number, user: any) => {
          const id = parseInt(user.id)
          return id > max ? id : max
        }, 0)

        const newUser: any = {
          id: String(maxId + 1),
          username: userData.username,
          password: userData.password,
          realName: userData.realName,
          name: userData.realName,
          email: userData.email || '',
          phone: userData.phone || '',
          role: userData.role,
          roleId: userData.role,
          departmentId: userData.departmentId,
          department: userData.department || '',
          position: userData.position || '',
          employeeNumber: userData.employeeNumber || '',
          status: userData.status || 'active',
          employmentStatus: 'active',
          avatar: userData.avatar || '',
          remark: userData.remark || '',
          createTime: new Date().toLocaleString('zh-CN'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isOnline: false,
          lastLoginTime: null,
          loginCount: 0
        }

        users.push(newUser)
        localStorage.setItem('crm_mock_users', JSON.stringify(users))

        // 【批次197修复】同步到所有用户数据源
        try {
          // 同步到userDatabase
          const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]')
          userDatabase.push(newUser)
          localStorage.setItem('userDatabase', JSON.stringify(userDatabase))
          console.log('[UserAPI] 已同步到 userDatabase')
        } catch (dbError) {
          console.warn('[UserAPI] 同步到userDatabase失败:', dbError)
        }

        // 【批次197修复】同步到crm_users（用户列表数据源）
        try {
          const crmUsers = JSON.parse(localStorage.getItem('crm_users') || '[]')
          crmUsers.push(newUser)
          localStorage.setItem('crm_users', JSON.stringify(crmUsers))
          console.log('[UserAPI] 已同步到 crm_users')
        } catch (crmError) {
          console.warn('[UserAPI] 同步到crm_users失败:', crmError)
        }

        console.log('[UserAPI] localStorage创建用户成功:', newUser)
        return newUser as User
      } catch (localError) {
        console.error('[UserAPI] localStorage创建用户也失败', localError)
        throw localError
      }
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: number, userData: UpdateUserRequest): Promise<User> {
    try {
      const response = await this.api.put<User>(`/users/${id}`, userData)
      console.log(`[UserAPI] 更新用户成功: ${response.username}`)
      return response
    } catch (error) {
      // 【生产环境修复】生产环境不降级到localStorage
      if (import.meta.env.PROD) {
        console.error(`[UserAPI] 生产环境：API更新用户失败 (ID: ${id})`, error)
        throw error
      }

      console.warn(`[UserAPI] 开发环境：API更新失败，使用localStorage更新用户 (ID: ${id})`, error)

      // 降级方案:直接操作localStorage（仅开发环境）
      try {
        const users = JSON.parse(localStorage.getItem('crm_mock_users') || '[]')
        const userIndex = users.findIndex((u: any) => String(u.id) === String(id))

        if (userIndex === -1) {
          throw new Error(`未找到用户 ID: ${id}`)
        }

        // 更新用户数据
        const updatedUser = {
          ...users[userIndex],
          ...userData,
          updatedAt: new Date().toISOString(),
          updateTime: new Date().toLocaleString('zh-CN')
        }

        users[userIndex] = updatedUser
        localStorage.setItem('crm_mock_users', JSON.stringify(users))

        // 【批次196修复】如果更新的是当前登录用户，同步到user和user_info
        try {
          const currentUserInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
          if (currentUserInfo.id && String(currentUserInfo.id) === String(id)) {
            // 合并更新后的数据
            const updatedCurrentUser = {
              ...currentUserInfo,
              ...updatedUser
            }
            localStorage.setItem('user', JSON.stringify(updatedCurrentUser))
            localStorage.setItem('user_info', JSON.stringify(updatedCurrentUser))
            console.log('[UserAPI] 已同步更新到当前登录用户')
          }
        } catch (syncError) {
          console.warn('[UserAPI] 同步到当前用户失败:', syncError)
        }

        // 同步到userDatabase
        try {
          const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]')
          const dbIndex = userDatabase.findIndex((u: any) => String(u.id) === String(id))
          if (dbIndex !== -1) {
            userDatabase[dbIndex] = updatedUser
            localStorage.setItem('userDatabase', JSON.stringify(userDatabase))
          }
        } catch (dbError) {
          console.warn('[UserAPI] 同步到userDatabase失败:', dbError)
        }

        console.log('[UserAPI] localStorage更新用户成功:', updatedUser)
        return updatedUser as User
      } catch (localError) {
        console.error('[UserAPI] localStorage更新用户也失败', localError)
        throw localError
      }
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(id: number | string): Promise<void> {
    try {
      // 确保ID是字符串格式
      const userId = String(id)
      await this.api.delete(`/users/${userId}`)
      console.log(`[UserAPI] 删除用户成功 (ID: ${userId})`)
    } catch (error) {
      // 【生产环境修复】生产环境不降级到localStorage
      if (import.meta.env.PROD) {
        console.error(`[UserAPI] 生产环境：API删除用户失败 (ID: ${id})`, error)
        throw error
      }

      console.warn(`[UserAPI] 开发环境：API删除失败，使用localStorage删除用户 (ID: ${id})`, error)

      // 降级方案:直接操作localStorage（仅开发环境）
      try {
        const users = JSON.parse(localStorage.getItem('crm_mock_users') || '[]')
        const filteredUsers = users.filter((u: unknown) => String(u.id) !== String(id))

        if (filteredUsers.length === users.length) {
          throw new Error(`未找到用户 ID: ${id}`)
        }

        localStorage.setItem('crm_mock_users', JSON.stringify(filteredUsers))

        // 同步到userDatabase
        try {
          const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]')
          const filteredDb = userDatabase.filter((u: unknown) => String(u.id) !== String(id))
          localStorage.setItem('userDatabase', JSON.stringify(filteredDb))
        } catch (dbError) {
          console.warn('[UserAPI] 同步到userDatabase失败:', dbError)
        }

        console.log('[UserAPI] localStorage删除用户成功:', id)
      } catch (localError) {
        console.error('[UserAPI] localStorage删除用户也失败', localError)
        throw localError
      }
    }
  }

  /**
   * 批量删除用户
   */
  async deleteUsers(ids: number[]): Promise<void> {
    try {
      await this.api.batch('/users/batch-delete', ids.map(id => ({ action: 'delete', id })))
      console.log(`[UserAPI] 批量删除用户成功，共 ${ids.length} 个`)
    } catch (error) {
      console.error('[UserAPI] 批量删除用户失败:', error)
      throw error
    }
  }

  /**
   * 重置用户密码
   */
  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    try {
      await this.api.post(`/users/${data.userId}/reset-password`, {
        newPassword: data.newPassword
      })
      console.log(`[UserAPI] 重置密码成功 (ID: ${data.userId})`)
    } catch (error) {
      console.error(`[UserAPI] 重置密码失败 (ID: ${data.userId}):`, error)
      throw error
    }
  }

  /**
   * 锁定/解锁用户
   */
  async toggleUserStatus(id: number, status: 'active' | 'inactive' | 'locked'): Promise<User> {
    try {
      const response = await this.api.patch<User>(`/users/${id}/status`, { status })
      console.log(`[UserAPI] 用户状态更新成功 (ID: ${id}, Status: ${status})`)
      return response
    } catch (error) {
      console.error(`[UserAPI] 用户状态更新失败 (ID: ${id}):`, error)
      throw error
    }
  }

  /**
   * 更新用户状态
   */
  async updateUserStatus(id: number, status: 'active' | 'inactive' | 'locked'): Promise<User> {
    try {
      const response = await api.patch<User>(`/users/${id}/status`, { status })
      console.log(`[UserAPI] 用户状态更新成功 (ID: ${id}, Status: ${status})`)
      return response
    } catch (error) {
      console.error(`[UserAPI] 用户状态更新失败 (ID: ${id}):`, error)
      throw error
    }
  }

  /**
   * 更新用户在职状态
   */
  async updateEmploymentStatus(id: number | string, employmentStatus: 'active' | 'resigned'): Promise<User> {
    try {
      const response = await api.patch<User>(`/users/${id}/employment-status`, { employmentStatus })
      console.log(`[UserAPI] 用户在职状态更新成功 (ID: ${id}, Status: ${employmentStatus})`)
      return response
    } catch (error) {
      console.error(`[UserAPI] 用户在职状态更新失败 (ID: ${id}):`, error)
      throw error
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStatistics(): Promise<unknown> {
    try {
      const response = await this.api.get<unknown>('/users/statistics')
      console.log('[UserAPI] 获取用户统计信息成功:', response)
      return response
    } catch (error) {
      console.error('[UserAPI] 获取用户统计信息失败:', error)
      throw error
    }
  }

  /**
   * 搜索用户
   */
  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    try {
      const response = await this.api.get<User[]>('/users/search', {
        q: query,
        limit
      })
      console.log(`[UserAPI] 搜索用户成功，找到 ${response.length} 个结果`)
      return response
    } catch (error) {
      console.error('[UserAPI] 搜索用户失败:', error)
      throw error
    }
  }

  /**
   * 检查用户名是否可用
   */
  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const response = await this.api.get<{ available: boolean }>('/users/check-username', {
        username
      })
      return response.available
    } catch (error) {
      console.error('[UserAPI] 检查用户名可用性失败:', error)
      throw error
    }
  }

  /**
   * 检查邮箱是否可用
   */
  async checkEmailAvailability(email: string): Promise<boolean> {
    try {
      const response = await this.api.get<{ available: boolean }>('/users/check-email', {
        email
      })
      return response.available
    } catch (error) {
      console.error('[UserAPI] 检查邮箱可用性失败:', error)
      throw error
    }
  }

  /**
   * 上传用户头像
   */
  async uploadAvatar(userId: number, file: File): Promise<string> {
    try {
      const response = await this.api.upload<{ url: string }>(`/users/${userId}/avatar`, file)
      console.log(`[UserAPI] 头像上传成功 (ID: ${userId})`)
      return response.url
    } catch (error) {
      console.error(`[UserAPI] 头像上传失败 (ID: ${userId}):`, error)
      throw error
    }
  }

  /**
   * 获取用户操作日志
   */
  async getUserOperationLogs(
    userId: number,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<unknown>> {
    try {
      const response = await this.api.paginate(`/users/${userId}/operation-logs`, params)
      console.log(`[UserAPI] 获取用户操作日志成功 (ID: ${userId})`)
      return response
    } catch (error) {
      console.error(`[UserAPI] 获取用户操作日志失败 (ID: ${userId}):`, error)
      throw error
    }
  }

  /**
   * 导出用户数据
   */
  async exportUsers(params: UserListParams = {}): Promise<Blob> {
    try {
      const response = await this.api.get('/users/export', params, {
        responseType: 'blob'
      })
      console.log('[UserAPI] 导出用户数据成功')
      return response as unknown as Blob
    } catch (error) {
      console.error('[UserAPI] 导出用户数据失败:', error)
      throw error
    }
  }

  /**
   * 导入用户数据
   */
  async importUsers(file: File): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const response = await this.api.upload<{
        success: number
        failed: number
        errors: string[]
      }>('/users/import', file)
      console.log(`[UserAPI] 导入用户数据成功，成功: ${response.success}，失败: ${response.failed}`)
      return response
    } catch (error) {
      console.error('[UserAPI] 导入用户数据失败:', error)
      throw error
    }
  }
}

// 导出单例实例
export const userApiService = UserApiService.getInstance()
