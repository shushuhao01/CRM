import { request } from './request'

// ==================== 类型定义 ====================

// 短信模板接口
export interface SmsTemplate {
  id: string | number
  name: string
  category?: string
  content: string
  type?: string
  variables?: string[]
  description?: string
  applicant?: string
  applicantName?: string
  applicantDept?: string
  createdAt?: string
  createTime?: string
  updateTime?: string
  creator?: string
  status: 'pending_admin' | 'pending_vendor' | 'active' | 'rejected' | 'withdrawn' | 'deleted' | 'pending' | 'approved' | 'inactive'
  approvedBy?: string
  approvedAt?: string
  isSystem?: boolean
  isPreset?: number
  usage?: number
  // v1.8.0 新增字段
  vendorTemplateCode?: string
  vendorStatus?: string
  vendorSubmitAt?: string
  vendorRejectReason?: string
  adminReviewer?: string
  adminReviewAt?: string
  adminReviewNote?: string
}

// 模板变量文档接口
export interface SmsTemplateVariable {
  name: string
  label: string
  example: string
  category: string
  description: string
}

// 短信申请接口
export interface SmsRequest {
  id: string
  templateId: string
  templateName: string
  content: string
  recipients: string[]
  recipientCount: number
  applicant: string
  applicantName: string
  applicantDept: string
  createdAt: string
  status: 'pending' | 'approved' | 'rejected' | 'sent'
  remark?: string
  approvedBy?: string
  approvedAt?: string
}

// 短信审核记录接口 - mock.ts需要
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
  recipients?: string[]
}

// 短信发送记录接口 - mock.ts需要
export interface SmsSendRecord {
  id: number
  templateId: number
  templateName: string
  content: string
  recipients: string[]
  successCount: number
  failCount: number
  status: 'success' | 'failed' | 'partial'
  sendTime: string
  operator: string
  cost: number
}

// 发送记录接口
export interface SendRecord {
  id: string | number
  templateName: string
  content: string
  recipientCount: number
  successCount: number
  failCount: number
  status: 'sending' | 'completed' | 'failed' | 'pending'
  sentAt: string
  sendDetails?: SendDetail[]
}

export interface SendDetail {
  phone: string
  status: 'success' | 'failed'
  sentAt: string
  errorMsg?: string
}

// 统计数据接口
export interface SmsStatistics {
  pendingTemplates: number
  pendingSms: number
  todaySent: number
  totalSent: number
}

// 搜索参数接口 - mock.ts需要
export interface SmsTemplateSearchParams {
  keyword?: string
  type?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface SmsApprovalSearchParams {
  keyword?: string
  status?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface SmsSendSearchParams {
  keyword?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

// 列表响应接口 - mock.ts需要
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

// ==================== API函数 ====================

/**
 * 获取模板列表
 * GET /api/v1/sms/templates
 */
export function getTemplates(params?: {
  status?: string
  category?: string
  keyword?: string
}) {
  return request('/sms/templates', {
    method: 'GET',
    params
  })
}

/**
 * 获取可用模板列表（active + 预设模板）
 * CRM端模板详情页 Tab1 使用
 * GET /api/v1/sms/templates/available
 */
export function getAvailableTemplates() {
  return request('/sms/templates/available', {
    method: 'GET'
  })
}

/**
 * 获取我的模板申请列表
 * CRM端模板详情页 Tab2 使用
 * GET /api/v1/sms/templates/my-applications
 */
export function getMyApplications(params?: { status?: string }) {
  return request('/sms/templates/my-applications', {
    method: 'GET',
    params
  })
}

/**
 * 申请短信模板（提交到管理后台审核）
 * POST /api/v1/sms/templates/apply
 */
export function applyTemplate(data: Partial<SmsTemplate>) {
  return request('/sms/templates/apply', {
    method: 'POST',
    data
  })
}

/**
 * 撤销模板申请（仅 pending_admin 状态可撤销）
 * POST /api/v1/sms/templates/:id/withdraw
 */
export function withdrawTemplate(id: string | number) {
  return request(`/sms/templates/${id}/withdraw`, {
    method: 'POST'
  })
}

/**
 * 删除已拒绝/已撤销的模板申请
 * DELETE /api/v1/sms/templates/:id
 */
export function deleteTemplate(id: string | number) {
  return request(`/sms/templates/${id}`, {
    method: 'DELETE'
  })
}

/**
 * 创建模板（旧版兼容）
 * POST /api/v1/sms/templates/apply
 */
export function createTemplate(data: Partial<SmsTemplate>) {
  return request('/sms/templates/apply', {
    method: 'POST',
    data
  })
}

/**
 * 审核模板（租户管理员 — 保留兼容）
 * POST /api/v1/sms/templates/:id/approve
 */
export function approveTemplate(id: string | number, data: { approved: boolean; reason?: string }) {
  return request(`/sms/templates/${id}/approve`, {
    method: 'POST',
    data
  })
}

/**
 * 获取短信发送记录
 * GET /api/v1/sms/records
 */
export function getSendRecords(params?: {
  page?: number
  pageSize?: number
  status?: string
  startDate?: string
  endDate?: string
  keyword?: string
}) {
  return request('/sms/records', {
    method: 'GET',
    params
  })
}

/**
 * 发送短信
 * POST /api/v1/sms/send
 */
export function sendSms(data: {
  templateId?: string
  templateName?: string
  recipients: string[] | { name: string; phone: string }[]
  content: string
}) {
  return request('/sms/send', {
    method: 'POST',
    data
  })
}

/**
 * 获取统计数据
 * GET /api/v1/sms/statistics
 */
export function getStatistics() {
  return request('/sms/statistics', {
    method: 'GET'
  })
}

/**
 * 获取短信模板变量文档
 * GET /api/v1/sms/variable-docs
 */
export function getVariableDocs(): Promise<{ code: number; data: { variables: SmsTemplateVariable[] } }> {
  return request('/sms/variable-docs', {
    method: 'GET'
  }) as any
}

// ==================== 兼容旧组件的API函数 ====================

/**
 * 获取短信申请列表（兼容旧版）
 * GET /api/v1/sms/records
 */
export function getSmsRequests(params?: {
  status?: string
  keyword?: string
}) {
  return request('/sms/records', {
    method: 'GET',
    params
  })
}

/**
 * 创建短信申请（兼容旧版，实际调用发送接口）
 * POST /api/v1/sms/send
 */
export function createSmsRequest(data: Partial<SmsRequest>) {
  return request('/sms/send', {
    method: 'POST',
    data
  })
}

/**
 * 审核短信发送请求
 * POST /api/v1/sms/templates/:id/approve
 */
export function approveSms(id: string | number, data: { approved: boolean; reason?: string }) {
  return request(`/sms/templates/${id}/approve`, {
    method: 'POST',
    data
  })
}

/**
 * 获取短信发送列表（兼容SmsSendRecords.vue）
 * GET /api/v1/sms/records
 */
export function getSmsSendList(params?: SmsSendSearchParams): Promise<SmsSendListResponse> {
  return request('/sms/records', {
    method: 'GET',
    params: params as any
  }) as any
}

/**
 * 获取短信模板列表（兼容SmsSendRecords.vue）
 * GET /api/v1/sms/templates
 */
export function getSmsTemplateList(params?: SmsTemplateSearchParams): Promise<SmsTemplateListResponse> {
  return request('/sms/templates', {
    method: 'GET',
    params: params as any
  }) as any
}

/**
 * 获取短信统计数据（兼容SmsStatistics.vue）
 * GET /api/v1/sms/statistics
 */
export function getSmsStatistics(): Promise<{
  totalSent: number
  todaySent: number
  successRate: number
  totalCost: number
  pendingApprovals: number
  activeTemplates: number
}> {
  return request('/sms/statistics', {
    method: 'GET'
  }) as any
}

/**
 * 获取短信趋势数据（兼容SmsStatistics.vue）
 * GET /api/v1/sms/statistics
 */
export function getSmsTrend(params?: { days?: number }): Promise<{
  dates: string[]
  sent: number[]
  success: number[]
  failed: number[]
}> {
  return request('/sms/statistics', {
    method: 'GET',
    params
  }) as any
}

/**
 * 获取预设模板（兼容旧版）
 * GET /api/v1/sms/templates/available
 */
export function getPresetTemplates() {
  return request('/sms/templates/available', {
    method: 'GET'
  })
}

// ==================== 短信额度相关 API ====================

/** 获取当前租户短信额度信息 */
export function getSmsQuota() {
  return request('/sms/quota', { method: 'GET' })
}

/** 获取可用额度套餐列表 */
export function getSmsQuotaPackages() {
  return request('/sms/quota/packages', { method: 'GET' })
}

/** 创建额度购买订单 */
export function createSmsQuotaOrder(data: { packageId: string; payType: string }) {
  return request('/sms/quota/purchase', { method: 'POST', data })
}

/** 查询额度订单支付状态 */
export function querySmsQuotaOrder(orderNo: string) {
  return request(`/sms/quota/order/${orderNo}`, { method: 'GET' })
}

/** 模拟支付（开发调试用） */
export function simulateSmsQuotaPay(orderNo: string) {
  return request(`/sms/quota/simulate-pay/${orderNo}`, { method: 'POST' })
}

/** 获取额度购买账单记录 */
export function getSmsQuotaBills(params?: { page?: number; pageSize?: number }) {
  return request('/sms/quota/bills', { method: 'GET', params })
}

/** 取消未支付的额度订单 */
export function cancelSmsQuotaOrder(orderNo: string) {
  return request(`/sms/quota/order/${orderNo}/cancel`, { method: 'POST' })
}

// ==================== 客户搜索（发短信用，按数据范围过滤）====================

/** 搜索可发短信的客户（按用户角色数据范围过滤） */
export function searchSmsCustomers(params?: { keyword?: string; page?: number; pageSize?: number }) {
  return request('/sms/customers/search', { method: 'GET', params })
}

// ==================== 自动发送规则 API ====================

/** 获取触发事件类型列表 */
export function getAutoSendTriggerEvents() {
  return request('/sms/auto-send/trigger-events', { method: 'GET' })
}

/** 获取自动发送规则列表 */
export function getAutoSendRules(params?: { page?: number; pageSize?: number; enabled?: number; triggerEvent?: string }) {
  return request('/sms/auto-send/rules', { method: 'GET', params })
}

/** 创建自动发送规则 */
export function createAutoSendRule(data: {
  name: string
  templateId: string
  triggerEvent: string
  effectiveDepartments?: string[]
  timeRangeConfig?: {
    workdaysOnly?: boolean
    startHour?: number
    endHour?: number
    sendImmediately?: boolean
  }
  description?: string
}) {
  return request('/sms/auto-send/rules', { method: 'POST', data })
}

/** 更新自动发送规则 */
export function updateAutoSendRule(id: string, data: Record<string, unknown>) {
  return request(`/sms/auto-send/rules/${id}`, { method: 'PUT', data })
}

/** 删除自动发送规则 */
export function deleteAutoSendRule(id: string) {
  return request(`/sms/auto-send/rules/${id}`, { method: 'DELETE' })
}

/** 切换自动发送规则启用/禁用 */
export function toggleAutoSendRule(id: string) {
  return request(`/sms/auto-send/rules/${id}/toggle`, { method: 'PATCH' })
}

/** 获取自动发送规则详情 */
export function getAutoSendRuleDetail(id: string) {
  return request(`/sms/auto-send/rules/${id}`, { method: 'GET' })
}

/** 🔥 v1.8.1 新增：获取自动发送规则的发送记录 */
export function getAutoSendRuleRecords(id: string, params?: { page?: number; pageSize?: number; keyword?: string }) {
  return request(`/sms/auto-send/rules/${id}/records`, { method: 'GET', params })
}

