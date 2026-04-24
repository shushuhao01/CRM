import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const api = axios.create({
  baseURL: '/api/v1/wecom/h5',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器：自动添加token
api.interceptors.request.use(config => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

// 响应拦截器：处理token过期
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      router.replace('/bind')
    }
    return Promise.reject(error)
  }
)

export default api
