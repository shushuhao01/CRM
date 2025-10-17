import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CallRecord, FollowUpRecord, CallStatistics, PhoneConfig } from '@/api/call'
import * as callApi from '@/api/call'
import { ElMessage, ElNotification } from 'element-plus'

export const useCallStore = defineStore('call', () => {
  // 状态
  const callRecords = ref<CallRecord[]>([])
  const followUpRecords = ref<FollowUpRecord[]>([])
  const currentCall = ref<CallRecord | null>(null)
  const phoneConfig = ref<PhoneConfig | null>(null)
  const callStatistics = ref<CallStatistics | null>(null)
  const isCallActive = ref(false)
  const callStartTime = ref<Date | null>(null)
  const recordings = ref<Array<{
    id: string
    callId: string
    fileName: string
    fileUrl: string
    duration: number
    fileSize: number
    createdAt: string
  }>>([])

  // 分页信息
  const pagination = ref({
    current: 1,
    pageSize: 20,
    total: 0
  })

  const followUpPagination = ref({
    current: 1,
    pageSize: 20,
    total: 0
  })

  // 计算属性
  const todayCallCount = computed(() => {
    const today = new Date().toDateString()
    return callRecords.value.filter(record => 
      new Date(record.createdAt).toDateString() === today
    ).length
  })

  const todayCallDuration = computed(() => {
    const today = new Date().toDateString()
    return callRecords.value
      .filter(record => new Date(record.createdAt).toDateString() === today)
      .reduce((total, record) => total + record.duration, 0)
  })

  const connectionRate = computed(() => {
    if (callRecords.value.length === 0) return 0
    const connectedCalls = callRecords.value.filter(record => record.callStatus === 'connected').length
    return Math.round((connectedCalls / callRecords.value.length) * 100)
  })

  const pendingFollowUps = computed(() => {
    return followUpRecords.value.filter(record => record.status === 'pending')
  })

  const urgentFollowUps = computed(() => {
    return followUpRecords.value.filter(record => 
      record.status === 'pending' && record.priority === 'urgent'
    )
  })

  // 获取通话记录列表
  const fetchCallRecords = async (params?: {
    page?: number
    pageSize?: number
    customerId?: string
    callType?: string
    callStatus?: string
    startDate?: string
    endDate?: string
    userId?: string
  }) => {
    try {
      const response = await callApi.getCallRecords({
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
        ...params
      })
      
      callRecords.value = response.data.records
      pagination.value = {
        current: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total
      }
      
      return response.data
    } catch (error) {
      console.error('获取通话记录失败:', error)
      ElMessage.error('获取通话记录失败')
      throw error
    }
  }

  // 获取跟进记录列表
  const fetchFollowUpRecords = async (params?: {
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
    try {
      const response = await callApi.getFollowUpRecords({
        page: followUpPagination.value.current,
        pageSize: followUpPagination.value.pageSize,
        ...params
      })
      
      followUpRecords.value = response.data.records
      followUpPagination.value = {
        current: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total
      }
      
      return response.data
    } catch (error) {
      console.error('获取跟进记录失败:', error)
      ElMessage.error('获取跟进记录失败')
      throw error
    }
  }

  // 发起外呼
  const makeOutboundCall = async (data: {
    customerId: string
    customerPhone: string
    notes?: string
  }) => {
    try {
      const response = await callApi.makeOutboundCall(data)
      
      if (response.data.status === 'success') {
        isCallActive.value = true
        callStartTime.value = new Date()
        
        // 创建通话记录
        const callRecord: Omit<CallRecord, 'id' | 'createdAt' | 'updatedAt'> = {
          customerId: data.customerId,
          customerName: '', // 需要从客户信息获取
          customerPhone: data.customerPhone,
          callType: 'outbound',
          callStatus: 'connected',
          startTime: new Date().toISOString(),
          duration: 0,
          notes: data.notes,
          followUpRequired: false,
          userId: '', // 需要从用户信息获取
          userName: '', // 需要从用户信息获取
          department: '' // 需要从用户信息获取
        }
        
        const newRecord = await callApi.createCallRecord(callRecord)
        currentCall.value = newRecord.data
        
        ElNotification({
          title: '外呼成功',
          message: `正在呼叫 ${data.customerPhone}`,
          type: 'success'
        })
        
        return response.data
      } else {
        throw new Error(response.data.message)
      }
    } catch (error) {
      console.error('外呼失败:', error)
      ElMessage.error('外呼失败')
      throw error
    }
  }

  // 结束通话
  const endCall = async (notes?: string, followUpRequired = false) => {
    if (!currentCall.value || !callStartTime.value) {
      ElMessage.warning('没有正在进行的通话')
      return
    }

    try {
      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - callStartTime.value.getTime()) / 1000)
      
      const response = await callApi.endCall(currentCall.value.id, {
        endTime: endTime.toISOString(),
        duration,
        notes,
        followUpRequired
      })
      
      // 更新本地记录
      const index = callRecords.value.findIndex(record => record.id === currentCall.value!.id)
      if (index !== -1) {
        callRecords.value[index] = response.data
      } else {
        callRecords.value.unshift(response.data)
      }
      
      // 重置通话状态
      isCallActive.value = false
      callStartTime.value = null
      currentCall.value = null
      
      ElNotification({
        title: '通话结束',
        message: `通话时长: ${Math.floor(duration / 60)}分${duration % 60}秒`,
        type: 'info'
      })
      
      return response.data
    } catch (error) {
      console.error('结束通话失败:', error)
      ElMessage.error('结束通话失败')
      throw error
    }
  }

  // 创建跟进记录
  const createFollowUp = async (data: Omit<FollowUpRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await callApi.createFollowUpRecord(data)
      followUpRecords.value.unshift(response.data)
      
      ElMessage.success('跟进记录创建成功')
      return response.data
    } catch (error) {
      console.error('创建跟进记录失败:', error)
      ElMessage.error('创建跟进记录失败')
      throw error
    }
  }

  // 更新跟进记录
  const updateFollowUp = async (id: string, data: Partial<FollowUpRecord>) => {
    try {
      const response = await callApi.updateFollowUpRecord(id, data)
      
      const index = followUpRecords.value.findIndex(record => record.id === id)
      if (index !== -1) {
        followUpRecords.value[index] = response.data
      }
      
      ElMessage.success('跟进记录更新成功')
      return response.data
    } catch (error) {
      console.error('更新跟进记录失败:', error)
      ElMessage.error('更新跟进记录失败')
      throw error
    }
  }

  // 获取通话统计
  const fetchCallStatistics = async (params?: {
    startDate?: string
    endDate?: string
    userId?: string
    department?: string
    groupBy?: 'day' | 'week' | 'month'
  }) => {
    try {
      const response = await callApi.getCallStatistics(params)
      callStatistics.value = response.data
      return response.data
    } catch (error) {
      console.error('获取通话统计失败:', error)
      ElMessage.error('获取通话统计失败')
      throw error
    }
  }

  // 获取录音列表
  const fetchRecordings = async (params?: {
    page?: number
    pageSize?: number
    callId?: string
    customerId?: string
    startDate?: string
    endDate?: string
  }) => {
    try {
      const response = await callApi.getRecordings(params)
      recordings.value = response.data.recordings
      return response.data
    } catch (error) {
      console.error('获取录音列表失败:', error)
      ElMessage.error('获取录音列表失败')
      throw error
    }
  }

  // 获取电话配置
  const fetchPhoneConfig = async (userId?: string) => {
    try {
      const response = await callApi.getPhoneConfig(userId)
      phoneConfig.value = response.data
      return response.data
    } catch (error) {
      console.error('获取电话配置失败:', error)
      ElMessage.error('获取电话配置失败')
      throw error
    }
  }

  // 更新电话配置
  const updatePhoneConfig = async (data: Partial<PhoneConfig>) => {
    try {
      const response = await callApi.updatePhoneConfig(data)
      phoneConfig.value = response.data
      
      ElMessage.success('电话配置更新成功')
      return response.data
    } catch (error) {
      console.error('更新电话配置失败:', error)
      ElMessage.error('更新电话配置失败')
      throw error
    }
  }

  // 测试电话连接
  const testConnection = async () => {
    try {
      const response = await callApi.testPhoneConnection()
      
      if (response.data.success) {
        ElMessage.success(`连接测试成功，延迟: ${response.data.latency}ms`)
      } else {
        ElMessage.error(`连接测试失败: ${response.data.message}`)
      }
      
      return response.data
    } catch (error) {
      console.error('连接测试失败:', error)
      ElMessage.error('连接测试失败')
      throw error
    }
  }

  // 获取客户通话历史
  const fetchCustomerCallHistory = async (customerId: string, params?: {
    page?: number
    pageSize?: number
    startDate?: string
    endDate?: string
  }) => {
    try {
      const response = await callApi.getCustomerCallHistory(customerId, params)
      return response.data
    } catch (error) {
      console.error('获取客户通话历史失败:', error)
      ElMessage.error('获取客户通话历史失败')
      throw error
    }
  }

  // 保存通话记录
  const saveCallRecord = async (callData: {
    customerId: string
    customerName: string
    customerPhone: string
    callType: 'inbound' | 'outbound'
    callStatus: 'connected' | 'missed' | 'rejected' | 'busy'
    startTime: string
    endTime?: string
    duration: number
    notes?: string
    followUpRequired?: boolean
  }) => {
    try {
      const response = await callApi.createCallRecord(callData)
      
      // 添加到本地记录
      callRecords.value.unshift(response.data)
      
      ElMessage.success('通话记录保存成功')
      return response.data
    } catch (error) {
      console.error('保存通话记录失败:', error)
      ElMessage.error('保存通话记录失败')
      throw error
    }
  }

  // 获取统计数据
  const getStatistics = async () => {
    try {
      await fetchCallStatistics()
      return {
        todayCalls: todayCallCount.value,
        totalDuration: todayCallDuration.value,
        connectionRate: connectionRate.value,
        activeUsers: 5 // 模拟数据
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
      return {
        todayCalls: 0,
        totalDuration: 0,
        connectionRate: 0,
        activeUsers: 0
      }
    }
  }

  // 重置状态
  const resetState = () => {
    callRecords.value = []
    followUpRecords.value = []
    currentCall.value = null
    phoneConfig.value = null
    callStatistics.value = null
    isCallActive.value = false
    callStartTime.value = null
    recordings.value = []
    pagination.value = { current: 1, pageSize: 20, total: 0 }
    followUpPagination.value = { current: 1, pageSize: 20, total: 0 }
  }

  return {
    // 状态
    callRecords,
    followUpRecords,
    currentCall,
    phoneConfig,
    callStatistics,
    isCallActive,
    callStartTime,
    recordings,
    pagination,
    followUpPagination,
    
    // 计算属性
    todayCallCount,
    todayCallDuration,
    connectionRate,
    pendingFollowUps,
    urgentFollowUps,
    
    // 方法
    fetchCallRecords,
    fetchFollowUpRecords,
    makeOutboundCall,
    endCall,
    createFollowUp,
    updateFollowUp,
    fetchCallStatistics,
    getStatistics,
    fetchRecordings,
    fetchPhoneConfig,
    updatePhoneConfig,
    testConnection,
    fetchCustomerCallHistory,
    saveCallRecord,
    resetState
  }
})