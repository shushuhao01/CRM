/**
 * 认证API服务
 * 处理用户登录、注册、token刷新等功能
 */
import { apiService, ApiService } from './apiService'
import { shouldUseMockApi } from '@/api/mock'

export interface LoginRequest {
  username: string
  password: string
  rememberMe?: boolean
}

export interface LoginResponse {
  user: User
  tokens: {
    accessToken: string
    refreshToken: string
  }
  expiresIn?: number
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface User {
  id: number
  username: string
  email: string
  realName: string
  phone: string
  avatar?: string
  role: 'admin' | 'manager' | 'user'
  status: 'active' | 'inactive' | 'locked'
  departmentId?: number
  department?: {
    id: number
    name: string
    code: string
  }
  permissions: string[]
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface UpdateUserRequest {
  realName?: string
  email?: string
  phone?: string
  avatar?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export class AuthApiService {
  private static instance: AuthApiService
  private api: ApiService

  constructor() {
    this.api = apiService
  }

  static getInstance(): AuthApiService {
    if (!AuthApiService.instance) {
      AuthApiService.instance = new AuthApiService()
    }
    return AuthApiService.instance
  }

  /**
   * 用户登录
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // 在Mock API模式下，返回模拟登录数据
      if (shouldUseMockApi()) {
        // Mock模式下直接返回错误，不再提供测试账号
        throw new Error('Mock模式已禁用，请使用真实API进行登录')

        const mockResponse: LoginResponse = {
          user: {
            id: account.id,
            username: credentials.username,
            email: `${credentials.username}@example.com`,
            realName: account.realName,
            phone: '13800138000',
            avatar: '',
            role: account.role as 'admin' | 'manager' | 'user',
            status: 'active',
            permissions: account.role === 'admin' ? ['*'] : ['basic'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          tokens: {
            accessToken: `mock-token-${Date.now()}`,
            refreshToken: `mock-refresh-${Date.now()}`
          },
          expiresIn: 3600
        }

        // 保存token到localStorage
        this.api.setAuthToken(mockResponse.tokens.accessToken)
        localStorage.setItem('refresh_token', mockResponse.tokens.refreshToken)
        localStorage.setItem('user_info', JSON.stringify(mockResponse.user))
        
        // 在模拟API模式下，总是设置很长的过期时间（30天），避免token过期问题
        const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000) // 30天
        localStorage.setItem('token_expiry', expiryTime.toString())

        console.log('[Auth] Mock API模式 - 登录成功:', mockResponse.user.username)
        return mockResponse
      }

      const response = await this.api.post<LoginResponse>('/auth/login', credentials)
      
      // 保存token到localStorage
      if (response.tokens?.accessToken) {
        this.api.setAuthToken(response.tokens.accessToken)
        localStorage.setItem('refresh_token', response.tokens.refreshToken)
        localStorage.setItem('user_info', JSON.stringify(response.user))
        
        // 如果选择记住我，设置更长的过期时间
        if (credentials.rememberMe) {
          const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000) // 30天
          localStorage.setItem('token_expiry', expiryTime.toString())
        }
      }

      console.log('[Auth] 登录成功:', response.user.username)
      return response
    } catch (error) {
      console.error('[Auth] 登录失败:', error)
      throw error
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout')
    } catch (error) {
      console.warn('[Auth] 登出请求失败:', error)
    } finally {
      // 清除本地存储的认证信息
      this.clearAuthData()
      console.log('[Auth] 已清除本地认证数据')
    }
  }

  /**
   * 刷新访问token
   */
  async refreshToken(): Promise<LoginResponse> {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        throw new Error('没有刷新token')
      }

      // 在Mock API模式下，返回模拟刷新数据
      if (shouldUseMockApi()) {
        const userInfo = localStorage.getItem('user_info')
        const user = userInfo ? JSON.parse(userInfo) : {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          realName: '系统管理员',
          phone: '13800138000',
          avatar: '',
          role: 'admin',
          status: 'active',
          permissions: ['*'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        const mockResponse: LoginResponse = {
          user,
          tokens: {
            accessToken: `mock-token-${Date.now()}`,
            refreshToken: `mock-refresh-${Date.now()}`
          },
          expiresIn: 3600
        }

        // 更新token
        this.api.setAuthToken(mockResponse.tokens.accessToken)
        localStorage.setItem('refresh_token', mockResponse.tokens.refreshToken)
        localStorage.setItem('user_info', JSON.stringify(mockResponse.user))
        
        // 在模拟API模式下，设置很长的token过期时间（30天），避免频繁过期
        const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000) // 30天
        localStorage.setItem('token_expiry', expiryTime.toString())

        console.log('[Auth] Mock API模式 - Token刷新成功')
        return mockResponse
      }

      const response = await this.api.post<LoginResponse>('/auth/refresh', {
        refreshToken
      })

      // 更新token
      if (response.tokens?.accessToken) {
        this.api.setAuthToken(response.tokens.accessToken)
        localStorage.setItem('refresh_token', response.tokens.refreshToken)
        localStorage.setItem('user_info', JSON.stringify(response.user))
      }

      console.log('[Auth] Token刷新成功')
      return response
    } catch (error) {
      console.error('[Auth] Token刷新失败:', error)
      this.clearAuthData()
      throw error
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(isTokenValidation: boolean = false): Promise<User> {
    try {
      // 在Mock API模式下，返回模拟用户数据
      if (shouldUseMockApi()) {
        const mockUser: User = {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          realName: '系统管理员',
          phone: '13800138000',
          avatar: '',
          role: 'admin',
          status: 'active',
          permissions: ['*'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        // 更新本地存储的用户信息
        localStorage.setItem('user_info', JSON.stringify(mockUser))
        console.log('[Auth] Mock API模式 - 返回模拟用户数据')
        
        return mockUser
      }

      const config = isTokenValidation ? {
        // 标记这是token验证请求，避免在拦截器中显示错误提示
        metadata: { isTokenValidation: true }
      } : undefined

      const response = await this.api.get<User>('/auth/me', undefined, config)
      
      // 更新本地存储的用户信息
      localStorage.setItem('user_info', JSON.stringify(response))
      
      return response
    } catch (error) {
      if (!isTokenValidation) {
        console.error('[Auth] 获取用户信息失败:', error)
      }
      throw error
    }
  }

  /**
   * 更新当前用户信息
   */
  async updateCurrentUser(userData: UpdateUserRequest): Promise<User> {
    try {
      const response = await this.api.put<User>('/auth/me', userData)
      
      // 更新本地存储的用户信息
      localStorage.setItem('user_info', JSON.stringify(response))
      
      console.log('[Auth] 用户信息更新成功')
      return response
    } catch (error) {
      console.error('[Auth] 更新用户信息失败:', error)
      throw error
    }
  }

  /**
   * 修改密码
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    try {
      await this.api.put('/auth/password', passwordData)
      console.log('[Auth] 密码修改成功')
    } catch (error) {
      console.error('[Auth] 密码修改失败:', error)
      throw error
    }
  }

  /**
   * 检查token是否有效
   */
  async validateToken(): Promise<boolean> {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        return false
      }

      // 在Mock API模式下，直接验证token格式
      if (shouldUseMockApi()) {
        console.log('[Auth] Mock API模式 - Token验证通过')
        return true
      }

      // 尝试获取用户信息来验证token，标记为token验证请求
      await this.getCurrentUser(true)
      return true
    } catch (error) {
      // Token验证失败时静默处理，不显示错误日志
      return false
    }
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token')
    const userInfo = localStorage.getItem('user_info')
    return !!(token && userInfo)
  }

  /**
   * 获取本地存储的用户信息
   */
  getLocalUserInfo(): User | null {
    try {
      const userInfo = localStorage.getItem('user_info')
      return userInfo ? JSON.parse(userInfo) : null
    } catch (error) {
      console.error('[Auth] 解析本地用户信息失败:', error)
      return null
    }
  }

  /**
   * 获取用户权限
   */
  getUserPermissions(): string[] {
    const user = this.getLocalUserInfo()
    return user?.permissions || []
  }

  /**
   * 检查用户是否有指定权限
   */
  hasPermission(permission: string): boolean {
    const permissions = this.getUserPermissions()
    return permissions.includes(permission) || permissions.includes('*')
  }

  /**
   * 检查用户角色
   */
  hasRole(role: string | string[]): boolean {
    const user = this.getLocalUserInfo()
    if (!user) return false

    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(user.role)
  }

  /**
   * 是否为管理员
   */
  isAdmin(): boolean {
    return this.hasRole('admin')
  }

  /**
   * 是否为管理员或经理
   */
  isManagerOrAdmin(): boolean {
    return this.hasRole(['admin', 'manager'])
  }

  /**
   * 清除认证数据
   */
  private clearAuthData(): void {
    this.api.clearAuthToken()
    localStorage.removeItem('user_info')
    localStorage.removeItem('token_expiry')
  }

  /**
   * 自动刷新token
   */
  async autoRefreshToken(): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token')
      const refreshToken = localStorage.getItem('refresh_token')
      
      if (!token || !refreshToken) {
        return
      }

      // 在Mock API模式下，跳过token过期检查
      if (shouldUseMockApi()) {
        console.log('[Auth] Mock API模式 - 跳过token过期检查')
        return
      }

      // 检查token是否即将过期（提前5分钟刷新）
      const tokenExpiry = localStorage.getItem('token_expiry')
      if (tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry)
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000

        if (now >= expiryTime - fiveMinutes) {
          console.log('[Auth] Token即将过期，自动刷新')
          await this.refreshToken()
        }
      }
    } catch (error) {
      console.error('[Auth] 自动刷新token失败:', error)
    }
  }

  /**
   * 启动自动刷新定时器
   */
  startAutoRefresh(): void {
    // 每5分钟检查一次token状态
    setInterval(() => {
      this.autoRefreshToken()
    }, 5 * 60 * 1000)
  }
}

// 导出单例实例
export const authApiService = AuthApiService.getInstance()
// 启动自动刷新
if (typeof window !== 'undefined') {
  authApiService.startAutoRefresh()
}
