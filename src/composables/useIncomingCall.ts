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
  let unsubMessage: (() => void) | null = null
  let activeNotification: Notification | null = null

  const isOnCallManagementPage = () => {
    return router.currentRoute.value.path === '/service-management/call'
  }

  const handleIncomingCall = (data: any) => {
    if (isOnCallManagementPage()) return

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

    const incoming: IncomingCallData = {
      id: data.callId,
      customerName: isNewCustomer ? '新客户来电' : customerName,
      phone: data.callerNumber || data.phone || '',
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

  const handleCallEnded = (data: any) => {
    if (isOnCallManagementPage()) return

    closeActiveNotification()

    // 如果来电弹窗还开着（未接听），也关掉
    if (incomingCallVisible.value && incomingCallData.value?.id === data?.callId) {
      incomingCallVisible.value = false
      incomingCallData.value = null
    }

    const callId = data?.callId
    if (callInProgressVisible.value && currentCallData.value?.id === callId) {
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

  const startListening = () => {
    webSocketService.requestNotificationPermission()

    unsubIncoming = webSocketService.on('call:incoming', handleIncomingCall)
    unsubEnded = webSocketService.on('call:ended', handleCallEnded)

    unsubMessage = webSocketService.onMessage((message) => {
      if (message.type === 'CALL_INCOMING') {
        handleIncomingCall(message.data || message)
      }
    })
  }

  const stopListening = () => {
    unsubIncoming?.()
    unsubEnded?.()
    unsubMessage?.()
    unsubIncoming = null
    unsubEnded = null
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
