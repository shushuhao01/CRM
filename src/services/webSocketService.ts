/**
 * WebSocket实时推送客户端服务
 *
 * 功能：
 * - 自动连接/重连管理
 * - 消息实时接收
 * - 桌面通知支持
 * - 提示音播放
 *
 * 创建日期：2025-12-19
 *
 * 注意：需要先安装 socket.io-client: npm install socket.io-client
 */

import { ElNotification } from 'element-plus'

// 消息数据接口
export interface WebSocketMessage {
  id: string
  type: string
  title: string
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  relatedId?: string | number
  relatedType?: string
  actionUrl?: string
  isRead: boolean
  createdAt: string
  timestamp: string
}

// 连接状态
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

// 事件回调类型
type MessageCallback = (message: WebSocketMessage) => void
type StatusCallback = (status: ConnectionStatus) => void
type UnreadCallback = (count: number) => void

class WebSocketService {
  private socket: any = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private isConnecting = false
  private token: string | null = null
  private ioModule: any = null

  // 事件回调
  private messageCallbacks: MessageCallback[] = []
  private statusCallbacks: StatusCallback[] = []
  private unreadCallbacks: UnreadCallback[] = []

  // 当前状态
  private _status: ConnectionStatus = 'disconnected'

  get status(): ConnectionStatus {
    return this._status
  }

  /**
   * 连接WebSocket
   */
  async connect(token: string): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return
    }

    this.token = token
    this.isConnecting = true
    this.updateStatus('connecting')

    try {
      // 动态导入socket.io-client
      if (!this.ioModule) {
        try {
          this.ioModule = await import('socket.io-client')
        } catch (_e) {
          console.warn('[WebSocket] socket.io-client未安装，WebSocket功能不可用')
          console.info('[WebSocket] 请运行: npm install socket.io-client')
          this.isConnecting = false
          this.updateStatus('error')
          return
        }
      }

      // WebSocket需要完整的服务器URL，不能使用相对路径
      let serverUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_BASE_URL || ''

      // 如果是相对路径或空，使用当前页面的origin
      if (!serverUrl || serverUrl.startsWith('/')) {
        serverUrl = window.location.origin
      }

      console.log('[WebSocket] 连接服务器:', serverUrl)

      this.socket = this.ioModule.io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: false
      })

      this.setupEventListeners()
    } catch (error) {
      console.error('[WebSocket] 连接失败:', error)
      this.isConnecting = false
      this.updateStatus('error')
      this.scheduleReconnect()
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('[WebSocket] ✅ 连接成功')
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.updateStatus('connected')

      ElNotification({
        title: '实时消息',
        message: '实时消息推送已连接',
        type: 'success',
        duration: 2000,
        position: 'bottom-right'
      })
    })

    this.socket.on('connected', (data: any) => {
      console.log('[WebSocket] 连接确认:', data)
    })

    this.socket.on('new_message', (data: WebSocketMessage) => {
      console.log('[WebSocket] 📩 收到新消息:', data.title)
      this.handleNewMessage(data)
    })

    this.socket.on('unread_count', (data: { count: number }) => {
      this.unreadCallbacks.forEach(cb => cb(data.count))
    })

    this.socket.on('message_read', (data: { messageId: string; success: boolean }) => {
      console.log('[WebSocket] 消息已读:', data)
    })

    this.socket.on('all_read', (data: { success: boolean }) => {
      console.log('[WebSocket] 全部已读:', data)
    })

    this.socket.on('notification_status', (data: any) => {
      this.handleNotificationStatus(data)
    })

    this.socket.on('channel_notification_status', (data: any) => {
      console.log('[WebSocket] 渠道通知状态:', data)
    })

    this.socket.on('pong', () => {
      // 心跳正常
    })

    this.socket.on('connect_error', (error: Error) => {
      console.error('[WebSocket] 连接错误:', error.message)
      this.isConnecting = false

      if (error.message.includes('认证失败') || error.message.includes('Token')) {
        this.updateStatus('error')
        ElNotification({
          title: '连接失败',
          message: '身份验证失败，请重新登录',
          type: 'error',
          duration: 5000
        })
        return
      }

      // WebSocket连接失败不影响主要功能，静默处理
      console.warn('[WebSocket] 实时推送服务暂时不可用，将在后台重试')
      this.updateStatus('disconnected')
      this.scheduleReconnect()
    })

    this.socket.on('disconnect', (reason: string) => {
      console.log('[WebSocket] 断开连接:', reason)
      this.updateStatus('disconnected')

      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
        this.scheduleReconnect()
      }
    })
  }

  /**
   * 处理新消息
   */
  private handleNewMessage(message: WebSocketMessage): void {
    this.messageCallbacks.forEach(cb => cb(message))
    this.showDesktopNotification(message)
    this.playNotificationSound(message.priority)

    const typeMap: Record<string, 'success' | 'warning' | 'info' | 'error'> = {
      urgent: 'error',
      high: 'warning',
      normal: 'info',
      low: 'info'
    }

    ElNotification({
      title: message.title,
      message: message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content,
      type: typeMap[message.priority] || 'info',
      duration: message.priority === 'urgent' ? 0 : 5000,
      position: 'top-right'
    })
  }

  /**
   * 处理第三方通知状态
   */
  private handleNotificationStatus(data: any): void {
    const { success, message, channelName } = data

    ElNotification({
      title: channelName ? `${channelName} 通知` : '通知状态',
      message: message,
      type: success ? 'success' : 'error',
      duration: 3000,
      position: 'bottom-right'
    })
  }

  /**
   * 显示桌面通知
   */
  private showDesktopNotification(message: WebSocketMessage): void {
    if (!('Notification' in window)) return

    if (Notification.permission === 'granted') {
      const notification = new Notification(message.title, {
        body: message.content,
        icon: '/logo.svg',
        tag: `message_${message.id}`,
        requireInteraction: message.priority === 'urgent'
      })

      notification.onclick = () => {
        window.focus()
        if (message.actionUrl) {
          window.location.href = message.actionUrl
        }
        notification.close()
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission()
    }
  }

  /**
   * 播放提示音
   */
  private playNotificationSound(priority: string): void {
    try {
      const audio = new Audio()
      audio.volume = priority === 'urgent' ? 0.5 : 0.3
      // 简单的提示音（可以替换为实际音频文件）
      audio.src = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'
      audio.play().catch(() => {})
    } catch {
      // 忽略音频播放错误
    }
  }

  /**
   * 更新状态
   */
  private updateStatus(status: ConnectionStatus): void {
    this._status = status
    this.statusCallbacks.forEach(cb => cb(status))
  }

  /**
   * 重连调度
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] 达到最大重连次数')
      this.updateStatus('error')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)

    console.log(`[WebSocket] ${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连`)

    setTimeout(() => {
      if (this.token) {
        this.connect(this.token)
      }
    }, delay)
  }

  markAsRead(messageId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('mark_read', { messageId })
    }
  }

  markAllAsRead(): void {
    if (this.socket?.connected) {
      this.socket.emit('mark_all_read')
    }
  }

  requestUnreadCount(): void {
    if (this.socket?.connected) {
      this.socket.emit('get_unread_count')
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.token = null
    this.reconnectAttempts = 0
    this.isConnecting = false
    this.updateStatus('disconnected')
  }

  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.push(callback)
    return () => {
      const index = this.messageCallbacks.indexOf(callback)
      if (index > -1) this.messageCallbacks.splice(index, 1)
    }
  }

  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.push(callback)
    callback(this._status)
    return () => {
      const index = this.statusCallbacks.indexOf(callback)
      if (index > -1) this.statusCallbacks.splice(index, 1)
    }
  }

  onUnreadCountChange(callback: UnreadCallback): () => void {
    this.unreadCallbacks.push(callback)
    return () => {
      const index = this.unreadCallbacks.indexOf(callback)
      if (index > -1) this.unreadCallbacks.splice(index, 1)
    }
  }

  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

export const webSocketService = new WebSocketService()
export default webSocketService
