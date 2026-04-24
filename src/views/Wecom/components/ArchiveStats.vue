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

    <!-- 汇总卡片 - 紧凑美观 -->
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
              <el-radio-group v-model="trendType" size="small" @change="handleTrendTypeChange">
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
                <span class="type-name">{{ item.label }}</span>
                <el-progress :percentage="item.percent" :stroke-width="12" :color="item.color" :show-text="false" style="flex:1" />
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
        </div>
      </template>
      <el-table :data="paginatedRanking" stripe size="small" max-height="400">
        <el-table-column label="排名" width="60" align="center">
          <template #default="{ $index }">
            <span :class="['rank-badge', (memberRankPage - 1) * memberRankPageSize + $index < 3 ? 'top' : '']">{{ (memberRankPage - 1) * memberRankPageSize + $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="成员" min-width="120" />
        <el-table-column prop="msgCount" label="消息数" width="100" sortable />
        <el-table-column prop="convCount" label="会话数" width="100" sortable />
        <el-table-column prop="avgResponse" label="平均响应(s)" width="120" sortable />
        <el-table-column label="活跃度" width="150">
          <template #default="{ row }">
            <el-progress :percentage="row.activePercent || 0" :stroke-width="8" :show-text="true" :color="row.activePercent > 80 ? '#67c23a' : row.activePercent > 50 ? '#e6a23c' : '#f56c6c'" />
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

const dateRange = ref('7d')
const customStartDate = ref('')
const customEndDate = ref('')
const trendType = ref('msg')
const memberRankPage = ref(1)
const memberRankPageSize = ref(10)
const memberRankTotal = ref(0)

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
    gradient: 'linear-gradient(135deg,#f093fb,#f5576c)',
    displayValue: stats.avgResponseTime + 's',
    trendText: (stats.respTrend <= 0 ? '' : '+') + stats.respTrend + '%',
    trendClass: stats.respTrend <= 0 ? 'trend-up' : 'trend-down', valueClass: ''
  },
  {
    key: 'sensitive', icon: Warning, label: '敏感消息',
    gradient: 'linear-gradient(135deg,#fa709a,#fee140)',
    displayValue: String(stats.sensitiveCount),
    trendText: stats.sensitiveCount > 0 ? '需关注' : '',
    trendClass: 'trend-down', valueClass: stats.sensitiveCount > 0 ? 'text-danger' : ''
  },
])

const paginatedRanking = computed(() => {
  const start = (memberRankPage.value - 1) * memberRankPageSize.value
  return memberRanking.value.slice(start, start + memberRankPageSize.value)
})

const typeColors: Record<string, string> = {
  text: '#409EFF', image: '#67C23A', voice: '#E6A23C', video: '#F56C6C', file: '#909399', link: '#7C3AED'
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
  try {
    const res: any = await getChatArchiveStats(props.configId || 0)
    if (res) {
      stats.totalMsgs = res.totalMsgs || 0
      stats.conversationCount = res.conversationCount || 0
      stats.avgResponseTime = res.avgResponseTime || 0
      stats.sensitiveCount = res.sensitiveCount || 0
      stats.msgTrend = res.msgTrend || 0
      stats.convTrend = res.convTrend || 0
      stats.respTrend = res.respTrend || 0
      trendData.value = res.trend || []
      memberRanking.value = res.memberRanking || []
      memberRankTotal.value = res.memberRankTotal || memberRanking.value.length

      const types = res.typeDistribution || []
      const total = types.reduce((s: number, t: any) => s + (t.count || 0), 0) || 1
      typeDistribution.value = types.map((t: any) => ({
        type: t.type,
        label: ({ text: '文本', image: '图片', voice: '语音', video: '视频', file: '文件', link: '链接' } as Record<string, string>)[t.type] || t.type,
        count: t.count || 0,
        percent: Math.round(((t.count || 0) / total) * 100),
        color: typeColors[t.type] || '#909399'
      }))
    }
  } catch {
    if (props.isDemoMode) {
      stats.totalMsgs = 12580; stats.conversationCount = 456; stats.avgResponseTime = 32; stats.sensitiveCount = 8
      stats.msgTrend = 12.5; stats.convTrend = 8.3; stats.respTrend = -5.2
      trendData.value = [
        { dateLabel: '04-11', msgCount: 1520, convCount: 65 },
        { dateLabel: '04-12', msgCount: 1780, convCount: 72 },
        { dateLabel: '04-13', msgCount: 1650, convCount: 68 },
        { dateLabel: '04-14', msgCount: 2010, convCount: 85 },
        { dateLabel: '04-15', msgCount: 1890, convCount: 78 },
        { dateLabel: '04-16', msgCount: 1950, convCount: 80 },
        { dateLabel: '04-17', msgCount: 1780, convCount: 70 },
      ]
      typeDistribution.value = [
        { type: 'text', label: '文本', count: 8960, percent: 71, color: '#409EFF' },
        { type: 'image', label: '图片', count: 1890, percent: 15, color: '#67C23A' },
        { type: 'file', label: '文件', count: 880, percent: 7, color: '#909399' },
        { type: 'voice', label: '语音', count: 520, percent: 4, color: '#E6A23C' },
        { type: 'video', label: '视频', count: 330, percent: 3, color: '#F56C6C' },
      ]
      memberRanking.value = [
        { userName: '张三', msgCount: 3200, convCount: 120, avgResponse: 25, activePercent: 92 },
        { userName: '李四', msgCount: 2800, convCount: 98, avgResponse: 30, activePercent: 85 },
        { userName: '王五', msgCount: 2100, convCount: 76, avgResponse: 45, activePercent: 68 },
        { userName: '赵六', msgCount: 1600, convCount: 55, avgResponse: 38, activePercent: 72 },
        { userName: '钱七', msgCount: 1200, convCount: 42, avgResponse: 52, activePercent: 55 },
        { userName: '孙八', msgCount: 980, convCount: 35, avgResponse: 60, activePercent: 42 },
        { userName: '周九', msgCount: 860, convCount: 28, avgResponse: 55, activePercent: 38 },
        { userName: '吴十', msgCount: 720, convCount: 22, avgResponse: 48, activePercent: 45 },
        { userName: '郑一', msgCount: 650, convCount: 18, avgResponse: 65, activePercent: 30 },
        { userName: '王二', msgCount: 580, convCount: 15, avgResponse: 70, activePercent: 25 },
        { userName: '陈三', msgCount: 420, convCount: 12, avgResponse: 80, activePercent: 20 },
        { userName: '林四', msgCount: 350, convCount: 10, avgResponse: 90, activePercent: 15 },
      ]
      memberRankTotal.value = memberRanking.value.length
    }
  }
}

const getBarHeight = (item: any) => {
  const values = trendData.value.map(d => trendType.value === 'msg' ? d.msgCount : d.convCount)
  const max = Math.max(...values, 1)
  const val = trendType.value === 'msg' ? item.msgCount : item.convCount
  return Math.max(5, Math.round((val / max) * 100))
}

const handleTrendTypeChange = () => {
  // 趋势类型切换时触发视图重新计算，数据已在trendData中
}

const handleExport = () => { ElMessage.info('报表导出功能开发中') }

watch(() => props.configId, () => { fetchStats() })
onMounted(() => { fetchStats() })
</script>

<style scoped lang="scss">
.stats-filter-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin-bottom: 20px; padding: 12px 16px; background: #fff;
  border: 1px solid #ebeef5; border-radius: 10px;
}
.quick-date-btns {
  display: flex; gap: 6px;
  .el-button { min-width: 70px; font-size: 14px; padding: 8px 16px; }
}
.custom-date-range {
  display: flex; align-items: center; gap: 6px;
  .date-sep { color: #909399; font-size: 13px; }
}

.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.stat-card {
  background: #fff; border: 1px solid #EBEEF5; border-radius: 10px; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px; transition: box-shadow 0.2s; position: relative;
  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
}
.stat-card-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-card-info { flex: 1; min-width: 0; }
.stat-card-value { font-size: 20px; font-weight: 700; color: #1F2937; line-height: 1.2; }
.stat-card-label { font-size: 11px; color: #9CA3AF; margin-top: 1px; }
.stat-card-trend { font-size: 11px; font-weight: 600; position: absolute; top: 10px; right: 12px; }
.trend-up { color: #10B981; }
.trend-down { color: #EF4444; }
.text-danger { color: #EF4444; }

.chart-card { border-radius: 10px; margin-bottom: 16px; }
.chart-header { display: flex; justify-content: space-between; align-items: center; }
.chart-title { font-size: 15px; font-weight: 600; color: #1F2937; }
.chart-body { min-height: 200px; }

.simple-bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 200px; padding: 0 10px; }
.bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
.bar-value { font-size: 11px; color: #606266; margin-bottom: 4px; font-weight: 600; }
.bar-fill {
  width: 100%; max-width: 40px; border-radius: 6px 6px 0 0;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  transition: height 0.5s ease; min-height: 4px;
}
.bar-label { font-size: 11px; color: #909399; margin-top: 6px; white-space: nowrap; }

.type-distribution { display: flex; flex-direction: column; gap: 12px; }
.type-row { display: flex; align-items: center; gap: 10px; }
.type-name { width: 40px; font-size: 12px; color: #606266; text-align: right; flex-shrink: 0; }
.type-count { width: 50px; font-size: 12px; color: #909399; text-align: right; flex-shrink: 0; }

.rank-badge { display: inline-block; width: 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 50%; font-size: 12px; font-weight: 700; color: #606266; background: #f0f2f5; }
.rank-badge.top { background: linear-gradient(135deg, #ffd700, #ffaa00); color: #fff; }

.pagination-wrapper { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>

