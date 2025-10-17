// HTTP请求工具
import { API_CONFIG } from './config'
import { mockApi, shouldUseMockApi } from './mock'

// 响应数据接口
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  success: boolean
}

// 请求参数类型
export type RequestParams = Record<string, string | number | boolean | undefined | null>

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

// 构建完整URL（修复：保留 BASE_URL 中的 /api/v1 前缀）
const buildUrl = (endpoint: string, params?: RequestParams): string => {
  const base = API_CONFIG.BASE_URL.replace(/\/+$/, '')
  const path = String(endpoint || '').replace(/^\/+/, '')
  const url = new URL(`${base}/${path}`)
  
  if (params) {
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, String(params[key]))
      }
    })
  }
  
  return url.toString()
}

// 处理响应
const handleResponse = async (response: Response): Promise<unknown> => {
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
  
  return data
}

// Mock API路由映射类型
type MockApiHandler = (params?: RequestParams, data?: RequestData, ...args: string[]) => Promise<unknown>

// Mock API路由映射
const mockApiRoutes: Record<string, MockApiHandler> = {
  // 订单相关路由
  'GET:/orders': (params) => mockApi.getOrderList(params),
  'PUT:/orders/([^/]+)': (params, data, orderId) => mockApi.updateOrder(orderId, data),
  'POST:/orders/([^/]+)/submit-audit': (params, data, orderId) => mockApi.submitOrderAudit(orderId, data),
  'POST:/orders/cancel-request': (params, data) => mockApi.submitCancelRequest(data),
  'GET:/orders/pending-cancel': () => mockApi.getPendingCancelOrderList(),
  'GET:/orders/audited-cancel': () => mockApi.getAuditedCancelOrderList(),
  'POST:/orders/([^/]+)/cancel-audit': (params, data, orderId) => mockApi.auditCancelRequest(orderId, data),
  'GET:/orders/statistics': () => mockApi.getOrderStatistics(),
  
  // 客户相关路由
  'GET:/customers': (params) => mockApi.getCustomerList(params),
  'GET:/customers/check-exists': (params) => {
    console.log('Mock API Route: /customers/check-exists 被调用')
    console.log('Mock API Route: 接收到的参数:', params)
    console.log('Mock API Route: 手机号参数:', params?.phone)
    return mockApi.checkCustomerExists(params?.phone as string)
  },
  'POST:/customers': (params, data) => mockApi.createCustomer(data),
  'PUT:/customers/([^/]+)': (params, data, customerId) => mockApi.updateCustomer(customerId, data),
  'DELETE:/customers/([^/]+)': (params, data, customerId) => mockApi.deleteCustomer(customerId),
  'GET:/customers/([^/]+)': (params, data, customerId) => mockApi.getCustomerDetail(customerId),
  
  // 短信相关路由
  'GET:/sms/templates': (params) => mockApi.getSmsTemplateList(params),
  'GET:/sms/approvals': (params) => mockApi.getSmsApprovalList(params),
  'GET:/sms/sends': (params) => mockApi.getSmsSendList(params),
  'GET:/sms/statistics': () => mockApi.getSmsStatistics(),
  
  // 日志相关路由
  'GET:/logs/system': (params) => mockApi.getSystemLogs(params),
  'DELETE:/logs/clear': () => mockApi.clearSystemLogs(),
  
  // 消息管理相关路由
  'GET:/message/subscriptions': () => mockApi.getMessageSubscriptions(),
  'PUT:/message/subscriptions/([^/]+)': (params, data, id) => mockApi.updateMessageSubscription(id, data),
  'GET:/message/announcements': (params) => mockApi.getAnnouncements(params),
  'POST:/message/announcements': (params, data) => mockApi.createAnnouncement(data),
  'PUT:/message/announcements/([^/]+)': (params, data, id) => mockApi.updateAnnouncement(id, data),
  'DELETE:/message/announcements/([^/]+)': (params, data, id) => mockApi.deleteAnnouncement(id),
  'GET:/message/configs': () => mockApi.getMessageConfigs(),
  'PUT:/message/configs/([^/]+)': (params, data, id) => mockApi.updateMessageConfig(id, data),
  'POST:/message/configs/([^/]+)/test': (params, data, id) => mockApi.testMessageConfig(id),
  'GET:/message/system-messages': (params) => mockApi.getSystemMessages(params),
  'PUT:/message/system-messages/([^/]+)/read': (params, data, id) => mockApi.markMessageAsRead(id),
  'PUT:/message/system-messages/read-all': () => mockApi.markAllMessagesAsRead(),
  'GET:/message/stats': () => mockApi.getMessageStats(),
  
  // 健康检查端点
  'GET:/health': () => Promise.resolve({ status: 'ok', timestamp: new Date().toISOString() }),
}

// 主要的请求函数
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
  
  // 检查是否使用Mock API
  if (shouldUseMockApi()) {
    const routeKey = `${method}:${endpoint}`
    console.log('Mock API: 尝试匹配路由', routeKey)
    console.log('Mock API: 请求参数', params)
    console.log('Mock API: 请求数据', data)
    
    // 直接匹配
    if (mockApiRoutes[routeKey]) {
      console.log('Mock API: 找到直接匹配的路由', routeKey)
      try {
        const result = await mockApiRoutes[routeKey](params, data)
        console.log('Mock API: 路由处理结果', result)
        return {
          code: 200,
          message: 'success',
          data: result,
          success: true
        }
      } catch (error: unknown) {
        console.error('Mock API: 路由处理失败', error)
        return {
            code: 400,
            message: (error as Error)?.message || '请求失败',
            data: null,
            success: false
          }
      }
    }
    
    // 正则匹配（用于带参数的路由）
    console.log('Mock API: 开始正则匹配')
    for (const [pattern, handler] of Object.entries(mockApiRoutes)) {
      const [patternMethod, patternPath] = pattern.split(':')
      if (patternMethod === method) {
        const regex = new RegExp(`^${patternPath}$`)
        const match = endpoint.match(regex)
        console.log(`Mock API: 尝试匹配模式 ${pattern}, 结果:`, match)
        if (match) {
          console.log('Mock API: 找到正则匹配的路由', pattern)
          try {
            const result = await handler(params, data, ...match.slice(1))
            console.log('Mock API: 正则路由处理结果', result)
            return {
              code: 200,
              message: 'success',
              data: result,
              success: true
            }
          } catch (error: unknown) {
            console.error('Mock API: 正则路由处理失败', error)
            return {
              code: 400,
              message: (error as Error)?.message || '请求失败',
              data: null,
              success: false
            }
          }
        }
      }
    }
    
    // 如果没有匹配的Mock路由，返回错误
    console.warn(`Mock API: 未找到匹配的路由 ${method}:${endpoint}`)
    return {
      code: 404,
      message: `Mock API: 未找到匹配的路由 ${method}:${endpoint}`,
      data: null,
      success: false
    }
  }
  
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
    return await handleResponse(response)
  } catch (error: unknown) {
    // 处理网络错误或超时
    if ((error as Error)?.name === 'AbortError') {
      throw new Error('请求超时')
    }
    
    // 重新抛出其他错误
    throw error
  }
}

// 便捷方法
export const api = {
  get: <T = unknown>(endpoint: string, params?: RequestParams) =>
    request<T>(endpoint, { method: 'GET', params }),
    
  post: <T = unknown>(endpoint: string, data?: RequestData) =>
    request<T>(endpoint, { method: 'POST', data }),
    
  put: <T = unknown>(endpoint: string, data?: RequestData) =>
    request<T>(endpoint, { method: 'PUT', data }),
    
  patch: <T = unknown>(endpoint: string, data?: RequestData) =>
    request<T>(endpoint, { method: 'PATCH', data }),
    
  delete: <T = unknown>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' })
}