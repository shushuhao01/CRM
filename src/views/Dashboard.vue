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
            v-for="(item, index) in topRankings"
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
          <transition-group name="message-slide" tag="div">
            <div
              class="message-item"
              v-for="message in recentMessages"
              :key="message.id"
              @click="handleMessageClick(message)"
            >
              <div class="message-icon" :style="{ backgroundColor: message.color }">
                <el-icon :size="16">
                  <component :is="message.icon" />
                </el-icon>
              </div>
              <div class="message-content">
                <div class="message-header">
                  <div class="message-title">{{ message.title }}</div>
                  <div class="message-time">{{ formatMessageTime(message.time) }}</div>
                </div>
                <div class="message-desc">{{ message.content }}</div>
              </div>
              <el-badge :is-dot="!message.read" class="message-badge" />
            </div>
          </transition-group>
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
            <span>类型：{{ getMessageTypeName(selectedMessage.type) }}</span>
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

// 🔥 计算属性：只显示前5名（如果第5名有并列则显示满5人）
const topRankings = computed(() => {
  const sales = rankings.value.sales || []
  if (sales.length <= 5) return sales

  // 获取第5名的业绩金额
  const fifthRevenue = sales[4]?.revenue

  // 找出所有业绩 >= 第5名的人（处理并列情况）
  let cutoffIndex = 5
  for (let i = 5; i < sales.length; i++) {
    if (sales[i].revenue === fifthRevenue) {
      cutoffIndex = i + 1
    } else {
      break
    }
  }

  // 最多显示5人，即使有并列也只显示5人
  return sales.slice(0, 5)
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
          // 🔥 修复：业绩趋势图始终显示金额，单位为¥
          const value = `¥${param.value.toLocaleString()}`
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
        // 🔥 修复：Y轴始终显示金额单位¥
        formatter: '¥{value}'
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
      return `${params.name}: ${data.value}单<br/>金额: ¥${(data.amount || 0).toLocaleString()}`
    }
  },
  legend: {
    orient: 'vertical',
    left: 'left',
    formatter: (name: string) => {
      const item = orderStatusChartData.value.find(d => d.name === name)
      // 🔥 修复：图例显示订单数和金额
      return item ? `${name}: ${item.value}单 ¥${(item.amount || 0).toLocaleString()}` : name
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

// 获取消息类型的中文名称
const getMessageTypeName = (type: string): string => {
  const typeMap: Record<string, string> = {
    // 订单相关
    'order_created': '订单创建',
    'order_paid': '订单支付',
    'order_pending_audit': '订单待审核',
    'order_audit_approved': '订单审核通过',
    'audit_approved': '审核通过',
    'order_audit_rejected': '订单审核拒绝',
    'audit_rejected': '审核拒绝',
    'order_pending_shipment': '订单待发货',
    'order_shipped': '订单已发货',
    'order_delivered': '订单已送达',
    'order_signed': '订单已签收',
    'order_rejected': '订单拒收',
    'order_cancelled': '订单已取消',
    'order_cancel_request': '订单取消申请',
    'order_cancel_approved': '订单取消通过',
    'order_cancel_rejected': '订单取消拒绝',
    'order_modify_approved': '订单修改通过',
    'order_refunded': '订单已退款',
    // 物流异常
    'order_logistics_returned': '物流退回',
    'order_logistics_cancelled': '物流取消',
    'order_package_exception': '包裹异常',
    // 超时提醒
    'order_audit_timeout': '审核超时',
    'order_shipment_timeout': '发货超时',
    'order_followup_reminder': '跟进提醒',
    // 售后相关
    'after_sales_created': '售后创建',
    'after_sales_assigned': '售后分配',
    'after_sales_processing': '售后处理中',
    'after_sales_urgent': '紧急售后',
    'after_sales_completed': '售后完成',
    'after_sales_rejected': '售后拒绝',
    'after_sales_closed': '售后关闭',
    'after_sales_cancelled': '售后取消',
    'after_sales_timeout': '售后超时',
    // 客户相关
    'customer_created': '客户添加',
    'customer_updated': '客户更新',
    'customer_call': '客户通话',
    'customer_share': '客户分享',
    'customer_complaint': '客户投诉',
    'customer_rejected': '客户拒收',
    'customer_followup_due': '跟进到期',
    'customer_assigned': '客户分配',
    // 商品相关
    'product_created': '商品添加',
    'product_updated': '商品更新',
    'product_out_of_stock': '商品缺货',
    // 系统相关
    'system_maintenance': '系统维护',
    'system_update': '系统更新',
    'user_login': '用户登录',
    'user_created': '用户添加',
    'permission_configured': '权限配置',
    'data_export_success': '导出成功',
    'data_import_completed': '导入完成',
    // 物流相关
    'logistics_pickup': '物流揽收',
    'logistics_in_transit': '物流运输中',
    'logistics_delivered': '物流已送达',
    'package_anomaly': '包裹异常',
    // 审核相关
    'audit_pending': '待审核',
    // 业绩分享
    'performance_share_created': '业绩分享创建',
    'performance_share_received': '收到业绩分享',
    'performance_share_confirmed': '业绩分享确认',
    'performance_share_rejected': '业绩分享拒绝',
    // 短信相关
    'sms_template_applied': '短信模板申请',
    'sms_template_approved': '短信模板通过',
    'sms_send_success': '短信发送成功',
    'sms_send_failed': '短信发送失败',
    // 资料分配
    'data_assigned': '资料分配',
    'data_reassigned': '资料重新分配',
    'data_batch_assigned': '批量分配完成'
  }
  return typeMap[type] || type
}

// 格式化消息时间（简短显示）
const formatMessageTime = (time: string): string => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
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
// 标记所有消息为已读 - 🔥 使用notificationStore保持与铃铛消息中心同步
const markAllAsRead = async () => {
  try {
    // 使用notificationStore的方法，确保与铃铛消息中心同步
    await notificationStore.markAllAsReadWithAPI()
    ElMessage.success('所有消息已标记为已读')
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
    // 🔥 使用notificationStore的方法，确保与铃铛消息中心同步
    await notificationStore.clearAllMessagesWithAPI()
    ElMessage.success('已清空所有消息')
    showMessageDialog.value = false
  } catch (error: any) {
    // 用户取消操作时不显示错误
    if (error !== 'cancel' && error?.toString() !== 'cancel') {
      console.error('清空消息失败:', error)
      ElMessage.error('清空消息失败，请稍后重试')
    }
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

    // 使用真实的localStorage数据 - 🔥 修复：添加await确保异步函数正确执行
    await loadRealMetrics()
    await loadRealRankings()
    await loadRealChartData()

    // 待办事项已移除，不再加载

    // 🔥 加载系统消息（生产环境和开发环境都加载）
    try {
      const messagesResponse = await notificationStore.loadMessagesFromAPI()
      if (messagesResponse && messagesResponse.length > 0) {
        console.log('[Dashboard] 系统消息加载成功:', messagesResponse.length, '条消息')
      }
    } catch (messageError) {
      // 静默处理消息加载失败，不显示错误提示
      console.log('[Dashboard] 系统消息加载失败（非关键功能）:', messageError)
    }

  } catch (error) {
    console.error('加载仪表板数据失败:', error)
    ElMessage.error('加载数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 🔥 加载真实的核心指标数据 - 使用后端API
const loadRealMetrics = async () => {
  try {
    // 调用后端API获取统计数据
    const metricsData = await dashboardApi.getMetrics()
    console.log('[Dashboard] 后端返回指标数据:', metricsData)

    // 更新指标
    const labels = getMetricLabels()

    // 辅助函数：格式化环比显示，避免-0%的情况
    const formatChange = (change: number | null | undefined): string => {
      const value = change ?? 0
      // 如果是0或者-0，统一显示为0%
      if (value === 0 || Object.is(value, -0)) {
        return '0%'
      }
      return `${value > 0 ? '+' : ''}${value}%`
    }

    // 今日订单
    metrics.value[0].value = (metricsData.todayOrders || 0).toString()
    metrics.value[0].label = labels.orders || '今日订单'
    metrics.value[0].change = formatChange(metricsData.todayOrdersChange)
    metrics.value[0].trend = metricsData.todayOrdersTrend || 'stable'

    // 新增客户
    metrics.value[1].value = (metricsData.newCustomers || 0).toString()
    metrics.value[1].label = labels.customers || '新增客户'
    metrics.value[1].change = formatChange(metricsData.newCustomersChange)
    metrics.value[1].trend = metricsData.newCustomersTrend || 'stable'

    // 今日业绩
    metrics.value[2].value = `¥${(metricsData.todayRevenue || 0).toLocaleString()}`
    metrics.value[2].label = labels.revenue || '今日业绩'
    metrics.value[2].change = formatChange(metricsData.todayRevenueChange)
    metrics.value[2].trend = metricsData.todayRevenueTrend || 'stable'

    // 本月单数
    metrics.value[3].value = (metricsData.monthlyOrders || 0).toString()
    metrics.value[3].label = labels.monthlyOrders || '本月单数'
    metrics.value[3].change = formatChange(metricsData.monthlyOrdersChange)
    metrics.value[3].trend = metricsData.monthlyOrdersTrend || 'stable'

    // 本月业绩
    if (metrics.value[4]) {
      metrics.value[4].value = `¥${(metricsData.monthlyRevenue || 0).toLocaleString()}`
      metrics.value[4].label = labels.monthlyRevenue || '本月业绩'
      metrics.value[4].change = formatChange(metricsData.monthlyRevenueChange)
      metrics.value[4].trend = metricsData.monthlyRevenueTrend || 'stable'
    }

    // 待处理售后
    if (metrics.value[5]) {
      metrics.value[5].value = (metricsData.pendingService || 0).toString()
      metrics.value[5].label = labels.service || '待处理售后'
      metrics.value[5].change = formatChange(metricsData.pendingServiceChange)
      metrics.value[5].trend = metricsData.pendingServiceTrend || 'stable'
    }

    // 🔥 待审核订单
    if (metrics.value[6]) {
      metrics.value[6].value = (metricsData.pendingAudit || 0).toString()
      metrics.value[6].label = labels.audit || '待审核订单'
      metrics.value[6].change = formatChange(metricsData.pendingAuditChange)
      metrics.value[6].trend = metricsData.pendingAuditTrend || 'stable'
    }

    // 🔥 待发货订单
    if (metrics.value[7]) {
      metrics.value[7].value = (metricsData.pendingShipment || 0).toString()
      metrics.value[7].label = labels.logistics || '待发货订单'
      metrics.value[7].change = formatChange(metricsData.pendingShipmentChange)
      metrics.value[7].trend = metricsData.pendingShipmentTrend || 'stable'
    }

    // 🔥 本月签收单数
    if (metrics.value[8]) {
      metrics.value[8].value = (metricsData.monthlyDeliveredCount || 0).toString()
      metrics.value[8].label = labels.monthlySignCount || '本月签收单数'
      metrics.value[8].change = formatChange(metricsData.monthlyDeliveredCountChange)
      metrics.value[8].trend = metricsData.monthlyDeliveredCountTrend || 'stable'
    }

    // 🔥 本月签收业绩
    if (metrics.value[9]) {
      metrics.value[9].value = `¥${(metricsData.monthlyDeliveredAmount || 0).toLocaleString()}`
      metrics.value[9].label = labels.monthlySignRevenue || '本月签收业绩'
      metrics.value[9].change = formatChange(metricsData.monthlyDeliveredAmountChange)
      metrics.value[9].trend = metricsData.monthlyDeliveredAmountTrend || 'stable'
    }

  } catch (error) {
    console.error('[Dashboard] 加载指标数据失败:', error)
    // 如果后端API失败，使用前端计算作为降级方案
    await loadRealMetricsFallback()
  }
}

// 🔥 降级方案：前端计算指标数据
const loadRealMetricsFallback = async () => {
  const currentUserId = userStore.currentUser?.id
  const currentDeptId = userStore.currentUser?.departmentId || userStore.currentUser?.department

  let allOrders = orderStore.orders
  let approvedOrders = orderStore.orders.filter(order => {
    const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
    if (order.status === 'pending_transfer') return order.markType === 'normal'
    return !excludedStatuses.includes(order.status)
  })

  if (!userStore.isAdmin && !userStore.isManager) {
    allOrders = allOrders.filter(order => order.salesPersonId === currentUserId || order.createdBy === currentUserId)
    approvedOrders = approvedOrders.filter(order => order.salesPersonId === currentUserId || order.createdBy === currentUserId)
  } else if (userStore.isManager && !userStore.isAdmin) {
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

  const todayOrders = approvedOrders.filter(order => {
    const orderTime = new Date(order.createTime).getTime()
    return orderTime >= todayStart && orderTime <= todayEnd
  })

  const monthOrders = approvedOrders.filter(order => {
    const orderTime = new Date(order.createTime).getTime()
    return orderTime >= monthStart
  })

  const labels = getMetricLabels()

  metrics.value[0].value = todayOrders.length.toString()
  metrics.value[0].label = labels.orders || '今日订单'

  metrics.value[2].value = `¥${todayOrders.reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString()}`
  metrics.value[2].label = labels.revenue || '今日业绩'

  metrics.value[3].value = monthOrders.length.toString()
  metrics.value[3].label = labels.monthlyOrders || '本月单数'

  if (metrics.value[4]) {
    metrics.value[4].value = `¥${monthOrders.reduce((sum, order) => sum + order.totalAmount, 0).toLocaleString()}`
    metrics.value[4].label = labels.monthlyRevenue || '本月业绩'
  }

  // 本月签收
  if (metrics.value[8]) {
    const now = new Date()
    const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const monthSignedOrders = allOrders.filter(order => {
      const isDelivered = order.logisticsStatus === 'delivered' || order.status === 'delivered'
      if (!isDelivered) return false
      const signTime = new Date(order.logisticsUpdateTime || order.updateTime || order.createTime)
      return signTime >= monthStartDate && signTime <= monthEndDate
    })

    metrics.value[8].value = monthSignedOrders.length.toString()
    metrics.value[8].label = labels.monthlySignCount || '本月签收单数'

    // 🔥 本月签收业绩
    if (metrics.value[9]) {
      const monthSignedRevenue = monthSignedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      metrics.value[9].value = `¥${monthSignedRevenue.toLocaleString()}`
      metrics.value[9].label = labels.monthlySignRevenue || '本月签收业绩'
    }
  }
}

// 加载真实的排名数据
const loadRealRankings = async () => {
  // 🔥 优先尝试从后端API加载数据（确保数据完整）
  const apiSuccess = await loadRankingsFromAPI()
  if (apiSuccess) {
    console.log('[业绩排名] ✅ 使用后端API数据')
    return
  }

  console.log('[业绩排名] ⚠️ 后端API失败，降级到前端计算')
  // 降级方案：使用前端数据
  loadRankingsFromStore()
}

// 🔥 新增：从后端API加载排名数据
const loadRankingsFromAPI = async (): Promise<boolean> => {
  try {
    const { getTeamStats } = await import('@/api/performance')

    // 获取本月日期范围
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const startDate = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-01`
    const endDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    console.log('[业绩排名] 从后端API加载数据, 日期范围:', startDate, '~', endDate)

    // 🔥 管理员查看全部部门，非管理员查看本部门
    const currentUser = userStore.currentUser
    const departmentId = userStore.isAdmin ? '' : (currentUser?.departmentId || '')

    const response = await getTeamStats({
      departmentId: departmentId,
      startDate: startDate,
      endDate: endDate,
      sortBy: 'orderAmount',
      limit: 1000 // 获取所有成员
    })

    if (response.success && response.data && response.data.members) {
      const members = response.data.members

      // 转换为排名格式
      const salesRankings = members
        .map((m: any) => ({
          id: m.id,
          name: m.name || m.username || '未知',
          avatar: '',
          department: m.department || '未分配部门',
          orders: m.orderCount || 0,
          revenue: m.orderAmount || 0
        }))
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10) // 只取前10名

      console.log('[业绩排名] ✅ 后端API数据加载成功, 成员数:', members.length)
      console.log('[业绩排名] 排名列表:', salesRankings.map((s: any) => ({ name: s.name, revenue: s.revenue, orders: s.orders })))

      rankings.value = {
        sales: salesRankings,
        products: []
      }

      return true
    }

    return false
  } catch (error) {
    console.error('[业绩排名] ❌ 后端API加载失败:', error)
    return false
  }
}

// 🔥 降级方案：从前端store加载排名数据
const loadRankingsFromStore = () => {
  // 🔥 使用新的业绩计算规则
  let orders = orderStore.orders.filter(order => {
    const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
    // 待流转状态只有正常发货单才计入业绩
    if (order.status === 'pending_transfer') return order.markType === 'normal'
    return !excludedStatuses.includes(order.status)
  })
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
// 🔥 加载真实的图表数据 - 从后端API获取，支持角色权限过滤
const loadRealChartData = async () => {
  try {
    console.log('[Dashboard] 开始加载图表数据，时间段:', performancePeriod.value)

    // 调用后端API获取图表数据（后端会根据用户角色自动过滤数据）
    const chartData = await dashboardApi.getChartData({ period: performancePeriod.value as 'day' | 'week' | 'month' })
    console.log('[Dashboard] 后端返回图表数据:', chartData)

    if (chartData && chartData.revenue && chartData.revenue.length > 0) {
      // 更新业绩趋势图数据
      // 🔥 签收业绩使用 revenue 数组中的 deliveredAmount 字段
      performanceChartData.value = {
        xAxisData: chartData.revenue.map((item: { date: string }) => item.date),
        orderData: chartData.revenue.map((item: { amount: number }) => item.amount),
        signData: chartData.revenue.map((item: { deliveredAmount?: number }) => item.deliveredAmount || 0),
        title: getPerformanceTitle()
      }
      console.log('[Dashboard] 业绩趋势图数据已更新:', performanceChartData.value)
    } else {
      // 如果没有数据，设置空数据
      performanceChartData.value = {
        xAxisData: [],
        orderData: [],
        signData: [],
        title: getPerformanceTitle()
      }
    }

    if (chartData && chartData.orderStatus && chartData.orderStatus.length > 0) {
      // 更新订单状态分布图数据
      orderStatusChartData.value = chartData.orderStatus.map((item: any) => ({
        value: item.count,
        name: item.status,
        amount: item.amount || 0,
        itemStyle: { color: getStatusColor(item.status) }
      }))
      console.log('[Dashboard] 订单状态分布图数据已更新:', orderStatusChartData.value)
    } else {
      // 如果没有数据，设置空数据
      orderStatusChartData.value = []
    }

  } catch (error) {
    console.error('[Dashboard] 加载图表数据失败:', error)
    // 如果API失败，保持原有的空数据
    performanceChartData.value = {
      xAxisData: [],
      orderData: [],
      signData: [],
      title: getPerformanceTitle()
    }
    orderStatusChartData.value = []
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
    // 重新加载图表数据
    await loadRealChartData()
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
  position: relative;
  overflow: hidden;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.message-item:hover {
  background-color: #f5f7fa;
}

.message-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  margin-top: 2px;
}

.message-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.message-title {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-time {
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
  flex-shrink: 0;
}

.message-desc {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.message-badge {
  margin-left: 4px;
  flex-shrink: 0;
  margin-top: 8px;
}

/* 消息滑入动画 - 新消息从顶部滑入，旧消息向下滑出 */
.message-slide-enter-active {
  transition: all 0.4s ease-out;
}

.message-slide-leave-active {
  transition: all 0.3s ease-in;
  position: absolute;
  width: 100%;
}

.message-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.message-slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.message-slide-move {
  transition: transform 0.3s ease;
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
