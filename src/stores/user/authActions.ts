/**
 * 用户Store — 认证与会话管理动作
 * 从 stores/user.ts 提取，包含登录/登出/会话恢复/权限监听等核心认证逻辑
 *
 * 🔧 任务3.5 拆分产物 — 2026-03-31
 */
import { permissionService, UserRole, PermissionLevel, SensitiveInfoType, DataScope, CustomerServiceType } from '@/services/permission'
import { authApiService } from '@/services/authApiService'
import { autoStatusSyncService } from '@/services/autoStatusSync'
import { setUserPermissions } from '@/utils/permission'
import { rolePermissionService } from '@/services/rolePermissionService'
import { getDefaultRolePermissions } from '@/config/defaultRolePermissions'
import { convertCsPermsToMenuPerms } from '../helpers/csPermissionMap'
import { getMockUserDatabase } from '../helpers/mockUserDatabase'
import type { User, UserStoreDeps } from './types'

/**
 * 创建认证相关的动作方法
 * @param deps - Store 核心响应式状态引用
 */
export function createAuthActions(deps: UserStoreDeps) {
  const { currentUser, token, permissions, isLoggedIn, users } = deps

  // ── 权限更新监听 ──────────────────────────────────────

  const getRoleIdByRole = (role: string): string => {
    const roleMap: Record<string, string> = {
      'admin': '2',
      'manager': '3',
      'employee': '4',
      'customer_service': '5'
    }
    return roleMap[role] || '4'
  }

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

  const permissionUpdateListener = (roleId: string) => {
    console.log(`收到权限更新通知，角色ID: ${roleId}`)
    if (currentUser.value) {
      const userRoleId = getRoleIdByRole(currentUser.value.role)
      if (userRoleId === roleId) {
        console.log('当前用户角色权限已更新，重新加载权限')
        refreshUserPermissions()
      }
    }
  }

  const initPermissionListener = () => {
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

  // ── Mock登录（开发环境） ──────────────────────────────

  const login = async (username: string, password: string) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const userDatabase = getMockUserDatabase()

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
                user.roleId || user.role || 'sales_staff',
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
        const userPermissions = getDefaultRolePermissions(user.roleId)

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

  // ── API登录 ───────────────────────────────────────────

  const loginWithApi = async (username: string, password: string, rememberMe = false, tenantId?: string) => {
    try {
      const response = await authApiService.login({
        username,
        password,
        rememberMe,
        ...(tenantId ? { tenantId } : {})
      })

      // 立即设置token和登录状态
      console.log('[Auth] ========== 开始提取Token ==========')
      console.log('[Auth] response完整对象:', JSON.stringify(response, null, 2))
      console.log('[Auth] response类型:', typeof response)
      console.log('[Auth] response的keys:', Object.keys(response || {}))
      console.log('[Auth] response.tokens:', response.tokens)
      console.log('[Auth] response.tokens的keys:', response.tokens ? Object.keys(response.tokens) : 'undefined')
      console.log('[Auth] response.user:', response.user)

      const accessToken = response.tokens?.accessToken || (response.tokens as any)?.access_token
      console.log('[Auth] 提取的accessToken:', accessToken)
      console.log('[Auth] =========================================')

      if (!accessToken) {
        console.error('[Auth] ❌ 登录响应中未找到Token!')
        console.error('[Auth] 完整响应对象:', JSON.stringify(response, null, 2))
        throw new Error('登录响应格式错误：未找到Token')
      }

      token.value = accessToken
      isLoggedIn.value = true

      localStorage.setItem('auth_token', accessToken)

      console.log('[Auth] ✅ Token已设置:', accessToken.substring(0, 30) + '...')
      console.log('[Auth] ✅ localStorage已保存:', localStorage.getItem('auth_token')?.substring(0, 30) + '...')

      // 设置当前用户信息
      const userData = response.user
      const userDeptId = userData.departmentId || userData.department_id || ''
      const userDeptName = userData.departmentName || userData.department_name || userData.department?.name || '未分配'
      console.log('[Auth] 用户部门信息:', { departmentId: userDeptId, departmentName: userDeptName })

      const userRoleCode = userData.roleId || userData.role

      currentUser.value = {
        id: userData.id.toString(),
        name: userData.realName || userData.name || '',
        username: userData.username,
        phone: userData.phone || '',
        realName: userData.realName || userData.name || '',
        email: userData.email,
        role: (userRoleCode === 'admin' || userRoleCode === 'super_admin') ? 'super_admin' :
              userRoleCode === 'department_manager' ? 'department_manager' :
              userRoleCode === 'sales_staff' ? 'sales_staff' :
              userRoleCode === 'customer_service' ? 'customer_service' :
              userRoleCode || 'sales_staff',
        department: userDeptName,
        avatar: userData.avatar,
        userRole: (userRoleCode === 'admin' || userRoleCode === 'super_admin') ? UserRole.SUPER_ADMIN :
                 userRoleCode === 'department_manager' ? UserRole.DEPARTMENT_MANAGER :
                 userRoleCode === 'sales_staff' ? UserRole.SALES_STAFF :
                 userRoleCode === 'customer_service' ? UserRole.CUSTOMER_SERVICE :
                 UserRole.REGULAR_USER,
        permissionLevel: (userRoleCode === 'admin' || userRoleCode === 'super_admin') ? PermissionLevel.FULL_ACCESS :
                        userRoleCode === 'department_manager' ? PermissionLevel.PARTIAL_ACCESS :
                        PermissionLevel.RESTRICTED,
        dataScope: (userData.dataScope || ((userRoleCode === 'admin' || userRoleCode === 'super_admin') ? DataScope.ALL :
                  userRoleCode === 'department_manager' ? DataScope.DEPARTMENT : DataScope.SELF)) as DataScope,
        departmentId: userDeptId,
        departmentName: userDeptName,
        departmentIds: userData.departmentIds,
        customerServiceType: (userData.customerServiceType || undefined) as CustomerServiceType | undefined,
        forcePasswordChange: false
      }

      // 设置用户权限
      let userPermissions: string[] = []
      const roleKey = userData.roleId || userData.role

      // 优先使用后端返回的角色权限
      if (userData.rolePermissions && userData.rolePermissions.length > 0) {
        userPermissions = userData.rolePermissions
        console.log(`[Auth] ✅ 从API响应加载角色权限: ${roleKey}`, userPermissions.length, '个权限')
      }

      // 尝试从crm_roles读取动态配置的权限
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

      // 使用默认权限
      if (userPermissions.length === 0) {
        userPermissions = getDefaultRolePermissions(roleKey)
        console.log(`[Auth] ✅ 使用默认权限配置: ${roleKey}`, userPermissions.length, '个权限')
      }

      // 尝试常见的角色映射
      if (userPermissions.length === 0) {
        const roleMapping: Record<string, string> = {
          '销售员': 'sales_staff',
          '销售': 'sales_staff',
          '客服': 'customer_service',
          '客服人员': 'customer_service',
          '部门经理': 'department_manager',
          '经理': 'department_manager',
          '管理员': 'admin',
          '系统管理员': 'admin',
          '超级管理员': 'super_admin',
          'sales': 'sales_staff',
          'service': 'customer_service',
          'manager': 'department_manager'
        }
        const mappedRole = roleMapping[roleKey] || roleKey
        userPermissions = getDefaultRolePermissions(mappedRole)
        console.log(`[Auth] 使用映射后的角色获取权限: ${mappedRole}`, userPermissions)
      }

      // 🔥 补全内置角色可能缺失的售后管理模块权限（防止数据库权限不完整导致菜单不显示）
      const builtInRoles = ['department_manager', 'sales_staff', 'customer_service', 'manager', 'sales']
      const resolvedRole = roleKey || userData.role
      if (builtInRoles.includes(resolvedRole) && userPermissions.length > 0 && !userPermissions.includes('*')) {
        const defaultPerms = getDefaultRolePermissions(
          resolvedRole === 'manager' ? 'department_manager' :
          resolvedRole === 'sales' ? 'sales_staff' :
          resolvedRole
        )
        // 仅补全 aftersale 模块权限（售后管理），不覆盖其他权限
        const aftersalePerms = defaultPerms.filter(p => p === 'aftersale' || p.startsWith('aftersale.'))
        let supplemented = false
        for (const p of aftersalePerms) {
          if (!userPermissions.includes(p)) {
            userPermissions.push(p)
            supplemented = true
          }
        }
        if (supplemented) {
          console.log(`[Auth] 🔧 已补全 ${resolvedRole} 角色的售后管理权限`)
        }
      }

      // 设置权限到权限服务
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
          departmentId: String(userData.departmentId || 'dept_001'),
          departmentIds: userData.departmentIds || ['dept_001'],
          whitelistTypes: [SensitiveInfoType.PHONE, SensitiveInfoType.EMAIL, SensitiveInfoType.WECHAT]
        })
      } else if (userData.role === 'sales_staff') {
        permissionService.setUserPermission({
          userId: userData.id.toString(),
          role: UserRole.SALES_STAFF,
          permissions: [PermissionLevel.RESTRICTED],
          dataScope: DataScope.SELF,
          departmentId: String(userData.departmentId || 'dept_001')
        })
      } else if (userData.role === 'customer_service') {
        permissionService.setUserPermission({
          userId: userData.id.toString(),
          role: UserRole.CUSTOMER_SERVICE,
          permissions: [PermissionLevel.PARTIAL_ACCESS],
          dataScope: DataScope.ALL,
          customerServiceType: (userData.customerServiceType || CustomerServiceType.GENERAL) as CustomerServiceType,
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

      // 客服自定义权限覆盖
      const csPermsData = userData.customerServicePermissions
      if ((userRoleCode === 'customer_service' || userData.role === 'customer_service')
          && csPermsData?.customPermissions?.length > 0) {
        const csMenuPerms = convertCsPermsToMenuPerms(csPermsData.customPermissions)
        userPermissions = csMenuPerms
        console.log(`[Auth] ✅ 客服自定义权限已覆盖默认权限: ${csPermsData.customPermissions.length}个原始权限 → 转换${csMenuPerms.length}个菜单权限`)
        localStorage.setItem('customerServicePermissions', JSON.stringify(csPermsData))
      }

      // 设置权限
      permissions.value = userPermissions
      setUserPermissions(userPermissions)

      // SaaS模式：保存租户授权模块列表
      if (userData.tenantModules && Array.isArray(userData.tenantModules) && userData.tenantModules.length > 0) {
        localStorage.setItem('tenantModules', JSON.stringify(userData.tenantModules))
        console.log('[Auth] 已保存租户授权模块:', userData.tenantModules)
      } else {
        localStorage.removeItem('tenantModules')
      }

      // 确保权限保存到用户对象中
      const completeUserInfo = {
        ...currentUser.value,
        permissions: userPermissions
      }

      // 保存到localStorage
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

      isLoggedIn.value = true
      console.log('[Auth] ✅ 登录状态已设置')

      // 登录成功后无痕刷新数据（异步执行）
      setTimeout(async () => {
        try {
          console.log('[Auth] 🔄 开始无痕刷新数据...')
          const { preloadAppData } = await import('@/services/appInitService')
          await preloadAppData()
          console.log('[Auth] ✅ 无痕刷新完成')
        } catch (e) {
          console.warn('[Auth] ⚠️ 无痕刷新失败（不影响使用）:', e)
        }

        // 加载敏感信息权限配置
        try {
          const { loadSensitiveInfoPermissions } = await import('@/services/sensitiveInfoPermissionService')
          await loadSensitiveInfoPermissions()
          console.log('[Auth] 🔐 敏感信息权限配置已加载')
        } catch (e) {
          console.warn('[Auth] ⚠️ 加载敏感信息权限配置失败:', e)
        }

        // 刷新安全控制台配置
        try {
          const { refreshSecureConsoleConfig, enableGlobalSecureConsole } = await import('@/utils/secureLogger')
          enableGlobalSecureConsole()
          await refreshSecureConsoleConfig()
          console.log('[Auth] 🔐 控制台加密配置已刷新')
        } catch (e) {
          console.warn('[Auth] ⚠️ 刷新控制台配置失败:', e)
        }
      }, 300)

      return true
    } catch (error) {
      console.error('API登录失败:', error)
      throw error
    }
  }

  // ── 带重试机制的登录 ──────────────────────────────────

  const loginWithRetry = async (username: string, password: string, rememberMe = false, maxRetries = 3, tenantId?: string) => {
    let lastError: unknown

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Auth] 登录尝试 ${attempt}/${maxRetries}`)
        const result = await loginWithApi(username, password, rememberMe, tenantId)

        if (result === true) {
          console.log('[Auth] ✅ 登录成功')
          return true
        }

        if (token.value && isLoggedIn.value) {
          console.log('[Auth] ✅ 登录成功（通过状态确认）')
          return true
        }

        console.warn(`[Auth] 登录尝试 ${attempt}/${maxRetries} 返回值异常:`, result)

      } catch (error: unknown) {
        lastError = error
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[Auth] 登录尝试 ${attempt}/${maxRetries} 失败:`, errorMessage)

        if ((errorMessage.includes('频繁') || errorMessage.includes('429') || errorMessage === 'RATE_LIMITED') && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          console.log(`[Auth] ${delay}ms后重试...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        if (attempt === maxRetries) {
          throw lastError
        }
      }
    }

    throw lastError || new Error('登录失败，请稍后重试')
  }

  // ── 清除用户数据（不调用API，用于401错误处理）────────

  const clearUserData = () => {
    console.log('[Auth] 清除用户数据（不调用API）')

    currentUser.value = null
    token.value = ''
    permissions.value = []
    isLoggedIn.value = false
    users.value = []

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

    // 清理消息通知缓存
    try {
      localStorage.removeItem('notification-messages')
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

    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('currentUser')

    console.log('[Auth] ✅ 用户数据已清除（租户信息已保留，消息缓存已清理）')
  }

  // ── 登出 ──────────────────────────────────────────────

  const logout = async () => {
    console.log('[Auth] 开始执行登出操作')

    const { setLoggingOutState } = await import('@/utils/request')
    setLoggingOutState(true)

    try {
      // 断开WebSocket连接并重置通知状态
      try {
        const { useNotificationStore } = await import('@/stores/notification')
        const notificationStore = useNotificationStore()
        await notificationStore.disconnectWebSocket()
        if (typeof notificationStore.resetNotificationState === 'function') {
          notificationStore.resetNotificationState()
        }
      } catch (_e) {
        console.log('[Auth] 断开WebSocket/重置通知状态失败（已忽略）')
      }

      // 调用API登出
      await authApiService.logout().catch(err => {
        console.log('[Auth] API登出调用失败（已忽略）:', err.message)
      })
    } finally {
      clearUserData()

      setTimeout(() => {
        setLoggingOutState(false)
      }, 500)

      console.log('[Auth] ✅ 登出完成')
    }
  }

  // ── 会话恢复 ──────────────────────────────────────────

  const initUser = async () => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('user')

    if (!savedToken || !savedUser) {
      console.log('[Auth] 没有保存的登录信息，跳过初始化')
      return
    }

    console.log('[Auth] 🔧 开始恢复登录状态...')

    try {
      const userData = JSON.parse(savedUser)

      token.value = savedToken
      currentUser.value = userData
      isLoggedIn.value = true

      console.log('[Auth] ✅ 登录状态已恢复:', userData.name)
      console.log('[Auth] ✅ Token:', savedToken.substring(0, 30) + '...')
      console.log('[Auth] ✅ isLoggedIn:', isLoggedIn.value)

      // 优先从 localStorage 恢复权限
      let userPerms: string[] = []

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

      // 尝试从crm_roles读取动态配置
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

      // 从用户对象中恢复
      if (userPerms.length === 0 && userData.permissions && Array.isArray(userData.permissions) && userData.permissions.length > 0) {
        userPerms = userData.permissions
        console.log('[Auth] ✅ 从用户对象恢复权限:', userPerms.length, '个权限')
      }

      // 兜底：使用默认权限
      if (userPerms.length === 0) {
        userPerms = getDefaultRolePermissions(userData.role)
        console.log('[Auth] ✅ 使用默认角色权限:', userData.role, userPerms.length, '个权限')
      }

      // 客服自定义权限覆盖
      if (userData.role === 'customer_service') {
        try {
          const savedCsPerms = localStorage.getItem('customerServicePermissions')
          if (savedCsPerms) {
            const csPermsData = JSON.parse(savedCsPerms)
            if (csPermsData?.customPermissions?.length > 0) {
              const csMenuPerms = convertCsPermsToMenuPerms(csPermsData.customPermissions)
              userPerms = csMenuPerms
              console.log(`[Auth] ✅ 会话恢复：客服自定义权限已覆盖默认权限: ${csMenuPerms.length}个`)
            }
          }
        } catch (e) {
          console.warn('[Auth] 恢复客服自定义权限失败:', e)
        }
      }

      // 🔥 补全内置角色可能缺失的售后管理模块权限（会话恢复时）
      const builtInRolesForRestore = ['department_manager', 'sales_staff', 'customer_service', 'manager', 'sales']
      if (builtInRolesForRestore.includes(userData.role) && userPerms.length > 0 && !userPerms.includes('*')) {
        const defaultPermsForRestore = getDefaultRolePermissions(
          userData.role === 'manager' ? 'department_manager' :
          userData.role === 'sales' ? 'sales_staff' :
          userData.role
        )
        const aftersalePermsForRestore = defaultPermsForRestore.filter(p => p === 'aftersale' || p.startsWith('aftersale.'))
        let supplementedRestore = false
        for (const p of aftersalePermsForRestore) {
          if (!userPerms.includes(p)) {
            userPerms.push(p)
            supplementedRestore = true
          }
        }
        if (supplementedRestore) {
          console.log(`[Auth] 🔧 会话恢复：已补全 ${userData.role} 角色的售后管理权限`)
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
      logout()
      return
    }
  }

  return {
    login,
    loginWithApi,
    loginWithRetry,
    clearUserData,
    logout,
    initUser,
  }
}






