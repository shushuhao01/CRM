<template>
  <view class="calls-page">
    <!-- 顶部搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          placeholder="搜索客户名称或电话"
          v-model="searchText"
          @input="handleSearch"
        />
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-tabs">
      <view
        class="tab"
        :class="{ active: currentTab === 'all' }"
        @tap="switchTab('all')"
      >
        全部
      </view>
      <view
        class="tab"
        :class="{ active: currentTab === 'missed' }"
        @tap="switchTab('missed')"
      >
        未接
      </view>
    </view>

    <!-- 通话记录列表 -->
    <scroll-view
      class="call-list"
      scroll-y
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 按日期分组 -->
      <view v-for="(group, date) in groupedCalls" :key="date" class="date-group">
        <view class="date-header">{{ date }}</view>

        <view
          v-for="call in group"
          :key="call.id"
          class="call-item"
          @tap="goToDetail(call.id)"
        >
          <!-- 左侧头像 -->
          <view class="call-avatar" :class="getCallTypeClass(call)">
            <text class="avatar-text">{{ getInitial(call.customerName || '') }}</text>
          </view>

          <!-- 中间信息 -->
          <view class="call-info">
            <view class="call-main">
              <text class="customer-name" :class="{ missed: isMissed(call) }">
                {{ call.customerName || '未知' }}
              </text>
              <text class="call-type-icon">{{ getCallIcon(call) }}</text>
            </view>
            <view class="call-sub">
              <text class="phone-masked">{{ maskPhone(call.customerPhone || '') }}</text>
              <!-- 录音状态标签 -->
              <text class="recording-tag" :class="getRecordingClass(call)">
                {{ getRecordingText(call) }}
              </text>
            </view>
          </view>

          <!-- 右侧时间和状态 -->
          <view class="call-right">
            <view class="call-status-tag" :class="getStatusClass(call.callStatus)">
              {{ getStatusText(call.callStatus) }}
            </view>
            <text class="call-time">{{ formatTime(call.startTime) }}</text>
            <view class="call-action" @tap.stop="handleCallback(call)">
              <text class="action-icon">📞</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view class="empty" v-if="callList.length === 0 && !isLoading">
        <text class="empty-icon">📞</text>
        <text class="empty-text">暂无通话记录</text>
        <text class="empty-sub">通话记录将在这里显示</text>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="hasMore && callList.length > 0">
        <text>{{ isLoading ? '加载中...' : '上拉加载更多' }}</text>
      </view>

      <!-- 底部安全区 -->
      <view class="safe-bottom"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { getCallList, type CallRecord } from '@/api/call'
import { makePhoneCall } from '@/utils/device'

const userStore = useUserStore()
const currentTab = ref<'all' | 'missed'>('all')
const searchText = ref('')
const callList = ref<CallRecord[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const isLoading = ref(false)
const isRefreshing = ref(false)

const hasMore = computed(() => callList.value.length < total.value)

onShow(() => {
  console.log('[Calls] onShow, token:', userStore.token ? '有' : '无')
  if (!userStore.token) {
    userStore.restore()
  }
  // 每次显示页面都重新加载
  if (userStore.token || userStore.isLoggedIn) {
    loadData(true)
  }
})

// 监听通话完成事件
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  uni.$on('call:completed', () => {
    console.log('[Calls] 收到通话完成事件，刷新通话记录')
    loadData(true)
  })

  // 监听录音上传成功事件
  uni.$on('recording:uploaded', (callId: string) => {
    console.log('[Calls] 录音上传成功，刷新记录:', callId)
    // 延迟1秒刷新，确保后端已更新
    setTimeout(() => {
      loadData(true)
    }, 1000)
  })
})

onUnmounted(() => {
  uni.$off('call:completed')
  uni.$off('recording:uploaded')
})

// 按日期分组
const groupedCalls = computed(() => {
  const groups: Record<string, CallRecord[]> = {}
  const filtered = searchText.value
    ? callList.value.filter(c =>
        c.customerName?.includes(searchText.value) ||
        c.customerPhone?.includes(searchText.value)
      )
    : callList.value

  filtered.forEach(call => {
    const date = formatDate(call.startTime)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(call)
  })
  return groups
})

const switchTab = (tab: 'all' | 'missed') => {
  currentTab.value = tab
}

const loadData = async (refresh = false) => {
  if (isLoading.value) return
  if (!userStore.token && !userStore.isLoggedIn) {
    console.log('[Calls] 无token，跳过加载')
    return
  }

  if (refresh) {
    page.value = 1
    callList.value = []
  }

  isLoading.value = true
  console.log('[Calls] 开始加载数据, page:', page.value)

  try {
    const params: any = { page: page.value, pageSize }

    // 未接来电筛选
    if (currentTab.value === 'missed') {
      params.callStatus = 'missed'
    }

    const result = await getCallList(params)
    console.log('[Calls] 加载结果:', result)

    if (refresh) {
      callList.value = result.records || []
    } else {
      callList.value.push(...(result.records || []))
    }

    total.value = result.total || 0
    page.value++
  } catch (e: any) {
    console.error('[Calls] 加载通话记录失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

const onRefresh = () => {
  isRefreshing.value = true
  loadData(true)
}

const loadMore = () => {
  if (hasMore.value && !isLoading.value) {
    loadData()
  }
}

const handleSearch = () => {
  // 本地搜索，不需要重新请求
}

watch(currentTab, () => {
  loadData(true)
})

// 工具函数
const formatDate = (dateStr: string) => {
  if (!dateStr) return '未知日期'
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return '今天'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return phone || ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const getInitial = (name: string) => {
  return name?.charAt(0) || '?'
}

const isMissed = (call: CallRecord) => {
  return call.callStatus === 'missed' || call.callStatus === 'rejected'
}

const getCallTypeClass = (call: CallRecord) => {
  if (isMissed(call)) return 'missed'
  return call.callType === 'outbound' ? 'outbound' : 'inbound'
}

const getCallIcon = (call: CallRecord) => {
  if (call.callType === 'outbound') {
    return '↗️'
  }
  return '↙️'
}

// 获取录音状态文本
const getRecordingText = (call: CallRecord) => {
  if (call.hasRecording) {
    return '已上传录音'
  }
  // 如果通话已接通但没有录音，可能是上传失败或未录音
  if (call.callStatus === 'connected' && call.duration > 0) {
    return '未录音'
  }
  return ''
}

// 获取录音状态样式类
const getRecordingClass = (call: CallRecord) => {
  if (call.hasRecording) {
    return 'recording-success'
  }
  if (call.callStatus === 'connected' && call.duration > 0) {
    return 'recording-none'
  }
  return ''
}

// 获取通话状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'connected': '已接通',
    'missed': '未接听',
    'rejected': '已拒绝',
    'busy': '忙线',
    'failed': '失败',
    'no_answer': '无人接听',
    'unreachable': '无法接通'
  }
  return statusMap[status] || status || '未知'
}

// 获取通话状态样式类
const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    'connected': 'status-success',
    'missed': 'status-danger',
    'rejected': 'status-danger',
    'busy': 'status-warning',
    'failed': 'status-danger',
    'no_answer': 'status-warning',
    'unreachable': 'status-danger'
  }
  return classMap[status] || 'status-default'
}

const goToDetail = (callId: string) => {
  uni.navigateTo({ url: `/pages/call-detail/index?id=${callId}` })
}

const handleCallback = async (call: CallRecord) => {
  uni.showModal({
    title: '确认拨打',
    content: `确定要拨打 ${call.customerName || '该客户'} 吗？`,
    success: async (res) => {
      if (res.confirm && call.customerPhone) {
        await makePhoneCall(call.customerPhone)
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.calls-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.search-bar {
  padding: 16rpx 24rpx;
  background: #fff;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 16rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #1F2937;
  background: transparent;
}

.filter-tabs {
  display: flex;
  padding: 16rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab {
  padding: 12rpx 32rpx;
  font-size: 28rpx;
  color: #6B7280;
  background: #f5f5f5;
  border-radius: 16rpx;
  margin-right: 16rpx;

  &.active {
    background: #34D399;
    color: #fff;
  }
}

.call-list {
  flex: 1;
  padding: 0 20rpx;
  overflow-x: hidden;
  box-sizing: border-box;
}

.date-group {
  margin-top: 20rpx;
}

.date-header {
  padding: 12rpx 8rpx;
  font-size: 24rpx;
  color: #6B7280;
  font-weight: 500;
}

.call-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
  width: 100%;

  &:active {
    background: #f9fafb;
  }
}

.call-avatar {
  width: 72rpx;
  min-width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  flex-shrink: 0;

  &.outbound {
    background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
  }

  &.inbound {
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  }

  &.missed {
    background: linear-gradient(135deg, #fca5a5 0%, #ef4444 100%);
  }
}

.avatar-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}

.call-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.call-main {
  display: flex;
  align-items: center;
}

.customer-name {
  font-size: 30rpx;
  color: #1F2937;
  font-weight: 500;
  margin-right: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200rpx;

  &.missed {
    color: #EF4444;
  }
}

.call-type-icon {
  font-size: 22rpx;
  flex-shrink: 0;
}

.call-sub {
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.phone-masked {
  font-size: 24rpx;
  color: #6B7280;
}

.recording-tag {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;

  &.recording-success {
    background: rgba(52, 211, 153, 0.15);
    color: #10B981;
  }

  &.recording-none {
    background: rgba(156, 163, 175, 0.15);
    color: #6B7280;
  }

  &.recording-failed {
    background: rgba(239, 68, 68, 0.15);
    color: #EF4444;
  }
}

.call-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  margin-left: 12rpx;
  gap: 8rpx;
}

.call-status-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;

  &.status-success {
    background: rgba(52, 211, 153, 0.15);
    color: #10B981;
  }

  &.status-danger {
    background: rgba(239, 68, 68, 0.15);
    color: #EF4444;
  }

  &.status-warning {
    background: rgba(245, 158, 11, 0.15);
    color: #F59E0B;
  }

  &.status-default {
    background: rgba(156, 163, 175, 0.15);
    color: #6B7280;
  }
}

.call-time {
  font-size: 24rpx;
  color: #9CA3AF;
  margin-bottom: 10rpx;
  white-space: nowrap;
}

.call-action {
  width: 56rpx;
  height: 56rpx;
  background: rgba(52, 211, 153, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon {
  font-size: 26rpx;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 30rpx;
  color: #6B7280;
  margin-bottom: 8rpx;
}

.empty-sub {
  font-size: 26rpx;
  color: #9CA3AF;
}

.load-more {
  text-align: center;
  padding: 32rpx;

  text {
    font-size: 26rpx;
    color: #9CA3AF;
  }
}

.safe-bottom {
  height: 180rpx;
}
</style>
