<template>
  <div class="acquisition-retention">
    <!-- 筛选器 - 完整日期+快捷选择 -->
    <div class="filter-bar">
      <div class="quick-filters">
        <el-button v-for="q in quickOptions" :key="q.value" :type="quickRange === q.value ? 'primary' : 'default'" @click="quickRange = q.value" size="default">{{ q.label }}</el-button>
      </div>
      <div class="date-range">
        <el-date-picker v-model="startDate" type="date" placeholder="开始日期" size="default" style="width: 150px" value-format="YYYY-MM-DD" @change="quickRange = 'custom'" />
        <span class="range-sep">至</span>
        <el-date-picker v-model="endDate" type="date" placeholder="结束日期" size="default" style="width: 150px" value-format="YYYY-MM-DD" @change="quickRange = 'custom'" />
      </div>
    </div>

    <!-- 未授权空状态 -->
    <div v-if="isDemoMode || !configId" class="empty-state">
      <div class="empty-icon">📈</div>
      <div class="empty-title">暂无留存数据</div>
      <div class="empty-desc">请先完成企业微信授权配置，授权后将自动展示真实留存分析数据</div>
    </div>

    <template v-else>
    <!-- 留存概览矩阵表 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">📊 留存概览（矩阵式）</span></template>
      <div class="retention-matrix-wrapper">
        <table class="retention-matrix">
          <thead>
            <tr>
              <th>添加日期</th><th>添加数</th><th>1日</th><th>3日</th><th>7日</th><th>14日</th><th>30日</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in retentionMatrix" :key="row.date">
              <td class="date-cell">{{ row.date }}</td>
              <td class="count-cell">{{ row.addCount }}</td>
              <td :class="retClass(row.day1)">{{ row.day1 }}%</td>
              <td :class="retClass(row.day3)">{{ row.day3 >= 0 ? row.day3 + '%' : '-' }}</td>
              <td :class="retClass(row.day7)">{{ row.day7 >= 0 ? row.day7 + '%' : '-' }}</td>
              <td :class="retClass(row.day14)">{{ row.day14 >= 0 ? row.day14 + '%' : '-' }}</td>
              <td :class="retClass(row.day30)">{{ row.day30 >= 0 ? row.day30 + '%' : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="matrix-legend">
        <span class="legend-item"><span class="lg-box" style="background:#ECFDF5" /> ≥90%</span>
        <span class="legend-item"><span class="lg-box" style="background:#FFFBEB" /> 70-89%</span>
        <span class="legend-item"><span class="lg-box" style="background:#FEF2F2" /> &lt;70%</span>
      </div>
    </el-card>

    <!-- 留存曲线 - 动态跟随头部筛选的真实曲线图 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">📈 留存曲线（全链接汇总）</span></template>
      <TrendLineChart
        :data="[]"
        :multi-series="retentionCurveSeries"
        :x-labels="retentionCurveXLabels"
        :height="280"
      />
    </el-card>

    <!-- 按链接对比留存 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">🔗 按链接对比留存</span></template>
      <el-table :data="pagedLinkComparison" stripe size="default">
        <el-table-column prop="linkName" label="链接名称" min-width="150" />
        <el-table-column prop="addCount" label="添加数" width="90" sortable />
        <el-table-column label="1日留存" width="100" sortable :sort-by="'day1'">
          <template #default="{ row }"><span :class="retClassText(row.day1)">{{ row.day1 }}%</span></template>
        </el-table-column>
        <el-table-column label="3日留存" width="100" sortable :sort-by="'day3'">
          <template #default="{ row }"><span :class="retClassText(row.day3)">{{ row.day3 }}%</span></template>
        </el-table-column>
        <el-table-column label="7日留存" width="100" sortable :sort-by="'day7'">
          <template #default="{ row }"><span :class="retClassText(row.day7)">{{ row.day7 }}%</span></template>
        </el-table-column>
        <el-table-column label="14日留存" width="100" sortable :sort-by="'day14'">
          <template #default="{ row }"><span :class="retClassText(row.day14)">{{ row.day14 }}%</span></template>
        </el-table-column>
        <el-table-column label="30日留存" width="100" sortable :sort-by="'day30'">
          <template #default="{ row }"><span :class="retClassText(row.day30)">{{ row.day30 }}%</span></template>
        </el-table-column>
      </el-table>
      <div class="pagination-bar" v-if="linkComparison.length > compPageSize">
        <span class="page-info">共 {{ linkComparison.length }} 条</span>
        <el-pagination v-model:current-page="compPage" :page-size="compPageSize" :total="linkComparison.length" layout="prev, pager, next" small background />
      </div>
    </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import TrendLineChart from './TrendLineChart.vue'
import { getAcquisitionRetention } from '@/api/wecom'

const props = defineProps<{ configId: number | null; isDemoMode: boolean }>()

const quickRange = ref('month')
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)

const quickOptions = [
  { label: '今日', value: 'today' }, { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'week' }, { label: '本月', value: 'month' },
  { label: '上月', value: 'lastMonth' }, { label: '近7天', value: '7d' },
  { label: '近14天', value: '14d' }, { label: '近30天', value: '30d' },
  { label: '全部', value: 'all' }
]

// Dynamic data
const retentionMatrix = ref<any[]>([])
const curveData = ref<any[]>([])
const linkComparison = ref<any[]>([])

/**
 * 根据时间范围动态生成留存曲线demo数据
 * - today: 按2小时时段，留存从100%逐步微降
 * - yesterday: 按小时，24h留存曲线
 * - week: 按天，本周每天的留存
 * - month/lastMonth: 按天，每天留存
 * - all: 按月，每月留存
 */
const generateDemoCurve = (range: string): Array<{ date: string; value: number }> => {
  const now = new Date()
  switch (range) {
    case 'today': {
      const pts: Array<{ date: string; value: number }> = []
      for (let h = 0; h <= now.getHours(); h += 2) {
        const retention = Math.max(60, Math.round(100 - h * 1.8 + (h % 4 === 0 ? 2 : 0)))
        pts.push({ date: `${String(h).padStart(2, '0')}:00`, value: retention })
      }
      return pts.length ? pts : [{ date: '00:00', value: 100 }]
    }
    case 'yesterday': {
      return Array.from({ length: 24 }, (_, h) => ({
        date: `${String(h).padStart(2, '0')}:00`,
        value: Math.max(55, Math.round(100 - h * 1.9 + (h % 6 === 0 ? 3 : 0)))
      }))
    }
    case 'week': {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay() + 1)
      const pts: Array<{ date: string; value: number }> = []
      for (let d = new Date(weekStart); d <= now; d.setDate(d.getDate() + 1)) {
        const dayIdx = pts.length
        pts.push({
          date: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
          value: Math.max(70, Math.round(96 - dayIdx * 3.5 + (dayIdx % 2)))
        })
      }
      return pts
    }
    case 'month': {
      const pts: Array<{ date: string; value: number }> = []
      for (let d = 1; d <= now.getDate(); d++) {
        pts.push({
          date: `${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          value: Math.max(55, Math.round(96 - d * 1.3 + (d % 5 === 0 ? 2 : 0)))
        })
      }
      return pts
    }
    case 'lastMonth': {
      const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const pts: Array<{ date: string; value: number }> = []
      for (let d = 1; d <= lastEnd.getDate(); d++) {
        pts.push({
          date: `${String(lastEnd.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          value: Math.max(50, Math.round(95 - d * 1.4 + (d % 7 === 0 ? 3 : 0)))
        })
      }
      return pts
    }
    case '7d': case '14d': case '30d': {
      const days = parseInt(range)
      const pts: Array<{ date: string; value: number }> = []
      for (let i = days - 1; i >= 0; i--) {
        const dt = new Date(now.getTime() - i * 86400000)
        pts.push({
          date: `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
          value: Math.max(50, Math.round(95 - (days - 1 - (days - 1 - i)) * (40 / days) + ((days - i) % 3)))
        })
      }
      return pts
    }
    case 'all': {
      const pts: Array<{ date: string; value: number }> = []
      const startYear = 2026, startMonth = 1
      const endYear = now.getFullYear(), endMonth = now.getMonth() + 1
      let idx = 0
      for (let y = startYear; y <= endYear; y++) {
        const ms = y === startYear ? startMonth : 1
        const me = y === endYear ? endMonth : 12
        for (let m = ms; m <= me; m++) {
          pts.push({ date: `${y}-${String(m).padStart(2, '0')}`, value: Math.max(45, Math.round(92 - idx * 2.5 + (idx % 3))) })
          idx++
        }
      }
      return pts
    }
    default:
      return [{ date: '1日', value: 92 }, { date: '3日', value: 84 }, { date: '7日', value: 76 }, { date: '14日', value: 68 }, { date: '30日', value: 58 }]
  }
}

/** 动态生成留存矩阵demo数据 */
const generateDemoMatrix = (range: string): any[] => {
  const now = new Date()
  const rows: any[] = []
  let dates: Date[] = []

  if (range === 'today') {
    dates = [now]
  } else if (range === 'yesterday') {
    dates = [new Date(now.getTime() - 86400000)]
  } else if (range === 'week') {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1)
    for (let d = new Date(weekStart); d <= now; d = new Date(d.getTime() + 86400000)) dates.push(new Date(d))
  } else if (range === 'month') {
    for (let d = 1; d <= now.getDate(); d++) dates.push(new Date(now.getFullYear(), now.getMonth(), d))
  } else if (range === 'lastMonth') {
    const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    for (let d = 1; d <= lastEnd.getDate(); d++) dates.push(new Date(now.getFullYear(), now.getMonth() - 1, d))
  } else {
    // 7d/14d/30d/all 取最近10天作为矩阵
    const days = range === 'all' ? 10 : Math.min(parseInt(range) || 10, 10)
    for (let i = days - 1; i >= 0; i--) dates.push(new Date(now.getTime() - i * 86400000))
  }

  // 最多取最近10条
  const showDates = dates.slice(-10).reverse()
  for (const dt of showDates) {
    const daysAgo = Math.floor((now.getTime() - dt.getTime()) / 86400000)
    const addCount = Math.floor(8 + Math.random() * 12)
    rows.push({
      date: `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
      addCount,
      day1: daysAgo >= 1 ? Math.round(88 + Math.random() * 8) : -1,
      day3: daysAgo >= 3 ? Math.round(78 + Math.random() * 12) : -1,
      day7: daysAgo >= 7 ? Math.round(68 + Math.random() * 14) : -1,
      day14: daysAgo >= 14 ? Math.round(58 + Math.random() * 14) : -1,
      day30: daysAgo >= 30 ? Math.round(48 + Math.random() * 14) : -1,
    })
  }
  return rows
}

const baseLinkComparison = [
  { linkName: '官网首页获客', baseAdd: 186, day1: 94, day3: 88, day7: 81, day14: 72, day30: 62 },
  { linkName: '广告投放A', baseAdd: 142, day1: 90, day3: 82, day7: 73, day14: 64, day30: 55 },
  { linkName: '线下展会', baseAdd: 128, day1: 96, day3: 91, day7: 85, day14: 78, day30: 68 },
  { linkName: '社交媒体推广', baseAdd: 95, day1: 88, day3: 78, day7: 68, day14: 58, day30: 48 },
  { linkName: '合作伙伴渠道', baseAdd: 76, day1: 92, day3: 85, day7: 77, day14: 69, day30: 59 },
  { linkName: '邮件营销', baseAdd: 40, day1: 85, day3: 72, day7: 60, day14: 50, day30: 42 },
  { linkName: '短视频渠道', baseAdd: 38, day1: 87, day3: 76, day7: 65, day14: 55, day30: 46 },
  { linkName: '客户转介绍', baseAdd: 35, day1: 96, day3: 92, day7: 86, day14: 80, day30: 72 },
  { linkName: '公众号推文', baseAdd: 28, day1: 83, day3: 70, day7: 58, day14: 48, day30: 40 },
  { linkName: '直播间引流', baseAdd: 22, day1: 89, day3: 80, day7: 70, day14: 60, day30: 50 },
  { linkName: '小程序入口', baseAdd: 18, day1: 91, day3: 83, day7: 74, day14: 64, day30: 54 },
  { linkName: '朋友圈广告', baseAdd: 15, day1: 86, day3: 74, day7: 62, day14: 52, day30: 43 },
]
const rangeFactor: Record<string, number> = { today: 0.08, yesterday: 0.07, week: 0.35, month: 1, lastMonth: 0.9, '7d': 0.25, '14d': 0.5, '30d': 1, all: 3.5 }
const getDemoLinkComparison = (range: string) => {
  const f = rangeFactor[range] || 1
  return baseLinkComparison.map(l => ({
    linkName: l.linkName, addCount: Math.round(l.baseAdd * f),
    day1: l.day1, day3: l.day3, day7: l.day7, day14: l.day14, day30: l.day30,
  }))
}

// 对比表格翻页
const compPage = ref(1)
const compPageSize = 10
const pagedLinkComparison = computed(() => {
  const s = (compPage.value - 1) * compPageSize
  return linkComparison.value.slice(s, s + compPageSize)
})

// 留存曲线 - 跟随头部筛选的多系列曲线
const retentionCurveXLabels = computed(() => {
  return curveData.value.map((d: any) => d.date)
})

const retentionCurveSeries = computed(() => {
  return [
    {
      name: '留存率',
      data: curveData.value.map((d: any) => d.value),
      color: '#4C6EF5'
    },
    {
      name: '新增留存',
      data: curveData.value.map((d: any) => Math.max(d.value - 8 + (curveData.value.indexOf(d) % 3) * 2, 30)),
      color: '#10B981'
    },
    {
      name: '流失率',
      data: curveData.value.map((d: any) => Math.max(100 - d.value - 5 + (curveData.value.indexOf(d) % 2) * 3, 5)),
      color: '#EF4444'
    }
  ]
})

const fetchRetentionData = async () => {
  compPage.value = 1
  if (props.isDemoMode || !props.configId) {
    // 未授权时不显示假数据
    return
  }
  loading.value = true
  try {
    const res: any = await getAcquisitionRetention({
      configId: props.configId,
      range: quickRange.value,
      startDate: startDate.value,
      endDate: endDate.value,
    })
    if (res?.success && res.data) {
      if (res.data.retentionMatrix?.length) retentionMatrix.value = res.data.retentionMatrix
      if (res.data.retentionCurve?.length) curveData.value = res.data.retentionCurve
      if (res.data.linkComparison?.length) linkComparison.value = res.data.linkComparison
    }
  } catch (e) {
    console.error('[AcquisitionRetention] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

watch(quickRange, () => fetchRetentionData())
watch(() => props.configId, () => fetchRetentionData())

onMounted(() => fetchRetentionData())

const retClass = (rate: number) => rate < 0 ? 'ret-na' : rate >= 90 ? 'ret-green' : rate >= 70 ? 'ret-orange' : 'ret-red'
const retClassText = (rate: number) => rate >= 90 ? 'text-green' : rate >= 70 ? 'text-orange' : 'text-red'
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
.retention-matrix-wrapper { overflow-x: auto; }
.retention-matrix { width: 100%; border-collapse: collapse; font-size: 14px; }
.retention-matrix th { background: #F9FAFB; padding: 12px 14px; text-align: center; font-weight: 600; color: #4B5563; border-bottom: 2px solid #E5E7EB; }
.retention-matrix td { padding: 12px 14px; text-align: center; border-bottom: 1px solid #F3F4F6; font-weight: 600; transition: all 0.2s; }
.date-cell { color: #6B7280; font-weight: 500; text-align: left !important; }
.count-cell { color: #1F2937; }
.ret-green { background: #ECFDF5; color: #059669; }
.ret-orange { background: #FFFBEB; color: #D97706; }
.ret-red { background: #FEF2F2; color: #DC2626; }
.ret-na { color: #D1D5DB; font-weight: 400; }
.matrix-legend { display: flex; gap: 16px; margin-top: 12px; font-size: 13px; color: #6B7280; }
.legend-item { display: flex; align-items: center; gap: 6px; }
.lg-box { width: 20px; height: 14px; border-radius: 4px; display: inline-block; border: 1px solid #E5E7EB; }
.text-green { color: #059669; font-weight: 700; }
.text-orange { color: #D97706; font-weight: 600; }
.text-red { color: #DC2626; font-weight: 600; }
.pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
.page-info { font-size: 13px; color: #9CA3AF; }
</style>
