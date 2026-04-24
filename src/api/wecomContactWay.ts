/**
 * 企微活码管理 API - V4.0新增
 */
import request from '@/utils/request'

/** 获取活码列表 */
export const getContactWayList = (params: {
  configId?: number
  page?: number
  pageSize?: number
  keyword?: string
}) => {
  return request.get('/wecom/contact-way', { params })
}

/** 创建活码 */
export const createContactWay = (data: any) => {
  return request.post('/wecom/contact-way', data)
}

/** 更新活码 */
export const updateContactWay = (id: number, data: any) => {
  return request.put(`/wecom/contact-way/${id}`, data)
}

/** 删除活码 */
export const deleteContactWay = (id: number) => {
  return request.delete(`/wecom/contact-way/${id}`)
}

/** 活码详情 */
export const getContactWayDetail = (id: number) => {
  return request.get(`/wecom/contact-way/${id}/detail`)
}

/** 活码客户列表 */
export const getContactWayCustomers = (id: number, params?: any) => {
  return request.get(`/wecom/contact-way/${id}/customers`, { params })
}

/** 活码统计数据 */
export const getContactWayStats = (id: number) => {
  return request.get(`/wecom/contact-way/${id}/stats`)
}

/** 活码画像分析 */
export const getContactWayPortrait = (id: number) => {
  return request.get(`/wecom/contact-way/${id}/portrait`)
}

/** 活码数据统计总览 */
export const getContactWayOverview = (params: { configId: number; startDate?: string; endDate?: string; range?: string }) => {
  return request.get('/wecom/contact-way/overview', { params })
}

/** 活码趋势数据 */
export const getContactWayTrend = (params: { configId: number; startDate?: string; endDate?: string }) => {
  return request.get('/wecom/contact-way/trend', { params })
}

/** 活码表现排行 */
export const getContactWayRanking = (params: { configId: number; startDate?: string; endDate?: string; page?: number; pageSize?: number; sortBy?: string; sortOrder?: string }) => {
  return request.get('/wecom/contact-way/ranking', { params })
}

/** 活码渠道分析 */
export const getContactWayChannelAnalysis = (params: { configId: number; startDate?: string; endDate?: string; page?: number; pageSize?: number }) => {
  return request.get('/wecom/contact-way/channel-analysis', { params })
}

/** 同步活码列表 */
export const syncContactWayList = (configId: number) => {
  return request.post('/wecom/contact-way/sync', { configId })
}

/** 批量启用/禁用活码 */
export const batchUpdateContactWay = (ids: number[], data: { isEnabled?: boolean }) => {
  return request.put('/wecom/contact-way/batch', { ids, ...data })
}

/** 批量删除活码 */
export const batchDeleteContactWay = (ids: number[]) => {
  return request.post('/wecom/contact-way/batch-delete', { ids })
}
