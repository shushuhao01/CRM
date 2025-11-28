/**
 * API服务基础类
 * 提供统一的HTTP请求方法和错误处理
 */
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  code?: string
  timestamp?: string
  path?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export class ApiService {
  private static instance: ApiService
  private axiosInstance: AxiosInstance
  private baseURL: string

  constructor(baseURL: string = import.meta.env.VITE_API_BASE_URL || '') {
    this.baseURL = baseURL
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  static getInstance(baseURL?: string): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService(baseURL)
    }
    return ApiService.instance
  }

  /**
   * 设置请求和响应拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // 添加认证token
        const token = this.getAuthToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // 添加请求ID用于追踪
        config.headers['X-Request-ID'] = this.generateRequestId()

        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data
        })

        return config
      },
      (error) => {
        console.error('[API] 请求错误:', error)
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const { data } = response

        console.log(`[API] 响应成功:`, {
          url: response.config.url,
          status: response.status,
          data: data
        })

        // 检查业务状态码
        if (!data.success) {
          const errorMessage = data.message || '请求失败'
          ElMessage.error(errorMessage)
          return Promise.reject(new Error(errorMessage))
        }

        return response
      },
      (error) => {
        console.error('[API] 响应错误:', error)

        // 检查是否为健康检查请求或token验证请求，如果是则不显示错误提示
        const isHealthCheck = error.config?.metadata?.isHealthCheck
        const isTokenValidation = error.config?.metadata?.isTokenValidation

        if (!isHealthCheck && !isTokenValidation) {
          // 处理不同类型的错误
          if (error.response) {
            const { status, data } = error.response

            switch (status) {
              case 401:
                // 【关键修复】完全忽略401错误，不做任何处理
                console.log('[API] ⚠️ 收到401错误，已忽略（保持登录状态）')
                break
              case 403:
                ElMessage.error('没有权限访问该资源')
                break
              case 404:
                ElMessage.error('请求的资源不存在')
                break
              case 422:
                ElMessage.error(data.message || '请求参数验证失败')
                break
              case 429:
                ElMessage.error('请求过于频繁，请稍后再试')
                // 对于429错误，抛出特殊错误以便上层处理重试
                throw new Error('RATE_LIMITED')
              case 500:
                ElMessage.error('服务器内部错误')
                break
              default:
                ElMessage.error(data.message || `请求失败 (${status})`)
            }
          } else if (error.request) {
            ElMessage.error('网络连接失败，请检查网络设置')
          } else {
            ElMessage.error('请求配置错误')
          }
        } else if (isTokenValidation && error.response?.status === 401) {
          // 【关键修复】Token验证失败也忽略
          console.log('[API] ⚠️ Token验证失败，已忽略（保持登录状态）')
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * 获取认证token
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  /**
   * 处理未授权错误
   */
  private async handleUnauthorized(showMessage: boolean = true): Promise<void> {
    console.log('[API] 收到401错误，尝试刷新token')

    // 尝试刷新token
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        // 动态导入authApiService避免循环依赖
        const { authApiService } = await import('./authApiService')
        await authApiService.refreshToken()
        console.log('[API] Token刷新成功，继续请求')
        return
      } catch (error) {
        console.error('[API] Token刷新失败:', error)
      }
    }

    // 【修复】只在真正需要时才清除认证信息
    // 检查是否在Mock API模式下
    const { shouldUseMockApi } = await import('@/api/mock')
    if (shouldUseMockApi()) {
      console.log('[API] Mock API模式下，忽略401错误，保持登录状态')
      return
    }

    // 刷新失败或没有refreshToken，清除认证信息
    console.log('[API] 清除认证信息')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('user_info')
    localStorage.removeItem('userPermissions')
    localStorage.removeItem('token_expiry')

    // 根据参数决定是否显示错误消息
    if (showMessage) {
      ElMessage.error('登录已过期，请重新登录')
    }

    // 不在这里进行导航，让路由守卫来处理
    // 这样可以避免导航冲突
    console.log('[API] Token已清除，等待路由守卫处理导航')
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<ApiResponse<T>>(url, {
      params,
      ...config
    })
    return response.data.data as T
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config)
    return response.data.data as T
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, config)
    return response.data.data as T
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config)
    return response.data.data as T
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data, config)
    return response.data.data as T
  }

  /**
   * 分页查询
   */
  async paginate<T = any>(
    url: string,
    params: PaginationParams = {},
    config?: AxiosRequestConfig
  ): Promise<PaginatedResponse<T>> {
    const queryParams = {
      page: params.page || 1,
      limit: params.limit || 20,
      search: params.search || '',
      sortBy: params.sortBy || 'id',
      sortOrder: params.sortOrder || 'desc',
      ...params
    }

    return this.get<PaginatedResponse<T>>(url, queryParams, config)
  }

  /**
   * 文件上传
   */
  async upload<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    }

    return this.post<T>(url, formData, config)
  }

  /**
   * 批量操作
   */
  async batch<T = any>(url: string, operations: any[]): Promise<T> {
    return this.post<T>(url, { operations })
  }

  /**
   * 文件下载
   */
  async download(url: string, params?: unknown, config?: AxiosRequestConfig): Promise<Blob> {
    const response = await this.axiosInstance.get(url, {
      ...config,
      params,
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health', undefined, {
        // 标记这是健康检查请求，避免在拦截器中显示错误提示
        metadata: { isHealthCheck: true }
      })
      return true
    } catch (error) {
      console.error('[API] 健康检查失败:', error)
      // 健康检查失败不在这里显示错误提示，由storageMode服务统一处理
      return false
    }
  }

  /**
   * 设置认证token
   */
  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token)
  }

  /**
   * 清除认证token
   */
  clearAuthToken(): void {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
  }

  /**
   * 获取基础URL
   */
  getBaseURL(): string {
    return this.baseURL
  }

  /**
   * 更新基础URL
   */
  updateBaseURL(baseURL: string): void {
    this.baseURL = baseURL
    this.axiosInstance.defaults.baseURL = baseURL
  }
}

// 导出默认实例
export const apiService = ApiService.getInstance()

// 重新导出 Axios 类型
export { AxiosRequestConfig, AxiosResponse }
