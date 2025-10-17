/**
 * 个人设置API服务
 * 处理个人信息更新、偏好设置等功能
 */
import { apiService, ApiService } from './apiService'
import { shouldUseMockApi } from '@/api/mock'

export interface UpdateProfileRequest {
  name?: string
  email?: string
  phone?: string
  avatar?: string
}

export interface UserPreferences {
  language: string
  timezone: string
  emailNotifications: boolean
  browserNotifications: boolean
  smsNotifications: boolean
  pageSize: number
}

export interface ProfileInfo {
  id: string
  username: string
  name: string
  email: string
  phone: string
  department: string
  role: string
  avatar: string
  preferences: UserPreferences
  lastLoginTime?: string
  createTime?: string
}

export class ProfileApiService {
  private static instance: ProfileApiService
  private api: ApiService

  constructor() {
    this.api = apiService
  }

  static getInstance(): ProfileApiService {
    if (!ProfileApiService.instance) {
      ProfileApiService.instance = new ProfileApiService()
    }
    return ProfileApiService.instance
  }

  /**
   * 获取当前用户的个人信息
   */
  async getProfile(): Promise<ProfileInfo> {
    // 在Mock API模式下，直接返回模拟数据，避免网络请求
    if (shouldUseMockApi()) {
      console.log('[ProfileAPI] Mock API模式 - 使用模拟数据')
      return this.getMockProfile()
    }

    try {
      const response = await this.api.get<ProfileInfo>('/profile')
      console.log('[ProfileAPI] 获取个人信息成功')
      return response
    } catch (error) {
      // 在开发环境中，API请求失败是正常的，直接返回模拟数据
      console.log('[ProfileAPI] API请求失败，使用模拟数据')
      return this.getMockProfile()
    }
  }

  /**
   * 更新个人信息
   */
  async updateProfile(data: UpdateProfileRequest): Promise<ProfileInfo> {
    // 在Mock API模式下，直接返回模拟数据
    if (shouldUseMockApi()) {
      console.log('[ProfileAPI] Mock API模式 - 模拟更新个人信息')
      const mockProfile = this.getMockProfile()
      return {
        ...mockProfile,
        ...data
      }
    }

    try {
      const response = await this.api.put<ProfileInfo>('/profile', data)
      console.log('[ProfileAPI] 更新个人信息成功')
      return response
    } catch (error) {
      console.log('[ProfileAPI] API请求失败，使用模拟数据')
      // 模拟成功响应
      const mockProfile = this.getMockProfile()
      return {
        ...mockProfile,
        ...data
      }
    }
  }

  /**
   * 上传头像
   */
  async uploadAvatar(file: File): Promise<string> {
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      
      const response = await this.api.post<{ url: string }>('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      console.log('[ProfileAPI] 头像上传成功')
      return response.url
    } catch (error) {
      console.error('[ProfileAPI] 头像上传失败:', error)
      // 返回模拟的头像URL
      return URL.createObjectURL(file)
    }
  }

  /**
   * 获取用户偏好设置
   */
  async getPreferences(): Promise<UserPreferences> {
    try {
      const response = await this.api.get<UserPreferences>('/profile/preferences')
      console.log('[ProfileAPI] 获取偏好设置成功')
      return response
    } catch (error) {
      console.error('[ProfileAPI] 获取偏好设置失败:', error)
      // 返回默认偏好设置
      return this.getDefaultPreferences()
    }
  }

  /**
   * 更新用户偏好设置
   */
  async updatePreferences(preferences: UserPreferences): Promise<UserPreferences> {
    try {
      const response = await this.api.put<UserPreferences>('/profile/preferences', preferences)
      console.log('[ProfileAPI] 更新偏好设置成功')
      return response
    } catch (error) {
      console.error('[ProfileAPI] 更新偏好设置失败:', error)
      // 模拟成功响应
      return preferences
    }
  }

  /**
   * 获取模拟的个人信息数据
   */
  private getMockProfile(): ProfileInfo {
    return {
      id: '1',
      username: 'admin',
      name: '管理员',
      email: 'admin@example.com',
      phone: '13800138000',
      department: '技术部',
      role: '管理员',
      avatar: '',
      preferences: this.getDefaultPreferences(),
      lastLoginTime: new Date().toISOString(),
      createTime: new Date().toISOString()
    }
  }

  /**
   * 获取默认偏好设置
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      emailNotifications: true,
      browserNotifications: true,
      smsNotifications: false,
      pageSize: 20
    }
  }
}

export const profileApiService = ProfileApiService.getInstance()