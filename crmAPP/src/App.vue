<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useServerStore } from '@/stores/server'
import { useUserStore } from '@/stores/user'

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
  // #endif
})

onShow(() => {
  console.log('App Show')
  // 检查是否有未完成的通话需要登记
  checkPendingCall()
})

onHide(() => {
  console.log('App Hide')
})

// 检查是否有未完成的通话
const checkPendingCall = () => {
  const currentCall = uni.getStorageSync('currentCall')
  if (currentCall && currentCall.callId) {
    console.log('[App] 发现未完成的通话:', currentCall.callId)

    // 检查当前页面，避免重复跳转
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const currentRoute = currentPage?.route || ''

    // 如果已经在通话结束页面，不重复跳转
    if (currentRoute.includes('call-ended')) {
      console.log('[App] 已在通话结束页面，跳过')
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
          // 如果跳转失败，恢复通话记录
          uni.setStorageSync('currentCall', currentCall)
        }
      })
    }, 500)
  }
}

// #ifdef APP-PLUS
// 设置通话状态监听器
const setupCallStateListener = () => {
  // 监听应用从后台返回前台
  // @ts-expect-error - plus.globalEvent 在运行时存在
  plus.globalEvent.addEventListener('resume', () => {
    console.log('[App] 应用从后台返回')
    // 延迟检查，等待系统通话界面完全关闭
    setTimeout(() => {
      checkPendingCall()
    }, 1000)
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
