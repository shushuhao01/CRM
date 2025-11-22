import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CallRecord, FollowUpRecord, CallStatistics, PhoneConfig } from '@/api/call'
import * as callApi from '@/api/call'
import { ElMessage, ElNotification } from 'element-plus'
import { shouldUseMockApi } from '@/api/mock'

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

  // 通话状态管理(第二阶段新增)
  const callState = ref<'idle' | 'dialing' | 'ringing' | 'connected' | 'ended'>('idle')
  const callDuration = ref(0)
  const isMuted = ref(false)
  const isRecording = ref(false)
  const callTimer = ref<number | null>(null)
  const currentCallCustomer = ref<{
    id: string
    name: string
    phone: string
  } | null>(null)

  // 呼入状态管理(第三阶段新增)
  const incomingCall = ref<{
    id: string
    customerName: string
    customerPhone: string
    callTime: string
  } | null>(null)
  const isIncomingCallActive = ref(false)

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
      // 使用支持Mock的API
      const apiMethod = shouldUseMockApi() ? callApi.getCallRecordsWithMock : callApi.getCallRecords

      const response = await apiMethod({
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

      // 如果是开发环境且API失败,使用Mock数据
      if (shouldUseMockApi()) {
        console.log('[Call Store] API失败,使用Mock数据')
        const mockResponse = await callApi.getCallRecordsWithMock({
          page: pagination.value.current,
          pageSize: pagination.value.pageSize,
          ...params
        })
        callRecords.value = mockResponse.data.records
        pagination.value = {
          current: mockResponse.data.page,
          pageSize: mockResponse.data.pageSize,
          total: mockResponse.data.total
        }
        return mockResponse.data
      }

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

  // 发起外呼(第二阶段增强)
  const makeOutboundCall = async (data: {
    customerId: string
    customerPhone: string
    customerName?: string
    notes?: string
  }) => {
    try {
      // 使用支持Mock的API
      const apiMethod = shouldUseMockApi() ? callApi.makeOutboundCallWithMock : callApi.makeOutboundCall

      const response = await apiMethod(data)

      // 设置通话状态
      isCallActive.value = true
      callStartTime.value = new Date()
      callState.value = 'dialing'
      callDuration.value = 0
      isMuted.value = false
      isRecording.value = true // 默认开启录音
      currentCallCustomer.value = {
        id: data.customerId,
        name: data.customerName || '未知客户',
        phone: data.customerPhone
      }
      currentCall.value = response.data

      // 模拟通话状态变化
      if (shouldUseMockApi()) {
        // 拨号中 → 响铃中(2秒后)
        setTimeout(() => {
          if (callState.value === 'dialing') {
            callState.value = 'ringing'
          }
        }, 2000)

        // 响铃中 → 已接通(4秒后)
        setTimeout(() => {
          if (callState.value === 'ringing') {
            callState.value = 'connected'
            startCallTimer()
          }
        }, 4000)
      } else {
        // 生产环境直接开始计时
        callState.value = 'connected'
        startCallTimer()
      }

      ElNotification({
        title: '外呼成功',
        message: `正在呼叫 ${data.customerPhone}`,
        type: 'success'
      })

      return response.data
    } catch (error) {
      console.error('外呼失败:', error)
      callState.value = 'idle'
    }
  }

  // 开始通话计时(第二阶段新增)
  const startCallTimer = () => {
    if (callTimer.value) {
      clearInterval(callTimer.value)
    }

    callTimer.value = window.setInterval(() => {
      callDuration.value++
    }, 1000)
  }

  // 停止通话计时(第二阶段新增)
  const stopCallTimer = () => {
    if (callTimer.value) {
      clearInterval(callTimer.value)
      callTimer.value = null
    }
  }

  // 切换静音(第二阶段新增)
  const toggleMute = () => {
    isMuted.value = !isMuted.value
    ElMessage.success(isMuted.value ? '已静音' : '已取消静音')
  }

  // 切换录音(第二阶段新增)
  const toggleRecording = () => {
    isRecording.value = !isRecording.value
    ElMessage.success(isRecording.value ? '录音已开启' : '录音已关闭')
  }

  // 挂断通话(第二阶段新增)
  const hangUp = async (notes?: string) => {
    if (!currentCall.value || !callStartTime.value) {
      ElMessage.warning('没有正在进行的通话')
      return
    }

    try {
      stopCallTimer()

      const endTime = new Date()
      const duration = callDuration.value

      // 保存通话记录
      if (shouldUseMockApi()) {
        // Mock环境:保存到localStorage
        const callRecord = {
          ...currentCall.value,
          endTime: endTime.toISOString(),
          duration,
          notes: notes || '',
          callStatus: duration > 0 ? 'connected' : 'missed',
          hasRecording: isRecording.value
        }

        // 更新localStorage
        const records = JSON.parse(localStorage.getItem('crm_call_records') || '[]')
        const index = records.findIndex((r: unknown) => r.id === callRecord.id)
        if (index !== -1) {
          records[index] = callRecord
        } else {
          records.unshift(callRecord)
        }
        localStorage.setItem('crm_call_records', JSON.stringify(records))

        // 更新本地状态
        const localIndex = callRecords.value.findIndex(r => r.id === callRecord.id)
        if (localIndex !== -1) {
          callRecords.value[localIndex] = callRecord
        } else {
          callRecords.value.unshift(callRecord)
        }
      } else {
        // 生产环境:调用API
        const response = await callApi.endCall(currentCall.value.id, {
          endTime: endTime.toISOString(),
          duration,
          notes,
          followUpRequired: false
        })

        // 更新本地记录
        const index = callRecords.value.findIndex(record => record.id === currentCall.value!.id)
        if (index !== -1) {
          callRecords.value[index] = response.data
        } else {
          callRecords.value.unshift(response.data)
        }
      }

      // 重置通话状态
      callState.value = 'ended'
      setTimeout(() => {
        callState.value = 'idle'
        isCallActive.value = false
        callStartTime.value = null
        currentCall.value = null
        currentCallCustomer.value = null
        callDuration.value = 0
        isMuted.value = false
        isRecording.value = false
      }, 1000)

      ElNotification({
        title: '通话结束',
        message: `通话时长: ${Math.floor(duration / 60)}分${duration % 60}秒`,
        type: 'info'
      })

      // 刷新通话记录列表
      await fetchCallRecords()
    } catch (error) {
      console.error('挂断通话失败:', error)
      ElMessage.error('挂断通话失败')
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
      // 使用支持Mock的API
      const apiMethod = shouldUseMockApi() ? callApi.getCallStatisticsWithMock : callApi.getCallStatistics

      const response = await apiMethod(params)
      callStatistics.value = response.data
      return response.data
    } catch (error) {
      console.error('获取通话统计失败:', error)

      // 如果是开发环境且API失败,使用Mock数据
      if (shouldUseMockApi()) {
        console.log('[Call Store] API失败,使用Mock统计数据')
        const mockResponse = await callApi.getCallStatisticsWithMock(params)
        callStatistics.value = mockResponse.data
        return mockResponse.data
      }

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

  // 接收来电(第三阶段新增)
  const receiveIncomingCall = (data: { id: string; customerName: string; customerPhone: string }) => {
    incomingCall.value = {
      id: data.id,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      callTime: new Date().toISOString()
    }
    isIncomingCallActive.value = true

    ElNotification({
      title: '来电提醒',
      message: `${data.customerName} (${data.customerPhone})`,
      type: 'info',
      duration: 0
    })
  }

  // 接听来电(第三阶段新增)
  const acceptIncomingCall = async () => {
    if (!incomingCall.value) {
      ElMessage.warning('没有来电')
      return
    }

    try {
      isCallActive.value = true
      callStartTime.value = new Date()
      callState.value = 'connected'
      callDuration.value = 0
      isMuted.value = false
      isRecording.value = true
      currentCallCustomer.value = {
        id: incomingCall.value.id,
        name: incomingCall.value.customerName,
        phone: incomingCall.value.customerPhone
      }

      const callRecord: any = {
        id: `call-${Date.now()}`,
        customerId: incomingCall.value.id,
        customerName: incomingCall.value.customerName,
        customerPhone: incomingCall.value.customerPhone,
        callType: 'inbound',
        callStatus: 'connected',
        startTime: new Date().toISOString(),
        duration: 0,
        createdAt: new Date().toISOString()
      }

      currentCall.value = callRecord
      startCallTimer()

      incomingCall.value = null
      isIncomingCallActive.value = false

      ElMessage.success('已接听来电')
    } catch (error) {
      console.error('接听来电失败:', error)
      ElMessage.error('接听来电失败')
      throw error
    }
  }

  // 拒接来电(第三阶段新增)
  const rejectIncomingCall = async () => {
    if (!incomingCall.value) {
      ElMessage.warning('没有来电')
      return
    }

    try {
      if (shouldUseMockApi()) {
        const callRecord = {
          id: `call-${Date.now()}`,
          customerId: incomingCall.value.id,
          customerName: incomingCall.value.customerName,
          customerPhone: incomingCall.value.customerPhone,
          callType: 'inbound',
          callStatus: 'rejected',
          startTime: incomingCall.value.callTime,
          endTime: new Date().toISOString(),
          duration: 0,
          notes: '用户拒接',
          createdAt: new Date().toISOString()
        }

        const records = JSON.parse(localStorage.getItem('crm_call_records') || '[]')
        records.unshift(callRecord)
        localStorage.setItem('crm_call_records', JSON.stringify(records))
        callRecords.value.unshift(callRecord as any)
      }

      incomingCall.value = null
      isIncomingCallActive.value = false

      ElMessage.info('已拒接来电')
      await fetchCallRecords()
    } catch (error) {
      console.error('拒接来电失败:', error)
      ElMessage.error('拒接来电失败')
      throw error
    }
  }

  // 未接来电(第三阶段新增)
  const missIncomingCall = async () => {
    if (!incomingCall.value) {
      return
    }

    try {
      if (shouldUseMockApi()) {
        const callRecord = {
          id: `call-${Date.now()}`,
          customerId: incomingCall.value.id,
          customerName: incomingCall.value.customerName,
          customerPhone: incomingCall.value.customerPhone,
          callType: 'inbound',
          callStatus: 'missed',
          startTime: incomingCall.value.callTime,
          endTime: new Date().toISOString(),
          duration: 0,
          notes: '未接听',
          createdAt: new Date().toISOString()
        }

        const records = JSON.parse(localStorage.getItem('crm_call_records') || '[]')
        records.unshift(callRecord)
        localStorage.setItem('crm_call_records', JSON.stringify(records))
        callRecords.value.unshift(callRecord as unknown)
      }

      incomingCall.value = null
      isIncomingCallActive.value = false

      ElNotification({
        title: '未接来电',
        message: '您有一个未接来电',
        type: 'warning'
      })

      await fetchCallRecords()
    } catch (error) {
      console.error('处理未接来电失败:', error)
    }
  }

  // 重置状态
  const resetState = () => {
    stopCallTimer()
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
    callState.value = 'idle'
    callDuration.value = 0
    isMuted.value = false
    isRecording.value = false
    currentCallCustomer.value = null
    incomingCall.value = null
    isIncomingCallActive.value = false
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

    // 第二阶段新增状态
    callState,
    callDuration,
    isMuted,
    isRecording,
    currentCallCustomer,

    // 第三阶段新增状态
    incomingCall,
    isIncomingCallActive,

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
    resetState,

    // 第二阶段新增方法
    startCallTimer,
    stopCallTimer,
    toggleMute,
    toggleRecording,
    hangUp,

    // 第三阶段新增方法
    receiveIncomingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    missIncomingCall
  }
})
