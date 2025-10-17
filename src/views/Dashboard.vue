<template>
  <div class="dashboard">
    <!-- 核心指标卡片 -->
    <div class="metrics-grid">
      <el-card class="metric-card" v-for="metric in metrics" :key="metric.key" v-loading="loading">
        <div class="metric-content">
          <div class="metric-icon" :style="{ background: metric.gradient || metric.color }">
            <el-icon :size="24">
              <component :is="metric.icon" />
            </el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ metric.value }}</div>
            <div class="metric-label">{{ metric.label }}</div>
            <div class="metric-change" :class="metric.trend">
              <el-icon :size="12">
                <ArrowUp v-if="metric.trend === 'up'" />
                <ArrowDown v-if="metric.trend === 'down'" />
                <Minus v-if="metric.trend === 'stable'" />
              </el-icon>
              <span>{{ metric.change }}</span>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 图表区域 -->
    <div class="charts-grid">
      <!-- 业绩趋势图 -->
      <el-card class="chart-card">
        <template #header>
          <div class="chart-header">
            <span class="chart-title">业绩趋势</span>
            <div class="chart-controls">
              <el-radio-group v-model="performancePeriod" size="small">
                <el-radio-button label="day">日</el-radio-button>
                <el-radio-button label="week">周</el-radio-button>
                <el-radio-button label="month">月</el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </template>
        <div class="chart-container">
          <v-chart 
            v-if="performanceChartData.xAxisData.length > 0" 
            :option="performanceChartOption" 
            autoresize 
          />
          <div v-else class="empty-chart">
            <el-empty description="暂无业绩数据" />
          </div>
        </div>
      </el-card>

      <!-- 订单状态分布 -->
      <el-card class="chart-card">
        <template #header>
          <span class="chart-title">订单状态分布</span>
        </template>
        <div class="chart-container">
          <v-chart 
            v-if="orderStatusChartData.length > 0" 
            :option="orderStatusChartOption" 
            autoresize 
          />
          <div v-else class="empty-chart">
            <el-empty description="暂无订单数据" />
          </div>
        </div>
      </el-card>
    </div>

    <!-- 排名和待办事项 -->
    <div class="bottom-grid">
      <!-- 业绩排名 -->
      <el-card class="ranking-card" v-loading="loading">
        <template #header>
          <div class="chart-header">
            <span class="chart-title">{{ getRankingTitle() }}</span>
            <el-button type="text" size="small" @click="handleViewMoreRankings">查看更多</el-button>
          </div>
        </template>
        <div class="ranking-list">
          <div 
            class="ranking-item" 
            v-for="(item, index) in rankings.sales" 
            :key="item.id"
          >
            <div class="ranking-position">
              <el-tag 
                :type="index < 3 ? 'warning' : 'info'" 
                size="small"
                effect="plain"
              >
                {{ index + 1 }}
              </el-tag>
            </div>
            <el-avatar :size="32" :src="item.avatar" />
            <div class="ranking-info">
              <div class="ranking-name">{{ item.name }}</div>
              <div class="ranking-change" :class="item.trend">
                <el-icon :size="12">
                  <ArrowUp v-if="item.trend === 'up'" />
                  <ArrowDown v-if="item.trend === 'down'" />
                </el-icon>
                <span>{{ item.change }}</span>
              </div>
            </div>
            <div class="ranking-performance">
              <div class="performance-value">¥{{ item.revenue.toLocaleString() }}</div>
              <div class="performance-orders">{{ item.orders }}单</div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 快捷操作 -->
      <el-card class="quick-actions-card">
        <template #header>
          <span class="chart-title">快捷操作</span>
        </template>
        <div class="quick-actions">
          <div 
            class="action-item" 
            v-for="action in quickActions" 
            :key="action.key"
            @click="handleQuickAction(action)"
          >
            <div class="action-icon" :style="{ background: action.gradient || action.color }">
              <el-icon :size="20">
                <component :is="action.icon" />
              </el-icon>
            </div>
            <div class="action-label">{{ action.label }}</div>
          </div>
        </div>
      </el-card>

      <!-- 消息提醒 -->
      <el-card class="message-card">
        <template #header>
          <div class="chart-header">
            <span class="chart-title">消息提醒</span>
            <el-badge :value="unreadCount > 99 ? '99+' : unreadCount" :hidden="unreadCount === 0">
              <el-button type="text" size="small" @click="showMessageDialog = true">
                查看全部
              </el-button>
            </el-badge>
          </div>
        </template>
        <div class="message-list">
          <div class="message-item" v-for="message in recentMessages" :key="message.id" @click="handleMessageClick(message)">
            <div class="message-icon" :style="{ backgroundColor: message.color }">
              <el-icon :size="16">
                <component :is="message.icon" />
              </el-icon>
            </div>
            <div class="message-content">
              <div class="message-title">{{ message.title }}</div>
              <div class="message-time">{{ message.time }}</div>
            </div>
            <el-badge :is-dot="!message.read" class="message-badge" />
          </div>
        </div>
      </el-card>
    </div>

    <!-- 消息弹窗 -->
    <el-dialog
      v-model="showMessageDialog"
      title="系统消息"
      width="600px"
      :before-close="handleCloseMessageDialog"
    >
      <div class="message-dialog">
        <div class="message-dialog-header">
          <el-button type="primary" size="small" @click="markAllAsRead" :disabled="unreadCount === 0">
            全部已读
          </el-button>
          <el-button type="danger" size="small" @click="clearAllMessages">
            清空消息
          </el-button>
        </div>
        
        <div class="message-dialog-list">
          <div 
            class="message-dialog-item" 
            v-for="message in messages" 
            :key="message.id"
            :class="{ 'unread': !message.read }"
            @click="handleMessageDetailClick(message)"
          >
            <div class="message-dialog-icon" :style="{ backgroundColor: message.color }">
              <el-icon :size="18">
                <component :is="message.icon" />
              </el-icon>
            </div>
            <div class="message-dialog-content">
              <div class="message-dialog-title">{{ message.title }}</div>
              <div class="message-dialog-desc">{{ message.content }}</div>
              <div class="message-dialog-time">{{ message.time }}</div>
            </div>
            <div class="message-dialog-actions">
              <el-badge :is-dot="!message.read" />
              <el-button 
                type="text" 
                size="small" 
                @click.stop="markAsRead(message)"
                v-if="!message.read"
              >
                标记已读
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 消息详情弹窗 -->
    <el-dialog
      v-model="showMessageDetailDialog"
      :title="selectedMessage?.title"
      width="500px"
    >
      <div class="message-detail" v-if="selectedMessage">
        <div class="message-detail-content">
          <p>{{ selectedMessage.content }}</p>
          <div class="message-detail-info">
            <span>时间：{{ selectedMessage.time }}</span>
            <span>类型：{{ selectedMessage.type }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showMessageDetailDialog = false">关闭</el-button>
        <el-button 
          type="primary" 
          @click="markAsReadAndClose"
          v-if="selectedMessage && !selectedMessage.read"
        >
          标记已读
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import { ElMessage } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { dashboardApi, type DashboardTodo, type DashboardQuickAction } from '@/api/dashboard'
import { messageApi } from '@/api/message'

// 定义组件名称
defineOptions({
  name: 'DashboardView'
})

// 类型别名
type TodoItem = DashboardTodo
type QuickAction = DashboardQuickAction

interface Message {
  id: string
  title: string
  content: string
  time: string
  type: string
  read: boolean
  icon: string
  color: string
}

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 使用 stores
const userStore = useUserStore()
const notificationStore = useNotificationStore()

// 响应式数据
const performancePeriod = ref('day')

// 消息提醒相关数据
const showMessageDialog = ref(false)
const showMessageDetailDialog = ref(false)
const selectedMessage = ref(null)

// 系统消息数据 - 使用新的消息服务
const messages = computed(() => notificationStore.messages)

// 计算属性 - 使用新的消息服务
const unreadCount = computed(() => notificationStore.unreadCount)

const recentMessages = computed(() => notificationStore.recentMessages.slice(0, 5))

// 核心指标数据 - 根据用户权限动态生成标签
const getMetricLabels = () => {
  const user = userStore.currentUser
  if (!user) return {}
  
  const isAdmin = user.role === 'super_admin' || user.role === 'admin'
  const isDeptManager = user.role === 'department_manager' || user.role === 'manager'
  
  if (isAdmin) {
    return {
      orders: '今日订单（全部）',
      customers: '新增客户（全部）',
      revenue: '今日业绩（全部）',
      monthlyOrders: '本月单数（全部）',
      monthlyRevenue: '本月业绩（全部）',
      service: '待处理售后（全部）'
    }
  } else if (isDeptManager) {
    return {
      orders: '今日订单（部门）',
      customers: '新增客户（部门）',
      revenue: '今日业绩（部门）',
      monthlyOrders: '本月单数（部门）',
      monthlyRevenue: '本月业绩（部门）',
      service: '待处理售后（部门）'
    }
  } else {
    return {
      orders: '今日订单（个人）',
      customers: '新增客户（个人）',
      revenue: '今日业绩（个人）',
      monthlyOrders: '本月单数（个人）',
      monthlyRevenue: '本月业绩（个人）',
      service: '待处理售后（个人）'
    }
  }
}

// 获取排行榜标题
const getRankingTitle = () => {
  const user = userStore.currentUser
  if (!user) return '本月业绩排名'
  
  const isAdmin = user.role === 'super_admin' || user.role === 'admin'
  const isDeptManager = user.role === 'department_manager' || user.role === 'manager'
  
  if (isAdmin) {
    return '本月业绩排名（全部）'
  } else if (isDeptManager) {
    return '本月业绩排名（部门）'
  } else {
    return '本月业绩排名（个人）'
  }
}

// 核心指标数据 - 使用API动态获取
const metrics = ref([
  {
    key: 'orders',
    label: '今日订单',
    value: '0',
    change: '+0%',
    trend: 'up',
    icon: 'ShoppingCart',
    color: '#409EFF'
  },
  {
    key: 'customers',
    label: '新增客户',
    value: '0',
    change: '+0%',
    trend: 'up',
    icon: 'User',
    color: '#67C23A'
  },
  {
    key: 'revenue',
    label: '今日业绩',
    value: '¥0',
    change: '+0%',
    trend: 'up',
    icon: 'TrendCharts',
    color: '#E6A23C'
  },
  {
    key: 'monthly-orders',
    label: '本月单数',
    value: '0',
    change: '+0%',
    trend: 'up',
    icon: 'DataBoard',
    color: '#722ED1'
  },
  {
    key: 'monthly-revenue',
    label: '本月业绩',
    value: '¥0',
    change: '+0%',
    trend: 'up',
    icon: 'Coin',
    color: '#13C2C2'
  },
  {
    key: 'service',
    label: '待处理售后',
    value: '0',
    change: '+0%',
    trend: 'up',
    icon: 'CustomerService',
    color: '#F56C6C',
    gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)'
  },
  {
    key: 'audit',
    label: '待审核订单',
    value: '0',
    change: '+0%',
    trend: 'up',
    icon: 'DocumentChecked',
    color: '#909399'
  },
  {
    key: 'logistics',
    label: '待发货订单',
    value: '0',
    change: '+0%',
    trend: 'up',
    icon: 'Van',
    color: '#9C27B0'
  }
])

// 加载状态
const loading = ref(false)

// 业绩排名数据 - 使用API动态获取
const rankings = ref({
  sales: [],
  products: []
})

// 待办事项数据 - 从API获取
const todos = ref<TodoItem[]>([])

// 快捷操作数据 - 从API获取
const quickActions = ref<QuickAction[]>([])

// 业绩趋势图表数据
const performanceChartData = ref({
  xAxisData: [],
  orderData: [],
  signData: [],
  title: '业绩趋势'
})

// 业绩趋势图配置
const performanceChartOption = computed(() => {

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: function(params: Array<{axisValue: string, value: number, marker: string, seriesName: string}>) {
        let result = `${params[0].axisValue}<br/>`
        params.forEach((param) => {
          const value = performancePeriod.value === 'day' ? `${param.value}单` : `¥${param.value.toLocaleString()}`
          result += `${param.marker}${param.seriesName}: ${value}<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['下单业绩', '签收业绩']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: performanceChartData.value.xAxisData,
      axisLabel: {
        rotate: performancePeriod.value === 'day' ? 45 : 0
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: performancePeriod.value === 'day' ? '{value}单' : '¥{value}'
      }
    },
    series: [
      {
        name: '下单业绩',
        type: 'line',
        data: performanceChartData.value.orderData,
        smooth: true,
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0, color: 'rgba(64, 158, 255, 0.3)'
            }, {
              offset: 1, color: 'rgba(64, 158, 255, 0.1)'
            }]
          }
        }
      },
      {
        name: '签收业绩',
        type: 'line',
        data: performanceChartData.value.signData,
        smooth: true,
        itemStyle: {
          color: '#67C23A'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0, color: 'rgba(103, 194, 58, 0.3)'
            }, {
              offset: 1, color: 'rgba(103, 194, 58, 0.1)'
            }]
          }
        }
      }
    ]
  }
})

// 订单状态分布图数据
const orderStatusChartData = ref([])

// 订单状态分布图配置
const orderStatusChartOption = computed(() => ({
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
      data: orderStatusChartData.value
    }
  ]
}))

// 获取订单状态对应的颜色
const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    '已签收': '#67C23A',
    '待发货': '#409EFF', 
    '运输中': '#E6A23C',
    '待审核': '#909399',
    '已取消': '#F56C6C',
    'delivered': '#67C23A',
    'pending_shipment': '#409EFF',
    'in_transit': '#E6A23C', 
    'pending_audit': '#909399',
    'cancelled': '#F56C6C'
  }
  return colorMap[status] || '#909399'
}

// 方法
const handleQuickAction = (action: QuickAction) => {
  safeNavigator.push(action.route)
}

const handleViewMoreRankings = () => {
  safeNavigator.push('/performance/team')
}

// 消息处理方法
const handleMessageClick = (message: Message) => {
  selectedMessage.value = message
  showMessageDetailDialog.value = true
}

const handleMessageDetailClick = (message: Message) => {
  selectedMessage.value = message
  showMessageDetailDialog.value = true
}

const markAsRead = async (message: Message) => {
  try {
    // 调用API标记消息为已读
    const response = await messageApi.markMessageAsRead(message.id)
    if (response.success) {
      // API调用成功后，更新本地store
      notificationStore.markAsRead(message.id)
    } else {
      ElMessage.error('标记消息失败')
    }
  } catch (error) {
    console.error('标记消息为已读失败:', error)
    ElMessage.error('标记消息失败，请稍后重试')
  }
}

const markAsReadAndClose = () => {
  if (selectedMessage.value) {
    notificationStore.markAsRead(selectedMessage.value.id)
  }
  showMessageDetailDialog.value = false
}
// 标记所有消息为已读
const markAllAsRead = async () => {
  try {
    // 调用API标记所有消息为已读
    const response = await messageApi.markAllMessagesAsRead()
    if (response.success) {
      // API调用成功后，更新本地store
      notificationStore.markAllAsRead()
      ElMessage.success('所有消息已标记为已读')
    } else {
      ElMessage.error('标记消息失败')
    }
  } catch (error) {
    console.error('标记所有消息为已读失败:', error)
    ElMessage.error('标记消息失败，请稍后重试')
  }
}

const clearAllMessages = () => {
  notificationStore.clearAllMessages()
  showMessageDialog.value = false
}

const handleCloseMessageDialog = () => {
  showMessageDialog.value = false
}

// 获取用户权限参数
const getUserPermissionParams = () => {
  const user = userStore.currentUser
  if (!user) return {}
  
  // 根据用户角色设置数据访问范围
  const params: any = {
    userRole: user.role,
    userId: user.id,
    departmentId: user.departmentId || user.department
  }
  
  // 根据角色设置数据范围
  switch (user.role) {
    case 'super_admin':
    case 'admin':
      // 超级管理员可以看到所有数据
      params.dataScope = 'all'
      break
    case 'department_manager':
    case 'manager':
      // 部门管理员只能看到本部门数据
      params.dataScope = 'department'
      params.departmentId = user.departmentId || user.department
      break
    case 'sales_staff':
    case 'customer_service':
    default:
      // 普通员工只能看到个人数据
      params.dataScope = 'personal'
      params.userId = user.id
      break
  }
  
  return params
}

// 数据加载函数
const loadDashboardData = async () => {
  try {
    loading.value = true
    
    // 获取权限参数
    const permissionParams = getUserPermissionParams()
    const chartParams = { ...permissionParams, period: performancePeriod.value }
    
    // 并行加载所有数据
    const [metricsData, rankingsData, chartData] = await Promise.all([
      dashboardApi.getMetrics(permissionParams),
      dashboardApi.getRankings(),
      dashboardApi.getChartData(chartParams)
    ])
    
    // 单独加载待办事项和快捷操作
    const [todosData, quickActionsData] = await Promise.all([
      dashboardApi.getTodos(),
      dashboardApi.getQuickActions()
    ])
    
    // 更新核心指标
    if (metricsData) {
      // 根据用户权限更新标签
      const labels = getMetricLabels()
      
      metrics.value[0].value = metricsData.todayOrders.toString()
      metrics.value[0].label = labels.orders || '今日订单'
      
      metrics.value[1].value = metricsData.newCustomers.toString()
      metrics.value[1].label = labels.customers || '新增客户'
      
      metrics.value[2].value = `¥${metricsData.todayRevenue.toLocaleString()}`
      metrics.value[2].label = labels.revenue || '今日业绩'
      
      metrics.value[3].value = metricsData.monthlyOrders.toString()
      metrics.value[3].label = labels.monthlyOrders || '本月单数'
      
      if (metrics.value[4]) {
        metrics.value[4].value = `¥${metricsData.monthlyRevenue?.toLocaleString() || '0'}`
        metrics.value[4].label = labels.monthlyRevenue || '本月业绩'
      }
      
      if (metrics.value[5] && metricsData.pendingService !== undefined) {
        metrics.value[5].value = metricsData.pendingService.toString()
        metrics.value[5].label = labels.service || '待处理售后'
      }
    }
    
    // 更新排行榜数据
    if (rankingsData) {
      rankings.value = rankingsData
    }
    
    // 更新图表数据
    if (chartData) {
      // 更新业绩趋势图表
      if (chartData.revenue && chartData.revenue.length > 0) {
        performanceChartData.value = {
          xAxisData: chartData.revenue.map(item => item.date),
          orderData: chartData.revenue.map(item => item.amount),
          signData: chartData.revenue.map(item => item.orders),
          title: getPerformanceTitle()
        }
      } else {
        // 空数据状态
        performanceChartData.value = {
          xAxisData: [],
          orderData: [],
          signData: [],
          title: getPerformanceTitle()
        }
      }
      
      // 更新订单状态分布图表
      if (chartData.orderStatus && chartData.orderStatus.length > 0) {
        orderStatusChartData.value = chartData.orderStatus.map(item => ({
          value: item.count,
          name: item.status,
          itemStyle: { 
            color: getStatusColor(item.status)
          }
        }))
      } else {
        // 空数据状态
        orderStatusChartData.value = []
      }
    }
    
    // 更新待办事项
    if (todosData && Array.isArray(todosData)) {
      // 根据用户角色过滤待办事项
      const userRole = userStore.currentUser?.role || 'sales_staff'
      const filteredTodos = todosData.filter(todo => {
        if (userRole === 'super_admin') return true
        if (userRole === 'department_manager') return todo.type !== 'system'
        return todo.type === 'order' || todo.type === 'customer'
      })
      todos.value = filteredTodos
    }
    
    // 更新快捷操作
    if (quickActionsData && Array.isArray(quickActionsData)) {
      quickActions.value = quickActionsData
    }
    
    // 加载系统消息 - 从API获取真实数据
    try {
      const messagesResponse = await notificationStore.loadMessagesFromAPI(permissionParams)
      if (messagesResponse && messagesResponse.length > 0) {
        // 消息已经在store中处理，这里不需要额外操作
        console.log('系统消息加载成功:', messagesResponse.length, '条消息')
      }
    } catch (messageError) {
      console.warn('加载系统消息失败:', messageError)
      // 消息加载失败不影响其他数据的显示
    }
    
  } catch (error) {
    console.error('加载仪表板数据失败:', error)
    ElMessage.error('加载数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 获取业绩图表标题
const getPerformanceTitle = () => {
  switch (performancePeriod.value) {
    case 'day':
      return '今日不同时段成交趋势'
    case 'week':
      return '最近7天成交趋势'
    case 'month':
      return '本月成交趋势'
    default:
      return '业绩趋势'
  }
}

// 监听时间段变化，重新加载图表数据
watch(performancePeriod, async () => {
  try {
    loading.value = true
    const permissionParams = getUserPermissionParams()
    const chartParams = { ...permissionParams, period: performancePeriod.value }
    
    const chartData = await dashboardApi.getChartData(chartParams)
    
    if (chartData) {
      // 更新业绩趋势图表
      if (chartData.revenue && chartData.revenue.length > 0) {
        performanceChartData.value = {
          xAxisData: chartData.revenue.map(item => item.date),
          orderData: chartData.revenue.map(item => item.amount),
          signData: chartData.revenue.map(item => item.orders),
          title: getPerformanceTitle()
        }
      } else {
        performanceChartData.value = {
          xAxisData: [],
          orderData: [],
          signData: [],
          title: getPerformanceTitle()
        }
      }
      
      // 更新订单状态分布图表
      if (chartData.orderStatus && chartData.orderStatus.length > 0) {
        orderStatusChartData.value = chartData.orderStatus.map(item => ({
          value: item.count,
          name: item.status,
          itemStyle: { 
            color: getStatusColor(item.status)
          }
        }))
      } else {
        orderStatusChartData.value = []
      }
    }
  } catch (error) {
    console.error('重新加载图表数据失败:', error)
    ElMessage.error('加载图表数据失败')
  } finally {
    loading.value = false
  }
})

onMounted(() => {
  // 加载仪表板数据
  loadDashboardData()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.metric-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.metric-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.metric-card:hover .metric-icon::before {
  left: 100%;
}

.metric-card:hover .metric-icon {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.metric-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.metric-change.up {
  color: #67C23A;
}

.metric-change.down {
  color: #F56C6C;
}

.metric-change.stable {
  color: #909399;
}

.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.chart-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chart-container {
  height: 300px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}

.ranking-card,
.todo-card,
.quick-actions-card,
.message-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.3s;
}

.ranking-item:hover {
  background-color: #f5f7fa;
}

.ranking-position {
  width: 32px;
}

.ranking-info {
  flex: 1;
}

.ranking-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.ranking-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.ranking-change.up {
  color: #67C23A;
}

.ranking-change.down {
  color: #F56C6C;
}

.ranking-performance {
  text-align: right;
}

.performance-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.performance-orders {
  font-size: 12px;
  color: #909399;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.3s;
}

.todo-item:hover {
  background-color: #f5f7fa;
}

.todo-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.todo-content {
  flex: 1;
}

.todo-title {
  font-size: 14px;
  color: #303133;
}

.todo-count {
  font-size: 12px;
  color: #909399;
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #e4e7ed;
}

.action-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 8px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.action-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
}

.action-item:hover .action-icon::before {
  left: 100%;
}

.action-item:hover .action-icon {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

.action-label {
  font-size: 14px;
  color: #303133;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions {
    grid-template-columns: 1fr;
  }
}

/* 消息提醒样式 */
.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.message-item:hover {
  background-color: #f5f7fa;
}

.message-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.message-content {
  flex: 1;
}

.message-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 2px;
}

.message-time {
  font-size: 12px;
  color: #909399;
}

.message-badge {
  margin-left: auto;
}

/* 消息弹窗样式 */
.message-dialog {
  max-height: 500px;
  overflow-y: auto;
}

.message-dialog-header {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.message-dialog-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-dialog-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
  border: 1px solid #e4e7ed;
}

.message-dialog-item:hover {
  background-color: #f5f7fa;
}

.message-dialog-item.unread {
  background-color: #f0f9ff;
  border-color: #409EFF;
}

.message-dialog-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.message-dialog-content {
  flex: 1;
  min-width: 0;
}

.message-dialog-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.message-dialog-desc {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.message-dialog-time {
  font-size: 12px;
  color: #909399;
}

.message-dialog-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 消息详情弹窗样式 */
.message-detail {
  padding: 16px 0;
}

.message-detail-content p {
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
  margin-bottom: 16px;
}

.message-detail-info {
  display: flex;
  gap: 24px;
  font-size: 12px;
  color: #909399;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
}

/* 空状态样式 */
.empty-chart {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>