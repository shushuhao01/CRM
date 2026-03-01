<template>
  <div class="settlement-report-page">
    <div class="page-header">
      <div class="header-left">
        <h2>结算报表</h2>
      </div>
      <div class="header-right">
        <el-date-picker
          v-model="startDate"
          type="date"
          placeholder="开始日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="handleDateChange"
          class="filter-date"
        />
        <span class="date-separator">至</span>
        <el-date-picker
          v-model="endDate"
          type="date"
          placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="handleDateChange"
          class="filter-date"
        />
        <el-select v-model="companyFilter" placeholder="选择公司" clearable @change="handleSearch" class="filter-item">
          <el-option label="全部公司" value="" />
          <el-option v-for="company in companies" :key="company.id" :label="company.companyName" :value="company.id" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
      </div>
    </div>

    <!-- 快捷日期筛选 -->
    <div class="quick-date-filters">
      <el-button
        v-for="filter in quickDateFilters"
        :key="filter.value"
        :type="currentDateFilter === filter.value ? 'primary' : ''"
        round
        size="small"
        @click="handleQuickDateFilter(filter.value)"
      >
        {{ filter.label }}
      </el-button>
    </div>

    <!-- 汇总卡片（第一行：核心指标） -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="card-icon total"><el-icon><Document /></el-icon></div>
        <div class="card-content">
          <div class="card-label">总订单数</div>
          <div class="card-value">{{ summary.total.count }}单</div>
          <div class="card-sub">总金额 ¥{{ formatMoney(summary.total.totalAmount) }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon settled"><el-icon><Select /></el-icon></div>
        <div class="card-content">
          <div class="card-label">已结算</div>
          <div class="card-value">{{ summary.settled.count }}单</div>
          <div class="card-sub">¥{{ formatMoney(summary.settled.amount) }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon unsettled"><el-icon><Clock /></el-icon></div>
        <div class="card-content">
          <div class="card-label">未结算</div>
          <div class="card-value">{{ summary.unsettled.count }}单</div>
          <div class="card-sub">¥{{ formatMoney(summary.unsettled.amount) }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon avg"><el-icon><TrendCharts /></el-icon></div>
        <div class="card-content">
          <div class="card-label">平均单价</div>
          <div class="card-value">¥{{ formatMoney(avgPrice) }}</div>
          <div class="card-sub">结算率 {{ settlementRate }}%</div>
        </div>
      </div>
    </div>

    <!-- 汇总卡片（第二行：状态分布） -->
    <div class="summary-cards secondary">
      <div class="summary-card small">
        <div class="card-icon valid"><el-icon><CircleCheck /></el-icon></div>
        <div class="card-content">
          <div class="card-label">有效资料</div>
          <div class="card-value">{{ summary.valid.count }}单</div>
          <div class="card-sub">{{ validRate }}%</div>
        </div>
      </div>
      <div class="summary-card small">
        <div class="card-icon invalid"><el-icon><CircleClose /></el-icon></div>
        <div class="card-content">
          <div class="card-label">无效资料</div>
          <div class="card-value">{{ summary.invalid.count }}单</div>
          <div class="card-sub">{{ invalidRate }}%</div>
        </div>
      </div>
      <div class="summary-card small">
        <div class="card-icon pending"><el-icon><Warning /></el-icon></div>
        <div class="card-content">
          <div class="card-label">待处理</div>
          <div class="card-value">{{ summary.pending.count }}单</div>
          <div class="card-sub">{{ pendingRate }}%</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <div class="chart-card">
        <div class="chart-header">
          <h3>结算趋势分析</h3>
          <div class="chart-legend">
            <span class="legend-item"><i class="legend-dot settled"></i>结算金额</span>
            <span class="legend-item"><i class="legend-dot count"></i>结算订单数</span>
          </div>
        </div>
        <div ref="trendChartRef" class="chart-container"></div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3>有效率趋势</h3>
        </div>
        <div ref="validRateChartRef" class="chart-container"></div>
      </div>
    </div>

    <div class="charts-section">
      <div class="chart-card">
        <div class="chart-header">
          <h3>状态分布</h3>
        </div>
        <div ref="statusPieChartRef" class="chart-container"></div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3>已结算/未结算对比</h3>
        </div>
        <div ref="settlementPieChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 公司排名 -->
    <div class="ranking-section">
      <div class="section-header">
        <h3>公司结算排名</h3>
        <div class="header-actions">
          <el-button size="small" :icon="Download" @click="exportCompanyData">导出数据</el-button>
        </div>
      </div>
      <el-table :data="companyRanking" stripe border>
        <el-table-column label="排名" width="70" align="center" fixed>
          <template #default="{ $index }">
            <span v-if="$index === 0" class="rank-medal">🥇</span>
            <span v-else-if="$index === 1" class="rank-medal">🥈</span>
            <span v-else-if="$index === 2" class="rank-medal">🥉</span>
            <span v-else>{{ $index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="companyName" label="公司名称" min-width="140" fixed />
        <el-table-column label="总订单" width="90" align="center">
          <template #default="{ row }">{{ row.totalCount }}单</template>
        </el-table-column>
        <el-table-column label="总金额" width="120" align="right">
          <template #default="{ row }">
            <span style="color: #606266; font-weight: 600;">¥{{ formatMoney(row.settledAmount + row.unsettledAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="有效" width="80" align="center">
          <template #default="{ row }">{{ row.validCount }}单</template>
        </el-table-column>
        <el-table-column label="无效" width="80" align="center">
          <template #default="{ row }">{{ row.invalidCount }}单</template>
        </el-table-column>
        <el-table-column label="待处理" width="80" align="center">
          <template #default="{ row }">{{ row.pendingCount }}单</template>
        </el-table-column>
        <el-table-column label="已结算" width="90" align="center">
          <template #default="{ row }">
            <span style="color: #67c23a; font-weight: 600;">{{ row.settledCount }}单</span>
          </template>
        </el-table-column>
        <el-table-column label="未结算" width="90" align="center">
          <template #default="{ row }">
            <span style="color: #e6a23c;">{{ row.unsettledCount }}单</span>
          </template>
        </el-table-column>
        <el-table-column label="已结算金额" width="120" align="right">
          <template #default="{ row }">
            <span style="color: #67c23a; font-weight: 600;">¥{{ formatMoney(row.settledAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="未结算金额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.unsettledAmount) }}</template>
        </el-table-column>
        <el-table-column label="平均单价" width="100" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.avgSettledAmount) }}</template>
        </el-table-column>
        <el-table-column label="结算率" width="90" align="center">
          <template #default="{ row }">
            <el-progress
              :percentage="getCompanySettlementRate(row)"
              :color="getProgressColor(getCompanySettlementRate(row))"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column label="有效率" width="90" align="center">
          <template #default="{ row }">
            <el-progress
              :percentage="getCompanyValidRate(row)"
              :color="getProgressColor(getCompanyValidRate(row))"
              :stroke-width="8"
            />
          </template>
        </el-table-column>
        <el-table-column label="最近结算" width="100" align="center">
          <template #default="{ row }">{{ formatDate(row.lastSettlementDate) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Document, Money, TrendCharts, Select, Clock, CircleCheck, CircleClose, Warning, Download } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import * as XLSX from 'xlsx'
import { getSettlementReport, getOutsourceCompanies, type OutsourceCompany } from '@/api/valueAdded'

defineOptions({ name: 'SettlementReport' })

// 快捷日期筛选选项
const quickDateFilters = [
  { label: '今日', value: 'today' },
  { label: '本月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
  { label: '本季', value: 'thisQuarter' },
  { label: '上季', value: 'lastQuarter' },
  { label: 'Q1', value: 'q1' },
  { label: 'Q2', value: 'q2' },
  { label: 'Q3', value: 'q3' },
  { label: 'Q4', value: 'q4' },
  { label: '今年', value: 'thisYear' },
  { label: '全部', value: 'all' }
]

const currentDateFilter = ref('thisMonth')
const startDate = ref('')
const endDate = ref('')
const companyFilter = ref('')
const companies = ref<OutsourceCompany[]>([])
const dailyData = ref<Array<{ date: string; count: number; amount: number; avgAmount: number }>>([])
const companyData = ref<Array<any>>([])
const trendData = ref<Array<any>>([])
const statusDistribution = ref<Array<any>>([])
const summary = ref({
  total: { count: 0, totalAmount: 0, settledAmount: 0 },
  settled: { count: 0, amount: 0 },
  unsettled: { count: 0, amount: 0 },
  valid: { count: 0, amount: 0 },
  invalid: { count: 0, amount: 0 },
  pending: { count: 0, amount: 0 }
})

const trendChartRef = ref<HTMLElement>()
const validRateChartRef = ref<HTMLElement>()
const statusPieChartRef = ref<HTMLElement>()
const settlementPieChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let validRateChart: echarts.ECharts | null = null
let statusPieChart: echarts.ECharts | null = null
let settlementPieChart: echarts.ECharts | null = null

// 计算属性
const avgPrice = computed(() => {
  return summary.value.settled.count > 0
    ? summary.value.settled.amount / summary.value.settled.count
    : 0
})

const settlementRate = computed(() => {
  return summary.value.total.count > 0
    ? ((summary.value.settled.count / summary.value.total.count) * 100).toFixed(2)
    : '0.00'
})

const validRate = computed(() => {
  return summary.value.total.count > 0
    ? ((summary.value.valid.count / summary.value.total.count) * 100).toFixed(2)
    : '0.00'
})

const invalidRate = computed(() => {
  return summary.value.total.count > 0
    ? ((summary.value.invalid.count / summary.value.total.count) * 100).toFixed(2)
    : '0.00'
})

const pendingRate = computed(() => {
  return summary.value.total.count > 0
    ? ((summary.value.pending.count / summary.value.total.count) * 100).toFixed(2)
    : '0.00'
})

const companyRanking = computed(() => [...companyData.value].sort((a, b) => b.settledAmount - a.settledAmount))

const formatMoney = (val: number) => val.toFixed(2)

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  // 只返回日期部分 YYYY-MM-DD
  const date = dateStr.split('T')[0]
  return date
}

const getCompanySettlementRate = (row: any) => {
  return row.totalCount > 0 ? Math.round((row.settledCount / row.totalCount) * 100) : 0
}

const getCompanyValidRate = (row: any) => {
  return row.totalCount > 0 ? Math.round((row.validCount / row.totalCount) * 100) : 0
}

const getProgressColor = (percentage: number) => {
  if (percentage >= 80) return '#67c23a'
  if (percentage >= 60) return '#409eff'
  if (percentage >= 40) return '#e6a23c'
  return '#f56c6c'
}

// 快捷日期筛选
const handleQuickDateFilter = (value: string) => {
  currentDateFilter.value = value
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  switch (value) {
    case 'today':
      startDate.value = formatDateStr(today)
      endDate.value = formatDateStr(today)
      break
    case 'thisMonth':
      startDate.value = formatDateStr(new Date(year, month, 1))
      endDate.value = formatDateStr(new Date(year, month + 1, 0))
      break
    case 'lastMonth':
      startDate.value = formatDateStr(new Date(year, month - 1, 1))
      endDate.value = formatDateStr(new Date(year, month, 0))
      break
    case 'thisQuarter':
      const thisQuarterStart = Math.floor(month / 3) * 3
      startDate.value = formatDateStr(new Date(year, thisQuarterStart, 1))
      endDate.value = formatDateStr(new Date(year, thisQuarterStart + 3, 0))
      break
    case 'lastQuarter':
      const lastQuarterStart = Math.floor(month / 3) * 3 - 3
      startDate.value = formatDateStr(new Date(year, lastQuarterStart, 1))
      endDate.value = formatDateStr(new Date(year, lastQuarterStart + 3, 0))
      break
    case 'q1':
      startDate.value = `${year}-01-01`
      endDate.value = `${year}-03-31`
      break
    case 'q2':
      startDate.value = `${year}-04-01`
      endDate.value = `${year}-06-30`
      break
    case 'q3':
      startDate.value = `${year}-07-01`
      endDate.value = `${year}-09-30`
      break
    case 'q4':
      startDate.value = `${year}-10-01`
      endDate.value = `${year}-12-31`
      break
    case 'thisYear':
      startDate.value = `${year}-01-01`
      endDate.value = `${year}-12-31`
      break
    case 'all':
      startDate.value = ''
      endDate.value = ''
      break
  }
  handleSearch()
}

const formatDateStr = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const loadData = async () => {
  try {
    const params: any = {}
    if (startDate.value && endDate.value) {
      params.startDate = startDate.value
      params.endDate = endDate.value
    }
    if (companyFilter.value) {
      params.companyId = companyFilter.value
    }

    const res = await getSettlementReport(params) as any
    if (res) {
      summary.value = res.summary || summary.value
      dailyData.value = res.dailyData || []
      companyData.value = res.companyData || []
      trendData.value = res.trendData || []
      statusDistribution.value = res.statusDistribution || []
      await nextTick()
      renderCharts()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '加载数据失败')
  }
}

const loadCompanies = async () => {
  try {
    const res = await getOutsourceCompanies({ page: 1, pageSize: 100 }) as any
    if (res) companies.value = res.list || []
  } catch (e) {
    console.error(e)
  }
}

const renderCharts = () => {
  renderTrendChart()
  renderValidRateChart()
  renderStatusPieChart()
  renderSettlementPieChart()
}

const renderTrendChart = () => {
  if (!trendChartRef.value) return

  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }

  // 格式化日期为 MM-DD
  const formatAxisDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = dateStr.split('T')[0] // 取日期部分
    const parts = date.split('-')
    return `${parts[1]}-${parts[2]}` // 返回 MM-DD
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        let result = params[0].axisValue + '<br/>'
        params.forEach((item: any) => {
          result += `${item.marker}${item.seriesName}: ${item.value}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['结算订单数', '结算金额'],
      top: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dailyData.value.map(item => formatAxisDate(item.date)),
      axisLabel: {
        rotate: 45,
        fontSize: 11
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '订单数',
        position: 'left',
        axisLabel: {
          formatter: '{value}'
        }
      },
      {
        type: 'value',
        name: '金额（元）',
        position: 'right',
        axisLabel: {
          formatter: '{value}'
        }
      }
    ],
    series: [
      {
        name: '结算订单数',
        type: 'line',
        data: dailyData.value.map(item => item.count),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#409eff' },
        lineStyle: { width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
            ]
          }
        }
      },
      {
        name: '结算金额',
        type: 'line',
        yAxisIndex: 1,
        data: dailyData.value.map(item => item.amount),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#67c23a' },
        lineStyle: { width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
              { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
            ]
          }
        }
      }
    ]
  }

  trendChart.setOption(option)
}

const renderValidRateChart = () => {
  if (!validRateChartRef.value) return

  if (!validRateChart) {
    validRateChart = echarts.init(validRateChartRef.value)
  }

  // 格式化日期为 MM-DD
  const formatAxisDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = dateStr.split('T')[0]
    const parts = date.split('-')
    return `${parts[1]}-${parts[2]}`
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: (params: any) => {
        let result = params[0].axisValue + '<br/>'
        params.forEach((item: any) => {
          result += `${item.marker}${item.seriesName}: ${item.value}%<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['有效率', '结算率'],
      top: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trendData.value.map(item => formatAxisDate(item.date)),
      axisLabel: {
        rotate: 45,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      name: '百分比（%）',
      min: 0,
      max: 100,
      interval: 20,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: '有效率',
        type: 'line',
        data: trendData.value.map(item => parseFloat(item.validRate)),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#67c23a' },
        lineStyle: { width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
              { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
            ]
          }
        }
      },
      {
        name: '结算率',
        type: 'line',
        data: trendData.value.map(item => parseFloat(item.settlementRate)),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#409eff' },
        lineStyle: { width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
            ]
          }
        }
      }
    ]
  }

  validRateChart.setOption(option)
}

const renderStatusPieChart = () => {
  if (!statusPieChartRef.value) return

  if (!statusPieChart) {
    statusPieChart = echarts.init(statusPieChartRef.value)
  }

  const statusMap: Record<string, string> = {
    valid: '有效',
    invalid: '无效',
    pending: '待处理'
  }

  const colorMap: Record<string, string> = {
    valid: '#67c23a',
    invalid: '#f56c6c',
    pending: '#e6a23c'
  }

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/>{c}单 ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      left: 'left',
      top: 10,
      itemGap: 20,
      textStyle: {
        fontSize: 13
      }
    },
    series: [
      {
        name: '状态分布',
        type: 'pie',
        radius: '65%',
        center: ['50%', '55%'],
        data: statusDistribution.value.map(item => ({
          name: statusMap[item.status] || item.status,
          value: item.count,
          itemStyle: { color: colorMap[item.status] }
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          show: true,
          fontSize: 13,
          fontWeight: 'normal',
          formatter: '{b}\n{c}单 ({d}%)',
          lineHeight: 16
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 10
        }
      }
    ]
  }

  statusPieChart.setOption(option)
}

const renderSettlementPieChart = () => {
  if (!settlementPieChartRef.value) return

  if (!settlementPieChart) {
    settlementPieChart = echarts.init(settlementPieChartRef.value)
  }

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/>{c}单 ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      left: 'left',
      top: 10,
      itemGap: 20,
      textStyle: {
        fontSize: 13
      }
    },
    series: [
      {
        name: '已结算/未结算对比',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '55%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          fontSize: 13,
          fontWeight: 'normal',
          formatter: '{b}\n{c}单 ({d}%)',
          lineHeight: 16
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'normal'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 10
        },
        data: [
          {
            name: '已结算',
            value: summary.value.settled.count,
            itemStyle: { color: '#67c23a' }
          },
          {
            name: '未结算',
            value: summary.value.unsettled.count,
            itemStyle: { color: '#e6a23c' }
          }
        ]
      }
    ]
  }

  settlementPieChart.setOption(option)
}

const exportCompanyData = () => {
  try {
    if (companyRanking.value.length === 0) {
      ElMessage.warning('暂无数据可导出')
      return
    }

    // 准备导出数据
    const exportData = companyRanking.value.map((row, index) => ({
      '排名': index + 1,
      '公司名称': row.companyName,
      '总订单': row.totalCount,
      '总金额': (row.settledAmount + row.unsettledAmount).toFixed(2),
      '有效订单': row.validCount,
      '无效订单': row.invalidCount,
      '待处理订单': row.pendingCount,
      '已结算订单': row.settledCount,
      '未结算订单': row.unsettledCount,
      '已结算金额': row.settledAmount.toFixed(2),
      '未结算金额': row.unsettledAmount.toFixed(2),
      '平均单价': row.avgSettledAmount.toFixed(2),
      '结算率': `${getCompanySettlementRate(row)}%`,
      '有效率': `${getCompanyValidRate(row)}%`,
      '最近结算': formatDate(row.lastSettlementDate)
    }))

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)

    // 设置列宽
    ws['!cols'] = [
      { wch: 8 },   // 排名
      { wch: 20 },  // 公司名称
      { wch: 10 },  // 总订单
      { wch: 12 },  // 总金额
      { wch: 12 },  // 已结算订单
      { wch: 12 },  // 未结算订单
      { wch: 10 },  // 有效订单
      { wch: 10 },  // 无效订单
      { wch: 12 },  // 待处理订单
      { wch: 14 },  // 已结算金额
      { wch: 14 },  // 未结算金额
      { wch: 12 },  // 平均单价
      { wch: 10 },  // 结算率
      { wch: 10 },  // 有效率
      { wch: 12 }   // 最近结算
    ]

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '公司结算排名')

    // 生成文件名（包含日期范围）
    let fileName = '公司结算排名'
    if (startDate.value && endDate.value) {
      fileName += `_${startDate.value}_${endDate.value}`
    } else {
      const today = new Date().toISOString().split('T')[0]
      fileName += `_${today}`
    }
    fileName += '.xlsx'

    // 导出文件
    XLSX.writeFile(wb, fileName)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

const handleDateChange = () => {
  handleSearch()
}

const handleSearch = () => {
  loadData()
}

const handleRefresh = () => {
  startDate.value = ''
  endDate.value = ''
  companyFilter.value = ''
  currentDateFilter.value = 'thisMonth'
  handleQuickDateFilter('thisMonth')
}

onMounted(() => {
  // 默认显示本月数据
  handleQuickDateFilter('thisMonth')
  loadCompanies()

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    trendChart?.resize()
    validRateChart?.resize()
    statusPieChart?.resize()
    settlementPieChart?.resize()
  })
})
</script>

<style scoped lang="scss">
.settlement-report-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  .header-left {
    h2 {
      margin: 0;
      font-size: 20px;
      color: #303133;
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
    align-items: center;

    .filter-date {
      width: 150px;
    }

    .date-separator {
      color: #909399;
      padding: 0 4px;
    }

    .filter-item {
      width: 150px;
    }
  }
}

.quick-date-filters {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;

  &.secondary {
    grid-template-columns: repeat(3, 1fr);
  }

  .summary-card {
    background: white;
    border-radius: 8px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    &.small {
      padding: 20px;
    }

    .card-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      flex-shrink: 0;

      &.total {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      &.settled {
        background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
        color: white;
      }

      &.unsettled {
        background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
        color: white;
      }

      &.valid {
        background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
        color: white;
      }

      &.invalid {
        background: linear-gradient(135deg, #f56c6c 0%, #f89898 100%);
        color: white;
      }

      &.pending {
        background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
        color: white;
      }

      &.avg {
        background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
        color: white;
      }
    }

    .card-content {
      flex: 1;

      .card-label {
        font-size: 14px;
        color: #909399;
        margin-bottom: 8px;
      }

      .card-value {
        font-size: 28px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 4px;
      }

      .card-sub {
        font-size: 13px;
        color: #67c23a;
        font-weight: 500;
      }
    }
  }
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;

  .chart-card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    .chart-header {
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        font-size: 16px;
        color: #303133;
      }

      .chart-legend {
        display: flex;
        gap: 20px;

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #606266;

          .legend-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            display: inline-block;

            &.settled {
              background: #67c23a;
            }

            &.count {
              background: #409eff;
            }

            &.avg {
              background: #e6a23c;
            }
          }
        }
      }
    }

    .chart-container {
      width: 100%;
      height: 350px;
    }
  }
}

.ranking-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  .section-header {
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 16px;
      color: #303133;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }
  }

  .rank-medal {
    font-size: 20px;
  }
}
</style>
