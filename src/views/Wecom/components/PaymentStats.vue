<template>
  <div class="payment-stats">
    <!-- 筛选栏 - 放大 -->
    <div class="filter-bar">
      <el-radio-group v-model="quickRange" size="default" @change="handleQuickRange">
        <el-radio-button label="today">今日</el-radio-button>
        <el-radio-button label="yesterday">昨日</el-radio-button>
        <el-radio-button label="week">本周</el-radio-button>
        <el-radio-button label="month">本月</el-radio-button>
        <el-radio-button label="lastMonth">上月</el-radio-button>
        <el-radio-button label="all">全部</el-radio-button>
      </el-radio-group>
      <el-date-picker v-model="customStart" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 150px" @change="handleCustomDate" />
      <el-date-picker v-model="customEnd" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 150px" @change="handleCustomDate" />
      <el-button style="margin-left: auto" @click="handleExport">导出报表</el-button>
    </div>

    <!-- 汇总卡片 -->
    <div class="stat-cards" v-loading="loading">
      <div class="stat-card">
        <div class="stat-value" style="color: #EF4444">&yen;{{ formatAmount(summary.totalAmount) }}</div>
        <div class="stat-label">收款总额</div>
        <div class="stat-change" :class="summary.amountChange >= 0 ? 'up' : 'down'">
          {{ summary.amountChange >= 0 ? '+' : '' }}{{ summary.amountChange }}%
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #10B981">{{ summary.totalCount }}</div>
        <div class="stat-label">收款笔数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #F59E0B">&yen;{{ formatAmount(summary.refundAmount) }}</div>
        <div class="stat-label">退款金额</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #4C6EF5">&yen;{{ formatAmount(summary.avgAmount) }}</div>
        <div class="stat-label">平均客单价</div>
      </div>
    </div>

    <!-- 收款趋势图 -->
    <div class="chart-section">
      <div class="chart-header">
        <span class="chart-title">收款趋势</span>
        <el-radio-group v-model="trendType" size="small" @change="updateTrendChart">
          <el-radio-button label="amount">收款额</el-radio-button>
          <el-radio-button label="count">笔数</el-radio-button>
          <el-radio-button label="refund">退款</el-radio-button>
        </el-radio-group>
      </div>
      <TrendLineChart
        :data="trendChartData"
        :series-name="trendType === 'amount' ? '收款额(元)' : trendType === 'count' ? '笔数' : '退款额(元)'"
        :color="trendType === 'amount' ? '#EF4444' : trendType === 'count' ? '#10B981' : '#F59E0B'"
        :height="260"
      />
    </div>

    <!-- 成员收款排行 + 收款状态分布 -->
    <div class="two-col">
      <div class="chart-section flex-2">
        <div class="chart-header">
          <span class="chart-title">成员收款排行</span>
          <span class="chart-subtitle">共 {{ memberRankingTotal }} 人</span>
        </div>
        <el-table :data="memberRankingPage" size="small" stripe>
          <el-table-column type="index" label="排名" width="60" align="center">
            <template #default="{ $index }">
              <el-tag :type="($index + (rankPage - 1) * rankPageSize) < 3 ? 'danger' : 'info'" size="small" round>{{ $index + 1 + (rankPage - 1) * rankPageSize }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="成员" min-width="80" />
          <el-table-column prop="count" label="收款笔数" width="80" align="center" />
          <el-table-column label="收款金额" width="120" align="center">
            <template #default="{ row }">
              <span style="font-weight: 600; color: #EF4444">&yen;{{ formatAmount(row.amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="退款" width="80" align="center">
            <template #default="{ row }">
              <span style="color: #F59E0B">{{ row.refundCount }}</span>
            </template>
          </el-table-column>
          <el-table-column label="净收款" width="120" align="center">
            <template #default="{ row }">
              <span style="font-weight: 600; color: #10B981">&yen;{{ formatAmount(row.netAmount) }}</span>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="memberRankingTotal > rankPageSize" class="rank-pagination">
          <el-pagination v-model:current-page="rankPage" :page-size="rankPageSize" :total="memberRankingTotal" layout="prev, pager, next" small />
        </div>
      </div>

      <div class="chart-section flex-1">
        <div class="chart-header">
          <span class="chart-title">收款状态分布</span>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getWecomPaymentStats } from '@/api/wecom'
import TrendLineChart from './TrendLineChart.vue'
import * as XLSX from 'xlsx'

const props = defineProps<{ configId?: number | null }>()

const loading = ref(false)
const quickRange = ref('month')
const customStart = ref('')
const customEnd = ref('')
const trendType = ref('amount')
const rankPage = ref(1)
const rankPageSize = 5

const summary = ref({ totalAmount: 0, totalCount: 0, refundAmount: 0, avgAmount: 0, amountChange: 0 })
const trendData = ref<Array<{ date: string; amount: number; count: number; refund: number }>>([])
const memberRankingAll = ref<any[]>([])
const statusData = ref<any[]>([])

const memberRankingTotal = computed(() => memberRankingAll.value.length)
const memberRankingPage = computed(() => {
  const start = (rankPage.value - 1) * rankPageSize
  return memberRankingAll.value.slice(start, start + rankPageSize)
})

const formatAmount = (v: number) => (v / 100).toLocaleString('zh', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const getDateRange = () => {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  switch (quickRange.value) {
    case 'today': return { startDate: fmt(now), endDate: fmt(now) }
    case 'yesterday': { const d = new Date(now); d.setDate(d.getDate() - 1); return { startDate: fmt(d), endDate: fmt(d) } }
    case 'week': { const d = new Date(now); d.setDate(d.getDate() - d.getDay() + 1); return { startDate: fmt(d), endDate: fmt(now) } }
    case 'month': { const d = new Date(now.getFullYear(), now.getMonth(), 1); return { startDate: fmt(d), endDate: fmt(now) } }
    case 'lastMonth': { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { startDate: fmt(s), endDate: fmt(e) } }
    case 'all': return { startDate: '', endDate: '' }
    default: return { startDate: customStart.value, endDate: customEnd.value }
  }
}

const fetchStats = async () => {
  loading.value = true
  try {
    const { startDate, endDate } = getDateRange()
    const params: any = { startDate, endDate }
    if (props.configId) params.configId = props.configId
    const res = await getWecomPaymentStats(params)
    const data = res?.data || res
    if (data) {
      if (data.summary) summary.value = data.summary
      if (data.trend) trendData.value = data.trend
      if (data.memberRanking) memberRankingAll.value = data.memberRanking
      if (data.statusDistribution) {
        const colorMap: Record<string, string> = { paid: '#10B981', pending: '#F59E0B', refunded: '#9CA3AF', cancelled: '#EF4444' }
        statusData.value = data.statusDistribution.map((s: any) => ({ ...s, color: colorMap[s.status] || '#9CA3AF' }))
      }
    }
    rankPage.value = 1
  } catch (e) { console.error('[PaymentStats] Fetch error:', e) }
  finally { loading.value = false }
}

const trendChartData = computed(() => {
  return trendData.value.map(d => ({
    date: d.date.slice(5), // MM-DD
    value: trendType.value === 'amount' ? Math.round(d.amount / 100) : trendType.value === 'count' ? d.count : Math.round(d.refund / 100),
    label: trendType.value === 'count' ? String(d.count) : `¥${((trendType.value === 'amount' ? d.amount : d.refund) / 100).toFixed(0)}`
  }))
})

const updateTrendChart = () => { /* computed auto-updates */ }

const handleQuickRange = () => {
  customStart.value = ''
  customEnd.value = ''
  fetchStats()
}

const handleCustomDate = () => {
  if (customStart.value && customEnd.value) {
    quickRange.value = ''
    fetchStats()
  }
}

const handleExport = () => {
  if (trendData.value.length === 0 && memberRankingAll.value.length === 0) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  const wb = XLSX.utils.book_new()

  // Sheet1: 汇总
  const summaryRows = [
    ['收款统计报表', '', '', ''],
    ['导出时间', new Date().toLocaleString('zh-CN'), '', ''],
    ['筛选范围', quickRange.value || `${customStart.value} ~ ${customEnd.value}`, '', ''],
    [],
    ['指标', '数值'],
    ['收款总额(元)', (summary.value.totalAmount / 100).toFixed(2)],
    ['收款笔数', summary.value.totalCount],
    ['退款金额(元)', (summary.value.refundAmount / 100).toFixed(2)],
    ['平均客单价(元)', (summary.value.avgAmount / 100).toFixed(2)],
    ['环比变化', `${summary.value.amountChange}%`],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows)
  ws1['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, ws1, '收款汇总')

  // Sheet2: 趋势数据
  if (trendData.value.length > 0) {
    const trendRows = [['日期', '收款金额(元)', '收款笔数', '退款金额(元)']]
    for (const d of trendData.value) {
      trendRows.push([d.date, (d.amount / 100).toFixed(2) as any, d.count as any, (d.refund / 100).toFixed(2) as any])
    }
    const ws2 = XLSX.utils.aoa_to_sheet(trendRows)
    ws2['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws2, '收款趋势')
  }

  // Sheet3: 成员排行
  if (memberRankingAll.value.length > 0) {
    const rankRows = [['排名', '成员', '收款笔数', '收款金额(元)', '退款笔数', '退款金额(元)', '净收款(元)']]
    memberRankingAll.value.forEach((m, i) => {
      rankRows.push([i + 1, m.name, m.count, (m.amount / 100).toFixed(2), m.refundCount, (m.refundAmount / 100).toFixed(2), (m.netAmount / 100).toFixed(2)] as any)
    })
    const ws3 = XLSX.utils.aoa_to_sheet(rankRows)
    ws3['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws3, '成员排行')
  }

  // Sheet4: 状态分布
  if (statusData.value.length > 0) {
    const statusRows = [['状态', '数量', '占比']]
    for (const s of statusData.value) {
      statusRows.push([s.label, s.count, `${s.percent}%`] as any)
    }
    const ws4 = XLSX.utils.aoa_to_sheet(statusRows)
    ws4['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws4, '状态分布')
  }

  const fileName = `收款统计报表_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
  ElMessage.success(`报表已导出: ${fileName}`)
}

watch(() => props.configId, () => fetchStats())
onMounted(() => fetchStats())
</script>

<style scoped>
.filter-bar { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border: 1px solid #EBEEF5; border-radius: 12px; padding: 20px 24px; text-align: center; position: relative; }
.stat-value { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.stat-change { position: absolute; top: 10px; right: 12px; font-size: 12px; font-weight: 600; }
.stat-change.up { color: #10B981; }
.stat-change.down { color: #EF4444; }

.chart-section { background: #fff; border: 1px solid #EBEEF5; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.chart-title { font-size: 15px; font-weight: 600; color: #1F2937; }
.chart-subtitle { font-size: 12px; color: #9CA3AF; }

.two-col { display: flex; gap: 20px; }
.flex-1 { flex: 1; min-width: 0; }
.flex-2 { flex: 2; min-width: 0; }

.rank-pagination { display: flex; justify-content: center; margin-top: 12px; }

.status-distribution { padding: 8px 0; }
.status-item { margin-bottom: 14px; }
.status-bar-bg { height: 22px; background: #F3F4F6; border-radius: 11px; overflow: hidden; }
.status-bar-fill { height: 100%; border-radius: 11px; transition: width 0.4s; }
.status-info { display: flex; justify-content: space-between; margin-top: 4px; }
.status-label { font-size: 13px; color: #4B5563; display: flex; align-items: center; gap: 6px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.status-pct { font-size: 13px; font-weight: 600; color: #1F2937; }
</style>
