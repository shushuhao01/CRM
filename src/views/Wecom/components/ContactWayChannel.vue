<template>
  <div class="contact-way-channel">
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
        <el-date-picker v-model="startDate" type="date" placeholder="开始日期" size="default" style="width: 150px" value-format="YYYY-MM-DD" @change="quickRange = 'custom'; fetchData()" />
        <span class="range-sep">至</span>
        <el-date-picker v-model="endDate" type="date" placeholder="结束日期" size="default" style="width: 150px" value-format="YYYY-MM-DD" @change="quickRange = 'custom'; fetchData()" />
      </div>
    </div>

    <div v-if="!configId" class="empty-state">
      <div class="empty-icon">📊</div>
      <div class="empty-title">暂无数据</div>
      <div class="empty-desc">请先选择企微配置</div>
    </div>

    <template v-else>
      <!-- 渠道来源分布可视化 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header-row">
            <span class="section-title">📊 渠道来源分布</span>
            <span class="total-hint">累计添加: {{ totalAdd }}人</span>
          </div>
        </template>
        <div class="channel-visual" v-loading="loading">
          <div v-for="(ch, idx) in channelData" :key="ch.state" class="channel-row">
            <div class="channel-rank">
              <span :class="'rank-badge rank-' + (idx < 3 ? idx + 1 : 'other')">{{ idx + 1 }}</span>
            </div>
            <div class="channel-info">
              <div class="channel-name">{{ ch.channelName }}</div>
              <div class="channel-meta">
                <el-tag size="small" type="info">{{ ch.state }}</el-tag>
                <span class="meta-text">{{ ch.contactWayCount }}个活码</span>
              </div>
            </div>
            <div class="channel-bar-area">
              <div class="channel-track">
                <div class="channel-fill" :style="{ width: ch.percent + '%', background: channelColors[idx % channelColors.length] }" />
              </div>
            </div>
            <div class="channel-numbers">
              <div class="num-main">{{ ch.addCount }}<span class="num-unit">人</span></div>
              <div class="num-pct">{{ ch.percent }}%</div>
            </div>
          </div>
          <div v-if="channelData.length === 0" class="no-data">暂无渠道数据</div>
        </div>
      </el-card>

      <!-- 渠道详细数据表格 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">🔗 渠道详细分析</span></template>
        <el-table :data="channelData" stripe size="default" v-loading="loading">
          <el-table-column label="渠道名称" min-width="120">
            <template #default="{ row }">
              <div class="ch-name-cell">
                <span class="ch-name">{{ row.channelName }}</span>
                <el-tag size="small" type="info" style="font-size: 10px">{{ row.state }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="contactWayCount" label="活码数" width="80" align="center" sortable />
          <el-table-column prop="addCount" label="累计添加" width="90" align="center" sortable />
          <el-table-column prop="lossCount" label="累计流失" width="90" align="center" sortable />
          <el-table-column label="净增" width="80" align="center">
            <template #default="{ row }">
              <span :class="row.netGrowth > 0 ? 'text-success' : row.netGrowth < 0 ? 'text-danger' : ''">
                {{ row.netGrowth > 0 ? '+' : '' }}{{ row.netGrowth }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="todayAdd" label="今日新增" width="85" align="center" />
          <el-table-column prop="todayLoss" label="今日流失" width="85" align="center" />
          <el-table-column prop="openMessageCount" label="开口消息" width="85" align="center" />
          <el-table-column prop="abnormalCount" label="异常数" width="75" align="center">
            <template #default="{ row }">
              <span :class="row.abnormalCount > 0 ? 'text-danger' : ''">{{ row.abnormalCount }}</span>
            </template>
          </el-table-column>
          <el-table-column label="留存率" width="85" align="center" sortable :sort-by="'retention'">
            <template #default="{ row }">
              <span class="retention-text">{{ row.retention }}%</span>
            </template>
          </el-table-column>
          <el-table-column label="占比" width="80" align="center" sortable :sort-by="'percent'">
            <template #default="{ row }">
              <span class="pct-text">{{ row.percent }}%</span>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-bar" v-if="channelTotal > channelPageSize">
          <span class="page-info">共 {{ channelTotal }} 个渠道</span>
          <el-pagination
            v-model:current-page="channelPage"
            v-model:page-size="channelPageSize"
            :page-sizes="[10, 20, 50]"
            :total="channelTotal"
            layout="total, sizes, prev, pager, next"
            small
            background
            @size-change="channelPage = 1; fetchData()"
            @current-change="fetchData"
          />
        </div>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { getContactWayChannelAnalysis } from '@/api/wecomContactWay'

const props = defineProps<{ configId: number | null }>()

const quickRange = ref('30d')
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const channelData = ref<any[]>([])
const channelTotal = ref(0)
const channelPage = ref(1)
const channelPageSize = ref(10)
const totalAdd = ref(0)

const channelColors = ['#4C6EF5', '#10B981', '#F59E0B', '#7C3AED', '#F472B6', '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#6366F1']

const quickOptions = [
  { label: '今日', value: 'today' }, { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'week' }, { label: '本月', value: 'month' },
  { label: '近7天', value: '7d' }, { label: '近30天', value: '30d' },
  { label: '近90天', value: '90d' }, { label: '全部', value: 'all' }
]

const getDateRange = (range: string) => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  switch (range) {
    case 'today': return { start: today, end: today }
    case 'yesterday': return { start: yesterday, end: yesterday }
    case 'week': return { start: weekStart.toISOString().split('T')[0], end: today }
    case 'month': return { start: monthStart.toISOString().split('T')[0], end: today }
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
  channelPage.value = 1
  fetchData()
}

const fetchData = async () => {
  if (!props.configId) return
  loading.value = true
  try {
    const { start, end } = getDateRange(quickRange.value)
    const res: any = await getContactWayChannelAnalysis({
      configId: props.configId,
      startDate: start || undefined, endDate: end || undefined,
      page: channelPage.value, pageSize: channelPageSize.value,
    })
    const data = res?.data || res
    channelData.value = data?.list || []
    channelTotal.value = data?.total || 0
    totalAdd.value = data?.totalAdd || channelData.value.reduce((s: number, c: any) => s + (c.addCount || 0), 0)
  } catch { channelData.value = [] }
  finally { loading.value = false }
}

watch(() => props.configId, (val) => { if (val) { channelPage.value = 1; fetchData() } })
onMounted(() => { if (props.configId) fetchData() })
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

.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; font-size: 14px; color: #1F2937; }
.section-header-row { display: flex; justify-content: space-between; align-items: center; }
.total-hint { font-size: 13px; color: #6B7280; }

/* 渠道分布可视化 */
.channel-visual { display: flex; flex-direction: column; gap: 14px; padding: 8px 0; }
.channel-row { display: flex; align-items: center; gap: 12px; }
.channel-rank { width: 32px; flex-shrink: 0; text-align: center; }
.rank-badge { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; font-size: 12px; font-weight: 700; }
.rank-1 { background: linear-gradient(135deg, #FEF3C7, #F59E0B); color: #92400E; }
.rank-2 { background: linear-gradient(135deg, #E5E7EB, #9CA3AF); color: #374151; }
.rank-3 { background: linear-gradient(135deg, #FED7AA, #F97316); color: #7C2D12; }
.rank-other { background: #F3F4F6; color: #6B7280; }

.channel-info { width: 140px; flex-shrink: 0; }
.channel-name { font-size: 14px; font-weight: 600; color: #1F2937; }
.channel-meta { display: flex; gap: 6px; align-items: center; margin-top: 2px; }
.meta-text { font-size: 11px; color: #9CA3AF; }

.channel-bar-area { flex: 1; min-width: 100px; }
.channel-track { height: 24px; background: #F3F4F6; border-radius: 12px; overflow: hidden; }
.channel-fill { height: 100%; border-radius: 12px; min-width: 4px; transition: width 0.6s ease; }

.channel-numbers { width: 100px; flex-shrink: 0; text-align: right; }
.num-main { font-size: 18px; font-weight: 700; color: #1F2937; }
.num-unit { font-size: 12px; color: #9CA3AF; margin-left: 2px; }
.num-pct { font-size: 12px; color: #6B7280; margin-top: 1px; }

/* 表格 */
.ch-name-cell { display: flex; flex-direction: column; gap: 2px; }
.ch-name { font-weight: 600; color: #1F2937; }
.pct-text { font-weight: 600; color: #4C6EF5; }

.text-success { color: #10B981; font-weight: 700; }
.text-warning { color: #F59E0B; font-weight: 600; }
.text-danger { color: #EF4444; font-weight: 600; }

.no-data { text-align: center; padding: 40px 0; color: #9CA3AF; font-size: 14px; }

.pagination-bar {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid #F3F4F6;
}
.page-info { font-size: 13px; color: #6B7280; }
</style>
