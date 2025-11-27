import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { permissionService, UserRole, PermissionLevel, SensitiveInfoType, DataScope, CustomerServiceType } from '@/services/permission'
import { authApiService } from '@/services/authApiService'
import { autoStatusSyncService } from '@/services/autoStatusSync'
import { setUserPermissions } from '@/utils/permission'
import { rolePermissionService } from '@/services/rolePermissionService'
import { getDefaultRolePermissions } from '@/config/defaultRolePermissions'

export interface User {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'department_manager' | 'sales_staff' | 'customer_service'
  department: string
  avatar?: string
  // 新增权限相关字段
  userRole?: UserRole
  permissionLevel?: PermissionLevel
  dataScope?: DataScope
  departmentId?: string
  departmentIds?: string[]
  customerServiceType?: CustomerServiceType
  sensitiveInfoAccess?: SensitiveInfoType[]
  // 密码相关字段
  isDefaultPassword?: boolean // 是否为默认密码
  passwordLastChanged?: Date // 密码最后修改时间
  passwordExpiresAt?: Date // 密码过期时间
  forcePasswordChange?: boolean // 是否强制修改密码
  // 在职状态
  employmentStatus?: 'active' | 'resigned' // active=在职, resigned=离职
  resignedDate?: string // 离职日期
}

export interface PhoneViewSettings {
  enabled: boolean
  whitelist: string[] // 用户ID白名单
}

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null)
  const token = ref<string>('')
  const permissions = ref<string[]>([])
  const isLoggedIn = ref<boolean>(false)
  const users = ref<User[]>([])
  const phoneViewSettings = ref<PhoneViewSettings>({
    enabled: true,
    whitelist: []
  })

  // 权限更新监听器
  const permissionUpdateListener = (roleId: string) => {
    console.log(`收到权限更新通知，角色ID: ${roleId}`)
    // 如果当前用户的角色ID匹配，则刷新权限
    if (currentUser.value) {
      const userRoleId = getRoleIdByRole(currentUser.value.role)
      if (userRoleId === roleId) {
        console.log('当前用户角色权限已更新，重新加载权限')
        refreshUserPermissions()
      }
    }
  }

  // 根据用户角色获取角色ID
  const getRoleIdByRole = (role: string): string => {
    const roleMap: Record<string, string> = {
      'admin': '2',
      'manager': '3',
      'employee': '4',
      'customer_service': '5'
    }
    return roleMap[role] || '4'
  }

  // 刷新用户权限
  const refreshUserPermissions = async () => {
    if (!currentUser.value) return

    try {
      const userRoleId = getRoleIdByRole(currentUser.value.role)
      const rolePermissions = await rolePermissionService.getRolePermissions(userRoleId)

      if (rolePermissions && rolePermissions.permissions) {
        const permissionCodes = rolePermissions.permissions.map(p => p.code)
        permissions.value = permissionCodes
        setUserPermissions(permissionCodes)
        console.log('用户权限已刷新:', permissionCodes)
      }
    } catch (error) {
      console.error('刷新用户权限失败:', error)
    }
  }

  // 初始化权限监听器
  const initPermissionListener = () => {
    // 导入 permissionService 并添加监听器
    import('@/services/permissionService.js').then(module => {
      const permissionService = module.default
      permissionService.addPermissionUpdateListener(permissionUpdateListener)
      console.log('权限更新监听器已初始化')
    }).catch(error => {
      console.error('初始化权限监听器失败:', error)
    })
  }

  // 在 store 初始化时设置监听器
  initPermissionListener()

  // 计算属性 - 根据新的角色体系重新定义
  const isAdmin = computed(() => currentUser.value?.role === 'super_admin') // 超级管理员
  const isDepartmentManager = computed(() => currentUser.value?.role === 'department_manager') // 部门管理员（部门负责人）
  const isSalesStaff = computed(() => currentUser.value?.role === 'sales_staff') // 销售员
  const isCustomerService = computed(() => currentUser.value?.role === 'customer_service') // 客服

  // 兼容性计算属性（保留以避免破坏现有代码）
  const isManager = computed(() => isDepartmentManager.value || isAdmin.value) // 兼容：管理员权限
  const isEmployee = computed(() => isSalesStaff.value) // 兼容：员工权限映射到销售员
  const isDepartmentHead = computed(() => {
    // 部门负责人权限：超级管理员或部门管理员
    return isAdmin.value || isDepartmentManager.value
  })
  const user = computed(() => currentUser.value)

  // 新的权限系统计算属性
  const isSuperAdmin = computed(() => {
    if (!currentUser.value) return false
    // 直接检查用户角色，而不依赖权限服务
    return currentUser.value.role === 'super_admin' || currentUser.value.userRole === UserRole.SUPER_ADMIN
  })

  const isWhitelistMember = computed(() => {
    if (!currentUser.value) return false
    // 检查用户是否为白名单成员或部门管理员
    return currentUser.value.userRole === UserRole.WHITELIST_MEMBER ||
           isDepartmentManager.value ||
           isSuperAdmin.value
  })

  const userPermissionLevel = computed(() => {
    if (!currentUser.value) return PermissionLevel.RESTRICTED
    const permission = permissionService.getUserPermission(currentUser.value.id)
    return permission?.permissions[0] || PermissionLevel.RESTRICTED
  })

  // 手机号查看权限：使用新的权限服务检查
  const canViewPhone = computed(() => {
    if (!currentUser.value) return false
    const result = permissionService.checkSensitiveInfoAccess(currentUser.value.id, SensitiveInfoType.PHONE)
    return result.hasAccess
  })

  // 新的敏感信息访问权限检查
  const canAccessSensitiveInfo = computed(() => {
    return (infoType: SensitiveInfoType) => {
      if (!currentUser.value) return false
      const result = permissionService.checkSensitiveInfoAccess(currentUser.value.id, infoType)
      return result.hasAccess
    }
  })

  // 数据访问权限检查
  const canAccessData = computed(() => {
    return (dataOwnerId?: string, dataDepartmentId?: string) => {
      if (!currentUser.value) return false
      const result = permissionService.checkDataAccess(currentUser.value.id, dataOwnerId, dataDepartmentId)
      return result.hasAccess
    }
  })

  // 获取用户数据范围
  const userDataScope = computed(() => {
    if (!currentUser.value) return DataScope.SELF
    const permission = permissionService.getUserPermission(currentUser.value.id)
    return permission?.dataScope || DataScope.SELF
  })

  // 获取用户可访问的部门列表
  const accessibleDepartments = computed(() => {
    if (!currentUser.value) return []
    return permissionService.getAccessibleDepartments(currentUser.value.id)
  })

  // 售后处理权限检查
  const canProcessAfterSales = computed(() => {
    if (!currentUser.value) return false
    // 超级管理员有完全权限
    if (isAdmin.value) return true
    // 检查用户是否有售后处理权限
    return permissions.value.includes('service:process') ||
           permissions.value.includes('service:write') ||
           isDepartmentManager.value
  })

  // 售后编辑权限检查
  const canEditAfterSales = computed(() => {
    if (!currentUser.value) return false
    // 超级管理员有完全权限
    if (isAdmin.value) return true
    // 检查用户是否有售后编辑权限
    return permissions.value.includes('service:edit') ||
           permissions.value.includes('service:write') ||
           isDepartmentManager.value
  })

  // 售后关闭权限检查
  const canCloseAfterSales = computed(() => {
    if (!currentUser.value) return false
    // 超级管理员有完全权限
    if (isAdmin.value) return true
    // 检查用户是否有售后关闭权限
    return permissions.value.includes('service:close') ||
           permissions.value.includes('service:write') ||
           isDepartmentManager.value
  })

  // 检查用户是否有指定的售后权限
  const hasAfterSalesPermission = (permission: string) => {
    if (!currentUser.value) return false
    // 超级管理员有所有权限
    if (isAdmin.value) return true
    // 检查具体权限
    return permissions.value.includes(permission)
  }

  // 物流状态更新权限检查
  const canAccessLogisticsStatusUpdate = computed(() => {
    if (!currentUser.value) return false

    // 超级管理员有完全权限
    if (isSuperAdmin.value) return true

    // 白名单成员有权限
    if (isWhitelistMember.value) return true

    // 检查用户是否有物流状态更新权限
    if (permissions.value.includes('logistics:status')) return true

    // 部门管理员有权限
    if (isDepartmentManager.value) return true

    // 物流部门主管有权限
    if (currentUser.value.department === 'logistics' &&
        currentUser.value.position === 'supervisor') return true

    return false
  })

  // 检查用户是否有指定的物流权限
  const hasLogisticsPermission = (permission: string) => {
    if (!currentUser.value) return false
    // 超级管理员有所有权限
    if (isAdmin.value) return true
    // 检查具体权限
    return permissions.value.includes(permission)
  }

  // 清除用户数据库缓存（用于开发环境重置）
  const clearUserDatabaseCache = () => {
    localStorage.removeItem('userDatabase')
    console.log('[Dev] 用户数据库缓存已清除，将使用最新的默认数据')
  }

  // 方法
  const login = async (username: string, password: string) => {
    // 获取真实用户数据库
    const getUserDatabase = () => {
      const savedData = localStorage.getItem('userDatabase')
      // 在开发环境中，如果检测到角色配置更新，清除缓存
      if (savedData) {
        const userData = JSON.parse(savedData)
        // 检查是否有旧的角色配置（manager角色应该是department_manager）
        const hasOldRoleConfig = userData.some((user: unknown) =>
          (user.username === 'manager' && user.roleId === 'manager') ||
          (user.username === 'sales001' && user.roleId === 'employee') ||
          (user.username === 'service001' && user.roleId === 'employee')
        )
        if (hasOldRoleConfig) {
          console.log('[Dev] 检测到旧的角色配置，清除缓存使用新配置')
          localStorage.removeItem('userDatabase')
        } else {
          return userData
        }
      }
      // 默认用户数据
      return [
        {
          id: 'admin',
          username: 'admin',
          realName: '系统管理员',
          email: 'admin@example.com',
          phone: '13800138000',
          roleId: 'admin',
          status: 'active',
          isOnline: false,
          avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          lastLoginTime: null,
          loginCount: 0,
          createTime: '2024-01-01 00:00:00',
          remark: '系统管理员账户',
          password: 'admin123',
          needChangePassword: false
        },
        {
          id: 'dept_manager',
          username: 'dept_manager',
          realName: '部门管理员',
          email: 'dept_manager@example.com',
          phone: '13800138001',
          roleId: 'department_manager',
          status: 'active',
          isOnline: false,
          avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          lastLoginTime: null,
          loginCount: 0,
          createTime: '2024-01-01 00:00:00',
          remark: '部门管理员账户',
          password: 'dept123',
          needChangePassword: false,
          departmentId: 'dept_001',
          departmentIds: ['dept_001']
        },
        {
          id: 'sales001',
          username: 'sales001',
          realName: '销售员工',
          email: 'sales001@example.com',
          phone: '13800138002',
          roleId: 'sales_staff',
          status: 'active',
          isOnline: false,
          avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          lastLoginTime: null,
          loginCount: 0,
          createTime: '2024-01-01 00:00:00',
          remark: '销售员工账户',
          password: 'sales123',
          needChangePassword: false,
          departmentId: 'dept_001'
        },
        {
          id: 'service001',
          username: 'service001',
          realName: '客服员工',
          email: 'service001@example.com',
          phone: '13800138003',
          roleId: 'customer_service',
          status: 'active',
          isOnline: false,
          avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
          lastLoginTime: null,
          loginCount: 0,
          createTime: '2024-01-01 00:00:00',
          remark: '客服员工账户',
          password: 'service123',
          needChangePassword: false,
          customerServiceType: 'general'
        }
      ]
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const userDatabase = getUserDatabase()

        // 查找用户
        const user = userDatabase.find((u: User & { username: string; password: string }) => u.username === username)

        if (!user) {
          reject(new Error('用户不存在'))
          return
        }

        if (user.status !== 'active') {
          reject(new Error('用户已被禁用'))
          return
        }

        if (user.password !== password) {
          reject(new Error('密码错误'))
          return
        }

        // 登录成功
        token.value = 'token-' + user.id + '-' + Date.now()
        isLoggedIn.value = true

        // 更新用户登录信息
        user.lastLoginTime = new Date().toLocaleString()
        user.loginCount = (user.loginCount || 0) + 1
        user.isOnline = true

        // 保存更新后的用户数据库
        localStorage.setItem('userDatabase', JSON.stringify(userDatabase))

        // 设置当前用户信息
        currentUser.value = {
          id: user.id,
          name: user.realName,
          email: user.email,
          role: user.roleId === 'admin' ? 'super_admin' :
                user.roleId === 'department_manager' ? 'department_manager' :
                user.roleId === 'sales_staff' ? 'sales_staff' :
                user.roleId === 'customer_service' ? 'customer_service' :
                user.roleId || user.role || 'sales_staff',  // 【批次180修复】使用实际的role，默认为sales_staff
          department: user.department || '销售部',
          avatar: user.avatar,
          userRole: user.roleId === 'admin' ? UserRole.SUPER_ADMIN :
                   user.roleId === 'department_manager' ? UserRole.DEPARTMENT_MANAGER :
                   user.roleId === 'sales_staff' ? UserRole.SALES_STAFF :
                   user.roleId === 'customer_service' ? UserRole.CUSTOMER_SERVICE :
                   UserRole.REGULAR_USER,
          permissionLevel: user.roleId === 'admin' ? PermissionLevel.FULL_ACCESS :
                          user.roleId === 'department_manager' ? PermissionLevel.PARTIAL_ACCESS :
                          PermissionLevel.RESTRICTED,
          dataScope: user.dataScope || (user.roleId === 'admin' ? DataScope.ALL :
                    user.roleId === 'department_manager' ? DataScope.DEPARTMENT : DataScope.SELF),
          departmentId: user.departmentId,
          departmentIds: user.departmentIds,
          customerServiceType: user.customerServiceType,
          forcePasswordChange: user.needChangePassword
        }

        // 设置用户权限 - 从默认配置中获取
        let userPermissions: string[] = []

        // 从默认权限配置文件中获取该角色的权限
        userPermissions = getDefaultRolePermissions(user.roleId)

        // 设置权限服务
        if (user.roleId === 'admin' || user.roleId === 'super_admin') {
          permissionService.setUserPermission({
            userId: user.id,
            role: UserRole.SUPER_ADMIN,
            permissions: [PermissionLevel.FULL_ACCESS],
            dataScope: DataScope.ALL
          })
        } else if (user.roleId === 'department_manager') {
          permissionService.setUserPermission({
            userId: user.id,
            role: UserRole.DEPARTMENT_MANAGER,
            permissions: [PermissionLevel.PARTIAL_ACCESS],
            dataScope: DataScope.DEPARTMENT,
            departmentId: user.departmentId || 'dept_001',
            departmentIds: user.departmentIds || ['dept_001'],
            whitelistTypes: [SensitiveInfoType.PHONE, SensitiveInfoType.EMAIL, SensitiveInfoType.WECHAT]
          })
        } else if (user.roleId === 'sales_staff') {
          permissionService.setUserPermission({
            userId: user.id,
            role: UserRole.SALES_STAFF,
            permissions: [PermissionLevel.RESTRICTED],
            dataScope: DataScope.SELF,
            departmentId: user.departmentId || 'dept_001'
          })
        } else if (user.roleId === 'customer_service') {
          permissionService.setUserPermission({
            userId: user.id,
            role: UserRole.CUSTOMER_SERVICE,
            permissions: [PermissionLevel.PARTIAL_ACCESS],
            dataScope: DataScope.ALL,
            customerServiceType: user.customerServiceType || CustomerServiceType.GENERAL,
            whitelistTypes: [SensitiveInfoType.PHONE]
          })
        } else {
          permissionService.setUserPermission({
            userId: user.id,
            role: UserRole.REGULAR_USER,
            permissions: [PermissionLevel.RESTRICTED],
            dataScope: DataScope.SELF
          })
        }

        // 设置权限到新的权限系统
        permissions.value = userPermissions
        setUserPermissions(userPermissions)

        localStorage.setItem('auth_token', token.value)
        localStorage.setItem('user', JSON.stringify(currentUser.value))

        // 启动自动同步服务
        const config = autoStatusSyncService.getConfig()
        if (config.enabled) {
          autoStatusSyncService.start()
        }

        resolve(true)
      }, 1000)
    })
  }

  // 真正的API登录方法
  const loginWithApi = async (username: string, password: string, rememberMe = false) => {
    try {
      const response = await authApiService.login({
        username,
        password,
        rememberMe
      })

      // 立即设置token和登录状态，确保状态同步
      console.log('[Auth] === 开始提取Token ===')
      console.log('[Auth] response:', response)
      console.log('[Auth] response.data:', response.data)

      const tokensData = response.data?.tokens || response.tokens
      console.log('[Auth] tokensData:', tokensData)

      const accessToken = tokensData?.accessToken || tokensData?.access_token || response.token
      console.log('[Auth] accessToken:', accessToken)

      if (!accessToken) {
        console.error('[Auth] ❌ 登录响应中未找到Token!')
        throw new Error('登录响应格式错误：未找到Token')
      }

      token.value = accessToken
      isLoggedIn.value = true

      // 立即保存到localStorage
      localStorage.setItem('auth_token', accessToken)

      console.log('[Auth] ✅ Token已设置:', accessToken.substring(0, 30) + '...')
      console.log('[Auth] ✅ localStorage已保存:', localStorage.getItem('auth_token')?.substring(0, 30) + '...')

      // 设置当前用户信息，映射API响应到本地用户格式
      const userData = response.data?.user || response.user
      currentUser.value = {
        id: userData.id.toString(),
        name: userData.realName || userData.name,
        email: userData.email,
        role: (userData.role === 'admin' || userData.role === 'super_admin') ? 'super_admin' :
              userData.role === 'department_manager' ? 'department_manager' :
              userData.role === 'sales_staff' ? 'sales_staff' :
              userData.role === 'customer_service' ? 'customer_service' :
              userData.role || 'sales_staff',
        department: userData.department?.name || userData.departmentName || '未分配',
        avatar: userData.avatar,
        userRole: (userData.role === 'admin' || userData.role === 'super_admin') ? UserRole.SUPER_ADMIN :
                 userData.role === 'department_manager' ? UserRole.DEPARTMENT_MANAGER :
                 userData.role === 'sales_staff' ? UserRole.SALES_STAFF :
                 userData.role === 'customer_service' ? UserRole.CUSTOMER_SERVICE :
                 UserRole.REGULAR_USER,
        permissionLevel: (userData.role === 'admin' || userData.role === 'super_admin') ? PermissionLevel.FULL_ACCESS :
                        userData.role === 'department_manager' ? PermissionLevel.PARTIAL_ACCESS :
                        PermissionLevel.RESTRICTED,
        dataScope: userData.dataScope || ((userData.role === 'admin' || userData.role === 'super_admin') ? DataScope.ALL :
                  userData.role === 'department_manager' ? DataScope.DEPARTMENT : DataScope.SELF),
        departmentId: userData.departmentId,
        departmentIds: userData.departmentIds,
        customerServiceType: userData.customerServiceType,
        forcePasswordChange: false // API会在响应中提供这个信息
      }

      // 设置用户权限 - 使用新的权限系统，优先从localStorage读取角色权限配置
      let userPermissions: string[] = []

      // 获取角色ID映射 - 与rolePermissionService中的角色定义保持一致
      const roleIdMap: Record<string, string> = {
        'admin': '1',
        'manager': '3',
        'department_manager': '3',
        'sales': '4',
        'sales_staff': '4',
        'employee': '4',
        'service': '5',
        'customer_service': '5'
      }

      const roleId = roleIdMap[userData.role] || '4'

      try {
        // 尝试从localStorage获取角色权限配置
        const rolePermissions = await rolePermissionService.getRolePermissions(roleId)
        if (rolePermissions && rolePermissions.permissions.length > 0) {
          userPermissions = rolePermissions.permissions.map(p => p.code || p.id)
          console.log(`[Auth] 从配置加载角色权限: ${response.user.role}`, userPermissions)
        } else {
          throw new Error('No configured permissions found')
        }
      } catch (error) {
        console.warn(`[Auth] 无法获取角色权限配置，使用默认权限: ${response.user.role}`, error)

        // 如果无法获取配置的权限，使用默认权限配置文件
        userPermissions = getDefaultRolePermissions(response.user.role)
      }

      // 设置权限到新的权限系统
      if (userData.role === 'admin' || userData.role === 'super_admin') {
        permissionService.setUserPermission({
          userId: userData.id.toString(),
          role: UserRole.SUPER_ADMIN,
          permissions: [PermissionLevel.FULL_ACCESS],
          dataScope: DataScope.ALL
        })
      } else if (userData.role === 'department_manager') {
        permissionService.setUserPermission({
          userId: userData.id.toString(),
          role: UserRole.DEPARTMENT_MANAGER,
          permissions: [PermissionLevel.PARTIAL_ACCESS],
          dataScope: DataScope.DEPARTMENT,
          departmentId: userData.departmentId || 'dept_001',
          departmentIds: userData.departmentIds || ['dept_001'],
          whitelistTypes: [SensitiveInfoType.PHONE, SensitiveInfoType.EMAIL, SensitiveInfoType.WECHAT]
        })
      } else if (userData.role === 'sales_staff') {
        permissionService.setUserPermission({
          userId: userData.id.toString(),
          role: UserRole.SALES_STAFF,
          permissions: [PermissionLevel.RESTRICTED],
          dataScope: DataScope.SELF,
          departmentId: userData.departmentId || 'dept_001'
        })
      } else if (userData.role === 'customer_service') {
        permissionService.setUserPermission({
          userId: userData.id.toString(),
          role: UserRole.CUSTOMER_SERVICE,
          permissions: [PermissionLevel.PARTIAL_ACCESS],
          dataScope: DataScope.ALL,
          customerServiceType: userData.customerServiceType || CustomerServiceType.GENERAL,
          whitelistTypes: [SensitiveInfoType.PHONE]
        })
      } else {
        permissionService.setUserPermission({
          userId: userData.id.toString(),
          role: UserRole.REGULAR_USER,
          permissions: [PermissionLevel.RESTRICTED],
          dataScope: DataScope.SELF
        })
      }

      // 设置权限到新的权限系统
      permissions.value = userPermissions
      setUserPermissions(userPermissions)

      // 【批次190修复】确保权限保存到用户对象中
      const completeUserInfo = {
        ...currentUser.value,
        permissions: userPermissions
      }

      // 保存到localStorage（注意：API服务期望auth_token作为key）
      localStorage.setItem('auth_token', token.value)
      localStorage.setItem('user', JSON.stringify(completeUserInfo))
      localStorage.setItem('user_info', JSON.stringify(completeUserInfo))
      localStorage.setItem('userPermissions', JSON.stringify(userPermissions))

      // 设置Token过期时间（7天）
      const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000)
      localStorage.setItem('token_expiry', expiryTime.toString())

      console.log('[Auth] 已保存用户信息和权限:')
      console.log('  - 用户:', completeUserInfo.name)
      console.log('  - 角色:', completeUserInfo.role)
      console.log('  - 权限数量:', userPermissions.length)
      console.log('  - Token过期时间:', new Date(expiryTime).toLocaleString())

      // 启动自动同步服务
      const config = autoStatusSyncService.getConfig()
      if (config.enabled) {
        autoStatusSyncService.start()
      }

      return true
    } catch (error) {
      console.error('API登录失败:', error)
      throw error
    }
  }

  // 带重试机制的登录方法
  const loginWithRetry = async (username: string, password: string, rememberMe = false, maxRetries = 3) => {
    let lastError: unknown

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await loginWithApi(username, password, rememberMe)

        // 如果登录成功，确保状态已同步并立即返回
        if (result && token.value && isLoggedIn.value) {
          console.log('[Auth] 登录重试成功，状态已同步')
          return result
        }

      } catch (error: unknown) {
        lastError = error

        // 如果是频率限制错误且不是最后一次尝试，进行重试
        if ((error.message?.includes('频繁') || error.message?.includes('429') || error.message === 'RATE_LIMITED') && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // 指数退避，最大延迟10秒
          console.log(`[Auth] 登录重试 ${attempt}/${maxRetries}，${delay}ms后重试...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // 其他错误或最后一次尝试，直接抛出错误
        if (attempt === maxRetries) {
          throw lastError
        }
      }
    }

    throw lastError || new Error('登录失败，请稍后重试')
  }

  const logout = () => {
    // 打印调用栈，找出是谁调用了 logout
    console.trace('[Auth] ⚠️ logout 被调用！调用栈：')

    // 调用API登出
    authApiService.logout().catch(console.error)

    // 【批次190修复】清除所有认证和权限相关数据
    currentUser.value = null
    token.value = ''
    permissions.value = []
    isLoggedIn.value = false
    users.value = []

    // 清除所有localStorage中的认证数据
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    localStorage.removeItem('user_info')
    localStorage.removeItem('userPermissions')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token_expiry')

    console.log('[Auth] 已清除所有认证数据')
  }

  const loadUsers = async () => {
    try {
      // 使用统一的用户数据服务,自动适配localStorage和API
      const { default: userDataService } = await import('@/services/userDataService')
      const loadedUsers = await userDataService.getUsers()

      if (loadedUsers.length > 0) {
        users.value = loadedUsers.map((user: unknown) => ({
          id: user.id,
          name: user.name,
          username: user.username,
          employeeNumber: user.employeeNumber,
          email: user.email,
          role: user.role,
          department: user.department,
          departmentId: user.departmentId,
          position: user.position,
          avatar: user.avatar,
          status: user.status || 'active',
          createTime: user.createTime,
          createdAt: user.createdAt,
          employmentStatus: user.employmentStatus || 'active'
        }))

        console.log('[UserStore] 用户列表已加载:', users.value.length, '个用户')
        console.log('[UserStore] 数据来源:', userDataService.getCurrentMode())
      } else {
        // 如果没有保存的数据，创建默认用户列表
        users.value = [
          {
            id: 'admin',
            name: '超级管理员',
            email: 'admin@company.com',
            role: 'admin',
            department: '管理部',
            status: 'active'
          },
          {
            id: 'sales1',
            name: '小明',
            email: 'xiaoming@company.com',
            role: 'sales_staff',
            department: '销售部',
            status: 'active'
          },
          {
            id: 'sales2',
            name: '张三',
            email: 'zhangsan@company.com',
            role: 'sales_staff',
            department: '销售部',
            status: 'active'
          },
          {
            id: 'sales3',
            name: '李四',
            email: 'lisi@company.com',
            role: 'sales_staff',
            department: '销售部',
            status: 'active'
          },

          {
            id: 'dept_manager1',
            name: '部门经理',
            email: 'deptmanager@company.com',
            role: 'department_manager',
            department: '销售部',
            status: 'active'
          }
        ]

        // 保存默认用户列表到本地存储
        localStorage.setItem('userDatabase', JSON.stringify(users.value))
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
      // 使用默认用户列表作为后备
      users.value = [
        {
          id: 'sales1',
          name: '小明',
          email: 'xiaoming@company.com',
          role: 'sales_staff',
          department: '销售部',
          status: 'active'
        },
        {
          id: 'sales2',
          name: '张三',
          email: 'zhangsan@company.com',
          role: 'sales_staff',
          department: '销售部',
          status: 'active'
        },
        {
          id: 'sales3',
          name: '李四',
          email: 'lisi@company.com',
          role: 'sales_staff',
          department: '销售部',
          status: 'active'
        },

      ]
    }
  }

  // 根据用户ID获取用户信息
  const getUserById = (userId: string) => {
    return users.value.find(user => String(user.id) === String(userId))
  }

  const initUser = async () => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('user')

    // 如果没有token或用户信息，直接返回，不进行任何API调用
    if (!savedToken || !savedUser) {
      console.log('[Auth] 没有保存的登录信息，跳过初始化')
      return
    }

    if (savedToken && savedUser) {
      try {
        // 检查是否为模拟登录token（以'token-'开头）
        if (savedToken.startsWith('token-')) {
          // 模拟登录，直接恢复状态
          token.value = savedToken
          currentUser.value = JSON.parse(savedUser)
          isLoggedIn.value = true
          console.log('[Auth] 模拟登录状态已恢复:', currentUser.value?.name)

          // 立即恢复用户权限到权限服务中
          if (currentUser.value?.role === 'admin') {
            permissions.value = [
              'customer.export', 'customer.edit', 'customer.delete',
              'order.export', 'order.edit',
              'service:read', 'service:write', 'service:edit', 'service:process', 'service:close', 'service:assign'
            ]
            // 确保权限服务中有正确的超级管理员权限
            permissionService.setUserPermission({
              userId: currentUser.value.id,
              role: UserRole.SUPER_ADMIN,
              permissions: [PermissionLevel.FULL_ACCESS]
            })
            console.log('[Auth] 超级管理员权限已设置:', currentUser.value.id)
          } else if (currentUser.value?.role === 'department_manager') {
            permissions.value = [
              'dashboard', 'dashboard:personal', 'dashboard:department',
              'customer', 'customer:list', 'customer:view:personal', 'customer:view:department',
              'customer:add', 'customer:edit', 'customer:import', 'customer:export',
              'order', 'order:list', 'order:view:personal', 'order:view:department',
              'order:add', 'order:edit',
              'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',
              'performance', 'performance:personal', 'performance:personal:view',
              'performance:team', 'performance:team:view', 'performance:analysis', 'performance:share',
              'logistics', 'logistics:list', 'logistics:view', 'logistics:tracking', 'logistics:tracking:view',
              'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:view:department',
              'aftersale:add', 'aftersale:edit', 'aftersale:analysis',
              'data', 'data:customer', 'data:customer:search'
            ]
            permissionService.setUserPermission({
              userId: currentUser.value.id,
              role: UserRole.DEPARTMENT_MANAGER,
              permissions: [PermissionLevel.PARTIAL_ACCESS],
              whitelistTypes: [SensitiveInfoType.PHONE, SensitiveInfoType.EMAIL, SensitiveInfoType.WECHAT]
            })
          } else if (currentUser.value?.role === 'sales_staff') {
            permissions.value = [
              'dashboard', 'dashboard:personal',
              'customer', 'customer:list', 'customer:view:personal', 'customer:add',
              'order', 'order:list', 'order:view:personal', 'order:add',
              'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',
              'performance', 'performance:personal', 'performance:personal:view',
              'performance:team', 'performance:team:view',
              'logistics', 'logistics:list', 'logistics:view', 'logistics:tracking', 'logistics:tracking:view',
              'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:add', 'aftersale:analysis',
              'data', 'data:customer', 'data:customer:search'
            ]
            permissionService.setUserPermission({
              userId: currentUser.value.id,
              role: UserRole.SALES_STAFF,
              permissions: [PermissionLevel.PARTIAL_ACCESS],
              whitelistTypes: [SensitiveInfoType.PHONE]
            })
          } else if (currentUser.value?.role === 'customer_service') {
            permissions.value = [
              'dashboard', 'order', 'order:list', 'order:audit',
              'service', 'service:read', 'service:write', 'service:process',
              'aftersale', 'aftersale:order',
              'logistics', 'logistics:shipping', 'logistics:list', 'logistics:view', 'logistics:tracking', 'logistics:status',
              'data', 'data:customer'
            ]
            permissionService.setUserPermission({
              userId: currentUser.value.id,
              role: UserRole.CUSTOMER_SERVICE,
              permissions: [PermissionLevel.PARTIAL_ACCESS],
              whitelistTypes: [SensitiveInfoType.PHONE]
            })
          } else {
            permissions.value = ['customer.view', 'order.view', 'service:read']
            permissionService.setUserPermission({
              userId: currentUser.value.id,
              role: UserRole.REGULAR_USER,
              permissions: [PermissionLevel.RESTRICTED]
            })
          }

          // 启动自动同步服务
          const config = autoStatusSyncService.getConfig()
          if (config.enabled) {
            autoStatusSyncService.start()
          }
        } else {
          // API登录，直接恢复状态（跳过token验证）
          console.log('[Auth] 跳过token验证，直接恢复登录状态')
          token.value = savedToken
          const userData = JSON.parse(savedUser)
          currentUser.value = userData
          isLoggedIn.value = true
          console.log('[Auth] API登录状态已恢复:', currentUser.value?.name)

          // 原始的token验证逻辑（已禁用）:
          // const isValid = await authApiService.validateToken()
          // if (isValid) {

            // 同样需要恢复权限服务中的权限信息
            if (userData?.role === 'admin') {
              permissionService.setUserPermission({
                userId: userData.id,
                role: UserRole.SUPER_ADMIN,
                permissions: [PermissionLevel.FULL_ACCESS]
              })
              console.log('[Auth] API超级管理员权限已设置:', userData.id)
            } else if (userData?.role === 'department_manager') {
              permissions.value = [
                'dashboard', 'dashboard:personal', 'dashboard:department',
                'customer', 'customer:list', 'customer:view:personal', 'customer:view:department',
                'customer:add', 'customer:edit', 'customer:import', 'customer:export',
                'order', 'order:list', 'order:view:personal', 'order:view:department',
                'order:add', 'order:edit',
                'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',
                'performance', 'performance:personal', 'performance:personal:view',
                'performance:team', 'performance:team:view', 'performance:analysis', 'performance:share',
                'logistics', 'logistics:list', 'logistics:view', 'logistics:tracking', 'logistics:tracking:view',
                'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:view:department',
                'aftersale:add', 'aftersale:edit', 'aftersale:analysis',
                'data', 'data:customer', 'data:customer:search'
              ]
              permissionService.setUserPermission({
                userId: userData.id,
                role: UserRole.DEPARTMENT_MANAGER,
                permissions: [PermissionLevel.PARTIAL_ACCESS],
                whitelistTypes: [SensitiveInfoType.PHONE, SensitiveInfoType.EMAIL, SensitiveInfoType.WECHAT]
              })
            } else if (userData?.role === 'sales_staff') {
              permissions.value = [
                'dashboard', 'dashboard:personal',
                'customer', 'customer:list', 'customer:view:personal', 'customer:add',
                'order', 'order:list', 'order:view:personal', 'order:add',
                'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',
                'performance', 'performance:personal', 'performance:personal:view',
                'performance:team', 'performance:team:view',
                'logistics', 'logistics:list', 'logistics:view', 'logistics:tracking', 'logistics:tracking:view',
                'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:add', 'aftersale:analysis',
                'data', 'data:customer', 'data:customer:search'
              ]
              permissionService.setUserPermission({
                userId: userData.id,
                role: UserRole.SALES_STAFF,
                permissions: [PermissionLevel.PARTIAL_ACCESS],
                whitelistTypes: [SensitiveInfoType.PHONE]
              })
            } else if (userData?.role === 'customer_service') {
              permissions.value = [
                'dashboard', 'order', 'order:list', 'order:audit',
                'service', 'service:read', 'service:write', 'service:process',
                'aftersale', 'aftersale:order',
                'logistics', 'logistics:shipping', 'logistics:list', 'logistics:view', 'logistics:tracking', 'logistics:status',
                'data', 'data:customer'
              ]
              permissionService.setUserPermission({
                userId: userData.id,
                role: UserRole.CUSTOMER_SERVICE,
                permissions: [PermissionLevel.PARTIAL_ACCESS],
                whitelistTypes: [SensitiveInfoType.PHONE]
              })
            } else {
              permissions.value = ['dashboard']
              permissionService.setUserPermission({
                userId: userData.id,
                role: UserRole.REGULAR_USER,
                permissions: [PermissionLevel.RESTRICTED]
              })
            }

            // 启动自动同步服务
            const config = autoStatusSyncService.getConfig()
            if (config.enabled) {
              autoStatusSyncService.start()
            }
          // } else {
          //   // token无效，清除本地数据
          //   console.log('[Auth] Token验证失败，清除本地登录状态')
          //   currentUser.value = null
          //   token.value = ''
          //   permissions.value = []
          //   isLoggedIn.value = false
          //   localStorage.removeItem('auth_token')
          //   localStorage.removeItem('user')
          // }
        }
      } catch (error) {
        // 登录状态恢复失败，但不清除token，保持登录状态
        console.error('[Auth] 登录状态恢复过程中出错，但保持登录状态:', error)
        // 即使出错，也尝试恢复基本状态
        if (savedToken && savedUser) {
          try {
            token.value = savedToken
            currentUser.value = JSON.parse(savedUser)
            isLoggedIn.value = true
            console.log('[Auth] 已恢复基本登录状态')
          } catch (parseError) {
            console.error('[Auth] 无法解析用户数据:', parseError)
          }
        }
      }
    }
  }

  const updateUser = (userData: Partial<User>) => {
    currentUser.value = { ...currentUser.value, ...userData }
  }

  const hasPermission = (permission: string) => {
    // 超级管理员拥有所有权限（检查特殊权限标识 *）
    if (permissions.value.includes('*')) {
      return true
    }
    return permissions.value.includes(permission) || isAdmin.value
  }

  // 手机号查看权限管理方法
  const updatePhoneViewSettings = (settings: Partial<PhoneViewSettings>) => {
    phoneViewSettings.value = { ...phoneViewSettings.value, ...settings }
    localStorage.setItem('phoneViewSettings', JSON.stringify(phoneViewSettings.value))
  }

  const addToPhoneWhitelist = (userId: string) => {
    if (!phoneViewSettings.value.whitelist.includes(userId)) {
      phoneViewSettings.value.whitelist.push(userId)
      localStorage.setItem('phoneViewSettings', JSON.stringify(phoneViewSettings.value))
    }
  }

  const removeFromPhoneWhitelist = (userId: string) => {
    const index = phoneViewSettings.value.whitelist.indexOf(userId)
    if (index > -1) {
      phoneViewSettings.value.whitelist.splice(index, 1)
      localStorage.setItem('phoneViewSettings', JSON.stringify(phoneViewSettings.value))
    }
  }

  const initPhoneViewSettings = () => {
    const saved = localStorage.getItem('phoneViewSettings')
    if (saved) {
      phoneViewSettings.value = JSON.parse(saved)
    }
  }

  // 权限管理方法
  const checkSensitiveInfoAccess = (infoType: SensitiveInfoType) => {
    if (!currentUser.value) return false
    const result = permissionService.checkSensitiveInfoAccess(currentUser.value.id, infoType)
    return result
  }

  const getUserPermissionInfo = () => {
    if (!currentUser.value) return null
    return permissionService.getUserPermission(currentUser.value.id)
  }

  const updateUserPermission = (userRole: UserRole, sensitiveInfoTypes?: SensitiveInfoType[]) => {
    if (!currentUser.value) return false

    const permission = {
      userId: currentUser.value.id,
      role: userRole,
      permissions: userRole === UserRole.SUPER_ADMIN
        ? [PermissionLevel.FULL_ACCESS]
        : userRole === UserRole.WHITELIST_MEMBER
          ? [PermissionLevel.PARTIAL_ACCESS]
          : [PermissionLevel.RESTRICTED],
      whitelistTypes: sensitiveInfoTypes
    }

    permissionService.setUserPermission(permission)

    // 更新当前用户信息
    currentUser.value.userRole = userRole
    currentUser.value.permissionLevel = permission.permissions[0]
    currentUser.value.sensitiveInfoAccess = sensitiveInfoTypes

    return true
  }

  return {
    currentUser,
    user,
    token,
    permissions,
    isLoggedIn,
    users,
    isAdmin,
    isManager,
    isEmployee,
    isDepartmentManager,
    isSalesStaff,
    isCustomerService,
    isDepartmentHead,
    isSuperAdmin,
    isWhitelistMember,
    userPermissionLevel,
    canViewPhone,
    canAccessSensitiveInfo,
    canAccessData,
    userDataScope,
    accessibleDepartments,
    canProcessAfterSales,
    canEditAfterSales,
    canCloseAfterSales,
    hasAfterSalesPermission,
    canAccessLogisticsStatusUpdate,
    hasLogisticsPermission,
    phoneViewSettings,
    login,
    loginWithApi,
    loginWithRetry,
    logout,
    loadUsers,
    getUserById,
    initUser,
    updateUser,
    hasPermission,
    updatePhoneViewSettings,
    addToPhoneWhitelist,
    removeFromPhoneWhitelist,
    initPhoneViewSettings,
    checkSensitiveInfoAccess,
    getUserPermissionInfo,
    updateUserPermission,
    clearUserDatabaseCache
  }
})
