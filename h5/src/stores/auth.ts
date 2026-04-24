import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface H5User {
  id: string
  name: string
  username: string
  avatar?: string
  role?: string
  departmentId?: string
  tenantId?: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('h5_token') || '')
  const user = ref<H5User | null>(null)
  const wecomUserId = ref<string>('')
  const corpId = ref<string>('')
  const isInitializing = ref<boolean>(true)

  const isLoggedIn = computed(() => !!token.value)

  function setToken(t: string) {
    token.value = t
    localStorage.setItem('h5_token', t)
  }

  function setUser(u: H5User) {
    user.value = u
  }

  function setWecomInfo(userId: string, cId: string) {
    wecomUserId.value = userId
    corpId.value = cId
  }

  function setInitializing(val: boolean) {
    isInitializing.value = val
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('h5_token')
  }

  return {
    token, user, wecomUserId, corpId, isInitializing,
    isLoggedIn, setToken, setUser, setWecomInfo, setInitializing, logout
  }
})
