// 客户相关API服务 - 🔥 全部直接调用真实API，不再使用Mock
import { api } from './request'
import { API_ENDPOINTS } from './config'
import type { Customer } from '@/stores/customer'

// 客户查询参数接口
export interface CustomerSearchParams {
  name?: string
  phone?: string
  keyword?: string  // 🔥 新增：支持关键词搜索（同时搜索姓名和电话）
  level?: string
  dateRange?: [string, string]
  page?: number
  pageSize?: number
}

// 转换搜索参数为请求参数
const toRequestParams = (params?: CustomerSearchParams) => {
  if (!params) return undefined
  const { dateRange, ...rest } = params
  const result: Record<string, string | number | boolean | undefined | null> = { ...rest }
  if (dateRange) {
    result.startDate = dateRange[0]
    result.endDate = dateRange[1]
  }
  return result
}

// 客户列表响应接口
export interface CustomerListResponse {
  list: Customer[]
  total: number
  page: number
  pageSize: number
}

// 客户API服务 - 🔥 所有方法直接调用真实API
export const customerApi = {
  // 获取客户列表 - 直接调用真实API
  getList: async (params?: CustomerSearchParams) => {
    console.log('[customerApi.getList] 直接调用真实API, 参数:', params)
    const requestParams = toRequestParams(params)
    console.log('[customerApi.getList] 转换后参数:', requestParams)
    return api.get<CustomerListResponse>(API_ENDPOINTS.CUSTOMERS.LIST, { params: requestParams })
  },

  // 检查客户是否存在 - 直接调用后端API
  checkExists: async (phone: string) => {
    try {
      console.log('[customerApi.checkExists] 直接调用真实API验证')
      console.log('验证手机号:', phone)

      const response = await api.get<{
        id: string
        name: string
        phone: string
        creatorName: string
        createTime: string
      } | null>('/customers/check-exists', { params: { phone } })

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
    } catch (error) {
      console.error('[customerApi.checkExists] 执行失败:', error)
      return { data: null, code: 500, message: '检查客户存在性失败', success: false }
    }
  },

  // 创建客户 - 直接调用真实API
  create: async (data: Omit<Customer, 'id' | 'createTime' | 'orderCount'>) => {
    console.log('[customerApi.create] 直接调用真实API')
    console.log('请求数据:', data)
    console.log('API端点:', API_ENDPOINTS.CUSTOMERS.CREATE)

    const result = await api.post<Customer>(API_ENDPOINTS.CUSTOMERS.CREATE, data)

    console.log('API响应结果:', result)
    return result
  },

  // 更新客户 - 直接调用真实API
  update: async (id: string, data: Partial<Customer>) => {
    console.log('[customerApi.update] 直接调用真实API')
    return api.put<Customer>(API_ENDPOINTS.CUSTOMERS.UPDATE(id), data)
  },

  // 删除客户 - 直接调用真实API
  delete: async (id: string) => {
    console.log('[customerApi.delete] 直接调用真实API')
    return api.delete(API_ENDPOINTS.CUSTOMERS.DELETE(id))
  },

  // 获取客户详情 - 直接调用真实API
  getDetail: async (id: string) => {
    console.log('[customerApi.getDetail] 直接调用真实API')
    return api.get<Customer>(API_ENDPOINTS.CUSTOMERS.DETAIL(id))
  },

  // 搜索客户 - 直接调用真实API
  search: async (params: CustomerSearchParams) => {
    console.log('[customerApi.search] 直接调用真实API')
    return api.get<CustomerListResponse>(API_ENDPOINTS.CUSTOMERS.SEARCH, { params: toRequestParams(params) })
  }
}
