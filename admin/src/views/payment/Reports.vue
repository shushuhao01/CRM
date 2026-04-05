<template>
  <div class="page-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2>支付报表</h2>
        <p class="header-desc">查看支付数据统计和趋势分析</p>
      </div>
      <el-button type="primary" @click="handleExport" :loading="exporting">
        <el-icon><Download /></el-icon>导出报表
      </el-button>
    </div>

    <!-- 筛选器 -->
    <el-card shadow="never" class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item label="支付方式">
          <el-select v-model="filters.payType" placeholder="全部" clearable style="width: 120px">
            <el-option label="微信支付" value="wechat" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="对公转账" value="bank" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户类型">
          <el-select v-model="filters.customerType" placeholder="全部" clearable style="width: 120px">
            <el-option label="私有客户" value="private" />
            <el-option label="租户客户" value="tenant" />
          </el-select>
        </el-form-item>
        <el-form-item label="计费类型">
          <el-select v-model="filters.billingType" placeholder="全部" clearable style="width: 140px">
            <el-option label="订阅(月/年付)" value="subscription" />
            <el-option label="一次性买断" value="once" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>查询
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 快捷日期按钮 -->
      <div class="quick-dates">
        <el-button size="small" @click="setQuickDate('today')">今日</el-button>
        <el-button size="small" @click="setQuickDate('week')">本周</el-button>
        <el-button size="small" @click="setQuickDate('month')">本月</el-button>
        <el-button size="small" @click="setQuickDate('quarter')">本季度</el-button>
        <el-button size="small" @click="setQuickDate('year')">本年</el-button>
      </div>
    </el-card>

    <!-- 汇总卡片 -->
    <el-row :gutter="16" class="summary-row">
      <el-col :span="6">
        <div class="summary-card">
          <div class="card-icon blue">
            <el-icon :size="32"><Money /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-label">总收入</div>
            <div class="card-value">¥{{ formatMoney(summary.totalAmount) }}</div>
            <div class="card-trend" :class="summary.amountTrend >= 0 ? 'up' : 'down'" v-if="summary.amountTrend !== null">
              <el-icon><component :is="summary.amountTrend >= 0 ? 'Top' : 'Bottom'" /></el-icon>
              {{ formatTrend(summary.amountTrend) }}%
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="summary-card">
          <div class="card-icon green">
            <el-icon :size="32"><Tickets /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-label">成功订单</div>
            <div class="card-value">{{ summary.successCount }}</div>
            <div class="card-trend" :class="summary.countTrend >= 0 ? 'up' : 'down'" v-if="summary.countTrend !== null">
              <el-icon><component :is="summary.countTrend >= 0 ? 'Top' : 'Bottom'" /></el-icon>
              {{ formatTrend(summary.countTrend) }}%
            </div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="summary-card">
          <div class="card-icon orange">
            <el-icon :size="32"><RefreshRight /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-label">退款金额</div>
            <div class="card-value">¥{{ formatMoney(summary.refundAmount) }}</div>
            <div class="card-sub">退款率 {{ formatTrend(summary.refundRate) }}%</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="summary-card">
          <div class="card-icon purple">
            <el-icon :size="32"><TrendCharts /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-label">平均客单价</div>
            <div class="card-value">¥{{ formatMoney(summary.avgAmount) }}</div>
            <div class="card-sub">最高 ¥{{ formatMoney(summary.maxAmount) }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="16" class="charts-row">
      <el-col :span="16">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>收入趋势</span>
              <el-radio-group v-model="trendGroupBy" size="small" @change="fetchReports">
                <el-radio-button label="day">按日</el-radio-button>
                <el-radio-button label="month">按月</el-radio-button>
                <el-radio-button label="year">按年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="chart-card">
          <template #header>支付方式分布</template>
          <div ref="payTypeChartRef" class="chart" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="charts-row">
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header>套餐销售排行</template>
          <div ref="packageChartRef" class="chart" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <template #header>客户类型分布</template>
          <div ref="customerTypeChartRef" class="chart" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据列表 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="table-header">
          <span>详细数据</span>
          <span class="total-text">共 {{ tableData.length }} 条记录</span>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="date" label="日期" min-width="120" fixed="left" />
        <el-table-column prop="amount" label="收入金额" min-width="140" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="订单数" min-width="100" align="center" />
        <el-table-column prop="avgAmount" label="平均客单价" min-width="140" align="right">
          <template #default="{ row }">
            ¥{{ formatMoney(row.count > 0 ? row.amount / row.count : 0) }}
          </template>
        </el-table-column>
        <el-table-column prop="wechatAmount" label="微信支付" min-width="140" align="right">
          <template #default="{ row }">
            ¥{{ formatMoney(row.wechatAmount || 0) }}
          </template>
        </el-table-column>
        <el-table-column prop="alipayAmount" label="支付宝" min-width="140" align="right">
          <template #default="{ row }">
            ¥{{ formatMoney(row.alipayAmount || 0) }}
          </template>
        </el-table-column>
        <el-table-column prop="bankAmount" label="对公转账" min-width="140" align="right">
          <template #default="{ row }">
            ¥{{ formatMoney(row.bankAmount || 0) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Search, Money, Tickets, RefreshRight, TrendCharts, Top, Bottom } from '@element-plus/icons-vue'
import request from '@/api/request'
import * as echarts from 'echarts'

const loading = ref(false)
const exporting = ref(false)
const trendGroupBy = ref('day')

const filters = reactive({
  dateRange: null as string[] | null,
  payType: '',
  customerType: '',
  billingType: ''
})

const summary = reactive({
  totalAmount: 0,
  successCount: 0,
  refundAmount: 0,
  refundRate: 0,
  avgAmount: 0,
  maxAmount: 0,
  amountTrend: null as number | null,
  countTrend: null as number | null
})

const tableData = ref<any[]>([])
const trendChartRef = ref<HTMLElement>()
const payTypeChartRef = ref<HTMLElement>()
const packageChartRef = ref<HTMLElement>()
const customerTypeChartRef = ref<HTMLElement>()

let trendChart: echarts.ECharts | null = null
let payTypeChart: echarts.ECharts | null = null
let packageChart: echarts.ECharts | null = null
let customerTypeChart: echarts.ECharts | null = null

const formatMoney = (val: number) => {
  if (val === null || val === undefined || isNaN(val)) return '0.00'
  return val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatTrend = (val: number) => {
  if (val === null || val === undefined) return '0.0'
  return Math.abs(val).toFixed(1)
}

const setQuickDate = (type: string) => {
  const today = new Date()
  const start = new Date()

  switch (type) {
    case 'today':
      break
    case 'week':
      start.setDate(today.getDate() - today.getDay())
      break
    case 'month':
      start.setDate(1)
      break
    case 'quarter':
      const quarter = Math.floor(today.getMonth() / 3)
      start.setMonth(quarter * 3, 1)
      break
    case 'year':
      start.setMonth(0, 1)
      break
  }

  filters.dateRange = [
    start.toISOString().slice(0, 10),
    today.toISOString().slice(0, 10)
  ]
  handleSearch()
}

const fetchReports = async () => {
  loading.value = true
  try {
    const params: any = {
      groupBy: trendGroupBy.value
    }
    if (filters.dateRange) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    if (filters.payType) params.payType = filters.payType
    if (filters.customerType) params.customerType = filters.customerType
    if (filters.billingType) params.billingType = filters.billingType

    const res = await request.get('/payment/reports', { params })
    if (res.success) {
      const { timeSeriesData, byPayType, byPackage, byCustomerType } = res.data

      // 更新表格数据（映射后端返回的按支付方式拆分金额）
      tableData.value = timeSeriesData.map((item: any) => ({
        date: item.date,
        amount: parseFloat(item.amount) || 0,
        count: parseInt(item.count) || 0,
        wechatAmount: parseFloat(item.wechatAmount) || 0,
        alipayAmount: parseFloat(item.alipayAmount) || 0,
        bankAmount: parseFloat(item.bankAmount) || 0
      }))

      // 更新图表
      updateTrendChart(timeSeriesData)
      updatePayTypeChart(byPayType)
      updatePackageChart(byPackage)
      updateCustomerTypeChart(byCustomerType)
    }
  } catch (error) {
    console.error('获取报表失败:', error)
    tableData.value = []
    // 仅在非拦截器处理的错误时提示（如404）
    if ((error as any)?.response?.status === 404) {
      ElMessage.error('支付报表接口不可用，请检查后端服务')
    }
  } finally {
    loading.value = false
  }
}

const fetchSummary = async () => {
  try {
    const params: any = {}
    if (filters.dateRange) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    if (filters.payType) params.payType = filters.payType
    if (filters.customerType) params.customerType = filters.customerType
    if (filters.billingType) params.billingType = filters.billingType

    const res = await request.get('/payment/stats', { params })
    if (res.success && res.data) {
      const data = res.data
      const totalAmount = Number(data.totalAmount) || 0
      const totalCount = Number(data.totalCount) || 0
      const refundAmount = Number(data.refundAmount) || 0

      // 计算退款率（安全除法）
      const refundRate = totalAmount > 0
        ? (refundAmount / totalAmount) * 100
        : 0

      // 计算平均客单价（安全除法）
      const avgAmount = totalCount > 0
        ? totalAmount / totalCount
        : 0

      Object.assign(summary, {
        totalAmount,
        successCount: totalCount,
        refundAmount,
        refundRate,
        avgAmount,
        maxAmount: Number(data.maxAmount) || 0,
        amountTrend: data.amountTrend ?? null,
        countTrend: data.countTrend ?? null
      })
    }
  } catch (error) {
    console.error('获取统计失败:', error)
    // 统计失败重置为默认值
    Object.assign(summary, {
      totalAmount: 0, successCount: 0, refundAmount: 0, refundRate: 0,
      avgAmount: 0, maxAmount: 0, amountTrend: null, countTrend: null
    })
  }
}

const updateTrendChart = (data: any[]) => {
  if (!trendChart) return

  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const item = params[0]
        return `${item.name}<br/>收入: ¥${formatMoney(item.value)}<br/>订单: ${item.data.count}笔`
      }
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.date),
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (val: number) => '¥' + (val / 1000).toFixed(0) + 'k'
      }
    },
    series: [{
      name: '收入',
      type: 'line',
      data: data.map(item => ({
        value: parseFloat(item.amount),
        count: parseInt(item.count)
      })),
      smooth: true,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
          { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
        ])
      },
      lineStyle: { color: '#409eff', width: 2 },
      itemStyle: { color: '#409eff' }
    }]
  })
}

const updatePayTypeChart = (data: any[]) => {
  if (!payTypeChart) return

  const payTypeMap: Record<string, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
    bank: '对公转账'
  }

  payTypeChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold'
        }
      },
      data: data.map(item => ({
        name: payTypeMap[item.payType] || item.payType,
        value: parseFloat(item.amount)
      }))
    }]
  })
}

const updatePackageChart = (data: any[]) => {
  if (!packageChart) return

  packageChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.packageName)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (val: number) => '¥' + (val / 1000).toFixed(0) + 'k'
      }
    },
    series: [{
      type: 'bar',
      data: data.map(item => parseFloat(item.amount)),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#67c23a' },
          { offset: 1, color: '#95d475' }
        ])
      },
      barWidth: '60%'
    }]
  })
}

const updateCustomerTypeChart = (data: any[]) => {
  if (!customerTypeChart) return

  const typeMap: Record<string, string> = {
    private: '私有客户',
    tenant: '租户客户'
  }

  customerTypeChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center'
    },
    series: [{
      type: 'pie',
      radius: '70%',
      data: data.map(item => ({
        name: typeMap[item.customerType] || item.customerType,
        value: parseFloat(item.amount)
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  })
}

const handleSearch = () => {
  fetchReports()
  fetchSummary()
}

const handleReset = () => {
  Object.assign(filters, {
    dateRange: null,
    payType: '',
    customerType: '',
    billingType: ''
  })
  handleSearch()
}

const handleExport = async () => {
  exporting.value = true
  try {
    const params: any = {}
    if (filters.dateRange) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    if (filters.payType) params.payType = filters.payType
    if (filters.customerType) params.customerType = filters.customerType
    if (filters.billingType) params.billingType = filters.billingType

    const response = await fetch(`/api/v1/admin/payment/export?${new URLSearchParams(params)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      }
    })

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payment_report_${Date.now()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

// 响应式调整处理函数（需要引用以便清理）
const handleResize = () => {
  trendChart?.resize()
  payTypeChart?.resize()
  packageChart?.resize()
  customerTypeChart?.resize()
}

onMounted(async () => {
  await nextTick()

  // 先初始化图表实例（确保 DOM 已就绪）
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
  }
  if (payTypeChartRef.value) {
    payTypeChart = echarts.init(payTypeChartRef.value)
  }
  if (packageChartRef.value) {
    packageChart = echarts.init(packageChartRef.value)
  }
  if (customerTypeChartRef.value) {
    customerTypeChart = echarts.init(customerTypeChartRef.value)
  }

  // 响应式调整
  window.addEventListener('resize', handleResize)

  // 图表初始化完成后再请求数据（避免竞态条件：数据先于图表到达导致图表不渲染）
  setQuickDate('month')
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  payTypeChart?.dispose()
  packageChart?.dispose()
  customerTypeChart?.dispose()
  trendChart = null
  payTypeChart = null
  packageChart = null
  customerTypeChart = null
})
</script>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  h2 { font-size: 20px; font-weight: 600; margin: 0 0 4px 0; }
  .header-desc { font-size: 14px; color: #909399; margin: 0; }
}

.filter-card {
  border-radius: 12px;
  border: none;

  :deep(.el-card__body) {
    padding: 16px 20px;
  }

  :deep(.el-form-item) {
    margin-bottom: 0;
    margin-right: 16px;
  }
}

.quick-dates {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 8px;
}

.summary-row {
  margin: 0 !important;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  gap: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  &.blue { background: linear-gradient(135deg, #409eff 0%, #79bbff 100%); color: white; }
  &.green { background: linear-gradient(135deg, #67c23a 0%, #95d475 100%); color: white; }
  &.orange { background: linear-gradient(135deg, #e6a23c 0%, #f3d19e 100%); color: white; }
  &.purple { background: linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%); color: white; }
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
}

.card-trend {
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;

  &.up { color: #67c23a; }
  &.down { color: #f56c6c; }
}

.card-sub {
  font-size: 12px;
  color: #909399;
}

.charts-row {
  margin: 0 !important;
}

.chart-card {
  border-radius: 12px;
  border: none;
  margin-bottom: 16px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-card {
  border-radius: 12px;
  border: none;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .total-text {
    font-size: 13px;
    color: #909399;
    font-weight: normal;
  }
}

.amount {
  font-weight: 600;
  color: #303133;
}
</style>
