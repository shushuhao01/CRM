// 短信相关API服务
import { api } from './request'
import { API_ENDPOINTS } from './config'
import { mockApi, shouldUseMockApi } from './mock'

// 短信模板接口
export interface SmsTemplate {
  id: number
  name: string
  content: string
  type: 'marketing' | 'notification' | 'verification' | 'service'
  variables: string[]
  status: 'active' | 'inactive'
  createTime: string
  updateTime: string
  creator: string
  usage: number
}

// 短信审核记录接口
export interface SmsApprovalRecord {
  id: number
  applicant: string
  department: string
  templateId: number
  templateName: string
  recipientCount: number
  content: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  applyTime: string
  approveTime?: string
  approver?: string
  approveRemark?: string
  recipients: string[]
}

// 短信发送记录接口
export interface SmsSendRecord {
  id: number
  templateId: number
  templateName: string
  content: string
  recipients: string[]
  successCount: number
  failCount: number
  status: 'sending' | 'success' | 'failed' | 'partial'
  sendTime: string
  operator: string
  cost: number
}

// 短信统计接口
export interface SmsStatistics {
  totalSent: number
  successRate: number
  totalCost: number
  monthlyUsage: number
  dailyUsage: number
  templateUsage: { templateName: string; count: number }[]
  trendData: { date: string; count: number; cost: number }[]
}

// 查询参数接口
export interface SmsTemplateSearchParams {
  name?: string
  type?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface SmsApprovalSearchParams {
  applicant?: string
  status?: string
  dateRange?: [string, string]
  page?: number
  pageSize?: number
}

export interface SmsSendSearchParams {
  templateName?: string
  status?: string
  dateRange?: [string, string]
  page?: number
  pageSize?: number
}

// 响应接口
export interface SmsTemplateListResponse {
  list: SmsTemplate[]
  total: number
  page: number
  pageSize: number
}

export interface SmsApprovalListResponse {
  list: SmsApprovalRecord[]
  total: number
  page: number
  pageSize: number
}

export interface SmsSendListResponse {
  list: SmsSendRecord[]
  total: number
  page: number
  pageSize: number
}

// 短信模板API
export const smsTemplateApi = {
  // 获取模板列表
  getList: async (params?: SmsTemplateSearchParams) => {
    if (shouldUseMockApi()) {
      const data = await mockApi.getSmsTemplateList(params)
      return { data, code: 200, message: 'success', success: true }
    }
    return api.get<SmsTemplateListResponse>(API_ENDPOINTS.SMS.TEMPLATES, params)
  },

  // 获取模板详情
  getDetail: async (id: number) => {
    if (shouldUseMockApi()) {
      const data = await mockApi.getSmsTemplateDetail(id)
      return { data, code: 200, message: 'success', success: true }
    }
    return api.get<SmsTemplate>(`${API_ENDPOINTS.SMS.TEMPLATES}/${id}`)
  },

  // 创建模板
  create: async (data: Omit<SmsTemplate, 'id' | 'createTime' | 'updateTime' | 'usage'>) => {
    if (shouldUseMockApi()) {
      const result = await mockApi.createSmsTemplate(data)
      return { data: result, code: 200, message: 'success', success: true }
    }
    return api.post<SmsTemplate>(API_ENDPOINTS.SMS.TEMPLATES, data)
  },

  // 更新模板
  update: async (id: number, data: Partial<SmsTemplate>) => {
    if (shouldUseMockApi()) {
      const result = await mockApi.updateSmsTemplate(id, data)
      return { data: result, code: 200, message: 'success', success: true }
    }
    return api.put<SmsTemplate>(`${API_ENDPOINTS.SMS.TEMPLATES}/${id}`, data)
  },

  // 删除模板
  delete: async (id: number) => {
    if (shouldUseMockApi()) {
      await mockApi.deleteSmsTemplate(id)
      return { data: null, code: 200, message: 'success', success: true }
    }
    return api.delete(`${API_ENDPOINTS.SMS.TEMPLATES}/${id}`)
  },

  // 预览模板
  preview: async (content: string, variables: Record<string, string>) => {
    if (shouldUseMockApi()) {
      const result = await mockApi.previewSmsTemplate(content, variables)
      return { data: result, code: 200, message: 'success', success: true }
    }
    return api.post<string>(`${API_ENDPOINTS.SMS.TEMPLATES}/preview`, { content, variables })
  }
}

// 短信审核API
export const smsApprovalApi = {
  // 获取审核列表
  getList: async (params?: SmsApprovalSearchParams) => {
    if (shouldUseMockApi()) {
      const data = await mockApi.getSmsApprovalList(params)
      return { data, code: 200, message: 'success', success: true }
    }
    return api.get<SmsApprovalListResponse>(API_ENDPOINTS.SMS.APPROVALS, params)
  },

  // 获取审核详情
  getDetail: async (id: number) => {
    if (shouldUseMockApi()) {
      const data = await mockApi.getSmsApprovalDetail(id)
      return { data, code: 200, message: 'success', success: true }
    }
    return api.get<SmsApprovalRecord>(`${API_ENDPOINTS.SMS.APPROVALS}/${id}`)
  },

  // 提交审核申请
  submit: async (data: {
    templateId: number
    recipients: string[]
    reason: string
    variables?: Record<string, string>
  }) => {
    if (shouldUseMockApi()) {
      const result = await mockApi.submitSmsApproval(data)
      return { data: result, code: 200, message: 'success', success: true }
    }
    return api.post<SmsApprovalRecord>(API_ENDPOINTS.SMS.APPROVALS, data)
  },

  // 审核通过
  approve: async (id: number, remark?: string) => {
    if (shouldUseMockApi()) {
      const result = await mockApi.approveSms(id, remark)
      return { data: result, code: 200, message: 'success', success: true }
    }
    return api.post(`${API_ENDPOINTS.SMS.APPROVALS}/${id}/approve`, { remark })
  },

  // 审核拒绝
  reject: async (id: number, remark: string) => {
    if (shouldUseMockApi()) {
      const result = await mockApi.rejectSms(id, remark)
      return { data: result, code: 200, message: 'success', success: true }
    }
    return api.post(`${API_ENDPOINTS.SMS.APPROVALS}/${id}/reject`, { remark })
  },

  // 批量审核
  batchApprove: async (ids: number[], action: 'approve' | 'reject', remark?: string) => {
    if (shouldUseMockApi()) {
      const result = await mockApi.batchApproveSms(ids, action, remark)
      return { data: result, code: 200, message: 'success', success: true }
    }
    return api.post(`${API_ENDPOINTS.SMS.APPROVALS}/batch`, { ids, action, remark })
  }
}

// 短信发送API
export const smsSendApi = {
  // 获取发送记录列表
  getList: async (params?: SmsSendSearchParams) => {
    if (shouldUseMockApi()) {
      const data = await mockApi.getSmsSendList(params)
      return { data, code: 200, message: 'success', success: true }
    }
    return api.get<SmsSendListResponse>(API_ENDPOINTS.SMS.SENDS, params)
  },

  // 获取发送详情
  getDetail: async (id: number) => {
    if (shouldUseMockApi()) {
      const data = await mockApi.getSmsSendDetail(id)
      return { data, code: 200, message: 'success', success: true }
    }
    return api.get<SmsSendRecord>(`${API_ENDPOINTS.SMS.SENDS}/${id}`)
  },

  // 直接发送短信
  send: async (data: {
    templateId: number
    recipients: string[]
    variables?: Record<string, string>
  }) => {
    if (shouldUseMockApi()) {
      const result = await mockApi.sendSms(data)
      return { data: result, code: 200, message: 'success', success: true }
    }
    return api.post<SmsSendRecord>(API_ENDPOINTS.SMS.SENDS, data)
  },

  // 测试发送
  test: async (phone: string, content: string) => {
    if (shouldUseMockApi()) {
      const result = await mockApi.testSms(phone, content)
      return { data: result, code: 200, message: 'success', success: true }
    }
    return api.post(`${API_ENDPOINTS.SMS.SENDS}/test`, { phone, content })
  }
}

// 短信统计API
export const smsStatisticsApi = {
  // 获取统计数据
  getStatistics: async (dateRange?: [string, string]) => {
    if (shouldUseMockApi()) {
      const data = await mockApi.getSmsStatistics(dateRange)
      return { data, code: 200, message: 'success', success: true }
    }
    return api.get<SmsStatistics>(API_ENDPOINTS.SMS.STATISTICS, { dateRange })
  },

  // 获取使用趋势
  getTrend: async (dateRange: [string, string], type: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    if (shouldUseMockApi()) {
      const data = await mockApi.getSmsTrend(dateRange, type)
      return { data, code: 200, message: 'success', success: true }
    }
    return api.get(`${API_ENDPOINTS.SMS.STATISTICS}/trend`, { dateRange, type })
  }
}

// 导出所有短信API
export const smsApi = {
  template: smsTemplateApi,
  approval: smsApprovalApi,
  send: smsSendApi,
  statistics: smsStatisticsApi
}