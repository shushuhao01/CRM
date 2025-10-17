// 客户相关API服务
import { api } from './request'
import { API_ENDPOINTS } from './config'
import { mockApi, shouldUseMockApi } from './mock'
import type { Customer } from '@/stores/customer'

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
    if (shouldUseMockApi()) {
      const data = await mockApi.getCustomerList(params)
      return { data, code: 200, message: 'success', success: true }
    }
    return api.get<CustomerListResponse>(API_ENDPOINTS.CUSTOMERS.LIST, params)
  },
  
  // 检查客户是否存在
  checkExists: async (phone: string) => {
    try {
      console.log('Customer API: checkExists 调用', phone)
      
      // 验证输入参数
      if (!phone || typeof phone !== 'string') {
        console.error('Customer API: 无效的手机号参数:', phone)
        return { data: null, code: 400, message: '无效的手机号参数', success: false }
      }
      
      // 统一使用路由系统调用API（无论是Mock还是真实API）
      console.log('Customer API: 调用路径:', `${API_ENDPOINTS.CUSTOMERS.LIST}/check-exists`)
      try {
        return await api.get<Customer | null>(`${API_ENDPOINTS.CUSTOMERS.LIST}/check-exists`, { phone })
      } catch (apiError) {
        console.error('Customer API: API 调用失败:', apiError)
        return { data: null, code: 500, message: 'API 调用失败', success: false }
      }
    } catch (error) {
      console.error('Customer API: checkExists 执行失败:', error)
      return { data: null, code: 500, message: '检查客户存在性失败', success: false }
    }
  },

  // 创建客户
  create: async (data: Omit<Customer, 'id' | 'createTime' | 'orderCount'>) => {
    if (shouldUseMockApi()) {
      const customer = await mockApi.createCustomer(data)
      return { data: customer, code: 200, message: 'success', success: true }
    }
    return api.post<Customer>(API_ENDPOINTS.CUSTOMERS.CREATE, data)
  },
  
  // 更新客户
  update: async (id: string, data: Partial<Customer>) => {
    if (shouldUseMockApi()) {
      const customer = await mockApi.updateCustomer(id, data)
      return { data: customer, code: 200, message: 'success', success: true }
    }
    return api.put<Customer>(API_ENDPOINTS.CUSTOMERS.UPDATE(id), data)
  },
  
  // 删除客户
  delete: async (id: string) => {
    if (shouldUseMockApi()) {
      await mockApi.deleteCustomer(id)
      return { data: null, code: 200, message: 'success', success: true }
    }
    return api.delete(API_ENDPOINTS.CUSTOMERS.DELETE(id))
  },
  
  // 获取客户详情
  getDetail: async (id: string) => {
    if (shouldUseMockApi()) {
      const customer = await mockApi.getCustomerDetail(id)
      return { data: customer, code: 200, message: 'success', success: true }
    }
    return api.get<Customer>(API_ENDPOINTS.CUSTOMERS.DETAIL(id))
  },
  
  // 搜索客户
  search: async (params: CustomerSearchParams) => {
    if (shouldUseMockApi()) {
      const data = await mockApi.getCustomerList(params)
      return { data, code: 200, message: 'success', success: true }
    }
    return api.get<CustomerListResponse>(API_ENDPOINTS.CUSTOMERS.SEARCH, params)
  }
}