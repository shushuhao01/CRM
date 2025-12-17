import { api } from './request'

// 物流API配置接口
export interface LogisticsApiConfig {
  id?: string
  companyCode: string
  companyName?: string
  appId?: string
  appKey?: string
  appSecret?: string
  customerId?: string
  apiUrl?: string
  apiEnvironment?: 'sandbox' | 'production'
  extraConfig?: Record<string, unknown>
  enabled?: boolean | number
  lastTestTime?: string
  lastTestResult?: number
  lastTestMessage?: string
}

export const logisticsApi = {
  /**
   * 获取所有物流API配置
   */
  async getApiConfigs(): Promise<{ success: boolean; data: LogisticsApiConfig[] }> {
    return api.get('/logistics/api-configs')
  },

  /**
   * 获取指定快递公司的API配置
   */
  async getApiConfig(companyCode: string): Promise<{ success: boolean; data: LogisticsApiConfig }> {
    return api.get(`/logistics/api-configs/${companyCode}`)
  },

  /**
   * 保存物流API配置
   */
  async saveApiConfig(companyCode: string, config: Partial<LogisticsApiConfig>): Promise<{ success: boolean; message: string; data: LogisticsApiConfig }> {
    return api.post(`/logistics/api-configs/${companyCode}`, config)
  },

  /**
   * 测试物流API连接
   */
  async testApiConfig(companyCode: string, config: {
    appId?: string
    appKey?: string
    appSecret?: string
    customerId?: string
    apiUrl?: string
    apiEnvironment?: string
    testTrackingNo?: string
  }): Promise<{ success: boolean; message: string }> {
    return api.post(`/logistics/api-configs/${companyCode}/test`, config)
  },

  /**
   * 获取物流公司列表
   */
  async getCompanies(params?: {
    name?: string
    code?: string
    status?: string
    page?: number
    pageSize?: number
  }): Promise<{ success: boolean; data: { list: any[]; total: number } }> {
    return api.get('/logistics/companies/list', params)
  },

  /**
   * 获取启用的物流公司列表
   */
  async getActiveCompanies(): Promise<{ success: boolean; data: any[] }> {
    return api.get('/logistics/companies/active')
  },

  /**
   * 新增物流公司
   */
  async createCompany(data: any): Promise<{ success: boolean; message: string; data: any }> {
    return api.post('/logistics/companies', data)
  },

  /**
   * 更新物流公司
   */
  async updateCompany(id: string, data: any): Promise<{ success: boolean; message: string; data: any }> {
    return api.put(`/logistics/companies/${id}`, data)
  },

  /**
   * 删除物流公司
   */
  async deleteCompany(id: string): Promise<{ success: boolean; message: string }> {
    return api.delete(`/logistics/companies/${id}`)
  },

  /**
   * 更新物流公司状态
   */
  async updateCompanyStatus(id: string, status: 'active' | 'inactive'): Promise<{ success: boolean; message: string }> {
    return api.patch(`/logistics/companies/${id}/status`, { status })
  }
}

export default logisticsApi
