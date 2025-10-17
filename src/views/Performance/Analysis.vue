<template>
  <div class="analysis-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <el-button 
          type="primary" 
          :icon="ArrowLeft" 
          @click="goBack"
          class="back-btn"
        >
          返回团队业绩
        </el-button>
        <h1 class="page-title">{{ pageTitle }}</h1>
      </div>
    </div>

    <!-- 成员信息卡片 (仅当查看个人数据时显示) -->
    <div v-if="showMemberInfo" class="member-info-card">
      <div class="member-avatar">
        <el-avatar :size="60" :src="memberInfo.avatar">{{ memberInfo.name.charAt(0) }}</el-avatar>
      </div>
      <div class="member-details">
        <h3>{{ memberInfo.name }}</h3>
        <p>{{ memberInfo.department }} | 入职时间：{{ memberInfo.joinDate }}</p>
      </div>
    </div>

    <!-- 快速时间筛选 -->
    <div class="quick-filter-section">
      <div class="quick-filter-label">快速筛选：</div>
      <div class="quick-filter-buttons">
        <el-button 
          v-for="item in quickFilterOptions" 
          :key="item.key"
          :type="selectedQuickFilter === item.key ? 'primary' : 'default'"
          size="small"
          @click="handleQuickFilter(item.key)"
          class="quick-filter-btn"
        >
          {{ item.label }}
        </el-button>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filter-section">
      <div class="filter-left">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          class="date-picker"
        />
        <el-select 
          v-if="userStore.isAdmin || userStore.isManager" 
          v-model="selectedDepartment" 
          placeholder="选择部门" 
          class="department-select"
          size="default"
          :disabled="!userStore.isAdmin"
        >
          <el-option v-if="userStore.isAdmin" label="全部部门" value="" />
          <el-option 
            v-for="dept in availableDepartments" 
            :key="dept.id" 
            :label="dept.name" 
            :value="dept.id" 
          />
        </el-select>
        <el-select 
          v-model="sortBy" 
          placeholder="排序方式" 
          class="sort-select"
          size="default"
        >
          <el-option label="按业绩排序" value="performance" />
          <el-option label="按订单数排序" value="orders" />
          <el-option label="按签收率排序" value="signRate" />
        </el-select>
      </div>
      <div class="filter-right">
        <el-button type="primary" @click="queryData" class="query-btn">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="exportData" class="export-btn">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <div class="metrics-grid">
      <!-- 第一行 -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-icon total-performance">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(metrics.totalPerformance) }}</div>
            <div class="metric-label">总业绩</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon total-orders">
            <el-icon><Document /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.totalOrders }}</div>
            <div class="metric-label">总订单</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon avg-performance">
            <el-icon><DataAnalysis /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(metrics.avgPerformance) }}</div>
            <div class="metric-label">平均业绩</div>
          </div>
        </div>
      </div>

      <!-- 第二行 -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-icon sign-orders">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.signOrders }}</div>
            <div class="metric-label">签收单数</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon sign-rate">
            <el-icon><SuccessFilled /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.signRate }}%</div>
            <div class="metric-label">签收率</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon sign-performance">
            <el-icon><Trophy /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(metrics.signPerformance) }}</div>
            <div class="metric-label">签收业绩</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <div class="chart-row">
        <div class="chart-card">
          <div class="chart-header">
            <h3>业绩趋势</h3>
          </div>
          <div class="chart-content" ref="performanceChartRef"></div>
        </div>
        
        <div class="chart-card">
          <div class="chart-header">
            <h3>订单状态分布</h3>
          </div>
          <div class="chart-content" ref="orderStatusChartRef"></div>
        </div>
      </div>
      

    </div>

    <!-- 业绩数据概览 -->
    <div class="table-section">
      <div class="table-header">
        <h3>{{ tableTitle }}</h3>
      </div>
      <el-table :data="tableData" stripe class="data-table" border>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="部门（或成员）" width="120" align="center" />
        <el-table-column prop="orderCount" label="下单单数" width="100" align="center" />
        <el-table-column prop="orderAmount" label="下单业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.orderAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="shipCount" label="发货单数" width="100" align="center" />
        <el-table-column prop="shipAmount" label="发货业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.shipAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="shipRate" label="发货率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRateType(row.shipRate)" size="small">
              {{ row.shipRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="signCount" label="签收单数" width="100" align="center" />
        <el-table-column prop="signAmount" label="签收业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.signAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="signRate" label="签收率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRateType(row.signRate)" size="small">
              {{ row.signRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="transitCount" label="在途单数" width="100" align="center" />
        <el-table-column prop="transitAmount" label="在途业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.transitAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="transitRate" label="在途率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRateType(row.transitRate)" size="small">
              {{ row.transitRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rejectCount" label="拒收单数" width="100" align="center" />
        <el-table-column prop="rejectAmount" label="拒收业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.rejectAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="rejectRate" label="拒收率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRejectRateType(row.rejectRate)" size="small">
              {{ row.rejectRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="returnCount" label="退货单数" width="100" align="center" />
        <el-table-column prop="returnAmount" label="退货业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.returnAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="returnRate" label="退货率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getReturnRateType(row.returnRate)" size="small">
              {{ row.returnRate }}%
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useDepartmentStore } from '@/stores/department'
import { usePerformanceStore } from '@/stores/performance'
import { createSafeNavigator } from '@/utils/navigation'
import * as performanceApi from '@/api/performance'
import * as echarts from 'echarts'
import { 
  ArrowLeft, 
  Search, 
  Download, 
  TrendCharts, 
  Document, 
  DataAnalysis,
  CircleCheck,
  SuccessFilled,
  Trophy
} from '@element-plus/icons-vue'

// 接口定义
interface PerformanceData {
  name: string
  orderCount: number
  orderAmount: number
  shipCount: number
  shipAmount: number
  signCount: number
  signAmount: number
  signRate: number
  status: string
}

const _route = useRoute()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const userStore = useUserStore()
const departmentStore = useDepartmentStore()
const performanceStore = usePerformanceStore()

// 图表引用
const performanceChartRef = ref()
const orderStatusChartRef = ref()

// 响应式数据
const dateRange = ref<[string, string]>(['2025-01-01', '2025-01-31'])
const selectedDepartment = ref(userStore.isAdmin ? '' : userStore.currentUser?.departmentId || '')
const sortBy = ref('performance')
const _currentPage = ref(1)
const _pageSize = ref(20)
const _total = ref(100)

// 成员信息
const memberInfo = ref({
  id: '',
  name: '张三',
  department: '销售一部',
  joinDate: '2023-01-15',
  avatar: ''
})

// 核心指标
const metrics = ref({
  totalPerformance: 0,
  totalOrders: 0,
  avgPerformance: 0,
  signOrders: 0,
  signRate: 0,
  signPerformance: 0
})

// 业绩数据列表
const tableData = ref<PerformanceData[]>([])

// 快速筛选相关
const _selectedQuickFilter = ref('')
const quickFilterOptions = ref([
  { key: 'today', label: '今日' },
  { key: 'yesterday', label: '昨日' },
  { key: 'thisWeek', label: '本周' },
  { key: 'lastWeek', label: '上周' },
  { key: 'last7Days', label: '近7天' },
  { key: 'thisMonth', label: '本月' },
  { key: 'thisYear', label: '今年' }
])

const showMemberInfo = computed(() => {
  return !userStore.isAdmin && !userStore.isManager
})

// 可用部门列表（根据用户权限过滤）
const availableDepartments = computed(() => {
  if (userStore.isAdmin) {
    // 超级管理员可以看到所有部门
    return departmentStore.departmentList
  } else if (userStore.isManager) {
    // 部门经理只能看到自己的部门
    return departmentStore.departmentList.filter(dept => dept.id === userStore.currentUser?.departmentId)
  } else {
    // 普通用户不能选择部门
    return []
  }
})

// 方法
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

const goBack = () => {
  safeNavigator.push('/performance/team')
}

const queryData = async () => {
  console.log('查询数据', {
    dateRange: dateRange.value,
    selectedDepartment: selectedDepartment.value,
    sortBy: sortBy.value
  })
  await loadData()
}

const exportData = () => {
  console.log('导出数据')
}



const getRateType = (rate: number) => {
  if (rate >= 90) return 'success'
  if (rate >= 80) return 'warning'
  if (rate >= 70) return 'info'
  return 'danger'
}

const getRejectRateType = (rate: number) => {
  if (rate <= 3) return 'success'
  if (rate <= 5) return 'warning'
  if (rate <= 8) return 'info'
  return 'danger'
}

const getReturnRateType = (rate: number) => {
  if (rate <= 2) return 'success'
  if (rate <= 4) return 'warning'
  if (rate <= 6) return 'info'
  return 'danger'
}

// 快速筛选处理函数
const handleQuickFilter = (filterKey: string) => {
  _selectedQuickFilter.value = filterKey
  const today = new Date()
  let startDate: Date, endDate: Date

  switch (filterKey) {
    case 'today':
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      break
    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
      endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)
      break
    case 'thisWeek':
      const thisWeekStart = new Date(today)
      thisWeekStart.setDate(today.getDate() - today.getDay() + 1) // 周一
      startDate = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate())
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      break
    case 'lastWeek':
      const lastWeekStart = new Date(today)
      lastWeekStart.setDate(today.getDate() - today.getDay() - 6) // 上周一
      const lastWeekEnd = new Date(lastWeekStart)
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6) // 上周日
      startDate = new Date(lastWeekStart.getFullYear(), lastWeekStart.getMonth(), lastWeekStart.getDate())
      endDate = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate(), 23, 59, 59)
      break
    case 'last7Days':
      const last7DaysStart = new Date(today)
      last7DaysStart.setDate(today.getDate() - 6)
      startDate = new Date(last7DaysStart.getFullYear(), last7DaysStart.getMonth(), last7DaysStart.getDate())
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      break
    case 'thisMonth':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      break
    case 'thisYear':
      startDate = new Date(today.getFullYear(), 0, 1)
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      break
    default:
      return
  }

  // 格式化日期为字符串
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  dateRange.value = [formatDate(startDate), formatDate(endDate)]
  
  // 触发数据重新加载
  console.log(`快速筛选: ${filterKey}`, { startDate, endDate })
  loadData()
}



// 初始化图表
// 图表数据
const chartData = ref({
  performanceTrend: {
    xAxis: [],
    data: []
  },
  orderStatus: []
})

// 加载图表数据
const loadChartData = async () => {
  try {
    const params: any = {
      period: '7d' // 使用后端API支持的参数
    }
    
    // 根据用户权限设置参数
    if (userStore.isAdmin) {
      // 超级管理员可以查看全公司数据
      params.type = 'company'
    } else if (userStore.isManager) {
      // 部门经理只能查看自己部门数据
      params.type = 'department'
      params.departmentId = userStore.currentUser?.departmentId
    } else {
      // 普通用户查看个人数据
      params.type = 'personal'
      params.userId = userStore.currentUser?.id
    }
    
    // 获取业绩趋势数据 - 近7天
    const trendParams = {
      period: '7d'
    }
    
    // 根据用户权限设置参数
    if (userStore.currentUser?.role === 'admin') {
      trendParams.type = 'company'
    } else if (userStore.currentUser?.role === 'manager' || userStore.currentUser?.role === 'department_manager') {
      trendParams.type = 'department'
      trendParams.departmentId = userStore.currentUser.departmentId
    } else {
      trendParams.type = 'personal'
      trendParams.userId = userStore.currentUser?.id
    }
    
    const trendResponse = await performanceApi.getPerformanceTrend(trendParams)
    
    if (trendResponse.data?.success && trendResponse.data?.data?.length > 0) {
      chartData.value.performanceTrend = {
        xAxis: trendResponse.data.data.map(item => {
          // 格式化日期显示
          const date = new Date(item.date)
          return `${date.getMonth() + 1}/${date.getDate()}`
        }),
        data: trendResponse.data.data.map(item => item.sales)
      }
    } else {
      // 无数据时清空图表数据
      chartData.value.performanceTrend = {
        xAxis: [],
        data: []
      }
    }
    
    // 获取订单状态分布数据
    const statusParams = { ...params, type: 'status' }
    const statusResponse = await performanceApi.getAnalysisMetrics(statusParams)
    if (statusResponse.data.success && statusResponse.data.data) {
      const statusData = statusResponse.data.data
      const orderStatusData = [
        { value: statusData.signCount || 0, name: '已签收' },
        { value: statusData.transitCount || 0, name: '配送中' },
        { value: statusData.shipCount - statusData.signCount - statusData.transitCount || 0, name: '已发货' },
        { value: statusData.orderCount - statusData.shipCount || 0, name: '待发货' }
      ]
      
      // 检查是否有有效数据
      const hasData = orderStatusData.some(item => item.value > 0)
      chartData.value.orderStatus = hasData ? orderStatusData : []
    } else {
      // 没有数据时清空图表数据
      chartData.value.orderStatus = []
    }
    
    // 初始化图表
    initCharts()
  } catch (error) {
    console.error('加载图表数据失败:', error)
    // 出错时清空图表数据，不显示模拟数据
    chartData.value.performanceTrend = {
      xAxis: [],
      data: []
    }
    chartData.value.orderStatus = []
    initCharts()
  }
}

const initCharts = () => {
  nextTick(() => {
    // 业绩趋势图
    if (performanceChartRef.value) {
      const performanceChart = echarts.init(performanceChartRef.value)
      
      // 检查是否有数据
      const hasPerformanceData = chartData.value.performanceTrend.data.length > 0
      
      if (hasPerformanceData) {
        performanceChart.setOption({
          tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
              const value = params[0].value
              return `${params[0].axisValue}<br/>业绩: ¥${(value / 10000).toFixed(1)}万`
            }
          },
          xAxis: {
            type: 'category',
            data: chartData.value.performanceTrend.xAxis
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (value: number) => `¥${(value / 10000).toFixed(0)}万`
            }
          },
          series: [{
            data: chartData.value.performanceTrend.data,
            type: 'line',
            smooth: true,
            itemStyle: {
              color: '#409eff'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
                { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
              ])
            }
          }]
        })
      } else {
        // 没有数据时显示空状态
        performanceChart.setOption({
          title: {
            text: '暂无数据',
            left: 'center',
            top: 'middle',
            textStyle: {
              color: '#999',
              fontSize: 14
            }
          }
        })
      }
    }

    // 订单状态分布图
    if (orderStatusChartRef.value) {
      const orderStatusChart = echarts.init(orderStatusChartRef.value)
      
      // 检查是否有数据
      const hasOrderStatusData = chartData.value.orderStatus.length > 0
      
      if (hasOrderStatusData) {
        orderStatusChart.setOption({
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          series: [{
            name: '订单状态',
            type: 'pie',
            radius: '60%',
            data: chartData.value.orderStatus,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        })
      } else {
        // 没有数据时显示空状态
        orderStatusChart.setOption({
          title: {
            text: '暂无数据',
            left: 'center',
            top: 'middle',
            textStyle: {
              color: '#999',
              fontSize: 14
            }
          }
        })
      }
    }
  })
}

// 使用默认数据初始化图表（当API调用失败时）


// 权限检查
const checkPermission = () => {
  // 只有部门经理级别以上可以查看业绩分析
  if (!userStore.isManager && !userStore.isAdmin) {
    ElMessage.error('您没有权限查看业绩分析数据')
    router.push('/performance')
    return false
  }
  return true
}

const loadData = async () => {
  // 权限检查
  if (!checkPermission()) {
    return
  }
  
  try {
    // 根据用户角色加载不同数据
    if (userStore.isAdmin) {
      await loadCompanyData()
    } else if (userStore.isManager) {
      await loadDepartmentData()
    }
    
    // 同时加载统计指标和图表数据
    await loadMetrics()
    await loadChartData()
  } catch (error) {
    console.error('加载业绩分析数据失败:', error)
    ElMessage.error('加载数据失败，请稍后重试')
  }
}

const loadDepartmentData = async () => {
  console.log('加载部门数据')
  try {
    const params = {
      departmentId: selectedDepartment.value || userStore.currentUser?.departmentId,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1]
    }
    
    // 非超级管理员只能查看自己部门的数据
    if (!userStore.isAdmin && params.departmentId !== userStore.currentUser?.departmentId) {
      ElMessage.error('您只能查看自己部门的数据')
      params.departmentId = userStore.currentUser?.departmentId
      selectedDepartment.value = userStore.currentUser?.departmentId
    }
    
    // 调用真实API获取部门业绩数据
    const response = await performanceApi.getDepartmentAnalysis(params)
    if (response.data.success) {
      const data = response.data.data
      tableData.value = [{
        id: data.name || '部门数据',
        name: data.name || '部门数据',
        orderCount: data.orderCount || 0,
        orderAmount: data.orderAmount || 0,
        shipCount: data.shipCount || 0,
        shipAmount: data.shipAmount || 0,
        shipRate: data.shipRate || 0,
        signCount: data.signCount || 0,
        signAmount: data.signAmount || 0,
        signRate: data.signRate || 0,
        transitCount: data.transitCount || 0,
        transitAmount: data.transitAmount || 0,
        transitRate: data.transitRate || 0,
        rejectCount: data.rejectCount || 0,
        rejectAmount: data.rejectAmount || 0,
        rejectRate: data.rejectRate || 0,
        returnCount: data.returnCount || 0,
        returnAmount: data.returnAmount || 0,
        returnRate: data.returnRate || 0
      }]
    }
  } catch (error) {
    console.error('加载部门业绩数据失败:', error)
    ElMessage.error('加载部门业绩数据失败')
  }
}

const loadCompanyData = async () => {
  console.log('加载公司数据')
  try {
    // 只有超级管理员可以查看全公司数据
    if (!userStore.isAdmin) {
      ElMessage.error('您没有权限查看全公司数据')
      await loadDepartmentData()
      return
    }
    
    const params = {
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1]
    }
    
    // 调用真实API获取公司业绩数据
    const response = await performanceApi.getCompanyAnalysis(params)
    if (response.data.success) {
      const data = response.data.data
      tableData.value = [{
        id: data.name || '公司总体',
        name: data.name || '公司总体',
        orderCount: data.orderCount || 0,
        orderAmount: data.orderAmount || 0,
        shipCount: data.shipCount || 0,
        shipAmount: data.shipAmount || 0,
        shipRate: data.shipRate || 0,
        signCount: data.signCount || 0,
        signAmount: data.signAmount || 0,
        signRate: data.signRate || 0,
        transitCount: data.transitCount || 0,
        transitAmount: data.transitAmount || 0,
        transitRate: data.transitRate || 0,
        rejectCount: data.rejectCount || 0,
        rejectAmount: data.rejectAmount || 0,
        rejectRate: data.rejectRate || 0,
        returnCount: data.returnCount || 0,
        returnAmount: data.returnAmount || 0,
        returnRate: data.returnRate || 0
      }]
    }
  } catch (error) {
    console.error('加载公司业绩数据失败:', error)
    ElMessage.error('加载公司业绩数据失败')
  }
}

const loadMetrics = async () => {
  try {
    let type: 'personal' | 'department' | 'company' = 'personal'
    const params: any = {
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1]
    }
    
    if (userStore.isAdmin) {
      type = 'company'
    } else if (userStore.isManager) {
      type = 'department'
      params.departmentId = userStore.currentUser?.departmentId
    } else {
      type = 'personal'
      params.userId = userStore.currentUser?.id
    }
    
    params.type = type
    const response = await performanceApi.getAnalysisMetrics(params)
    
    if (response.data.success) {
      const data = response.data.data
      // 更新指标数据
      metrics.value.totalPerformance = data.totalPerformance || 0
      metrics.value.totalOrders = data.totalOrders || 0
      metrics.value.avgPerformance = data.avgPerformance || 0
      metrics.value.signOrders = data.signOrders || 0
      metrics.value.signRate = data.signRate || 0
      metrics.value.signPerformance = data.signPerformance || 0
    }
  } catch (error) {
    console.error('加载统计指标失败:', error)
    ElMessage.error('加载统计指标失败')
    // 使用默认值
    metrics.value.totalPerformance = 0
    metrics.value.totalOrders = 0
    metrics.value.avgPerformance = 0
    metrics.value.signOrders = 0
    metrics.value.signRate = 0
    metrics.value.signPerformance = 0
  }
}

onMounted(() => {
  // 权限检查
  if (!checkPermission()) {
    return
  }
  
  // 初始化部门数据
  departmentStore.initData()
  
  // 加载数据（包含图表数据）
  loadData()
  
  // 监听物流状态更新事件
  window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate)
  window.addEventListener('todoStatusUpdated', handleTodoStatusUpdate)
})

// 处理订单状态更新事件
const handleOrderStatusUpdate = (event: CustomEvent) => {
  console.log('订单状态已更新，刷新业绩数据', event.detail)
  loadData()
  ElMessage.success('业绩数据已同步更新')
}

// 处理待办状态更新事件
const handleTodoStatusUpdate = (event: CustomEvent) => {
  console.log('待办状态已更新，刷新业绩数据', event.detail)
  loadData()
  ElMessage.success('业绩数据已同步更新')
}

onUnmounted(() => {
  // 清理物流状态更新事件监听器
  window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate)
  window.removeEventListener('todoStatusUpdated', handleTodoStatusUpdate)
})
</script>

<style scoped>
.analysis-container {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  background: #409eff;
  border: none;
  color: white;
}

.back-btn:hover {
  background: #337ecc;
}

.page-title {
  color: #2c3e50;
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.member-info-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.member-details h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #2c3e50;
}

.member-details p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.filter-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-picker {
  width: 280px;
}

.department-select {
  width: 140px;
}

.sort-select {
  width: 140px;
}

.query-btn {
  background: #409eff;
  border: none;
  padding: 10px 20px;
}

.export-btn {
  background: #67c23a;
  border: none;
  color: white;
  padding: 10px 20px;
}

.metrics-grid {
  margin-bottom: 24px;
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.metrics-row:last-child {
  margin-bottom: 0;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.metric-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.total-performance {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.total-orders {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.avg-performance {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.sign-orders {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.sign-rate {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.sign-performance {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

.charts-section {
  margin-bottom: 24px;
}

.chart-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.chart-row:last-child {
  margin-bottom: 0;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.chart-header {
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  font-weight: 600;
}

.chart-content {
  height: 300px;
}

.table-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.table-header {
  margin-bottom: 16px;
}

.table-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  font-weight: 600;
}

.data-table {
  width: 100%;
  margin-bottom: 16px;
}

.amount {
  color: #67c23a;
  font-weight: 500;
}

/* 表格样式优化 */
:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table th) {
  background: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

.quick-filter-section {
  background: white;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.quick-filter-label {
  font-weight: 500;
  color: #606266;
  font-size: 14px;
  white-space: nowrap;
}

.quick-filter-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-filter-btn {
  border-radius: 16px;
  padding: 6px 16px;
  font-size: 13px;
  transition: all 0.3s ease;
}

.quick-filter-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .metrics-row {
    grid-template-columns: 1fr;
  }
  
  .chart-row {
    grid-template-columns: 1fr;
  }
  
  .filter-section {
    flex-direction: column;
    gap: 16px;
  }
  
  .filter-left {
    flex-wrap: wrap;
  }
}
</style>