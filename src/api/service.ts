/**
 * 售后服务API
 */
import { api } from './request'

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

export const serviceApi = {
  /**
   * 获取售后服务列表
   */
  async getList(params: ServiceListParams = {}): Promise<ServiceListResponse> {
    const queryParams: Record<string, string | number | boolean | null | undefined> = {}
    if (params.page) queryParams.page = params.page
    if (params.limit) queryParams.limit = params.limit
    if (params.status) queryParams.status = params.status
    if (params.serviceType) queryParams.serviceType = params.serviceType
    if (params.search) queryParams.search = params.search
    if (params.orderNumber) queryParams.orderNumber = params.orderNumber

    const response = await api.get<ServiceListResponse>('/services', queryParams)
    return response.data || response
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
  async updateStatus(id: string, status: string, remark?: string): Promise<void> {
    await api.patch(`/services/${id}/status`, { status, remark })
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
