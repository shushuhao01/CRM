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
   * 获取当前用户的个人信息（从真实API获取）
   */
  async getProfile(): Promise<ProfileInfo> {
    // 🔥 修复：生产环境必须从API获取真实数据
    if (import.meta.env.PROD) {
      try {
        const response = await this.api.get<ProfileInfo>('/profile')
        console.log('[ProfileAPI] 生产环境：从API获取个人信息成功')
        return response
      } catch (error) {
        console.error('[ProfileAPI] 生产环境：获取个人信息失败', error)
        throw error
      }
    }

    // 开发环境：优先尝试API，失败则使用Mock数据
    try {
      const response = await this.api.get<ProfileInfo>('/profile')
      console.log('[ProfileAPI] 开发环境：从API获取个人信息成功')
      return response
    } catch (_error) {
      // 在开发环境中，API请求失败是正常的，直接返回模拟数据
      console.log('[ProfileAPI] 开发环境：API请求失败，使用模拟数据')
      return this.getMockProfile()
    }
  }

  /**
   * 更新个人信息（更新到真实API）
   */
  async updateProfile(data: UpdateProfileRequest): Promise<ProfileInfo> {
    // 🔥 修复：生产环境必须调用真实API
    if (import.meta.env.PROD) {
      try {
        const response = await this.api.put<ProfileInfo>('/profile', data)
        console.log('[ProfileAPI] 生产环境：更新个人信息成功')
        return response
      } catch (error) {
        console.error('[ProfileAPI] 生产环境：更新个人信息失败', error)
        throw error
      }
    }

    // 开发环境：优先尝试API，失败则使用localStorage
    try {
      const response = await this.api.put<ProfileInfo>('/profile', data)
      console.log('[ProfileAPI] 开发环境：通过API更新个人信息成功')
      return response
    } catch (_apiError) {
      console.log('[ProfileAPI] 开发环境：API更新失败，使用localStorage')
    }

    // 在Mock API模式下，更新localStorage中的用户信息
    if (shouldUseMockApi()) {
      console.log('[ProfileAPI] Mock API模式 - 更新个人信息到localStorage')

      try {
        // 获取当前用户信息
        const userInfoStr = localStorage.getItem('user_info')
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr)
          const userId = userInfo.id

          // 【批次195修复】准备更新数据
          const updateFields = {
            realName: data.name || userInfo.realName,
            name: data.name || userInfo.name,
            email: data.email || userInfo.email,
            phone: data.phone || userInfo.phone,
            avatar: data.avatar || userInfo.avatar,
            updatedAt: new Date().toISOString()
          }

          // 更新user_info
          const updatedUserInfo = {
            ...userInfo,
            ...updateFields
          }
          localStorage.setItem('user_info', JSON.stringify(updatedUserInfo))
          console.log('[ProfileAPI] 已更新 user_info')

          // 【批次195修复】同步更新到所有用户存储键，包括user
          const userStorageKeys = ['user', 'crm_mock_users', 'userDatabase', 'erp_users_list']
          userStorageKeys.forEach(key => {
            try {
              if (key === 'user') {
                // user键是单个用户对象
                const userStr = localStorage.getItem(key)
                if (userStr) {
                  const user = JSON.parse(userStr)
                  if (String(user.id) === String(userId)) {
                    const updatedUser = {
                      ...user,
                      ...updateFields
                    }
                    localStorage.setItem(key, JSON.stringify(updatedUser))
                    console.log(`[ProfileAPI] 已同步更新到 ${key}`)
                  }
                }
              } else {
                // 其他键是用户数组
                const usersStr = localStorage.getItem(key)
                if (usersStr) {
                  const users = JSON.parse(usersStr)
                  const userIndex = users.findIndex((u: any) => String(u.id) === String(userId))
                  if (userIndex !== -1) {
                    users[userIndex] = {
                      ...users[userIndex],
                      ...updateFields
                    }
                    localStorage.setItem(key, JSON.stringify(users))
                    console.log(`[ProfileAPI] 已同步更新到 ${key}`)
                  }
                }
              }
            } catch (_error) {
              console.warn(`[ProfileAPI] 同步到 ${key} 失败`)
            }
          })

          console.log('[ProfileAPI] 个人信息更新成功，已同步到所有存储位置')
        }
      } catch (_error) {
        console.error('[ProfileAPI] 更新个人信息失败')
      }

      const mockProfile = this.getMockProfile()
      return {
        ...mockProfile,
        name: data.name || mockProfile.name,
        email: data.email || mockProfile.email,
        phone: data.phone || mockProfile.phone,
        avatar: data.avatar || mockProfile.avatar
      }
    }

    try {
      const response = await this.api.put<ProfileInfo>('/profile', data)
      console.log('[ProfileAPI] 更新个人信息成功')
      return response
    } catch (_error) {
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
    // 在Mock API模式下，使用base64存储头像
    if (shouldUseMockApi()) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64 = e.target?.result as string
          console.log('[ProfileAPI] 头像转换为base64成功')

          // 保存到localStorage
          try {
            const userInfoStr = localStorage.getItem('user_info')
            if (userInfoStr) {
              const userInfo = JSON.parse(userInfoStr)
              userInfo.avatar = base64
              localStorage.setItem('user_info', JSON.stringify(userInfo))

              // 同步到所有用户存储
              const userStorageKeys = ['crm_mock_users', 'userDatabase', 'erp_users_list']
              userStorageKeys.forEach(key => {
                try {
                  const usersStr = localStorage.getItem(key)
                  if (usersStr) {
                    const users = JSON.parse(usersStr)
                    const userIndex = users.findIndex((u: any) => String(u.id) === String(userInfo.id))
                    if (userIndex !== -1) {
                      users[userIndex].avatar = base64
                      localStorage.setItem(key, JSON.stringify(users))
                    }
                  }
                } catch (_error) {
                  console.warn(`[ProfileAPI] 同步头像到 ${key} 失败`)
                }
              })
            }
          } catch (_error) {
            console.error('[ProfileAPI] 保存头像失败')
          }

          resolve(base64)
        }
        reader.onerror = () => {
          reject(new Error('读取文件失败'))
        }
        reader.readAsDataURL(file)
      })
    }

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
    } catch (_error) {
      console.error('[ProfileAPI] 头像上传失败')
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
    } catch (_error) {
      console.error('[ProfileAPI] 获取偏好设置失败')
      // 返回默认偏好设置
      return this.getDefaultPreferences()
    }
  }

  /**
   * 更新用户偏好设置
   */
  async updatePreferences(preferences: UserPreferences): Promise<UserPreferences> {
    // 在Mock API模式下，保存到localStorage
    if (shouldUseMockApi()) {
      try {
        const userInfoStr = localStorage.getItem('user_info')
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr)
          localStorage.setItem(`user_preferences_${userInfo.id}`, JSON.stringify(preferences))
          console.log('[ProfileAPI] 偏好设置已保存到localStorage')
        }
      } catch (_error) {
        console.error('[ProfileAPI] 保存偏好设置失败')
      }
      return preferences
    }

    try {
      const response = await this.api.put<UserPreferences>('/profile/preferences', preferences)
      console.log('[ProfileAPI] 更新偏好设置成功')
      return response
    } catch (_error) {
      console.error('[ProfileAPI] 更新偏好设置失败')
      // 模拟成功响应
      return preferences
    }
  }

  /**
   * 获取模拟的个人信息数据（从localStorage读取真实登录用户）
   */
  private getMockProfile(): ProfileInfo {
    try {
      // 从localStorage获取当前登录用户信息
      const userInfoStr = localStorage.getItem('user_info')
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr)
        console.log('[ProfileAPI] 从localStorage读取用户信息:', userInfo)

        // 【批次197修复】如果user_info中字段缺失，从crm_mock_users中补充
        let completeUserInfo = { ...userInfo }
        // 【生产环境修复】仅在开发环境从localStorage补充字段
        if (!import.meta.env.PROD && (!userInfo.realName || !userInfo.phone)) {
          console.log('[ProfileAPI] 开发环境：user_info字段不完整，从crm_mock_users补充')
          try {
            const mockUsers = JSON.parse(localStorage.getItem('crm_mock_users') || '[]')
            const fullUser = mockUsers.find((u: unknown) => String(u.id) === String(userInfo.id))
            if (fullUser) {
              completeUserInfo = { ...fullUser, ...userInfo }
              console.log('[ProfileAPI] 已从crm_mock_users补充字段:', completeUserInfo)
            }
          } catch (e) {
            console.warn('[ProfileAPI] 从crm_mock_users补充字段失败:', e)
          }
        }

        // 【批次195修复】正确映射所有字段
        // 1. 姓名字段：优先使用realName
        const name = completeUserInfo.realName || completeUserInfo.name || completeUserInfo.username || ''

        // 2. 邮箱和手机：直接使用
        const email = completeUserInfo.email || ''
        const phone = completeUserInfo.phone || ''

        // 3. 部门字段：优先使用departmentName，其次是department
        let departmentName = completeUserInfo.departmentName || completeUserInfo.department || ''
        // 【生产环境修复】仅在开发环境从localStorage查找部门名称
        if (!import.meta.env.PROD && !departmentName && completeUserInfo.departmentId) {
          // 如果没有部门名称但有部门ID，从部门列表中查找
          try {
            const departments = JSON.parse(localStorage.getItem('crm_mock_departments') || '[]')
            const userDept = departments.find((d: unknown) =>
              String(d.id) === String(completeUserInfo.departmentId)
            )
            departmentName = userDept?.name || ''
            console.log('[ProfileAPI] 从部门列表获取部门名称:', departmentName)
          } catch (_e) {
            console.warn('[ProfileAPI] 获取部门名称失败')
          }
        }

        // 4. 角色字段：优先使用roleName
        let roleName = completeUserInfo.roleName || ''
        if (!roleName) {
          const roles = JSON.parse(localStorage.getItem('crm_roles') || '[]')
          const userRole = roles.find((r: unknown) =>
            r.code === completeUserInfo.role ||
            r.code === completeUserInfo.roleId ||
            String(r.id) === String(completeUserInfo.roleId)
          )
          roleName = userRole?.name || completeUserInfo.role || ''
        }

        // 5. 头像：直接使用avatar字段
        const avatar = completeUserInfo.avatar || ''

        // 从localStorage读取用户偏好设置
        const preferencesStr = localStorage.getItem(`user_preferences_${completeUserInfo.id}`)
        const preferences = preferencesStr ? JSON.parse(preferencesStr) : this.getDefaultPreferences()

        console.log('[ProfileAPI] 字段映射结果:', { name, email, phone, departmentName, roleName, avatar: avatar ? '有头像' : '无头像' })

        return {
          id: String(completeUserInfo.id || ''),
          username: completeUserInfo.username || '',
          name: name,  // 使用realName
          email: email,
          phone: phone,
          department: departmentName,  // 使用departmentName
          role: roleName,  // 使用roleName
          avatar: avatar,
          preferences,
          lastLoginTime: completeUserInfo.lastLoginAt || completeUserInfo.lastLoginTime || '',
          createTime: completeUserInfo.createdAt || completeUserInfo.createTime || ''
        }
      }
    } catch (_error) {
      console.error('[ProfileAPI] 读取用户信息失败')
    }

    // 如果没有找到用户信息，返回默认值
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
