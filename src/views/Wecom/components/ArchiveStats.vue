<template>
  <div class="archive-stats">
    <!-- 筛选栏 -->
    <div class="stats-filter-bar">
      <div class="quick-date-btns">
        <el-button
          v-for="opt in dateOptions"
          :key="opt.value"
          :type="dateRange === opt.value ? 'primary' : 'default'"
          size="default"
          @click="handleDateRange(opt.value)"
        >{{ opt.label }}</el-button>
      </div>
      <div class="custom-date-range">
        <el-date-picker v-model="customStartDate" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" size="default" style="width:150px" />
        <span class="date-sep">至</span>
        <el-date-picker v-model="customEndDate" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" size="default" style="width:150px" />
        <el-button type="primary" size="default" @click="handleCustomDate" :disabled="!customStartDate || !customEndDate">查询</el-button>
      </div>
      <div style="flex:1"></div>
      <el-button size="default" @click="handleExport">📥 导出报表</el-button>
    </div>

    <!-- 汇总卡片 -->
    <div class="stat-cards">
      <div class="stat-card" v-for="card in statCards" :key="card.key">
        <div class="stat-card-icon" :style="{ background: card.gradient }">
          <el-icon :size="18" color="#fff"><component :is="card.icon" /></el-icon>
        </div>
        <div class="stat-card-info">
          <div class="stat-card-value" :class="card.valueClass">{{ card.displayValue }}</div>
          <div class="stat-card-label">{{ card.label }}</div>
        </div>
        <div class="stat-card-trend" :class="card.trendClass" v-if="card.trendText">
          {{ card.trendText }}
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="16">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="chart-header">
              <span class="chart-title">消息趋势</span>
              <el-radio-group v-model="trendType" size="small">
                <el-radio-button label="msg">消息量</el-radio-button>
                <el-radio-button label="conv">会话数</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-body">
            <div v-if="trendData.length > 0" class="simple-bar-chart">
              <div v-for="(item, idx) in trendData" :key="idx" class="bar-item">
                <div class="bar-value">{{ trendType === 'msg' ? item.msgCount : item.convCount }}</div>
                <div class="bar-fill" :style="{ height: getBarHeight(item) + '%' }"></div>
                <div class="bar-label">{{ item.dateLabel }}</div>
              </div>
            </div>
            <el-empty v-else description="暂无趋势数据" :image-size="60" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <span class="chart-title">消息类型分布</span>
          </template>
          <div class="chart-body">
            <div v-if="typeDistribution.length > 0" class="type-distribution">
              <div v-for="item in typeDistribution" :key="item.type" class="type-row">
                <span class="type-dot" :style="{ background: item.color }"></span>
                <span class="type-name">{{ item.label }}</span>
                <div class="type-bar-bg">
                  <div class="type-bar-fill" :style="{ width: item.percent + '%', background: item.color }"></div>
                </div>
                <span class="type-count">{{ item.count }}</span>
              </div>
            </div>
            <el-empty v-else description="暂无类型数据" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 成员排行 -->
    <el-card shadow="never" class="chart-card">
      <template #header>
        <div class="chart-header">
          <span class="chart-title">成员消息量排行</span>
          <span class="chart-subtitle">仅统计企业微信内部成员</span>
        </div>
      </template>
      <el-table :data="paginatedRanking" stripe size="small" max-height="400" class="ranking-table">
        <el-table-column label="排名" width="60" align="center">
          <template #default="{ $index }">
            <span :class="['rank-badge', getRankClass((memberRankPage - 1) * memberRankPageSize + $index)]">
              {{ (memberRankPage - 1) * memberRankPageSize + $index + 1 }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="成员" min-width="120" />
        <el-table-column prop="msgCount" label="消息数" width="100" sortable />
        <el-table-column prop="convCount" label="会话数" width="100" sortable />
        <el-table-column prop="avgResponse" label="平均响应(s)" width="120" sortable />
        <el-table-column label="活跃度" width="150">
          <template #default="{ row }">
            <el-progress
              :percentage="row.activePercent || 0"
              :stroke-width="8"
              :show-text="true"
              :color="getActiveColor(row.activePercent)"
            />
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="memberRankPage"
          v-model:page-size="memberRankPageSize"
          :total="memberRankTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          small
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ChatLineSquare, Connection, Timer, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getChatArchiveStats } from '@/api/wecom'

const props = defineProps<{ configId?: number | null; isDemoMode?: boolean }>()

const dateRange = ref('today')
const customStartDate = ref('')
const customEndDate = ref('')
const trendType = ref('msg')
const memberRankPage = ref(1)
const memberRankPageSize = ref(10)
const memberRankTotal = ref(0)
const loading = ref(false)

const dateOptions = [
  { label: '今日', value: 'today' },
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
  { label: '近90天', value: '90d' },
]

const stats = reactive({
  totalMsgs: 0, conversationCount: 0, avgResponseTime: 0, sensitiveCount: 0,
  msgTrend: 0, convTrend: 0, respTrend: 0
})

const trendData = ref<any[]>([])
const typeDistribution = ref<any[]>([])
const memberRanking = ref<any[]>([])

const statCards = computed(() => [
  {
    key: 'msgs', icon: ChatLineSquare, label: '消息总数',
    gradient: 'linear-gradient(135deg,#667eea,#764ba2)',
    displayValue: stats.totalMsgs.toLocaleString(),
    trendText: (stats.msgTrend >= 0 ? '+' : '') + stats.msgTrend + '%',
    trendClass: stats.msgTrend >= 0 ? 'trend-up' : 'trend-down', valueClass: ''
  },
  {
    key: 'conv', icon: Connection, label: '会话数',
    gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)',
    displayValue: stats.conversationCount.toLocaleString(),
    trendText: (stats.convTrend >= 0 ? '+' : '') + stats.convTrend + '%',
    trendClass: stats.convTrend >= 0 ? 'trend-up' : 'trend-down', valueClass: ''
  },
  {
    key: 'resp', icon: Timer, label: '平均响应',
    gradient: 'linear-gradient(135deg,#a18cd1,#fbc2eb)',
    displayValue: stats.avgResponseTime + 's',
    trendText: (stats.respTrend <= 0 ? '' : '+') + stats.respTrend + '%',
    trendClass: stats.respTrend <= 0 ? 'trend-up' : 'trend-down', valueClass: ''
  },
  {
    key: 'sensitive', icon: Warning, label: '敏感消息',
    gradient: 'linear-gradient(135deg,#ffecd2,#fcb69f)',
    displayValue: String(stats.sensitiveCount),
    trendText: stats.sensitiveCount > 0 ? '需关注' : '',
    trendClass: 'trend-warn', valueClass: stats.sensitiveCount > 0 ? 'text-warn' : ''
  },
])

const paginatedRanking = computed(() => {
  const start = (memberRankPage.value - 1) * memberRankPageSize.value
  return memberRanking.value.slice(start, start + memberRankPageSize.value)
})

const typeColorMap: Record<string, string> = {
  text: '#6366f1', image: '#22c55e', voice: '#f59e0b', video: '#ef4444',
  file: '#8b5cf6', link: '#06b6d4', weapp: '#64748b', location: '#14b8a6',
  emotion: '#f97316', card: '#ec4899', revoke: '#94a3b8'
}

const typeLabelMap: Record<string, string> = {
  text: '文本', image: '图片', voice: '语音', video: '视频', file: '文件',
  link: '链接', weapp: '小程序', location: '位置', emotion: '表情',
  card: '名片', revoke: '撤回', unknown: '未知'
}

const getDateParams = (): { startDate?: string; endDate?: string } => {
  if (dateRange.value === 'custom') {
    return { startDate: customStartDate.value, endDate: customEndDate.value }
  }
  const now = new Date()
  const end = now.toISOString().split('T')[0]
  let start = end
  if (dateRange.value === 'today') {
    start = end
  } else if (dateRange.value === '7d') {
    start = new Date(now.getTime() - 6 * 86400000).toISOString().split('T')[0]
  } else if (dateRange.value === '30d') {
    start = new Date(now.getTime() - 29 * 86400000).toISOString().split('T')[0]
  } else if (dateRange.value === '90d') {
    start = new Date(now.getTime() - 89 * 86400000).toISOString().split('T')[0]
  }
  return { startDate: start, endDate: end }
}

const handleDateRange = (val: string) => {
  dateRange.value = val
  customStartDate.value = ''
  customEndDate.value = ''
  fetchStats()
}

const handleCustomDate = () => {
  dateRange.value = 'custom'
  fetchStats()
}

const fetchStats = async () => {
  if (!props.configId && !props.isDemoMode) return
  loading.value = true
  try {
    const dateParams = getDateParams()
    const rawRes: any = await getChatArchiveStats(props.configId || 0, dateParams)
    const res = rawRes?.data || rawRes
    if (res) {
      stats.totalMsgs = res.totalMsgs || res.totalRecords || 0
      stats.conversationCount = res.conversationCount || res.totalConversations || 0
      stats.avgResponseTime = res.avgResponseTime || 0
      stats.sensitiveCount = res.sensitiveCount || 0
      stats.msgTrend = res.msgTrend || 0
      stats.convTrend = res.convTrend || 0
      stats.respTrend = res.respTrend || 0
      trendData.value = res.trend || []
      memberRanking.value = res.memberRanking || []
      memberRankTotal.value = res.memberRankTotal || memberRanking.value.length
      memberRankPage.value = 1

      const types = res.typeDistribution || []
      const total = types.reduce((s: number, t: any) => s + (t.count || 0), 0) || 1
      typeDistribution.value = types.map((t: any) => ({
        type: t.type,
        label: typeLabelMap[t.type] || t.type,
        count: t.count || 0,
        percent: Math.round(((t.count || 0) / total) * 100),
        color: typeColorMap[t.type] || '#94a3b8'
      }))
    }
  } catch (e) {
    console.error('[ArchiveStats] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

const getBarHeight = (item: any) => {
  const values = trendData.value.map(d => trendType.value === 'msg' ? d.msgCount : d.convCount)
  const max = Math.max(...values, 1)
  const val = trendType.value === 'msg' ? item.msgCount : item.convCount
  return Math.max(5, Math.round((val / max) * 100))
}

const getRankClass = (idx: number) => {
  if (idx === 0) return 'rank-gold'
  if (idx === 1) return 'rank-silver'
  if (idx === 2) return 'rank-bronze'
  return ''
}

const getActiveColor = (percent: number) => {
  if (percent > 80) return '#22c55e'
  if (percent > 50) return '#f59e0b'
  return '#ef4444'
}

const handleExport = () => { ElMessage.info('报表导出功能开发中') }

watch(() => props.configId, () => { fetchStats() })
onMounted(() => { fetchStats() })
</script>

<style scoped lang="scss">
.stats-filter-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin-bottom: 20px; padding: 12px 16px; background: #fff;
  border: 1px solid #f0f0f0; border-radius: 10px;
}
.quick-date-btns {
  display: flex; gap: 6px;
  .el-button { min-width: 70px; font-size: 14px; padding: 8px 16px; border-radius: 8px; }
}
.custom-date-range {
  display: flex; align-items: center; gap: 6px;
  .date-sep { color: #94a3b8; font-size: 13px; }
}

.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.stat-card {
  background: #fff; border: 1px solid #f0f0f0; border-radius: 12px; padding: 16px 18px;
  display: flex; align-items: center; gap: 14px; transition: all 0.25s; position: relative;
  &:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.05); transform: translateY(-1px); }
}
.stat-card-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-card-info { flex: 1; min-width: 0; }
.stat-card-value { font-size: 22px; font-weight: 700; color: #1e293b; line-height: 1.2; }
.stat-card-label { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.stat-card-trend { font-size: 11px; font-weight: 600; position: absolute; top: 12px; right: 14px; }
.trend-up { color: #22c55e; }
.trend-down { color: #ef4444; }
.trend-warn { color: #f59e0b; }
.text-warn { color: #f59e0b; }

.chart-card {
  border-radius: 12px; margin-bottom: 16px; border-color: #f0f0f0;
  :deep(.el-card__header) { padding: 14px 18px; border-bottom-color: #f5f5f5; }
  :deep(.el-card__body) { padding: 16px 18px; }
}
.chart-header { display: flex; justify-content: space-between; align-items: center; }
.chart-title { font-size: 15px; font-weight: 600; color: #1e293b; }
.chart-subtitle { font-size: 12px; color: #94a3b8; margin-left: 8px; }
.chart-body { min-height: 200px; }

.simple-bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 200px; padding: 0 8px; }
.bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
.bar-value { font-size: 11px; color: #64748b; margin-bottom: 4px; font-weight: 600; }
.bar-fill {
  width: 100%; max-width: 36px; border-radius: 6px 6px 0 0;
  background: linear-gradient(180deg, #818cf8 0%, #c7d2fe 100%);
  transition: height 0.5s ease; min-height: 4px;
}
.bar-label { font-size: 10px; color: #94a3b8; margin-top: 6px; white-space: nowrap; }

.type-distribution { display: flex; flex-direction: column; gap: 14px; }
.type-row { display: flex; align-items: center; gap: 8px; }
.type-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.type-name { width: 42px; font-size: 12px; color: #64748b; text-align: right; flex-shrink: 0; }
.type-bar-bg { flex: 1; height: 10px; background: #f1f5f9; border-radius: 5px; overflow: hidden; }
.type-bar-fill { height: 100%; border-radius: 5px; transition: width 0.5s ease; opacity: 0.7; }
.type-count { width: 40px; font-size: 12px; color: #64748b; text-align: right; flex-shrink: 0; font-weight: 500; }

.rank-badge {
  display: inline-flex; width: 24px; height: 24px; align-items: center; justify-content: center;
  border-radius: 50%; font-size: 12px; font-weight: 700; color: #64748b; background: #f1f5f9;
}
.rank-gold { background: linear-gradient(135deg, #fcd34d, #f59e0b); color: #fff; }
.rank-silver { background: linear-gradient(135deg, #d1d5db, #9ca3af); color: #fff; }
.rank-bronze { background: linear-gradient(135deg, #fdba74, #f97316); color: #fff; }

.ranking-table {
  :deep(.el-table__row) { transition: background-color 0.2s; }
  :deep(th) { background: #fafbfc !important; font-weight: 600; color: #475569; }
}

.pagination-wrapper { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
