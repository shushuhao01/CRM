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



// 部门下单限制检查响应接口
export interface DepartmentLimitCheckResult {
  hasLimit: boolean
  exceeded: boolean
  message?: string
  departmentName?: string
  details?: {
    orderCountEnabled: boolean
    orderCount: number
    maxOrderCount: number
    orderCountExceeded: boolean
    singleAmountEnabled: boolean
    maxSingleAmount: number
    totalAmountEnabled: boolean
    totalAmount: number
    maxTotalAmount: number
    remainingAmount: number
    totalAmountExceeded: boolean
  }
}

// 订单API服务
export const orderApi = {
  // 检查部门下单限制（选中客户时预检查）
  checkDepartmentLimit: (customerId: string) =>
    api.post<DepartmentLimitCheckResult>(API_ENDPOINTS.ORDERS.CHECK_DEPARTMENT_LIMIT, { customerId }),

  // 获取订单列表
  getList: (params?: OrderSearchParams) =>
    api.get<OrderListResponse>(API_ENDPOINTS.ORDERS.LIST, { params }),

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

  // 获取待审核的取消订单列表（支持分页）
  getPendingCancelOrders: (params?: { page?: number; pageSize?: number }) =>
    api.get<Order[]>(API_ENDPOINTS.ORDERS.PENDING_CANCEL, { params }),

  // 获取待审核的取消订单数量
  getPendingCancelCount: () =>
    api.get<{ count: number }>(API_ENDPOINTS.ORDERS.PENDING_CANCEL_COUNT),

  // 审核取消订单申请
  cancelAudit: (id: string, params: OrderCancelAuditParams) =>
    api.post<{ success: boolean; message: string }>(API_ENDPOINTS.ORDERS.CANCEL_AUDIT(id), params),

  // 获取已审核的取消订单列表（支持分页）
  getAuditedCancelOrders: (params?: { page?: number; pageSize?: number }) =>
    api.get<Order[]>(API_ENDPOINTS.ORDERS.AUDITED_CANCEL, { params }),

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

  // 获取待发货订单列表（优化版）
  getShippingPending: (params?: {
    page?: number;
    pageSize?: number;
    orderNumber?: string;
    customerName?: string;
  }) =>
    api.get<OrderListResponse>('/orders/shipping/pending', { params }),

  // 获取已发货订单列表（优化版）
  getShippingShipped: (params?: {
    page?: number;
    pageSize?: number;
    orderNumber?: string;
    customerName?: string;
    trackingNumber?: string;
    customerPhone?: string;  // 🔥 新增：手机号搜索
    customerCode?: string;   // 🔥 新增：客户编码搜索
    keyword?: string;        // 🔥 新增：统一关键词搜索（订单号、客户名称、手机号、物流单号、客户编码）
    status?: string;
    logisticsStatus?: string;  // 🔥 新增：物流状态筛选
    departmentId?: string;
    salesPersonId?: string;
    expressCompany?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    api.get<OrderListResponse>('/orders/shipping/shipped', { params }),

  // 获取退回订单列表（服务端分页）
  getShippingReturned: (params?: {
    page?: number;
    pageSize?: number;
    orderNumber?: string;
    customerName?: string;
  }) =>
    api.get<OrderListResponse>('/orders/shipping/returned', { params }),

  // 获取取消订单列表（服务端分页）
  getShippingCancelled: (params?: {
    page?: number;
    pageSize?: number;
    orderNumber?: string;
    customerName?: string;
  }) =>
    api.get<OrderListResponse>('/orders/shipping/cancelled', { params }),

  // 获取草稿订单列表（服务端分页）
  getShippingDraft: (params?: {
    page?: number;
    pageSize?: number;
    orderNumber?: string;
    customerName?: string;
  }) =>
    api.get<OrderListResponse>('/orders/shipping/draft', { params }),

  // 获取物流统计数据
  getShippingStatistics: () =>
    api.get<{
      pendingCount: number;
      shippedCount: number;
      deliveredCount: number;
      exceptionCount: number;
      totalShipped: number;
    }>('/orders/shipping/statistics'),

  // 🔥 新增：获取审核订单列表（优化版）
  getAuditList: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    orderNumber?: string;
    customerName?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    api.get<OrderListResponse>('/orders/audit-list', { params }),

  // 🔥 新增：获取审核统计数据（优化版）
  getAuditStatistics: () =>
    api.get<{
      pendingCount: number;
      approvedCount: number;
      rejectedCount: number;
      pendingAmount: number;
      todayCount: number;
      urgentCount: number;
    }>('/orders/audit-statistics'),

  // 🔥 新增：根据物流单号获取订单信息
  getOrderByTrackingNo: (trackingNo: string) =>
    api.get<Order>('/orders/by-tracking-no', { params: { trackingNo } }),

  // 🔥 新增：获取成员订单列表（用于业绩详情弹窗）
  getMemberOrders: (params: {
    memberId: string
    memberUsername?: string
    startDate?: string
    endDate?: string
    status?: string
    page?: number
    pageSize?: number
  }) =>
    api.get<OrderListResponse>('/orders', {
      params: {
        salesPersonId: params.memberId,
        startDate: params.startDate,
        endDate: params.endDate,
        status: params.status,
        page: params.page || 1,
        pageSize: params.pageSize || 10
      }
    }),
}
