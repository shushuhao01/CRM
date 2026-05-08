<template>
  <div class="refund-stats">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-radio-group v-model="quickRange" size="default" @change="handleQuickRange">
        <el-radio-button label="week">本周</el-radio-button>
        <el-radio-button label="month">本月</el-radio-button>
        <el-radio-button label="lastMonth">上月</el-radio-button>
        <el-radio-button label="quarter">近三月</el-radio-button>
        <el-radio-button label="all">全部</el-radio-button>
      </el-radio-group>
      <el-date-picker v-model="customStart" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 150px" @change="handleCustomDate" />
      <el-date-picker v-model="customEnd" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 150px" @change="handleCustomDate" />
    </div>

    <!-- 汇总卡片 -->
    <div class="stat-cards" v-loading="loading">
      <div class="stat-card">
        <div class="stat-value" style="color: #F59E0B">&yen;{{ formatAmount(summary.totalRefundAmount) }}</div>
        <div class="stat-label">退款总额</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #EF4444">{{ summary.totalCount }}</div>
        <div class="stat-label">退款申请数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #10B981">{{ summary.approvalRate }}%</div>
        <div class="stat-label">通过率</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #4C6EF5">{{ summary.avgProcessHours }}h</div>
        <div class="stat-label">平均处理时长</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #10B981">{{ summary.completedCount }}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #9CA3AF">{{ summary.processingCount }}</div>
        <div class="stat-label">处理中</div>
      </div>
    </div>

    <!-- 退款趋势图 -->
    <div class="chart-section">
      <div class="chart-header">
        <span class="chart-title">退款趋势</span>
        <el-radio-group v-model="trendType" size="small">
          <el-radio-button label="amount">退款额</el-radio-button>
          <el-radio-button label="count">笔数</el-radio-button>
        </el-radio-group>
      </div>
      <TrendLineChart
        :data="trendChartData"
        :series-name="trendType === 'amount' ? '退款额(元)' : '退款笔数'"
        :color="trendType === 'amount' ? '#F59E0B' : '#EF4444'"
        :height="240"
      />
    </div>

    <!-- 原因分布 + 状态分布 + 操作人排行 -->
    <div class="three-col">
      <!-- 退款原因分布 -->
      <div class="chart-section flex-1">
        <div class="chart-header">
          <span class="chart-title">退款原因分布</span>
        </div>
        <div class="reason-list" v-if="reasonData.length > 0">
          <div v-for="(item, idx) in reasonData" :key="idx" class="reason-item">
            <div class="reason-bar-bg">
              <div class="reason-bar-fill" :style="{ width: item.percent + '%', background: reasonColors[idx % reasonColors.length] }" />
            </div>
            <div class="reason-info">
              <span class="reason-label">{{ item.reason }} ({{ item.count }})</span>
              <span class="reason-pct">{{ item.percent }}%</span>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无退款数据" :image-size="60" />
      </div>

      <!-- 退款状态分布 -->
      <div class="chart-section flex-1">
        <div class="chart-header">
          <span class="chart-title">退款状态分布</span>
        </div>
        <div class="status-distribution">
          <div v-for="item in statusData" :key="item.status" class="status-item">
            <div class="status-bar-bg">
              <div class="status-bar-fill" :style="{ width: item.percent + '%', background: item.color }" />
            </div>
            <div class="status-info">
              <span class="status-label">
                <span class="status-dot" :style="{ background: item.color }"></span>
                {{ item.label }} ({{ item.count }})
              </span>
              <span class="status-pct">{{ item.percent }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作人排行 -->
      <div class="chart-section flex-1">
        <div class="chart-header">
          <span class="chart-title">操作人统计</span>
        </div>
        <el-table :data="operatorData" size="small" stripe v-if="operatorData.length > 0">
          <el-table-column prop="name" label="操作人" min-width="70" />
          <el-table-column prop="count" label="申请数" width="65" align="center" />
          <el-table-column label="退款额" width="100" align="center">
            <template #default="{ row }">
              <span style="color: #F59E0B; font-weight: 600">&yen;{{ formatAmount(row.amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="completedCount" label="通过" width="55" align="center" />
          <el-table-column prop="rejectedCount" label="拒绝" width="55" align="center" />
        </el-table>
        <el-empty v-else description="暂无数据" :image-size="60" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getWecomRefundStats } from '@/api/wecom'
import TrendLineChart from './TrendLineChart.vue'

const loading = ref(false)
const quickRange = ref('month')
const customStart = ref('')
const customEnd = ref('')
const trendType = ref('amount')

const summary = ref({ totalCount: 0, totalRefundAmount: 0, approvalRate: 0, avgProcessHours: 0, completedCount: 0, rejectedCount: 0, processingCount: 0 })
const trendData = ref<Array<{ date: string; amount: number; count: number; completed: number; rejected: number }>>([])
const reasonData = ref<Array<{ reason: string; count: number; percent: number }>>([])
const operatorData = ref<any[]>([])
const statusData = ref<any[]>([])

const reasonColors = ['#F59E0B', '#EF4444', '#10B981', '#4C6EF5', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1']

const formatAmount = (v: number) => (v / 100).toLocaleString('zh', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const getDateRange = () => {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  switch (quickRange.value) {
    case 'week': { const d = new Date(now); d.setDate(d.getDate() - d.getDay() + 1); return { startDate: fmt(d), endDate: fmt(now) } }
    case 'month': { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { startDate: fmt(d), endDate: fmt(now) } }
    case 'lastMonth': { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { startDate: fmt(s), endDate: fmt(e) } }
    case 'quarter': { const d = new Date(now); d.setMonth(d.getMonth() - 3); return { startDate: fmt(d), endDate: fmt(now) } }
    case 'all': return { startDate: '', endDate: '' }
    default: return { startDate: customStart.value, endDate: customEnd.value }
  }
}

const fetchStats = async () => {
  loading.value = true
  try {
    const { startDate, endDate } = getDateRange()
    const res = await getWecomRefundStats({ startDate, endDate })
    const data = res?.data || res
    if (data) {
      if (data.summary) summary.value = data.summary
      if (data.trend) trendData.value = data.trend
      if (data.reasonDistribution) reasonData.value = data.reasonDistribution
      if (data.operatorRanking) operatorData.value = data.operatorRanking
      if (data.statusDistribution) {
        const colorMap: Record<string, string> = { completed: '#10B981', processing: '#F59E0B', rejected: '#EF4444' }
        statusData.value = data.statusDistribution.map((s: any) => ({ ...s, color: colorMap[s.status] || '#9CA3AF' }))
      }
    }
  } catch (e) { console.error('[RefundStats] Fetch error:', e) }
  finally { loading.value = false }
}

const trendChartData = computed(() => {
  return trendData.value.map(d => ({
    date: d.date.slice(5),
    value: trendType.value === 'amount' ? Math.round(d.amount / 100) : d.count,
    label: trendType.value === 'amount' ? `¥${(d.amount / 100).toFixed(0)}` : String(d.count)
  }))
})

const handleQuickRange = () => { customStart.value = ''; customEnd.value = ''; fetchStats() }
const handleCustomDate = () => { if (customStart.value && customEnd.value) { quickRange.value = ''; fetchStats() } }

onMounted(() => fetchStats())
</script>

<style scoped>
.filter-bar { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
.stat-cards { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 24px; }
.stat-card { background: #fff; border: 1px solid #EBEEF5; border-radius: 12px; padding: 18px 20px; text-align: center; }
.stat-value { font-size: 22px; font-weight: 700; }
.stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }

.chart-section { background: #fff; border: 1px solid #EBEEF5; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.chart-title { font-size: 15px; font-weight: 600; color: #1F2937; }

.three-col { display: flex; gap: 16px; }
.flex-1 { flex: 1; min-width: 0; }

.reason-list { padding: 4px 0; }
.reason-item { margin-bottom: 12px; }
.reason-bar-bg { height: 20px; background: #F3F4F6; border-radius: 10px; overflow: hidden; }
.reason-bar-fill { height: 100%; border-radius: 10px; transition: width 0.4s; }
.reason-info { display: flex; justify-content: space-between; margin-top: 3px; }
.reason-label { font-size: 12px; color: #4B5563; }
.reason-pct { font-size: 12px; font-weight: 600; color: #1F2937; }

.status-distribution { padding: 8px 0; }
.status-item { margin-bottom: 14px; }
.status-bar-bg { height: 22px; background: #F3F4F6; border-radius: 11px; overflow: hidden; }
.status-bar-fill { height: 100%; border-radius: 11px; transition: width 0.4s; }
.status-info { display: flex; justify-content: space-between; margin-top: 4px; }
.status-label { font-size: 13px; color: #4B5563; display: flex; align-items: center; gap: 6px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.status-pct { font-size: 13px; font-weight: 600; color: #1F2937; }

@media (max-width: 1200px) {
  .three-col { flex-direction: column; }
  .stat-cards { grid-template-columns: repeat(3, 1fr); }
}
</style>
