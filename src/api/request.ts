// HTTP请求工具 - 生产环境版本（已移除Mock API逻辑）
import { API_CONFIG } from './config'

// 响应数据接口
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  success: boolean
}

// 请求参数类型 - 支持嵌套对象
export type RequestParams = Record<string, string | number | boolean | undefined | null | Record<string, unknown>>

// 扁平化参数用于URL查询字符串
const flattenParams = (params: RequestParams): Record<string, string> => {
  const result: Record<string, string> = {}
  Object.keys(params).forEach(key => {
    const value = params[key]
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        // 对于对象类型的参数，将其属性展开
        Object.keys(value).forEach(subKey => {
          const subValue = (value as Record<string, unknown>)[subKey]
          if (subValue !== undefined && subValue !== null) {
            result[subKey] = String(subValue)
          }
        })
      } else {
        result[key] = String(value)
      }
    }
  })
  return result
}

// 请求数据类型
export type RequestData = Record<string, unknown> | FormData | string | null

// API错误类型
export interface ApiError extends Error {
  status?: number
  data?: unknown
}

// 请求配置接口
export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  params?: RequestParams
  data?: RequestData
  timeout?: number
}

// 获取认证token
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
}

// 构建完整URL
const buildUrl = (endpoint: string, params?: RequestParams): string => {
  const base = API_CONFIG.BASE_URL.replace(/\/+$/, '')
  const path = String(endpoint || '').replace(/^\/+/, '')

  let urlString = `${base}/${path}`

  // 添加查询参数
  if (params && Object.keys(params).length > 0) {
    const flatParams = flattenParams(params)
    const searchParams = new URLSearchParams()
    Object.keys(flatParams).forEach(key => {
      searchParams.append(key, flatParams[key])
    })
    const queryString = searchParams.toString()
    if (queryString) {
      urlString += `?${queryString}`
    }
  }

  return urlString
}

// 处理响应
const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const contentType = response.headers.get('content-type')

  let data: unknown
  if (contentType && contentType.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text()
  }

  if (!response.ok) {
    const error = new Error(
      (data as { message?: string })?.message || `HTTP Error: ${response.status}`
    ) as ApiError
    error.status = response.status
    error.data = data
    throw error
  }

  return data as ApiResponse<T>
}

// 主要的请求函数 - 直接调用真实API
export const request = async <T = unknown>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> => {
  const {
    method = 'GET',
    headers = {},
    params,
    data,
    timeout = API_CONFIG.TIMEOUT
  } = config

  console.log(`[API] ${method} ${endpoint}`)

  // 构建请求头
  const requestHeaders: Record<string, string> = {
    ...API_CONFIG.HEADERS,
    ...headers
  }

  // 添加认证token
  const token = getAuthToken()
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  // 构建请求配置
  const requestConfig: RequestInit = {
    method,
    headers: requestHeaders,
    signal: AbortSignal.timeout(timeout)
  }

  // 添加请求体（对于POST、PUT、PATCH请求）
  if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
    requestConfig.body = JSON.stringify(data)
  }

  try {
    const url = buildUrl(endpoint, params)
    const response = await fetch(url, requestConfig)
    return await handleResponse<T>(response)
  } catch (error: unknown) {
    // 处理网络错误或超时
    if ((error as Error)?.name === 'AbortError') {
      throw new Error('请求超时')
    }
    throw error
  }
}

// 便捷方法
export const api = {
  get: <T = unknown>(endpoint: string, config?: { params?: RequestParams }) =>
    request<T>(endpoint, { method: 'GET', params: config?.params }),

  post: <T = unknown>(endpoint: string, data?: RequestData) =>
    request<T>(endpoint, { method: 'POST', data }),

  put: <T = unknown>(endpoint: string, data?: RequestData) =>
    request<T>(endpoint, { method: 'PUT', data }),

  patch: <T = unknown>(endpoint: string, data?: RequestData) =>
    request<T>(endpoint, { method: 'PATCH', data }),

  delete: <T = unknown>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' })
}
