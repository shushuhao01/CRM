import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'

/**
 * 消息轮询与WebSocket管理组合式函数
 * 从 App.vue 拆分，包含 WebSocket 实时推送和轮询降级方案
 */
export function useMessagePolling() {
  const userStore = useUserStore()
  const notificationStore = useNotificationStore()

  // 🔥 消息轮询定时器 - 作为WebSocket的降级方案
  let messagePollingTimer: number | null = null

  // 🔥 WebSocket实时推送连接
  const initWebSocketConnection = async () => {
    if (!userStore.token) {
      console.log('[App] 用户未登录，跳过WebSocket连接')
      return
    }

    try {
      await notificationStore.initWebSocket(userStore.token)
      console.log('[App] 🔌 WebSocket实时推送已初始化')
    } catch (error) {
      console.error('[App] WebSocket初始化失败，将使用轮询降级方案:', error)
    }
  }

  const startMessagePollingTimer = () => {
    // 如果用户未登录，不启动轮询
    if (!userStore.token) {
      console.log('[App] 用户未登录，跳过消息轮询')
      return
    }

    // 设置定时器，每30秒检查一次新消息（WebSocket连接时作为备份，断开时作为主要方案）
    messagePollingTimer = window.setInterval(async () => {
      if (!userStore.token) {
        // 用户已登出，停止轮询
        if (messagePollingTimer) {
          clearInterval(messagePollingTimer)
          messagePollingTimer = null
        }
        return
      }

      // 如果WebSocket已连接，降低轮询频率（仅作为备份同步）
      if (notificationStore.wsStatus === 'connected') {
        // WebSocket已连接，跳过本次轮询
        return
      }

      try {
        await notificationStore.loadMessagesFromAPI()
        console.log('[App] 消息轮询完成（WebSocket降级），未读消息数:', notificationStore.unreadCount)
      } catch {
        // 静默处理错误，避免频繁报错
        console.log('[App] 消息轮询失败（非关键）')
      }
    }, 30000) // 30秒（WebSocket断开时的降级方案）

    console.log('[App] 🔔 消息轮询定时器已启动（WebSocket降级方案，每30秒）')
  }

  // 清理消息轮询和WebSocket
  const cleanupMessagePolling = () => {
    // 🔥 断开WebSocket连接
    notificationStore.disconnectWebSocket()

    // 🔥 清理消息轮询定时器
    if (messagePollingTimer) {
      clearInterval(messagePollingTimer)
      messagePollingTimer = null
    }
  }

  return {
    initWebSocketConnection,
    startMessagePollingTimer,
    cleanupMessagePolling,
  }
}
