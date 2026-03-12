<template>
  <view class="calling-page">
    <!-- 背景渐变 -->
    <view class="bg-gradient"></view>

    <!-- 通话信息 -->
    <view class="call-info">
      <!-- 头像 -->
      <view class="avatar">
        <text class="avatar-text">{{ customerInitial }}</text>
      </view>

      <!-- 客户名称 -->
      <text class="customer-name">{{ customerName }}</text>

      <!-- 电话号码 -->
      <text class="phone-number">{{ maskedPhone }}</text>

      <!-- 通话状态 -->
      <text class="call-status">{{ statusText }}</text>

      <!-- 通话时长 -->
      <text class="call-duration" v-if="callStatus === 'connected'">{{ formattedDuration }}</text>

      <!-- 录音状态指示 -->
      <view class="recording-indicator" v-if="isRecording">
        <view class="recording-dot"></view>
        <text class="recording-text">录音中</text>
      </view>
    </view>

    <!-- 功能按钮区域 -->
    <view class="action-buttons" v-if="callStatus === 'connected'">
      <view class="action-row">
        <view class="action-btn" :class="{ active: isMuted }" @tap="toggleMute">
          <view class="btn-icon">{{ isMuted ? '🔇' : '🔊' }}</view>
          <text class="btn-label">{{ isMuted ? '取消静音' : '静音' }}</text>
        </view>
        <view class="action-btn" :class="{ active: isSpeaker }" @tap="toggleSpeaker">
          <view class="btn-icon">📢</view>
          <text class="btn-label">{{ isSpeaker ? '听筒' : '免提' }}</text>
        </view>
        <view class="action-btn" @tap="showKeypad = !showKeypad">
          <view class="btn-icon">⌨️</view>
          <text class="btn-label">键盘</text>
        </view>
      </view>
    </view>

    <!-- 拨号键盘（可选显示） -->
    <view class="keypad-overlay" v-if="showKeypad" @tap="showKeypad = false">
      <view class="keypad-container" @tap.stop>
        <view class="keypad-display">{{ dtmfInput }}</view>
        <view class="keypad-grid">
          <view class="key" v-for="key in keypadKeys" :key="key" @tap="sendDTMF(key)">
            <text class="key-num">{{ key }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 挂断按钮 -->
    <view class="hangup-section">
      <view class="hangup-btn" @tap="handleHangup">
        <text class="hangup-icon">📞</text>
      </view>
      <text class="hangup-label">结束通话</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { wsService } from '@/services/websocket'
import { callStateService, type CallState } from '@/services/callStateService'

// 页面参数
const callId = ref('')
const customerName = ref('未知客户')
const customerId = ref('')
const phoneNumber = ref('')

// 通话状态
const callStatus = ref<'dialing' | 'ringing' | 'connected' | 'ended'>('dialing')
const callStartTime = ref<number>(0)
const duration = ref(0)
const durationTimer = ref<number | null>(null)

// 功能状态
const isMuted = ref(false)
const isSpeaker = ref(false)
const showKeypad = ref(false)
const dtmfInput = ref('')
const isRecording = ref(false)

// 键盘按键
const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

// 计算属性
const customerInitial = computed(() => {
  return customerName.value?.charAt(0) || '?'
})

const maskedPhone = computed(() => {
  if (!phoneNumber.value || phoneNumber.value.length < 7) return phoneNumber.value
  return phoneNumber.value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
})

const statusText = computed(() => {
  switch (callStatus.value) {
    case 'dialing': return '正在呼叫...'
    case 'ringing': return '对方响铃中...'
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

// 页面加载
onLoad((options: any) => {
  console.log('[Calling] 页面加载, options:', options)
  callId.value = options?.callId || `call_${Date.now()}`
  customerName.value = decodeURIComponent(options?.name || '未知客户')
  customerId.value = options?.customerId || ''
  phoneNumber.value = options?.phone || ''

  // 开始通话流程
  startCall()
})

// 开始通话
const startCall = () => {
  console.log('[Calling] 开始通话流程, phone:', phoneNumber.value)

  // 上报拨号状态
  wsService.reportCallStatus(callId.value, 'dialing')

  // 启动通话状态监听服务
  callStateService.startMonitoring({
    callId: callId.value,
    phoneNumber: phoneNumber.value,
    customerName: customerName.value,
    customerId: customerId.value
  })

  // 设置状态变化回调
  callStateService.onStateChange((state: CallState) => {
    console.log('[Calling] 通话状态变化:', state)
    handleCallStateChange(state)
  })

  // 设置通话结束回调
  callStateService.onCallEnd((callInfo, callDuration) => {
    console.log('[Calling] 通话结束回调:', callInfo, callDuration)
    duration.value = callDuration
    // callStateService 会自动跳转到结束页面
  })

  // 调用系统拨号
  makeSystemCall()
}

// 处理通话状态变化
const handleCallStateChange = (state: CallState) => {
  switch (state) {
    case 'ringing':
      callStatus.value = 'ringing'
      break
    case 'offhook':
      // 通话已接通
      callStatus.value = 'connected'
      callStartTime.value = Date.now()
      startDurationTimer()
      // 开始录音指示
      isRecording.value = true
      break
    case 'ended':
      callStatus.value = 'ended'
      stopDurationTimer()
      isRecording.value = false
      break
  }
}

// 调用系统拨号
const makeSystemCall = () => {
  if (!phoneNumber.value) {
    console.error('[Calling] 电话号码为空')
    return
  }

  console.log('[Calling] 调用系统拨号:', phoneNumber.value)

  // #ifdef APP-PLUS
  // 使用 plus.device.dial 拨打电话
  plus.device.dial(phoneNumber.value, false)
  console.log('[Calling] plus.device.dial 已调用')
  // #endif

  // #ifndef APP-PLUS
  // H5 或其他平台使用 uni.makePhoneCall
  uni.makePhoneCall({
    phoneNumber: phoneNumber.value,
    success: () => {
      console.log('[Calling] uni.makePhoneCall 成功')
    },
    fail: (err) => {
      console.error('[Calling] uni.makePhoneCall 失败:', err)
    }
  })
  // #endif
}

// 开始计时
const startDurationTimer = () => {
  stopDurationTimer()
  durationTimer.value = setInterval(() => {
    duration.value = callStateService.getCurrentDuration()
  }, 1000) as unknown as number
}

// 停止计时
const stopDurationTimer = () => {
  if (durationTimer.value) {
    clearInterval(durationTimer.value)
    durationTimer.value = null
  }
}

// 切换静音
const toggleMute = () => {
  isMuted.value = !isMuted.value
  uni.showToast({
    title: isMuted.value ? '已静音' : '已取消静音',
    icon: 'none'
  })
}

// 切换扬声器/免提
const toggleSpeaker = () => {
  isSpeaker.value = !isSpeaker.value
  uni.showToast({
    title: isSpeaker.value ? '已开启免提' : '已关闭免提',
    icon: 'none'
  })
}

// 发送DTMF
const sendDTMF = (key: string) => {
  dtmfInput.value += key
  uni.showToast({ title: key, icon: 'none', duration: 300 })
}

// 挂断/结束通话
const handleHangup = async () => {
  console.log('[Calling] 用户点击结束通话')

  // 提示用户需要在系统电话界面挂断
  uni.showModal({
    title: '提示',
    content: '请在系统电话界面点击挂断按钮结束通话',
    showCancel: false,
    confirmText: '我知道了'
  })
}

// 监听服务器发来的结束通话指令
const handleCallEndFromServer = (data: any) => {
  console.log('[Calling] 收到服务器结束通话指令:', data)
  if (data.callId === callId.value) {
    // 提示用户
    uni.showModal({
      title: '通话已结束',
      content: 'CRM系统已标记通话结束，请在系统电话界面确认挂断',
      showCancel: false,
      confirmText: '确定',
      success: () => {
        // 跳转到结束页面
        uni.redirectTo({
          url: `/pages/call-ended/index?callId=${callId.value}&name=${encodeURIComponent(customerName.value)}&customerId=${customerId.value}&duration=${duration.value}&hasRecording=${isRecording.value}`
        })
      }
    })
  }
}

onMounted(() => {
  console.log('[Calling] 页面挂载')

  // 保持屏幕常亮
  uni.setKeepScreenOn({ keepScreenOn: true })

  // 监听服务器发来的结束通话指令
  uni.$on('call:end', handleCallEndFromServer)
  uni.$on('ws:call_ended', handleCallEndFromServer)
})

onUnmounted(() => {
  console.log('[Calling] 页面卸载')
  stopDurationTimer()
  uni.setKeepScreenOn({ keepScreenOn: false })

  // 移除监听
  uni.$off('call:end', handleCallEndFromServer)
  uni.$off('ws:call_ended', handleCallEndFromServer)
})
</script>

<style lang="scss" scoped>
.calling-page {
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
  background: linear-gradient(180deg, #2d2d44 0%, #1a1a2e 100%);
}

.call-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120rpx;
  position: relative;
  z-index: 1;
}

.avatar {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(52, 211, 153, 0.3);
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
  margin-bottom: 16rpx;
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

.recording-indicator {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  padding: 8rpx 20rpx;
  background: rgba(239, 68, 68, 0.2);
  border-radius: 20rpx;

  .recording-dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    background: #EF4444;
    margin-right: 10rpx;
    animation: blink 1s infinite;
  }

  .recording-text {
    font-size: 24rpx;
    color: #EF4444;
  }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.action-buttons {
  padding: 60rpx 40rpx;
  position: relative;
  z-index: 1;
}

.action-row {
  display: flex;
  justify-content: space-around;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;

  .btn-icon {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48rpx;
    margin-bottom: 16rpx;
    transition: all 0.2s;
  }

  &.active .btn-icon {
    background: #fff;
  }

  .btn-label {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

.keypad-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.keypad-container {
  background: #2d2d44;
  border-radius: 32rpx;
  padding: 40rpx;
  width: 80%;
}

.keypad-display {
  text-align: center;
  font-size: 48rpx;
  color: #fff;
  min-height: 80rpx;
  margin-bottom: 32rpx;
  letter-spacing: 8rpx;
}

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24rpx;
}

.key {
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    background: rgba(255, 255, 255, 0.2);
  }

  .key-num {
    font-size: 48rpx;
    color: #fff;
    font-weight: 300;
  }
}

.hangup-section {
  padding: 60rpx 0 100rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
}

.hangup-btn {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: #EF4444;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 40rpx rgba(239, 68, 68, 0.4);
  transform: rotate(135deg);

  &:active {
    transform: rotate(135deg) scale(0.95);
  }
}

.hangup-icon {
  font-size: 56rpx;
}

.hangup-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 20rpx;
}
</style>
