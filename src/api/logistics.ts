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

// 物流轨迹信息接口
export interface LogisticsTrace {
  time: string
  status: string
  description: string
  location?: string
  operator?: string
  phone?: string
}

// 物流查询结果接口
export interface LogisticsTrackResult {
  success: boolean
  trackingNo: string
  companyCode: string
  companyName: string
  status: string
  statusText: string
  traces: LogisticsTrace[]
  estimatedDeliveryTime?: string
  signedTime?: string
  signedBy?: string
}

export const logisticsApi = {
  /**
   * 查询物流轨迹（调用真实快递API）
   * @param trackingNo 运单号
   * @param companyCode 快递公司代码（可选）
   * @param phone 收件人/寄件人手机号（可选，用于顺丰等需要验证的快递）
   */
  async queryTrace(trackingNo: string, companyCode?: string, phone?: string): Promise<{ success: boolean; data: LogisticsTrackResult; message?: string }> {
    // 🔥 修复：只传递有效的参数，避免传递空字符串或undefined
    const params: Record<string, string> = { trackingNo }

    // 🔥 修复：确保companyCode是字符串类型再调用trim
    if (companyCode && typeof companyCode === 'string' && companyCode.trim()) {
      params.companyCode = companyCode.trim()
    }

    // 🔥 修复：确保phone是字符串类型再调用trim
    if (phone) {
      const phoneStr = String(phone).trim()
      if (phoneStr) {
        params.phone = phoneStr
      }
    }

    return api.get('/logistics/trace/query', params)
  },

  /**
   * 批量查询物流轨迹
   */
  async batchQueryTrace(trackingNos: string[], companyCode?: string): Promise<{ success: boolean; data: LogisticsTrackResult[]; message?: string }> {
    return api.post('/logistics/trace/batch-query', { trackingNos, companyCode })
  },

  /**
   * 刷新物流轨迹（强制从快递API获取最新数据）
   */
  async refreshTrace(trackingNo: string, companyCode?: string): Promise<{ success: boolean; data: LogisticsTrackResult; message?: string }> {
    return api.post('/logistics/trace/refresh', { trackingNo, companyCode })
  },

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
