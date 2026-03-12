<template>
  <view class="stats-page">
    <!-- 时间筛选 -->
    <view class="filter-tabs">
      <view class="tab" :class="{ active: currentPeriod === 'today' }" @tap="currentPeriod = 'today'">今日</view>
      <view class="tab" :class="{ active: currentPeriod === 'week' }" @tap="currentPeriod = 'week'">本周</view>
      <view class="tab" :class="{ active: currentPeriod === 'month' }" @tap="currentPeriod = 'month'">本月</view>
    </view>

    <!-- 通话概览 -->
    <view class="overview-card">
      <view class="overview-main">
        <text class="overview-number">{{ stats.totalCalls }}</text>
        <text class="overview-label">总通话</text>
      </view>
      <view class="overview-rate">
        <view class="rate-circle">
          <text class="rate-value">{{ stats.connectRate }}%</text>
        </view>
        <text class="rate-label">接通率</text>
      </view>
    </view>

    <!-- 通话分类 -->
    <view class="section">
      <text class="section-title">通话分类</text>
      <view class="stat-cards">
        <view class="stat-card success">
          <text class="card-icon">✅</text>
          <text class="card-value">{{ stats.connectedCalls }}</text>
          <text class="card-label">已接通</text>
        </view>
        <view class="stat-card danger">
          <text class="card-icon">❌</text>
          <text class="card-value">{{ stats.missedCalls }}</text>
          <text class="card-label">未接通</text>
        </view>
      </view>
    </view>

    <!-- 时长统计 -->
    <view class="section">
      <text class="section-title">时长统计</text>
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">总通话时长</text>
          <text class="info-value">{{ formatDuration(stats.totalDuration) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">平均通话时长</text>
          <text class="info-value">{{ formatDuration(stats.avgDuration) }}</text>
        </view>
      </view>
    </view>

    <!-- 呼入呼出 -->
    <view class="section">
      <text class="section-title">呼入/呼出</text>
      <view class="ratio-card">
        <view class="ratio-item">
          <view class="ratio-info">
            <text class="ratio-label">📤 呼出</text>
            <text class="ratio-value">{{ stats.outboundCalls }} ({{ outboundRatio }}%)</text>
          </view>
          <view class="ratio-bar">
            <view class="ratio-fill outbound" :style="{ width: outboundRatio + '%' }"></view>
          </view>
        </view>
        <view class="ratio-item">
          <view class="ratio-info">
            <text class="ratio-label">📥 呼入</text>
            <text class="ratio-value">{{ stats.inboundCalls }} ({{ inboundRatio }}%)</text>
          </view>
          <view class="ratio-bar">
            <view class="ratio-fill inbound" :style="{ width: inboundRatio + '%' }"></view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { getStats, type TodayStats } from '@/api/call'

const userStore = useUserStore()
const currentPeriod = ref<'today' | 'week' | 'month'>('today')

const stats = ref<TodayStats>({
  totalCalls: 0,
  connectedCalls: 0,
  missedCalls: 0,
  inboundCalls: 0,
  outboundCalls: 0,
  totalDuration: 0,
  avgDuration: 0,
  connectRate: 0
})

const outboundRatio = computed(() => {
  if (stats.value.totalCalls === 0) return 0
  return Math.round((stats.value.outboundCalls / stats.value.totalCalls) * 100)
})

const inboundRatio = computed(() => {
  if (stats.value.totalCalls === 0) return 0
  return Math.round((stats.value.inboundCalls / stats.value.totalCalls) * 100)
})

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) {
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}分${sec}秒`
  }
  const hour = Math.floor(seconds / 3600)
  const min = Math.floor((seconds % 3600) / 60)
  return `${hour}小时${min}分`
}

const loadStats = async () => {
  if (!userStore.token) return
  try {
    const data = await getStats(currentPeriod.value)
    stats.value = data
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

watch(currentPeriod, () => {
  loadStats()
})

onShow(() => {
  if (!userStore.token) {
    userStore.restore()
  }
  if (userStore.token) {
    loadStats()
  }
})
</script>

<style lang="scss" scoped>
.stats-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 200rpx;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.filter-tabs {
  display: flex;
  padding: 24rpx;
  gap: 16rpx;
  background: #fff;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #6B7280;
  background: #f5f5f5;
  border-radius: 16rpx;

  &.active {
    background: #34D399;
    color: #fff;
  }
}

.overview-card {
  margin: 24rpx;
  background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
  border-radius: 24rpx;
  padding: 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
}

.overview-main {
  text-align: left;
}

.overview-number {
  font-size: 80rpx;
  font-weight: 700;
  display: block;
}

.overview-label {
  font-size: 28rpx;
  opacity: 0.9;
  display: block;
}

.overview-rate {
  text-align: center;
}

.rate-circle {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.rate-value {
  font-size: 36rpx;
  font-weight: 600;
}

.rate-label {
  font-size: 24rpx;
  opacity: 0.9;
}

.section {
  padding: 0 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 16rpx;
  display: block;
}

.stat-cards {
  display: flex;
  gap: 16rpx;
}

.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

  &.success {
    border-left: 8rpx solid #10B981;
  }

  &.danger {
    border-left: 8rpx solid #EF4444;
  }
}

.card-icon {
  font-size: 40rpx;
  display: block;
  margin-bottom: 12rpx;
}

.card-value {
  font-size: 48rpx;
  font-weight: 700;
  color: #1F2937;
  display: block;
}

.card-label {
  font-size: 24rpx;
  color: #6B7280;
  display: block;
  margin-top: 8rpx;
}

.info-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 8rpx 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  font-size: 30rpx;
  color: #1F2937;
}

.info-value {
  font-size: 30rpx;
  color: #6B7280;
  font-weight: 500;
}

.ratio-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.ratio-item {
  margin-bottom: 24rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.ratio-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.ratio-label {
  font-size: 28rpx;
  color: #1F2937;
}

.ratio-value {
  font-size: 28rpx;
  color: #6B7280;
}

.ratio-bar {
  height: 24rpx;
  background: #f0f0f0;
  border-radius: 12rpx;
  overflow: hidden;
}

.ratio-fill {
  height: 100%;
  border-radius: 12rpx;
  transition: width 0.3s ease;

  &.outbound {
    background: linear-gradient(90deg, #6EE7B7 0%, #34D399 100%);
  }

  &.inbound {
    background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%);
  }
}
</style>
