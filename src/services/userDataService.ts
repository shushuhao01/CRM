// 用户数据服务 - 统一数据访问层
// 自动检测并切换localStorage和API模式,无需手动修改

import { ref, computed } from 'vue'
import type { User } from '@/stores/user'

/**
 * 用户数据服务配置
 */
interface UserDataServiceConfig {
  useAPI: boolean // 是否使用API模式
  apiBaseURL: string // API基础URL
  localStorageKey: string // localStorage键名
}

/**
 * 用户数据服务类
 *
 * 特性:
 * 1. 自动检测环境(开发/生产)
 * 2. 自动切换localStorage/API
 * 3. 统一的数据访问接口
 * 4. 无需修改业务代码
 */
class UserDataService {
  private config: UserDataServiceConfig
  private cache: User[] = []
  private cacheTime: number = 0
  private cacheDuration: number = 5 * 60 * 1000 // 5分钟缓存

  constructor() {
    // 自动检测环境并配置
    this.config = this.detectEnvironment()
    console.log('[UserDataService] 初始化完成:', this.config.useAPI ? 'API模式' : 'localStorage模式')
  }

  /**
   * 自动检测环境
   * 优先级: 生产环境强制API > 环境变量 > localStorage
   */
  private detectEnvironment(): UserDataServiceConfig {
    // 1. 检查是否为生产环境
    const isProduction = import.meta.env.PROD

    // 2. 检查环境变量
    const envUseAPI = import.meta.env.VITE_USE_API === 'true'
    const envAPIURL = import.meta.env.VITE_API_BASE_URL || ''

    // 3. 检查是否有API配置
    const hasAPIConfig = envAPIURL && envAPIURL !== ''

    // 4. 决定使用哪种模式
    // 【生产环境修复】生产环境必须使用API，不允许使用localStorage
    const useAPI = isProduction || (envUseAPI && hasAPIConfig)

    if (isProduction && !hasAPIConfig) {
      console.warn('[UserDataService] 生产环境未配置API地址，将无法获取数据！')
    }

    return {
      useAPI,
      apiBaseURL: envAPIURL,
      localStorageKey: 'crm_mock_users'
    }
  }

  /**
   * 获取所有用户
   * 自动从localStorage或API获取
   */
  async getUsers(): Promise<User[]> {
    // 检查缓存
    if (this.isCacheValid()) {
      console.log('[UserDataService] 使用缓存数据')
      return this.cache
    }

    try {
      let users: User[]

      if (this.config.useAPI) {
        // API模式
        users = await this.getUsersFromAPI()
      } else {
        // localStorage模式
        users = await this.getUsersFromLocalStorage()
      }

      // 更新缓存
      this.cache = users
      this.cacheTime = Date.now()

      console.log('[UserDataService] 获取用户成功:', users.length, '个用户')
      return users
    } catch (error) {
      console.error('[UserDataService] 获取用户失败:', error)

      // 【生产环境修复】生产环境下不降级到localStorage
      if (this.config.useAPI && !import.meta.env.PROD) {
        console.log('[UserDataService] 开发环境：API失败,降级到localStorage')
        return this.getUsersFromLocalStorage()
      }

      // 生产环境下API失败直接返回空数组
      if (import.meta.env.PROD) {
        console.error('[UserDataService] 生产环境：API失败，无法获取用户数据')
      }

      return []
    }
  }

  /**
   * 从localStorage获取用户（仅开发环境）
   */
  private async getUsersFromLocalStorage(): Promise<User[]> {
    // 【生产环境修复】生产环境禁止使用localStorage
    if (import.meta.env.PROD) {
      console.warn('[UserDataService] 生产环境不支持从localStorage获取数据')
      return []
    }

    try {
      // 尝试多个可能的键名
      const possibleKeys = [
        'crm_mock_users',
        'userDatabase',
        'users'
      ]

      for (const key of possibleKeys) {
        const data = localStorage.getItem(key)
        if (data) {
          const users = JSON.parse(data)
          if (Array.isArray(users) && users.length > 0) {
            console.log(`[UserDataService] 开发环境：从 ${key} 加载了 ${users.length} 个用户`)
            return users
          }
        }
      }

      console.warn('[UserDataService] 开发环境：localStorage中没有用户数据')
      return []
    } catch (error) {
      console.error('[UserDataService] 从localStorage获取用户失败:', error)
      return []
    }
  }

  /**
   * 从API获取用户
   */
  private async getUsersFromAPI(): Promise<User[]> {
    try {
      const response = await fetch(`${this.config.apiBaseURL}/api/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        }
      })

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`)
      }

      const result = await response.json()
      return result.data || result || []
    } catch (error) {
      console.error('[UserDataService] 从API获取用户失败:', error)
      throw error
    }
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(userId: string): Promise<User | null> {
    const users = await this.getUsers()
    return users.find(u => String(u.id) === String(userId)) || null
  }

  /**
   * 根据角色获取用户
   */
  async getUsersByRole(role: string | string[]): Promise<User[]> {
    const users = await this.getUsers()
    const roles = Array.isArray(role) ? role : [role]
    return users.filter(u => roles.includes(u.role))
  }

  /**
   * 获取销售人员列表
   */
  async getSalesUsers(): Promise<User[]> {
    return this.getUsersByRole([
      'sales_staff',
      'department_manager',
      'admin',
      'super_admin'
    ])
  }

  /**
   * 获取部门成员
   */
  async getDepartmentUsers(departmentId: string): Promise<User[]> {
    const users = await this.getUsers()
    return users.filter(u => u.departmentId === departmentId || u.department === departmentId)
  }

  /**
   * 搜索用户
   */
  async searchUsers(keyword: string): Promise<User[]> {
    if (!keyword) {
      return this.getUsers()
    }

    const users = await this.getUsers()
    const lowerKeyword = keyword.toLowerCase()

    return users.filter(u =>
      u.name.toLowerCase().includes(lowerKeyword) ||
      u.id.toLowerCase().includes(lowerKeyword) ||
      (u.email && u.email.toLowerCase().includes(lowerKeyword)) ||
      (u.department && u.department.toLowerCase().includes(lowerKeyword))
    )
  }

  /**
   * 刷新缓存
   */
  async refreshCache(): Promise<void> {
    this.cache = []
    this.cacheTime = 0
    await this.getUsers()
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    if (this.cache.length === 0) return false
    if (this.cacheTime === 0) return false
    return Date.now() - this.cacheTime < this.cacheDuration
  }

  /**
   * 获取认证token
   */
  private getToken(): string {
    return localStorage.getItem('token') || ''
  }

  /**
   * 切换到API模式
   */
  switchToAPI(apiBaseURL: string): void {
    this.config.useAPI = true
    this.config.apiBaseURL = apiBaseURL
    this.refreshCache()
    console.log('[UserDataService] 已切换到API模式:', apiBaseURL)
  }

  /**
   * 切换到localStorage模式
   */
  switchToLocalStorage(): void {
    this.config.useAPI = false
    this.refreshCache()
    console.log('[UserDataService] 已切换到localStorage模式')
  }

  /**
   * 获取当前模式
   */
  getCurrentMode(): 'API' | 'localStorage' {
    return this.config.useAPI ? 'API' : 'localStorage'
  }
}

// 导出单例实例
export const userDataService = new UserDataService()

// 导出默认实例
export default userDataService
