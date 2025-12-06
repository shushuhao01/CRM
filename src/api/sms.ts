import { request } from './request'
import { isProduction } from '@/utils/env'

// 检查是否使用Mock API - 生产环境强制使用真实API
const shouldUseMockApi = (): boolean => {
  // 生产环境强制使用真实API
  if (isProduction()) return false
  const mockEnabled = localStorage.getItem('erp_mock_enabled')
  if (mockEnabled === 'true') return true
  if (mockEnabled === 'false') return false
  return import.meta.env.DEV
}

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
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive'
  approvedBy?: string
  approvedAt?: string
  isSystem?: boolean
  usage?: number
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
  id: string
  templateName: string
  content: string
  recipientCount: number
  successCount: number
  failCount: number
  status: 'sending' | 'completed' | 'failed'
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

// 预设模板数据(系统模板)
const PRESET_TEMPLATES: SmsTemplate[] = [
  {
    id: 'preset-1',
    name: '订单确认通知',
    category: 'order',
    content: '尊敬的{customerName}，您的订单{orderNo}已确认，订单金额{amount}元，预计{deliveryTime}送达。如有疑问请联系客服。',
    variables: ['{customerName}', '{orderNo}', '{amount}', '{deliveryTime}'],
    description: '订单创建后自动发送确认通知',
    applicant: 'system',
    applicantName: '系统',
    applicantDept: '系统',
    createdAt: '2024-01-01 00:00:00',
    status: 'approved',
    approvedBy: '系统管理员',
    approvedAt: '2024-01-01 00:00:00',
    isSystem: true
  },
  {
    id: 'preset-2',
    name: '发货通知',
    category: 'logistics',
    content: '您的订单{orderNo}已发货，快递公司：{expressCompany}，快递单号：{trackingNo}，请注意查收。',
    variables: ['{orderNo}', '{expressCompany}', '{trackingNo}'],
    description: '订单发货后通知客户',
    applicant: 'system',
    applicantName: '系统',
    applicantDept: '系统',
    createdAt: '2024-01-01 00:00:00',
    status: 'approved',
    approvedBy: '系统管理员',
    approvedAt: '2024-01-01 00:00:00',
    isSystem: true
  },
  {
    id: 'preset-3',
    name: '签收提醒',
    category: 'logistics',
    content: '您的订单{orderNo}已签收，感谢您的购买！如有问题请及时联系我们，祝您生活愉快！',
    variables: ['{orderNo}'],
    description: '订单签收后发送感谢短信',
    applicant: 'system',
    applicantName: '系统',
    applicantDept: '系统',
    createdAt: '2024-01-01 00:00:00',
    status: 'approved',
    approvedBy: '系统管理员',
    approvedAt: '2024-01-01 00:00:00',
    isSystem: true
  },
  {
    id: 'preset-4',
    name: '付款提醒',
    category: 'reminder',
    content: '尊敬的{customerName}，您的订单{orderNo}还有{amount}元未付款，请及时处理以免影响发货。',
    variables: ['{customerName}', '{orderNo}', '{amount}'],
    description: '订单未付款提醒',
    applicant: 'system',
    applicantName: '系统',
    applicantDept: '系统',
    createdAt: '2024-01-01 00:00:00',
    status: 'approved',
    approvedBy: '系统管理员',
    approvedAt: '2024-01-01 00:00:00',
    isSystem: true
  },
  {
    id: 'preset-5',
    name: '客户生日祝福',
    category: 'marketing',
    content: '亲爱的{customerName}，祝您生日快乐！感谢一直以来的支持，专属生日礼品等您领取，祝您生活幸福美满！',
    variables: ['{customerName}'],
    description: '会员生日当天发送祝福',
    applicant: 'system',
    applicantName: '系统',
    applicantDept: '系统',
    createdAt: '2024-01-01 00:00:00',
    status: 'approved',
    approvedBy: '系统管理员',
    approvedAt: '2024-01-01 00:00:00',
    isSystem: true
  },
  {
    id: 'preset-6',
    name: '促销活动通知',
    category: 'marketing',
    content: '{activityName}火热进行中！{activityContent}，活动时间：{startTime}至{endTime}，机会难得，不容错过！',
    variables: ['{activityName}', '{activityContent}', '{startTime}', '{endTime}'],
    description: '促销活动推广通知',
    applicant: 'system',
    applicantName: '系统',
    applicantDept: '系统',
    createdAt: '2024-01-01 00:00:00',
    status: 'approved',
    approvedBy: '系统管理员',
    approvedAt: '2024-01-01 00:00:00',
    isSystem: true
  },
  {
    id: 'preset-7',
    name: '订单状态更新',
    category: 'order',
    content: '您的订单{orderNo}状态已更新为：{status}。如有疑问请联系客服，我们将竭诚为您服务。',
    variables: ['{orderNo}', '{status}'],
    description: '订单状态变更通知',
    applicant: 'system',
    applicantName: '系统',
    applicantDept: '系统',
    createdAt: '2024-01-01 00:00:00',
    status: 'approved',
    approvedBy: '系统管理员',
    approvedAt: '2024-01-01 00:00:00',
    isSystem: true
  },
  {
    id: 'preset-8',
    name: '售后服务提醒',
    category: 'service',
    content: '尊敬的{customerName}，您的售后工单{ticketNo}已处理完成，处理结果：{result}。感谢您的理解与支持！',
    variables: ['{customerName}', '{ticketNo}', '{result}'],
    description: '售后工单处理完成通知',
    applicant: 'system',
    applicantName: '系统',
    applicantDept: '系统',
    createdAt: '2024-01-01 00:00:00',
    status: 'approved',
    approvedBy: '系统管理员',
    approvedAt: '2024-01-01 00:00:00',
    isSystem: true
  },
  {
    id: 'preset-9',
    name: '客户回访邀请',
    category: 'service',
    content: '尊敬的{customerName}，感谢您购买我们的产品。为了提供更好的服务，诚邀您参与满意度调查，您的意见对我们很重要！',
    variables: ['{customerName}'],
    description: '购买后回访邀请',
    applicant: 'system',
    applicantName: '系统',
    applicantDept: '系统',
    createdAt: '2024-01-01 00:00:00',
    status: 'approved',
    approvedBy: '系统管理员',
    approvedAt: '2024-01-01 00:00:00',
    isSystem: true
  },
  {
    id: 'preset-10',
    name: '账户余额提醒',
    category: 'reminder',
    content: '尊敬的{customerName}，您的账户余额不足{balance}元，为避免影响正常使用，请及时充值。',
    variables: ['{customerName}', '{balance}'],
    description: '账户余额不足提醒',
    applicant: 'system',
    applicantName: '系统',
    applicantDept: '系统',
    createdAt: '2024-01-01 00:00:00',
    status: 'approved',
    approvedBy: '系统管理员',
    approvedAt: '2024-01-01 00:00:00',
    isSystem: true
  }
]

// Mock数据生成函数
function generateMockTemplates(): SmsTemplate[] {
  const stored = localStorage.getItem('crm_sms_templates')
  if (stored) {
    const templates = JSON.parse(stored)
    // 确保预设模板存在
    const presetIds = PRESET_TEMPLATES.map(t => t.id)
    const hasAllPresets = presetIds.every(id => templates.some((t: SmsTemplate) => t.id === id))
    if (!hasAllPresets) {
      // 合并预设模板
      const userTemplates = templates.filter((t: SmsTemplate) => !t.isSystem)
      const merged = [...PRESET_TEMPLATES, ...userTemplates]
      localStorage.setItem('crm_sms_templates', JSON.stringify(merged))
      return merged
    }
    return templates
  }
  localStorage.setItem('crm_sms_templates', JSON.stringify(PRESET_TEMPLATES))
  return PRESET_TEMPLATES
}

function generateMockSmsRequests(): SmsRequest[] {
  const stored = localStorage.getItem('crm_sms_requests')
  return stored ? JSON.parse(stored) : []
}

function generateMockSendRecords(): SendRecord[] {
  const stored = localStorage.getItem('crm_send_records')
  return stored ? JSON.parse(stored) : []
}

// API函数

// 获取模板列表
export function getTemplates(params?: {
  status?: string
  category?: string
  keyword?: string
}) {
  if (shouldUseMockApi()) {
    return Promise.resolve({
      code: 200,
      data: {
        templates: generateMockTemplates().filter(t => {
          if (params?.status && t.status !== params.status) return false
          if (params?.category && t.category !== params.category) return false
          if (params?.keyword) {
            const keyword = params.keyword.toLowerCase()
            return t.name.toLowerCase().includes(keyword) ||
                   t.content.toLowerCase().includes(keyword)
          }
          return true
        })
      },
      message: '获取成功'
    })
  }

  return request({
    url: '/api/sms/templates',
    method: 'get',
    params
  })
}

// 获取短信申请列表
export function getSmsRequests(params?: {
  status?: string
  keyword?: string
}) {
  if (shouldUseMockApi()) {
    return Promise.resolve({
      code: 200,
      data: {
        requests: generateMockSmsRequests().filter(r => {
          if (params?.status && r.status !== params.status) return false
          if (params?.keyword) {
            const keyword = params.keyword.toLowerCase()
            return r.templateName.toLowerCase().includes(keyword) ||
                   r.content.toLowerCase().includes(keyword)
          }
          return true
        })
      },
      message: '获取成功'
    })
  }

  return request({
    url: '/api/sms/requests',
    method: 'get',
    params
  })
}

// 获取发送记录
export function getSendRecords(params?: {
  startDate?: string
  endDate?: string
  keyword?: string
}) {
  if (shouldUseMockApi()) {
    return Promise.resolve({
      code: 200,
      data: {
        records: generateMockSendRecords().filter(r => {
          if (params?.keyword) {
            const keyword = params.keyword.toLowerCase()
            return r.templateName.toLowerCase().includes(keyword) ||
                   r.content.toLowerCase().includes(keyword)
          }
          return true
        })
      },
      message: '获取成功'
    })
  }

  return request({
    url: '/api/sms/records',
    method: 'get',
    params
  })
}

// 获取统计数据
export function getStatistics() {
  if (shouldUseMockApi()) {
    const templates = generateMockTemplates()
    const requests = generateMockSmsRequests()
    const records = generateMockSendRecords()

    const today = new Date().toDateString()
    const todayRecords = records.filter(r =>
      new Date(r.sentAt).toDateString() === today
    )

    return Promise.resolve({
      code: 200,
      data: {
        pendingTemplates: templates.filter(t => t.status === 'pending' && !t.isSystem).length,
        pendingSms: requests.filter(r => r.status === 'pending').length,
        todaySent: todayRecords.reduce((sum, r) => sum + r.successCount, 0),
        totalSent: records.reduce((sum, r) => sum + r.successCount, 0)
      },
      message: '获取成功'
    })
  }

  return request({
    url: '/api/sms/statistics',
    method: 'get'
  })
}

// 审核模板
export function approveTemplate(id: string, data: { approved: boolean; reason?: string }) {
  if (shouldUseMockApi()) {
    const templates = generateMockTemplates()
    const index = templates.findIndex(t => t.id === id)
    if (index !== -1) {
      templates[index].status = data.approved ? 'approved' : 'rejected'
      templates[index].approvedBy = '管理员'
      templates[index].approvedAt = new Date().toISOString()
      localStorage.setItem('crm_sms_templates', JSON.stringify(templates))
    }
    return Promise.resolve({
      code: 200,
      data: templates[index],
      message: data.approved ? '审核通过' : '审核拒绝'
    })
  }

  return request({
    url: `/api/sms/templates/${id}/approve`,
    method: 'post',
    data
  })
}

// 审核短信
export function approveSms(id: string, data: { approved: boolean; reason?: string }) {
  if (shouldUseMockApi()) {
    const requests = generateMockSmsRequests()
    const index = requests.findIndex(r => r.id === id)
    if (index !== -1) {
      requests[index].status = data.approved ? 'approved' : 'rejected'
      requests[index].approvedBy = '管理员'
      requests[index].approvedAt = new Date().toISOString()
      localStorage.setItem('crm_sms_requests', JSON.stringify(requests))
    }
    return Promise.resolve({
      code: 200,
      data: requests[index],
      message: data.approved ? '审核通过' : '审核拒绝'
    })
  }

  return request({
    url: `/api/sms/requests/${id}/approve`,
    method: 'post',
    data
  })
}

// 创建模板
export function createTemplate(data: Partial<SmsTemplate>) {
  if (shouldUseMockApi()) {
    const templates = generateMockTemplates()
    const newTemplate: SmsTemplate = {
      id: `template-${Date.now()}`,
      name: data.name!,
      category: data.category!,
      content: data.content!,
      variables: data.variables || [],
      description: data.description,
      applicant: 'current-user',
      applicantName: '当前用户',
      applicantDept: '销售部',
      createdAt: new Date().toISOString(),
      status: 'pending',
      isSystem: false
    }
    templates.push(newTemplate)
    localStorage.setItem('crm_sms_templates', JSON.stringify(templates))
    return Promise.resolve({
      code: 200,
      data: newTemplate,
      message: '创建成功'
    })
  }

  return request({
    url: '/api/sms/templates',
    method: 'post',
    data
  })
}

// 创建短信申请
export function createSmsRequest(data: Partial<SmsRequest>) {
  if (shouldUseMockApi()) {
    const requests = generateMockSmsRequests()
    const newRequest: SmsRequest = {
      id: `sms-${Date.now()}`,
      templateId: data.templateId!,
      templateName: data.templateName!,
      content: data.content!,
      recipients: data.recipients || [],
      recipientCount: data.recipients?.length || 0,
      applicant: 'current-user',
      applicantName: '当前用户',
      applicantDept: '销售部',
      createdAt: new Date().toISOString(),
      status: 'pending',
      remark: data.remark
    }
    requests.push(newRequest)
    localStorage.setItem('crm_sms_requests', JSON.stringify(requests))
    return Promise.resolve({
      code: 200,
      data: newRequest,
      message: '申请成功'
    })
  }

  return request({
    url: '/api/sms/requests',
    method: 'post',
    data
  })
}

// 发送短信
export function sendSms(data: {
  templateId: string
  recipients: string[]
  content: string
}) {
  if (shouldUseMockApi()) {
    const records = generateMockSendRecords()
    const templates = generateMockTemplates()
    const template = templates.find(t => t.id === data.templateId)

    const newRecord: SendRecord = {
      id: `record-${Date.now()}`,
      templateName: template?.name || '未知模板',
      content: data.content,
      recipientCount: data.recipients.length,
      successCount: data.recipients.length,
      failCount: 0,
      status: 'completed',
      sentAt: new Date().toISOString(),
      sendDetails: data.recipients.map(phone => ({
        phone,
        status: 'success',
        sentAt: new Date().toISOString()
      }))
    }
    records.unshift(newRecord)
    localStorage.setItem('crm_send_records', JSON.stringify(records))
    return Promise.resolve({
      code: 200,
      data: newRecord,
      message: '发送成功'
    })
  }

  return request({
    url: '/api/sms/send',
    method: 'post',
    data
  })
}

// 获取预设模板
export function getPresetTemplates() {
  return Promise.resolve({
    code: 200,
    data: { templates: PRESET_TEMPLATES },
    message: '获取成功'
  })
}
