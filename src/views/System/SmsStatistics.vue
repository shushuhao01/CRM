<template>
  <div class="sms-statistics">
    <div class="page-header">
      <h2>短信统计分析</h2>
      <p>查看短信使用情况和数据分析报告</p>
    </div>

    <!-- 时间筛选 -->
    <div class="filter-section">
      <el-form inline>
        <el-form-item label="统计时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadStatistics">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
          <el-button @click="handleExport">
            <el-icon><Download /></el-icon>
            导出报告
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards" v-loading="loading">
      <div class="stats-card">
        <div class="stats-icon success">
          <el-icon><Message /></el-icon>
        </div>
        <div class="stats-content">
          <div class="stats-number">{{ statistics.totalSent.toLocaleString() }}</div>
          <div class="stats-label">总发送量</div>
        </div>
      </div>
      
      <div class="stats-card">
        <div class="stats-icon warning">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="stats-content">
          <div class="stats-number">{{ statistics.successRate }}%</div>
          <div class="stats-label">成功率</div>
        </div>
      </div>
      
      <div class="stats-card">
        <div class="stats-icon danger">
          <el-icon><Money /></el-icon>
        </div>
        <div class="stats-content">
          <div class="stats-number">¥{{ statistics.totalCost.toLocaleString() }}</div>
          <div class="stats-label">总费用</div>
        </div>
      </div>
      
      <div class="stats-card">
        <div class="stats-icon info">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="stats-content">
          <div class="stats-number">{{ statistics.dailyUsage.toLocaleString() }}</div>
          <div class="stats-label">日均发送</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <!-- 发送趋势图 -->
        <el-col :span="12">
          <div class="chart-card">
            <div class="chart-header">
              <h3>发送趋势</h3>
              <el-radio-group v-model="trendType" @change="loadTrendData">
                <el-radio-button label="daily">按天</el-radio-button>
                <el-radio-button label="weekly">按周</el-radio-button>
                <el-radio-button label="monthly">按月</el-radio-button>
              </el-radio-group>
            </div>
            <div class="chart-content">
              <div ref="trendChartRef" style="width: 100%; height: 300px;"></div>
            </div>
          </div>
        </el-col>
        
        <!-- 模板使用统计 -->
        <el-col :span="12">
          <div class="chart-card">
            <div class="chart-header">
              <h3>模板使用统计</h3>
            </div>
            <div class="chart-content">
              <div ref="templateChartRef" style="width: 100%; height: 300px;"></div>
            </div>
          </div>
        </el-col>
      </el-row>
      
      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 成功率分析 -->
        <el-col :span="12">
          <div class="chart-card">
            <div class="chart-header">
              <h3>成功率分析</h3>
            </div>
            <div class="chart-content">
              <div ref="successChartRef" style="width: 100%; height: 300px;"></div>
            </div>
          </div>
        </el-col>
        
        <!-- 费用分析 -->
        <el-col :span="12">
          <div class="chart-card">
            <div class="chart-header">
              <h3>费用分析</h3>
            </div>
            <div class="chart-content">
              <div ref="costChartRef" style="width: 100%; height: 300px;"></div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 详细数据表格 -->
    <div class="table-section">
      <div class="section-header">
        <h3>模板使用详情</h3>
      </div>
      <el-table :data="statistics.templateUsage" border stripe>
        <el-table-column prop="templateName" label="模板名称" min-width="200" />
        <el-table-column prop="count" label="使用次数" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="primary">{{ row.count.toLocaleString() }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="使用占比" width="120" align="center">
          <template #default="{ row }">
            <span>{{ getUsagePercentage(row.count) }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="费用估算" width="120" align="center">
          <template #default="{ row }">
            <span class="cost-text">¥{{ (row.count * 0.05).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="viewTemplateDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 实时数据 -->
    <div class="realtime-section">
      <div class="section-header">
        <h3>实时数据</h3>
        <el-switch
          v-model="realtimeEnabled"
          active-text="实时更新"
          @change="toggleRealtime"
        />
      </div>
      <div class="realtime-stats">
        <div class="realtime-item">
          <div class="realtime-label">今日发送</div>
          <div class="realtime-value">{{ realtimeData.todaySent }}</div>
        </div>
        <div class="realtime-item">
          <div class="realtime-label">当前在线</div>
          <div class="realtime-value">{{ realtimeData.onlineUsers }}</div>
        </div>
        <div class="realtime-item">
          <div class="realtime-label">队列待发</div>
          <div class="realtime-value">{{ realtimeData.queueCount }}</div>
        </div>
        <div class="realtime-item">
          <div class="realtime-label">系统状态</div>
          <div class="realtime-value">
            <el-tag :type="realtimeData.systemStatus === 'normal' ? 'success' : 'danger'">
              {{ realtimeData.systemStatus === 'normal' ? '正常' : '异常' }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Download, Message, TrendCharts, Money, Calendar } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import * as smsApi from '@/api/sms'
import type { SmsStatistics } from '@/api/sms'

// 响应式数据
const loading = ref(false)
const dateRange = ref<[string, string]>([])
const trendType = ref<'daily' | 'weekly' | 'monthly'>('daily')
const realtimeEnabled = ref(false)
const realtimeTimer = ref<number | null>(null)

// 图表引用
const trendChartRef = ref<HTMLDivElement>()
const templateChartRef = ref<HTMLDivElement>()
const successChartRef = ref<HTMLDivElement>()
const costChartRef = ref<HTMLDivElement>()

// 图表实例
let trendChart: echarts.ECharts | null = null
let templateChart: echarts.ECharts | null = null
let successChart: echarts.ECharts | null = null
let costChart: echarts.ECharts | null = null

// 统计数据
const statistics = reactive<SmsStatistics>({
  totalSent: 0,
  successRate: 0,
  totalCost: 0,
  monthlyUsage: 0,
  dailyUsage: 0,
  templateUsage: [],
  trendData: []
})

// 实时数据
const realtimeData = reactive({
  todaySent: 0,
  onlineUsers: 0,
  queueCount: 0,
  systemStatus: 'normal' as 'normal' | 'error'
})

// 方法
const loadStatistics = async () => {
  loading.value = true
  try {
    const data = await smsApi.getSmsStatistics(dateRange.value)
    Object.assign(statistics, data)
    
    // 更新图表
    await nextTick()
    updateCharts()
  } catch (error) {
    ElMessage.error('加载统计数据失败')
  } finally {
    loading.value = false
  }
}

const loadTrendData = async () => {
  try {
    const data = await smsApi.getSmsTrend(
      dateRange.value.length > 0 ? dateRange.value : ['2024-01-01', '2024-01-31'],
      trendType.value
    )
    statistics.trendData = data
    updateTrendChart()
  } catch (error) {
    ElMessage.error('加载趋势数据失败')
  }
}

const handleDateChange = () => {
  loadStatistics()
}

const handleExport = () => {
  ElMessage.info('导出功能开发中...')
}

const getUsagePercentage = (count: number) => {
  const total = statistics.templateUsage.reduce((sum, item) => sum + item.count, 0)
  return total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
}

const viewTemplateDetail = (template: { templateName: string; count: number }) => {
  ElMessage.info(`查看模板 "${template.templateName}" 的详细信息`)
}

const toggleRealtime = (enabled: boolean) => {
  if (enabled) {
    startRealtimeUpdate()
  } else {
    stopRealtimeUpdate()
  }
}

const startRealtimeUpdate = () => {
  realtimeTimer.value = window.setInterval(() => {
    // 模拟实时数据更新
    realtimeData.todaySent += Math.floor(Math.random() * 5)
    realtimeData.onlineUsers = Math.floor(Math.random() * 50) + 10
    realtimeData.queueCount = Math.floor(Math.random() * 20)
    realtimeData.systemStatus = Math.random() > 0.1 ? 'normal' : 'error'
  }, 3000)
}

const stopRealtimeUpdate = () => {
  if (realtimeTimer.value) {
    clearInterval(realtimeTimer.value)
    realtimeTimer.value = null
  }
}

const initCharts = () => {
  // 初始化发送趋势图
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
  }
  
  // 初始化模板使用统计图
  if (templateChartRef.value) {
    templateChart = echarts.init(templateChartRef.value)
  }
  
  // 初始化成功率分析图
  if (successChartRef.value) {
    successChart = echarts.init(successChartRef.value)
  }
  
  // 初始化费用分析图
  if (costChartRef.value) {
    costChart = echarts.init(costChartRef.value)
  }
}

const updateCharts = () => {
  updateTrendChart()
  updateTemplateChart()
  updateSuccessChart()
  updateCostChart()
}

const updateTrendChart = () => {
  if (!trendChart) return
  
  const option = {
    title: {
      text: '发送量趋势',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: statistics.trendData.map(item => item.date)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '发送量',
        type: 'line',
        data: statistics.trendData.map(item => item.count),
        smooth: true,
        itemStyle: { color: '#409EFF' }
      }
    ]
  }
  
  trendChart.setOption(option)
}

const updateTemplateChart = () => {
  if (!templateChart) return
  
  const option = {
    title: {
      text: '模板使用分布',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    series: [
      {
        name: '使用次数',
        type: 'pie',
        radius: '60%',
        data: statistics.templateUsage.map(item => ({
          name: item.templateName,
          value: item.count
        })),
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
  
  templateChart.setOption(option)
}

const updateSuccessChart = () => {
  if (!successChart) return
  
  const successCount = Math.floor(statistics.totalSent * statistics.successRate / 100)
  const failCount = statistics.totalSent - successCount
  
  const option = {
    title: {
      text: '发送成功率',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        name: '发送结果',
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { name: '成功', value: successCount, itemStyle: { color: '#67C23A' } },
          { name: '失败', value: failCount, itemStyle: { color: '#F56C6C' } }
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
  
  successChart.setOption(option)
}

const updateCostChart = () => {
  if (!costChart) return
  
  const option = {
    title: {
      text: '费用趋势',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>{a}: ¥{c}'
    },
    xAxis: {
      type: 'category',
      data: statistics.trendData.map(item => item.date)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [
      {
        name: '费用',
        type: 'bar',
        data: statistics.trendData.map(item => item.cost),
        itemStyle: { color: '#E6A23C' }
      }
    ]
  }
  
  costChart.setOption(option)
}

const resizeCharts = () => {
  trendChart?.resize()
  templateChart?.resize()
  successChart?.resize()
  costChart?.resize()
}

// 生命周期
onMounted(async () => {
  // 设置默认时间范围（最近7天）
  const today = new Date()
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  dateRange.value = [
    lastWeek.toISOString().split('T')[0],
    today.toISOString().split('T')[0]
  ]
  
  await loadStatistics()
  await nextTick()
  initCharts()
  
  // 监听窗口大小变化
  window.addEventListener('resize', resizeCharts)
  
  // 初始化实时数据
  realtimeData.todaySent = Math.floor(Math.random() * 1000) + 500
  realtimeData.onlineUsers = Math.floor(Math.random() * 50) + 10
  realtimeData.queueCount = Math.floor(Math.random() * 20)
})

onUnmounted(() => {
  stopRealtimeUpdate()
  window.removeEventListener('resize', resizeCharts)
  
  // 销毁图表实例
  trendChart?.dispose()
  templateChart?.dispose()
  successChart?.dispose()
  costChart?.dispose()
})
</script>

<style scoped>
.sms-statistics {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.filter-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stats-card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.stats-icon.success {
  background: linear-gradient(135deg, #67C23A, #85CE61);
}

.stats-icon.warning {
  background: linear-gradient(135deg, #E6A23C, #EEBE77);
}

.stats-icon.danger {
  background: linear-gradient(135deg, #F56C6C, #F78989);
}

.stats-icon.info {
  background: linear-gradient(135deg, #409EFF, #66B1FF);
}

.stats-content {
  flex: 1;
}

.stats-number {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.charts-section {
  margin-bottom: 30px;
}

.chart-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
}

.table-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
}

.cost-text {
  font-weight: 500;
  color: #e6a23c;
}

.realtime-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.realtime-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.realtime-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.realtime-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.realtime-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
</style>