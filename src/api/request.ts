// HTTP请求工具 - 统一使用 axios 实现（已从 fetch 迁移）
// 🔥 任务3.3：保持与原 fetch 版完全相同的导出接口（request函数 + api对象 + ApiResponse类型）
// 底层委托给 utils/request.ts 的 axios 实例，统一 Token管理/错误处理/请求拦截
import service from '@/utils/request'
import type { AxiosRequestConfig } from 'axios'

// ── 类型导出（保持原接口不变）────────────────────────────

// 响应数据接口
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  success: boolean
}

// 请求参数类型 - 支持嵌套对象
export type RequestParams = Record<string, string | number | boolean | undefined | null | Record<string, unknown>>

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

// ── 核心请求函数 ────────────────────────────────────────

/**
 * 主请求函数 - 委托给 axios 实例
 * axios 响应拦截器已自动解包 response.data.data（返回内层 data）
 * 这里包装回 ApiResponse<T> 格式，保持原接口兼容
 */
export const request = async <T = unknown>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> => {
  const {
    method = 'GET',
    headers = {},
    params,
    data,
    timeout
  } = config

  const axiosConfig: AxiosRequestConfig = {
    headers,
    params,
    timeout
  }

  // axios 响应拦截器成功时返回 response.data.data（已解包的内层数据）
  // 我们将其重新包装为 ApiResponse<T> 以兼容所有现有消费者
  let result: T

  switch (method) {
    case 'POST':
      result = await service.post(endpoint, data, axiosConfig)
      break
    case 'PUT':
      result = await service.put(endpoint, data, axiosConfig)
      break
    case 'PATCH':
      result = await service.patch(endpoint, data, axiosConfig)
      break
    case 'DELETE':
      result = await service.delete(endpoint, axiosConfig)
      break
    case 'GET':
    default:
      result = await service.get(endpoint, axiosConfig)
      break
  }

  return {
    code: 200,
    message: 'success',
    data: result,
    success: true
  }
}

// ── 便捷方法（保持原接口不变）────────────────────────────

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
