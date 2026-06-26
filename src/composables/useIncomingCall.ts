/**
 * 全局来电监听 composable
 *
 * 在 App.vue 中调用，确保无论用户在哪个页面，
 * 都能收到来电弹窗和浏览器通知。
 */
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { webSocketService } from '@/services/webSocketService'
import * as callConfigApi from '@/api/callConfig'
import { ElMessage, ElNotification } from 'element-plus'

export interface IncomingCallData {
  id: string
  customerName: string
  phone: string
  customerId?: string
  customerLevel?: string
  company?: string
  lastCallTime?: string
  callSource?: string
  deviceInfo?: any
  tags?: string[]
  isNewCustomer: boolean
}

export function useIncomingCall() {
  const incomingCallVisible = ref(false)
  const incomingCallData = ref<IncomingCallData | null>(null)
  const callInProgressVisible = ref(false)
  const currentCallData = ref<IncomingCallData | null>(null)
  const callNotes = ref('')
  const isMinimized = ref(false)

  const router = useRouter()

  let unsubIncoming: (() => void) | null = null
  let unsubEnded: (() => void) | null = null
  let unsubConnected: (() => void) | null = null
  let unsubStatus: (() => void) | null = null
  let unsubMessage: (() => void) | null = null
  let activeNotification: Notification | null = null
  let autoCloseTimer: ReturnType<typeof setTimeout> | null = null

  const isOnCallManagementPage = () => {
    return router.currentRoute.value.path === '/service-management/call'
  }

  const handleIncomingCall = (data: any) => {
    if (isOnCallManagementPage()) return

    // 如果来电弹窗已经显示，说明是号码更新（APP先报未知来电再报真实号码）
    if (incomingCallVisible.value && incomingCallData.value) {
      console.log('[GlobalIncoming] 收到来电更新（号码补全）:', data)
      const customerId = data.customerInfo?.customerId || data.customerId
      const customerName = data.customerInfo?.customerName || data.customerName || ''
      const isNewCustomer = !customerId || customerName === '未知来电' || customerName === ''

      const updPhone = data.callerNumber || data.phone || ''
      const validUpdPhone = (updPhone && updPhone !== '未知来电') ? updPhone : incomingCallData.value.phone
      incomingCallData.value = {
        ...incomingCallData.value,
        id: data.callId || incomingCallData.value.id,
        customerName: isNewCustomer ? '新客户来电' : customerName,
        phone: validUpdPhone,
        customerId: customerId || incomingCallData.value.customerId,
        customerLevel: data.customerInfo?.customerLevel || incomingCallData.value.customerLevel,
        company: data.customerInfo?.company || incomingCallData.value.company,
        tags: data.customerInfo?.tags || incomingCallData.value.tags,
        isNewCustomer: validUpdPhone ? !customerId : true,
      }
      console.log('[GlobalIncoming] 弹窗客户信息已更新:', incomingCallData.value.customerName, incomingCallData.value.phone)
      return
    }

    const agentStatus = localStorage.getItem('call_agent_status') || 'ready'
    if (agentStatus === 'busy') {
      console.log('[GlobalIncoming] 忙碌状态，忽略来电')
      return
    }

    if (callInProgressVisible.value) {
      ElNotification({
        title: '来电提醒',
        message: `${data.customerInfo?.customerName || data.customerName || '未知'} (${data.callerNumber || data.phone || ''}) 来电，但您正在通话中`,
        type: 'warning',
        duration: 10000,
      })
      return
    }

    const customerId = data.customerInfo?.customerId || data.customerId
    const customerName = data.customerInfo?.customerName || data.customerName || ''
    const isNewCustomer = !customerId || customerName === '未知来电' || customerName === ''

    const rawPhone = data.callerNumber || data.phone || ''
    const validPhone = (rawPhone && rawPhone !== '未知来电') ? rawPhone : ''
    const incoming: IncomingCallData = {
      id: data.callId,
      customerName: isNewCustomer ? (validPhone ? '新客户来电' : '未知来电') : customerName,
      phone: validPhone,
      customerId: customerId || undefined,
      customerLevel: data.customerInfo?.customerLevel || data.customerLevel,
      company: data.customerInfo?.company || data.company,
      lastCallTime: data.customerInfo?.lastCallTime || data.lastCallTime,
      callSource: data.callSource,
      deviceInfo: data.deviceInfo,
      tags: data.customerInfo?.tags || [],
      isNewCustomer,
    }

    incomingCallData.value = incoming
    incomingCallVisible.value = true

    // 超时安全网：90秒后自动关闭弹窗（防止APP状态未上报导致弹窗卡死）
    if (autoCloseTimer) clearTimeout(autoCloseTimer)
    autoCloseTimer = setTimeout(() => {
      if (incomingCallVisible.value) {
        console.warn('[GlobalIncoming] 弹窗超时90秒未关闭，自动关闭')
        incomingCallVisible.value = false
        incomingCallData.value = null
        closeActiveNotification()
        ElMessage.warning('来电弹窗已超时自动关闭')
      }
    }, 90000)

    // 浏览器级别通知（标签页不是当前窗口时特别有用）
    showBrowserNotification(incoming)
  }

  const showBrowserNotification = (incoming: IncomingCallData) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    closeActiveNotification()

    const typeLabel = incoming.isNewCustomer ? '【新客户】' : '【老客户】'
    const displayName = incoming.customerName || '未知来电'

    activeNotification = new Notification(`${typeLabel} 来电提醒`, {
      body: `${displayName}\n正在呼入，点击查看`,
      icon: '/logo.svg',
      tag: `incoming_call_${incoming.id}`,
      requireInteraction: true,
      silent: false,
    })

    activeNotification.onclick = () => {
      window.focus()
      activeNotification?.close()
      activeNotification = null
    }
  }

  const closeActiveNotification = () => {
    if (activeNotification) {
      activeNotification.close()
      activeNotification = null
    }
  }

  const clearAutoCloseTimer = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer)
      autoCloseTimer = null
    }
  }

  const handleCallEnded = (data: any) => {
    if (isOnCallManagementPage()) return

    console.log('[GlobalIncoming] 收到 call:ended 事件:', data)
    clearAutoCloseTimer()
    closeActiveNotification()

    // 如果来电弹窗还开着，关闭它
    if (incomingCallVisible.value) {
      incomingCallVisible.value = false
      incomingCallData.value = null
    }

    const callId = data?.callId
    if (callInProgressVisible.value && (!callId || currentCallData.value?.id === callId)) {
      callInProgressVisible.value = false
      currentCallData.value = null
      ElMessage.info('通话已结束')
    }
  }

  const answerCall = async () => {
    if (!incomingCallData.value) return
    incomingCallVisible.value = false
    closeActiveNotification()

    currentCallData.value = { ...incomingCallData.value }
    callInProgressVisible.value = true
    callNotes.value = ''
    isMinimized.value = false

    try {
      if (incomingCallData.value.id) {
        await callConfigApi.updateCallStatus(incomingCallData.value.id, 'connected')
      }
    } catch (e) {
      console.error('[GlobalIncoming] 更新接听状态失败:', e)
    }

    ElMessage.success('通话已接通')
  }

  const rejectCall = async () => {
    const callId = incomingCallData.value?.id
    incomingCallVisible.value = false
    incomingCallData.value = null
    closeActiveNotification()

    try {
      if (callId) {
        await callConfigApi.updateCallStatus(callId, 'rejected')
      }
    } catch (e) {
      console.error('[GlobalIncoming] 更新拒绝状态失败:', e)
    }
  }

  const dismissCall = () => {
    clearAutoCloseTimer()
    incomingCallVisible.value = false
    incomingCallData.value = null
    closeActiveNotification()
  }

  const endCall = () => {
    callInProgressVisible.value = false
    currentCallData.value = null
  }

  const viewCustomerDetail = () => {
    const id = incomingCallData.value?.customerId || currentCallData.value?.customerId
    if (id) {
      router.push(`/customer/detail/${id}`)
      incomingCallVisible.value = false
    }
  }

  const addNewCustomer = () => {
    const phone = incomingCallData.value?.phone || currentCallData.value?.phone || ''
    incomingCallVisible.value = false
    router.push({
      path: '/customer/add',
      query: phone ? { phone, from: 'incoming_call' } : undefined,
    })
  }

  const goToCallManagement = () => {
    incomingCallVisible.value = false
    router.push('/service-management/call')
  }

  const handleCallConnected = (data: any) => {
    if (isOnCallManagementPage()) return

    console.log('[GlobalIncoming] 收到 call:connected 事件:', data)
    clearAutoCloseTimer()

    // 来电已在手机端接听，关闭来电弹窗
    if (incomingCallVisible.value) {
      incomingCallVisible.value = false
      closeActiveNotification()
      ElMessage.info('来电已在手机上接听')
    }
  }

  const handleCallStatus = (data: any) => {
    if (isOnCallManagementPage()) return

    console.log('[GlobalIncoming] 收到 call:status 事件:', data)

    if (!incomingCallVisible.value) return

    // 通话状态为 connected 时，说明已在手机端接听，关闭来电弹窗
    if (data?.status === 'connected') {
      clearAutoCloseTimer()
      incomingCallVisible.value = false
      closeActiveNotification()
      ElMessage.info('来电已在手机上接听')
    }

    // 通话状态为 ended/missed/rejected 时，说明已挂断/拒绝，关闭来电弹窗
    if (data?.status === 'ended' || data?.status === 'missed' || data?.status === 'rejected' || data?.status === 'failed') {
      clearAutoCloseTimer()
      incomingCallVisible.value = false
      incomingCallData.value = null
      closeActiveNotification()
    }
  }

  const startListening = () => {
    webSocketService.requestNotificationPermission()

    unsubIncoming = webSocketService.on('call:incoming', (data: any) => {
      console.log('[GlobalIncoming] 收到 call:incoming 事件:', data)
      handleIncomingCall(data)
    })
    unsubEnded = webSocketService.on('call:ended', handleCallEnded)
    unsubConnected = webSocketService.on('call:connected', handleCallConnected)
    unsubStatus = webSocketService.on('call:status', handleCallStatus)

    unsubMessage = webSocketService.onMessage((message) => {
      if (message.type === 'CALL_INCOMING') {
        console.log('[GlobalIncoming] 收到 CALL_INCOMING 消息:', message)
        handleIncomingCall(message.data || message)
      }
    })

    console.log('[GlobalIncoming] 来电监听已启动')
  }

  const stopListening = () => {
    clearAutoCloseTimer()
    unsubIncoming?.()
    unsubEnded?.()
    unsubConnected?.()
    unsubStatus?.()
    unsubMessage?.()
    unsubIncoming = null
    unsubEnded = null
    unsubConnected = null
    unsubStatus = null
    unsubMessage = null
    closeActiveNotification()
  }

  onUnmounted(stopListening)

  return {
    incomingCallVisible,
    incomingCallData,
    callInProgressVisible,
    currentCallData,
    callNotes,
    isMinimized,
    answerCall,
    rejectCall,
    dismissCall,
    endCall,
    viewCustomerDetail,
    addNewCustomer,
    goToCallManagement,
    startListening,
    stopListening,
  }
}
