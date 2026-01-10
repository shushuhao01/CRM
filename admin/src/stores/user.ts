import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminApi } from '@/api/admin'

interface AdminUser {
  id: number
  username: string
  name?: string
  email?: string
  role: string
  status?: string
  last_login_at?: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const user = ref<AdminUser | null>(null)

  const isLoggedIn = computed(() => !!token.value)

  // userInfo 是 user 的别名，方便组件使用
  const userInfo = computed(() => user.value)

  const login = async (username: string, password: string) => {
    const res = await adminApi.login(username, password)
    token.value = res.data.token
    user.value = res.data.admin
    localStorage.setItem('admin_token', res.data.token)
    return res
  }

  const logout = () => {
    token.value = ''
    user.value = null
    localStorage.removeItem('admin_token')
  }

  const fetchProfile = async () => {
    if (!token.value) return
    try {
      const res = await adminApi.getProfile()
      user.value = res.data
    } catch {
      logout()
    }
  }

  return {
    token,
    user,
    userInfo,
    isLoggedIn,
    login,
    logout,
    fetchProfile
  }
})
