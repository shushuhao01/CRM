import { api } from './request'

// 物流状态枚举
export enum LogisticsStatus {
  PENDING = 'pending',           // 待揽收
  PICKED_UP = 'picked_up',       // 已揽收
  IN_TRANSIT = 'in_transit',     // 运输中
  OUT_FOR_DELIVERY = 'out_for_delivery', // 派送中
  DELIVERED = 'delivered',       // 已签收
  EXCEPTION = 'exception',       // 异常
  REJECTED = 'rejected',         // 拒收
  RETURNED = 'returned'          // 已退回
}

// 物流跟踪接口
export interface LogisticsTracking {
  id: number
  orderId: number
  trackingNo: string
  companyCode: string
  companyName: string
  status: LogisticsStatus
  currentLocation?: string
  statusDescription?: string
  lastUpdateTime?: Date
  estimatedDeliveryTime?: Date
  actualDeliveryTime?: Date
  signedBy?: string
  extraInfo?: any
  autoSyncEnabled: boolean
  nextSyncTime?: Date
  syncFailureCount: number
  lastSyncError?: string
  createdAt: Date
  updatedAt: Date
  traces?: LogisticsTrace[]
  order?: any
}

// 物流轨迹接口
export interface LogisticsTrace {
  id: number
  logisticsTrackingId: number
  traceTime: Date
  location: string
  description: string
  status: string
  operator?: string
  phone?: string
  rawData?: any
  createdAt: Date
}

// 快递公司接口
export interface ExpressCompany {
  code: string
  name: string
  phone?: string
}

// 物流管理相关接口

// 获取物流列表
export const getLogisticsList = (params: {
  page?: number
  pageSize?: number
  orderId?: number
  trackingNo?: string
  companyCode?: string
  status?: LogisticsStatus
  autoSyncEnabled?: boolean
  startDate?: string
  endDate?: string
}) => {
  return api.get('/logistics/list', params)
}

// 创建物流跟踪
export const createLogisticsTracking = (data: {
  orderId: number
  trackingNo: string
  companyCode: string
  autoSyncEnabled?: boolean
}) => {
  return api.post('/logistics/tracking', data)
}

// 获取物流轨迹（调用真实快递API）
export const getLogisticsTrace = async (params: {
  trackingNo: string
  companyCode?: string
}) => {
  // 调用后端真实API接口
  try {
    const response = await api.get('/logistics/trace/query', params)
    console.log('[物流API] 查询响应:', response)

    if (response.success && response.data) {
      // 返回完整的响应数据，包含traces数组
      return {
        success: true,
        code: 200,
        data: response.data.traces || [],
        rawData: response.data
      }
    }

    return {
      success: false,
      code: response.code || 500,
      data: [],
      message: response.message || '查询失败'
    }
  } catch (error) {
    console.error('[物流API] 获取物流轨迹失败:', error)
    return {
      success: false,
      code: 500,
      data: [],
      message: error instanceof Error ? error.message : '查询失败'
    }
  }
}

// 批量同步物流状态
export const batchSyncLogisticsStatus = (data: {
  trackingIds: number[]
}) => {
  return api.post('/logistics/batch-sync', data)
}

// 更新物流状态
export const updateLogisticsStatus = (id: number, data: {
  status?: LogisticsStatus
  currentLocation?: string
  statusDescription?: string
  estimatedDeliveryTime?: string
  actualDeliveryTime?: string
  signedBy?: string
  extraInfo?: any
  autoSyncEnabled?: boolean
}) => {
  return api.put(`/logistics/tracking/${id}`, data)
}

// 获取支持的快递公司列表
export const getSupportedCompanies = () => {
  return api.get('/logistics/companies')
}

// 兼容旧接口的别名 - 修改为接受对象参数
export const getLogisticsTracking = (params: { trackingNo: string; companyCode?: string }) => {
  return getLogisticsTrace(params)
}
export const autoUpdateLogisticsStatus = () => batchSyncLogisticsStatus({ trackingIds: [] })

// 获取物流状态更新列表（兼容旧接口）
export const getLogisticsStatusList = (params: {
  tab?: string
  dateRange?: [string, string]
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
}) => {
  const mappedParams = {
    page: params.page,
    pageSize: params.pageSize,
    trackingNo: params.keyword,
    status: params.status as LogisticsStatus,
    startDate: params.dateRange?.[0],
    endDate: params.dateRange?.[1]
  }
  return getLogisticsList(mappedParams)
}

// 获取物流状态汇总数据（兼容旧接口）
export const getLogisticsStatusSummary = (params?: {
  dateRange?: [string, string]
}) => {
  return api.get('/logistics/summary', {
    startDate: params?.dateRange?.[0],
    endDate: params?.dateRange?.[1]
  })
}

// 更新订单物流状态（兼容旧接口）
export const updateOrderLogisticsStatus = (data: {
  orderNo: string
  newStatus: string
  remark?: string
}) => {
  return api.post('/logistics/order/status', data)
}

// 批量更新订单物流状态（兼容旧接口）
export const batchUpdateOrderLogisticsStatus = (data: {
  orderNos: string[]
  newStatus: string
  remark?: string
}) => {
  return api.post('/logistics/order/batch-status', data)
}

// 设置订单待办（兼容旧接口）
export const setOrderTodo = (data: {
  orderNo: string
  days: number
  remark?: string
}) => {
  return api.post('/logistics/order/todo', data)
}

// 获取用户权限信息（兼容旧接口）
export const getUserLogisticsPermission = () => {
  return api.get('/logistics/permission')
}

// 获取物流状态更新日志（兼容旧接口）
export const getLogisticsStatusLog = (params: {
  orderNo?: string
  page?: number
  pageSize?: number
}) => {
  return api.get('/logistics/log', params)
}

// 导出物流状态数据（兼容旧接口）
export const exportLogisticsStatusData = (params: {
  tab?: string
  dateRange?: [string, string]
  keyword?: string
  status?: string
}) => {
  return api.get('/logistics/export', params)
}
