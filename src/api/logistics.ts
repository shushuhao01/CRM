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
  supportCreateOrder?: boolean | number  // 是否支持下单生成运单号: 0/false=仅查询, 1/true=支持下单
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
   * @param senderPhone 寄件人手机号（可选，双保险备用）
   */
  async queryTrace(trackingNo: string, companyCode?: string, phone?: string, senderPhone?: string): Promise<{ success: boolean; data: LogisticsTrackResult; message?: string }> {
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

    // 🔥 双保险：传递寄件人手机号
    if (senderPhone) {
      const senderPhoneStr = String(senderPhone).trim()
      if (senderPhoneStr) {
        params.senderPhone = senderPhoneStr
      }
    }

    // 🔥 修复：api.get 需要 { params: {...} } 格式
    return api.get('/logistics/trace/query', { params })
  },

  /**
   * 批量查询物流轨迹（增强版）
   * @param orders 订单列表，包含 trackingNo, companyCode, phone 等信息
   */
  async batchQueryTrace(orders: Array<{ trackingNo: string; companyCode?: string; phone?: string }>): Promise<{ success: boolean; data: LogisticsTrackResult[]; message?: string }> {
    return api.post('/logistics/trace/batch-query', { orders })
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
    return api.get('/logistics/companies/list', { params })
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
  },

  /**
   * 检查物流公司是否支持自动生成运单号（下单API）
   * @param companyCode 物流公司代码
   * @returns 是否支持以及原因
   */
  async checkCreateOrderSupport(companyCode: string): Promise<{
    success: boolean
    supported: boolean
    reason?: string
    companyName?: string
  }> {
    try {
      let configRes: any
      try {
        configRes = await this.getApiConfig(companyCode)
      } catch (apiErr: any) {
        // HTTP 404 或 500 等错误 - 视为未配置
        const status = apiErr?.response?.status
        // 🔥 优先取服务端返回的友好提示
        const serverMsg = apiErr?.response?.data?.message
        if (status === 404 || status === 500) {
          return {
            success: true,
            supported: false,
            reason: serverMsg || `${companyCode} 的物流API暂不可用，请手动输入运单号`,
            companyName: companyCode
          }
        }
        throw apiErr
      }
      if (!configRes?.success || !configRes?.data) {
        // 🔥 使用服务端返回的友好提示（如果有）
        const serverMsg = configRes?.message || ''
        // 检查是否是数据库字段缺失等技术性错误，转换为用户友好的提示
        const isDbError = serverMsg.includes('Unknown column') || serverMsg.includes('数据库')
        const userMsg = isDbError
          ? `${companyCode} 的物流API配置数据库需要更新，自动生成运单号暂不可用，请手动输入运单号`
          : (serverMsg || `${companyCode} 暂不支持自动生成运单号，请手动输入运单号`)
        return {
          success: true,
          supported: false,
          reason: userMsg,
          companyName: companyCode
        }
      }
      const config = configRes.data
      const companyName = config.companyName || companyCode

      if (!config.enabled) {
        return {
          success: true,
          supported: false,
          reason: `${companyName} 的物流API已禁用，请在系统设置中启用后再试`,
          companyName
        }
      }

      if (!config.supportCreateOrder) {
        return {
          success: true,
          supported: false,
          reason: `${companyName} 暂不支持自动生成运单号，请手动输入运单号`,
          companyName
        }
      }

      // 检查必要的API密钥是否配置
      if (!config.appKey && !config.appId) {
        return {
          success: true,
          supported: false,
          reason: `${companyName} 的物流API密钥未配置，请在系统设置中配置AppKey/AppId后再试`,
          companyName
        }
      }

      return { success: true, supported: true, companyName }
    } catch (error: any) {
      // 🔥 将技术性错误转换为用户友好的提示
      const rawMsg = error?.message || '网络错误'
      const isDbError = rawMsg.includes('Unknown column') || rawMsg.includes('field list')
      const userMsg = isDbError
        ? `${companyCode} 的物流API配置数据库需要更新，请手动输入运单号`
        : `检查 ${companyCode} 物流API配置时出错，请手动输入运单号`
      return {
        success: false,
        supported: false,
        reason: userMsg,
        companyName: companyCode
      }
    }
  },

  /**
   * 调用物流公司API创建订单/生成运单号
   * @param companyCode 物流公司代码
   * @param orderData 订单数据
   */
  async createOrder(companyCode: string, orderData: {
    orderNo: string
    senderName?: string
    senderPhone?: string
    senderAddress?: string
    receiverName: string
    receiverPhone: string
    receiverAddress: string
    weight?: number
    remark?: string
  }): Promise<{ success: boolean; trackingNumber?: string; message?: string }> {
    return api.post('/logistics/create-order', { companyCode, ...orderData })
  },

  /**
   * 导出全部物流公司数据（含API配置和快递100配置）
   */
  async exportCompanies(): Promise<{ success: boolean; data: any }> {
    return api.get('/logistics/companies/export')
  },

  /**
   * 导入物流公司数据（重复的按code覆盖）
   */
  async importCompanies(data: {
    companies: any[]
    apiConfigs?: any[]
    kuaidi100Config?: any
  }): Promise<{ success: boolean; message: string; data: any }> {
    return api.post('/logistics/companies/import', data)
  }
}

export default logisticsApi
