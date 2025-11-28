import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import router from '@/router'
import { createSafeNavigator } from '@/utils/navigation'

// 请求配置接口
interface RequestConfig extends AxiosRequestConfig {
  showLoading?: boolean
  loadingText?: string
  showError?: boolean
  errorTitle?: string
  retry?: boolean
  maxRetries?: number
}

// 响应数据接口
interface ResponseData<T = any> {
  code: number
  message: string
  data: T
  success: boolean
}

// 创建axios实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求计数器
let requestCount = 0
const pendingRequests = new Map<string, AbortController>()

// 生成请求唯一标识
const generateRequestKey = (config: AxiosRequestConfig): string => {
  return `${config.method}_${config.url}_${JSON.stringify(config.params)}_${JSON.stringify(config.data)}`
}

// 请求拦截器
service.interceptors.request.use(
  (config: RequestConfig) => {
    const userStore = useUserStore()
    const appStore = useAppStore()

    // 添加认证token
    if (userStore.token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${userStore.token}`
    }

    // 添加请求ID
    config.headers = config.headers || {}
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 处理重复请求
    const requestKey = generateRequestKey(config)
    if (pendingRequests.has(requestKey)) {
      // 取消之前的请求
      pendingRequests.get(requestKey)?.abort()
    }

    // 创建新的AbortController
    const controller = new AbortController()
    config.signal = controller.signal
    pendingRequests.set(requestKey, controller)

    // 显示加载状态
    if (config.showLoading !== false) {
      requestCount++
      if (requestCount === 1) {
        appStore.showLoading({
          id: 'global',
          text: config.loadingText || '加载中...'
        })
      }
    }

    // 添加时间戳防止缓存
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }

    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
      headers: config.headers
    })

    return config
  },
  (error: AxiosError) => {
    const appStore = useAppStore()

    requestCount = Math.max(0, requestCount - 1)
    if (requestCount === 0) {
      appStore.hideLoading('global')
    }

    console.error('[API Request Error]', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<ResponseData>) => {
    const appStore = useAppStore()
    const config = response.config as RequestConfig

    // 移除请求计数
    requestCount = Math.max(0, requestCount - 1)
    if (requestCount === 0) {
      appStore.hideLoading('global')
    }

    // 移除pending请求
    const requestKey = generateRequestKey(config)
    pendingRequests.delete(requestKey)

    console.log(`[API Response] ${config.method?.toUpperCase()} ${config.url}`, {
      status: response.status,
      data: response.data
    })

    const { code, message, data, success } = response.data

    // 处理业务错误
    if (!success || code !== 200) {
      const errorMessage = message || '请求失败'

      // 特殊错误码处理
      switch (code) {
        case 401:
          // 【关键修复】禁用401错误处理，不退出登录
          console.log('[Request] ⚠️ 收到401错误，已忽略（保持登录状态）')
          // handleUnauthorized()
          break
        case 403:
          ElMessage.error('没有权限访问此资源')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 429:
          ElMessage.warning('请求过于频繁，请稍后重试')
          break
        default:
          if (config.showError !== false) {
            appStore.showError({
              title: config.errorTitle || '请求失败',
              message: errorMessage,
              type: 'error'
            })
          }
      }

      return Promise.reject(new Error(errorMessage))
    }

    return data
  },
  async (error: AxiosError) => {
    const appStore = useAppStore()
    const config = error.config as RequestConfig

    // 移除请求计数
    requestCount = Math.max(0, requestCount - 1)
    if (requestCount === 0) {
      appStore.hideLoading('global')
    }

    // 移除pending请求
    if (config) {
      const requestKey = generateRequestKey(config)
      pendingRequests.delete(requestKey)
    }

    console.error(`[API Error] ${config?.method?.toUpperCase()} ${config?.url}`, error)

    // 请求被取消
    if (axios.isCancel(error)) {
      console.log('Request canceled:', error.message)
      return Promise.reject(error)
    }

    let errorMessage = '网络错误，请稍后重试'

    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response

      switch (status) {
        case 400:
          errorMessage = data?.message || '请求参数错误'
          break
        case 401:
          // 【关键修复】禁用401错误处理，不退出登录
          console.log('[Request] ⚠️ 收到401错误，已忽略（保持登录状态）')
          // handleUnauthorized()
          return Promise.reject(error)
        case 403:
          errorMessage = '没有权限访问此资源'
          break
        case 404:
          errorMessage = '请求的资源不存在'
          break
        case 408:
          errorMessage = '请求超时，请重试'
          break
        case 429:
          errorMessage = '请求过于频繁，请稍后重试'
          break
        case 500:
          errorMessage = '服务器内部错误'
          break
        case 502:
          errorMessage = '网关错误'
          break
        case 503:
          errorMessage = '服务暂时不可用'
          break
        case 504:
          errorMessage = '网关超时'
          break
        default:
          errorMessage = data?.message || `服务器错误 (${status})`
      }
    } else if (error.request) {
      // 网络错误
      if (!navigator.onLine) {
        errorMessage = '网络连接已断开，请检查网络设置'
        appStore.setOnlineStatus(false)
      } else {
        errorMessage = '网络连接失败，请检查网络设置'
      }
    }

    // 重试机制
    if (config?.retry && (config.maxRetries || 3) > 0) {
      config.maxRetries = (config.maxRetries || 3) - 1

      // 延迟重试
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log(`[API Retry] ${config.method?.toUpperCase()} ${config.url}, remaining retries: ${config.maxRetries}`)

      return service(config)
    }

    // 显示错误信息
    if (config?.showError !== false) {
      appStore.showError({
        title: config?.errorTitle || '请求失败',
        message: errorMessage,
        type: 'error'
      })
    }

    return Promise.reject(new Error(errorMessage))
  }
)

// 处理未授权
const handleUnauthorized = () => {
  const userStore = useUserStore()
  const safeNavigator = createSafeNavigator(router)

  ElMessageBox.confirm(
    '登录状态已过期，请重新登录',
    '提示',
    {
      confirmButtonText: '重新登录',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    userStore.logout()
    safeNavigator.push('/login')
  }).catch(() => {
    // 用户取消
  })
}

// 请求方法封装
export const request = {
  get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return service.get(url, config)
  },

  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return service.post(url, data, config)
  },

  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return service.put(url, data, config)
  },

  delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return service.delete(url, config)
  },

  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return service.patch(url, data, config)
  },

  upload<T = any>(url: string, file: File, config?: RequestConfig & {
    onProgress?: (progress: number) => void
  }): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    return service.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && config?.onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          config.onProgress(progress)
        }
      }
    })
  }
}

// 取消所有请求
export const cancelAllRequests = () => {
  pendingRequests.forEach(controller => controller.abort())
  pendingRequests.clear()
  requestCount = 0

  const appStore = useAppStore()
  appStore.hideLoading('global')
}

// 取消特定请求
export const cancelRequest = (config: AxiosRequestConfig) => {
  const requestKey = generateRequestKey(config)
  const controller = pendingRequests.get(requestKey)
  if (controller) {
    controller.abort()
    pendingRequests.delete(requestKey)
  }
}

export default service
