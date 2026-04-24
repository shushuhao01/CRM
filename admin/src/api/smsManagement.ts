/**
 * 管理后台 - 短信管理 API
 * v1.8.0 阶段3
 */
import request from './request'

// ============ 类型定义 ============
export interface SmsTemplateItem {
  id: number
  shortId?: string
  tenantId?: string
  tenantName?: string
  name: string
  category: string
  content: string
  variables: string[]
  description: string
  applicant: string
  applicantName: string
  applicantDept: string
  status: string
  approvedBy?: string
  approvedAt?: string
  isSystem: boolean
  vendorTemplateCode?: string
  vendorStatus?: string
  vendorSubmitAt?: string
  vendorRejectReason?: string
  adminReviewer?: string
  adminReviewAt?: string
  adminReviewNote?: string
  isPreset: number
  createdAt: string
  updatedAt: string
}

export interface SmsRecordItem {
  id: number
  shortId?: string
  tenantId?: string
  tenantName?: string
  templateId: string
  templateName: string
  content: string
  recipients: any[]
  recipientCount: number
  successCount: number
  failCount: number
  status: string
  applicant: string
  applicantName: string
  sentAt: string
  createdAt: string
}

export interface SmsStatisticsData {
  templateStats: { status: string; count: number }[]
  totalTemplates: number
  presetTemplates: number
  pendingCount: number
  totalRecords: number
  totalSent: number
  todaySent: number
  monthSent: number
  dailyStats: { date: string; count: number }[]
}

export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// ============ API 方法 ============
export const smsManagementApi = {
  // ---- 模板审核 ----
  getTemplateReviewList: (params: {
    status?: string
    keyword?: string
    page?: number
    pageSize?: number
  }) => request.get<PaginatedResult<SmsTemplateItem>>('/sms-management/template-review', { params }),

  reviewTemplate: (id: number, data: {
    action: 'approve' | 'reject' | 'activate'
    note?: string
    vendorTemplateCode?: string
  }) => request.post<SmsTemplateItem>(`/sms-management/template-review/${id}`, data),

  // ---- 模板管理 ----
  getTemplates: (params: {
    keyword?: string
    category?: string
    isPreset?: number | string
    page?: number
    pageSize?: number
  }) => request.get<PaginatedResult<SmsTemplateItem>>('/sms-management/templates', { params }),

  createTemplate: (data: {
    name: string
    category: string
    content: string
    variables?: string[]
    description?: string
    vendorTemplateCode?: string
  }) => request.post<SmsTemplateItem>('/sms-management/templates', data),

  updateTemplate: (id: number, data: Partial<{
    name: string
    category: string
    content: string
    variables: string[]
    description: string
    vendorTemplateCode: string
    status: string
  }>) => request.put<SmsTemplateItem>(`/sms-management/templates/${id}`, data),

  deleteTemplate: (id: number) =>
    request.delete(`/sms-management/templates/${id}`),

  // ---- 发送记录 ----
  getRecords: (params: {
    keyword?: string
    status?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }) => request.get<PaginatedResult<SmsRecordItem>>('/sms-management/records', { params }),

  // ---- 统计 ----
  getStatistics: () =>
    request.get<SmsStatisticsData>('/sms-management/statistics'),
}

