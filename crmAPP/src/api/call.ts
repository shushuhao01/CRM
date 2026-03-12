import { request, uploadFile } from '@/utils/request'

// 上报通话状态
export const reportCallStatus = (data: {
  callId: string
  status: 'dialing' | 'ringing' | 'connected' | 'ended' | 'missed' | 'rejected'
  timestamp?: string
}): Promise<void> => {
  return request({
    url: '/mobile/call/status',
    method: 'POST',
    data: {
      ...data,
      timestamp: data.timestamp || new Date().toISOString()
    },
    showLoading: false
  })
}

// 上报通话结束
export const reportCallEnd = (data: {
  callId: string
  status: 'connected' | 'missed' | 'rejected' | 'busy' | 'failed'
  startTime?: string
  endTime: string
  duration: number
  hasRecording: boolean
}): Promise<{ callId: string; recordingUploadUrl: string }> => {
  return request({
    url: '/mobile/call/end',
    method: 'POST',
    data,
    showLoading: false
  })
}

// 上传录音文件
export const uploadRecording = (callId: string, filePath: string): Promise<{
  recordingUrl: string
  fileSize: number
}> => {
  return uploadFile({
    url: '/mobile/recording/upload',
    filePath,
    name: 'file',
    formData: { callId }
  })
}

// 提交通话跟进记录
export const submitCallFollowup = (data: {
  callId: string
  notes?: string
  tags?: string[]
  intention?: 'high' | 'medium' | 'low' | 'none'
  followUpRequired?: boolean
  nextFollowUpDate?: string
  customerId?: string
}): Promise<{ callId: string; customerId: string; synced: boolean }> => {
  return request({
    url: '/mobile/call/followup',
    method: 'POST',
    data,
    showLoading: true,
    loadingText: '保存中...'
  })
}

// 通话记录
export interface CallRecord {
  id: string
  customerId?: string
  customerName?: string
  customerPhone: string
  callType: 'inbound' | 'outbound'
  callStatus: 'connected' | 'missed' | 'busy' | 'failed' | 'rejected'
  startTime: string
  duration: number
  hasRecording: boolean
  notes?: string
  callTags?: string[]
}

// 获取通话记录列表
export const getCallList = (params: {
  page?: number
  pageSize?: number
  callType?: 'inbound' | 'outbound'
  startDate?: string
  endDate?: string
}): Promise<{
  records: CallRecord[]
  total: number
  page: number
  pageSize: number
}> => {
  return request({
    url: '/mobile/calls',
    method: 'GET',
    data: params,
    showLoading: false
  })
}

// 通话详情
export interface CallDetail extends CallRecord {
  customerLevel?: string
  customerTags?: string[]
  followStatus?: string
  endTime?: string
  recordingUrl?: string
  followUpRequired?: boolean
  userId?: string
  userName?: string
  createdAt?: string
  followUpRecords?: Array<{
    id: string
    content: string
    intention?: string
    nextFollowUpDate?: string
    userName: string
    createdAt: string
  }>
}

// 获取通话详情
export const getCallDetail = (callId: string): Promise<CallDetail> => {
  return request({
    url: `/mobile/call/${callId}`,
    method: 'GET',
    showLoading: true
  })
}

// 今日统计
export interface TodayStats {
  totalCalls: number
  connectedCalls: number
  missedCalls: number
  inboundCalls: number
  outboundCalls: number
  totalDuration: number
  avgDuration: number
  connectRate: number
}

// 获取今日统计
export const getTodayStats = (): Promise<TodayStats> => {
  return request({
    url: '/mobile/stats/today',
    method: 'GET',
    showLoading: false
  })
}

// 获取统计（支持时间范围）
export const getStats = (period: 'today' | 'week' | 'month' = 'today'): Promise<TodayStats> => {
  return request({
    url: '/mobile/stats',
    method: 'GET',
    data: { period },
    showLoading: false
  })
}
