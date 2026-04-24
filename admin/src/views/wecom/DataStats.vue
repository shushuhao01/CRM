<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>数据统计</span>
          <el-radio-group v-model="period" size="small" @change="fetchData">
            <el-radio-button label="7d">7天</el-radio-button>
            <el-radio-button label="30d">30天</el-radio-button>
            <el-radio-button label="90d">90天</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <!-- 全平台汇总 -->
      <el-row :gutter="16" style="margin-bottom: 20px">
        <el-col :span="3" v-for="stat in summaryCards" :key="stat.label">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-num" :style="{ color: stat.color }">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 趋势图 -->
      <el-card shadow="never" style="margin-bottom: 20px">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <el-radio-group v-model="trendType" size="small" @change="fetchTrend">
              <el-radio-button label="customer">客户增长</el-radio-button>
              <el-radio-button label="acquisition">获客助手</el-radio-button>
              <el-radio-button label="ai">AI调用</el-radio-button>
              <el-radio-button label="revenue">收入</el-radio-button>
            </el-radio-group>
            <div style="font-size: 12px; color: #909399">
              周期合计: <span style="font-weight: 600; color: #303133">{{ trendTotal }}</span>
            </div>
          </div>
        </template>
        <div v-if="trendData.dates.length === 0" style="height: 200px; display: flex; align-items: center; justify-content: center; color: #c0c4cc">
          暂无趋势数据
        </div>
        <div v-else style="height: 200px; padding: 10px 0">
          <svg viewBox="0 0 800 180" width="100%" height="180" style="overflow: visible">
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" :stop-color="trendColor" stop-opacity="0.2" />
                <stop offset="100%" :stop-color="trendColor" stop-opacity="0.02" />
              </linearGradient>
            </defs>
            <!-- Grid lines -->
            <line v-for="i in 4" :key="'g'+i" x1="40" :y1="10 + (i - 1) * 45" x2="790" :y2="10 + (i - 1) * 45" stroke="#f0f0f0" stroke-width="1" />
            <!-- Area -->
            <polygon :points="trendAreaPts" fill="url(#trendGrad)" />
            <!-- Line -->
            <polyline :points="trendLinePts" fill="none" :stroke="trendColor" stroke-width="2" stroke-linejoin="round" />
            <!-- Dots -->
            <circle v-for="(p, i) in trendPts" :key="'d'+i" :cx="p.x" :cy="p.y" r="3" :fill="trendColor" />
            <!-- X Labels -->
            <text v-for="(p, i) in trendXLabels" :key="'xl'+i" :x="p.x" y="175" text-anchor="middle" font-size="10" fill="#909399">{{ p.label }}</text>
          </svg>
        </div>
      </el-card>

      <!-- 租户排行 -->
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <span>租户排行(按客户数)</span>
            <div style="display: flex; gap: 8px">
              <el-button size="small" @click="handleExport" :loading="exporting">📊 导出CSV</el-button>
              <el-button size="small" @click="handleExportExcel" :loading="exporting">📥 导出Excel</el-button>
            </div>
          </div>
        </template>
        <el-table :data="rankings" v-loading="loading" stripe>
          <el-table-column label="排名" width="60" align="center">
            <template #default="{ $index }">
              <span :style="{ fontWeight: $index < 3 ? '700' : 'normal', color: $index < 3 ? '#f56c6c' : '#303133', fontSize: $index < 3 ? '16px' : '13px' }">
                {{ $index < 3 ? ['🥇','🥈','🥉'][$index] : $index + 1 }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="租户" min-width="130">
            <template #default="{ row }">{{ row.tenantName || row.tenantId }}</template>
          </el-table-column>
          <el-table-column label="客户数" width="90" align="right" sortable sort-by="customerCount">
            <template #default="{ row }">{{ row.customerCount?.toLocaleString() }}</template>
          </el-table-column>
          <el-table-column label="客户群" width="80" align="right">
            <template #default="{ row }">{{ row.groupCount }}</template>
          </el-table-column>
          <el-table-column label="获客添加" width="100" align="right" sortable sort-by="acquisitionCount">
            <template #default="{ row }">{{ row.acquisitionCount?.toLocaleString() }}</template>
          </el-table-column>
          <el-table-column label="AI调用" width="90" align="right" sortable sort-by="aiCallCount">
            <template #default="{ row }">{{ row.aiCallCount?.toLocaleString() }}</template>
          </el-table-column>
          <el-table-column label="会话存档" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.chatArchiveEnabled ? 'success' : 'info'" size="small">{{ row.chatArchiveEnabled ? '已开通' : '未开通' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDataStats, getDataStatsTrends, getDataStatsRankings, exportDataStats } from '@/api/wecomManagement'

const loading = ref(false)
const exporting = ref(false)
const period = ref('30d')
const trendType = ref('customer')
const statsData = ref<any>({})
const rankings = ref<any[]>([])
const trendData = ref<{ dates: string[]; series: { name: string; data: number[] }[] }>({ dates: [], series: [] })

const trendColorMap: Record<string, string> = { customer: '#409eff', acquisition: '#67c23a', ai: '#7C3AED', revenue: '#f56c6c' }
const trendColor = computed(() => trendColorMap[trendType.value] || '#409eff')

const trendTotal = computed(() => {
  const data = trendData.value.series[0]?.data || []
  return data.reduce((s: number, v: number) => s + v, 0).toLocaleString()
})

const summaryCards = computed(() => [
  { label: '总租户', value: statsData.value.totalTenants || 0, color: '#409eff' },
  { label: '已授权', value: statsData.value.authorizedTenants || 0, color: '#67c23a' },
  { label: '总客户', value: (statsData.value.totalCustomers || 0).toLocaleString(), color: '#e6a23c' },
  { label: '总客户群', value: statsData.value.totalGroups || 0, color: '#909399' },
  { label: '获客添加/期', value: (statsData.value.monthAcquisition || 0).toLocaleString(), color: '#f56c6c' },
  { label: 'AI调用/期', value: (statsData.value.monthAiCalls || 0).toLocaleString(), color: '#7C3AED' },
  { label: '存档消息', value: (statsData.value.totalChatRecords || 0).toLocaleString(), color: '#00acc1' },
  { label: '累计收入', value: '¥' + (statsData.value.totalPaymentAmount || 0).toLocaleString(), color: '#ff6b6b' },
])

// SVG trend chart helpers
const trendPts = computed(() => {
  const data = trendData.value.series[0]?.data || []
  if (!data.length) return []
  const maxVal = Math.max(...data, 1)
  return data.map((v: number, i: number) => ({
    x: 40 + (i / Math.max(data.length - 1, 1)) * 750,
    y: 145 - (v / maxVal) * 130
  }))
})
const trendLinePts = computed(() => trendPts.value.map((p: any) => `${p.x},${p.y}`).join(' '))
const trendAreaPts = computed(() => {
  const pts = trendPts.value
  if (!pts.length) return ''
  return pts.map((p: any) => `${p.x},${p.y}`).join(' ') + ` ${pts[pts.length - 1].x},145 ${pts[0].x},145`
})
const trendXLabels = computed(() => {
  const dates = trendData.value.dates
  if (!dates.length) return []
  const step = Math.max(1, Math.floor(dates.length / 8))
  return dates.filter((_: string, i: number) => i % step === 0 || i === dates.length - 1).map((d: string) => ({
    x: 40 + ((dates.indexOf(d)) / Math.max(dates.length - 1, 1)) * 750,
    label: String(d).slice(5)
  }))
})

const fetchTrend = async () => {
  try {
    const res: any = await getDataStatsTrends({ period: period.value, type: trendType.value })
    trendData.value = res?.data || res || { dates: [], series: [] }
  } catch {
    trendData.value = { dates: [], series: [] }
    ElMessage.error('趋势数据加载失败，请稍后重试')
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const [statsRes, rankRes] = await Promise.all([
      getDataStats({ period: period.value }),
      getDataStatsRankings({ period: period.value })
    ])
    statsData.value = statsRes?.data || statsRes || {}
    const rankData = rankRes?.data || rankRes
    rankings.value = Array.isArray(rankData) ? rankData : (rankData?.list || [])
    await fetchTrend()
  } catch {
    statsData.value = {}
    rankings.value = []
    ElMessage.error('数据统计加载失败，请稍后重试')
  }
  loading.value = false
}

const handleExport = async () => {
  exporting.value = true
  try {
    const res: any = await exportDataStats({ period: period.value })
    const blob = new Blob([res], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `data-stats-${period.value}.csv`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e: any) { ElMessage.error(e?.message || '导出失败') }
  exporting.value = false
}

const handleExportExcel = async () => {
  exporting.value = true
  try {
    const XLSX = await import('xlsx')
    const data = rankings.value.map((r: any, i: number) => ({
      '排名': i + 1,
      '租户名称': r.tenantName || r.tenantId,
      '客户数': r.customerCount || 0,
      '客户群': r.groupCount || 0,
      '获客添加': r.acquisitionCount || 0,
      'AI调用': r.aiCallCount || 0,
      '会话存档': r.chatArchiveEnabled ? '已开通' : '未开通',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '数据统计')
    XLSX.writeFile(wb, `数据统计-${period.value}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    ElMessage.success('Excel导出成功')
  } catch (e: any) { ElMessage.error(e?.message || 'Excel导出失败，请确认已安装xlsx依赖') }
  exporting.value = false
}

onMounted(fetchData)
</script>

<style scoped>
.page-container { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 600; }
.stat-card { text-align: center; }
.stat-num { font-size: 22px; font-weight: 700; }
.stat-label { font-size: 11px; color: #909399; margin-top: 4px; }
</style>
