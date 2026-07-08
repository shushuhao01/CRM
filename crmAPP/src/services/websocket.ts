/**
 * WebSocket 服务
 * 用于与服务器保持实时通信，接收拨号指令等
 */
import { useUserStore } from '@/stores/user'
import { useServerStore } from '@/stores/server'
import { callStateService } from './callStateService'
import { incomingCallService } from './incomingCallService'
import { APP_VERSION } from '@/config/app'

// 消息类型
export interface WsMessage {
  type: string
  messageId?: string
  timestamp?: number
  data?: any
}

// 拨号请求
export interface DialRequest {
  callId: string
  phoneNumber: string
  customerName?: string
  customerId?: string
  source: string
  operatorId?: string
  operatorName?: string
}

class WebSocketService {
  private socket: UniApp.SocketTask | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10 // 超过后进入慢速重连（不放弃）
  private reconnectDelay = 3000
  private slowReconnectDelay = 60000 // 慢速重连间隔：60秒
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: number | null = null
  private heartbeatInterval = 30000 // 30秒心跳
  private intentionalClose = false // 🔥 标记是否是主动断开
  private lastPongAt = 0 // 最近一次收到服务端心跳应答的时间（检测"假连接"）
  private maxReconnectNotified = false

  // 连接状态
  public isConnected = false

  // 事件回调
  private onDialRequestCallback: ((data: DialRequest) => void) | null = null
  private onDialCancelCallback: ((data: any) => void) | null = null
  private onDeviceUnbindCallback: (() => void) | null = null

  // 连接WebSocket
  connect() {
    const userStore = useUserStore()
    const serverStore = useServerStore()

    // 如果已经连接，不重复连接
    if (this.isConnected && this.socket) {
      console.log('[WebSocket] 已连接，跳过重复连接')
      return
    }

    if (!userStore.wsToken) {
      console.log('[WebSocket] 缺少 wsToken，请重新扫码绑定')
      uni.$emit('ws:need_rebind', { reason: 'missing_token' })
      return
    }

    // 优先使用 userStore 中保存的 wsUrl，否则从 serverStore 计算
    const baseWsUrl = userStore.wsUrl || serverStore.wsUrl
    if (!baseWsUrl) {
      console.log('[WebSocket] 缺少 WebSocket 地址，请重新扫码绑定')
      uni.$emit('ws:need_rebind', { reason: 'missing_url' })
      return
    }

    if (this.socket) {
      console.log('[WebSocket] 已有连接，先关闭')
      this.disconnect()
    }

    // 构建完整的 WebSocket URL
    // 如果 baseWsUrl 已经包含 /ws/mobile，则直接使用
    let wsUrl = baseWsUrl
    if (!wsUrl.includes('/ws/mobile')) {
      wsUrl = `${baseWsUrl}/ws/mobile`
    }

    // 确保使用正确的协议
    if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://')
    } else if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://')
    }

    // 🔥 修复：确保 wsUrl 不包含 /api/v1 前缀
    wsUrl = wsUrl.replace('/api/v1/ws/mobile', '/ws/mobile')
    wsUrl = wsUrl.replace('/api/ws/mobile', '/ws/mobile')

    wsUrl = `${wsUrl}?token=${userStore.wsToken}`

    console.log('[WebSocket] 正在连接...')
    console.log('[WebSocket] wsToken:', userStore.wsToken ? '有' : '无')

    // 新连接建立：清除主动断开标记（避免残留导致后续断线不重连）
    this.intentionalClose = false

    try {
      this.socket = uni.connectSocket({
        url: wsUrl,
        success: () => {
          console.log('[WebSocket] 连接请求已发送')
        },
        fail: (err) => {
          console.error('[WebSocket] 连接请求失败:', JSON.stringify(err))
          // 连接失败时触发重连
          this.scheduleReconnect()
        }
      })

      this.setupListeners()
    } catch (e) {
      console.error('[WebSocket] 创建连接异常:', e)
      this.scheduleReconnect()
    }
  }

  // 设置监听器
  private setupListeners() {
    if (!this.socket) return
    // 记录本次监听绑定的socket实例：旧连接的关闭/错误事件不应影响新连接状态
    const sock = this.socket

    // 连接成功
    this.socket.onOpen(() => {
      console.log('[WebSocket] 连接成功')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.maxReconnectNotified = false
      this.lastPongAt = Date.now()

      // 发送设备上线消息
      this.sendDeviceOnline()

      // 启动心跳
      this.startHeartbeat()

      // 通知UI更新
      uni.$emit('ws:connected')
    })

    // 收到消息
    this.socket.onMessage((res) => {
      try {
        const message: WsMessage = JSON.parse(res.data as string)
        this.handleMessage(message)
      } catch (e) {
        console.error('[WebSocket] 解析消息失败:', e)
      }
    })

    // 连接关闭
    this.socket.onClose((res) => {
      // 旧连接的关闭事件（已被forceReconnect替换）不处理，避免干扰新连接
      if (this.socket !== sock) {
        console.log('[WebSocket] 旧连接关闭事件，忽略')
        return
      }
      console.log('[WebSocket] 连接关闭:', res)
      this.isConnected = false
      this.stopHeartbeat()

      uni.$emit('ws:disconnected')

      // 🔥 只有非主动断开才自动重连
      if (!this.intentionalClose) {
        this.scheduleReconnect()
      }
      this.intentionalClose = false
    })

    // 连接错误
    this.socket.onError((err) => {
      if (this.socket !== sock) return
      // 打印更详细的错误信息
      console.error('[WebSocket] 连接错误:', JSON.stringify(err))
      console.error('[WebSocket] 当前连接URL:', this.getCurrentWsUrl())
      this.isConnected = false
      uni.$emit('ws:error', err)
    })
  }

  // 处理消息
  private handleMessage(message: WsMessage) {
    console.log('[WebSocket] 收到消息:', message.type, message.data)

    switch (message.type) {
      case 'DIAL_REQUEST':
      case 'DIAL_COMMAND':
        // 收到拨号指令 - 直接执行拨号，不弹窗确认
        if (this.onDialRequestCallback && message.data) {
          this.onDialRequestCallback(message.data)
        }
        // 直接执行拨号
        this.executeDial(message.data)
        break

      case 'DIAL_CANCEL':
        // 取消拨号
        if (this.onDialCancelCallback && message.data) {
          this.onDialCancelCallback(message.data)
        }
        break

      case 'CALL_END':
      case 'END_CALL':
        // 服务器发来的结束通话指令（CRM端结束通话）
        // 注意：系统级通话无法真正挂断，只能标记状态并弹出跟进页面
        console.log('[WebSocket] 收到服务器结束通话指令:', message.data)
        uni.$emit('call:end', message.data)
        uni.$emit('ws:call_ended', message.data)

        // 检查是否有当前通话，如果有则跳转到跟进页面
        const currentCall = uni.getStorageSync('currentCall')
        if (currentCall && currentCall.callId === message.data?.callId) {
          const startTime = new Date(currentCall.startTime).getTime()
          const duration = Math.floor((Date.now() - startTime) / 1000)

          // 清除当前通话记录
          uni.removeStorageSync('currentCall')

          // 显示提示
          uni.showModal({
            title: '通话已结束',
            content: 'CRM系统已标记通话结束，请填写跟进记录',
            showCancel: false,
            confirmText: '去填写',
            success: () => {
              uni.navigateTo({
                url: `/pages/call-ended/index?callId=${currentCall.callId}&name=${encodeURIComponent(currentCall.customerName || '')}&customerId=${currentCall.customerId || ''}&duration=${duration}&hasRecording=false`
              })
            }
          })
        }
        break

      case 'INCOMING_CALL_CONFIRMED':
        // 后端确认来电，回传 callId 和客户信息
        console.log('[WebSocket] 收到来电确认:', message.data)
        if (message.data?.callId) {
          incomingCallService.handleIncomingCallConfirmed({
            callId: message.data.callId,
            callerNumber: message.data.callerNumber,
            customerId: message.data.customerId,
            customerName: message.data.customerName,
          })
        }
        break

      case 'DEVICE_UNBIND':
        // 设备被解绑
        if (this.onDeviceUnbindCallback) {
          this.onDeviceUnbindCallback()
        }
        this.handleDeviceUnbind()
        break

      case 'HEARTBEAT_ACK':
      case 'pong':
        // 心跳响应：记录时间，用于检测"假连接"（后台被挂起后socket看似在线实则已断）
        this.lastPongAt = Date.now()
        break

      default:
        console.log('[WebSocket] 未知消息类型:', message.type)
    }
  }

  // 执行拨号 - 直接调用系统拨号，使用callStateService监听通话状态
  private executeDial(data: DialRequest) {
    if (!data || !data.phoneNumber) {
      console.error('[WebSocket] 拨号数据无效:', data)
      return
    }

    console.log('[WebSocket] 执行拨号:', data.phoneNumber, '客户:', data.customerName)

    // 保存当前通话信息到全局，供通话结束后使用
    const callStartTime = new Date().toISOString()
    uni.setStorageSync('currentCall', {
      callId: data.callId,
      phoneNumber: data.phoneNumber,
      customerName: data.customerName || '未知客户',
      customerId: data.customerId || '',
      startTime: callStartTime
    })

    // 上报拨号状态
    this.reportCallStatus(data.callId, 'dialing')

    // 启动通话状态监听服务
    callStateService.startMonitoring({
      callId: data.callId,
      phoneNumber: data.phoneNumber,
      customerName: data.customerName,
      customerId: data.customerId
    })

    // 设置状态变化回调
    callStateService.onStateChange((state, callInfo) => {
      console.log('[WebSocket] 通话状态变化:', state, callInfo)

      if (state === 'offhook') {
        // 通话已接通
        uni.showToast({
          title: '通话已接通',
          icon: 'success',
          duration: 1500
        })
      } else if (state === 'ringing') {
        // 对方响铃中
        uni.showToast({
          title: '对方响铃中...',
          icon: 'none',
          duration: 1500
        })
      }
    })

    // 设置通话结束回调
    callStateService.onCallEnd((callInfo, duration) => {
      console.log('[WebSocket] 通话结束回调:', callInfo, duration)
      // 注意：currentCall 的清除由 callStateService.onCallEnded 内部处理，这里不重复清除
    })

    // 直接调用系统拨号
    // #ifdef APP-PLUS
    plus.device.dial(data.phoneNumber, false)
    console.log('[WebSocket] 系统拨号已发起')

    // 显示提示
    uni.showToast({
      title: '正在拨号...',
      icon: 'none',
      duration: 2000
    })
    // #endif

    // #ifndef APP-PLUS
    uni.makePhoneCall({
      phoneNumber: data.phoneNumber,
      success: () => {
        console.log('[WebSocket] 系统拨号成功')
      },
      fail: (err) => {
        console.error('[WebSocket] 系统拨号失败:', err)
        uni.showToast({ title: '拨号失败', icon: 'none' })
        callStateService.stopMonitoring()
      }
    })
    // #endif
  }

  // 处理设备解绑
  private handleDeviceUnbind() {
    const userStore = useUserStore()
    userStore.clearDeviceInfo()

    uni.showModal({
      title: '设备已解绑',
      content: '您的设备已被管理员解绑，请重新绑定',
      showCancel: false,
      success: () => {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    })
  }

  // 发送消息
  send(type: string, data?: any) {
    if (!this.socket || !this.isConnected) {
      console.warn('[WebSocket] 未连接，无法发送消息')
      return
    }

    const message: WsMessage = {
      type,
      messageId: `msg_${Date.now()}`,
      timestamp: Date.now(),
      data
    }

    this.socket.send({
      data: JSON.stringify(message),
      fail: (err) => {
        console.error('[WebSocket] 发送消息失败:', err)
      }
    })
  }

  // 发送设备上线消息
  private sendDeviceOnline() {
    const userStore = useUserStore()
    this.send('DEVICE_ONLINE', {
      deviceId: userStore.deviceInfo?.deviceId,
      appVersion: APP_VERSION
    })
  }

  // 上报通话状态
  reportCallStatus(callId: string, status: string, extra?: any) {
    this.send('CALL_STATUS', {
      callId,
      status,
      timestamp: new Date().toISOString(),
      ...extra
    })
  }

  // 上报通话结束
  reportCallEnd(callId: string, data: any) {
    this.send('CALL_ENDED', {
      callId,
      ...data
    })
  }

  // 启动心跳
  private startHeartbeat() {
    this.stopHeartbeat()
    this.lastPongAt = Date.now()

    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected) return

      // 🔥 假连接检测：连续2个心跳周期+10秒未收到服务端应答，判定连接已死，强制重连
      // （Android 后台挂起恢复后，socket 对象可能看似正常但底层连接早已断开）
      const silentMs = Date.now() - this.lastPongAt
      if (this.lastPongAt > 0 && silentMs > this.heartbeatInterval * 2 + 10000) {
        console.warn(`[WebSocket] ${Math.round(silentMs / 1000)}秒未收到心跳应答，判定连接已死，强制重连`)
        this.forceReconnect()
        return
      }

      this.send('HEARTBEAT')
    }, this.heartbeatInterval) as unknown as number
  }

  /**
   * 强制重连：不管当前状态如何，关闭旧连接立即重建
   * 用于：心跳应答超时、APP从后台恢复（onShow/resume）
   */
  forceReconnect() {
    console.log('[WebSocket] 强制重连')
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.socket) {
      // 先置空再关闭：旧连接的 onClose 会因实例不匹配被忽略，不会干扰新连接
      const oldSocket = this.socket
      this.socket = null
      try {
        oldSocket.close({})
      } catch (_e) { /* 忽略关闭异常 */ }
    }
    this.isConnected = false
    this.reconnectAttempts = 0
    this.connect()
  }

  /**
   * 检查连接健康状态，不健康则重连（幂等，可在 onShow/resume 高频调用）
   * 返回 true 表示连接健康
   */
  ensureAlive(): boolean {
    const userStore = useUserStore()
    // 未绑定设备时无需连接
    if (!userStore.wsToken) return false

    if (!this.isConnected || !this.socket) {
      console.log('[WebSocket] ensureAlive: 未连接，发起重连')
      this.forceReconnect()
      return false
    }

    // 连接"在线"但心跳应答超时：假连接，强制重连
    const silentMs = Date.now() - this.lastPongAt
    if (this.lastPongAt > 0 && silentMs > this.heartbeatInterval * 2 + 10000) {
      console.log('[WebSocket] ensureAlive: 心跳应答超时，强制重连')
      this.forceReconnect()
      return false
    }

    // 主动发一个心跳，尽快探测连接状态
    this.send('HEARTBEAT')
    return true
  }

  // 停止心跳
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // 重连调度（永不放弃：超过最大次数后转为每60秒慢速重连，保证后台恢复后能自动连回）
  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    let delay: number
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // 通知UI一次（可提示用户检查网络），但继续慢速重连而不是彻底放弃
      if (!this.maxReconnectNotified) {
        console.error('[WebSocket] 达到最大快速重连次数，转为每60秒慢速重连')
        this.maxReconnectNotified = true
        uni.$emit('ws:max_reconnect')
      }
      delay = this.slowReconnectDelay
    } else {
      this.reconnectAttempts++
      delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000)
    }

    console.log(`[WebSocket] ${delay}ms后重连，第${this.reconnectAttempts}次`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  // 断开连接
  disconnect() {
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.intentionalClose = true // 🔥 标记为主动断开，不触发自动重连

    if (this.socket) {
      this.socket.close({})
      this.socket = null
    }

    this.isConnected = false
    // 🔥 断开连接时重置重连计数器，确保手动重连时可用
    this.reconnectAttempts = 0
  }

  // 设置拨号请求回调
  onDialRequest(callback: (data: DialRequest) => void) {
    this.onDialRequestCallback = callback
  }

  // 设置取消拨号回调
  onDialCancel(callback: (data: any) => void) {
    this.onDialCancelCallback = callback
  }

  // 设置设备解绑回调
  onDeviceUnbind(callback: () => void) {
    this.onDeviceUnbindCallback = callback
  }

  // 获取当前WebSocket URL（用于调试）
  private getCurrentWsUrl(): string {
    const userStore = useUserStore()
    const serverStore = useServerStore()
    const baseWsUrl = userStore.wsUrl || serverStore.wsUrl
    if (!baseWsUrl) return '(无wsUrl)'
    let wsUrl = baseWsUrl
    if (!wsUrl.includes('/ws/mobile')) {
      wsUrl = `${baseWsUrl}/ws/mobile`
    }
    return wsUrl
  }
}

// 导出单例
export const wsService = new WebSocketService()
export default wsService
