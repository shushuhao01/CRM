import { request } from './request'

// 业绩分享相关接口

/**
 * 获取业绩分享列表
 */
export const getPerformanceShares = (params?: {
  page?: number
  limit?: number
  status?: string
  userId?: string
  orderId?: string
}) => {
  return request.get('/performance/shares', { params })
}

/**
 * 获取单个业绩分享详情
 */
export const getPerformanceShare = (id: string) => {
  return request.get(`/performance/shares/${id}`)
}

/**
 * 创建业绩分享
 */
export const createPerformanceShare = (data: {
  orderId: string
  orderNumber: string
  orderAmount: number
  shareMembers: Array<{
    userId: string
    userName: string
    percentage: number
  }>
  description?: string
}) => {
  return request.post('/performance/shares', data)
}

/**
 * 更新业绩分享
 */
export const updatePerformanceShare = (id: string, data: any) => {
  return request.put(`/performance/shares/${id}`, data)
}

/**
 * 取消业绩分享
 */
export const cancelPerformanceShare = (id: string) => {
  return request.delete(`/performance/shares/${id}`)
}

/**
 * 确认业绩分享
 */
export const confirmPerformanceShare = (id: string) => {
  return request.post(`/performance/shares/${id}/confirm`)
}

/**
 * 拒绝业绩分享
 */
export const rejectPerformanceShare = (id: string, reason?: string) => {
  return request.post(`/performance/shares/${id}/reject`, { reason })
}

/**
 * 获取业绩分享统计数据
 */
export const getPerformanceStats = () => {
  return request.get('/performance/stats')
}

/**
 * 导出业绩分享记录
 */
export const exportPerformanceShares = (params?: {
  format?: 'csv' | 'json'
  startDate?: string
  endDate?: string
}) => {
  return request.get('/performance/export', { 
    params,
    responseType: params?.format === 'csv' ? 'blob' : 'json'
  })
}

// 业绩分析相关接口

/**
 * 获取个人业绩分析数据
 */
export const getPersonalAnalysis = (params?: {
  userId?: string
  startDate?: string
  endDate?: string
}) => {
  return request.get('/performance/analysis/personal', { params })
}

/**
 * 获取部门业绩分析数据
 */
export const getDepartmentAnalysis = (params?: {
  departmentId?: string
  startDate?: string
  endDate?: string
}) => {
  return request.get('/performance/analysis/department', { params })
}

/**
 * 获取公司业绩分析数据
 */
export const getCompanyAnalysis = (params?: {
  startDate?: string
  endDate?: string
}) => {
  return request.get('/performance/analysis/company', { params })
}

/**
 * 获取业绩分析统计指标
 */
export const getAnalysisMetrics = (params?: {
  type?: 'personal' | 'department' | 'company'
  userId?: string
  departmentId?: string
  startDate?: string
  endDate?: string
}) => {
  return request.get('/performance/analysis/metrics', { params })
}

/**
 * 获取业绩趋势数据
 */
export const getPerformanceTrend = (params?: {
  type?: 'personal' | 'department' | 'company'
  userId?: string
  departmentId?: string
  period?: '7d' | '30d' | 'month'
}) => {
  return request.get('/performance/analysis/trend', { params })
}