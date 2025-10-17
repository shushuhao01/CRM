<template>
  <div class="call-dashboard">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><DataAnalysis /></el-icon>
          通话数据汇总
        </h1>
        <p class="page-description">查看通话统计、呼出时长、拨打个数等详细数据分析</p>
      </div>
      
      <!-- 时间筛选 -->
      <div class="date-filter">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="handleDateChange"
        />
        <el-button @click="exportData" :loading="exportLoading">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <div class="metrics-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon total-calls">
                <el-icon><Phone /></el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ statistics?.totalCalls || 0 }}</div>
                <div class="metric-label">总通话数</div>
                <div class="metric-trend">
                  <span class="trend-text">较昨日 +12%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon total-duration">
                <el-icon><Timer /></el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ formatDuration(statistics?.totalDuration || 0) }}</div>
                <div class="metric-label">总通话时长</div>
                <div class="metric-trend">
                  <span class="trend-text">较昨日 +8%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon avg-duration">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ formatDuration(statistics?.averageDuration || 0) }}</div>
                <div class="metric-label">平均通话时长</div>
                <div class="metric-trend">
                  <span class="trend-text">较昨日 -2%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-icon connection-rate">
                <el-icon><SuccessFilled /></el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ (statistics?.connectionRate || 0).toFixed(1) }}%</div>
                <div class="metric-label">接通率</div>
                <div class="metric-trend">
                  <span class="trend-text">较昨日 +5%</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <!-- 通话趋势图 -->
        <el-col :span="16">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>通话趋势分析</span>
                <el-radio-group v-model="trendType" size="small">
                  <el-radio-button label="calls">通话数</el-radio-button>
                  <el-radio-button label="duration">时长</el-radio-button>
                  <el-radio-button label="rate">接通率</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div ref="trendChartRef" style="height: 300px;"></div>
          </el-card>
        </el-col>
        
        <!-- 通话状态分布 -->
        <el-col :span="8">
          <el-card>
            <template #header>
              <span>通话状态分布</span>
            </template>
            <div ref="statusChartRef" style="height: 300px;"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 人员统计表格 -->
    <div class="staff-statistics">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>人员通话统计</span>
            <el-input
              v-model="searchKeyword"
              placeholder="搜索人员姓名"
              style="width: 200px;"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </template>
        
        <el-table :data="filteredUserStats" style="width: 100%">
          <el-table-column prop="userName" label="姓名" width="120" />
          <el-table-column prop="department" label="部门" width="120" />
          <el-table-column prop="calls" label="通话数" width="100" sortable />
          <el-table-column prop="duration" label="通话时长" width="120" sortable>
            <template #default="{ row }">
              {{ formatDuration(row.duration) }}
            </template>
          </el-table-column>
          <el-table-column prop="connectionRate" label="接通率" width="100" sortable>
            <template #default="{ row }">
              {{ row.connectionRate.toFixed(1) }}%
            </template>
          </el-table-column>
          <el-table-column prop="avgDuration" label="平均时长" width="120" sortable>
            <template #default="{ row }">
              {{ formatDuration(row.avgDuration || 0) }}
            </template>
          </el-table-column>
          <el-table-column label="效率评级" width="120">
            <template #default="{ row }">
              <el-tag :type="getEfficiencyType(row.connectionRate, row.calls)">
                {{ getEfficiencyText(row.connectionRate, row.calls) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button text size="small" @click="viewUserDetail(row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 时段分析 -->
    <div class="time-analysis">
      <el-card>
        <template #header>
          <span>时段通话分析</span>
        </template>
        <div ref="timeAnalysisChartRef" style="height: 250px;"></div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useCallStore } from '@/stores/call'
import type { CallStatistics } from '@/api/call'
import * as echarts from 'echarts'
import {
  DataAnalysis,
  Download,
  Phone,
  Timer,
  Clock,
  SuccessFilled,
  Search
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as callApi from '@/api/call'

const callStore = useCallStore()

// 响应式数据
const dateRange = ref<[string, string]>([
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  new Date().toISOString().split('T')[0]
])
const statistics = ref<CallStatistics | null>(null)
const trendType = ref('calls')
const searchKeyword = ref('')
const exportLoading = ref(false)

// 图表引用
const trendChartRef = ref<HTMLElement>()
const statusChartRef = ref<HTMLElement>()
const timeAnalysisChartRef = ref<HTMLElement>()

// 计算属性
const filteredUserStats = computed(() => {
  if (!statistics.value?.userStats) return []
  
  return statistics.value.userStats
    .filter(user => 
      user.userName.toLowerCase().includes(searchKeyword.value.toLowerCase())
    )
    .map(user => ({
      ...user,
      avgDuration: user.calls > 0 ? user.duration / user.calls : 0,
      department: '销售部' // 这里应该从用户信息获取
    }))
})

// 方法
const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${remainingSeconds}秒`
  }
  return `${minutes}分${remainingSeconds}秒`
}

const getEfficiencyType = (connectionRate: number, calls: number) => {
  if (connectionRate >= 80 && calls >= 50) return 'success'
  if (connectionRate >= 60 && calls >= 30) return 'warning'
  return 'danger'
}

const getEfficiencyText = (connectionRate: number, calls: number) => {
  if (connectionRate >= 80 && calls >= 50) return '优秀'
  if (connectionRate >= 60 && calls >= 30) return '良好'
  return '待提升'
}

const handleDateChange = () => {
  loadStatistics()
}

const loadStatistics = async () => {
  try {
    const [startDate, endDate] = dateRange.value
    const data = await callStore.fetchCallStatistics({
      startDate,
      endDate,
      groupBy: 'day'
    })
    statistics.value = data
    
    // 更新图表
    await nextTick()
    initCharts()
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const exportData = async () => {
  try {
    exportLoading.value = true
    const [startDate, endDate] = dateRange.value
    
    const response = await callApi.exportCallRecords({
      startDate,
      endDate,
      format: 'excel'
    })
    
    // 创建下载链接
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `通话数据_${startDate}_${endDate}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('数据导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('数据导出失败')
  } finally {
    exportLoading.value = false
  }
}

const viewUserDetail = (user: any) => {
  // 跳转到用户详细统计页面
  console.log('查看用户详情:', user)
}

const initCharts = () => {
  initTrendChart()
  initStatusChart()
  initTimeAnalysisChart()
}

const initTrendChart = () => {
  if (!trendChartRef.value || !statistics.value?.dailyStats) return
  
  const chart = echarts.init(trendChartRef.value)
  const dailyStats = statistics.value.dailyStats
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['通话数', '通话时长(分钟)', '接通率(%)']
    },
    xAxis: {
      type: 'category',
      data: dailyStats.map(item => item.date)
    },
    yAxis: [
      {
        type: 'value',
        name: '通话数/时长',
        position: 'left'
      },
      {
        type: 'value',
        name: '接通率(%)',
        position: 'right',
        max: 100
      }
    ],
    series: [
      {
        name: '通话数',
        type: 'line',
        data: dailyStats.map(item => item.calls),
        smooth: true,
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '通话时长(分钟)',
        type: 'line',
        data: dailyStats.map(item => Math.round(item.duration / 60)),
        smooth: true,
        itemStyle: { color: '#67C23A' }
      },
      {
        name: '接通率(%)',
        type: 'line',
        yAxisIndex: 1,
        data: dailyStats.map(item => item.connectionRate),
        smooth: true,
        itemStyle: { color: '#E6A23C' }
      }
    ]
  }
  
  chart.setOption(option)
}

const initStatusChart = () => {
  if (!statusChartRef.value || !statistics.value) return
  
  const chart = echarts.init(statusChartRef.value)
  const { totalCalls, connectedCalls, missedCalls } = statistics.value
  const failedCalls = totalCalls - connectedCalls - missedCalls
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '通话状态',
        type: 'pie',
        radius: '50%',
        data: [
          { value: connectedCalls, name: '已接通', itemStyle: { color: '#67C23A' } },
          { value: missedCalls, name: '未接听', itemStyle: { color: '#E6A23C' } },
          { value: failedCalls, name: '失败/拒接', itemStyle: { color: '#F56C6C' } }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  chart.setOption(option)
}

const initTimeAnalysisChart = () => {
  if (!timeAnalysisChartRef.value) return
  
  const chart = echarts.init(timeAnalysisChartRef.value)
  
  // 模拟时段数据
  const timeData = [
    { time: '09:00', calls: 15 },
    { time: '10:00', calls: 25 },
    { time: '11:00', calls: 30 },
    { time: '14:00', calls: 35 },
    { time: '15:00', calls: 40 },
    { time: '16:00', calls: 32 },
    { time: '17:00', calls: 28 }
  ]
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: timeData.map(item => item.time)
    },
    yAxis: {
      type: 'value',
      name: '通话数'
    },
    series: [
      {
        name: '通话数',
        type: 'bar',
        data: timeData.map(item => item.calls),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ])
        }
      }
    ]
  }
  
  chart.setOption(option)
}

// 生命周期
onMounted(async () => {
  await loadStatistics()
})
</script>

<style scoped>
.call-dashboard {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-description {
  color: #606266;
  margin: 0;
  font-size: 14px;
}

.date-filter {
  display: flex;
  gap: 12px;
  align-items: center;
}

.metrics-cards {
  margin-bottom: 24px;
}

.metric-card {
  height: 120px;
}

.metric-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.metric-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 28px;
  color: white;
}

.metric-icon.total-calls {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.metric-icon.total-duration {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.metric-icon.avg-duration {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.metric-icon.connection-rate {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.metric-trend {
  font-size: 12px;
}

.trend-text {
  color: #67C23A;
}

.charts-section {
  margin-bottom: 24px;
}

.staff-statistics {
  margin-bottom: 24px;
}

.time-analysis {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-table) {
  border: none;
}

:deep(.el-table th) {
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-table td) {
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-table tr:hover > td) {
  background-color: #f5f7fa;
}
</style>