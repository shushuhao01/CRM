<template>
  <div class="service-data-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">售后数据看板</h1>
      <div class="header-actions">
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
        <el-button type="primary" @click="exportData">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon">
          <el-icon><ShoppingCart /></el-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics.totalOrders }}</div>
          <div class="metric-label">售后订单数量</div>
          <div class="metric-trend" :class="{ positive: metrics.ordersTrend > 0, negative: metrics.ordersTrend < 0 }">
            <el-icon v-if="metrics.ordersTrend > 0"><ArrowUp /></el-icon>
            <el-icon v-else><ArrowDown /></el-icon>
            {{ Math.abs(metrics.ordersTrend) }}%
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon refund">
          <el-icon><Money /></el-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">¥{{ metrics.refundAmount.toLocaleString() }}</div>
          <div class="metric-label">已退款金额</div>
          <div class="metric-trend" :class="{ positive: metrics.refundTrend > 0, negative: metrics.refundTrend < 0 }">
            <el-icon v-if="metrics.refundTrend > 0"><ArrowUp /></el-icon>
            <el-icon v-else><ArrowDown /></el-icon>
            {{ Math.abs(metrics.refundTrend) }}%
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon today">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics.todayOrders }}</div>
          <div class="metric-label">今日售后单</div>
          <div class="metric-trend" :class="{ positive: metrics.todayTrend > 0, negative: metrics.todayTrend < 0 }">
            <el-icon v-if="metrics.todayTrend > 0"><ArrowUp /></el-icon>
            <el-icon v-else><ArrowDown /></el-icon>
            {{ Math.abs(metrics.todayTrend) }}%
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon pending">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics.pendingOrders }}</div>
          <div class="metric-label">待处理</div>
          <div class="metric-trend" :class="{ positive: metrics.pendingTrend > 0, negative: metrics.pendingTrend < 0 }">
            <el-icon v-if="metrics.pendingTrend > 0"><ArrowUp /></el-icon>
            <el-icon v-else><ArrowDown /></el-icon>
            {{ Math.abs(metrics.pendingTrend) }}%
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon urgent">
          <el-icon><Warning /></el-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ metrics.urgentOrders }}</div>
          <div class="metric-label">紧急订单</div>
          <div class="metric-trend" :class="{ positive: metrics.urgentTrend > 0, negative: metrics.urgentTrend < 0 }">
            <el-icon v-if="metrics.urgentTrend > 0"><ArrowUp /></el-icon>
            <el-icon v-else><ArrowDown /></el-icon>
            {{ Math.abs(metrics.urgentTrend) }}%
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <div class="chart-row">
        <!-- 售后趋势图 -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>售后订单趋势</h3>
            <el-select v-model="trendPeriod" @change="updateTrendChart">
              <el-option label="最近7天" value="7days" />
              <el-option label="最近30天" value="30days" />
              <el-option label="最近3个月" value="3months" />
              <el-option label="最近6个月" value="6months" />
            </el-select>
          </div>
          <div class="chart-content" ref="trendChart"></div>
        </div>

        <!-- 售后类型分布 -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>售后类型分布</h3>
          </div>
          <div class="chart-content" ref="typeChart"></div>
        </div>
      </div>

      <div class="chart-row">
        <!-- 处理时长分析 -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>处理时长分析</h3>
          </div>
          <div class="chart-content" ref="durationChart"></div>
        </div>

        <!-- 退款金额趋势 -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>退款金额趋势</h3>
          </div>
          <div class="chart-content" ref="refundChart"></div>
        </div>
      </div>
    </div>

    <!-- 售后订单列表 -->
    <div class="orders-section">
      <div class="section-header">
        <h3>售后订单明细</h3>
        <div class="section-actions">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索订单号、客户名称"
            style="width: 200px; margin-right: 10px;"
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="statusFilter" placeholder="状态筛选" @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </div>
      </div>

      <el-table :data="filteredOrders" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="售后单号" width="140" />
        <el-table-column prop="originalOrderNo" label="原订单号" width="140" />
        <el-table-column prop="customerName" label="客户姓名" width="100" />
        <el-table-column prop="productName" label="商品名称" min-width="150" />
        <el-table-column prop="serviceType" label="售后类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getServiceTypeTag(row.serviceType)">
              {{ getServiceTypeText(row.serviceType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="涉及金额" width="100">
          <template #default="{ row }">
            ¥{{ row.amount.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.priority === 'urgent'" type="danger" size="small">紧急</el-tag>
            <el-tag v-else-if="row.priority === 'high'" type="warning" size="small">高</el-tag>
            <el-tag v-else type="info" size="small">普通</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="120" />
        <el-table-column prop="updateTime" label="更新时间" width="120" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewDetail(row)">查看</el-button>
            <el-button type="success" size="small" @click="processOrder(row)" v-if="row.status === 'pending'">处理</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalOrders"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Download,
  Refresh,
  ShoppingCart,
  Money,
  Calendar,
  Clock,
  Warning,
  ArrowUp,
  ArrowDown,
  Search
} from '@element-plus/icons-vue'
import { createSafeNavigator } from '@/utils/navigation'
import { useServiceStore } from '@/stores/service'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import * as echarts from 'echarts'

// 接口定义
interface ServiceOrder {
  id: string
  orderNo: string
  originalOrderNo: string
  customerName: string
  productName: string
  serviceType: string
  amount: number
  status: string
  priority: string
  createTime: string
  updateTime: string
}

interface ServiceMetrics {
  totalOrders: number
  ordersTrend: number
  refundAmount: number
  refundTrend: number
  todayOrders: number
  todayTrend: number
  pendingOrders: number
  pendingTrend: number
  urgentOrders: number
  urgentTrend: number
}

const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const serviceStore = useServiceStore()
const userStore = useUserStore()
const orderStore = useOrderStore()

// 响应式数据
const dateRange = ref<[string, string]>(['2024-01-01', '2024-01-31'])
const loading = ref(false)
const searchKeyword = ref('')
const statusFilter = ref('')
const trendPeriod = ref('30days')
const currentPage = ref(1)
const pageSize = ref(20)
const totalOrders = ref(0)

// 图表引用
const trendChart = ref<HTMLElement>()
const typeChart = ref<HTMLElement>()
const durationChart = ref<HTMLElement>()
const refundChart = ref<HTMLElement>()

// 图表实例
let trendChartInstance: echarts.ECharts | null = null
let typeChartInstance: echarts.ECharts | null = null
let durationChartInstance: echarts.ECharts | null = null
let refundChartInstance: echarts.ECharts | null = null

// 核心指标数据 - 从serviceStore计算
const metrics = computed((): ServiceMetrics => {
  const services = getFilteredServicesByPermission()
  const today = new Date().toISOString().slice(0, 10)
  
  // 计算总订单数
  const totalOrders = services.length
  
  // 计算今日订单数
  const todayOrders = services.filter(service => 
    service.createTime.slice(0, 10) === today
  ).length
  
  // 计算待处理订单数
  const pendingOrders = services.filter(service => 
    service.status === 'pending'
  ).length
  
  // 计算紧急订单数
  const urgentOrders = services.filter(service => 
    service.priority === 'urgent'
  ).length
  
  // 计算退款金额（退货和退款类型）
  const refundAmount = services
    .filter(service => service.serviceType === 'return' || service.serviceType === 'refund')
    .reduce((sum, service) => sum + (service.price || 0), 0)
  
  // 模拟趋势计算（实际项目中应该与历史数据对比）
  const ordersTrend = totalOrders > 0 ? Math.random() * 20 - 10 : 0
  const todayTrend = todayOrders > 0 ? Math.random() * 30 - 15 : 0
  const pendingTrend = pendingOrders > 0 ? Math.random() * 25 - 12.5 : 0
  const urgentTrend = urgentOrders > 0 ? Math.random() * 40 - 20 : 0
  const refundTrend = refundAmount > 0 ? Math.random() * 15 - 7.5 : 0
  
  return {
    totalOrders,
    ordersTrend: Number(ordersTrend.toFixed(1)),
    refundAmount,
    refundTrend: Number(refundTrend.toFixed(1)),
    todayOrders,
    todayTrend: Number(todayTrend.toFixed(1)),
    pendingOrders,
    pendingTrend: Number(pendingTrend.toFixed(1)),
    urgentOrders,
    urgentTrend: Number(urgentTrend.toFixed(1))
  }
})

// 根据权限过滤售后服务数据
const getFilteredServicesByPermission = () => {
  const currentUser = userStore.currentUser
  if (!currentUser) return []
  
  const allServices = serviceStore.services
  
  // 超级管理员看全部
  if (currentUser.role === 'admin') {
    return allServices
  }
  
  // 部门管理员看部门内的数据
  if (currentUser.role === 'manager' || currentUser.role === 'department_manager') {
    // 根据部门过滤数据
    return allServices.filter(service => {
      // 如果服务有部门信息，按部门过滤
      if (service.department) {
        return service.department === currentUser.department ||
               service.department === currentUser.departmentId
      }
      // 如果没有部门信息，按创建者和分配者过滤
      return service.createdBy === currentUser.id ||
             service.assignedTo === currentUser.name ||
             service.assignedTo === currentUser.id ||
             service.handlerId === currentUser.id
    })
  }
  
  // 客服人员看分配给自己的和自己创建的
  if (currentUser.role === 'customer_service') {
    return allServices.filter(service => 
      service.createdBy === currentUser.id || 
      service.assignedTo === currentUser.name ||
      service.assignedTo === currentUser.id ||
      service.handlerId === currentUser.id ||
      service.handlerName === currentUser.name
    )
  }
  
  // 销售人员看自己相关的客户售后
  if (currentUser.role === 'sales_staff') {
    return allServices.filter(service => 
      service.createdBy === currentUser.id || 
      service.salesPersonId === currentUser.id ||
      service.salesPerson === currentUser.name ||
      service.assignedTo === currentUser.name ||
      service.assignedTo === currentUser.id
    )
  }
  
  // 普通员工只看自己创建的或分配给自己的
  return allServices.filter(service => 
    service.createdBy === currentUser.id || 
    service.assignedTo === currentUser.name ||
    service.assignedTo === currentUser.id
  )
}

// 售后订单数据 - 从serviceStore获取并转换格式
const orders = computed(() => {
  const services = getFilteredServicesByPermission()
  return services.map(service => ({
    id: service.id,
    orderNo: service.serviceNumber,
    originalOrderNo: service.orderNumber,
    customerName: service.customerName,
    productName: service.productName || '未知商品',
    serviceType: service.serviceType,
    amount: service.price || 0,
    status: service.status,
    priority: service.priority,
    createTime: service.createTime,
    updateTime: service.updateTime || service.createTime
  }))
})

// 计算属性
const filteredOrders = computed(() => {
  let result = orders.value

  if (searchKeyword.value) {
    result = result.filter(order => 
      order.orderNo.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
      order.customerName.includes(searchKeyword.value) ||
      order.originalOrderNo.toLowerCase().includes(searchKeyword.value.toLowerCase())
    )
  }

  if (statusFilter.value) {
    result = result.filter(order => order.status === statusFilter.value)
  }

  totalOrders.value = result.length
  return result.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
})

// 方法
const handleDateChange = (dates: [string, string]) => {
  console.log('日期范围变更:', dates)
  // 重新加载数据和更新图表
  loadData()
  updateAllCharts()
}

const exportData = () => {
  ElMessage.success('数据导出功能开发中...')
}

const refreshData = async () => {
  loading.value = true
  try {
    await loadData()
    updateAllCharts()
    ElMessage.success('数据已刷新')
  } catch (error) {
    ElMessage.error('数据刷新失败')
  } finally {
    loading.value = false
  }
}

const loadData = async () => {
  try {
    await serviceStore.loadAfterSalesServices()
  } catch (error) {
    console.error('加载售后数据失败:', error)
  }
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleFilter = () => {
  currentPage.value = 1
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

const getServiceTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    return: '退货',
    exchange: '换货',
    repair: '维修',
    refund: '退款'
  }
  return typeMap[type] || type
}

const getServiceTypeTag = (type: string) => {
  const tagMap: Record<string, string> = {
    return: 'danger',
    exchange: 'warning',
    repair: 'info',
    refund: 'success'
  }
  return tagMap[type] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭'
  }
  return statusMap[status] || status
}

const getStatusTag = (status: string) => {
  const tagMap: Record<string, string> = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    closed: 'info'
  }
  return tagMap[status] || 'info'
}

const viewDetail = (row: ServiceOrder) => {
  safeNavigator.push(`/service/detail/${row.id}`)
}

const processOrder = async (row: ServiceOrder) => {
  try {
    await serviceStore.updateServiceStatus(row.id, 'processing', '开始处理')
    ElMessage.success(`开始处理订单 ${row.orderNo}`)
  } catch (error) {
    ElMessage.error('处理失败')
  }
}

const updateTrendChart = () => {
  console.log('更新趋势图:', trendPeriod.value)
  initTrendChart()
}

// 初始化趋势图
const initTrendChart = () => {
  if (!trendChart.value) return
  
  if (trendChartInstance) {
    trendChartInstance.dispose()
  }
  
  trendChartInstance = echarts.init(trendChart.value)
  
  const services = getFilteredServicesByPermission()
  
  // 根据选择的时间段生成对应的日期数组和数据
  let days: string[] = []
  let dateFormat = ''
  let periodLength = 0
  
  switch (trendPeriod.value) {
    case '7days':
      periodLength = 7
      dateFormat = 'MM-DD'
      days = Array.from({ length: periodLength }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (periodLength - 1) + i)
        return date.toISOString().slice(5, 10) // MM-DD格式
      })
      break
    case '30days':
      periodLength = 30
      dateFormat = 'MM-DD'
      days = Array.from({ length: periodLength }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (periodLength - 1) + i)
        return date.toISOString().slice(5, 10) // MM-DD格式
      })
      break
    case '3months':
      periodLength = 90
      dateFormat = 'MM-DD'
      days = Array.from({ length: periodLength }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (periodLength - 1) + i)
        return date.toISOString().slice(5, 10) // MM-DD格式
      })
      break
    case '6months':
      periodLength = 180
      dateFormat = 'MM-DD'
      days = Array.from({ length: periodLength }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (periodLength - 1) + i)
        return date.toISOString().slice(5, 10) // MM-DD格式
      })
      break
    default:
      periodLength = 7
      days = Array.from({ length: periodLength }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (periodLength - 1) + i)
        return date.toISOString().slice(5, 10)
      })
  }
  
  // 根据日期筛选数据
  const data = days.map(day => {
    return services.filter(service => {
      const serviceDate = service.createTime.slice(5, 10) // 提取MM-DD部分
      return serviceDate === day
    }).length
  })
  
  // 对于长时间段，只显示部分标签以避免拥挤
  let xAxisData = days
  if (periodLength > 30) {
    // 对于超过30天的数据，每隔几天显示一个标签
    const step = Math.ceil(periodLength / 10)
    xAxisData = days.map((day, index) => index % step === 0 ? day : '')
  }
  
  const option = {
    title: {
      text: '售后订单趋势',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const dataIndex = params[0].dataIndex
        return `${days[dataIndex]}: ${params[0].value}个订单`
      }
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel: {
        rotate: periodLength > 30 ? 45 : 0 // 长时间段时旋转标签
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: data,
      type: 'line',
      smooth: true,
      itemStyle: { color: '#409EFF' }
    }]
  }
  
  trendChartInstance.setOption(option)
}

// 初始化类型分布图
const initTypeChart = () => {
  if (!typeChart.value) return
  
  if (typeChartInstance) {
    typeChartInstance.dispose()
  }
  
  typeChartInstance = echarts.init(typeChart.value)
  
  const services = getFilteredServicesByPermission()
  const typeData = [
    { name: '退货', value: services.filter(s => s.serviceType === 'return').length },
    { name: '换货', value: services.filter(s => s.serviceType === 'exchange').length },
    { name: '维修', value: services.filter(s => s.serviceType === 'repair').length },
    { name: '退款', value: services.filter(s => s.serviceType === 'refund').length }
  ]
  
  const option = {
    title: {
      text: '售后类型分布',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'item'
    },
    series: [{
      type: 'pie',
      radius: '60%',
      data: typeData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
  
  typeChartInstance.setOption(option)
}

// 初始化处理时长分析图
const initDurationChart = () => {
  if (!durationChart.value) return
  
  if (durationChartInstance) {
    durationChartInstance.dispose()
  }
  
  durationChartInstance = echarts.init(durationChart.value)
  
  const services = getFilteredServicesByPermission()
  const completedServices = services.filter(s => s.status === 'resolved' || s.status === 'closed')
  
  // 计算处理时长分布
  const durationData = [0, 0, 0, 0, 0] // 对应 0-1天, 1-3天, 3-7天, 7-15天, 15天以上
  
  completedServices.forEach(service => {
    const createTime = new Date(service.createTime)
    const updateTime = new Date(service.updateTime || service.createTime)
    const diffDays = Math.ceil((updateTime - createTime) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 1) {
      durationData[0]++
    } else if (diffDays <= 3) {
      durationData[1]++
    } else if (diffDays <= 7) {
      durationData[2]++
    } else if (diffDays <= 15) {
      durationData[3]++
    } else {
      durationData[4]++
    }
  })
  
  const option = {
    title: {
      text: '处理时长分析',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}个订单'
    },
    xAxis: {
      type: 'category',
      data: ['0-1天', '1-3天', '3-7天', '7-15天', '15天以上']
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: durationData,
      type: 'bar',
      itemStyle: { color: '#67C23A' }
    }]
  }
  
  durationChartInstance.setOption(option)
}

// 初始化退款金额趋势图
const initRefundChart = () => {
  if (!refundChart.value) return
  
  if (refundChartInstance) {
    refundChartInstance.dispose()
  }
  
  refundChartInstance = echarts.init(refundChart.value)
  
  const services = getFilteredServicesByPermission()
  const refundServices = services.filter(s => s.serviceType === 'return' || s.serviceType === 'refund')
  
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - 6 + i)
    return date.toISOString().slice(5, 10)
  })
  
  const data = days.map(day => {
    return refundServices
      .filter(service => service.createTime.slice(5, 10) === day)
      .reduce((sum, service) => sum + (service.price || 0), 0)
  })
  
  const option = {
    title: {
      text: '退款金额趋势',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: ¥{c}'
    },
    xAxis: {
      type: 'category',
      data: days
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: data,
      type: 'line',
      smooth: true,
      itemStyle: { color: '#F56C6C' }
    }]
  }
  
  refundChartInstance.setOption(option)
}

// 更新所有图表
const updateAllCharts = () => {
  nextTick(() => {
    initTrendChart()
    initTypeChart()
    initDurationChart()
    initRefundChart()
  })
}

// 初始化图表
const initCharts = () => {
  updateAllCharts()
}

// 监听serviceStore数据变化
watch(() => serviceStore.services, () => {
  updateAllCharts()
}, { deep: true })

// 窗口大小变化时重新调整图表
const handleResize = () => {
  trendChartInstance?.resize()
  typeChartInstance?.resize()
  durationChartInstance?.resize()
  refundChartInstance?.resize()
}

onMounted(async () => {
  await loadData()
  nextTick(() => {
    initCharts()
    window.addEventListener('resize', handleResize)
  })
})

// 组件卸载时清理
import { onUnmounted } from 'vue'
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChartInstance?.dispose()
  typeChartInstance?.dispose()
  durationChartInstance?.dispose()
  refundChartInstance?.dispose()
})
</script>

<style scoped>
.service-data-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.metric-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.metric-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 24px;
}

.metric-icon.refund {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.metric-icon.today {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.metric-icon.pending {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.metric-icon.urgent {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.metric-trend {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
}

.metric-trend.positive {
  color: #67c23a;
}

.metric-trend.negative {
  color: #f56c6c;
}

.charts-section {
  margin-bottom: 24px;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chart-header {
  padding: 20px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-content {
  height: 300px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  background: linear-gradient(45deg, #f8f9fa 25%, transparent 25%),
              linear-gradient(-45deg, #f8f9fa 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #f8f9fa 75%),
              linear-gradient(-45deg, transparent 75%, #f8f9fa 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.orders-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-header {
  padding: 20px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.section-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.pagination-wrapper {
  padding: 20px;
  display: flex;
  justify-content: center;
  border-top: 1px solid #ebeef5;
}

@media (max-width: 768px) {
  .service-data-container {
    padding: 12px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-row {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .section-actions {
    justify-content: center;
  }
}
</style>
