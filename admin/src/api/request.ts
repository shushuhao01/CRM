import axios, { AxiosRequestConfig, AxiosError } from 'axios'
import { ElMessage, ElNotification } from 'element-plus'

// API 响应类型
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: number
}

// 防止重复弹出401提示
let isRedirectingToLogin = false

const instance = axios.create({
  baseURL: '/api/v1/admin',
  timeout: 30000
})

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.success === false) {
      // 业务错误（后端明确返回success: false）
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  },
  (error: AxiosError<any>) => {
    const status = error.response?.status
    const serverMessage = error.response?.data?.message

    // 根据HTTP状态码分类处理
    if (status === 401) {
      // Token过期或未认证 → 跳转登录页（防重复）
      if (!isRedirectingToLogin) {
        isRedirectingToLogin = true
        localStorage.removeItem('admin_token')
        ElNotification({
          title: '登录已过期',
          message: '请重新登录',
          type: 'warning',
          duration: 3000
        })
        setTimeout(() => {
          isRedirectingToLogin = false
          window.location.href = '/login'
        }, 1000)
      }
      return Promise.reject(error)
    }

    if (status === 403) {
      ElMessage.error('权限不足，无法执行此操作')
      return Promise.reject(error)
    }

    if (status === 404) {
      // 404 错误不在拦截器中弹提示，由调用方自行处理（避免重复弹窗）
      return Promise.reject(error)
    }

    if (status && status >= 500) {
      ElMessage.error(serverMessage || '服务器错误，请稍后重试')
      return Promise.reject(error)
    }

    // 网络错误/超时
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      ElMessage.error('请求超时，请检查网络后重试')
      return Promise.reject(error)
    }

    if (!window.navigator.onLine) {
      ElMessage.error('网络连接已断开，请检查网络设置')
      return Promise.reject(error)
    }

    // 其他未知错误
    ElMessage.error(serverMessage || error.message || '网络错误，请稍后重试')
    return Promise.reject(error)
  }
)

// 封装请求方法
const request = {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.get(url, config) as any
  },
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.post(url, data, config) as any
  },
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.put(url, data, config) as any
  },
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return instance.delete(url, config) as any
  }
}

export default request
