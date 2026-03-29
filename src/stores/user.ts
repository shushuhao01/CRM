import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { permissionService, UserRole, PermissionLevel, SensitiveInfoType, DataScope, CustomerServiceType } from '@/services/permission'
import { authApiService } from '@/services/authApiService'
import { autoStatusSyncService } from '@/services/autoStatusSync'
import { setUserPermissions } from '@/utils/permission'
import { rolePermissionService } from '@/services/rolePermissionService'
import { getDefaultRolePermissions } from '@/config/defaultRolePermissions'
import { sensitiveInfoPermissionService } from '@/services/sensitiveInfoPermissionService'

/**
 * 客服自定义权限 → 菜单权限映射表
 * 将客服权限管理模块配置的 customPermissions 转换为菜单系统能识别的权限 key
 */
const CS_PERM_TO_MENU_MAP: Record<string, string[]> = {
  // 客户管理
  'customer:list:view': ['customer', 'customer:list', 'customer.list', 'customer.list.view'],
  'customer:list:edit': ['customer', 'customer:list', 'customer.list', 'customer.list.edit'],
  'customer:list:create': ['customer', 'customer:list', 'customer:add', 'customer.list', 'customer.add'],
  'customer:list:assign': ['customer', 'customer:list', 'customer.list'],
  // 订单管理
  'order:list:view': ['order', 'order:list', 'order.list', 'order.list.view'],
  'order:list:edit': ['order', 'order:list', 'order.list', 'order.list.edit'],
  'order:add:create': ['order', 'order:add', 'order.add', 'order.add.create'],
  'order:audit:view': ['order', 'order:audit', 'order.audit', 'order.audit.view'],
  'order:audit:approve': ['order', 'order:audit', 'order.audit', 'order.audit.approve'],
  'order:detail:cancel': ['order', 'order:list', 'order.list'],
  'order:cod:cancelAudit': ['order', 'finance:cod'],
  // 售后管理
  'service:list:view': ['aftersale', 'aftersale:order', 'aftersale.list', 'aftersale.list.view'],
  'service:list:edit': ['aftersale', 'aftersale:order', 'aftersale.list', 'aftersale.list.edit'],
  'service:afterSales:view': ['aftersale', 'aftersale:order', 'aftersale.list'],
  'service:afterSales:edit': ['aftersale', 'aftersale:order', 'aftersale:add', 'aftersale.add'],
  // 服务管理（通话/短信）
  'callService:call:view': ['communication', 'communication.call'],
  'callService:call:create': ['communication', 'communication.call'],
  'callService:record:view': ['communication', 'communication.call'],
  'callService:sms:view': ['communication', 'communication.sms'],
  'callService:sms:send': ['communication', 'communication.sms'],
  // 物流管理
  'logistics:shipping:view': ['logistics', 'logistics:shipping', 'logistics:list', 'logistics:tracking', 'logistics.shipping', 'logistics.list'],
  'logistics:shipping:edit': ['logistics', 'logistics:shipping', 'logistics:list', 'logistics:status', 'logistics.shipping'],
  'logistics:shipping:batchExport': ['logistics', 'logistics:shipping', 'logistics.shipping'],
  // 资料管理
  'data:record:view': ['data', 'data:list', 'data:customer', 'data.list', 'data.list.view', 'data.search', 'data.search.basic'],
  'data:record:edit': ['data', 'data:list', 'data.list', 'data.list.edit'],
  'data:record:create': ['data', 'data:list', 'data.list'],
  'data:record:export': ['data', 'data:list', 'data.list', 'data.list.export'],
  // 商品管理
  'product:list:view': ['sales:product', 'sales:product:view', 'product:analytics'],
  'product:list:edit': ['sales:product', 'sales:product:view', 'sales:product:edit'],
  'product:add:create': ['sales:product', 'sales:product:add'],
  'product:inventory:manage': ['sales:product', 'sales:product:edit'],
  // 财务管理
  'finance:payment:view': ['finance', 'finance:data'],
  'finance:payment:edit': ['finance', 'finance:data', 'finance:manage'],
  'finance:report:view': ['finance', 'finance:data'],
  'finance:report:export': ['finance', 'finance:data'],
  'finance:refund:manage': ['finance', 'finance:manage'],
  // 业绩统计
  'performance:personal:view': ['performance', 'performance:personal'],
  'performance:team:view': ['performance', 'performance:team'],
  'performance:report:export': ['performance', 'performance:analysis'],
  'performance:ranking:view': ['performance', 'performance:analysis'],
}

/**
 * 将客服 customPermissions 转换为菜单系统权限列表
 */
function convertCsPermsToMenuPerms(customPermissions: string[]): string[] {
  const menuPerms = new Set<string>()
  // 客服始终拥有数据看板权限
  menuPerms.add('dashboard')
  menuPerms.add('dashboard.view')
  for (const perm of customPermissions) {
    // 通过映射表转换
    const mapped = CS_PERM_TO_MENU_MAP[perm]
    if (mapped) {
      mapped.forEach(p => menuPerms.add(p))
    }
    // 同时保留原始 key 和父级 key
    menuPerms.add(perm)
    const parts = perm.split(':')
    for (let i = 1; i < parts.length; i++) {
      menuPerms.add(parts.slice(0, i).join(':'))
    }
  }
  return Array.from(menuPerms)
}

export interface User {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'department_manager' | 'sales_staff' | 'customer_service'
  department: string // 部门名称（用于显示）
  avatar?: string
  // 基本信息字段
  username?: string // 用户名（登录名）
  phone?: string // 手机号
  realName?: string // 真实姓名
  roleName?: string // 角色显示名称
  position?: string // 职位
  // 新增权限相关字段
  userRole?: UserRole
  permissionLevel?: PermissionLevel
  dataScope?: DataScope
  departmentId?: string // 部门ID（用于数据过滤）
  departmentName?: string // 部门名称（冗余字段，与department相同）
  departmentIds?: string[]
  customerServiceType?: CustomerServiceType
  sensitiveInfoAccess?: SensitiveInfoType[]
  // 密码相关字段
  isDefaultPassword?: boolean // 是否为默认密码
  passwordLastChanged?: Date // 密码最后修改时间
  passwordExpiresAt?: Date // 密码过期时间
  forcePasswordChange?: boolean // 是否强制修改密码
  // 账号状态
  status?: 'active' | 'disabled' | 'inactive' // active=启用, disabled/inactive=禁用（禁用后数据隐藏不可见）
  // 在职状态
  employmentStatus?: 'active' | 'resigned' // active=在职, resigned=离职（离职后账号无法登录但历史数据可见）
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
  // 管理员权限：super_admin 或 admin 角色都视为管理员
  // 🔥 角色判断：同时支持英文代码和中文名称
  const isAdmin = computed(() => {
    const role = currentUser.value?.role
    return role === 'super_admin' || role === 'admin' ||
           role === '超级管理员' || role === '管理员' || role === '系统管理员'
  })
  const isDepartmentManager = computed(() => {
    const role = currentUser.value?.role
    return role === 'department_manager' || role === '部门经理' || role === '部门负责人'
  })
  const isSalesStaff = computed(() => {
    const role = currentUser.value?.role
    return role === 'sales_staff' || role === 'sales' || role === '销售员' || role === '销售'
  })
  const isCustomerService = computed(() => {
    const role = currentUser.value?.role
    return role === 'customer_service' || role === '客服' || role === '客服人员'
  })

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
    // super_admin 和 admin 都视为超级管理员
    return currentUser.value.role === 'super_admin' ||
           currentUser.value.role === 'admin' ||
           currentUser.value.userRole === UserRole.SUPER_ADMIN
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

  // 手机号查看权限：使用数据库API权限服务检查
  const canViewPhone = computed(() => {
    if (!currentUser.value) return false
    return sensitiveInfoPermissionService.hasPermission(currentUser.value.role || '', 'phone')
  })

  // 新的敏感信息访问权限检查（使用数据库API权限服务）
  const canAccessSensitiveInfo = computed(() => {
    return (infoType: SensitiveInfoType) => {
      if (!currentUser.value) return false
      const INFO_TYPE_DB_KEY: Record<string, string> = {
        [SensitiveInfoType.PHONE]: 'phone',
        [SensitiveInfoType.ID_CARD]: 'id_card',
        [SensitiveInfoType.EMAIL]: 'email',
        [SensitiveInfoType.WECHAT]: 'wechat',
        [SensitiveInfoType.ADDRESS]: 'address',
        [SensitiveInfoType.BANK_ACCOUNT]: 'bank',
        [SensitiveInfoType.FINANCIAL]: 'financial'
      }
      const dbKey = INFO_TYPE_DB_KEY[infoType] || infoType.toString()
      return sensitiveInfoPermissionService.hasPermission(currentUser.value.role || '', dbKey)
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
  const loginWithApi = async (username: string, password: string, rememberMe = false, tenantId?: string) => {
    try {
      const response = await authApiService.login({
        username,
        password,
        rememberMe,
        ...(tenantId ? { tenantId } : {})
      })

      // 立即设置token和登录状态，确保状态同步
      console.log('[Auth] ========== 开始提取Token ==========')
      console.log('[Auth] response完整对象:', JSON.stringify(response, null, 2))
      console.log('[Auth] response类型:', typeof response)
      console.log('[Auth] response的keys:', Object.keys(response || {}))
      console.log('[Auth] response.tokens:', response.tokens)
      console.log('[Auth] response.tokens的keys:', response.tokens ? Object.keys(response.tokens) : 'undefined')
      console.log('[Auth] response.user:', response.user)

      // 【关键修复】apiService.post()返回的是response.data.data，即LoginResponse对象
      // 所以response.tokens就是我们需要的tokens对象
      const accessToken = response.tokens?.accessToken || response.tokens?.access_token
      console.log('[Auth] 提取的accessToken:', accessToken)
      console.log('[Auth] =========================================')

      if (!accessToken) {
        console.error('[Auth] ❌ 登录响应中未找到Token!')
        console.error('[Auth] 完整响应对象:', JSON.stringify(response, null, 2))
        throw new Error('登录响应格式错误：未找到Token')
      }

      token.value = accessToken
      isLoggedIn.value = true

      // 立即保存到localStorage
      localStorage.setItem('auth_token', accessToken)

      console.log('[Auth] ✅ Token已设置:', accessToken.substring(0, 30) + '...')
      console.log('[Auth] ✅ localStorage已保存:', localStorage.getItem('auth_token')?.substring(0, 30) + '...')

      // 设置当前用户信息，映射API响应到本地用户格式
      const userData = response.user
      // 🔥 修复：确保departmentId和departmentName都正确设置
      const userDeptId = userData.departmentId || userData.department_id || ''
      const userDeptName = userData.departmentName || userData.department_name || userData.department?.name || '未分配'
      console.log('[Auth] 用户部门信息:', { departmentId: userDeptId, departmentName: userDeptName })

      // 🔥 修复：优先使用 roleId（角色代码如 department_manager），其次使用 role
      const userRoleCode = userData.roleId || userData.role

      currentUser.value = {
        id: userData.id.toString(),
        name: userData.realName || userData.name,
        username: userData.username, // 🔥 个人信息修复：保存用户名
        phone: userData.phone || '', // 🔥 个人信息修复：保存手机号
        realName: userData.realName || userData.name, // 🔥 个人信息修复：保存真实姓名
        email: userData.email,
        role: (userRoleCode === 'admin' || userRoleCode === 'super_admin') ? 'super_admin' :
              userRoleCode === 'department_manager' ? 'department_manager' :
              userRoleCode === 'sales_staff' ? 'sales_staff' :
              userRoleCode === 'customer_service' ? 'customer_service' :
              userRoleCode || 'sales_staff',
        department: userDeptName, // 🔥 部门名称用于显示
        avatar: userData.avatar,
        userRole: (userRoleCode === 'admin' || userRoleCode === 'super_admin') ? UserRole.SUPER_ADMIN :
                 userRoleCode === 'department_manager' ? UserRole.DEPARTMENT_MANAGER :
                 userRoleCode === 'sales_staff' ? UserRole.SALES_STAFF :
                 userRoleCode === 'customer_service' ? UserRole.CUSTOMER_SERVICE :
                 UserRole.REGULAR_USER,
        permissionLevel: (userRoleCode === 'admin' || userRoleCode === 'super_admin') ? PermissionLevel.FULL_ACCESS :
                        userRoleCode === 'department_manager' ? PermissionLevel.PARTIAL_ACCESS :
                        PermissionLevel.RESTRICTED,
        dataScope: userData.dataScope || ((userRoleCode === 'admin' || userRoleCode === 'super_admin') ? DataScope.ALL :
                  userRoleCode === 'department_manager' ? DataScope.DEPARTMENT : DataScope.SELF),
        departmentId: userDeptId, // 🔥 部门ID用于数据过滤
        departmentName: userDeptName, // 🔥 新增：部门名称字段
        departmentIds: userData.departmentIds,
        customerServiceType: userData.customerServiceType,
        forcePasswordChange: false // API会在响应中提供这个信息
      }

      // 设置用户权限 - 使用新的权限系统，优先从API响应读取角色权限
      // 【关键修复】优先使用后端返回的rolePermissions，其次从crm_roles读取，最后使用默认配置
      let userPermissions: string[] = []

      // 优先使用 roleId（如 sales_staff），其次使用 role
      const roleKey = userData.roleId || userData.role

      // 🔥 优先使用后端返回的角色权限
      if (userData.rolePermissions && userData.rolePermissions.length > 0) {
        userPermissions = userData.rolePermissions
        console.log(`[Auth] ✅ 从API响应加载角色权限: ${roleKey}`, userPermissions.length, '个权限')
      }

      // 如果API没有返回权限，尝试从crm_roles读取动态配置的权限
      if (userPermissions.length === 0) {
        try {
          const savedRoles = JSON.parse(localStorage.getItem('crm_roles') || '[]')
          const matchedRole = savedRoles.find((r: { code: string; permissions?: string[] }) =>
            r.code === roleKey || r.code === userData.role
          )
          if (matchedRole && matchedRole.permissions && matchedRole.permissions.length > 0) {
            userPermissions = matchedRole.permissions
            console.log(`[Auth] ✅ 从动态配置加载权限: ${roleKey}`, userPermissions.length, '个权限')
          }
        } catch (e) {
          console.warn('[Auth] 读取动态权限配置失败:', e)
        }
      }

      // 如果没有动态配置，使用默认权限
      if (userPermissions.length === 0) {
        userPermissions = getDefaultRolePermissions(roleKey)
        console.log(`[Auth] ✅ 使用默认权限配置: ${roleKey}`, userPermissions.length, '个权限')
      }

      // 如果还是没有权限，尝试常见的角色映射
      if (userPermissions.length === 0) {
        const roleMapping: Record<string, string> = {
          // 中文名称映射
          '销售员': 'sales_staff',
          '销售': 'sales_staff',
          '客服': 'customer_service',
          '客服人员': 'customer_service',
          '部门经理': 'department_manager',
          '经理': 'department_manager',
          '管理员': 'admin',
          '系统管理员': 'admin',
          '超级管理员': 'super_admin',
          // 英文别名映射
          'sales': 'sales_staff',
          'service': 'customer_service',
          'manager': 'department_manager'
        }
        const mappedRole = roleMapping[roleKey] || roleKey
        userPermissions = getDefaultRolePermissions(mappedRole)
        console.log(`[Auth] 使用映射后的角色获取权限: ${mappedRole}`, userPermissions)
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

      // 🔥 客服自定义权限覆盖：如果是客服角色且后端返回了自定义权限配置，以自定义权限为准（替换默认权限）
      const csPermsData = userData.customerServicePermissions
      if ((userRoleCode === 'customer_service' || userData.role === 'customer_service')
          && csPermsData?.customPermissions?.length > 0) {
        const csMenuPerms = convertCsPermsToMenuPerms(csPermsData.customPermissions)
        // 🔥 关键修复：自定义权限完全替换默认权限，不再合并
        userPermissions = csMenuPerms
        console.log(`[Auth] ✅ 客服自定义权限已覆盖默认权限: ${csPermsData.customPermissions.length}个原始权限 → 转换${csMenuPerms.length}个菜单权限`)
        // 保存客服自定义权限到localStorage，便于会话恢复时使用
        localStorage.setItem('customerServicePermissions', JSON.stringify(csPermsData))
      }

      // 设置权限到新的权限系统
      permissions.value = userPermissions
      setUserPermissions(userPermissions)

      // 🔥 SaaS模式：保存租户授权模块列表，供菜单过滤使用
      if (userData.tenantModules && Array.isArray(userData.tenantModules) && userData.tenantModules.length > 0) {
        localStorage.setItem('tenantModules', JSON.stringify(userData.tenantModules))
        console.log('[Auth] 已保存租户授权模块:', userData.tenantModules)
      } else {
        localStorage.removeItem('tenantModules')
      }

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

      // 设置登录状态
      isLoggedIn.value = true
      console.log('[Auth] ✅ 登录状态已设置')

      // 🔄 登录成功后无痕刷新数据（异步执行，不阻塞登录流程）
      setTimeout(async () => {
        try {
          console.log('[Auth] 🔄 开始无痕刷新数据...')
          const { preloadAppData } = await import('@/services/appInitService')
          await preloadAppData()
          console.log('[Auth] ✅ 无痕刷新完成')
        } catch (e) {
          console.warn('[Auth] ⚠️ 无痕刷新失败（不影响使用）:', e)
        }

        // 🔐 加载敏感信息权限配置（从数据库API获取）
        try {
          const { loadSensitiveInfoPermissions } = await import('@/services/sensitiveInfoPermissionService')
          await loadSensitiveInfoPermissions()
          console.log('[Auth] 🔐 敏感信息权限配置已加载')
        } catch (e) {
          console.warn('[Auth] ⚠️ 加载敏感信息权限配置失败:', e)
        }

        // 🔐 刷新安全控制台配置（系统默认加密，始终确保全局替换已启用）
        try {
          const { refreshSecureConsoleConfig, enableGlobalSecureConsole } = await import('@/utils/secureLogger')
          // 始终确保全局控制台替换已启用（系统默认=加密）
          enableGlobalSecureConsole()
          // 刷新配置（从后端获取最新租户设置，运行时 isSecureConsoleEnabled 实时判断）
          await refreshSecureConsoleConfig()
          console.log('[Auth] 🔐 控制台加密配置已刷新')
        } catch (e) {
          console.warn('[Auth] ⚠️ 刷新控制台配置失败:', e)
        }
      }, 300) // 延迟300ms，让页面先渲染

      // 返回成功标识
      return true
    } catch (error) {
      console.error('API登录失败:', error)
      throw error
    }
  }

  // 带重试机制的登录方法
  const loginWithRetry = async (username: string, password: string, rememberMe = false, maxRetries = 3, tenantId?: string) => {
    let lastError: unknown

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Auth] 登录尝试 ${attempt}/${maxRetries}`)
        const result = await loginWithApi(username, password, rememberMe, tenantId)

        // 【关键修复】只要loginWithApi返回true或没有抛出错误，就认为登录成功
        // 不再检查响应式状态，因为状态已经在loginWithApi中设置
        if (result === true) {
          console.log('[Auth] ✅ 登录成功')
          return true
        }

        // 如果返回值不是true但也没抛出错误，检查状态
        if (token.value && isLoggedIn.value) {
          console.log('[Auth] ✅ 登录成功（通过状态确认）')
          return true
        }

        console.warn(`[Auth] 登录尝试 ${attempt}/${maxRetries} 返回值异常:`, result)

      } catch (error: unknown) {
        lastError = error
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[Auth] 登录尝试 ${attempt}/${maxRetries} 失败:`, errorMessage)

        // 如果是频率限制错误且不是最后一次尝试，进行重试
        if ((errorMessage.includes('频繁') || errorMessage.includes('429') || errorMessage === 'RATE_LIMITED') && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          console.log(`[Auth] ${delay}ms后重试...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // 最后一次尝试失败，抛出错误
        if (attempt === maxRetries) {
          throw lastError
        }
      }
    }

    throw lastError || new Error('登录失败，请稍后重试')
  }

  // 🔥 清除用户数据（不调用API，用于401错误处理）
  const clearUserData = () => {
    console.log('[Auth] 清除用户数据（不调用API）')

    // 清除所有认证和权限相关数据
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
    localStorage.removeItem('crm_current_user')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('customerServicePermissions')
    localStorage.removeItem('tenantModules')

    // 🔑 保留租户信息，退出登录后无需重新输入租户编码/授权码
    // localStorage.removeItem('crm_tenant_info')  // 保留
    // localStorage.removeItem('crm_tenant_code')  // 保留
    // localStorage.removeItem('crm_license_key')  // 保留
    // 🔥 清理消息通知缓存（防止切换用户后看到上一个用户的消息）
    // 直接操作 localStorage，避免循环依赖
    try {
      // 清理旧的全局共享Key
      localStorage.removeItem('notification-messages')
      // 清理当前用户的隔离Key（从保存的用户信息中推断）
      const savedUserStr = localStorage.getItem('user') || localStorage.getItem('crm_current_user') || localStorage.getItem('user_info')
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr)
        const uid = savedUser.id || savedUser.userId || ''
        const tid = savedUser.tenantId || ''
        if (uid) {
          localStorage.removeItem(`notification-messages-${uid}-${tid}`)
          localStorage.removeItem(`hidden-announcements-${uid}-${tid}`)
          console.log(`[Auth] 🧹 已清理用户 ${uid} 的消息缓存`)
        }
      }
    } catch (_e) {
      localStorage.removeItem('notification-messages')
      console.log('[Auth] 清理消息缓存时出错，已执行降级清理')
    }

    // 清除sessionStorage中的用户数据
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('currentUser')

    console.log('[Auth] ✅ 用户数据已清除（租户信息已保留，消息缓存已清理）')
  }

  const logout = async () => {
    console.log('[Auth] 开始执行登出操作')

    // 🔥 先设置登出状态，防止API调用触发401弹窗
    const { setLoggingOutState } = await import('@/utils/request')
    setLoggingOutState(true)

    try {
      // 🔥 断开WebSocket连接并重置通知状态（在清除token前执行）
      try {
        const { useNotificationStore } = await import('@/stores/notification')
        const notificationStore = useNotificationStore()
        await notificationStore.disconnectWebSocket()
        // 重置内存中的消息状态
        if (typeof notificationStore.resetNotificationState === 'function') {
          notificationStore.resetNotificationState()
        }
      } catch (_e) {
        console.log('[Auth] 断开WebSocket/重置通知状态失败（已忽略）')
      }

      // 调用API登出（忽略错误，因为token可能已失效）
      await authApiService.logout().catch(err => {
        console.log('[Auth] API登出调用失败（已忽略）:', err.message)
      })
    } finally {
      // 🔥 清除用户数据
      clearUserData()

      // 🔥 重置登出状态
      setTimeout(() => {
        setLoggingOutState(false)
      }, 500)

      console.log('[Auth] ✅ 登出完成')
    }
  }

  const loadUsers = async () => {
    console.log('[UserStore] 开始加载用户列表...')
    try {
      // 使用统一的用户数据服务,自动适配localStorage和API
      const { default: userDataService } = await import('@/services/userDataService')
      const loadedUsers = await userDataService.getUsers()

      if (loadedUsers.length > 0) {
        users.value = loadedUsers.map((user: any) => ({
          id: user.id,
          name: user.realName || user.name || user.username,
          username: user.username,
          realName: user.realName || user.name,
          employeeNumber: user.employeeNumber,
          email: user.email,
          role: user.role,
          department: user.departmentName || user.department || '未分配',
          departmentId: user.departmentId,
          departmentName: user.departmentName || user.department || '未分配',
          position: user.position || '员工',
          avatar: user.avatar,
          status: user.status || 'active',
          createTime: user.createTime || user.createdAt,
          createdAt: user.createdAt,
          employmentStatus: user.employmentStatus || 'active',
          // 🔥 新增：在线状态和登录次数字段
          isOnline: user.isOnline || false,
          loginCount: user.loginCount || 0,
          lastLoginTime: user.lastLoginTime || user.lastLoginAt || ''
        }))

        console.log('[UserStore] ✅ 用户列表已加载:', users.value.length, '个用户')
        console.log('[UserStore] 数据来源:', userDataService.getCurrentMode())
        console.log('[UserStore] 用户列表:', users.value.map(u => ({ id: u.id, name: u.name, department: u.department })))
      } else {
        // 如果没有获取到用户数据，保持空列表，不使用模拟数据
        console.warn('[UserStore] ⚠️ 未获取到用户数据，用户列表为空')
        users.value = []
      }
    } catch (error) {
      console.error('[UserStore] ❌ 加载用户列表失败:', error)
      // 加载失败时保持空列表，不使用模拟数据
      users.value = []
    }
  }

  // 根据用户ID获取用户信息
  const getUserById = (userId: string) => {
    return users.value.find(user => String(user.id) === String(userId))
  }

  const initUser = async () => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('user')

    // 如果没有token或用户信息，直接返回
    if (!savedToken || !savedUser) {
      console.log('[Auth] 没有保存的登录信息，跳过初始化')
      return
    }

    console.log('[Auth] 🔧 开始恢复登录状态...')

    try {
      // 解析用户数据
      const userData = JSON.parse(savedUser)

      // 【修复】直接恢复登录状态，不进行API验证（避免秒退）
      // 但保留TOKEN机制，确保有TOKEN才能登录
      token.value = savedToken
      currentUser.value = userData
      isLoggedIn.value = true

      console.log('[Auth] ✅ 登录状态已恢复:', userData.name)
      console.log('[Auth] ✅ Token:', savedToken.substring(0, 30) + '...')
      console.log('[Auth] ✅ isLoggedIn:', isLoggedIn.value)

      // 【关键修复】优先从crm_roles读取动态配置的权限，没有则使用默认配置
      let userPerms: string[] = []

      // 🔥 优先从 localStorage 恢复登录时保存的权限（最准确，来自API）
      try {
        const savedPerms = localStorage.getItem('userPermissions')
        if (savedPerms) {
          const parsedPerms = JSON.parse(savedPerms)
          if (Array.isArray(parsedPerms) && parsedPerms.length > 0) {
            userPerms = parsedPerms
            console.log('[Auth] ✅ 从 userPermissions 恢复权限:', userPerms.length, '个权限')
          }
        }
      } catch (e) {
        console.warn('[Auth] 读取 userPermissions 失败:', e)
      }

      // 如果没有，尝试从crm_roles读取动态配置的权限
      if (userPerms.length === 0) {
        try {
          const savedRoles = JSON.parse(localStorage.getItem('crm_roles') || '[]')
          const matchedRole = savedRoles.find((r: { code: string; permissions?: string[] }) =>
            r.code === userData.role
          )
          if (matchedRole && matchedRole.permissions && matchedRole.permissions.length > 0) {
            userPerms = matchedRole.permissions
            console.log('[Auth] ✅ 从动态配置恢复权限:', userData.role, userPerms.length, '个权限')
          }
        } catch (e) {
          console.warn('[Auth] 读取动态权限配置失败:', e)
        }
      }

      // 如果没有动态配置，尝试从用户对象中的permissions恢复
      if (userPerms.length === 0 && userData.permissions && Array.isArray(userData.permissions) && userData.permissions.length > 0) {
        userPerms = userData.permissions
        console.log('[Auth] ✅ 从用户对象恢复权限:', userPerms.length, '个权限')
      }

      // 最后兜底：使用默认权限
      if (userPerms.length === 0) {
        userPerms = getDefaultRolePermissions(userData.role)
        console.log('[Auth] ✅ 使用默认角色权限:', userData.role, userPerms.length, '个权限')
      }

      // 🔥 客服自定义权限覆盖（会话恢复时）
      if (userData.role === 'customer_service') {
        try {
          const savedCsPerms = localStorage.getItem('customerServicePermissions')
          if (savedCsPerms) {
            const csPermsData = JSON.parse(savedCsPerms)
            if (csPermsData?.customPermissions?.length > 0) {
              const csMenuPerms = convertCsPermsToMenuPerms(csPermsData.customPermissions)
              // 🔥 关键修复：自定义权限完全替换默认权限，不再合并
              userPerms = csMenuPerms
              console.log(`[Auth] ✅ 会话恢复：客服自定义权限已覆盖默认权限: ${csMenuPerms.length}个`)
            }
          }
        } catch (e) {
          console.warn('[Auth] 恢复客服自定义权限失败:', e)
        }
      }

      // 设置权限
      if (userPerms.length > 0) {
        permissions.value = userPerms
        setUserPermissions(userPerms)
      } else {
        console.warn('[Auth] ⚠️ 无法获取权限配置，角色:', userData.role)
      }

      // 恢复权限服务配置
      if (userData.role === 'admin' || userData.role === 'super_admin') {
        permissionService.setUserPermission({
          userId: userData.id,
          role: UserRole.SUPER_ADMIN,
          permissions: [PermissionLevel.FULL_ACCESS],
          dataScope: DataScope.ALL
        })
      } else if (userData.role === 'department_manager') {
        permissionService.setUserPermission({
          userId: userData.id,
          role: UserRole.DEPARTMENT_MANAGER,
          permissions: [PermissionLevel.PARTIAL_ACCESS],
          dataScope: DataScope.DEPARTMENT,
          departmentId: userData.departmentId || 'dept_001',
          departmentIds: userData.departmentIds || ['dept_001'],
          whitelistTypes: [SensitiveInfoType.PHONE, SensitiveInfoType.EMAIL, SensitiveInfoType.WECHAT]
        })
      } else if (userData.role === 'sales_staff') {
        permissionService.setUserPermission({
          userId: userData.id,
          role: UserRole.SALES_STAFF,
          permissions: [PermissionLevel.RESTRICTED],
          dataScope: DataScope.SELF,
          departmentId: userData.departmentId || 'dept_001'
        })
      } else if (userData.role === 'customer_service') {
        permissionService.setUserPermission({
          userId: userData.id,
          role: UserRole.CUSTOMER_SERVICE,
          permissions: [PermissionLevel.PARTIAL_ACCESS],
          dataScope: DataScope.ALL,
          customerServiceType: userData.customerServiceType || CustomerServiceType.GENERAL,
          whitelistTypes: [SensitiveInfoType.PHONE]
        })
      }

      console.log('[Auth] ✅ 权限已恢复:', permissions.value.length, '个')

      // 启动自动同步服务
      const config = autoStatusSyncService.getConfig()
      if (config.enabled) {
        autoStatusSyncService.start()
      }

      return
    } catch (error) {
      console.error('[Auth] ❌ 恢复登录状态失败:', error)
      // 出错时清除登录状态
      logout()
      return
    }

    // 以下是旧的复杂逻辑，已废弃
    /*
    if (savedToken && savedUser) {
      try {
        // 旧代码已废弃
        /*
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
        console.error('[Auth] 旧逻辑出错（已废弃）:', error)
      }
    }
    */
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
    clearUserData,
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
