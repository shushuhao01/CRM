<template>
  <div class="acquisition-overview">
    <!-- 筛选器 -->
    <div class="filter-bar">
      <div class="quick-filters">
        <el-button
          v-for="q in quickOptions" :key="q.value"
          :type="quickRange === q.value ? 'primary' : 'default'"
          @click="setQuickRange(q.value)"
          size="default"
        >{{ q.label }}</el-button>
      </div>
      <div class="date-range">
        <el-date-picker v-model="startDate" type="date" placeholder="开始日期" size="default" style="width: 150px" value-format="YYYY-MM-DD" @change="quickRange = 'custom'" />
        <span class="range-sep">至</span>
        <el-date-picker v-model="endDate" type="date" placeholder="结束日期" size="default" style="width: 150px" value-format="YYYY-MM-DD" @change="quickRange = 'custom'" />
      </div>
      <div style="flex: 1" />
      <el-button @click="handleExport">
        <el-icon><Download /></el-icon>导出报表
      </el-button>
    </div>

    <!-- 未授权空状态 -->
    <div v-if="isDemoMode || !configId" class="empty-state">
      <div class="empty-icon">📊</div>
      <div class="empty-title">暂无数据</div>
      <div class="empty-desc">请先完成企业微信授权配置，授权后将自动展示真实获客数据</div>
    </div>

    <template v-else>
    <!-- 汇总卡片 -->
    <div class="stats-grid">
      <div class="stats-card primary">
        <div class="stats-card-icon">👤</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ summaryData.todayAdd }}</div>
          <div class="stats-card-label">今日新增</div>
          <div class="stats-card-trend" :class="summaryData.todayTrend >= 0 ? 'up' : 'down'">
            {{ summaryData.todayTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(summaryData.todayTrend) }}% <span class="trend-hint">较昨日</span>
          </div>
        </div>
      </div>
      <div class="stats-card success">
        <div class="stats-card-icon">🎯</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ summaryData.conversionRate }}%</div>
          <div class="stats-card-label">转化率</div>
          <div class="stats-card-trend" :class="summaryData.convTrend >= 0 ? 'up' : 'down'">
            {{ summaryData.convTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(summaryData.convTrend) }}% <span class="trend-hint">较昨日</span>
          </div>
        </div>
      </div>
      <div class="stats-card warning">
        <div class="stats-card-icon">⏱️</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ summaryData.avgResponse }}分</div>
          <div class="stats-card-label">平均响应</div>
          <div class="stats-card-trend" :class="summaryData.respTrend <= 0 ? 'up' : 'down'">
            {{ summaryData.respTrend <= 0 ? '↓' : '↑' }} {{ Math.abs(summaryData.respTrend) }}% <span class="trend-hint">较昨日</span>
          </div>
        </div>
      </div>
      <div class="stats-card info">
        <div class="stats-card-icon">💰</div>
        <div class="stats-card-body">
          <div class="stats-card-value">¥{{ summaryData.cost }}</div>
          <div class="stats-card-label">获客成本</div>
          <div class="stats-card-trend neutral">— 持平</div>
        </div>
      </div>
      <div class="stats-card primary-light">
        <div class="stats-card-icon">🔗</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ summaryData.totalLinks }}</div>
          <div class="stats-card-label">活跃链接</div>
        </div>
      </div>
      <div class="stats-card danger">
        <div class="stats-card-icon">📊</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ summaryData.totalClicks }}</div>
          <div class="stats-card-label">总点击</div>
        </div>
      </div>
    </div>

    <!-- 转化漏斗 - 缩小居中的真实漏斗 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">🔽 全链接转化漏斗</span></template>
      <div class="funnel-container">
        <div v-for="(level, idx) in funnelData" :key="level.name" class="funnel-level">
          <div
            class="funnel-shape"
            :style="{
              width: calcFunnelWidth(idx) + 'px',
              background: funnelColors[idx],
              clipPath: funnelClipPath(idx)
            }"
          >
            <span class="funnel-label">{{ level.name }}</span>
          </div>
          <div class="funnel-stats">
            <span class="funnel-count">{{ level.count }}人</span>
            <span class="funnel-percent">{{ level.percent }}%</span>
            <span v-if="idx > 0" class="funnel-drop">↓{{ calcDropRate(idx) }}%</span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 获客趋势 -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="section-header-row">
          <span class="section-title">📈 获客趋势</span>
        </div>
      </template>
      <TrendLineChart
        :data="[]"
        :multi-series="trendSeries"
        :x-labels="trendXLabels"
        :height="280"
      />
    </el-card>

    <!-- 链接表现排行 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">🏅 链接表现排行 TOP10</span></template>
      <el-table :data="pagedLinkRanking" stripe size="default">
        <el-table-column label="排名" width="65" align="center">
          <template #default="{ $index }">
            <span :class="'rank-badge rank-' + ((linkRankPage - 1) * linkRankPageSize + $index < 3 ? (linkRankPage - 1) * linkRankPageSize + $index + 1 : 'other')">{{ (linkRankPage - 1) * linkRankPageSize + $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="linkName" label="链接名称" min-width="150" />
        <el-table-column prop="addCount" label="添加数" width="100" sortable />
        <el-table-column label="转化率" width="110" sortable :sort-by="'conversionRate'">
          <template #default="{ row }">
            <span :class="rateClass(row.conversionRate)">{{ row.conversionRate }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="开口率" width="100" sortable :sort-by="'talkRate'">
          <template #default="{ row }">{{ row.talkRate }}%</template>
        </el-table-column>
        <el-table-column prop="dailyAvg" label="日均" width="80" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-bar" v-if="linkRankingData.length > linkRankPageSize">
        <span class="page-info">共 {{ linkRankingData.length }} 个链接</span>
        <el-pagination
          v-model:current-page="linkRankPage"
          v-model:page-size="linkRankPageSize"
          :page-sizes="[10, 20, 50]"
          :total="linkRankingData.length"
          layout="total, sizes, prev, pager, next"
          small
          background
          @size-change="linkRankPage = 1"
        />
      </div>
    </el-card>

    <!-- 渠道来源分析 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">📊 渠道来源分析</span></template>
      <div class="channel-grid">
        <div class="channel-chart">
          <div v-for="ch in pagedChannels" :key="ch.name" class="channel-bar-item">
            <span class="ch-label">{{ ch.name }}</span>
            <div class="ch-track">
              <div class="ch-fill" :style="{ width: ch.percent + '%', background: ch.color }" />
            </div>
            <span class="ch-pct">{{ ch.percent }}%</span>
            <span class="ch-count">{{ ch.count }}人</span>
          </div>
        </div>
      </div>
      <div class="pagination-bar" v-if="channelDataList.length > channelPageSize">
        <span class="page-info">共 {{ channelDataList.length }} 个渠道</span>
        <el-pagination v-model:current-page="channelPage" :page-size="channelPageSize" :total="channelDataList.length" layout="prev, pager, next" small background />
      </div>
    </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import TrendLineChart from './TrendLineChart.vue'
import { getAcquisitionOverview, getAcquisitionTrend } from '@/api/wecom'

const props = defineProps<{ configId: number | null; isDemoMode: boolean }>()

const quickRange = ref('30d')
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)

const quickOptions = [
  { label: '今日', value: 'today' }, { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'week' }, { label: '本月', value: 'month' },
  { label: '上月', value: 'lastMonth' }, { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' }, { label: '全部', value: 'all' }
]

// ========== 日期范围计算 ==========
const getDateRange = (range: string) => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  switch (range) {
    case 'today': return { start: today, end: today }
    case 'yesterday': return { start: yesterday, end: yesterday }
    case 'week': return { start: weekStart.toISOString().split('T')[0], end: today }
    case 'month': return { start: monthStart.toISOString().split('T')[0], end: today }
    case 'lastMonth': return { start: lastMonthStart.toISOString().split('T')[0], end: lastMonthEnd.toISOString().split('T')[0] }
    case '7d': return { start: new Date(now.getTime() - 6 * 86400000).toISOString().split('T')[0], end: today }
    case '30d': return { start: new Date(now.getTime() - 29 * 86400000).toISOString().split('T')[0], end: today }
    case 'all': return { start: '', end: '' }
    case 'custom': return { start: startDate.value, end: endDate.value }
    default: return { start: today, end: today }
  }
}

const setQuickRange = (val: string) => {
  quickRange.value = val
  fetchOverviewData()
  fetchTrendData()
}
const handleExport = () => { ElMessage.info('导出功能将在后端API完善后可用') }

// ========== 数据状态 ==========
const summaryData = ref({
  todayAdd: 0, todayTrend: 0, conversionRate: 0, convTrend: 0,
  avgResponse: 0, respTrend: 0, cost: 0, totalLinks: 0, totalClicks: 0
})
const funnelData = ref([
  { name: '点击链接', count: 0, percent: 100 },
  { name: '成功添加', count: 0, percent: 0 },
  { name: '首次开口', count: 0, percent: 0 },
  { name: '有效沟通', count: 0, percent: 0 },
  { name: '关联CRM', count: 0, percent: 0 },
  { name: '成交', count: 0, percent: 0 },
])
const linkRankingData = ref<any[]>([])
const channelDataList = ref<any[]>([])
const trendRawData = ref<any[]>([])

// Demo数据 - 根据筛选范围动态变化
const rangeFactor: Record<string, number> = { today: 0.08, yesterday: 0.07, week: 0.35, month: 1, lastMonth: 0.9, '7d': 0.25, '30d': 1, all: 3.5 }
const getDemoSummary = (range: string) => {
  const f = rangeFactor[range] || 1
  return {
    todayAdd: Math.round(12 * f), todayTrend: range === 'today' ? 15 : range === 'yesterday' ? -3 : 8,
    conversionRate: +(28.5 + (f > 1 ? -2 : 3)).toFixed(1), convTrend: range === 'today' ? -2.3 : 1.5,
    avgResponse: +(3.2 + (f > 1 ? 0.5 : -0.3)).toFixed(1), respTrend: -8,
    cost: +(18.5 * Math.max(f, 0.5)).toFixed(1), totalLinks: 8, totalClicks: Math.round(2340 * f)
  }
}
const getDemoFunnel = (range: string) => {
  const f = rangeFactor[range] || 1
  const clicks = Math.round(2340 * f)
  const adds = Math.round(clicks * 0.285)
  const talk = Math.round(adds * 0.717)
  const eff = Math.round(talk * 0.605)
  const crm = Math.round(eff * 0.616)
  const deal = Math.round(crm * 0.404)
  return [
    { name: '点击链接', count: clicks, percent: 100 },
    { name: '成功添加', count: adds, percent: clicks > 0 ? +((adds / clicks) * 100).toFixed(1) : 0 },
    { name: '首次开口', count: talk, percent: clicks > 0 ? +((talk / clicks) * 100).toFixed(1) : 0 },
    { name: '有效沟通', count: eff, percent: clicks > 0 ? +((eff / clicks) * 100).toFixed(1) : 0 },
    { name: '关联CRM', count: crm, percent: clicks > 0 ? +((crm / clicks) * 100).toFixed(1) : 0 },
    { name: '成交', count: deal, percent: clicks > 0 ? +((deal / clicks) * 100).toFixed(1) : 0 },
  ]
}
const baseLinkRanking = [
  { linkName: '官网首页获客', baseAdd: 186, conversionRate: 32.1, talkRate: 75, isEnabled: true },
  { linkName: '广告投放A', baseAdd: 142, conversionRate: 24.8, talkRate: 68, isEnabled: true },
  { linkName: '线下展会', baseAdd: 128, conversionRate: 38.5, talkRate: 82, isEnabled: true },
  { linkName: '社交媒体推广', baseAdd: 95, conversionRate: 22.1, talkRate: 60, isEnabled: true },
  { linkName: '合作伙伴渠道', baseAdd: 76, conversionRate: 28.9, talkRate: 71, isEnabled: false },
  { linkName: '邮件营销', baseAdd: 40, conversionRate: 15.2, talkRate: 45, isEnabled: true },
  { linkName: '短视频渠道', baseAdd: 38, conversionRate: 20.3, talkRate: 58, isEnabled: true },
  { linkName: '客户转介绍', baseAdd: 35, conversionRate: 42.1, talkRate: 88, isEnabled: true },
  { linkName: '公众号推文', baseAdd: 28, conversionRate: 18.6, talkRate: 52, isEnabled: true },
  { linkName: '直播间引流', baseAdd: 22, conversionRate: 26.4, talkRate: 64, isEnabled: true },
  { linkName: '小程序入口', baseAdd: 18, conversionRate: 19.8, talkRate: 55, isEnabled: true },
  { linkName: '朋友圈广告', baseAdd: 15, conversionRate: 16.5, talkRate: 48, isEnabled: true },
  { linkName: 'SEO自然流量', baseAdd: 12, conversionRate: 35.0, talkRate: 72, isEnabled: true },
  { linkName: '行业论坛', baseAdd: 10, conversionRate: 30.2, talkRate: 66, isEnabled: false },
  { linkName: '线下沙龙', baseAdd: 8, conversionRate: 45.0, talkRate: 90, isEnabled: true },
]
const getDemoLinkRanking = (range: string) => {
  const f = rangeFactor[range] || 1
  return baseLinkRanking.map(l => ({
    linkName: l.linkName, addCount: Math.round(l.baseAdd * f),
    conversionRate: l.conversionRate, talkRate: l.talkRate,
    dailyAvg: +(l.baseAdd * f / 30).toFixed(1), isEnabled: l.isEnabled,
  }))
}
const demoChannels = [
  { name: '官网', percent: 35, count: 233, color: 'var(--el-color-primary)' },
  { name: '广告投放', percent: 25, count: 167, color: 'var(--el-color-success)' },
  { name: '线下展会', percent: 18, count: 120, color: 'var(--el-color-warning)' },
  { name: '社交媒体', percent: 12, count: 80, color: 'var(--el-color-info)' },
  { name: '合作伙伴', percent: 7, count: 47, color: 'var(--el-color-danger)' },
  { name: '其他', percent: 3, count: 20, color: '#9CA3AF' },
]

// ========== 漏斗 ==========
// 系统主题色
const funnelColors = [
  'var(--el-color-primary)',
  'var(--el-color-primary-light-3)',
  'var(--el-color-primary-light-5)',
  'var(--el-color-primary-light-7)',
  'var(--el-color-primary-light-8)',
  'var(--el-color-primary-light-9)',
]
// 缩小漏斗：最大宽度360px，逐级递减
const calcFunnelWidth = (idx: number) => Math.max(360 - idx * 52, 100)
const funnelClipPath = (idx: number) => {
  // 梯形裁剪，上宽下窄，越往下越窄
  const shrink = idx * 2
  return `polygon(${shrink}% 0, ${100 - shrink}% 0, ${100 - shrink - 3}% 100%, ${shrink + 3}% 100%)`
}
const calcDropRate = (idx: number) => {
  if (idx === 0) return 0
  const prev = funnelData.value[idx - 1].count
  const curr = funnelData.value[idx].count
  return prev > 0 ? ((1 - curr / prev) * 100).toFixed(1) : 0
}

// ========== 趋势图：按时间段动态生成X轴和数据 ==========
const generateTrendLabels = (range: string): string[] => {
  const now = new Date()
  switch (range) {
    case 'today': {
      // 每2小时一个时间点
      const labels = []
      for (let h = 0; h <= now.getHours(); h += 2) {
        labels.push(`${String(h).padStart(2, '0')}:00`)
      }
      return labels.length ? labels : ['00:00']
    }
    case 'yesterday': {
      // 每小时
      return Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
    }
    case 'week': {
      // 本周每一天
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay() + 1)
      const labels = []
      for (let d = new Date(weekStart); d <= now; d.setDate(d.getDate() + 1)) {
        labels.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
      }
      return labels
    }
    case 'month': {
      // 本月每一天
      const labels = []
      for (let d = 1; d <= now.getDate(); d++) {
        labels.push(`${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
      }
      return labels
    }
    case 'lastMonth': {
      // 上月每一天
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const labels = []
      for (let d = 1; d <= lastMonthEnd.getDate(); d++) {
        labels.push(`${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
      }
      return labels
    }
    case 'all': {
      // 从第一条数据开始到现在的月/季度
      const labels = []
      const startYear = 2026
      const startMonth = 1 // 假设从1月开始
      const endYear = now.getFullYear()
      const endMonth = now.getMonth() + 1
      for (let y = startYear; y <= endYear; y++) {
        const mStart = y === startYear ? startMonth : 1
        const mEnd = y === endYear ? endMonth : 12
        for (let m = mStart; m <= mEnd; m++) {
          labels.push(`${y}-${String(m).padStart(2, '0')}`)
        }
      }
      return labels
    }
    default: {
      // 7d, 30d etc - each day
      const daysMatch = range.match(/^(\d+)d$/)
      if (daysMatch) {
        const days = parseInt(daysMatch[1])
        const labels = []
        for (let i = days - 1; i >= 0; i--) {
          const dt = new Date(now.getTime() - i * 86400000)
          labels.push(`${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`)
        }
        return labels
      }
      return []
    }
  }
}

/**
 * 根据时间范围和数据类型生成有规律的demo趋势数据（非随机，稳定可复现）
 * - today: 按时间段递增再回落（工作时间高峰）
 * - yesterday: 24小时曲线，上午下午各一个高峰
 * - week/month/lastMonth: 按天波动，整体稳中有升
 * - all: 按月，持续增长趋势
 */
const generateDemoSeriesData = (labels: string[], range: string, type: 'add' | 'talk' | 'loss'): number[] => {
  const len = labels.length
  const baseMap = { add: { base: 8, amp: 10 }, talk: { base: 5, amp: 7 }, loss: { base: 1, amp: 3 } }
  const { base, amp } = baseMap[type]

  if (range === 'today' || range === 'yesterday') {
    // 按小时：上午10点和下午3点各一个高峰
    return labels.map((label) => {
      const hour = parseInt(label.split(':')[0], 10)
      const peakFactor = Math.max(0, 1 - Math.abs(hour - 10) / 6) + Math.max(0, 1 - Math.abs(hour - 15) / 5)
      return Math.max(0, Math.round(base + amp * peakFactor * 0.8 + (hour % 3)))
    })
  }
  if (range === 'all') {
    // 按月：持续增长趋势
    return labels.map((_, i) => Math.round(base + amp * 0.3 * i + (i % 2) * 2))
  }
  // week/month/lastMonth: 按天，周末略低，工作日正常
  return labels.map((label, i) => {
    // 用日期推算星期
    const dayNum = parseInt(label.split('-').pop() || '1', 10)
    const weekendDip = (dayNum % 7 === 0 || dayNum % 7 === 6) ? -3 : 0
    const trend = Math.round(base + amp * Math.sin((i / len) * Math.PI) + weekendDip + (i % 3))
    return Math.max(0, trend)
  })
}

const trendXLabels = computed(() => {
  if (trendRawData.value.length > 0) {
    return trendRawData.value.map((d: any) => d.label || d.date)
  }
  return []
})

const trendSeries = computed(() => {
  if (trendRawData.value.length > 0) {
    return [
      { name: '新增', data: trendRawData.value.map((d: any) => d.add || 0), color: 'var(--el-color-success)' },
      { name: '开口', data: trendRawData.value.map((d: any) => d.talk || 0), color: 'var(--el-color-primary)' },
      { name: '流失', data: trendRawData.value.map((d: any) => d.loss || 0), color: 'var(--el-color-danger)' },
    ]
  }
  return []
})

const rateClass = (rate: number) => rate >= 30 ? 'rate-good' : rate >= 15 ? 'rate-medium' : 'rate-low'

// Link ranking pagination
const linkRankPage = ref(1)
const linkRankPageSize = ref(10)
const pagedLinkRanking = computed(() => {
  const s = (linkRankPage.value - 1) * linkRankPageSize.value
  return linkRankingData.value.slice(s, s + linkRankPageSize.value)
})

const channelPage = ref(1)
const channelPageSize = 5
const pagedChannels = computed(() => {
  const s = (channelPage.value - 1) * channelPageSize
  return channelDataList.value.slice(s, s + channelPageSize)
})

// ========== 数据获取 ==========
const fetchOverviewData = async () => {
  if (props.isDemoMode || !props.configId) {
    // 未授权企微时不显示任何假数据
    return
  }
  loading.value = true
  try {
    const dateRange = getDateRange(quickRange.value)
    const res: any = await getAcquisitionOverview({
      configId: props.configId,
      startDate: dateRange.start,
      endDate: dateRange.end,
      range: quickRange.value
    })
    if (res?.success && res.data) {
      const d = res.data
      if (d.summary) summaryData.value = d.summary
      if (d.funnel) funnelData.value = d.funnel
      if (d.linkRanking) linkRankingData.value = d.linkRanking
      if (d.channels) channelDataList.value = d.channels
    }
  } catch (e) {
    console.error('[AcquisitionOverview] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

const fetchTrendData = async () => {
  if (props.isDemoMode || !props.configId) {
    trendRawData.value = []
    return
  }
  try {
    const dateRange = getDateRange(quickRange.value)
    const res: any = await getAcquisitionTrend({
      configId: props.configId,
      startDate: dateRange.start,
      endDate: dateRange.end,
      range: quickRange.value
    })
    if (res?.success && res.data) {
      trendRawData.value = res.data
    }
  } catch (e) {
    console.error('[AcquisitionOverview] Trend fetch error:', e)
    trendRawData.value = []
  }
}

watch(() => props.configId, () => {
  fetchOverviewData()
  fetchTrendData()
})

onMounted(() => {
  fetchOverviewData()
  fetchTrendData()
})
</script>

<style scoped>
.filter-bar { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
.quick-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.date-range { display: flex; align-items: center; gap: 4px; }
.range-sep { color: #9CA3AF; font-size: 13px; }
.section-card { margin-bottom: 20px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-title { font-size: 18px; font-weight: 600; color: #1F2937; margin-bottom: 8px; }
.empty-desc { font-size: 14px; color: #9CA3AF; }
.section-title { font-weight: 600; font-size: 15px; color: #1F2937; }
.section-header-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.chart-quick-filters { display: flex; gap: 2px; }
.pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
.page-info { font-size: 13px; color: #9CA3AF; }
.stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 24px; }
.stats-card { border-radius: 14px; padding: 18px; display: flex; align-items: flex-start; gap: 14px; border: 1px solid var(--el-border-color-lighter); transition: all 0.3s; }
.stats-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
.stats-card-icon { font-size: 28px; flex-shrink: 0; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
.stats-card-body { flex: 1; }
.stats-card-value { font-size: 24px; font-weight: 700; color: var(--el-text-color-primary); line-height: 1.2; }
.stats-card-label { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }
.stats-card-trend { font-size: 12px; margin-top: 6px; }
.stats-card-trend.up { color: var(--el-color-success); }
.stats-card-trend.down { color: var(--el-color-danger); }
.stats-card-trend.neutral { color: var(--el-text-color-secondary); }
.trend-hint { color: var(--el-text-color-placeholder); margin-left: 4px; }
/* 使用系统主题色 */
.stats-card.primary { background: var(--el-color-primary-light-9); }
.stats-card.primary .stats-card-icon { background: var(--el-color-primary-light-8); }
.stats-card.success { background: var(--el-color-success-light-9); }
.stats-card.success .stats-card-icon { background: var(--el-color-success-light-8); }
.stats-card.warning { background: var(--el-color-warning-light-9); }
.stats-card.warning .stats-card-icon { background: var(--el-color-warning-light-8); }
.stats-card.info { background: var(--el-color-info-light-9); }
.stats-card.info .stats-card-icon { background: var(--el-color-info-light-8); }
.stats-card.primary-light { background: var(--el-color-primary-light-9); }
.stats-card.primary-light .stats-card-icon { background: var(--el-color-primary-light-7); }
.stats-card.danger { background: var(--el-color-danger-light-9); }
.stats-card.danger .stats-card-icon { background: var(--el-color-danger-light-8); }

/* 缩小漏斗 - 居中显示，最大宽度限制 */
.funnel-container { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 20px 0; max-width: 560px; margin: 0 auto; }
.funnel-level { display: flex; align-items: center; gap: 16px; width: 100%; justify-content: center; }
.funnel-shape { height: 36px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 600; transition: width 0.5s; min-width: 80px; flex-shrink: 0; }
.funnel-stats { display: flex; gap: 10px; align-items: center; min-width: 180px; }
.funnel-count { font-size: 14px; font-weight: 700; color: var(--el-text-color-primary); }
.funnel-percent { font-size: 12px; color: var(--el-text-color-regular); }
.funnel-drop { font-size: 11px; color: var(--el-color-danger); background: var(--el-color-danger-light-9); padding: 2px 6px; border-radius: 10px; }

.rank-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; font-weight: 700; font-size: 14px; }
.rank-1 { background: #FEF3C7; color: #D97706; }
.rank-2 { background: #F3F4F6; color: #6B7280; }
.rank-3 { background: #FDE68A; color: #92400E; }
.rank-other { color: #9CA3AF; }
.rate-good { color: var(--el-color-success); font-weight: 700; }
.rate-medium { color: var(--el-color-warning); font-weight: 600; }
.rate-low { color: var(--el-color-danger); }
.channel-grid { padding: 8px 0; }
.channel-bar-item { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.ch-label { width: 80px; font-size: 14px; color: var(--el-text-color-regular); text-align: right; flex-shrink: 0; font-weight: 500; }
.ch-track { flex: 1; height: 24px; background: var(--el-fill-color-light); border-radius: 12px; overflow: hidden; }
.ch-fill { height: 100%; border-radius: 12px; min-width: 4px; transition: width 0.5s; }
.ch-pct { width: 45px; font-size: 14px; font-weight: 600; color: var(--el-text-color-regular); }
.ch-count { width: 55px; font-size: 13px; color: var(--el-text-color-secondary); }
@media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
</style>
