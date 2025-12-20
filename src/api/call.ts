import { api } from './request'
import { shouldUseMockApi } from './mock'

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
  }>('/calls/records', params)
}

// 获取单个通话记录详情
export const getCallRecord = (id: string) => {
  return api.get<CallRecord>(`/calls/records/${id}`)
}

// 创建通话记录
export const createCallRecord = (data: Omit<CallRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  return api.post<CallRecord>('/calls/records', data)
}

// 更新通话记录
export const updateCallRecord = (id: string, data: Partial<CallRecord>) => {
  return api.put<CallRecord>(`/calls/records/${id}`, data)
}

// 删除通话记录
export const deleteCallRecord = (id: string) => {
  return api.delete(`/calls/records/${id}`)
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
  }>('/calls/outbound', data)
}

// 结束通话
export const endCall = (callId: string, data: {
  endTime: string
  duration: number
  notes?: string
  followUpRequired?: boolean
}) => {
  return api.put<CallRecord>(`/calls/records/${callId}/end`, data)
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
  }>('/calls/followups', params)
}

// 创建跟进记录
export const createFollowUpRecord = (data: Omit<FollowUpRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  return api.post<FollowUpRecord>('/calls/followups', data)
}

// 更新跟进记录
export const updateFollowUpRecord = (id: string, data: Partial<FollowUpRecord>) => {
  return api.put<FollowUpRecord>(`/calls/followups/${id}`, data)
}

// 删除跟进记录
export const deleteFollowUpRecord = (id: string) => {
  return api.delete(`/calls/followups/${id}`)
}

// 获取通话统计
export const getCallStatistics = (params: {
  startDate?: string
  endDate?: string
  userId?: string
  department?: string
  groupBy?: 'day' | 'week' | 'month'
}) => {
  return api.get<CallStatistics>('/calls/statistics', params)
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
  }>('/calls/recordings', params)
}

// 下载录音
export const downloadRecording = (recordingId: string) => {
  return api.get(`/calls/recordings/${recordingId}/download`)
}

// 删除录音
export const deleteRecording = (recordingId: string) => {
  return api.delete(`/calls/recordings/${recordingId}`)
}

// 获取电话配置
export const getPhoneConfig = (userId?: string) => {
  return api.get<PhoneConfig>('/calls/config', userId ? { userId } : undefined)
}

// 更新电话配置
export const updatePhoneConfig = (data: Partial<PhoneConfig>) => {
  return api.put<PhoneConfig>('/calls/config', data)
}

// 测试电话连接
export const testPhoneConnection = () => {
  return api.post<{
    success: boolean
    message: string
    latency?: number
  }>('/calls/test-connection')
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
  }>(`/customers/${customerId}/calls`, params)
}

// 导出通话记录
export const exportCallRecords = (params: {
  startDate?: string
  endDate?: string
  userId?: string
  callType?: string
  format?: 'excel' | 'csv'
}) => {
  return api.get('/calls/export', params)
}


// ==================== Mock数据 ====================

// localStorage键名
const CALL_RECORDS_KEY = 'crm_call_records'
const FOLLOW_UP_RECORDS_KEY = 'crm_follow_up_records'
const CALL_STATISTICS_KEY = 'crm_call_statistics'
const PHONE_CONFIG_KEY = 'crm_phone_config'
const RECORDINGS_KEY = 'crm_call_recordings'

// 生成Mock通话记录
const generateMockCallRecords = (): CallRecord[] => {
  const now = new Date()
  const records: CallRecord[] = []

  // 模拟客户数据
  const mockCustomers = [
    { id: 'customer_1', name: '张三', phone: '13800138001' },
    { id: 'customer_2', name: '李四', phone: '13800138002' },
    { id: 'customer_3', name: '王五', phone: '13800138003' },
    { id: 'customer_4', name: '赵六', phone: '13800138004' },
    { id: 'customer_5', name: '孙七', phone: '13800138005' }
  ]

  // 模拟用户数据
  const mockUsers = [
    { id: 'admin', name: '管理员', department: '管理部' },
    { id: 'sales1', name: '张销售', department: '销售一部' },
    { id: 'sales2', name: '李销售', department: '销售二部' }
  ]

  // 生成最近7天的通话记录
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 7)
    const hoursAgo = Math.floor(Math.random() * 24)
    const minutesAgo = Math.floor(Math.random() * 60)

    const startTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000 - minutesAgo * 60 * 1000)
    const duration = Math.floor(Math.random() * 600) + 30 // 30秒到10分钟
    const endTime = new Date(startTime.getTime() + duration * 1000)

    const customer = mockCustomers[Math.floor(Math.random() * mockCustomers.length)]
    const user = mockUsers[Math.floor(Math.random() * mockUsers.length)]
    const callType = Math.random() > 0.5 ? 'outbound' : 'inbound'
    const statuses: Array<'connected' | 'missed' | 'busy' | 'failed' | 'rejected'> = ['connected', 'missed', 'busy', 'failed', 'rejected']
    const callStatus = statuses[Math.floor(Math.random() * statuses.length)]

    records.push({
      id: `call_${Date.now()}_${i}`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      callType,
      callStatus,
      startTime: startTime.toISOString(),
      endTime: callStatus === 'connected' ? endTime.toISOString() : undefined,
      duration: callStatus === 'connected' ? duration : 0,
      recordingUrl: callStatus === 'connected' && Math.random() > 0.3 ? `/mock/recordings/call_${i}.mp3` : undefined,
      notes: callStatus === 'connected' ? `通话记录${i + 1}` : undefined,
      followUpRequired: Math.random() > 0.7,
      userId: user.id,
      userName: user.name,
      department: user.department,
      createdAt: startTime.toISOString(),
      updatedAt: startTime.toISOString()
    })
  }

  // 按时间倒序排列
  return records.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
}

// 生成Mock跟进记录
const generateMockFollowUpRecords = (): FollowUpRecord[] => {
  const records: FollowUpRecord[] = []
  const now = new Date()

  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 7)
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    records.push({
      id: `followup_${Date.now()}_${i}`,
      callId: `call_${Date.now()}_${i}`,
      customerId: `customer_${(i % 5) + 1}`,
      customerName: ['张三', '李四', '王五', '赵六', '孙七'][i % 5],
      followUpType: ['call', 'visit', 'email', 'message'][Math.floor(Math.random() * 4)] as any,
      content: `跟进内容${i + 1}`,
      nextFollowUpDate: new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)] as any,
      status: ['pending', 'completed', 'cancelled'][Math.floor(Math.random() * 3)] as any,
      userId: ['admin', 'sales1', 'sales2'][Math.floor(Math.random() * 3)],
      userName: ['管理员', '张销售', '李销售'][Math.floor(Math.random() * 3)],
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString()
    })
  }

  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// 初始化Mock数据
const initMockData = () => {
  // 初始化通话记录
  if (!localStorage.getItem(CALL_RECORDS_KEY)) {
    const records = generateMockCallRecords()
    localStorage.setItem(CALL_RECORDS_KEY, JSON.stringify(records))
    console.log('[Call API] 初始化Mock通话记录:', records.length, '条')
  }

  // 初始化跟进记录
  if (!localStorage.getItem(FOLLOW_UP_RECORDS_KEY)) {
    const records = generateMockFollowUpRecords()
    localStorage.setItem(FOLLOW_UP_RECORDS_KEY, JSON.stringify(records))
    console.log('[Call API] 初始化Mock跟进记录:', records.length, '条')
  }
}

// 获取Mock通话记录
const getMockCallRecords = (params: any = {}) => {
  initMockData()

  let records: CallRecord[] = JSON.parse(localStorage.getItem(CALL_RECORDS_KEY) || '[]')

  // 筛选
  if (params.customerId) {
    records = records.filter(r => r.customerId === params.customerId)
  }
  if (params.callType) {
    records = records.filter(r => r.callType === params.callType)
  }
  if (params.callStatus) {
    records = records.filter(r => r.callStatus === params.callStatus)
  }
  if (params.userId) {
    records = records.filter(r => r.userId === params.userId)
  }
  if (params.startDate) {
    records = records.filter(r => new Date(r.startTime) >= new Date(params.startDate))
  }
  if (params.endDate) {
    records = records.filter(r => new Date(r.startTime) <= new Date(params.endDate))
  }

  // 分页
  const page = params.page || 1
  const pageSize = params.pageSize || 20
  const total = records.length
  const start = (page - 1) * pageSize
  const end = start + pageSize

  return {
    records: records.slice(start, end),
    total,
    page,
    pageSize
  }
}

// 获取Mock统计数据
const getMockCallStatistics = (params: unknown = {}) => {
  initMockData()

  const records: CallRecord[] = JSON.parse(localStorage.getItem(CALL_RECORDS_KEY) || '[]')

  // 筛选日期范围
  let filteredRecords = records
  if (params.startDate) {
    filteredRecords = filteredRecords.filter(r => new Date(r.startTime) >= new Date(params.startDate))
  }
  if (params.endDate) {
    filteredRecords = filteredRecords.filter(r => new Date(r.startTime) <= new Date(params.endDate))
  }

  const totalCalls = filteredRecords.length
  const connectedCalls = filteredRecords.filter(r => r.callStatus === 'connected').length
  const missedCalls = filteredRecords.filter(r => r.callStatus === 'missed').length
  const totalDuration = filteredRecords.reduce((sum, r) => sum + r.duration, 0)
  const averageDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0
  const connectionRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0

  // 按日期分组统计
  const dailyStatsMap = new Map<string, { calls: number; duration: number; connected: number }>()
  filteredRecords.forEach(record => {
    const date = record.startTime.split('T')[0]
    const stats = dailyStatsMap.get(date) || { calls: 0, duration: 0, connected: 0 }
    stats.calls++
    stats.duration += record.duration
    if (record.callStatus === 'connected') stats.connected++
    dailyStatsMap.set(date, stats)
  })

  const dailyStats = Array.from(dailyStatsMap.entries()).map(([date, stats]) => ({
    date,
    calls: stats.calls,
    duration: stats.duration,
    connectionRate: stats.calls > 0 ? Math.round((stats.connected / stats.calls) * 100) : 0
  })).sort((a, b) => a.date.localeCompare(b.date))

  // 按用户分组统计
  const userStatsMap = new Map<string, { userId: string; userName: string; calls: number; duration: number; connected: number }>()
  filteredRecords.forEach(record => {
    const stats = userStatsMap.get(record.userId) || {
      userId: record.userId,
      userName: record.userName,
      calls: 0,
      duration: 0,
      connected: 0
    }
    stats.calls++
    stats.duration += record.duration
    if (record.callStatus === 'connected') stats.connected++
    userStatsMap.set(record.userId, stats)
  })

  const userStats = Array.from(userStatsMap.values()).map(stats => ({
    userId: stats.userId,
    userName: stats.userName,
    calls: stats.calls,
    duration: stats.duration,
    connectionRate: stats.calls > 0 ? Math.round((stats.connected / stats.calls) * 100) : 0
  }))

  return {
    totalCalls,
    totalDuration,
    averageDuration,
    connectedCalls,
    missedCalls,
    connectionRate,
    dailyStats,
    userStats,
    incomingCalls: filteredRecords.filter(r => r.callType === 'inbound').length,
    outgoingCalls: filteredRecords.filter(r => r.callType === 'outbound').length,
    todayIncrease: Math.floor(Math.random() * 20) + 5
  }
}

// ==================== Mock API实现 ====================

// 重写API方法以支持Mock
const originalGetCallRecords = getCallRecords
export { originalGetCallRecords as getCallRecordsOriginal }

// 导出新的getCallRecords,支持Mock
export const getCallRecordsWithMock = async (params: Parameters<typeof getCallRecords>[0]) => {
  if (shouldUseMockApi()) {
    console.log('[Call API] 使用Mock数据 - getCallRecords')
    return Promise.resolve({ data: getMockCallRecords(params) })
  }
  return originalGetCallRecords(params)
}

// 导出新的getCallStatistics,支持Mock
const originalGetCallStatistics = getCallStatistics
export { originalGetCallStatistics as getCallStatisticsOriginal }

export const getCallStatisticsWithMock = async (params: Parameters<typeof getCallStatistics>[0]) => {
  if (shouldUseMockApi()) {
    console.log('[Call API] 使用Mock数据 - getCallStatistics')
    return Promise.resolve({ data: getMockCallStatistics(params) })
  }
  return originalGetCallStatistics(params)
}

// 导出新的makeOutboundCall,支持Mock
const originalMakeOutboundCall = makeOutboundCall
export { originalMakeOutboundCall as makeOutboundCallOriginal }

export const makeOutboundCallWithMock = async (data: Parameters<typeof makeOutboundCall>[0]) => {
  if (shouldUseMockApi()) {
    console.log('[Call API] 使用Mock数据 - makeOutboundCall', data)

    // 创建新的通话记录
    const records: CallRecord[] = JSON.parse(localStorage.getItem(CALL_RECORDS_KEY) || '[]')
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{"id":"admin","name":"管理员"}')

    const newRecord: CallRecord = {
      id: `call_${Date.now()}`,
      customerId: data.customerId,
      customerName: '客户', // 实际应该从客户数据获取
      customerPhone: data.customerPhone,
      callType: 'outbound',
      callStatus: 'connected', // 模拟接通
      startTime: new Date().toISOString(),
      endTime: undefined,
      duration: 0,
      recordingUrl: undefined,
      notes: data.notes,
      followUpRequired: false,
      userId: currentUser.id,
      userName: currentUser.name,
      department: currentUser.department || '未知部门',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    records.unshift(newRecord)
    localStorage.setItem(CALL_RECORDS_KEY, JSON.stringify(records))

    return Promise.resolve({
      data: {
        callId: newRecord.id,
        status: 'calling',
        message: '正在呼叫...'
      }
    })
  }
  return originalMakeOutboundCall(data)
}

// 导出新的getFollowUpRecords,支持Mock
const originalGetFollowUpRecords = getFollowUpRecords
export { originalGetFollowUpRecords as getFollowUpRecordsOriginal }

export const getFollowUpRecordsWithMock = async (params: Parameters<typeof getFollowUpRecords>[0]) => {
  if (shouldUseMockApi()) {
    console.log('[Call API] 使用Mock数据 - getFollowUpRecords')
    initMockData()

    let records: FollowUpRecord[] = JSON.parse(localStorage.getItem(FOLLOW_UP_RECORDS_KEY) || '[]')

    // 筛选
    if (params.customerId) {
      records = records.filter(r => r.customerId === params.customerId)
    }
    if (params.callId) {
      records = records.filter(r => r.callId === params.callId)
    }
    if (params.status) {
      records = records.filter(r => r.status === params.status)
    }

    // 分页
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const total = records.length
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return Promise.resolve({
      data: {
        records: records.slice(start, end),
        total,
        page,
        pageSize
      }
    })
  }
  return originalGetFollowUpRecords(params)
}

// 初始化Mock数据(页面加载时)
if (typeof window !== 'undefined') {
  initMockData()
}
