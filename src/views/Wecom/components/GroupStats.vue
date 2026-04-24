<template>
  <div class="group-stats">
    <!-- 时间筛选 -->
    <div class="tab-actions">
      <el-radio-group v-model="dateRange" size="small" @change="refreshStats">
        <el-radio-button label="today">今日</el-radio-button>
        <el-radio-button label="7d">7天</el-radio-button>
        <el-radio-button label="30d">30天</el-radio-button>
        <el-radio-button label="custom">自定义</el-radio-button>
      </el-radio-group>
      <template v-if="dateRange === 'custom'">
        <el-date-picker
          v-model="customStart"
          type="date"
          placeholder="开始日期"
          size="small"
          style="width: 150px; margin-left: 12px"
          @change="refreshStats"
        />
        <span style="color: #9CA3AF; margin: 0 4px">至</span>
        <el-date-picker
          v-model="customEnd"
          type="date"
          placeholder="结束日期"
          size="small"
          style="width: 150px"
          @change="refreshStats"
        />
      </template>
    </div>

    <!-- 统计卡片 - 重构UI -->
    <div class="stats-grid">
      <div class="stats-card blue">
        <div class="stats-card-icon">👥</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ stats.totalGroups }}</div>
          <div class="stats-card-label">群总数</div>
        </div>
      </div>
      <div class="stats-card indigo">
        <div class="stats-card-icon">👤</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ stats.totalMembers }}</div>
          <div class="stats-card-label">成员总数</div>
        </div>
      </div>
      <div class="stats-card green">
        <div class="stats-card-icon">📥</div>
        <div class="stats-card-body">
          <div class="stats-card-value">+{{ stats.joinCount }}</div>
          <div class="stats-card-label">入群人数</div>
        </div>
      </div>
      <div class="stats-card red">
        <div class="stats-card-icon">📤</div>
        <div class="stats-card-body">
          <div class="stats-card-value">-{{ stats.leaveCount }}</div>
          <div class="stats-card-label">退群人数</div>
        </div>
      </div>
      <div class="stats-card" :class="stats.netGrowth >= 0 ? 'green' : 'red'">
        <div class="stats-card-icon">📈</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ stats.netGrowth >= 0 ? '+' : '' }}{{ stats.netGrowth }}</div>
          <div class="stats-card-label">净增长</div>
        </div>
      </div>
      <div class="stats-card amber">
        <div class="stats-card-icon">🔥</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ stats.activePercent }}%</div>
          <div class="stats-card-label">活跃群占比</div>
        </div>
      </div>
      <div class="stats-card purple">
        <div class="stats-card-icon">💬</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ stats.msgCount }}</div>
          <div class="stats-card-label">消息总数</div>
        </div>
      </div>
      <div class="stats-card orange">
        <div class="stats-card-icon">🛡️</div>
        <div class="stats-card-body">
          <div class="stats-card-value">{{ stats.spamBlocked }}</div>
          <div class="stats-card-label">防骚扰拦截</div>
        </div>
      </div>
    </div>

    <!-- 趋势图表 -->
    <div class="chart-section">
      <div class="chart-header">
        <span class="chart-title">群成员增长趋势</span>
        <el-radio-group v-model="chartType" size="small" @change="refreshTrend">
          <el-radio-button label="member">成员</el-radio-button>
          <el-radio-button label="group">群数</el-radio-button>
          <el-radio-button label="message">消息</el-radio-button>
        </el-radio-group>
      </div>
      <TrendLineChart
        :data="trendChartData"
        :series-name="chartType === 'member' ? '成员数' : chartType === 'group' ? '群数' : '消息数'"
        :color="chartType === 'member' ? '#4C6EF5' : chartType === 'group' ? '#10B981' : '#F59E0B'"
        :height="280"
      />
    </div>

    <!-- 群活跃排行 -->
    <div class="rank-section">
      <div class="chart-header">
        <span class="chart-title">群活跃排行 TOP 10</span>
      </div>
      <el-table :data="rankData" stripe style="font-size: 14px">
        <el-table-column type="index" label="排名" width="70" align="center">
          <template #default="{ $index }">
            <span v-if="$index < 3" class="rank-badge gold">{{ $index + 1 }}</span>
            <span v-else class="rank-badge">{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="groupName" label="群名称" min-width="160">
          <template #default="{ row }">
            <span style="font-size: 14px; color: #1F2937">{{ row.groupName }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="memberCount" label="成员数" width="100" align="center">
          <template #default="{ row }">
            <span style="font-size: 14px; font-weight: 600; color: #4C6EF5">{{ row.memberCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="msgCount" label="消息数" width="100" align="center">
          <template #default="{ row }">
            <span style="font-size: 14px; font-weight: 600; color: #7C3AED">{{ row.msgCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="活跃度" width="200">
          <template #default="{ row }">
            <div class="progress-wrapper">
              <el-progress
                :percentage="row.activeness"
                :stroke-width="12"
                :color="row.activeness >= 80 ? '#10B981' : row.activeness >= 60 ? '#F59E0B' : '#EF4444'"
                :text-inside="true"
                style="flex: 1"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="owner" label="群主" width="100">
          <template #default="{ row }">
            <span style="font-size: 14px; color: #6B7280">{{ row.owner }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import TrendLineChart from './TrendLineChart.vue'
import { getWecomCustomerGroupStats, getGroupStatsTrend, getGroupStatsRank } from '@/api/wecomGroup'

const props = defineProps<{
  configId?: number
  isDemoMode: boolean
}>()

const dateRange = ref('7d')
const customStart = ref<Date | null>(null)
const customEnd = ref<Date | null>(null)
const chartType = ref('member')

const stats = reactive({
  totalGroups: 0,
  totalMembers: 0,
  joinCount: 0,
  leaveCount: 0,
  netGrowth: 0,
  activePercent: 0,
  msgCount: 0,
  spamBlocked: 0
})

const trendChartData = ref<Array<{ date: string; value: number }>>([])
const rankData = ref<any[]>([])

const getDateParams = () => {
  const params: any = { configId: props.configId, dateRange: dateRange.value }
  if (dateRange.value === 'custom' && customStart.value && customEnd.value) {
    params.startDate = customStart.value.toISOString().split('T')[0]
    params.endDate = customEnd.value.toISOString().split('T')[0]
  }
  return params
}

const refreshStats = async () => {
  try {
    const params = getDateParams()
    const res: any = await getWecomCustomerGroupStats(params.configId)
    if (res) {
      Object.assign(stats, {
        totalGroups: res.totalGroups || 0,
        totalMembers: res.totalMembers || 0,
        joinCount: res.joinCount || 0,
        leaveCount: res.leaveCount || 0,
        netGrowth: res.netGrowth || (res.joinCount || 0) - (res.leaveCount || 0),
        activePercent: res.activePercent || (res.activeGroups && res.totalGroups ? Math.round(res.activeGroups / res.totalGroups * 100) : 0),
        msgCount: res.msgCount || 0,
        spamBlocked: res.spamBlocked || 0
      })
    }
  } catch { /* keep current */ }
  refreshTrend()
  refreshRank()
}

const refreshTrend = async () => {
  try {
    const params = getDateParams()
    params.type = chartType.value
    const res: any = await getGroupStatsTrend(params)
    trendChartData.value = Array.isArray(res) ? res : (res?.data || [])
  } catch {
    // Fallback: generate empty placeholder
    trendChartData.value = []
  }
}

const refreshRank = async () => {
  try {
    const params = getDateParams()
    const res: any = await getGroupStatsRank(params)
    rankData.value = Array.isArray(res) ? res : (res?.data || [])
  } catch {
    rankData.value = []
  }
}

onMounted(() => { refreshStats() })
</script>

<style scoped>
.tab-actions { display: flex; gap: 8px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }

/* 统计卡片网格 - 重构 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.stats-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border: 1px solid #EBEEF5;
  border-radius: 14px;
  padding: 20px 24px;
  transition: all 0.3s;
}
.stats-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.08); }
.stats-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.stats-card.blue .stats-card-icon { background: #EEF2FF; }
.stats-card.indigo .stats-card-icon { background: #E8EAF6; }
.stats-card.green .stats-card-icon { background: #ECFDF5; }
.stats-card.red .stats-card-icon { background: #FEF2F2; }
.stats-card.amber .stats-card-icon { background: #FFFBEB; }
.stats-card.purple .stats-card-icon { background: #F5F3FF; }
.stats-card.orange .stats-card-icon { background: #FFF7ED; }
.stats-card-body { flex: 1; }
.stats-card-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  color: #1F2937;
}
.stats-card.blue .stats-card-value { color: #4C6EF5; }
.stats-card.indigo .stats-card-value { color: #5C6BC0; }
.stats-card.green .stats-card-value { color: #10B981; }
.stats-card.red .stats-card-value { color: #EF4444; }
.stats-card.amber .stats-card-value { color: #F59E0B; }
.stats-card.purple .stats-card-value { color: #7C3AED; }
.stats-card.orange .stats-card-value { color: #F97316; }
.stats-card-label {
  font-size: 13px;
  color: #9CA3AF;
  margin-top: 4px;
}

/* 图表区域 */
.chart-section, .rank-section {
  background: #fff;
  border: 1px solid #EBEEF5;
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 20px;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
}

/* 排名徽章 */
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  background: #F3F4F6;
  color: #6B7280;
}
.rank-badge.gold {
  background: linear-gradient(135deg, #F59E0B, #FBBF24);
  color: #fff;
}

/* 进度条 */
.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
