/**
 * 用户管理API服务
 * 处理用户列表、创建、更新、删除等功能
 */
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
  role: 'admin' | 'manager' | 'sales' | 'service'
  departmentId?: number
  avatar?: string
}

export interface UpdateUserRequest {
  email?: string
  realName?: string
  phone?: string
  role?: 'admin' | 'manager' | 'sales' | 'service'
  departmentId?: number
  avatar?: string
  status?: 'active' | 'inactive' | 'locked'
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
      const response = await this.api.paginate<User>('/users', params)
      console.log(`[UserAPI] 获取用户列表成功，共 ${response.total} 个用户`)
      return response
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
      const response = await this.api.post<User>('/users', userData)
      console.log(`[UserAPI] 创建用户成功: ${response.username}`)
      return response
    } catch (error) {
      console.error('[UserAPI] 创建用户失败:', error)
      throw error
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
      console.error(`[UserAPI] 更新用户失败 (ID: ${id}):`, error)
      throw error
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(id: number): Promise<void> {
    try {
      await this.api.delete(`/users/${id}`)
      console.log(`[UserAPI] 删除用户成功 (ID: ${id})`)
    } catch (error) {
      console.error(`[UserAPI] 删除用户失败 (ID: ${id}):`, error)
      throw error
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
   * 获取用户统计信息
   */
  async getUserStatistics(): Promise<UserStatistics> {
    try {
      const response = await this.api.get<UserStatistics>('/users/statistics')
      console.log('[UserAPI] 获取用户统计信息成功')
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
  ): Promise<PaginatedResponse<any>> {
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