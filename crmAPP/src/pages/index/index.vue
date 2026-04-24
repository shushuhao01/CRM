<template>
  <view class="home-page">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-card-main">
        <view class="user-left">
          <view class="avatar">{{ userStore.userInfo?.realName?.charAt(0) || '?' }}</view>
          <view class="info">
            <text class="name">{{ userStore.userInfo?.realName || '未登录' }}</text>
            <text class="dept">{{ userStore.userInfo?.department || '' }}</text>
          </view>
        </view>
        <!-- 重连按钮在右侧 -->
        <view class="user-right" v-if="userStore.isBound && !wsConnected">
          <view class="reconnect-btn" @tap="handleReconnect">
            <view class="reconnect-icon-wrap">
              <text class="reconnect-svg">↺</text>
            </view>
          </view>
        </view>
      </view>
      <!-- 状态信息在下方 -->
      <view class="user-card-footer">
        <view class="status-tag" :class="{ active: userStore.isBound }">
          <text class="status-icon">📱</text>
          <text class="status-label">{{ userStore.isBound ? '已绑定' : '未绑定' }}</text>
        </view>
        <view class="status-tag" :class="connectionStatus">
          <text class="status-icon">📡</text>
          <text class="status-label">{{ connectionText }}</text>
        </view>
      </view>
    </view>

    <!-- 今日概览 -->
    <view class="section">
      <text class="section-title">今日概览</text>
      <view class="stats-card">
        <view class="stat-main">
          <text class="stat-number">{{ todayStats.totalCalls }}</text>
          <text class="stat-label">总通话</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-grid">
          <view class="stat-item">
            <text class="stat-value success">{{ todayStats.connectedCalls }}</text>
            <text class="stat-name">已接通</text>
          </view>
          <view class="stat-item">
            <text class="stat-value danger">{{ todayStats.missedCalls }}</text>
            <text class="stat-name">未接通</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ formatDuration(todayStats.totalDuration) }}</text>
            <text class="stat-name">总时长</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ todayStats.connectRate }}%</text>
            <text class="stat-name">接通率</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="section">
      <text class="section-title">快捷操作</text>
      <view class="quick-actions">
        <view class="action-item" @tap="handleScanBind" v-if="!userStore.isBound">
          <view class="action-icon scan">
            <view class="icon-inner">
              <text class="icon-svg">⎔</text>
            </view>
          </view>
          <text class="action-text">扫码绑定</text>
        </view>
        <view class="action-item" @tap="handleDial">
          <view class="action-icon dial">
            <view class="icon-inner">
              <text class="icon-svg">✆</text>
            </view>
          </view>
          <text class="action-text">手动拨号</text>
        </view>
        <view class="action-item" @tap="handleRefresh">
          <view class="action-icon refresh">
            <view class="icon-inner">
              <text class="icon-svg">⟲</text>
            </view>
          </view>
          <text class="action-text">刷新数据</text>
        </view>
      </view>
    </view>

    <!-- 等待指令提示 -->
    <view class="waiting-card" v-if="userStore.isBound && wsConnected">
      <view class="waiting-animation">
        <view class="pulse-ring"></view>
        <view class="pulse-ring delay"></view>
        <view class="waiting-icon-inner">📡</view>
      </view>
      <text class="waiting-text">等待PC端拨号指令...</text>
      <text class="waiting-sub">保持APP在前台运行</text>
    </view>

    <!-- 未绑定提示 -->
    <view class="bind-card" v-else-if="!userStore.isBound">
      <view class="bind-icon">🔗</view>
      <text class="bind-title">设备未绑定</text>
      <text class="bind-desc">请在PC端生成二维码，然后扫码绑定设备</text>
      <button class="btn-bind" @tap="handleScanBind">扫码绑定设备</button>
    </view>

    <!-- 已绑定但未连接 -->
    <view class="bind-card" v-else>
      <view class="bind-icon">⚠️</view>
      <text class="bind-title">连接已断开</text>
      <text class="bind-desc">请点击重新连接或重新扫码绑定</text>
      <view class="bind-actions">
        <button class="btn-action primary" @tap="handleReconnect">重新连接</button>
        <button class="btn-action secondary" @tap="handleScanBind">重新扫码绑定</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useServerStore } from '@/stores/server'
import { getTodayStats, type TodayStats } from '@/api/call'
import { wsService } from '@/services/websocket'
import { callStateService } from '@/services/callStateService'

const userStore = useUserStore()
const serverStore = useServerStore()
const wsConnected = ref(false)

const todayStats = ref<TodayStats>({
  totalCalls: 0,
  connectedCalls: 0,
  missedCalls: 0,
  inboundCalls: 0,
  outboundCalls: 0,
  totalDuration: 0,
  avgDuration: 0,
  connectRate: 0
})

const connectionStatus = computed(() => {
  if (wsConnected.value) return 'connected'
  if (serverStore.isConnected) return 'connecting'
  return 'disconnected'
})

const connectionText = computed(() => {
  if (wsConnected.value) return '已连接'
  if (serverStore.isConnected) return '连接中'
  return '未连接'
})

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`
  const min = Math.floor(seconds / 60)
  return `${min}分`
}

const loadTodayStats = async () => {
  if (!userStore.token && !userStore.isLoggedIn) return
  try {
    const data = await getTodayStats()
    todayStats.value = data
  } catch (e: any) {
    if (!e.message?.includes('过期')) {
      console.error('加载统计失败:', e)
    }
  }
}

const handleScanBind = () => {
  uni.navigateTo({ url: '/pages/scan/index' })
}

const handleDial = () => {
  uni.navigateTo({ url: '/pages/dialpad/index' })
}

const handleRefresh = () => {
  loadTodayStats()
  uni.showToast({ title: '已刷新', icon: 'success' })
}

const handleReconnect = () => {
  if (userStore.wsToken) {
    uni.showToast({ title: '正在重连...', icon: 'none' })
    wsService.disconnect()
    setTimeout(() => {
      wsService.connect()
    }, 500)
  } else {
    uni.showModal({
      title: '需要重新绑定',
      content: '连接凭证已失效，需要重新扫码绑定设备',
      confirmText: '去扫码',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/scan/index' })
        }
      }
    })
  }
}

onMounted(() => {
  uni.$on('ws:connected', () => { wsConnected.value = true })
  uni.$on('ws:disconnected', () => { wsConnected.value = false })
  // 监听通话完成事件，刷新统计数据
  uni.$on('call:completed', () => {
    console.log('[Index] 收到通话完成事件，刷新统计数据')
    loadTodayStats()
  })
  // 监听需要重新绑定事件
  uni.$on('ws:need_rebind', (data: any) => {
    console.log('[Index] 收到需要重新绑定事件:', data)
    uni.showModal({
      title: '需要重新绑定',
      content: '连接凭证已失效或丢失，需要重新扫码绑定设备',
      confirmText: '去扫码',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/scan/index' })
        }
      }
    })
  })
})

onUnmounted(() => {
  uni.$off('ws:connected')
  uni.$off('ws:disconnected')
  uni.$off('call:completed')
  uni.$off('ws:need_rebind')
})

onShow(() => {
  userStore.restore()
  wsConnected.value = wsService.isConnected

  if (!userStore.token && !userStore.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }

  // 检查是否有未完成的通话需要填写跟进
  checkPendingCall()

  setTimeout(() => {
    loadTodayStats()
    // 只有在未连接时才尝试连接
    if (userStore.isBound && userStore.wsToken && !wsService.isConnected) {
      wsService.connect()
    }
  }, 200)
})

// 检查是否有未完成的通话
const checkPendingCall = () => {
  // 检查是否有刚结束的通话需要填写跟进
  const lastEndedCall = uni.getStorageSync('lastEndedCall')
  if (lastEndedCall && lastEndedCall.callId) {
    console.log('[Index] 发现未完成的通话记录:', lastEndedCall)

    // 清除记录
    uni.removeStorageSync('lastEndedCall')

    // 提示用户填写跟进
    uni.showModal({
      title: '通话已结束',
      content: `与${lastEndedCall.customerName || '客户'}的通话已结束，是否填写跟进记录？`,
      confirmText: '去填写',
      cancelText: '稍后',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({
            url: `/pages/call-ended/index?callId=${lastEndedCall.callId}&name=${encodeURIComponent(lastEndedCall.customerName || '')}&customerId=${lastEndedCall.customerId || ''}&duration=${lastEndedCall.duration || 0}&hasRecording=${lastEndedCall.hasRecording || false}`
          })
        }
      }
    })
  }

  // 检查是否有正在进行的通话（APP被切到后台后恢复）
  const currentCall = uni.getStorageSync('currentCall')
  if (currentCall && currentCall.callId) {
    // 检查通话状态服务是否还在监听
    if (!callStateService.isInCall()) {
      console.log('[Index] 发现未处理的通话记录，可能是APP被切到后台:', currentCall)

      // 计算通话时长
      const startTime = new Date(currentCall.startTime).getTime()
      const duration = Math.floor((Date.now() - startTime) / 1000)

      // 如果通话时间超过5分钟，可能是APP被切到后台后通话已结束
      if (duration > 300) {
        uni.removeStorageSync('currentCall')

        uni.showModal({
          title: '通话可能已结束',
          content: `与${currentCall.customerName || '客户'}的通话可能已结束，是否填写跟进记录？`,
          confirmText: '去填写',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({
                url: `/pages/call-ended/index?callId=${currentCall.callId}&name=${encodeURIComponent(currentCall.customerName || '')}&customerId=${currentCall.customerId || ''}&duration=${duration}&hasRecording=false`
              })
            }
          }
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
  padding-bottom: 200rpx;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.user-card {
  background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  color: #fff;
}

.user-card-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-left {
  display: flex;
  align-items: center;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  font-size: 36rpx;
  font-weight: bold;
}

.info .name {
  font-size: 36rpx;
  font-weight: 600;
  display: block;
}

.info .dept {
  font-size: 26rpx;
  opacity: 0.9;
  margin-top: 4rpx;
  display: block;
}

.user-right {
  display: flex;
  align-items: center;
}

.reconnect-btn {
  width: 80rpx;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    background: rgba(255, 255, 255, 0.35);
    transform: scale(0.95);
  }

  .reconnect-icon-wrap {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .reconnect-svg {
    font-size: 36rpx;
    color: #fff;
  }
}

.user-card-footer {
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.2);
  display: flex;
  gap: 40rpx;
}

.status-tag {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  padding: 10rpx 20rpx;
  border-radius: 20rpx;

  &.active, &.connected {
    background: rgba(255, 255, 255, 0.25);
  }

  &.disconnected {
    background: rgba(239, 68, 68, 0.3);
  }

  .status-icon {
    font-size: 24rpx;
    margin-right: 8rpx;
  }

  .status-label {
    font-size: 24rpx;
  }
}

.section {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 16rpx;
  margin-left: 8rpx;
  display: block;
}

.stats-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.stat-main {
  text-align: center;
  padding-bottom: 24rpx;
}

.stat-number {
  font-size: 72rpx;
  font-weight: 700;
  color: #1F2937;
  display: block;
}

.stat-label {
  font-size: 26rpx;
  color: #6B7280;
  display: block;
}

.stat-divider {
  height: 1rpx;
  background: #f0f0f0;
  margin-bottom: 24rpx;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 36rpx;
  font-weight: 600;
  color: #1F2937;
  display: block;

  &.success { color: #10B981; }
  &.danger { color: #EF4444; }
}

.stat-name {
  font-size: 22rpx;
  color: #6B7280;
  margin-top: 8rpx;
  display: block;
}

.quick-actions {
  display: flex;
  gap: 16rpx;
}

.action-item {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx 20rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

  &:active {
    background: #f9fafb;
    transform: scale(0.98);
  }
}

.action-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16rpx;

  .icon-inner {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-svg {
    font-size: 40rpx;
    color: #fff;
  }

  &.scan {
    background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  }

  &.dial {
    background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
  }

  &.refresh {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  }
}

.action-text {
  font-size: 26rpx;
  color: #1F2937;
}

.waiting-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 48rpx 32rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.waiting-animation {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  margin: 0 auto 24rpx;
}

.pulse-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 4rpx solid #34D399;
  border-radius: 50%;
  animation: pulse 2s ease-out infinite;
  opacity: 0;

  &.delay {
    animation-delay: 1s;
  }
}

@keyframes pulse {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.waiting-icon-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48rpx;
}

.waiting-text {
  font-size: 30rpx;
  color: #1F2937;
  display: block;
  margin-bottom: 8rpx;
}

.waiting-sub {
  font-size: 24rpx;
  color: #6B7280;
  display: block;
}

.bind-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 48rpx 32rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.bind-icon {
  font-size: 60rpx;
  margin-bottom: 16rpx;
}

.bind-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1F2937;
  display: block;
  margin-bottom: 12rpx;
}

.bind-desc {
  font-size: 26rpx;
  color: #6B7280;
  display: block;
  margin-bottom: 32rpx;
}

.btn-bind {
  background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
  color: #fff;
  font-size: 30rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 20rpx;
  border: none;
  width: 80%;
  margin: 0 auto;
}

.bind-actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  width: 80%;
  margin: 0 auto;
}

.btn-action {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  border-radius: 20rpx;
  border: none;
  margin: 0;

  &.primary {
    background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
    color: #fff;
  }

  &.secondary {
    background: #f3f4f6;
    color: #6B7280;
    margin-top: 24rpx;

    &:active {
      background: #e5e7eb;
    }
  }
}

.btn-rebind {
  background: transparent;
  color: #6B7280;
  font-size: 28rpx;
  height: 72rpx;
  line-height: 72rpx;
  border: none;
  margin-top: 16rpx;
}
</style>
