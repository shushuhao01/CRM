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
            <span class="chart-title">{{ chartTitles.performanceTrend }}</span>
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
            v-if="performanceChartData.xAxisData && performanceChartData.xAxisData.length > 0"
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
          <span class="chart-title">{{ chartTitles.orderStatus }}</span>
        </template>
        <div class="chart-container">
          <v-chart
            v-if="orderStatusChartData && orderStatusChartData.length > 0"
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
            v-for="(item, index) in (rankings.sales || [])"
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
            <el-avatar :size="32" :src="item.avatar || undefined">
              {{ item.name ? item.name.charAt(0) : '?' }}
            </el-avatar>
            <div class="ranking-info">
              <div class="ranking-name">{{ item.name }}</div>
              <div class="ranking-department">{{ item.department || '未分配部门' }}</div>
            </div>
            <div class="ranking-performance">
              <div class="performance-value">¥{{ item.revenue.toLocaleString() }}</div>
              <div class="performance-orders">{{ typeof item.orders === 'number' ? (item.orders % 1 === 0 ? item.orders : item.orders.toFixed(1)) : item.orders }}单</div>
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
            v-for="action in (quickActions || [])"
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
            <div class="message-actions">
              <el-tooltip content="全部已读" placement="top">
                <el-button
                  type="text"
                  size="small"
                  @click="markAllAsRead"
                  :disabled="unreadCount === 0"
                  class="action-icon-btn"
                >
                  <el-icon :size="18"><CircleCheck /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="清空消息" placement="top">
                <el-button
                  type="text"
                  size="small"
                  @click="clearAllMessages"
                  class="action-icon-btn"
                >
                  <el-icon :size="18"><Delete /></el-icon>
                </el-button>
              </el-tooltip>
              <el-badge :value="unreadCount > 99 ? '99+' : unreadCount" :hidden="unreadCount === 0">
                <el-button type="text" size="small" @click="showMessageDialog = true">
                  查看全部
                </el-button>
              </el-badge>
            </div>
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
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleCheck, Delete } from '@element-plus/icons-vue'
import { eventBus, EventNames } from '@/utils/eventBus'
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
import { useOrderStore } from '@/stores/order'
import { usePerformanceStore } from '@/stores/performance'
import { useDepartmentStore } from '@/stores/department'
import { useCustomerStore } from '@/stores/customer'
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
const orderStore = useOrderStore()
const departmentStore = useDepartmentStore()

// 响应式数据
const performancePeriod = ref('day')

// 消息提醒相关数据
const showMessageDialog = ref(false)
const showMessageDetailDialog = ref(false)
const selectedMessage = ref<Message | null>(null)

// 系统消息数据 - 使用新的消息服务，过滤出当前用户可见的消息
const messages = computed(() => {
  const currentUserId = userStore.currentUser?.id
  const allMessages = notificationStore.messages || []
  if (!currentUserId) return allMessages

  // 过滤消息：显示发给当前用户的消息或没有指定目标用户的全局消息
  return allMessages.filter(msg => {
    if (!msg.targetUserId) return true
    return String(msg.targetUserId) === String(currentUserId)
  })
})

// 计算属性 - 使用新的消息服务
const unreadCount = computed(() => {
  return messages.value.filter(msg => !msg.read).length
})

const recentMessages = computed(() => {
  // 确保消息按时间倒序排列（最新的在前）
  const sortedMessages = [...messages.value]
    .sort((a, b) => {
      const timeA = new Date(a.time).getTime()
      const timeB = new Date(b.time).getTime()
      return timeB - timeA // 倒序：最新的在前
    })
  return sortedMessages.slice(0, 5)
})

// 核心指标数据 - 根据用户权限动态生成标签
// 图表标题（根据用户角色动态显示）
const chartTitles = computed(() => {
  const user = userStore.currentUser
  if (!user) {
    return {
      performanceTrend: '业绩趋势',
      orderStatus: '订单状态分布'
    }
  }

  const isAdmin = user.role === 'super_admin' || user.role === 'admin'
  const isDeptManager = user.role === 'department_manager' || user.role === 'manager'

  if (isAdmin) {
    return {
      performanceTrend: '业绩趋势（全部）',
      orderStatus: '订单状态分布（全部）'
    }
  } else if (isDeptManager) {
    return {
      performanceTrend: '业绩趋势（部门）',
      orderStatus: '订单状态分布（部门）'
    }
  } else {
    return {
      performanceTrend: '业绩趋势（个人）',
      orderStatus: '订单状态分布（个人）'
    }
  }
})

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
      service: '待处理售后（全部）',
      audit: '待审核订单（全部）',
      logistics: '待发货订单（全部）',
      monthlySignCount: '本月签收单数（全部）',
      monthlySignRevenue: '本月签收业绩（全部）'
    }
  } else if (isDeptManager) {
    return {
      orders: '今日订单（部门）',
      customers: '新增客户（部门）',
      revenue: '今日业绩（部门）',
      monthlyOrders: '本月单数（部门）',
      monthlyRevenue: '本月业绩（部门）',
      service: '待处理售后（部门）',
      audit: '待审核订单（部门）',
      logistics: '待发货订单（部门）',
      monthlySignCount: '本月签收单数（部门）',
      monthlySignRevenue: '本月签收业绩（部门）'
    }
  } else {
    return {
      orders: '今日订单（个人）',
      customers: '新增客户（个人）',
      revenue: '今日业绩（个人）',
      monthlyOrders: '本月单数（个人）',
      monthlyRevenue: '本月业绩（个人）',
      service: '待处理售后（个人）',
      audit: '待审核订单（个人）',
      logistics: '待发货订单（个人）',
      monthlySignCount: '本月签收单数（个人）',
      monthlySignRevenue: '本月签收业绩（个人）'
    }
  }
}

// 获取排行榜标题
const getRankingTitle = () => {
  const user = userStore.currentUser
  if (!user) return '本月业绩排名'

  const isAdmin = user.role === 'super_admin' || user.role === 'admin'

  if (isAdmin) {
    return '本月业绩排名（全部）'
  } else {
    // 🔥 部门经理和普通销售员都显示部门排名
    return '本月业绩排名（部门）'
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
    icon: 'Headset',
    color: '#F56C6C',
    gradient: 'linear-gradient(135deg, #F56C6C 0%, #E6A23C 100%)'
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
  },
  {
    key: 'monthly-sign-count',
    label: '本月签收单数',
    value: '0',
    change: '+0%',
    trend: 'up',
    icon: 'CircleCheck',
    color: '#52C41A'
  },
  {
    key: 'monthly-sign-revenue',
    label: '本月签收业绩',
    value: '¥0',
    change: '+0%',
    trend: 'up',
    icon: 'Trophy',
    color: '#FA8C16'
  }
])

// 加载状态
const loading = ref(false)

// 业绩排名数据 - 使用API动态获取
const rankings = ref({
  sales: [] as Array<{ id: string; name: string; avatar: string; department: string; orders: number; revenue: number; trend?: string; change?: string }>,
  products: [] as unknown[]
})

// 待办事项数据 - 从API获取
const todos = ref<TodoItem[]>([])

// 快捷操作数据 - 固定的快捷入口
const quickActions = ref<QuickAction[]>([
  {
    key: 'add-customer',
    label: '新增客户',
    icon: 'UserFilled',
    route: '/customer/add',
    color: '#409EFF'
  },
  {
    key: 'add-order',
    label: '新增订单',
    icon: 'DocumentAdd',
    route: '/order/add',
    color: '#67C23A'
  },
  {
    key: 'search-customer',
    label: '客户查询',
    icon: 'Search',
    route: '/data/search',
    color: '#E6A23C'
  },
  {
    key: 'search-logistics',
    label: '物流查询',
    icon: 'Van',
    route: '/logistics/list',
    color: '#F56C6C'
  }
])

// 业绩趋势图表数据
const performanceChartData = ref({
  xAxisData: [] as string[],
  orderData: [] as number[],
  signData: [] as number[],
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
const orderStatusChartData = ref([] as Array<{ value: number; name: string; amount: number; itemStyle: { color: string } }>)

// 订单状态分布图配置
const orderStatusChartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: (params: unknown) => {
      const data = params.data
      return `${params.name}: ${data.value}<br/>金额: ¥${data.amount.toLocaleString()}`
    }
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    formatter: (name: string) => {
      const item = orderStatusChartData.value.find(d => d.name === name)
      return item ? `${name}: ${item.value}` : name
    }
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
          fontWeight: 'normal'
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
    '已发货': '#E6A23C',
    '运输中': '#E6A23C',
    '待审核': '#909399',
    '待流转': '#C0C4CC',
    '审核拒绝': '#F56C6C',
    '已取消': '#F56C6C',
    '物流部退回': '#F78989',
    '物流部取消': '#F56C6C',
    '包裹异常': '#E6A23C',
    '拒收': '#F56C6C',
    '拒收已退回': '#F78989',
    '已建售后': '#E6A23C',
    '待取消': '#909399',
    '取消失败': '#F56C6C',
    '草稿': '#C0C4CC',
    '已退款': '#909399',
    '已付款': '#67C23A',
    '已完成': '#67C23A',
    'delivered': '#67C23A',
    'pending_shipment': '#409EFF',
    'shipped': '#E6A23C',
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

const clearAllMessages = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有消息吗？此操作不可恢复。',
      '清空消息',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    notificationStore.clearAllMessages()
    ElMessage.success('已清空所有消息')
    showMessageDialog.value = false
  } catch {
    // 用户取消操作
  }
}

const handleCloseMessageDialog = () => {
  showMessageDialog.value = false
}

// 获取用户权限参数
const getUserPermissionParams = () => {
  const user = userStore.currentUser
  if (!user) return {}

  // 根据用户角色设置数据访问范围
  const params: unknown = {
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

    // 使用真实的localStorage数据
    loadRealMetrics()
    loadRealRankings()
    loadRealChartData()

    // 待办事项已移除，不再加载

    // 【修复】生产环境不加载系统消息，避免502错误
    // 系统消息功能需要后端API支持，暂时禁用
    if (!import.meta.env.PROD) {
      try {
        const permissionParams = getUserPermissionParams()
        const messagesResponse = await notificationStore.loadMessagesFromAPI(permissionParams)
        if (messagesResponse && messagesResponse.length > 0) {
          console.log('[Dashboard] 系统消息加载成功:', messagesResponse.length, '条消息')
        }
      } catch (messageError) {
        // 静默处理消息加载失败，不显示错误提示
        console.log('[Dashboard] 系统消息加载失败（非关键功能）:', messageError)
      }
    }

  } catch (error) {
    console.error('加载仪表板数据失败:', error)
    ElMessage.error('加载数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 加载真实的核心指标数据
const loadRealMetrics = async () => {
  const currentUserId = userStore.currentUser?.id
  const currentDeptId = userStore.currentUser?.departmentId || userStore.currentUser?.department

  // 🔥 获取所有订单（不只是approved的），用于统计待审核和待发货
  let allOrders = orderStore.orders
  let approvedOrders = orderStore.orders.filter(order => order.auditStatus === 'approved')

  // 根据用户角色筛选订单
  if (!userStore.isAdmin && !userStore.isManager) {
    // 普通销售员只看自己的
    allOrders = allOrders.filter(order => order.salesPersonId === currentUserId || order.createdBy === currentUserId)
    approvedOrders = approvedOrders.filter(order => order.salesPersonId === currentUserId || order.createdBy === currentUserId)
  } else if (userStore.isManager && !userStore.isAdmin) {
    // 部门经理看本部门的
    const departmentUsers = userStore.users?.filter(u =>
      String(u.departmentId) === String(currentDeptId) ||
      String(u.department) === String(currentDeptId)
    ).map(u => u.id) || []
    allOrders = allOrders.filter(order => departmentUsers.includes(order.salesPersonId) || departmentUsers.includes(order.createdBy))
    approvedOrders = approvedOrders.filter(order => departmentUsers.includes(order.salesPersonId) || departmentUsers.includes(order.createdBy))
  }

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime()

  // 今日订单（已审核通过的）
  const todayOrders = approvedOrders.filter(order => {
    const orderTime = new Date(order.createTime).getTime()
    return orderTime >= todayStart && orderTime <= todayEnd
  })

  // 本月订单（已审核通过的）
  const monthOrders = approvedOrders.filter(order => {
    const orderTime = new Date(order.createTime).getTime()
    return orderTime >= monthStart
  })

  // 🔥 待审核订单
  const pendingAuditOrders = allOrders.filter(order => order.status === 'pending_audit')

  // 🔥 待发货订单
  const pendingShipmentOrders = allOrders.filter(order => order.status === 'pending_shipment')

  // 🔥 新增客户统计 - 从客户store获取
  let newCustomersCount = 0
  try {
    const customerStore = useCustomerStore()
    let customers = customerStore.customers || []
    // 根据角色筛选
    if (!userStore.isAdmin && !userStore.isManager) {
      customers = customers.filter(c => c.salesPersonId === currentUserId || c.createdBy === currentUserId)
    } else if (userStore.isManager && !userStore.isAdmin) {
      const departmentUsers = userStore.users?.filter(u =>
        String(u.departmentId) === String(currentDeptId)
      ).map(u => u.id) || []
      customers = customers.filter(c => departmentUsers.includes(c.salesPersonId) || departmentUsers.includes(c.createdBy))
    }
    // 统计今日新增
    newCustomersCount = customers.filter(c => {
      const createTime = new Date(c.createTime).getTime()
      return createTime >= todayStart && createTime <= todayEnd
    }).length
  } catch (e) {
    console.warn('获取客户数据失败:', e)
  }

  // 更新指标
  const labels = getMetricLabels()

  metrics.value[0].value = todayOrders.length.toString()
  metrics.value[0].label = labels.orders || '今日订单'

  metrics.value[1].value = newCustomersCount.toString()
  metrics.value[1].label = labels.customers || '新增客户'

  metrics.value[2].value = `¥${todayOrders.reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString()}`
  metrics.value[2].label = labels.revenue || '今日业绩'

  metrics.value[3].value = monthOrders.length.toString()
  metrics.value[3].label = labels.monthlyOrders || '本月单数'

  if (metrics.value[4]) {
    metrics.value[4].value = `¥${monthOrders.reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString()}`
    metrics.value[4].label = labels.monthlyRevenue || '本月业绩'
  }

  if (metrics.value[5]) {
    const pendingService = allOrders.filter(order => order.status === 'after_sales_created').length
    metrics.value[5].value = pendingService.toString()
    metrics.value[5].label = labels.service || '待处理售后'
  }

  // 🔥 待审核订单
  if (metrics.value[6]) {
    metrics.value[6].value = pendingAuditOrders.length.toString()
    metrics.value[6].label = labels.audit || '待审核订单'
  }

  // 🔥 待发货订单
  if (metrics.value[7]) {
    metrics.value[7].value = pendingShipmentOrders.length.toString()
    metrics.value[7].label = labels.logistics || '待发货订单'
  }

  // 🔥 本月签收单数
  if (metrics.value[8]) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // 使用logisticsStatus或status字段判断已签收状态
    const monthSignedOrders = allOrders.filter(order => {
      const isDelivered = order.logisticsStatus === 'delivered' || order.status === 'delivered'
      if (!isDelivered) return false
      const signTime = new Date(order.logisticsUpdateTime || order.updateTime || order.createTime)
      return signTime >= monthStart && signTime <= monthEnd
    })

    metrics.value[8].value = monthSignedOrders.length.toString()
    metrics.value[8].label = labels.monthlySignCount || '本月签收单数'
  }

  // 🔥 本月签收业绩
  if (metrics.value[9]) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // 使用logisticsStatus或status字段判断已签收状态
    const monthSignedOrders = allOrders.filter(order => {
      const isDelivered = order.logisticsStatus === 'delivered' || order.status === 'delivered'
      if (!isDelivered) return false
      const signTime = new Date(order.logisticsUpdateTime || order.updateTime || order.createTime)
      return signTime >= monthStart && signTime <= monthEnd
    })

    const monthSignedRevenue = monthSignedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    metrics.value[9].value = `¥${monthSignedRevenue.toLocaleString()}`
    metrics.value[9].label = labels.monthlySignRevenue || '本月签收业绩'
  }
}

// 加载真实的排名数据
const loadRealRankings = () => {
  let orders = orderStore.orders.filter(order => order.auditStatus === 'approved')
  const currentUser = userStore.currentUser
  const currentDeptId = currentUser?.departmentId
  const currentDeptName = currentUser?.departmentName || currentUser?.department

  console.log('[业绩排名] 当前用户:', currentUser?.name, '部门ID:', currentDeptId, '部门名称:', currentDeptName, '角色:', currentUser?.role)
  console.log('[业绩排名] 用户列表:', userStore.users?.map(u => ({ id: u.id, name: u.name, departmentId: u.departmentId, department: u.department })))

  // 🔥 【关键修复】先获取要显示的部门成员列表
  let departmentMembers: any[] = []

  // 🔥 【关键修复】过滤掉禁用状态的用户
  // 禁用用户(status !== 'active')：账号无法登录，数据完全隐藏不可见
  // 离职用户(employmentStatus === 'resigned')：账号无法登录，但历史数据仍然可见
  const isUserEnabled = (user: any) => {
    // 如果status字段存在且不是active，则用户被禁用
    if (user.status && user.status !== 'active') {
      return false
    }
    return true
  }

  // 根据用户角色确定要显示的成员
  if (userStore.isAdmin) {
    // 管理员：显示所有启用的用户
    departmentMembers = (userStore.users || []).filter(isUserEnabled)
    console.log('[业绩排名] 管理员，显示所有启用用户:', departmentMembers.length)
  } else {
    // 🔥 非管理员（经理/销售员）：只显示本部门启用的成员
    // 🔥 调试：打印所有用户的部门信息
    console.log('[业绩排名] 所有用户部门信息:', userStore.users?.map(u => ({
      id: u.id,
      name: u.name,
      departmentId: u.departmentId,
      department: u.department,
      departmentName: u.departmentName,
      status: u.status,
      employmentStatus: u.employmentStatus
    })))

    // 🔥 【修复】增强部门匹配函数，支持多种匹配方式
    const matchUserDepartment = (user: any) => {
      const targetDeptId = String(user.departmentId || '').toLowerCase().trim()
      const targetDeptName = (user.department || user.departmentName || '').toLowerCase().trim()

      const currentDeptIdStr = String(currentDeptId || '').toLowerCase().trim()
      const currentDeptNameStr = (currentDeptName || '').toLowerCase().trim()

      // 通过部门ID精确匹配
      if (currentDeptIdStr && targetDeptId && currentDeptIdStr === targetDeptId) {
        console.log(`[业绩排名] ✅ 用户 ${user.name} 通过部门ID匹配`)
        return true
      }

      // 通过部门名称精确匹配
      if (currentDeptNameStr && targetDeptName && currentDeptNameStr === targetDeptName) {
        console.log(`[业绩排名] ✅ 用户 ${user.name} 通过部门名称匹配`)
        return true
      }

      // 🔥 【关键修复】部门名称模糊匹配（当departmentId为空时）
      if (!currentDeptIdStr && currentDeptNameStr) {
        if (targetDeptName.includes(currentDeptNameStr) || currentDeptNameStr.includes(targetDeptName)) {
          console.log(`[业绩排名] ✅ 用户 ${user.name} 通过部门名称模糊匹配`)
          return true
        }
      }

      console.log(`[业绩排名] ❌ 用户 ${user.name} 部门不匹配 (目标ID=${targetDeptId}, 目标名=${targetDeptName})`)
      return false
    }

    departmentMembers = (userStore.users || []).filter(u => {
      // 首先检查用户是否启用
      if (!isUserEnabled(u)) {
        return false
      }
      return matchUserDepartment(u)
    })
    console.log('[业绩排名] 非管理员，显示本部门启用成员:', departmentMembers.length, '部门ID:', currentDeptId, '部门名称:', currentDeptName)
  }

  // 获取部门成员ID列表
  const departmentUserIds = departmentMembers.map(u => u.id)

  // 筛选订单（只统计部门成员的订单）
  if (!userStore.isAdmin) {
    orders = orders.filter(order =>
      departmentUserIds.includes(order.salesPersonId) ||
      departmentUserIds.includes(order.createdBy)
    )
    console.log('[业绩排名] 筛选后订单数:', orders.length)
  }

  // 本月订单
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime()
  const monthOrders = orders.filter(order => {
    const orderTime = new Date(order.createTime).getTime()
    return orderTime >= monthStart
  })

  // 🔥 【关键修复】先为所有部门成员创建初始记录（业绩为0）
  const salesMap = new Map()
  departmentMembers.forEach(user => {
    // 获取部门名称
    let userDepartment = '未分配部门'
    const userDeptId = user.departmentId
    const dept = departmentStore.departments?.find((d: any) => String(d.id) === String(userDeptId))
    if (dept) {
      userDepartment = dept.name
    } else if (user.departmentName && user.departmentName !== '未分配') {
      userDepartment = user.departmentName
    } else if (user.department && user.department !== '未分配') {
      userDepartment = user.department
    }

    salesMap.set(user.id, {
      id: user.id,
      name: user.realName || user.name || user.username || '未知',
      avatar: user.avatar || '',
      department: userDepartment,
      orders: 0,
      revenue: 0,
      sharedAmount: 0,
      receivedAmount: 0,
      sharedOrderCount: 0,
      receivedOrderCount: 0
    })
  })

  // 统计每个销售人员的业绩
  monthOrders.forEach(order => {
    const salesPersonId = order.salesPersonId
    if (salesMap.has(salesPersonId)) {
      const existing = salesMap.get(salesPersonId)
      existing.orders += 1
      existing.revenue += order.totalAmount
    } else {
      // 如果用户不在部门成员列表中（可能是管理员视角下的其他部门用户）
      let userName = '未知'
      let userAvatar = ''
      let userDepartment = '未分配部门'

      const user = userStore.users?.find((u: any) =>
        String(u.id) === String(salesPersonId) ||
        u.username === salesPersonId ||
        u.name === salesPersonId
      ) as any

      if (user) {
        userName = user.realName || user.name || user.username || '未知'
        userAvatar = user.avatar || ''
        const userDeptId = user.departmentId
        const dept = departmentStore.departments?.find((d: any) => String(d.id) === String(userDeptId))
        if (dept) {
          userDepartment = dept.name
        } else if (user.departmentName && user.departmentName !== '未分配') {
          userDepartment = user.departmentName
        } else if (user.department && user.department !== '未分配') {
          userDepartment = user.department
        }
      } else {
        userName = order.createdByName || order.createdBy || '未知'
        userDepartment = order.createdByDepartmentName || '未分配部门'
      }

      salesMap.set(salesPersonId, {
        id: salesPersonId,
        name: userName,
        avatar: userAvatar,
        department: userDepartment,
        orders: 1,
        revenue: order.totalAmount,
        sharedAmount: 0,
        receivedAmount: 0,
        sharedOrderCount: 0,
        receivedOrderCount: 0
      })
    }
  })

  // 【批次207修复】处理业绩分享数据 - 同时处理金额和订单数量
  const performanceStore = usePerformanceStore()
  if (performanceStore.performanceShares) {
    performanceStore.performanceShares.forEach(share => {
      if (share.status !== 'active') return

      // 检查分享的订单是否在本月
      const shareOrder = monthOrders.find(o => o.orderNumber === share.orderNumber)
      if (!shareOrder) return

      // 【批次207修复】减少原下单员的业绩和订单数
      if (salesMap.has(share.createdById)) {
        const creator = salesMap.get(share.createdById)
        creator.sharedAmount = (creator.sharedAmount || 0) + share.orderAmount
        if (!creator.sharedOrderCount) {
          creator.sharedOrderCount = 0
        }
        creator.sharedOrderCount += 1
      }

      // 【批次207修复】增加被分享用户的业绩和订单数量
      share.shareMembers.forEach(member => {
        if (!salesMap.has(member.userId)) {
          let userName = member.userName || '未知'
          let userAvatar = ''
          let userDepartment = ''

          const user = userStore.users.find((u: any) => String(u.id) === String(member.userId)) as unknown
          if (user) {
            userName = user.realName || user.name || user.username || userName
            userAvatar = user.avatar || ''
            userDepartment = user.departmentName || user.department || ''
          }

          salesMap.set(member.userId, {
            id: member.userId,
            name: userName,
            avatar: userAvatar,
            department: userDepartment,
            orders: 0,
            revenue: 0,
            sharedAmount: 0,
            receivedAmount: 0,
            sharedOrderCount: 0,
            receivedOrderCount: 0
          })
        }

        const memberData = salesMap.get(member.userId)
        const percentage = member.percentage / 100
        memberData.receivedAmount = (memberData.receivedAmount || 0) + (share.orderAmount * percentage)
        if (!memberData.receivedOrderCount) {
          memberData.receivedOrderCount = 0
        }
        memberData.receivedOrderCount += percentage
      })
    })
  }

  // 【批次207修复】转换为数组,计算净业绩和净订单数并按净业绩倒序排序
  const salesRankings = Array.from(salesMap.values())
    .map(item => ({
      ...item,
      revenue: item.revenue - (item.sharedAmount || 0) + (item.receivedAmount || 0),
      orders: Math.max(0, item.orders - (item.sharedOrderCount || 0) + (item.receivedOrderCount || 0))
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10) // 只取前10名

  console.log('[业绩排名] 最终排名列表:', salesRankings.map(s => ({ name: s.name, revenue: s.revenue, orders: s.orders })))

  rankings.value = {
    sales: salesRankings,
    products: []
  }
}

// 加载真实的图表数据
const loadRealChartData = () => {
  const currentUserId = userStore.currentUser?.id
  let orders = orderStore.orders.filter(order => order.auditStatus === 'approved')

  // 根据用户角色筛选订单
  if (!userStore.isAdmin && !userStore.isManager) {
    orders = orders.filter(order => order.salesPersonId === currentUserId)
  } else if (userStore.isManager && !userStore.isAdmin) {
    const departmentUsers = userStore.users?.filter(u => u.departmentId === userStore.currentUser?.departmentId).map(u => u.id) || []
    orders = orders.filter(order => departmentUsers.includes(order.salesPersonId))
  }

  // 生成业绩趋势数据（参考个人业绩页面）
  const today = new Date()
  const timeData = new Map()

  if (performancePeriod.value === 'day') {
    // 今日每小时数据
    for (let i = 0; i < 24; i++) {
      timeData.set(i, { label: `${i}:00`, amount: 0, orders: 0 })
    }

    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const todayOrders = orders.filter(order => {
      const orderTime = new Date(order.createTime).getTime()
      return orderTime >= todayStart
    })

    todayOrders.forEach(order => {
      const hour = new Date(order.createTime).getHours()
      const data = timeData.get(hour)
      if (data) {
        data.amount += order.totalAmount
        data.orders += 1
      }
    })
  } else if (performancePeriod.value === 'week') {
    // 最近7天
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateKey = date.toISOString().split('T')[0]
      const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`
      timeData.set(dateKey, { label: dateLabel, amount: 0, orders: 0 })
    }

    orders.forEach(order => {
      const orderDate = new Date(order.createTime).toISOString().split('T')[0]
      if (timeData.has(orderDate)) {
        const data = timeData.get(orderDate)
        data.amount += order.totalAmount
        data.orders += 1
      }
    })
  } else {
    // 本月每天
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(today.getFullYear(), today.getMonth(), i)
      const dateKey = date.toISOString().split('T')[0]
      timeData.set(dateKey, { label: `${i}日`, amount: 0, orders: 0 })
    }

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime()
    const monthOrders = orders.filter(order => {
      const orderTime = new Date(order.createTime).getTime()
      return orderTime >= monthStart
    })

    monthOrders.forEach(order => {
      const orderDate = new Date(order.createTime).toISOString().split('T')[0]
      if (timeData.has(orderDate)) {
        const data = timeData.get(orderDate)
        data.amount += order.totalAmount
        data.orders += 1
      }
    })
  }

  const xAxisData: string[] = []
  const orderData: number[] = []
  const signData: number[] = []

  timeData.forEach(data => {
    xAxisData.push(data.label)
    orderData.push(data.amount)
    signData.push(data.orders)
  })

  performanceChartData.value = {
    xAxisData,
    orderData,
    signData,
    title: getPerformanceTitle()
  }

  // 生成订单状态分布数据（参考个人业绩页面）
  const statusMap = new Map<string, { count: number; amount: number }>()
  const statusNames: Record<string, string> = {
    'pending_transfer': '待流转',
    'pending_audit': '待审核',
    'audit_rejected': '审核拒绝',
    'pending_shipment': '待发货',
    'shipped': '已发货',
    'delivered': '已签收',
    'logistics_returned': '物流部退回',
    'logistics_cancelled': '物流部取消',
    'package_exception': '包裹异常',
    'rejected': '拒收',
    'rejected_returned': '拒收已退回',
    'after_sales_created': '已建售后',
    'pending_cancel': '待取消',
    'cancel_failed': '取消失败',
    'cancelled': '已取消',
    'draft': '草稿',
    'refunded': '已退款',
    'pending': '待审核',
    'paid': '已付款',
    'completed': '已完成',
    'signed': '已签收'
  }

  orders.forEach(order => {
    const statusName = statusNames[order.status] || order.status
    if (statusMap.has(statusName)) {
      const existing = statusMap.get(statusName)!
      statusMap.set(statusName, {
        count: existing.count + 1,
        amount: existing.amount + order.totalAmount
      })
    } else {
      statusMap.set(statusName, {
        count: 1,
        amount: order.totalAmount
      })
    }
  })

  const orderStatusData: Array<{ value: number; name: string; amount: number; itemStyle: { color: string } }> = []
  statusMap.forEach((data, name) => {
    orderStatusData.push({
      value: data.count,
      name: name,  // 只使用状态名，不包含数量
      amount: data.amount,
      itemStyle: {
        color: getStatusColor(name)
      }
    })
  })

  orderStatusChartData.value = orderStatusData
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
watch(performancePeriod, () => {
  try {
    loading.value = true
    // 重新加载图表数据
    loadRealChartData()
  } catch (error) {
    console.error('重新加载图表数据失败:', error)
    ElMessage.error('加载图表数据失败')
  } finally {
    loading.value = false
  }
})

// 处理订单状态变化
const handleOrderStatusChanged = () => {
  console.log('[数据看板] 收到订单状态变化事件，刷新数据')
  loadDashboardData()
}

onMounted(async () => {
  // 🔥 优化：先显示页面，再加载数据，提升用户体验
  const startTime = Date.now()

  // 🔥 第一步：立即显示页面框架（使用已有数据或空数据）
  loadDashboardData()

  try {
    // 🔥 第二步：并行加载用户和部门数据（业绩排名需要）
    console.log('[Dashboard] 开始加载用户和部门数据...')
    await Promise.all([
      userStore.loadUsers(),
      departmentStore.fetchDepartments()
    ])
    console.log(`[Dashboard] 用户和部门数据加载完成，耗时: ${Date.now() - startTime}ms`)
    console.log('[Dashboard] 用户列表:', userStore.users?.length, '个用户')
    console.log('[Dashboard] 部门列表:', departmentStore.departments?.length, '个部门')

    // 🔥 第三步：如果订单数据为空，加载订单数据
    if (orderStore.orders.length === 0) {
      console.log('[Dashboard] 开始加载订单数据...')
      await orderStore.loadOrdersFromAPI?.()
      console.log(`[Dashboard] 订单数据加载完成，共 ${orderStore.orders.length} 个订单`)
    }

    // 🔥 第四步：重新计算仪表板数据（使用完整数据）
    loadDashboardData()
    console.log(`[Dashboard] 数据刷新完成，总耗时: ${Date.now() - startTime}ms`)
  } catch (err) {
    console.warn('[Dashboard] 数据加载失败:', err)
  }

  // 监听订单状态变化事件
  eventBus.on(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChanged)
  eventBus.on(EventNames.REFRESH_ORDER_LIST, handleOrderStatusChanged)
})

onUnmounted(() => {
  // 清理事件监听
  eventBus.off(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChanged)
  eventBus.off(EventNames.REFRESH_ORDER_LIST, handleOrderStatusChanged)
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
  margin-bottom: 2px;
}

.ranking-department {
  font-size: 12px;
  color: #909399;
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

/* 消息操作按钮样式 */
.message-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-icon-btn {
  padding: 4px 8px;
  color: #606266;
  transition: all 0.3s;
}

.action-icon-btn:hover {
  color: #409EFF;
  background-color: #ecf5ff;
}

.action-icon-btn:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.action-icon-btn:disabled:hover {
  background-color: transparent;
}
</style>
