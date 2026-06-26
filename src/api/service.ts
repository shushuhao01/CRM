/**
 * 售后服务API
 */
import { api } from './request'
import request from '@/utils/request'

export interface AfterSalesServiceData {
  id: string
  serviceNumber: string
  orderId?: string
  orderNumber?: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  serviceType: string
  status: string
  priority: string
  reason?: string
  description?: string
  productName?: string
  productSpec?: string
  quantity?: number
  price?: number
  contactName?: string
  contactPhone?: string
  contactAddress?: string
  assignedTo?: string
  assignedToId?: string
  remark?: string
  attachments?: string[]
  createdBy?: string
  createdById?: string
  departmentId?: string
  createTime?: string
  updateTime?: string
  expectedTime?: string
  resolvedTime?: string
  orderAmount?: number
  orderCreator?: string
  resolutionType?: string
  refundAmount?: number
  refundType?: string
  resolutionProduct?: string
  resolutionRemark?: string
}

export interface ServiceListParams {
  page?: number
  limit?: number
  status?: string
  serviceType?: string
  search?: string
  orderNumber?: string
}

export interface ServiceListResponse {
  items: AfterSalesServiceData[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/** 统一解析列表响应（兼容单层/双层 data 结构） */
function normalizeServiceListResponse(raw: unknown): ServiceListResponse {
  const empty: ServiceListResponse = { items: [], total: 0, page: 1, limit: 20, totalPages: 0 }
  if (!raw || typeof raw !== 'object') return empty

  const obj = raw as Record<string, unknown>
  if (Array.isArray(obj.items)) {
    return {
      items: obj.items as AfterSalesServiceData[],
      total: Number(obj.total) || 0,
      page: Number(obj.page) || 1,
      limit: Number(obj.limit) || 20,
      totalPages: Number(obj.totalPages) || 0
    }
  }

  const nested = obj.data
  if (nested && typeof nested === 'object') {
    return normalizeServiceListResponse(nested)
  }

  return empty
}

export const serviceApi = {
  /**
   * 获取售后服务列表
   * 与 dashboard 一致：直接使用 @/utils/request，避免 api/request 双层包装导致解析失败
   */
  async getList(params: ServiceListParams = {}): Promise<ServiceListResponse> {
    const queryParams: Record<string, string | number | boolean | null | undefined> = {}
    if (params.page) queryParams.page = params.page
    if (params.limit) queryParams.limit = params.limit
    if (params.status) queryParams.status = params.status
    if (params.serviceType) queryParams.serviceType = params.serviceType
    if (params.search) queryParams.search = params.search
    if (params.orderNumber) queryParams.orderNumber = params.orderNumber

    const raw = await request.get('/services', { params: queryParams, showError: false } as any)
    const result = normalizeServiceListResponse(raw)
    console.log('[ServiceAPI] 列表加载:', result.items.length, '条, total:', result.total)
    return result
  },

  /**
   * 获取售后服务详情
   */
  async getDetail(id: string): Promise<AfterSalesServiceData> {
    const response = await api.get<AfterSalesServiceData>(`/services/${id}`)
    return response.data || response
  },

  /**
   * 创建售后服务
   */
  async create(data: Partial<AfterSalesServiceData>): Promise<AfterSalesServiceData> {
    const response = await api.post<AfterSalesServiceData>('/services', data)
    return response.data || response
  },

  /**
   * 更新售后服务
   */
  async update(id: string, data: Partial<AfterSalesServiceData>): Promise<AfterSalesServiceData> {
    const response = await api.put<AfterSalesServiceData>(`/services/${id}`, data)
    return response.data || response
  },

  /**
   * 更新售后服务状态
   */
  async updateStatus(id: string, status: string, remark?: string, resolutionData?: {
    resolutionType?: string
    refundAmount?: number
    refundType?: string
    resolutionProduct?: string
    resolutionRemark?: string
  }): Promise<void> {
    await api.patch(`/services/${id}/status`, { status, remark, ...resolutionData })
  },

  /**
   * 分配处理人
   */
  async assign(id: string, assignedTo: string, assignedToId?: string, remark?: string): Promise<void> {
    await api.patch(`/services/${id}/assign`, { assignedTo, assignedToId, remark })
  },

  /**
   * 设置优先级
   */
  async setPriority(id: string, priority: string, remark?: string): Promise<void> {
    await api.patch(`/services/${id}/priority`, { priority, remark })
  },

  /**
   * 删除售后服务
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/services/${id}`)
  },

  /**
   * 获取统计数据
   */
  async getStatistics(): Promise<{
    total: number
    pending: number
    processing: number
    resolved: number
    closed: number
  }> {
    const response = await api.get<{
      total: number
      pending: number
      processing: number
      resolved: number
      closed: number
    }>('/services/stats/summary')
    return response.data || response
  },

  /**
   * 获取跟进记录
   */
  async getFollowUps(id: string): Promise<ServiceFollowUpRecord[]> {
    const response = await api.get<ServiceFollowUpRecord[]>(`/services/${id}/follow-ups`)
    return response.data || response || []
  },

  /**
   * 添加跟进记录
   */
  async addFollowUp(id: string, data: { followUpTime: string; content: string }): Promise<ServiceFollowUpRecord> {
    const response = await api.post<ServiceFollowUpRecord>(`/services/${id}/follow-ups`, data)
    return response.data || response
  },

  /**
   * 获取操作记录
   */
  async getOperationLogs(id: string): Promise<ServiceOperationLog[]> {
    const response = await api.get<ServiceOperationLog[]>(`/services/${id}/operation-logs`)
    return response.data || response || []
  }
}

// 跟进记录类型
export interface ServiceFollowUpRecord {
  id: string
  serviceId: string
  serviceNumber?: string
  followUpTime: string
  content: string
  createdBy: string
  createdById?: string
  createTime: string
}

// 操作记录类型
export interface ServiceOperationLog {
  id: string
  serviceId: string
  serviceNumber?: string
  operationType: string
  operationContent: string
  oldValue?: string
  newValue?: string
  operatorId?: string
  operatorName?: string
  remark?: string
  createTime: string
}
