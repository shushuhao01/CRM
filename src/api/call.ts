import { api } from './request'

// 通话记录接口
export interface CallRecord {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  callType: 'outbound' | 'inbound'
  callStatus: 'connected' | 'missed' | 'busy' | 'failed' | 'rejected'
  startTime: string
  endTime?: string
  duration: number // 通话时长（秒）
  recordingUrl?: string
  notes?: string
  followUpRequired: boolean
  userId: string
  userName: string
  department: string
  createdAt: string
  updatedAt: string
}

// 跟进记录接口
export interface FollowUpRecord {
  id: string
  callId: string
  customerId: string
  customerName: string
  followUpType: 'call' | 'visit' | 'email' | 'message'
  content: string
  nextFollowUpDate?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'completed' | 'cancelled'
  userId: string
  userName: string
  createdAt: string
  updatedAt: string
}

// 通话统计接口
export interface CallStatistics {
  totalCalls: number
  totalDuration: number
  averageDuration: number
  connectedCalls: number
  missedCalls: number
  connectionRate: number
  dailyStats: Array<{
    date: string
    calls: number
    duration: number
    connectionRate: number
  }>
  userStats: Array<{
    userId: string
    userName: string
    calls: number
    duration: number
    connectionRate: number
  }>
}

// 电话配置接口
export interface PhoneConfig {
  id: string
  userId: string
  sipServer: string
  sipUsername: string
  sipPassword: string
  displayNumber: string
  autoRecord: boolean
  recordingQuality: 'low' | 'medium' | 'high'
  maxCallDuration: number
  enableCallTransfer: boolean
  enableConference: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// 获取通话记录列表
export const getCallRecords = (params: {
  page?: number
  pageSize?: number
  customerId?: string
  callType?: string
  callStatus?: string
  startDate?: string
  endDate?: string
  userId?: string
}) => {
  return api.get<{
    records: CallRecord[]
    total: number
    page: number
    pageSize: number
  }>('/api/calls/records', params)
}

// 获取单个通话记录详情
export const getCallRecord = (id: string) => {
  return api.get<CallRecord>(`/api/calls/records/${id}`)
}

// 创建通话记录
export const createCallRecord = (data: Omit<CallRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  return api.post<CallRecord>('/api/calls/records', data)
}

// 更新通话记录
export const updateCallRecord = (id: string, data: Partial<CallRecord>) => {
  return api.put<CallRecord>(`/api/calls/records/${id}`, data)
}

// 删除通话记录
export const deleteCallRecord = (id: string) => {
  return api.delete(`/api/calls/records/${id}`)
}

// 发起外呼
export const makeOutboundCall = (data: {
  customerId: string
  customerPhone: string
  notes?: string
}) => {
  return api.post<{
    callId: string
    status: string
    message: string
  }>('/api/calls/outbound', data)
}

// 结束通话
export const endCall = (callId: string, data: {
  endTime: string
  duration: number
  notes?: string
  followUpRequired?: boolean
}) => {
  return api.put<CallRecord>(`/api/calls/records/${callId}/end`, data)
}

// 获取跟进记录列表
export const getFollowUpRecords = (params: {
  page?: number
  pageSize?: number
  customerId?: string
  callId?: string
  status?: string
  priority?: string
  userId?: string
  startDate?: string
  endDate?: string
}) => {
  return api.get<{
    records: FollowUpRecord[]
    total: number
    page: number
    pageSize: number
  }>('/api/calls/followups', params)
}

// 创建跟进记录
export const createFollowUpRecord = (data: Omit<FollowUpRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  return api.post<FollowUpRecord>('/api/calls/followups', data)
}

// 更新跟进记录
export const updateFollowUpRecord = (id: string, data: Partial<FollowUpRecord>) => {
  return api.put<FollowUpRecord>(`/api/calls/followups/${id}`, data)
}

// 删除跟进记录
export const deleteFollowUpRecord = (id: string) => {
  return api.delete(`/api/calls/followups/${id}`)
}

// 获取通话统计
export const getCallStatistics = (params: {
  startDate?: string
  endDate?: string
  userId?: string
  department?: string
  groupBy?: 'day' | 'week' | 'month'
}) => {
  return api.get<CallStatistics>('/api/calls/statistics', params)
}

// 获取录音列表
export const getRecordings = (params: {
  page?: number
  pageSize?: number
  callId?: string
  customerId?: string
  startDate?: string
  endDate?: string
}) => {
  return api.get<{
    recordings: Array<{
      id: string
      callId: string
      fileName: string
      fileUrl: string
      duration: number
      fileSize: number
      createdAt: string
    }>
    total: number
    page: number
    pageSize: number
  }>('/api/calls/recordings', params)
}

// 下载录音
export const downloadRecording = (recordingId: string) => {
  return api.get(`/api/calls/recordings/${recordingId}/download`)
}

// 删除录音
export const deleteRecording = (recordingId: string) => {
  return api.delete(`/api/calls/recordings/${recordingId}`)
}

// 获取电话配置
export const getPhoneConfig = (userId?: string) => {
  return api.get<PhoneConfig>('/api/calls/config', userId ? { userId } : undefined)
}

// 更新电话配置
export const updatePhoneConfig = (data: Partial<PhoneConfig>) => {
  return api.put<PhoneConfig>('/api/calls/config', data)
}

// 测试电话连接
export const testPhoneConnection = () => {
  return api.post<{
    success: boolean
    message: string
    latency?: number
  }>('/api/calls/test-connection')
}

// 获取客户通话历史
export const getCustomerCallHistory = (customerId: string, params?: {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
}) => {
  return api.get<{
    records: CallRecord[]
    total: number
    page: number
    pageSize: number
  }>(`/api/customers/${customerId}/calls`, params)
}

// 导出通话记录
export const exportCallRecords = (params: {
  startDate?: string
  endDate?: string
  userId?: string
  callType?: string
  format?: 'excel' | 'csv'
}) => {
  return api.get('/api/calls/export', params)
}