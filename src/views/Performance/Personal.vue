<template>
  <div class="personal-performance">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>个人业绩</h2>
      <div class="header-actions">
        <el-date-picker
          v-model="dateRange"
          type="monthrange"
          range-separator="至"
          start-placeholder="开始月份"
          end-placeholder="结束月份"
          format="YYYY-MM"
          value-format="YYYY-MM"
          @change="handleDateChange"
        />
        <el-button @click="sharePerformance" :icon="Share">分享业绩</el-button>
        <el-button @click="exportData" :icon="Download">导出数据</el-button>
      </div>
    </div>

    <!-- 业绩概览卡片 -->
    <div class="performance-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon sales">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ performanceData.totalSales }}</div>
                <div class="card-label">总销售额</div>
                <div class="card-trend">
                  <span :class="['trend', performanceData.salesTrend > 0 ? 'up' : 'down']">
                    <el-icon><ArrowUp v-if="performanceData.salesTrend > 0" /><ArrowDown v-else /></el-icon>
                    {{ Math.abs(performanceData.salesTrend) }}%
                  </span>
                  <span class="trend-text">较上期</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon orders">
                <el-icon><Document /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ performanceData.totalOrders }}</div>
                <div class="card-label">订单数量</div>
                <div class="card-trend">
                  <span :class="['trend', performanceData.ordersTrend > 0 ? 'up' : 'down']">
                    <el-icon><ArrowUp v-if="performanceData.ordersTrend > 0" /><ArrowDown v-else /></el-icon>
                    {{ Math.abs(performanceData.ordersTrend) }}%
                  </span>
                  <span class="trend-text">较上期</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon customers">
                <el-icon><User /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ performanceData.newCustomers }}</div>
                <div class="card-label">新增客户</div>
                <div class="card-trend">
                  <span :class="['trend', performanceData.customersTrend > 0 ? 'up' : 'down']">
                    <el-icon><ArrowUp v-if="performanceData.customersTrend > 0" /><ArrowDown v-else /></el-icon>
                    {{ Math.abs(performanceData.customersTrend) }}%
                  </span>
                  <span class="trend-text">较上期</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon conversion">
                <el-icon><Promotion /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ performanceData.conversionRate }}%</div>
                <div class="card-label">转化率</div>
                <div class="card-trend">
                  <span :class="['trend', performanceData.conversionTrend > 0 ? 'up' : 'down']">
                    <el-icon><ArrowUp v-if="performanceData.conversionTrend > 0" /><ArrowDown v-else /></el-icon>
                    {{ Math.abs(performanceData.conversionTrend) }}%
                  </span>
                  <span class="trend-text">较上期</span>
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
        <!-- 销售趋势图 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>销售趋势</span>
                <el-radio-group v-model="salesChartType" size="small">
                  <el-radio-button label="daily">日</el-radio-button>
                  <el-radio-button label="weekly">周</el-radio-button>
                  <el-radio-button label="monthly">月</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div ref="salesChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 订单状态分布 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span>订单状态分布</span>
            </template>
            <div ref="orderStatusChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 客户等级分布 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span>客户等级分布</span>
            </template>
            <div ref="customerLevelChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 商品销售排行 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span>商品销售排行</span>
            </template>
            <div ref="productRankingChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 详细数据表格 -->
    <el-card class="data-table-card">
      <template #header>
        <div class="card-header">
          <span>详细数据</span>
          <el-tabs v-model="activeTab" @tab-change="handleTabChange">
            <el-tab-pane label="订单明细" name="orders"></el-tab-pane>
            <el-tab-pane label="客户明细" name="customers"></el-tab-pane>
            <el-tab-pane label="商品明细" name="products"></el-tab-pane>
          </el-tabs>
        </div>
      </template>

      <!-- 订单明细表格 -->
      <div v-show="activeTab === 'orders'">
        <el-table :data="orderDetails" style="width: 100%" v-loading="tableLoading">
          <el-table-column prop="orderNo" label="订单号" width="150" />
          <el-table-column prop="customerName" label="客户姓名" width="120" />
          <el-table-column prop="totalAmount" label="订单金额" width="120">
            <template #default="{ row }">
              <span class="amount">¥{{ row.totalAmount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="订单状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getOrderStatusType(row.status)" size="small">
                {{ getOrderStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="下单时间" width="180" />
          <el-table-column prop="commission" label="佣金" width="100">
            <template #default="{ row }">
              <span class="commission">¥{{ row.commission }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button @click="viewOrderDetail(row)" type="primary" link size="small">
                查看详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="orderPagination.currentPage"
            v-model:page-size="orderPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="orderPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleOrderSizeChange"
            @current-change="handleOrderCurrentChange"
          />
        </div>
      </div>

      <!-- 客户明细表格 -->
      <div v-show="activeTab === 'customers'">
        <el-table :data="customerDetails" style="width: 100%" v-loading="tableLoading">
          <el-table-column type="index" label="序号" width="60" :index="getCustomerIndex" />
          <el-table-column prop="code" label="客户编码" width="140">
            <template #default="{ row }">
              <span 
                class="code-link" 
                @click="navigateToCustomerDetail(row.code)"
                :title="row.code"
              >
                {{ row.code || 'N/A' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="客户姓名" width="120" />
          <el-table-column prop="phone" label="电话" width="140">
            <template #default="{ row }">
              {{ maskPhone(row.phone) }}
            </template>
          </el-table-column>
          <el-table-column prop="level" label="客户等级" width="100">
            <template #default="{ row }">
              <el-tag :type="getCustomerLevelType(row.level)" size="small">
                {{ getCustomerLevelText(row.level) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="orderCount" label="订单数" width="80" />
          <el-table-column prop="totalAmount" label="消费总额" width="120">
            <template #default="{ row }">
              <span class="amount">¥{{ row.totalAmount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="lastOrderTime" label="最后下单" width="180" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button @click="viewCustomerDetail(row)" type="primary" link size="small">
                查看详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="customerPagination.currentPage"
            v-model:page-size="customerPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="customerPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleCustomerSizeChange"
            @current-change="handleCustomerCurrentChange"
          />
        </div>
      </div>

      <!-- 商品明细表格 -->
      <div v-show="activeTab === 'products'">
        <el-table :data="productDetails" style="width: 100%" v-loading="tableLoading">
          <el-table-column prop="productName" label="商品名称" />
          <el-table-column prop="salesCount" label="销售数量" width="100" />
          <el-table-column prop="salesAmount" label="销售金额" width="120">
            <template #default="{ row }">
              <span class="amount">¥{{ row.salesAmount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="commission" label="佣金" width="100">
            <template #default="{ row }">
              <span class="commission">¥{{ row.commission }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="avgPrice" label="平均单价" width="100">
            <template #default="{ row }">
              <span>¥{{ row.avgPrice }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="lastSaleTime" label="最后销售" width="180" />
        </el-table>
        
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="productPagination.currentPage"
            v-model:page-size="productPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="productPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleProductSizeChange"
            @current-change="handleProductCurrentChange"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  Download, 
  Share,
  TrendCharts, 
  Document, 
  User, 
  Promotion,
  ArrowUp,
  ArrowDown
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { maskPhone } from '@/utils/phone'
import { usePerformanceStore } from '@/stores/performance'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { useProductStore } from '@/stores/product'
import { createSafeNavigator } from '@/utils/navigation'

// 接口定义
interface OrderDetail {
  id: string
  orderNumber: string
  customerName: string
  productName: string
  amount: number
  status: string
  createTime: string
}

interface CustomerDetail {
  id: string
  customerName: string
  phone: string
  level: string
  totalOrders: number
  totalAmount: number
  lastOrderTime: string
}

interface ProductDetail {
  id: string
  productName: string
  salesCount: number
  salesAmount: number
  commission: number
  avgPrice: number
  lastSaleTime: string
}

// 路由
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// Store
const performanceStore = usePerformanceStore()
const userStore = useUserStore()
const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const productStore = useProductStore()

// 响应式数据
const dateRange = ref<string[]>([])
const salesChartType = ref('daily')
const activeTab = ref('orders')
const tableLoading = ref(false)

// 图表引用
const salesChartRef = ref()
const orderStatusChartRef = ref()
const customerLevelChartRef = ref()
const productRankingChartRef = ref()

// 图表实例
let salesChart: echarts.ECharts | null = null
let orderStatusChart: echarts.ECharts | null = null
let customerLevelChart: echarts.ECharts | null = null
let productRankingChart: echarts.ECharts | null = null

// 业绩数据 - 从store获取
const performanceData = computed(() => {
  const data = performanceStore.personalPerformance
  return {
    totalSales: `¥${data.totalSales.toLocaleString()}`,
    salesTrend: data.salesTrend,
    totalOrders: data.totalOrders,
    ordersTrend: data.ordersTrend,
    newCustomers: data.newCustomers,
    customersTrend: data.customersTrend,
    conversionRate: data.conversionRate.toFixed(1),
    conversionTrend: data.conversionTrend
  }
})

// 表格数据
const orderDetails = ref<OrderDetail[]>([])
const customerDetails = ref<CustomerDetail[]>([])
const productDetails = ref<ProductDetail[]>([])

// 分页数据
const orderPagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const customerPagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const productPagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 方法定义
/**
 * 日期范围变化处理
 */
const handleDateChange = (value: [string, string] | null) => {
  console.log('日期范围变化:', value)
  performanceStore.updateDateRange(value)
  // 重新加载数据
  loadPerformanceData()
  loadTableData()
}

/**
 * 导出数据
 */
const exportData = () => {
  ElMessage.success('数据导出功能开发中...')
}

/**
 * 分享业绩
 */
const sharePerformance = () => {
  // 生成分享内容
  const shareContent = `
🎉 我的业绩报告 🎉

📊 总销售额：${performanceData.value.totalSales}
📈 订单数量：${performanceData.value.totalOrders}
👥 新增客户：${performanceData.value.newCustomers}
💯 转化率：${performanceData.value.conversionRate}%

时间范围：${dateRange.value?.[0] || '当前月份'} 至 ${dateRange.value?.[1] || '当前月份'}

#业绩分享 #销售成果 #CRM系统
  `.trim()

  // 检查是否支持Web Share API
  if (navigator.share) {
    navigator.share({
      title: '我的业绩报告',
      text: shareContent,
      url: window.location.href
    }).then(() => {
      ElMessage.success('分享成功')
    }).catch((error) => {
      console.log('分享失败:', error)
      fallbackShare(shareContent)
    })
  } else {
    fallbackShare(shareContent)
  }
}

/**
 * 备用分享方法（复制到剪贴板）
 */
const fallbackShare = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('业绩内容已复制到剪贴板，可以粘贴分享')
  } catch (error) {
    // 如果剪贴板API也不支持，显示分享内容
    ElMessage({
      message: '请手动复制以下内容进行分享',
      type: 'info',
      duration: 0,
      showClose: true
    })
    console.log('分享内容:', content)
  }
}

/**
 * 标签页切换
 */
const handleTabChange = (tabName: string) => {
  activeTab.value = tabName
  loadTableData()
}

/**
 * 获取订单状态类型
 */
const getOrderStatusType = (status: string) => {
  const typeMap = {
    pending: 'warning',
    paid: 'success',
    shipped: 'info',
    completed: 'success',
    cancelled: 'danger'
  }
  return typeMap[status] || ''
}

/**
 * 获取订单状态文本
 */
const getOrderStatusText = (status: string) => {
  const textMap = {
    pending: '待审核',
    paid: '已付款',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消'
  }
  return textMap[status] || status
}

/**
 * 获取客户等级类型
 */
const getCustomerLevelType = (level: string) => {
  const typeMap = {
    normal: '',
    silver: 'info',
    gold: 'warning',
    diamond: 'success'
  }
  return typeMap[level] || ''
}

/**
 * 获取客户等级文本
 */
const getCustomerLevelText = (level: string) => {
  const textMap = {
    normal: '普通客户',
    silver: '白银客户',
    gold: '黄金客户',
    diamond: '钻石客户'
  }
  return textMap[level] || level
}

/**
 * 查看订单详情
 */
const viewOrderDetail = (order: OrderDetail) => {
  safeNavigator.push(`/order/detail/${order.id}`)
}

/**
 * 查看客户详情
 */
const viewCustomerDetail = (customer: CustomerDetail) => {
  safeNavigator.push(`/customer/detail/${customer.id}`)
}

/**
 * 获取客户序号
 */
const getCustomerIndex = (index: number) => {
  return (customerPagination.currentPage - 1) * customerPagination.pageSize + index + 1
}

/**
 * 通过客户编码跳转到客户详情页面
 */
const navigateToCustomerDetail = (customerCode: string) => {
  safeNavigator.push({
    path: '/customer/detail',
    query: { code: customerCode }
  })
}

/**
 * 订单分页处理
 */
const handleOrderSizeChange = (size: number) => {
  orderPagination.pageSize = size
  loadTableData()
}

const handleOrderCurrentChange = (page: number) => {
  orderPagination.currentPage = page
  loadTableData()
}

/**
 * 客户分页处理
 */
const handleCustomerSizeChange = (size: number) => {
  customerPagination.pageSize = size
  loadTableData()
}

const handleCustomerCurrentChange = (page: number) => {
  customerPagination.currentPage = page
  loadTableData()
}

/**
 * 商品分页处理
 */
const handleProductSizeChange = (size: number) => {
  productPagination.pageSize = size
  loadTableData()
}

const handleProductCurrentChange = (page: number) => {
  productPagination.currentPage = page
  loadTableData()
}

/**
 * 获取销售趋势数据
 */
const getSalesTrendData = () => {
  const userStore = useUserStore()
  const orderStore = useOrderStore()
  const currentUserId = userStore.currentUser?.id
  
  if (!currentUserId) {
    return {
      months: ['1月', '2月', '3月', '4月', '5月', '6月'],
      salesAmounts: [0, 0, 0, 0, 0, 0],
      orderCounts: [0, 0, 0, 0, 0, 0]
    }
  }
  
  // 获取当前用户的订单
  const userOrders = orderStore.orders.filter(order => 
    order.salesPersonId === currentUserId && 
    order.auditStatus === 'approved'
  )
  
  // 按月份统计数据
  const monthlyData = new Map()
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  
  // 初始化最近6个月的数据
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentYear, currentDate.getMonth() - i, 1)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = `${date.getMonth() + 1}月`
    monthlyData.set(monthKey, {
      label: monthLabel,
      salesAmount: 0,
      orderCount: 0
    })
  }
  
  // 统计订单数据
  userOrders.forEach(order => {
    const orderDate = new Date(order.createTime)
    const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
    
    if (monthlyData.has(monthKey)) {
      const data = monthlyData.get(monthKey)
      data.salesAmount += order.totalAmount
      data.orderCount += 1
    }
  })
  
  const months = []
  const salesAmounts = []
  const orderCounts = []
  
  monthlyData.forEach(data => {
    months.push(data.label)
    salesAmounts.push(Math.round(data.salesAmount / 10000 * 100) / 100) // 转换为万元，保留2位小数
    orderCounts.push(data.orderCount)
  })
  
  return { months, salesAmounts, orderCounts }
}

/**
 * 初始化销售趋势图
 */
const initSalesChart = () => {
  if (!salesChartRef.value) return
  
  salesChart = echarts.init(salesChartRef.value)
  
  // 获取真实的销售趋势数据
  const salesTrendData = getSalesTrendData()
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['销售额', '订单数']
    },
    xAxis: {
      type: 'category',
      data: salesTrendData.months
    },
    yAxis: [
      {
        type: 'value',
        name: '销售额(万元)',
        position: 'left'
      },
      {
        type: 'value',
        name: '订单数',
        position: 'right'
      }
    ],
    series: [
      {
        name: '销售额',
        type: 'line',
        data: salesTrendData.salesAmounts,
        smooth: true,
        itemStyle: {
          color: '#409EFF'
        }
      },
      {
        name: '订单数',
        type: 'bar',
        yAxisIndex: 1,
        data: salesTrendData.orderCounts,
        itemStyle: {
          color: '#67C23A'
        }
      }
    ]
  }
  
  salesChart.setOption(option)
}

/**
 * 获取订单状态分布数据
 */
const getOrderStatusData = () => {
  const userStore = useUserStore()
  const orderStore = useOrderStore()
  const currentUserId = userStore.currentUser?.id
  
  if (!currentUserId) {
    return []
  }
  
  // 获取当前用户的订单
  const userOrders = orderStore.orders.filter(order => 
    order.salesPersonId === currentUserId && 
    order.auditStatus === 'approved'
  )
  
  // 统计各状态的订单数量
  const statusMap = new Map()
  const statusNames = {
    'pending': '待审核',
    'paid': '已付款', 
    'shipped': '已发货',
    'completed': '已完成',
    'cancelled': '已取消',
    'signed': '已签收'
  }
  
  userOrders.forEach(order => {
    const statusName = statusNames[order.status] || order.status
    if (statusMap.has(statusName)) {
      statusMap.set(statusName, statusMap.get(statusName) + 1)
    } else {
      statusMap.set(statusName, 1)
    }
  })
  
  // 转换为图表数据格式
  const data = []
  statusMap.forEach((value, name) => {
    data.push({ value, name })
  })
  
  return data
}

/**
 * 初始化订单状态分布图
 */
const initOrderStatusChart = () => {
  if (!orderStatusChartRef.value) return
  
  orderStatusChart = echarts.init(orderStatusChartRef.value)
  
  // 获取真实的订单状态分布数据
  const statusData = getOrderStatusData()
  
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
        name: '订单状态',
        type: 'pie',
        radius: '50%',
        data: statusData,
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
  
  orderStatusChart.setOption(option)
}

/**
 * 获取客户等级分布数据
 */
const getCustomerLevelData = () => {
  const userStore = useUserStore()
  const customerStore = useCustomerStore()
  const currentUserId = userStore.currentUser?.id
  
  if (!currentUserId) {
    return []
  }
  
  // 获取当前用户的客户
  const userCustomers = customerStore.customers.filter(customer => 
    customer.salesPersonId === currentUserId
  )
  
  // 统计各等级的客户数量
  const levelMap = new Map()
  const levelNames = {
    'normal': '普通客户',
    'silver': '白银客户',
    'gold': '黄金客户',
    'diamond': '钻石客户'
  }
  
  userCustomers.forEach(customer => {
    const level = customer.level || 'normal'
    const levelName = levelNames[level] || level
    if (levelMap.has(levelName)) {
      levelMap.set(levelName, levelMap.get(levelName) + 1)
    } else {
      levelMap.set(levelName, 1)
    }
  })
  
  // 转换为图表数据格式
  const data = []
  levelMap.forEach((value, name) => {
    data.push({ value, name })
  })
  
  return data
}

/**
 * 初始化客户等级分布图
 */
const initCustomerLevelChart = () => {
  if (!customerLevelChartRef.value) return
  
  customerLevelChart = echarts.init(customerLevelChartRef.value)
  
  // 获取真实的客户等级分布数据
  const levelData = getCustomerLevelData()
  
  const option = {
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        name: '客户等级',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: levelData
      }
    ]
  }
  
  customerLevelChart.setOption(option)
}

/**
 * 获取商品销售排行数据
 */
const getProductSalesData = () => {
  const userStore = useUserStore()
  const orderStore = useOrderStore()
  const productStore = useProductStore()
  const currentUserId = userStore.currentUser?.id
  
  if (!currentUserId) {
    return {
      names: ['暂无数据'],
      values: [0]
    }
  }
  
  // 获取当前用户的订单
  const userOrders = orderStore.orders.filter(order => 
    order.salesPersonId === currentUserId && 
    order.auditStatus === 'approved'
  )
  
  // 统计商品销售数据
  const productSalesMap = new Map()
  
  userOrders.forEach(order => {
    order.items?.forEach(item => {
      const productId = item.productId
      const product = productStore.products.find(p => p.id === productId)
      
      if (product) {
        if (productSalesMap.has(productId)) {
          productSalesMap.set(productId, {
            name: product.name,
            value: productSalesMap.get(productId).value + item.totalPrice
          })
        } else {
          productSalesMap.set(productId, {
            name: product.name,
            value: item.totalPrice
          })
        }
      }
    })
  })
  
  // 转换为数组并排序
  const salesArray = Array.from(productSalesMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5) // 取前5名
  
  return {
    names: salesArray.map(item => item.name),
    values: salesArray.map(item => Math.round(item.value / 100) / 100) // 转换为万元
  }
}

/**
 * 初始化商品销售排行图
 */
const initProductRankingChart = () => {
  if (!productRankingChartRef.value) return
  
  productRankingChart = echarts.init(productRankingChartRef.value)
  
  // 获取真实的商品销售排行数据
  const salesData = getProductSalesData()
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: salesData.names
    },
    series: [
      {
        name: '销售额',
        type: 'bar',
        data: salesData.values,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ])
        }
      }
    ]
  }
  
  productRankingChart.setOption(option)
}

/**
 * 加载业绩数据
 */
const loadPerformanceData = async () => {
  try {
    // 获取个人业绩分析数据
    const params = {
      startDate: dateRange.value?.[0] ? `${dateRange.value[0]}-01` : undefined,
      endDate: dateRange.value?.[1] ? `${dateRange.value[1]}-31` : undefined
    }
    
    await performanceStore.getPersonalAnalysisData(params)
    
    // 刷新业绩数据
    await performanceStore.refreshPerformanceData()
    
    console.log('业绩数据加载完成')
  } catch (error) {
    console.error('加载业绩数据失败:', error)
    ElMessage.error('加载业绩数据失败')
  }
}

/**
 * 加载表格数据
 */
const loadTableData = async () => {
  tableLoading.value = true
  
  try {
    if (activeTab.value === 'orders') {
      // 从orderStore获取当前用户的订单数据
      const currentUserId = userStore.currentUser?.id
      
      if (currentUserId) {
        const userOrders = orderStore.orders.filter(order => 
          order.salesPersonId === currentUserId && 
          order.auditStatus === 'approved'
        )
        
        // 分页处理
        const startIndex = (orderPagination.currentPage - 1) * orderPagination.pageSize
        const endIndex = startIndex + orderPagination.pageSize
        const paginatedOrders = userOrders.slice(startIndex, endIndex)
        
        orderDetails.value = paginatedOrders.map(order => ({
          id: order.id,
          orderNo: order.orderNumber,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          status: order.status,
          createTime: order.createTime,
          commission: order.totalAmount * 0.1 // 10%佣金率
        }))
        
        orderPagination.total = userOrders.length
      } else {
        orderDetails.value = []
        orderPagination.total = 0
      }
    } else if (activeTab.value === 'customers') {
      // 从customerStore获取当前用户的客户数据
      const currentUserId = userStore.currentUser?.id
      
      if (currentUserId) {
        const userCustomers = customerStore.customers.filter(customer => 
          customer.salesPersonId === currentUserId
        )
        
        // 分页处理
        const startIndex = (customerPagination.currentPage - 1) * customerPagination.pageSize
        const endIndex = startIndex + customerPagination.pageSize
        const paginatedCustomers = userCustomers.slice(startIndex, endIndex)
        
        customerDetails.value = paginatedCustomers.map(customer => {
          // 计算客户的订单统计
          const customerOrders = orderStore.orders.filter(order => 
            order.customerId === customer.id && order.auditStatus === 'approved'
          )
          const totalAmount = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0)
          const lastOrder = customerOrders.sort((a, b) => 
            new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
          )[0]
          
          return {
            id: customer.id,
            code: customer.code,
            name: customer.name,
            phone: customer.phone,
            level: customer.level || 'normal',
            orderCount: customerOrders.length,
            totalAmount,
            lastOrderTime: lastOrder?.createTime || '暂无订单'
          }
        })
        
        customerPagination.total = userCustomers.length
      } else {
        customerDetails.value = []
        customerPagination.total = 0
      }
    } else if (activeTab.value === 'products') {
      // 从productStore和orderStore获取商品销售数据
      const currentUserId = userStore.currentUser?.id
      
      if (currentUserId) {
        const userOrders = orderStore.orders.filter(order => 
          order.salesPersonId === currentUserId && 
          order.auditStatus === 'approved'
        )
        
        // 统计商品销售数据
        const productSalesMap = new Map()
        
        userOrders.forEach(order => {
          order.items?.forEach(item => {
            const productId = item.productId
            const product = productStore.products.find(p => p.id === productId)
            
            if (product && productSalesMap.has(productId)) {
              const existing = productSalesMap.get(productId)
              existing.salesCount += item.quantity
              existing.salesAmount += item.totalPrice
              existing.lastSaleTime = order.createTime > existing.lastSaleTime ? order.createTime : existing.lastSaleTime
            } else if (product) {
              productSalesMap.set(productId, {
                id: productId,
                productName: product.name,
                salesCount: item.quantity,
                salesAmount: item.totalPrice,
                commission: item.totalPrice * 0.1,
                avgPrice: item.price,
                lastSaleTime: order.createTime
              })
            }
          })
        })
        
        const productSalesArray = Array.from(productSalesMap.values())
        
        // 分页处理
        const startIndex = (productPagination.currentPage - 1) * productPagination.pageSize
        const endIndex = startIndex + productPagination.pageSize
        productDetails.value = productSalesArray.slice(startIndex, endIndex)
        productPagination.total = productSalesArray.length
      } else {
        productDetails.value = []
        productPagination.total = 0
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    tableLoading.value = false
  }
}

/**
 * 初始化所有图表
 */
const initAllCharts = () => {
  nextTick(() => {
    initSalesChart()
    initOrderStatusChart()
    initCustomerLevelChart()
    initProductRankingChart()
  })
}

/**
 * 窗口大小变化时重新调整图表
 */
const handleResize = () => {
  salesChart?.resize()
  orderStatusChart?.resize()
  customerLevelChart?.resize()
  productRankingChart?.resize()
}

// 监听销售图表类型变化
watch(salesChartType, () => {
  // 重新加载销售图表数据
  initSalesChart()
})

// 监听数据变化，实时更新图表
watch(() => [
  orderStore.orders,
  customerStore.customers,
  productStore.products,
  performanceStore.performanceData
], () => {
  // 重新加载数据和图表
  loadPerformanceData()
  loadTableData()
  initAllCharts()
}, { deep: true })

// 监听日期范围变化
watch(dateRange, () => {
  handleDateChange()
})

// 生命周期钩子
onMounted(() => {
  // 设置默认日期范围为当前月份
  const currentDate = new Date()
  const currentMonth = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0')
  dateRange.value = [currentMonth, currentMonth]
  
  // 加载数据
  loadPerformanceData()
  loadTableData()
  
  // 初始化图表
  initAllCharts()
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
  
  // 监听物流状态更新事件
  window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate)
  window.addEventListener('todoStatusUpdated', handleTodoStatusUpdate)
  
  // 添加数据同步事件监听
  window.addEventListener('dataSync', handleDataSync)
  window.addEventListener('performanceDataUpdate', handlePerformanceDataUpdate)
  
  // 启动数据同步监听
  performanceStore.syncPerformanceData()
})

// 处理订单状态更新事件
const handleOrderStatusUpdate = (event: CustomEvent) => {
  console.log('订单状态已更新，刷新个人业绩数据', event.detail)
  loadPerformanceData()
  loadTableData()
  ElMessage.success('个人业绩数据已同步更新')
}

// 处理待办状态更新事件
const handleTodoStatusUpdate = (event: CustomEvent) => {
  console.log('待办状态已更新，刷新个人业绩数据', event.detail)
  loadPerformanceData()
  loadTableData()
  ElMessage.success('个人业绩数据已同步更新')
}

/**
 * 处理数据同步事件
 */
const handleDataSync = () => {
  // 重新加载所有数据
  loadPerformanceData()
  loadTableData()
  initAllCharts()
}

/**
 * 处理业绩数据更新事件
 */
const handlePerformanceDataUpdate = () => {
  // 重新加载业绩数据和图表
  loadPerformanceData()
  initAllCharts()
}

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate)
  window.removeEventListener('todoStatusUpdated', handleTodoStatusUpdate)
  window.removeEventListener('dataSync', handleDataSync)
  window.removeEventListener('performanceDataUpdate', handlePerformanceDataUpdate)
  salesChart?.dispose()
  orderStatusChart?.dispose()
  customerLevelChart?.dispose()
  productRankingChart?.dispose()
})
</script>

<style scoped>
.personal-performance {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.performance-overview {
  margin-bottom: 20px;
}

.overview-card {
  height: 120px;
}

.card-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.card-icon {
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

.card-icon.sales {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card-icon.orders {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.card-icon.customers {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.card-icon.conversion {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.card-info {
  flex: 1;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.card-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trend {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 500;
}

.trend.up {
  color: #67c23a;
}

.trend.down {
  color: #f56c6c;
}

.trend-text {
  font-size: 12px;
  color: #909399;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 320px;
  width: 100%;
}

.data-table-card .card-header {
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
}

.data-table-card .card-header span {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.amount {
  color: #f56c6c;
  font-weight: 500;
}

.code-link {
  color: #409eff;
  cursor: pointer;
  padding: 2px 6px;
  border: 1px solid transparent;
  background: #f0f9ff;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  transition: all 0.3s ease;
}

.code-link:hover {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.code-link:active {
  transform: translateY(1px);
}

.commission {
  color: #67c23a;
  font-weight: 500;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .performance-overview .el-col {
    margin-bottom: 16px;
  }
  
  .charts-section .el-col {
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .card-content {
    flex-direction: column;
    text-align: center;
  }

  .card-icon {
    margin-right: 0;
    margin-bottom: 12px;
  }

  .chart-card {
    height: 300px;
  }

  .chart-container {
    height: 220px;
  }
}
</style>