<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card" style="--accent: #409eff">
          <div class="stat-icon">
            <el-icon :size="28"><Key /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.licenses?.total || 0 }}</div>
            <div class="stat-label">总授权数</div>
          </div>
          <div class="stat-trend up">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ growthData.licenses >= 0 ? '+' : '' }}{{ growthData.licenses }}%</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card" style="--accent: #67c23a">
          <div class="stat-icon">
            <el-icon :size="28"><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.licenses?.active || 0 }}</div>
            <div class="stat-label">有效授权</div>
          </div>
          <div class="stat-trend up">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ growthData.tenants >= 0 ? '+' : '' }}{{ growthData.tenants }}%</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card" style="--accent: #e6a23c">
          <div class="stat-icon">
            <el-icon :size="28"><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.licenses?.pending || 0 }}</div>
            <div class="stat-label">待激活</div>
          </div>
          <div class="stat-trend">
            <span>待处理</span>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card" style="--accent: #909399">
          <div class="stat-icon">
            <el-icon :size="28"><Box /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.versions?.published || 0 }}</div>
            <div class="stat-label">发布版本</div>
          </div>
          <div class="stat-trend">
            <span>v{{ stats.versions?.latest || '1.0.0' }}</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-section">
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="title">授权类型分布</span>
              <el-radio-group v-model="chartPeriod" size="small">
                <el-radio-button value="week">本周</el-radio-button>
                <el-radio-button value="month">本月</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-content">
            <div class="pie-chart">
              <div
                v-for="(item, index) in licenseTypes"
                :key="item.type"
                class="pie-item"
              >
                <div class="pie-bar" :style="{ '--color': pieColors[index], '--percent': getPercent(item.count) + '%' }">
                  <div class="bar-fill"></div>
                </div>
                <div class="pie-info">
                  <span class="pie-label">{{ item.label }}</span>
                  <span class="pie-value">{{ item.count }}</span>
                  <span class="pie-percent">{{ getPercent(item.count) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="title">近30天趋势</span>
              <el-radio-group v-model="trendMetric" size="small">
                <el-radio-button value="licenses">授权</el-radio-button>
                <el-radio-button value="tenants">租户</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="trend-chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作 + 最近活动 -->
    <el-row :gutter="20" class="bottom-section">
      <el-col :xs="24" :lg="8">
        <el-card class="quick-card" shadow="never">
          <template #header>
            <span class="title">快捷操作</span>
          </template>
          <div class="quick-actions">
            <div class="quick-item" @click="router.push('/private-customers/list')">
              <div class="quick-icon" style="background: #409eff"><el-icon :size="20"><Key /></el-icon></div>
              <span>新建授权</span>
            </div>
            <div class="quick-item" @click="router.push('/tenant-customers/list')">
              <div class="quick-icon" style="background: #67c23a"><el-icon :size="20"><CircleCheck /></el-icon></div>
              <span>新建租户</span>
            </div>
            <div class="quick-item" @click="router.push('/versions/upload')">
              <div class="quick-icon" style="background: #9c27b0"><el-icon :size="20"><Upload /></el-icon></div>
              <span>发布版本</span>
            </div>
            <div class="quick-item" @click="router.push('/payment/reports')">
              <div class="quick-icon" style="background: #e6a23c"><el-icon :size="20"><Document /></el-icon></div>
              <span>支付报表</span>
            </div>
            <div class="quick-item" @click="router.push('/modules/list')">
              <div class="quick-icon" style="background: #00bcd4"><el-icon :size="20"><Box /></el-icon></div>
              <span>模块管理</span>
            </div>
            <div class="quick-item" @click="router.push('/settings/admins')">
              <div class="quick-icon" style="background: #607d8b"><el-icon :size="20"><Warning /></el-icon></div>
              <span>管理员</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="16">
        <el-card class="activity-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="title">最近动态</span>
              <el-button type="primary" link size="small" @click="fetchActivities">刷新</el-button>
            </div>
          </template>
          <div v-if="activities.length > 0" class="activity-timeline">
            <div v-for="item in activities" :key="item.id" class="activity-item">
              <div class="activity-dot" :style="{ background: item.color || '#409eff' }"></div>
              <div class="activity-content">
                <span class="activity-title">{{ item.title }}</span>
                <span class="activity-time">{{ formatDate(item.time) }}</span>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无动态" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近日志 -->
    <el-card class="log-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">最近验证日志</span>
          <el-button type="primary" link>
            查看全部 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </template>
      <el-table :data="recentLogs" stripe style="width: 100%">
        <el-table-column prop="licenseKey" label="授权码" width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.licenseKey" placement="top">
              <span class="license-key">{{ row.licenseKey ? row.licenseKey.slice(0, 16) + '...' : '-' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="100">
          <template #default="{ row }">
            <el-tag :type="getActionType(row.action)" size="small">
              {{ getActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="result" label="结果" width="80">
          <template #default="{ row }">
            <el-tag :type="row.result === 'success' ? 'success' : 'danger'" size="small">
              {{ row.result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ipAddress" label="IP地址" width="140" />
        <el-table-column prop="message" label="消息" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
      <div v-if="recentLogs.length === 0" class="empty-state">
        <el-empty description="暂无验证日志" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '@/api/admin'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  Key, CircleCheck, Clock, Box, TrendCharts, ArrowRight,
  Document, Checked, Warning, Upload
} from '@element-plus/icons-vue'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const router = useRouter()

interface DashboardStats {
  licenses?: {
    total: number
    active: number
    expired: number
    pending: number
    byType?: { trial: number; perpetual: number; annual: number }
  }
  versions?: { total: number; published: number; latest: string | null }
  activity?: { recentVerifications: number }
}

const stats = ref<DashboardStats>({})
const recentLogs = ref<any[]>([])
const chartPeriod = ref('week')
const trendMetric = ref('licenses')
const pieColors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c']
const growthData = ref({ licenses: 0, tenants: 0 })
const trendChartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null
const trendRawData = ref<any[]>([])
const activities = ref<any[]>([])

const licenseTypes = computed(() => [
  { type: 'trial', label: '试用授权', count: stats.value.licenses?.byType?.trial || 0 },
  { type: 'perpetual', label: '永久授权', count: stats.value.licenses?.byType?.perpetual || 0 },
  { type: 'annual', label: '年度授权', count: stats.value.licenses?.byType?.annual || 0 }
])

const totalLicenses = computed(() => stats.value.licenses?.total || 0)

const getPercent = (count: number) => {
  if (totalLicenses.value === 0) return 0
  return Math.round((count / totalLicenses.value) * 100)
}

const fetchStats = async () => {
  try {
    const res = await adminApi.getDashboardStats()
    stats.value = res.data
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

const fetchTrend = async () => {
  try {
    const res = await adminApi.getDashboardTrend(30)
    if (res.data) {
      trendRawData.value = res.data.trend || []
      growthData.value = res.data.growth || { licenses: 0, tenants: 0 }
      await nextTick()
      renderChart()
    }
  } catch (error) {
    console.error('获取趋势数据失败', error)
  }
}

const renderChart = () => {
  if (!trendChartRef.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(trendChartRef.value)
  }
  const data = trendRawData.value
  const dates = data.map((d: any) => d.date.slice(5)) // MM-DD
  const field = trendMetric.value
  const values = data.map((d: any) => d[field] || 0)
  const colorMap: Record<string, string> = { licenses: '#409eff', tenants: '#67c23a' }
  const labelMap: Record<string, string> = { licenses: '新增授权', tenants: '新增租户' }

  chartInstance.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}<br/>{a}: {c}' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11, color: '#909399' }, axisLine: { lineStyle: { color: '#e4e7ed' } } },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11, color: '#909399' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [{
      name: labelMap[field] || field,
      type: 'line',
      data: values,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2, color: colorMap[field] || '#409eff' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: (colorMap[field] || '#409eff') + '40' },
        { offset: 1, color: (colorMap[field] || '#409eff') + '05' }
      ]) },
      itemStyle: { color: colorMap[field] || '#409eff' }
    }]
  }, true)
}

watch(trendMetric, () => renderChart())

const fetchRecentLogs = async () => {
  try {
    const res = await adminApi.getRecentLogs()
    recentLogs.value = res.data || []
  } catch (error) {
    console.error('获取日志失败', error)
  }
}

const fetchActivities = async () => {
  try {
    const res = await adminApi.getDashboardActivities(10)
    activities.value = res.data || []
  } catch (error) {
    console.error('获取活动动态失败', error)
  }
}

const handleResize = () => {
  chartInstance?.resize()
}

const getActionLabel = (action: string) => {
  const map: Record<string, string> = {
    verify: '验证', activate: '激活', renew: '续期', revoke: '撤销', expire: '过期'
  }
  return map[action] || action
}

const getActionType = (action: string) => {
  const map: Record<string, string> = {
    verify: '', activate: 'success', renew: 'warning', revoke: 'danger', expire: 'info'
  }
  return map[action] || ''
}

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

onMounted(() => {
  fetchStats()
  fetchTrend()
  fetchRecentLogs()
  fetchActivities()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.dashboard {
  min-height: 100%;
}

.stat-cards {
  margin-bottom: 20px;

  .el-col {
    margin-bottom: 20px;
  }
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, white) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  .stat-content {
    flex: 1;

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #303133;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 14px;
      color: #909399;
      margin-top: 4px;
    }
  }

  .stat-trend {
    font-size: 12px;
    color: #909399;
    display: flex;
    align-items: center;
    gap: 4px;

    &.up {
      color: #67c23a;
    }

    &.down {
      color: #f56c6c;
    }
  }
}

.chart-section {
  margin-bottom: 20px;

  .el-col {
    margin-bottom: 20px;
  }
}

.chart-card {
  border-radius: 12px;
  border: none;

  :deep(.el-card__header) {
    border-bottom: 1px solid #f0f0f0;
    padding: 16px 20px;
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.chart-content {
  min-height: 200px;
}

.pie-chart {
  .pie-item {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .pie-bar {
    flex: 1;
    height: 24px;
    background: #f5f7fa;
    border-radius: 12px;
    overflow: hidden;

    .bar-fill {
      height: 100%;
      width: var(--percent);
      background: linear-gradient(90deg, var(--color) 0%, color-mix(in srgb, var(--color) 70%, white) 100%);
      border-radius: 12px;
      transition: width 0.6s ease;
    }
  }

  .pie-info {
    width: 140px;
    display: flex;
    align-items: center;
    gap: 8px;

    .pie-label {
      flex: 1;
      font-size: 14px;
      color: #606266;
    }

    .pie-value {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    .pie-percent {
      font-size: 12px;
      color: #909399;
      width: 40px;
      text-align: right;
    }
  }
}

.overview-content {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.trend-chart {
  height: 260px;
  width: 100%;
}

.overview-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 12px;
  transition: all 0.3s;

  &:hover {
    background: #f5f7fa;
  }

  .overview-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 20px;
  }

  .overview-info {
    .overview-label {
      font-size: 13px;
      color: #909399;
    }

    .overview-value {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
      margin-top: 4px;
    }
  }
}

.log-card {
  border-radius: 12px;
  border: none;

  :deep(.el-card__header) {
    border-bottom: 1px solid #f0f0f0;
    padding: 16px 20px;
  }

  :deep(.el-card__body) {
    padding: 0;
  }
}

.license-key {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #606266;
}

.empty-state {
  padding: 40px 0;
}

.bottom-section {
  margin-bottom: 20px;

  .el-col {
    margin-bottom: 20px;
  }
}

.quick-card {
  border-radius: 12px;
  border: none;
  height: 100%;

  :deep(.el-card__header) {
    border-bottom: 1px solid #f0f0f0;
    padding: 16px 20px;
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #f5f7fa;
    transform: translateY(-2px);
  }

  .quick-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  span {
    font-size: 13px;
    color: #606266;
  }
}

.activity-card {
  border-radius: 12px;
  border: none;
  height: 100%;

  :deep(.el-card__header) {
    border-bottom: 1px solid #f0f0f0;
    padding: 16px 20px;
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.activity-timeline {
  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f8f8f8;

    &:last-child {
      border-bottom: none;
    }
  }

  .activity-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-top: 5px;
    flex-shrink: 0;
  }

  .activity-content {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-width: 0;
  }

  .activity-title {
    font-size: 13px;
    color: #303133;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .activity-time {
    font-size: 12px;
    color: #c0c4cc;
    margin-left: 12px;
    white-space: nowrap;
  }
}

/* ====== 响应式适配 ====== */
@media screen and (max-width: 768px) {
  .stat-card {
    padding: 16px;

    .stat-icon {
      width: 44px;
      height: 44px;
    }

    .stat-content .stat-value {
      font-size: 22px;
    }
  }

  .overview-content {
    grid-template-columns: 1fr;
  }

  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }

  .pie-chart .pie-info {
    width: 110px;

    .pie-value { font-size: 14px; }
    .pie-percent { width: 32px; }
  }

  .trend-chart {
    height: 200px;
  }
}

@media screen and (max-width: 480px) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .quick-item {
    padding: 12px 4px;

    .quick-icon {
      width: 36px;
      height: 36px;
    }
  }

  .stat-card .stat-trend {
    display: none;
  }
}
</style>
