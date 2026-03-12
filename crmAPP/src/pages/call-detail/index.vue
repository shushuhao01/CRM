<template>
  <view class="call-detail-page">
    <!-- 顶部客户信息 -->
    <view class="customer-header">
      <view class="avatar">
        <text class="avatar-text">{{ customerInitial }}</text>
      </view>
      <text class="customer-name">{{ callDetail?.customerName || '未知客户' }}</text>
      <text class="phone-masked">{{ maskPhone(callDetail?.customerPhone) }}</text>
      <view class="call-result-badge" :class="statusClass">
        {{ statusText }}
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <view class="action-btn" @tap="handleCall">
        <view class="btn-icon call">
          <text class="icon-text">☎</text>
        </view>
        <text class="btn-label">回拨</text>
      </view>
      <view class="action-btn" @tap="handleMessage">
        <view class="btn-icon message">
          <text class="icon-text">✉</text>
        </view>
        <text class="btn-label">短信</text>
      </view>
    </view>

    <!-- 通话信息卡片 -->
    <view class="info-card">
      <view class="card-title">通话信息</view>

      <view class="info-row">
        <text class="info-label">通话类型</text>
        <view class="type-badge" :class="callDetail?.callType">
          <text>{{ callTypeText }}</text>
        </view>
      </view>

      <view class="info-row">
        <text class="info-label">通话状态</text>
        <view class="status-badge" :class="statusClass">
          {{ statusText }}
        </view>
      </view>

      <view class="info-row">
        <text class="info-label">开始时间</text>
        <text class="info-value">{{ formatDateTime(callDetail?.startTime) }}</text>
      </view>

      <view class="info-row">
        <text class="info-label">通话时长</text>
        <text class="info-value highlight">{{ formatDuration(callDetail?.duration) }}</text>
      </view>

      <view class="info-row" v-if="callDetail?.endTime">
        <text class="info-label">结束时间</text>
        <text class="info-value">{{ formatDateTime(callDetail?.endTime) }}</text>
      </view>

      <view class="info-row" v-if="callDetail?.hasRecording">
        <text class="info-label">录音</text>
        <view class="recording-btn" @tap="playRecording">
          <text class="recording-icon">▶</text>
          <text class="recording-text">播放录音</text>
        </view>
      </view>
    </view>

    <!-- 跟进记录卡片 -->
    <view class="info-card">
      <view class="card-title">跟进记录</view>

      <view class="info-row" v-if="callDetail?.callTags?.length">
        <text class="info-label">标签</text>
        <view class="tags">
          <text class="tag" v-for="tag in callDetail.callTags" :key="tag">{{ tag }}</text>
        </view>
      </view>

      <view class="info-row" v-if="callDetail?.followUpRequired !== undefined">
        <text class="info-label">需要跟进</text>
        <text class="info-value">{{ callDetail.followUpRequired ? '是' : '否' }}</text>
      </view>

      <view class="notes-section" v-if="callDetail?.notes">
        <text class="notes-label">备注</text>
        <text class="notes-text">{{ callDetail.notes }}</text>
      </view>

      <view class="empty-notes" v-if="!callDetail?.notes && !callDetail?.callTags?.length">
        <text class="empty-text">暂无跟进记录</text>
      </view>
    </view>

    <!-- 历史跟进记录 -->
    <view class="info-card" v-if="callDetail?.followUpRecords?.length">
      <view class="card-title">历史跟进</view>
      <view class="followup-list">
        <view class="followup-item" v-for="record in callDetail.followUpRecords" :key="record.id">
          <view class="followup-header">
            <text class="followup-user">{{ record.userName }}</text>
            <text class="followup-time">{{ formatDateTime(record.createdAt) }}</text>
          </view>
          <text class="followup-content">{{ record.content }}</text>
          <view class="followup-meta" v-if="record.intention || record.nextFollowUpDate">
            <text class="meta-item" v-if="record.intention">意向: {{ getIntentionText(record.intention) }}</text>
            <text class="meta-item" v-if="record.nextFollowUpDate">下次跟进: {{ formatDate(record.nextFollowUpDate) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作 -->
    <view class="bottom-actions">
      <button class="btn-primary" @tap="handleAddFollowup">
        添加跟进记录
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getCallDetail, type CallDetail } from '@/api/call'
import { makePhoneCall } from '@/utils/device'

const callId = ref('')
const callDetail = ref<CallDetail | null>(null)
const isLoading = ref(false)
const needRefresh = ref(false) // 标记是否需要刷新

// 计算属性
const customerInitial = computed(() => {
  return callDetail.value?.customerName?.charAt(0) || '?'
})

const callTypeText = computed(() => {
  return callDetail.value?.callType === 'outbound' ? '呼出' : '呼入'
})

const statusClass = computed(() => {
  const status = callDetail.value?.callStatus
  if (status === 'connected') return 'success'
  if (status === 'missed' || status === 'rejected') return 'danger'
  return 'warning'
})

const statusText = computed(() => {
  const map: Record<string, string> = {
    connected: '已接通',
    missed: '未接听',
    busy: '忙线',
    failed: '呼叫失败',
    rejected: '已拒接',
    pending: '待处理',
    calling: '拨号中'
  }
  return map[callDetail.value?.callStatus || ''] || callDetail.value?.callStatus || '未知'
})

// 页面加载
onLoad((options: any) => {
  console.log('[CallDetail] onLoad options:', options)
  callId.value = options?.id || ''
  if (callId.value) {
    loadDetail()
  }
})

// 页面显示时刷新数据（从添加跟进记录返回时）
onShow(() => {
  if (needRefresh.value && callId.value) {
    console.log('[CallDetail] onShow - 刷新数据')
    loadDetail()
    needRefresh.value = false
  }
})

// 加载详情
const loadDetail = async () => {
  if (!callId.value) return

  isLoading.value = true
  try {
    const data = await getCallDetail(callId.value)
    callDetail.value = data
    console.log('[CallDetail] 加载详情成功:', JSON.stringify(data))
    console.log('[CallDetail] customerPhone:', data?.customerPhone)
  } catch (e: any) {
    console.error('[CallDetail] 加载通话详情失败:', e.message || e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

// 工具函数
const maskPhone = (phone?: string) => {
  if (!phone || phone.length < 7) return phone || ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hours}:${minutes}`
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '-'
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds === 0) return '0秒'
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  if (min > 0) {
    return `${min}分${sec}秒`
  }
  return `${sec}秒`
}

const getIntentionText = (intention?: string) => {
  const map: Record<string, string> = {
    high: '高意向',
    medium: '一般',
    low: '低意向',
    none: '无意向'
  }
  return map[intention || ''] || intention || '-'
}

// 操作函数
const handleCall = () => {
  const phone = callDetail.value?.customerPhone
  console.log('[CallDetail] handleCall, phone:', phone)

  if (!phone) {
    uni.showToast({ title: '暂无电话号码', icon: 'none' })
    return
  }

  uni.showModal({
    title: '确认回拨',
    content: `确定要拨打 ${callDetail.value?.customerName || '该客户'} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        // 如果电话号码被脱敏了，提示用户
        if (phone.includes('*')) {
          uni.showToast({ title: '号码已脱敏，请手动拨打', icon: 'none' })
        } else {
          await makePhoneCall(phone)
        }
      }
    }
  })
}

const handleMessage = () => {
  const phone = callDetail.value?.customerPhone
  console.log('[CallDetail] handleMessage, phone:', phone)

  if (!phone) {
    uni.showToast({ title: '暂无电话号码', icon: 'none' })
    return
  }

  // #ifdef APP-PLUS
  // 跳转到系统短信
  if (phone.includes('*')) {
    // 号码被脱敏，打开空白短信
    plus.runtime.openURL('sms:')
    uni.showToast({ title: '号码已脱敏，请手动输入', icon: 'none' })
  } else {
    // 使用 plus.runtime.openURL 打开短信
    plus.runtime.openURL(`sms:${phone}`)
  }
  // #endif

  // #ifndef APP-PLUS
  uni.showToast({ title: '请在手机上发送短信', icon: 'none' })
  // #endif
}

const playRecording = () => {
  if (!callDetail.value?.recordingUrl) {
    uni.showToast({ title: '暂无录音', icon: 'none' })
    return
  }

  // 播放录音
  const innerAudioContext = uni.createInnerAudioContext()
  innerAudioContext.src = callDetail.value.recordingUrl
  innerAudioContext.play()

  uni.showToast({ title: '正在播放录音', icon: 'none' })
}

const handleAddFollowup = () => {
  console.log('[CallDetail] handleAddFollowup clicked')
  console.log('[CallDetail] callId:', callId.value)
  console.log('[CallDetail] callDetail:', callDetail.value)

  if (!callId.value) {
    uni.showToast({ title: '通话ID不存在', icon: 'none' })
    return
  }

  // 标记需要刷新
  needRefresh.value = true

  // 构建参数
  const name = encodeURIComponent(callDetail.value?.customerName || '')
  const customerId = callDetail.value?.customerId || ''
  const duration = callDetail.value?.duration || 0
  const hasRecording = callDetail.value?.hasRecording || false

  const url = `/pages/call-ended/index?callId=${callId.value}&name=${name}&customerId=${customerId}&duration=${duration}&hasRecording=${hasRecording}&isEdit=true`

  console.log('[CallDetail] navigateTo:', url)

  uni.navigateTo({
    url,
    success: () => {
      console.log('[CallDetail] navigateTo success')
    },
    fail: (err) => {
      console.error('[CallDetail] navigateTo fail:', err)
      uni.showToast({ title: '跳转失败', icon: 'none' })
    }
  })
}
</script>

<style lang="scss" scoped>
.call-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 180rpx;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.customer-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 32rpx 40rpx;
  background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
  color: #fff;
}

.avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.avatar-text {
  font-size: 56rpx;
  font-weight: 600;
}

.customer-name {
  font-size: 40rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.phone-masked {
  font-size: 28rpx;
  opacity: 0.9;
  margin-bottom: 16rpx;
}

.call-result-badge {
  padding: 8rpx 24rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  background: rgba(255, 255, 255, 0.2);

  &.success {
    background: rgba(255, 255, 255, 0.3);
  }

  &.danger {
    background: rgba(239, 68, 68, 0.8);
  }

  &.warning {
    background: rgba(245, 158, 11, 0.8);
  }
}

.action-buttons {
  display: flex;
  justify-content: center;
  padding: 40rpx 32rpx;
  background: #fff;
  margin-bottom: 24rpx;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 60rpx;

  &:active {
    opacity: 0.8;
  }
}

.btn-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;

  .icon-text {
    font-size: 40rpx;
    color: #fff;
  }

  &.call {
    background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
  }

  &.message {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  }
}

.btn-label {
  font-size: 26rpx;
  color: #6B7280;
}

.info-card {
  background: #fff;
  margin: 0 24rpx 24rpx;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  font-size: 28rpx;
  color: #6B7280;
}

.info-value {
  font-size: 28rpx;
  color: #1F2937;

  &.highlight {
    color: #34D399;
    font-weight: 600;
  }
}

.type-badge {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;

  &.outbound {
    background: rgba(52, 211, 153, 0.1);
    color: #34D399;
  }

  &.inbound {
    background: rgba(59, 130, 246, 0.1);
    color: #3B82F6;
  }
}

.status-badge {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;

  &.success {
    background: rgba(16, 185, 129, 0.1);
    color: #10B981;
  }

  &.danger {
    background: rgba(239, 68, 68, 0.1);
    color: #EF4444;
  }

  &.warning {
    background: rgba(245, 158, 11, 0.1);
    color: #F59E0B;
  }
}

.recording-btn {
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx;
  background: rgba(52, 211, 153, 0.1);
  border-radius: 20rpx;

  &:active {
    background: rgba(52, 211, 153, 0.2);
  }

  .recording-icon {
    font-size: 20rpx;
    color: #34D399;
    margin-right: 8rpx;
  }

  .recording-text {
    font-size: 24rpx;
    color: #34D399;
  }
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  padding: 6rpx 16rpx;
  background: rgba(52, 211, 153, 0.1);
  color: #34D399;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.notes-section {
  padding: 16rpx 0;
}

.notes-label {
  font-size: 26rpx;
  color: #6B7280;
  display: block;
  margin-bottom: 12rpx;
}

.notes-text {
  font-size: 28rpx;
  color: #1F2937;
  line-height: 1.6;
  background: #f9fafb;
  padding: 16rpx;
  border-radius: 12rpx;
}

.empty-notes {
  padding: 32rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #9CA3AF;
}

.followup-list {
  .followup-item {
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }
  }

  .followup-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8rpx;
  }

  .followup-user {
    font-size: 26rpx;
    color: #34D399;
    font-weight: 500;
  }

  .followup-time {
    font-size: 24rpx;
    color: #9CA3AF;
  }

  .followup-content {
    font-size: 28rpx;
    color: #1F2937;
    line-height: 1.5;
  }

  .followup-meta {
    display: flex;
    gap: 24rpx;
    margin-top: 8rpx;
  }

  .meta-item {
    font-size: 24rpx;
    color: #6B7280;
  }
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.btn-primary {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 20rpx;
  border: none;
}
</style>
