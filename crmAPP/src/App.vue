<script setup lang="ts">
import { onLaunch, onShow, onHide, onError } from '@dcloudio/uni-app'
import { useServerStore } from '@/stores/server'
import { useUserStore } from '@/stores/user'
import { incomingCallService } from '@/services/incomingCallService'
import { callStateService } from '@/services/callStateService'
import { wsService } from '@/services/websocket'
import { recordingService } from '@/services/recordingService'

onLaunch(() => {
  console.log('App Launch')
  // 恢复本地存储的配置
  const serverStore = useServerStore()
  const userStore = useUserStore()
  serverStore.restoreFromStorage()
  userStore.restore()

  // #ifdef APP-PLUS
  // 监听系统通话状态变化
  setupCallStateListener()
  // 启动来电检测监听（呼入）
  setupIncomingCallListener()
  // 设置Android返回键处理
  setupBackButtonHandler()
  // #endif
})

onShow(() => {
  console.log('App Show')
  // 检查是否有未完成的通话需要登记
  checkPendingCall()

  // 🔥 回到前台：检查WebSocket连接健康度，后台被挂起产生的"假连接"会在这里被强制重连
  wsService.ensureAlive()

  // #ifdef APP-PLUS
  const userStore = useUserStore()
  if (userStore.isLoggedIn) {
    incomingCallService.syncMissedCallsFromCallLog()
    // 🔥 录音补传兜底：回前台时重试未上传的录音（部分ROM录音落盘延迟/后台上传被系统中断）
    recordingService.retryPendingTasks().catch(() => { /* ignore */ })
    recordingService.startPendingRetryLoop()
  }
  // #endif
})

onHide(() => {
  console.log('App Hide')
  // #ifdef APP-PLUS
  // 退到后台：申请保活（WakeLock续期+常驻通知），尽量维持来电监听与WS连接
  incomingCallService.requestBackgroundKeepAlive()
  // #endif
})

// 全局错误处理
onError((err) => {
  console.error('[App] 全局错误:', err)
})

// 检查是否有未完成的通话
const checkPendingCall = () => {
  // 如果当前有活跃通话（外呼或呼入），不要中断
  if (callStateService.isInCall()) {
    console.log('[App] 当前有活跃的外呼通话，跳过 pendingCall 检查')
    return
  }
  if (incomingCallService.getCurrentIncoming()) {
    console.log('[App] 当前有活跃的呼入通话，跳过 pendingCall 检查')
    return
  }

  const currentCall = uni.getStorageSync('currentCall')
  if (currentCall && currentCall.callId) {
    console.log('[App] 发现未完成的通话:', currentCall.callId)

    // 检查当前页面，避免重复跳转
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const currentRoute = (currentPage as any)?.route || ''

    // 如果已经在通话相关页面，不重复跳转
    if (currentRoute.includes('call-ended') || currentRoute.includes('calling') || currentRoute.includes('incoming-call')) {
      console.log('[App] 已在通话相关页面，跳过')
      return
    }

    // 计算通话时长
    const startTime = new Date(currentCall.startTime).getTime()
    const duration = Math.floor((Date.now() - startTime) / 1000)

    // 清除当前通话记录，避免重复弹出
    uni.removeStorageSync('currentCall')

    // 跳转到登记页面
    setTimeout(() => {
      uni.navigateTo({
        url: `/pages/call-ended/index?callId=${currentCall.callId}&name=${encodeURIComponent(currentCall.customerName || '')}&customerId=${currentCall.customerId || ''}&duration=${duration}&hasRecording=false`,
        fail: (err) => {
          console.error('[App] 跳转失败:', err)
          uni.setStorageSync('currentCall', currentCall)
        }
      })
    }, 500)
  }
}

// #ifdef APP-PLUS
// 读取通话设置
const getCallSettings = () => {
  try {
    const raw = uni.getStorageSync('callSettings')
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        callNotify: parsed.callNotify !== false,
        vibrate: !!parsed.vibrate,
      }
    }
  } catch (_e) {
    // 忽略
  }
  return { callNotify: true, vibrate: false }
}

// 启动来电检测监听服务
const setupIncomingCallListener = () => {
  const userStore = useUserStore()

  // 已登录则立即启动（HTTP 备份通道不依赖 WS）
  if (userStore.isLoggedIn) {
    incomingCallService.startListening()
  }

  // WebSocket 连接后确保监听已启动
  uni.$on('ws:connected', () => {
    console.log('[App] WebSocket已连接，启动来电监听')
    incomingCallService.startListening()
  })

  uni.$on('ws:disconnected', () => {
    // WebSocket断开时不停止监听，还有HTTP备份通道
    console.log('[App] WebSocket断开，来电监听继续（HTTP备份）')
  })

  // 客户匹配确认后更新提示
  uni.$on('incoming:call_confirmed', (info: any) => {
    const settings = getCallSettings()
    if (!settings.callNotify) return

    const name = info.customerName && info.customerName !== '未知来电'
      ? info.customerName
      : info.callerNumber
    uni.showToast({
      title: `来电: ${name}`,
      icon: 'none',
      duration: 3000,
    })
  })

  // 来电检测回调（铃声和振动由 incomingCallService.triggerIncomingNotify 处理）
  incomingCallService.onIncoming((info) => {
    console.log('[App] 检测到来电:', info.callerNumber)
  })

  incomingCallService.onIncomingEnd((info, duration) => {
    console.log('[App] 来电结束:', info.callerNumber, '时长:', duration)
    // 跳转登记页由 incomingCallService 处理，此处刷新首页统计
    uni.$emit('call:completed')
  })
}

// 设置通话状态监听器
const setupCallStateListener = () => {
  // 监听应用从后台返回前台
  // @ts-expect-error - plus.globalEvent 在运行时存在
  plus.globalEvent.addEventListener('resume', () => {
    console.log('[App] 应用从后台返回')
    const userStore = useUserStore()
    if (userStore.isLoggedIn) {
      incomingCallService.startListening()
      incomingCallService.syncMissedCallsFromCallLog()
    }
    // 后台恢复后连接可能已死（Android挂起JS/断网），强制健康检查
    wsService.ensureAlive()
    // 延迟检查，等待系统通话界面完全关闭
    setTimeout(() => {
      checkPendingCall()
    }, 1000)
  })
}

// 设置Android返回键处理（防止误触退出）
const setupBackButtonHandler = () => {
  let lastBackTime = 0
  plus.key.addEventListener('backbutton', () => {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      // 有页面栈，正常返回
      uni.navigateBack({})
    } else {
      // 最后一页，双击退出
      const now = Date.now()
      if (now - lastBackTime < 2000) {
        plus.runtime.quit()
      } else {
        lastBackTime = now
        uni.showToast({
          title: '再按一次退出应用',
          icon: 'none',
          duration: 2000
        })
      }
    }
  })
}
// #endif
</script>

<style lang="scss">
/* 全局样式 */
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  width: 100%;
  overflow-x: hidden;
}

/* 禁止水平滚动 */
html, body, #app {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

/* 通用类 */
.flex-row {
  display: flex;
  flex-direction: row;
}

.flex-col {
  display: flex;
  flex-direction: column;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-1 {
  flex: 1;
}

/* 安全区域 */
.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
