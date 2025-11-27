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
  role: 'super_admin' | 'admin' | 'department_manager' | 'sales_staff' | 'customer_service'
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
        const { username, password } = credentials

        console.log('[Auth] Mock模式登录尝试:', username)

        // 1. 优先从localStorage的用户管理中查找用户
        try {
          const savedUsers = localStorage.getItem('crm_mock_users')
          if (savedUsers) {
            const users = JSON.parse(savedUsers)
            const user = users.find((u: unknown) => u.username === username)

            if (user) {
              console.log('[Auth] 在localStorage中找到用户:', user.username)

              // 验证密码 (注意:这里是明文比较,仅用于开发环境)
              if (user.password === password) {
                console.log('[Auth] 密码验证成功')

                // 【批次175修复】获取用户的角色权限，支持中文名称和英文code
                let roleCode = user.roleId || user.role || 'sales_staff'
                let userPermissions: string[] = []

                // 从角色配置中获取权限
                try {
                  const roles = JSON.parse(localStorage.getItem('crm_roles') || '[]')

                  // 先尝试用code匹配
                  let userRole = roles.find((r: unknown) => r.code === roleCode)

                  // 【批次175修复】如果找不到，尝试用name匹配（兼容中文角色名）
                  if (!userRole) {
                    userRole = roles.find((r: unknown) => r.name === roleCode)
                    if (userRole) {
                      console.log(`[Auth] 角色名称转换: ${roleCode} → ${userRole.code}`)
                      roleCode = userRole.code
                      // 更新用户数据中的role字段为code
                      user.role = userRole.code
                      user.roleId = userRole.code
                      // 同步更新localStorage中的用户数据
                      const userIndex = users.findIndex((u: unknown) => u.username === username)
                      if (userIndex !== -1) {
                        users[userIndex].role = userRole.code
                        users[userIndex].roleId = userRole.code
                        localStorage.setItem('crm_mock_users', JSON.stringify(users))
                        console.log('[Auth] 已自动修复用户角色字段')
                      }
                    }
                  }

                  if (userRole && userRole.permissions && userRole.permissions.length > 0) {
                    userPermissions = userRole.permissions
                    console.log('[Auth] 从角色配置加载权限:', userPermissions.length, '个')
                  } else {
                    console.warn('[Auth] 未找到角色权限配置或权限为空:', roleCode)
                    // 【批次191修复】使用默认权限，避免权限为空导致菜单不显示
                    userPermissions = this.getDefaultPermissions(roleCode)
                    console.log('[Auth] 使用默认权限:', userPermissions.length, '个')
                  }
                } catch (error) {
                  console.warn('[Auth] 获取角色权限失败:', error)
                  // 【批次191修复】出错时也使用默认权限
                  userPermissions = this.getDefaultPermissions(roleCode)
                  console.log('[Auth] 使用默认权限:', userPermissions.length, '个')
                }

                // 构造登录响应
                // 【批次196修复】直接使用crm_mock_users中的完整用户数据，而不是重新构建
                // 这样可以确保所有字段都被保留（包括departmentName、roleName等）
                const completeUserInfo = {
                  ...user,  // 保留crm_mock_users中的所有字段
                  role: roleCode as unknown,
                  permissions: userPermissions,
                  lastLoginAt: new Date().toLocaleString('zh-CN'),
                  updatedAt: new Date().toISOString()
                }

                const loginResponse: LoginResponse = {
                  user: completeUserInfo as unknown,
                  tokens: {
                    accessToken: `mock-token-${Date.now()}`,
                    refreshToken: `mock-refresh-${Date.now()}`
                  },
                  expiresIn: 3600
                }

                // 更新用户的最后登录时间
                user.lastLoginTime = new Date().toLocaleString('zh-CN')
                user.loginCount = (user.loginCount || 0) + 1
                localStorage.setItem('crm_mock_users', JSON.stringify(users))

                // 【批次196修复】保存完整的用户信息到localStorage
                this.api.setAuthToken(loginResponse.tokens.accessToken)
                localStorage.setItem('refresh_token', loginResponse.tokens.refreshToken)

                // 保存到多个键，确保数据一致性
                localStorage.setItem('user_info', JSON.stringify(completeUserInfo))
                localStorage.setItem('user', JSON.stringify(completeUserInfo))
                localStorage.setItem('userPermissions', JSON.stringify(userPermissions))

                console.log('[Auth] 已保存用户信息和权限:')
                console.log('  - 用户:', completeUserInfo.username)
                console.log('  - 角色:', completeUserInfo.role)
                console.log('  - 权限数量:', userPermissions.length)

                const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000)
                localStorage.setItem('token_expiry', expiryTime.toString())

                console.log('[Auth] localStorage用户登录成功:', user.realName)
                return loginResponse
              } else {
                console.log('[Auth] 密码验证失败')
              }
            }
          }
        } catch (error) {
          console.warn('[Auth] 从localStorage读取用户失败:', error)
        }

        // 2. 如果localStorage中没有找到,使用源代码中的预设账号
        console.log('[Auth] localStorage中未找到用户,尝试源代码预设账号')

        // 【批次261修复】从源代码导入预设账号
        const { validatePresetAccount } = await import('@/config/presetAccounts')
        const presetAccount = validatePresetAccount(username, password)

        if (presetAccount) {
          console.log('[Auth] 使用源代码预设账号登录:', presetAccount.name)

          // 获取角色权限
          const userPermissions: string[] = this.getDefaultPermissions(presetAccount.roleId)

          const completeUserInfo = {
            ...presetAccount,
            permissions: userPermissions,
            lastLoginAt: new Date().toLocaleString('zh-CN'),
            updatedAt: new Date().toISOString()
          }

          const loginResponse: LoginResponse = {
            user: completeUserInfo as unknown,
            tokens: {
              accessToken: `mock-token-${Date.now()}`,
              refreshToken: `mock-refresh-${Date.now()}`
            },
            expiresIn: 3600
          }

          // 保存登录信息
          this.api.setAuthToken(loginResponse.tokens.accessToken)
          localStorage.setItem('refresh_token', loginResponse.tokens.refreshToken)
          localStorage.setItem('user_info', JSON.stringify(completeUserInfo))
          localStorage.setItem('user', JSON.stringify(completeUserInfo))
          localStorage.setItem('userPermissions', JSON.stringify(userPermissions))

          const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000)
          localStorage.setItem('token_expiry', expiryTime.toString())

          console.log('[Auth] 源代码预设账号登录成功:', presetAccount.name)
          return loginResponse
        }

        // 【批次193注释】注释掉测试账号，只使用真实预设账号
        // 定义所有测试用户
        const mockUsers: Record<string, { password: string; user: User }> = {} as unknown
        /*
        const mockUsers: Record<string, { password: string; user: User }> = {
          superadmin: {
            password: 'super123456',
            user: {
              id: 0,
              username: 'superadmin',
              email: 'superadmin@example.com',
              realName: '超级管理员',
              phone: '13800138000',
              avatar: '',
              role: 'super_admin',
              status: 'active',
              departmentId: 1,
              department: {
                id: 1,
                name: '系统管理部',
                code: 'SYS'
              },
              permissions: ['*'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          admin: {
            password: 'admin123',
            user: {
              id: 1,
              username: 'admin',
              email: 'admin@example.com',
              realName: '系统管理员',
              phone: '13800138001',
              avatar: '',
              role: 'admin',
              status: 'active',
              departmentId: 1,
              department: {
                id: 1,
                name: '系统管理部',
                code: 'SYS'
              },
              permissions: [
                'user:read', 'user:write', 'user:delete',
                'customer:read', 'customer:write', 'customer:delete',
                'order:read', 'order:write', 'order:delete',
                'sms:read', 'sms:write', 'sms:delete',
                'system:read', 'system:write'
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          manager: {
            password: 'manager123',
            user: {
              id: 2,
              username: 'manager',
              email: 'manager@example.com',
              realName: '部门经理',
              phone: '13800138002',
              avatar: '',
              role: 'department_manager',
              status: 'active',
              departmentId: 2,
              department: {
                id: 2,
                name: '销售部',
                code: 'SALES'
              },
              permissions: [
                'dashboard', 'dashboard:personal', 'dashboard:department',
                'customer', 'customer:list', 'customer:view:personal', 'customer:view:department',
                'customer:add', 'customer:edit', 'customer:import', 'customer:export',
                'customer:groups', 'customer:tags',
                'order', 'order:list', 'order:view:personal', 'order:view:department',
                'order:add', 'order:edit', 'order:audit',
                'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',
                'service:sms',
                'performance', 'performance:personal', 'performance:personal:view',
                'performance:team', 'performance:team:view', 'performance:analysis', 'performance:share',
                'logistics', 'logistics:list', 'logistics:view', 'logistics:add', 'logistics:edit',
                'logistics:tracking', 'logistics:tracking:view', 'logistics:shipping', 'logistics:status',
                'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:view:department',
                'aftersale:add', 'aftersale:edit', 'aftersale:analysis',
                'data', 'data:customer', 'data:customer:search', 'data:list', 'data:recycle'
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          sales001: {
            password: 'sales123',
            user: {
              id: 3,
              username: 'sales001',
              email: 'sales001@example.com',
              realName: '销售员工',
              phone: '13800138003',
              avatar: '',
              role: 'sales_staff',
              status: 'active',
              departmentId: 2,
              department: {
                id: 2,
                name: '销售部',
                code: 'SALES'
              },
              permissions: [
                'dashboard', 'dashboard:personal',
                'customer', 'customer:list', 'customer:view:personal', 'customer:add',
                'customer:groups', 'customer:tags',
                'order', 'order:list', 'order:view:personal', 'order:add',
                'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',
                'service:sms',
                'performance', 'performance:personal', 'performance:personal:view',
                'performance:team', 'performance:team:view', 'performance:share',
                'logistics', 'logistics:list', 'logistics:view',
                'logistics:tracking', 'logistics:tracking:view', 'logistics:shipping',
                'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:add',
                'data', 'data:customer', 'data:customer:search', 'data:list'
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          },
          service001: {
            password: 'service123',
            user: {
              id: 4,
              username: 'service001',
              email: 'service001@example.com',
              realName: '客服员工',
              phone: '13800138004',
              avatar: '',
              role: 'customer_service',
              status: 'active',
              departmentId: 3,
              department: {
                id: 3,
                name: '客服部',
                code: 'SERVICE'
              },
              permissions: [
                'customer', 'customer:list', 'customer:view:personal',
                'service', 'service:call', 'service:call:view', 'service:call:add', 'service:sms',
                'data', 'data:customer', 'data:list'
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        }
        */

        // 【批次193修改】测试账号已注释，只能使用真实预设账号登录
        // 验证用户名和密码
        const mockUser = mockUsers[username]
        if (mockUser && mockUser.password === password) {
          const mockResponse: LoginResponse = {
            user: mockUser.user,
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

          // 设置很长的token过期时间（30天），避免频繁过期
          const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000) // 30天
          localStorage.setItem('token_expiry', expiryTime.toString())

          console.log('[Auth] Mock API模式 - 登录成功:', mockResponse.user.username)
          return mockResponse
        } else {
          throw new Error('用户名或密码错误。请使用用户管理中的真实账号登录。')
        }
      }

      // 真实 API 调用 - 临时使用 mock-auth 绕过登录问题
      console.log('[Auth] 使用 Mock Auth API 登录:', credentials.username)
      const response = await this.api.post<unknown>('/mock-auth/login', credentials)

      // 适配后端返回格式：将 token 转换为 tokens.accessToken
      const loginResponse: LoginResponse = {
        user: response.user,
        tokens: {
          accessToken: response.token || response.tokens?.accessToken,
          refreshToken: response.refreshToken || response.tokens?.refreshToken || ''
        },
        expiresIn: response.expiresIn || 3600
      }

      console.log('[Auth] 真实 API 登录成功')
      return loginResponse

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
        // 尝试从本地存储获取用户信息
        const storedUserInfo = localStorage.getItem('user_info')
        if (storedUserInfo) {
          try {
            const user = JSON.parse(storedUserInfo)
            console.log('[Auth] Mock API模式 - 从本地存储返回用户数据:', user.username)
            return user
          } catch (error) {
            console.warn('[Auth] 解析本地用户信息失败，使用默认用户')
          }
        }

        // 如果没有本地存储的用户信息，返回默认admin用户
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
        console.log('[Auth] Mock API模式 - 返回默认模拟用户数据')

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
    return this.hasRole(['admin', 'super_admin'])
  }

  /**
   * 是否为管理员或经理
   */
  isManagerOrAdmin(): boolean {
    return this.hasRole(['admin', 'super_admin', 'manager'])
  }

  /**
   * 获取默认权限（当角色权限配置为空时使用）
   */
  private getDefaultPermissions(roleCode: string): string[] {
    // 根据角色返回默认权限
    const defaultPermissions: Record<string, string[]> = {
      'super_admin': ['*'],  // 超级管理员拥有所有权限
      'admin': ['*'],  // 管理员拥有所有权限
      'department_manager': [
        'dashboard', 'dashboard:personal', 'dashboard:department',
        'customer', 'customer:list', 'customer:view:personal', 'customer:view:department',
        'customer:add', 'customer:edit', 'customer:import', 'customer:export',
        'order', 'order:list', 'order:view:personal', 'order:view:department',
        'order:add', 'order:edit', 'order:audit',
        'performance', 'performance:personal', 'performance:team',
        'logistics', 'logistics:list', 'logistics:view',
        'data', 'data:customer', 'data:list'
      ],
      'manager': [  // 兼容旧的manager角色
        'dashboard', 'dashboard:personal', 'dashboard:department',
        'customer', 'customer:list', 'customer:view:personal', 'customer:view:department',
        'customer:add', 'customer:edit', 'customer:import', 'customer:export',
        'order', 'order:list', 'order:view:personal', 'order:view:department',
        'order:add', 'order:edit', 'order:audit',
        'performance', 'performance:personal', 'performance:team',
        'logistics', 'logistics:list', 'logistics:view',
        'data', 'data:customer', 'data:list'
      ],
      'sales_staff': [
        'dashboard', 'dashboard:personal',
        'customer', 'customer:list', 'customer:view:personal', 'customer:add',
        'order', 'order:list', 'order:view:personal', 'order:add',
        'performance', 'performance:personal',
        'logistics', 'logistics:list', 'logistics:view',
        'data', 'data:customer', 'data:list'
      ],
      'customer_service': [
        'customer', 'customer:list', 'customer:view:personal',
        'service', 'service:call', 'service:sms',
        'data', 'data:customer', 'data:list'
      ]
    }

    return defaultPermissions[roleCode] || defaultPermissions['sales_staff']
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
