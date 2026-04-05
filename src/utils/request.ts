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
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求计数器
let requestCount = 0
const pendingRequests = new Map<string, AbortController>()

// 生成请求唯一标识
// 🔥 修复：排除 _t 时间戳参数，避免请求拦截器和响应拦截器生成的key不一致
// 请求拦截器在添加 _t 之前生成key，响应拦截器在添加 _t 之后生成key，导致 pendingRequests 永远无法清理
const generateRequestKey = (config: AxiosRequestConfig): string => {
  let params = config.params
  if (params && typeof params === 'object' && '_t' in params) {
    const { _t: _timestamp, ...restParams } = params
    params = restParams
  }
  return `${config.method}_${config.url}_${JSON.stringify(params)}_${JSON.stringify(config.data)}`
}

// 请求拦截器
service.interceptors.request.use(
  (config: RequestConfig) => {
    const userStore = useUserStore()
    const appStore = useAppStore()

    // 🔥 公开页面检查：公开页面直接取消所有API请求
    const isPublicPage = window.location.pathname.startsWith('/public-help')
    if (isPublicPage) {
      // 公开页面不需要发送任何API请求，直接抛出取消错误
      console.log('[Request] 公开页面，取消API请求:', config.url)
      return Promise.reject(new Error('公开页面，取消API请求'))
    }

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

    // 显示加载状态（默认不显示全局loading，需要显式设置 showLoading: true）
    if (config.showLoading === true) {
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

    // 处理业务错误 - 兼容两种响应格式：
    // 1. { success: true, data: ... } - 新格式
    // 2. { code: 200, success: true, data: ... } - 旧格式
    const isSuccess = success === true || code === 200
    if (!isSuccess) {
      const errorMessage = message || '请求失败'

      // 特殊错误码处理
      switch (code) {
        case 401:
          // 🔥 Token过期，显示友好提示并跳转登录页
          console.log('[Request] ⚠️ 收到401错误，Token已过期')
          handleUnauthorized()
          break
        case 403: {
          // 🔥 租户资源配额超限
          const respData = response.data as any
          if (respData?.code === 'USER_LIMIT_EXCEEDED' || respData?.code === 'STORAGE_LIMIT_EXCEEDED') {
            ElMessage.error({ message: errorMessage, duration: 5000 })
          } else if (respData?.code === 'LICENSE_EXPIRED_WRITE_BLOCKED') {
            import('./licenseDialog').then(({ showLicenseExpiredDialog }) => {
              showLicenseExpiredDialog()
            })
          } else {
            ElMessage.error('没有权限访问此资源')
          }
          break
        }
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

    // 🔥 公开页面静默处理所有错误
    const isPublicPage = window.location.pathname.startsWith('/public-help')
    if (isPublicPage) {
      console.log('[Request] 公开页面，静默处理错误')
      return Promise.reject(error)
    }

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
          // 🔥 公开页面不处理401错误（静默忽略）
          const currentPath = window.location.pathname
          if (currentPath.startsWith('/public-help')) {
            console.log('[Request] 公开页面，静默忽略401错误')
            return Promise.reject(error)
          }
          // 🔥 Token过期，显示友好提示并跳转登录页
          console.log('[Request] ⚠️ 收到401错误，Token已过期')
          handleUnauthorized()
          return Promise.reject(error)
         case 403:
          // 🔥 租户资源配额超限的友好提示
          if (data?.code === 'USER_LIMIT_EXCEEDED') {
            errorMessage = data?.message || '用户数已达上限，请联系管理员扩容或删除现有用户后重试'
            ElMessage.error({ message: errorMessage, duration: 5000 })
            return Promise.reject(error)
          }
          if (data?.code === 'STORAGE_LIMIT_EXCEEDED') {
            errorMessage = data?.message || '存储空间不足，请联系管理员扩容后重试'
            ElMessage.error({ message: errorMessage, duration: 5000 })
            return Promise.reject(error)
          }
          // 🔥 私有部署授权过期写入限制
          if (data?.code === 'LICENSE_EXPIRED_WRITE_BLOCKED') {
            errorMessage = data?.message || '系统授权已过期，无法执行此操作'
            import('./licenseDialog').then(({ showLicenseExpiredDialog }) => {
              showLicenseExpiredDialog()
            })
            return Promise.reject(error)
          }
          errorMessage = data?.message || '没有权限访问此资源'
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

// 🔥 处理未授权（Token过期）- 显示友好提示并跳转登录页
let isShowingAuthDialog = false // 防止重复弹窗
let isLoggingOut = false // 🔥 标记是否正在执行登出操作

// 🔥 导出设置登出状态的方法，供logout使用
export const setLoggingOutState = (state: boolean) => {
  isLoggingOut = state
}

const handleUnauthorized = async () => {
  // 🔥 如果正在执行登出操作，不显示弹窗（避免循环）
  if (isLoggingOut) {
    console.log('[Request] 正在登出中，跳过401弹窗')
    return
  }

  // 防止多个请求同时触发多个弹窗
  if (isShowingAuthDialog) {
    console.log('[Request] 弹窗已显示，跳过重复弹窗')
    return
  }

  // 🔥 检查当前是否已经在登录页或公开页面，如果是则不显示弹窗
  const currentPath = window.location.pathname
  const publicPaths = ['/login', '/public-help', '/register', '/agreement']
  if (publicPaths.some(path => currentPath.startsWith(path))) {
    console.log('[Request] 在公开页面，跳过401弹窗:', currentPath)
    return
  }

  isShowingAuthDialog = true

  try {
    const safeNavigator = createSafeNavigator(router)

    // 🔥 先清除本地存储的认证数据，防止后续请求继续触发401
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    localStorage.removeItem('user_info')
    localStorage.removeItem('userPermissions')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token_expiry')
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('user')

    // 显示友好提示
    await ElMessageBox.alert(
      '您的登录已过期，请重新登录以继续使用系统。',
      '登录已过期',
      {
        confirmButtonText: '重新登录',
        type: 'warning',
        showClose: true,
        closeOnClickModal: false,
        closeOnPressEscape: true
      }
    )

    // 跳转到登录页
    safeNavigator.push('/login')
  } catch {
    // 用户关闭弹窗也跳转登录页
    const safeNavigator = createSafeNavigator(router)
    safeNavigator.push('/login')
  } finally {
    // 🔥 延迟重置标志，确保短时间内不会再次弹窗
    setTimeout(() => {
      isShowingAuthDialog = false
    }, 1000)
  }
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
