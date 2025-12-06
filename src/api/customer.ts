// 客户相关API服务
import { api } from './request'
import { API_ENDPOINTS } from './config'
import { mockApi, shouldUseMockApi } from './mock'
import type { Customer } from '@/stores/customer'
import { useCustomerStore } from '@/stores/customer'
import { isProduction } from '@/utils/env'

// 客户查询参数接口
export interface CustomerSearchParams {
  name?: string
  phone?: string
  level?: string
  dateRange?: [string, string]
  page?: number
  pageSize?: number
}

// 客户列表响应接口
export interface CustomerListResponse {
  list: Customer[]
  total: number
  page: number
  pageSize: number
}

// 客户API服务
export const customerApi = {
  // 获取客户列表
  getList: async (params?: CustomerSearchParams) => {
    // 生产环境：强制使用真实API
    if (isProduction()) {
      return api.get<CustomerListResponse>(API_ENDPOINTS.CUSTOMERS.LIST, params)
    }

    // 开发环境：根据配置决定
    if (shouldUseMockApi()) {
      const data = await mockApi.getCustomerList(params)
      return { data, code: 200, message: 'success', success: true }
    }
    return api.get<CustomerListResponse>(API_ENDPOINTS.CUSTOMERS.LIST, params)
  },

  // 检查客户是否存在（调用后端API验证数据库）
  checkExists: async (phone: string) => {
    try {
      console.log('=== 验证客户是否存在（调用后端API） ===')
      console.log('验证手机号:', phone)

      // 生产环境：调用后端API验证数据库
      if (isProduction()) {
        console.log('生产环境：调用后端API验证')
        const response = await api.get<{
          id: string
          name: string
          phone: string
          creatorName: string
          createTime: string
        } | null>('/customers/check-exists', { phone })

        console.log('后端API响应:', response)

        if (response.data) {
          console.log('后端返回：客户已存在:', response.data.name)
          return {
            data: response.data,
            code: 200,
            message: '该手机号已存在客户记录',
            success: true
          }
        } else {
          console.log('后端返回：客户不存在，可以创建')
          return {
            data: null,
            code: 200,
            message: '该手机号不存在，可以创建',
            success: true
          }
        }
      }

      // 开发环境：同时检查本地store和后端API
      console.log('开发环境：检查本地store')
      const customerStore = useCustomerStore()

      console.log('验证时CustomerStore实例ID:', (customerStore as unknown as { instanceId: string }).instanceId)
      console.log('验证时CustomerStore客户数量:', customerStore.customers.length)

      // 先检查本地store
      const existingCustomer = customerStore.customers.find(c => c.phone === phone)

      if (existingCustomer) {
        console.log('本地store找到重复客户:', existingCustomer.name)
        return {
          data: existingCustomer,
          code: 200,
          message: '该手机号已存在客户记录',
          success: true
        }
      }

      // 如果本地没有，尝试调用后端API（开发环境可能也连接了数据库）
      if (!shouldUseMockApi()) {
        try {
          console.log('开发环境：尝试调用后端API验证')
          const response = await api.get<{
            id: string
            name: string
            phone: string
            creatorName: string
            createTime: string
          } | null>('/customers/check-exists', { phone })

          if (response.data) {
            console.log('后端API返回：客户已存在:', response.data.name)
            return {
              data: response.data,
              code: 200,
              message: '该手机号已存在客户记录',
              success: true
            }
          }
        } catch (apiError) {
          console.log('后端API调用失败，使用本地验证结果:', apiError)
        }
      }

      console.log('客户不存在，可以创建')
      return {
        data: null,
        code: 200,
        message: '该手机号不存在，可以创建',
        success: true
      }
    } catch (error) {
      console.error('Customer API: checkExists 执行失败:', error)
      return { data: null, code: 500, message: '检查客户存在性失败', success: false }
    }
  },

  // 创建客户 - 🔥 强制调用真实API，绕过Mock判断，直接使用fetch
  create: async (data: Omit<Customer, 'id' | 'createTime' | 'orderCount'>) => {
    console.log('=== customerApi.create 强制调用真实API（绕过Mock） ===')
    console.log('请求数据:', data)

    // 🔥 直接使用fetch，绕过request.ts中的shouldUseMockApi判断
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'
    const url = `${baseUrl.replace(/\/+$/, '')}${API_ENDPOINTS.CUSTOMERS.CREATE}`

    console.log('API完整URL:', url)

    // 获取认证token
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    })

    console.log('HTTP响应状态:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API请求失败:', response.status, errorText)
      throw new Error(`API请求失败: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('API响应结果:', result)

    // 标准化返回格式
    return {
      code: result.code || 200,
      message: result.message || 'success',
      data: result.data || result,
      success: result.success !== false
    }
  },

  // 更新客户
  update: async (id: string, data: Partial<Customer>) => {
    // 生产环境：强制使用真实API
    if (isProduction()) {
      return api.put<Customer>(API_ENDPOINTS.CUSTOMERS.UPDATE(id), data)
    }

    // 开发环境：根据配置决定
    if (shouldUseMockApi()) {
      const customer = await mockApi.updateCustomer(id, data)
      return { data: customer, code: 200, message: 'success', success: true }
    }
    return api.put<Customer>(API_ENDPOINTS.CUSTOMERS.UPDATE(id), data)
  },

  // 删除客户
  delete: async (id: string) => {
    // 生产环境：强制使用真实API
    if (isProduction()) {
      return api.delete(API_ENDPOINTS.CUSTOMERS.DELETE(id))
    }

    // 开发环境：根据配置决定
    if (shouldUseMockApi()) {
      await mockApi.deleteCustomer(id)
      return { data: null, code: 200, message: 'success', success: true }
    }
    return api.delete(API_ENDPOINTS.CUSTOMERS.DELETE(id))
  },

  // 获取客户详情
  getDetail: async (id: string) => {
    // 生产环境：强制使用真实API
    if (isProduction()) {
      return api.get<Customer>(API_ENDPOINTS.CUSTOMERS.DETAIL(id))
    }

    // 开发环境：根据配置决定
    if (shouldUseMockApi()) {
      const customer = await mockApi.getCustomerDetail(id)
      return { data: customer, code: 200, message: 'success', success: true }
    }
    return api.get<Customer>(API_ENDPOINTS.CUSTOMERS.DETAIL(id))
  },

  // 搜索客户
  search: async (params: CustomerSearchParams) => {
    // 生产环境：强制使用真实API
    if (isProduction()) {
      return api.get<CustomerListResponse>(API_ENDPOINTS.CUSTOMERS.SEARCH, params)
    }

    // 开发环境：根据配置决定
    if (shouldUseMockApi()) {
      const data = await mockApi.getCustomerList(params)
      return { data, code: 200, message: 'success', success: true }
    }
    return api.get<CustomerListResponse>(API_ENDPOINTS.CUSTOMERS.SEARCH, params)
  }
}
