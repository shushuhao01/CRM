import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminApi } from '@/api/admin'

interface AdminUser {
  id: number
  username: string
  name?: string
  email?: string
  role: string
  roleId?: string | null
  permissions?: string[]
  status?: string
  last_login_at?: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const user = ref<AdminUser | null>(null)
  const permissions = ref<string[]>([])
  // 标记用户信息是否已加载完成（用于路由守卫等待）
  const profileLoaded = ref(false)
  // 防止并发重复请求
  let profileLoadingPromise: Promise<void> | null = null

  const isLoggedIn = computed(() => !!token.value)

  // userInfo 是 user 的别名，方便组件使用
  const userInfo = computed(() => user.value)

  // 是否为超级管理员
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')

  /**
   * 检查是否拥有某个权限
   * @param permission 权限码，如 'dashboard:view', 'settings:admins:create'
   */
  const hasPermission = (permission: string): boolean => {
    // 超级管理员拥有所有权限
    if (isSuperAdmin.value) return true
    if (permissions.value.includes('*')) return true
    return permissions.value.includes(permission)
  }

  /**
   * 检查是否拥有某组权限中的任一个
   * @param perms 权限码数组
   */
  const hasAnyPermission = (perms: string[]): boolean => {
    if (isSuperAdmin.value) return true
    if (permissions.value.includes('*')) return true
    return perms.some(p => permissions.value.includes(p))
  }

  /**
   * 检查是否有某个菜单模块的访问权限
   * 只要拥有该模块下任一子权限即可
   * @param moduleCode 模块码，如 'dashboard', 'customer-management'
   */
  const hasMenuPermission = (moduleCode: string): boolean => {
    if (isSuperAdmin.value) return true
    if (permissions.value.includes('*')) return true
    // 套餐管理独立菜单，权限码仍沿用 tenant-customers:packages
    if (moduleCode === 'package-management') {
      return permissions.value.some((p: string) => p.startsWith('tenant-customers:packages:'))
    }
    return permissions.value.some((p: string) => p.startsWith(moduleCode + ':') || p === moduleCode + ':view')
  }

  const login = async (username: string, password: string, captchaId?: string, captchaCode?: string) => {
    const res = await adminApi.login(username, password, captchaId, captchaCode)
    token.value = res.data.token
    user.value = res.data.admin
    permissions.value = res.data.admin.permissions || []
    profileLoaded.value = true
    localStorage.setItem('admin_token', res.data.token)
    return res
  }

  const logout = () => {
    token.value = ''
    user.value = null
    permissions.value = []
    profileLoaded.value = false
    profileLoadingPromise = null
    localStorage.removeItem('admin_token')
  }

  const fetchProfile = async () => {
    if (!token.value) return
    try {
      const res = await adminApi.getProfile()
      user.value = res.data
      permissions.value = res.data.permissions || []
    } catch {
      logout()
    } finally {
      profileLoaded.value = true
    }
  }

  /**
   * 确保用户信息已加载（路由守卫使用）
   * 防止并发重复请求，多次调用只发一次请求
   */
  const ensureProfileLoaded = async () => {
    if (profileLoaded.value) return
    if (!token.value) return
    if (!profileLoadingPromise) {
      profileLoadingPromise = fetchProfile()
    }
    await profileLoadingPromise
  }

  return {
    token,
    user,
    userInfo,
    permissions,
    profileLoaded,
    isLoggedIn,
    isSuperAdmin,
    hasPermission,
    hasAnyPermission,
    hasMenuPermission,
    login,
    logout,
    fetchProfile,
    ensureProfileLoaded
  }
})
