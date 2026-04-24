<template>
  <div class="contact-way-stats">
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
        <el-date-picker v-model="startDate" type="date" placeholder="开始日期" size="default" style="width: 150px" value-format="YYYY-MM-DD" @change="quickRange = 'custom'; fetchAll()" />
        <span class="range-sep">至</span>
        <el-date-picker v-model="endDate" type="date" placeholder="结束日期" size="default" style="width: 150px" value-format="YYYY-MM-DD" @change="quickRange = 'custom'; fetchAll()" />
      </div>
    </div>

    <!-- 未配置空状态 -->
    <div v-if="!configId" class="empty-state">
      <div class="empty-icon">📊</div>
      <div class="empty-title">暂无数据</div>
      <div class="empty-desc">请先选择企微配置</div>
    </div>

    <template v-else>
      <!-- 6个统计卡片 -->
      <div class="stat-cards" v-loading="overviewLoading">
        <div class="stat-card">
          <div class="stat-icon">📥</div>
          <div class="stat-body">
            <div class="stat-value">{{ stats.totalAdd }}</div>
            <div class="stat-label">累计新增</div>
            <div class="stat-today">今日 <strong>{{ stats.todayAdd }}</strong></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📤</div>
          <div class="stat-body">
            <div class="stat-value text-danger">{{ stats.totalLoss }}</div>
            <div class="stat-label">累计流失</div>
            <div class="stat-today">今日 <strong>{{ stats.todayLoss }}</strong></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📈</div>
          <div class="stat-body">
            <div class="stat-value text-success">{{ stats.netGrowth }}</div>
            <div class="stat-label">净增长</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-body">
            <div class="stat-value text-primary">{{ stats.avgRetention }}%</div>
            <div class="stat-label">平均留存率</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚠️</div>
          <div class="stat-body">
            <div class="stat-value text-warning">{{ stats.totalAbnormal }}</div>
            <div class="stat-label">异常总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💬</div>
          <div class="stat-body">
            <div class="stat-value" style="color: #7C3AED">{{ stats.totalOpenMessage }}</div>
            <div class="stat-label">开口消息</div>
          </div>
        </div>
      </div>

      <!-- 添加/流失趋势曲线图 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">📈 添加/流失趋势</span></template>
        <div v-loading="trendLoading" style="min-height: 280px">
          <TrendLineChart
            v-if="trendXLabels.length > 0"
            :data="[]"
            :multi-series="trendSeries"
            :x-labels="trendXLabels"
            :height="280"
          />
          <div v-else class="no-data">暂无趋势数据</div>
        </div>
      </el-card>

      <!-- 活码表现排行 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">🏅 活码表现排行</span></template>
        <el-table :data="rankingList" stripe size="small" v-loading="rankingLoading">
          <el-table-column label="排名" width="60" align="center">
            <template #default="{ $index }">
              <span :class="'rank-' + ((rankingPage - 1) * rankingPageSize + $index < 3 ? (rankingPage - 1) * rankingPageSize + $index + 1 : 'other')">
                {{ (rankingPage - 1) * rankingPageSize + $index + 1 }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="活码名称" min-width="130" />
          <el-table-column prop="channelName" label="渠道" width="90" />
          <el-table-column prop="addCount" label="添加数" width="80" sortable />
          <el-table-column prop="lossCount" label="流失数" width="80" sortable />
          <el-table-column label="净增" width="80">
            <template #default="{ row }">
              <span :class="row.addCount - row.lossCount > 0 ? 'text-success' : 'text-danger'">
                {{ row.addCount - row.lossCount }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="todayAdd" label="今日添加" width="85" />
          <el-table-column prop="openMessageCount" label="开口消息" width="85" />
          <el-table-column label="留存率" width="90">
            <template #default="{ row }">
              <span :class="retClass(row.retention)">{{ row.retention }}%</span>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-bar" v-if="rankingTotal > rankingPageSize">
          <span class="page-info">共 {{ rankingTotal }} 个活码</span>
          <el-pagination
            v-model:current-page="rankingPage"
            v-model:page-size="rankingPageSize"
            :page-sizes="[10, 20, 50]"
            :total="rankingTotal"
            layout="total, sizes, prev, pager, next"
            small
            background
            @size-change="rankingPage = 1; fetchRanking()"
            @current-change="fetchRanking"
          />
        </div>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import TrendLineChart from './TrendLineChart.vue'
import { getContactWayOverview, getContactWayTrend, getContactWayRanking } from '@/api/wecomContactWay'

const props = defineProps<{ configId: number | null }>()

const quickRange = ref('30d')
const startDate = ref('')
const endDate = ref('')
const overviewLoading = ref(false)
const trendLoading = ref(false)
const rankingLoading = ref(false)

const quickOptions = [
  { label: '今日', value: 'today' }, { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'week' }, { label: '本月', value: 'month' },
  { label: '上月', value: 'lastMonth' }, { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' }, { label: '近90天', value: '90d' },
  { label: '全部', value: 'all' }
]

// 日期范围计算
const getDateRange = (range: string) => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1)
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
    case '90d': return { start: new Date(now.getTime() - 89 * 86400000).toISOString().split('T')[0], end: today }
    case 'all': return { start: '', end: '' }
    case 'custom': return { start: startDate.value, end: endDate.value }
    default: return { start: today, end: today }
  }
}

const setQuickRange = (val: string) => {
  quickRange.value = val
  fetchAll()
}

// 数据状态
const stats = ref({
  totalAdd: 0, totalLoss: 0, netGrowth: 0, avgRetention: 0,
  todayAdd: 0, todayLoss: 0, totalAbnormal: 0, totalOpenMessage: 0
})

const trendXLabels = ref<string[]>([])
const trendSeries = ref<Array<{ name: string; data: number[]; color: string }>>([])

const rankingList = ref<any[]>([])
const rankingTotal = ref(0)
const rankingPage = ref(1)
const rankingPageSize = ref(10)

// 数据加载
const fetchOverview = async () => {
  if (!props.configId) return
  overviewLoading.value = true
  try {
    const { start, end } = getDateRange(quickRange.value)
    const res: any = await getContactWayOverview({
      configId: props.configId, startDate: start || undefined, endDate: end || undefined
    })
    const summary = res?.data?.summary || res?.summary || {}
    stats.value = {
      totalAdd: summary.totalAdd || 0, totalLoss: summary.totalLoss || 0,
      netGrowth: summary.netGrowth || 0, avgRetention: summary.avgRetention || 0,
      todayAdd: summary.todayAdd || 0, todayLoss: summary.todayLoss || 0,
      totalAbnormal: summary.totalAbnormal || 0, totalOpenMessage: summary.totalOpenMessage || 0,
    }
  } catch { /* ignore */ }
  finally { overviewLoading.value = false }
}

const fetchTrend = async () => {
  if (!props.configId) return
  trendLoading.value = true
  try {
    const { start, end } = getDateRange(quickRange.value)
    const res: any = await getContactWayTrend({
      configId: props.configId, startDate: start || undefined, endDate: end || undefined
    })
    const data = res?.data || res
    trendXLabels.value = (data?.dates || []).map((d: string) => d.slice(5)) // MM-DD
    const series = data?.series || []
    trendSeries.value = [
      { name: '新增', data: series[0]?.data || [], color: '#10B981' },
      { name: '流失', data: series[1]?.data || [], color: '#EF4444' },
    ]
  } catch { trendXLabels.value = []; trendSeries.value = [] }
  finally { trendLoading.value = false }
}

const fetchRanking = async () => {
  if (!props.configId) return
  rankingLoading.value = true
  try {
    const { start, end } = getDateRange(quickRange.value)
    const res: any = await getContactWayRanking({
      configId: props.configId, startDate: start || undefined, endDate: end || undefined,
      page: rankingPage.value, pageSize: rankingPageSize.value,
    })
    const data = res?.data || res
    rankingList.value = data?.list || []
    rankingTotal.value = data?.total || 0
  } catch { rankingList.value = [] }
  finally { rankingLoading.value = false }
}

const fetchAll = () => {
  fetchOverview()
  fetchTrend()
  rankingPage.value = 1
  fetchRanking()
}

const retClass = (rate: number) => rate >= 85 ? 'text-success' : rate >= 70 ? 'text-warning' : 'text-danger'

watch(() => props.configId, (val) => { if (val) fetchAll() })
onMounted(() => { if (props.configId) fetchAll() })
</script>

<style scoped>
.filter-bar { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
.quick-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.date-range { display: flex; align-items: center; gap: 6px; }
.range-sep { color: #9CA3AF; font-size: 13px; }

.empty-state { text-align: center; padding: 60px 0; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-title { font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 8px; }
.empty-desc { font-size: 13px; color: #9CA3AF; }

.stat-cards { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
@media (max-width: 1200px) { .stat-cards { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .stat-cards { grid-template-columns: repeat(2, 1fr); } }

.stat-card {
  background: #fff; border: 1px solid #EBEEF5; border-radius: 12px;
  padding: 16px; display: flex; gap: 12px; align-items: flex-start;
  transition: all 0.3s;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-icon { font-size: 24px; flex-shrink: 0; }
.stat-body { flex: 1; }
.stat-value { font-size: 24px; font-weight: 700; color: #1F2937; line-height: 1.2; }
.stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.stat-today { font-size: 12px; color: #9CA3AF; margin-top: 6px; padding-top: 6px; border-top: 1px solid #F3F4F6; }
.stat-today strong { color: #4B5563; }

.text-success { color: #10B981; }
.text-danger { color: #EF4444; }
.text-primary { color: #4C6EF5; }
.text-warning { color: #F59E0B; }

.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; font-size: 14px; color: #1F2937; }
.no-data { text-align: center; padding: 60px 0; color: #9CA3AF; font-size: 14px; }

.rank-1 { font-weight: 700; color: #F59E0B; font-size: 16px; }
.rank-2 { font-weight: 700; color: #9CA3AF; font-size: 16px; }
.rank-3 { font-weight: 700; color: #CD7F32; font-size: 16px; }
.rank-other { color: #6B7280; }

.pagination-bar {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid #F3F4F6;
}
.page-info { font-size: 13px; color: #6B7280; }
</style>

