<template>
  <view class="stats-page">
    <!-- 顶部渐变头部 -->
    <view class="header-bg">
      <view class="header-content">
        <text class="header-title">通话统计</text>
        <text class="header-subtitle">{{ periodLabel }}</text>
      </view>
      <!-- 时间筛选 -->
      <view class="filter-tabs">
        <view class="tab" :class="{ active: currentPeriod === 'today' }" @tap="currentPeriod = 'today'">今日</view>
        <view class="tab" :class="{ active: currentPeriod === 'week' }" @tap="currentPeriod = 'week'">本周</view>
        <view class="tab" :class="{ active: currentPeriod === 'month' }" @tap="currentPeriod = 'month'">本月</view>
      </view>

      <!-- 核心数据卡片 -->
      <view class="hero-card">
        <view class="hero-left">
          <text class="hero-number">{{ stats.totalCalls }}</text>
          <text class="hero-label">总通话数</text>
        </view>
        <view class="hero-divider"></view>
        <view class="hero-right">
          <view class="rate-ring">
            <view class="rate-ring-bg"></view>
            <view class="rate-ring-fill" :style="rateRingStyle"></view>
            <view class="rate-ring-inner">
              <text class="rate-num">{{ stats.connectRate }}</text>
              <text class="rate-pct">%</text>
            </view>
          </view>
          <text class="hero-label">接通率</text>
        </view>
      </view>
    </view>

    <!-- 通话分类 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">通话分类</text>
      </view>
      <view class="classify-row">
        <view class="classify-card connected">
          <view class="classify-icon-wrap success-bg">
            <text class="classify-icon">📞</text>
          </view>
          <view class="classify-info">
            <text class="classify-value">{{ stats.connectedCalls }}</text>
            <text class="classify-label">已接通</text>
          </view>
        </view>
        <view class="classify-card missed">
          <view class="classify-icon-wrap danger-bg">
            <text class="classify-icon">📵</text>
          </view>
          <view class="classify-info">
            <text class="classify-value">{{ stats.missedCalls }}</text>
            <text class="classify-label">未接通</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 时长统计 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">通话时长</text>
      </view>
      <view class="duration-card">
        <view class="duration-item">
          <view class="duration-icon-wrap">
            <text class="duration-icon">⏱️</text>
          </view>
          <view class="duration-info">
            <text class="duration-label">总通话时长</text>
            <text class="duration-value">{{ formatDuration(stats.totalDuration) }}</text>
          </view>
        </view>
        <view class="duration-divider"></view>
        <view class="duration-item">
          <view class="duration-icon-wrap">
            <text class="duration-icon">⏳</text>
          </view>
          <view class="duration-info">
            <text class="duration-label">平均通话时长</text>
            <text class="duration-value">{{ formatDuration(stats.avgDuration) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 呼入呼出分析 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">呼入/呼出分析</text>
      </view>
      <view class="direction-card">
        <view class="direction-row">
          <view class="direction-meta">
            <view class="direction-dot outbound-dot"></view>
            <text class="direction-label">呼出</text>
          </view>
          <text class="direction-value">{{ stats.outboundCalls }}</text>
          <text class="direction-pct">{{ outboundRatio }}%</text>
        </view>
        <view class="direction-bar-wrap">
          <view class="direction-bar outbound-bar" :style="{ width: (outboundRatio || 0) + '%' }"></view>
        </view>

        <view class="direction-row" style="margin-top: 28rpx">
          <view class="direction-meta">
            <view class="direction-dot inbound-dot"></view>
            <text class="direction-label">呼入</text>
          </view>
          <text class="direction-value">{{ stats.inboundCalls }}</text>
          <text class="direction-pct">{{ inboundRatio }}%</text>
        </view>
        <view class="direction-bar-wrap">
          <view class="direction-bar inbound-bar" :style="{ width: (inboundRatio || 0) + '%' }"></view>
        </view>
      </view>
    </view>

    <!-- 效率指标 -->
    <view class="section last-section">
      <view class="section-header">
        <text class="section-title">效率指标</text>
      </view>
      <view class="metric-grid">
        <view class="metric-item">
          <text class="metric-value">{{ stats.connectedCalls }}</text>
          <text class="metric-label">有效通话</text>
          <view class="metric-bar-bg"><view class="metric-bar green" :style="{ width: connectBarWidth }"></view></view>
        </view>
        <view class="metric-item">
          <text class="metric-value">{{ avgCallsPerHour }}</text>
          <text class="metric-label">每小时通话</text>
          <view class="metric-bar-bg"><view class="metric-bar blue" :style="{ width: callsPerHourWidth }"></view></view>
        </view>
        <view class="metric-item">
          <text class="metric-value">{{ formatDuration(stats.avgDuration) }}</text>
          <text class="metric-label">平均时长</text>
          <view class="metric-bar-bg"><view class="metric-bar purple" :style="{ width: avgDurationWidth }"></view></view>
        </view>
        <view class="metric-item">
          <text class="metric-value">{{ stats.connectRate }}%</text>
          <text class="metric-label">接通率</text>
          <view class="metric-bar-bg"><view class="metric-bar orange" :style="{ width: (stats.connectRate || 0) + '%' }"></view></view>
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

const periodLabel = computed(() => {
  const map = { today: '今日数据概览', week: '本周数据概览', month: '本月数据概览' }
  return map[currentPeriod.value]
})

const outboundRatio = computed(() => {
  const total = Number(stats.value.totalCalls) || 0
  const outbound = Number(stats.value.outboundCalls) || 0
  if (total === 0) return 0
  return Math.round((outbound / total) * 100)
})

const inboundRatio = computed(() => {
  const total = Number(stats.value.totalCalls) || 0
  const inbound = Number(stats.value.inboundCalls) || 0
  if (total === 0) return 0
  return Math.round((inbound / total) * 100)
})

const rateRingStyle = computed(() => {
  const rate = Number(stats.value.connectRate) || 0
  const deg = (rate / 100) * 360
  return { background: `conic-gradient(rgba(255,255,255,0.9) ${deg}deg, transparent ${deg}deg)` }
})

const avgCallsPerHour = computed(() => {
  const hours = currentPeriod.value === 'today' ? 8 : currentPeriod.value === 'week' ? 40 : 176
  const total = Number(stats.value.totalCalls) || 0
  if (total === 0) return '0'
  return (total / hours).toFixed(1)
})

const connectBarWidth = computed(() => Math.min(100, Number(stats.value.connectRate) || 0) + '%')
const callsPerHourWidth = computed(() => Math.min(100, parseFloat(avgCallsPerHour.value) * 10) + '%')
const avgDurationWidth = computed(() => Math.min(100, ((Number(stats.value.avgDuration) || 0) / 300) * 100) + '%')

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
  if (!userStore.token && !userStore.isLoggedIn) return
  try {
    const data = await getStats(currentPeriod.value)
    stats.value = data
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

watch(currentPeriod, () => { loadStats() })

onShow(() => {
  if (!userStore.token) userStore.restore()
  if (userStore.token || userStore.isLoggedIn) loadStats()
})
</script>

<style lang="scss" scoped>
.stats-page {
  min-height: 100vh;
  background: #F0F2F5;
  padding-bottom: 200rpx;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

/* ---- 顶部渐变区域 ---- */
.header-bg {
  background: linear-gradient(160deg, #059669 0%, #10B981 40%, #34D399 100%);
  padding: 32rpx 28rpx 0;
  border-radius: 0 0 40rpx 40rpx;
  position: relative;
  overflow: hidden;
}

.header-bg::before {
  content: '';
  position: absolute;
  width: 400rpx;
  height: 400rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  top: -120rpx;
  right: -80rpx;
}

.header-content {
  margin-bottom: 20rpx;

  .header-title {
    font-size: 40rpx;
    font-weight: 700;
    color: #fff;
    display: block;
  }
  .header-subtitle {
    font-size: 24rpx;
    color: rgba(255,255,255,0.75);
    display: block;
    margin-top: 4rpx;
  }
}

.filter-tabs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 28rpx;

  .tab {
    flex: 1;
    text-align: center;
    padding: 16rpx 0;
    font-size: 26rpx;
    color: rgba(255,255,255,0.7);
    background: rgba(255,255,255,0.15);
    border-radius: 24rpx;
    font-weight: 500;
    transition: all 0.2s;

    &.active {
      background: #fff;
      color: #059669;
      font-weight: 600;
      box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.1);
    }
  }
}

/* ---- 核心数据卡片 ---- */
.hero-card {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(12px);
  border-radius: 28rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 28rpx;
  border: 1rpx solid rgba(255,255,255,0.2);
}

.hero-left {
  flex: 1;
  text-align: center;

  .hero-number {
    font-size: 96rpx;
    font-weight: 800;
    color: #fff;
    display: block;
    line-height: 1;
  }
}

.hero-divider {
  width: 2rpx;
  height: 120rpx;
  background: rgba(255,255,255,0.25);
  margin: 0 28rpx;
}

.hero-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-label {
  font-size: 24rpx;
  color: rgba(255,255,255,0.8);
  display: block;
  margin-top: 10rpx;
}

.rate-ring {
  width: 130rpx;
  height: 130rpx;
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rate-ring-bg {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
}

.rate-ring-fill {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.rate-ring-inner {
  position: relative;
  z-index: 2;
  width: 100rpx;
  height: 100rpx;
  background: rgba(5, 150, 105, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  .rate-num {
    font-size: 40rpx;
    font-weight: 700;
    color: #fff;
  }
  .rate-pct {
    font-size: 20rpx;
    color: rgba(255,255,255,0.8);
    margin-top: 4rpx;
  }
}

/* ---- 通用 Section ---- */
.section {
  padding: 0 28rpx;
  margin-top: 28rpx;
}

.last-section {
  margin-bottom: 40rpx;
}

.section-header {
  margin-bottom: 16rpx;

  .section-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #1F2937;
    display: block;
  }
}

/* ---- 通话分类卡片 ---- */
.classify-row {
  display: flex;
  gap: 20rpx;
}

.classify-card {
  flex: 1;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}

.classify-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &.success-bg { background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); }
  &.danger-bg { background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); }

  .classify-icon { font-size: 36rpx; }
}

.classify-info {
  .classify-value {
    font-size: 48rpx;
    font-weight: 700;
    color: #1F2937;
    display: block;
    line-height: 1.1;
  }
  .classify-label {
    font-size: 24rpx;
    color: #6B7280;
    display: block;
    margin-top: 4rpx;
  }
}

/* ---- 时长卡片 ---- */
.duration-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 20rpx 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}

.duration-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
}

.duration-divider {
  height: 1rpx;
  background: #F3F4F6;
}

.duration-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: #F0FDF4;
  display: flex;
  align-items: center;
  justify-content: center;

  .duration-icon { font-size: 28rpx; }
}

.duration-info {
  flex: 1;

  .duration-label {
    font-size: 26rpx;
    color: #6B7280;
    display: block;
  }
  .duration-value {
    font-size: 32rpx;
    font-weight: 600;
    color: #1F2937;
    display: block;
    margin-top: 4rpx;
  }
}

/* ---- 呼入呼出 ---- */
.direction-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}

.direction-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.direction-meta {
  display: flex;
  align-items: center;
  flex: 1;
}

.direction-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 12rpx;

  &.outbound-dot { background: #10B981; }
  &.inbound-dot { background: #3B82F6; }
}

.direction-label {
  font-size: 28rpx;
  color: #374151;
}

.direction-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #1F2937;
  margin-right: 12rpx;
}

.direction-pct {
  font-size: 24rpx;
  color: #9CA3AF;
  min-width: 80rpx;
  text-align: right;
}

.direction-bar-wrap {
  height: 16rpx;
  background: #F3F4F6;
  border-radius: 8rpx;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.direction-bar {
  height: 100%;
  border-radius: 8rpx;
  transition: width 0.5s ease;

  &.outbound-bar { background: linear-gradient(90deg, #6EE7B7, #10B981); }
  &.inbound-bar { background: linear-gradient(90deg, #93C5FD, #3B82F6); }
}

/* ---- 效率指标网格 ---- */
.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.metric-item {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);

  .metric-value {
    font-size: 40rpx;
    font-weight: 700;
    color: #1F2937;
    display: block;
    line-height: 1.2;
  }
  .metric-label {
    font-size: 22rpx;
    color: #9CA3AF;
    display: block;
    margin-top: 4rpx;
    margin-bottom: 12rpx;
  }
}

.metric-bar-bg {
  height: 10rpx;
  background: #F3F4F6;
  border-radius: 5rpx;
  overflow: hidden;
}

.metric-bar {
  height: 100%;
  border-radius: 5rpx;
  transition: width 0.5s ease;

  &.green { background: linear-gradient(90deg, #6EE7B7, #059669); }
  &.blue { background: linear-gradient(90deg, #93C5FD, #2563EB); }
  &.purple { background: linear-gradient(90deg, #C4B5FD, #7C3AED); }
  &.orange { background: linear-gradient(90deg, #FCD34D, #F59E0B); }
}
</style>
