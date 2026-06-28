import request from '@/utils/request'

export interface OperationLogItem {
  id: string
  operationType: string
  operationContent: string
  operatorName: string
  operatorId?: string
  oldValue?: string | null
  newValue?: string | null
  remark?: string | null
  createdAt: string
}

export interface OrderTimelineItem {
  id: string
  logType: string
  content: string
  operatorName: string
  createdAt: string
  source: string
}

export const operationLogApi = {
  getLatestLogs(module: string, resourceIds: string[]) {
    if (!resourceIds.length) return Promise.resolve({})
    return request.get('/operation-logs/latest', {
      params: { module, resourceIds: resourceIds.join(',') }
    })
  },

  getOperationLogs(module: string, resourceId: string, page = 1, pageSize = 10) {
    return request.get(`/operation-logs/${resourceId}`, {
      params: { module, page, pageSize }
    })
  },

  getOrderTimeline(orderId: string, limit = 10, offset = 0) {
    return request.get(`/operation-logs/order-timeline/${orderId}`, {
      params: { limit, offset }
    })
  }
}
