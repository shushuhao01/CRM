// 订单相关API服务
import { api } from './request'
import { API_ENDPOINTS } from './config'
import type { Order } from '@/stores/order'

// 订单查询参数接口
export interface OrderSearchParams {
  orderNumber?: string
  customerName?: string
  status?: string
  auditStatus?: string
  dateRange?: [string, string]
  page?: number
  pageSize?: number
}

// 订单列表响应接口
export interface OrderListResponse {
  list: Order[]
  total: number
  page: number
  pageSize: number
}

// 提审订单参数接口
export interface OrderSubmitAuditParams {
  operatorId: string
  markType?: string
}

// 订单审核参数接口
export interface OrderAuditParams {
  auditStatus: 'approved' | 'rejected'
  auditRemark?: string
}

// 取消订单申请参数接口
export interface OrderCancelRequestParams {
  orderId: string
  reason: string
  description: string
  operatorId: string
}

// 取消订单审核参数接口
export interface OrderCancelAuditParams {
  action: 'approve' | 'reject'
  remark: string
  auditorId: string
}

// 订单统计数据接口
export interface OrderStatistics {
  pendingCount: number
  pendingAmount: number
  todayCount: number
  urgentCount: number
}



// 订单API服务
export const orderApi = {
  // 获取订单列表
  getList: (params?: OrderSearchParams) =>
    api.get<OrderListResponse>(API_ENDPOINTS.ORDERS.LIST, params),

  // 创建订单
  create: (data: Omit<Order, 'id' | 'orderNumber' | 'createTime'>) =>
    api.post<Order>(API_ENDPOINTS.ORDERS.CREATE, data),

  // 更新订单
  update: (id: string, data: Partial<Order>) =>
    api.put<Order>(API_ENDPOINTS.ORDERS.UPDATE(id), data),

  // 删除订单
  delete: (id: string) =>
    api.delete(API_ENDPOINTS.ORDERS.DELETE(id)),

  // 获取订单详情
  getDetail: (id: string) =>
    api.get<Order>(API_ENDPOINTS.ORDERS.DETAIL(id)),

  // 审核订单
  audit: (id: string, params: OrderAuditParams) =>
    api.post<Order>(API_ENDPOINTS.ORDERS.AUDIT(id), params),

  // 提审订单
  submitAudit: (id: string, params: OrderSubmitAuditParams) =>
    api.post<{ success: boolean; message: string }>(API_ENDPOINTS.ORDERS.SUBMIT_AUDIT(id), params),

  // 提交取消订单申请
  cancelRequest: (params: OrderCancelRequestParams) =>
    api.post<{ success: boolean; message: string }>(API_ENDPOINTS.ORDERS.CANCEL_REQUEST, params),

  // 获取待审核的取消订单列表
  getPendingCancelOrders: () =>
    api.get<Order[]>(API_ENDPOINTS.ORDERS.PENDING_CANCEL),

  // 审核取消订单申请
  cancelAudit: (id: string, params: OrderCancelAuditParams) =>
    api.post<{ success: boolean; message: string }>(API_ENDPOINTS.ORDERS.CANCEL_AUDIT(id), params),

  // 获取已审核的取消订单列表
  getAuditedCancelOrders: () =>
    api.get<Order[]>(API_ENDPOINTS.ORDERS.AUDITED_CANCEL),

  // 获取订单统计数据
  getStatistics: () =>
    api.get<OrderStatistics>(API_ENDPOINTS.ORDERS.STATISTICS),

  // 检查并执行订单流转
  checkTransfer: () =>
    api.post<{ transferredCount: number; orders: Array<{ id: string; orderNumber: string }> }>(
      API_ENDPOINTS.ORDERS.CHECK_TRANSFER
    ),

  // 更新订单标记类型
  updateMarkType: (id: string, data: { markType: string; isAuditTransferred?: boolean; auditTransferTime?: string; status?: string }) =>
    api.put<{ id: string; markType: string }>(API_ENDPOINTS.ORDERS.UPDATE_MARK_TYPE(id), data),

  // 获取待发货订单列表
  getShippingPending: (params?: { page?: number; pageSize?: number }) =>
    api.get<OrderListResponse>('/orders/shipping/pending', params),

  // 获取已发货订单列表
  getShippingShipped: (params?: { page?: number; pageSize?: number }) =>
    api.get<OrderListResponse>('/orders/shipping/shipped', params),

  // 🔥 获取待审核订单列表（用于订单审核页面）
  getPendingAuditOrders: (params?: { page?: number; pageSize?: number }) =>
    api.get<OrderListResponse>('/orders/pending-audit', params),
}
