<template>
  <view class="incoming-call-page">
    <view class="bg-gradient"></view>

    <!-- 来电信息卡片 -->
    <view class="call-info">
      <view class="avatar">
        <text class="avatar-text">{{ customerInitial }}</text>
      </view>

      <text class="customer-name">{{ customerName }}</text>

      <text class="phone-number">{{ maskedPhone }}</text>

      <!-- 客户信息标签 -->
      <view class="info-tags" v-if="company || customerLevel">
        <view class="info-tag company-tag" v-if="company">
          <text class="tag-text">{{ company }}</text>
        </view>
        <view class="info-tag level-tag" v-if="customerLevel">
          <text class="tag-text">{{ levelText }}</text>
        </view>
      </view>

      <!-- 通话状态 -->
      <text class="call-status">{{ statusText }}</text>

      <!-- 通话时长 -->
      <text class="call-duration" v-if="callState === 'connected'">{{ formattedDuration }}</text>
    </view>

    <!-- 来电操作提示（响铃中） -->
    <view class="ringing-hint" v-if="callState === 'ringing'">
      <text class="hint-text">请在手机系统界面接听或挂断</text>
    </view>

    <!-- 通话中提示 -->
    <view class="connected-hint" v-if="callState === 'connected'">
      <view class="recording-indicator">
        <view class="recording-dot"></view>
        <text class="recording-text">通话中</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-actions">
      <view class="action-btn back-btn" @tap="goBack">
        <text class="btn-text">返回首页</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { incomingCallService } from '@/services/incomingCallService'

const callerNumber = ref('')
const customerName = ref('未知来电')
const customerId = ref('')
const company = ref('')
const customerLevel = ref('')
const callId = ref('')

const callState = ref<'ringing' | 'connected' | 'ended'>('ringing')
const connectTime = ref(0)
const duration = ref(0)
let durationTimer: ReturnType<typeof setInterval> | null = null

const customerInitial = computed(() => {
  const name = customerName.value
  if (!name || name === '未知来电') return '?'
  return name.charAt(0)
})

const maskedPhone = computed(() => {
  const phone = callerNumber.value
  if (!phone || phone.length < 7) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
})

const levelText = computed(() => {
  const map: Record<string, string> = {
    normal: '普通', silver: '白银', gold: '黄金', diamond: '钻石',
  }
  return map[customerLevel.value] || ''
})

const statusText = computed(() => {
  switch (callState.value) {
    case 'ringing': return '来电响铃中...'
    case 'connected': return '通话中'
    case 'ended': return '通话已结束'
    default: return ''
  }
})

const formattedDuration = computed(() => {
  const min = Math.floor(duration.value / 60)
  const sec = duration.value % 60
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
})

onLoad((options: any) => {
  callerNumber.value = decodeURIComponent(options?.phone || '')
  customerName.value = decodeURIComponent(options?.name || '未知来电')
  customerId.value = options?.customerId || ''
  company.value = decodeURIComponent(options?.company || '')
  customerLevel.value = options?.level || ''
  callId.value = options?.callId || ''

  const stateParam = options?.state || 'ringing'
  callState.value = stateParam as any
  if (stateParam === 'connected') {
    connectTime.value = Date.now()
    startDurationTimer()
  }
})

const startDurationTimer = () => {
  stopDurationTimer()
  durationTimer = setInterval(() => {
    if (connectTime.value > 0) {
      duration.value = Math.floor((Date.now() - connectTime.value) / 1000)
    }
  }, 1000)
}

const stopDurationTimer = () => {
  if (durationTimer) {
    clearInterval(durationTimer)
    durationTimer = null
  }
}

const updateFromService = () => {
  const current = incomingCallService.getCurrentIncoming()
  if (current) {
    if (current.customerName && current.customerName !== '未知来电') {
      customerName.value = current.customerName
    }
    if (current.customerId) customerId.value = current.customerId
    if (current.callId) callId.value = current.callId
    if (current.connectTime && callState.value === 'ringing') {
      callState.value = 'connected'
      connectTime.value = current.connectTime
      startDurationTimer()
    }
  }
}

const handleConfirm = (info: any) => {
  if (info?.customerName && info.customerName !== '未知来电') {
    customerName.value = info.customerName
  }
  if (info?.customerId) customerId.value = info.customerId
  if (info?.callId) callId.value = info.callId
}

const handleEnd = () => {
  callState.value = 'ended'
  stopDurationTimer()
}

const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.switchTab({ url: '/pages/index/index' })
    },
  })
}

let confirmListener: any = null
let endListener: any = null
let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  uni.setKeepScreenOn({ keepScreenOn: true })

  confirmListener = (info: any) => handleConfirm(info)
  uni.$on('incoming:call_confirmed', confirmListener)

  endListener = () => handleEnd()
  uni.$on('call:completed', endListener)

  // 轮询同步来电状态
  pollTimer = setInterval(updateFromService, 1000)
})

onUnmounted(() => {
  stopDurationTimer()
  uni.setKeepScreenOn({ keepScreenOn: false })

  if (confirmListener) uni.$off('incoming:call_confirmed', confirmListener)
  if (endListener) uni.$off('call:completed', endListener)
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<style lang="scss" scoped>
.incoming-call-page {
  min-height: 100vh;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.bg-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60%;
  background: linear-gradient(180deg, #16213e 0%, #1a1a2e 100%);
}

.call-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 140rpx;
  position: relative;
  z-index: 1;
}

.avatar {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(64, 158, 255, 0.3);
}

.avatar-text {
  font-size: 80rpx;
  color: #fff;
  font-weight: bold;
}

.customer-name {
  font-size: 48rpx;
  color: #fff;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.phone-number {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 20rpx;
}

.info-tags {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.info-tag {
  padding: 6rpx 20rpx;
  border-radius: 20rpx;
}

.company-tag {
  background: rgba(255, 255, 255, 0.1);
}

.level-tag {
  background: rgba(52, 211, 153, 0.2);
}

.tag-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.call-status {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16rpx;
}

.call-duration {
  font-size: 56rpx;
  color: #fff;
  font-weight: 300;
  font-family: 'SF Pro Display', -apple-system, sans-serif;
  letter-spacing: 4rpx;
}

.ringing-hint {
  padding: 40rpx;
  text-align: center;
  position: relative;
  z-index: 1;
}

.hint-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.5);
}

.connected-hint {
  padding: 20rpx 40rpx;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.recording-indicator {
  display: flex;
  align-items: center;
  padding: 8rpx 24rpx;
  background: rgba(103, 194, 58, 0.15);
  border-radius: 24rpx;
}

.recording-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #67c23a;
  margin-right: 10rpx;
  animation: blink 1.5s infinite;
}

.recording-text {
  font-size: 24rpx;
  color: #67c23a;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.bottom-actions {
  padding: 60rpx 60rpx 120rpx;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.action-btn {
  padding: 20rpx 60rpx;
  border-radius: 40rpx;
}

.back-btn {
  background: rgba(255, 255, 255, 0.15);
}

.btn-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}
</style>
