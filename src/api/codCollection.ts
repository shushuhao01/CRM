/**
 * 代收管理 API
 */
import request from '@/utils/request'

export interface CodStats {
  todayCod: number
  monthCod: number
  cancelledCod: number
  returnedCod: number
  pendingCod: number
}

export interface CodOrder {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  customerPhone: string
  status: string
  totalAmount: number
  finalAmount: number
  depositAmount: number
  codAmount: number  // 当前实际代收金额（如果修改过则为修改后的值，否则为原始计算值）
  codStatus: string
  codReturnedAmount: number
  codReturnedAt: string | null
  codCancelledAt: string | null
  codRemark: string | null
  salesPersonId: string
  salesPersonName: string
  departmentId: string
  departmentName: string
  trackingNumber: string
  expressCompany: string
  logisticsStatus: string
  latestLogisticsInfo: string
  shippedAt: string
  createdAt: string
}

export interface CodListParams {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
  departmentId?: string
  salesPersonId?: string
  status?: string
  codStatus?: string
  keywords?: string
  tab?: 'pending' | 'returned' | 'cancelled' | 'zero' | 'all'
}

// 获取代收统计数据
export function getCodStats(params?: { startDate?: string; endDate?: string; departmentId?: string; salesPersonId?: string }) {
  return request.get<CodStats>('/cod-collection/stats', { params })
}

// 获取代收订单列表
export function getCodList(params: CodListParams) {
  return request.get<{ list: CodOrder[]; total: number; page: number; pageSize: number }>('/cod-collection/list', { params })
}

// 获取代收订单详情
export function getCodDetail(id: string) {
  return request.get<CodOrder>(`/cod-collection/detail/${id}`)
}

// 修改代收金额
export function updateCodAmount(id: string, data: { codAmount: number; codRemark?: string }) {
  return request.put(`/cod-collection/update-cod/${id}`, data)
}

// 标记返款
export function markCodReturned(id: string, data: { returnedAmount?: number; codRemark?: string }) {
  return request.put(`/cod-collection/mark-returned/${id}`, data)
}

// 取消代收
export function cancelCod(id: string, data?: { codRemark?: string }) {
  return request.put(`/cod-collection/cancel-cod/${id}`, data || {})
}

// 批量修改代收金额
export function batchUpdateCodAmount(data: { orderIds: string[]; codAmount: number; codRemark?: string }) {
  return request.put('/cod-collection/batch-update-cod', data)
}

// 批量标记返款
export function batchMarkCodReturned(data: { orderIds: string[]; codRemark?: string }) {
  return request.put('/cod-collection/batch-mark-returned', data)
}

// 获取部门列表
export function getCodDepartments() {
  return request.get('/cod-collection/departments')
}

// 获取销售人员列表
export function getCodSalesUsers(departmentId?: string) {
  return request.get('/cod-collection/sales-users', { params: { departmentId } })
}

// ==================== 操作日志相关 ====================

// 操作日志接口
export interface CodOperationLog {
  id: string
  orderId: string
  orderNumber?: string
  operationType: string // cod_amount_change | cod_returned | cod_cancelled
  operationContent: string
  oldValue?: string
  newValue?: string
  operatorId?: string
  operatorName?: string
  remark?: string
  createdAt: string
}

// 操作类型标签映射
export const COD_OPERATION_TYPE_LABELS: Record<string, string> = {
  cod_amount_change: '代收金额变更',
  cod_returned: '标记返款',
  cod_cancelled: '取消代收'
}

/**
 * 批量获取多个订单的最新操作日志（列表展示用）
 */
export function getLatestCodOperationLogs(orderIds: string[]) {
  return request({
    url: '/cod-collection/operation-logs/latest',
    method: 'get',
    params: { orderIds: orderIds.join(',') }
  })
}

/**
 * 分页获取某个订单的历史操作日志（弹窗展示用）
 */
export function getCodOperationLogs(orderId: string, params: { page: number; pageSize: number }) {
  return request({
    url: `/cod-collection/operation-logs/${orderId}`,
    method: 'get',
    params
  })
}
