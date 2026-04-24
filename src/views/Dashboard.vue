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
              <span class="trend-period">{{ metric.trendLabel }}</span>
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
          <div class="chart-header">
            <span class="chart-title">快捷操作</span>
            <el-tooltip content="自定义快捷操作" placement="top">
              <el-button type="primary" link size="small" @click="openQuickSettings" class="quick-settings-btn">
                <el-icon :size="16"><Setting /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </template>
        <div class="quick-actions" :class="`cols-${quickActionsColumns}`">
          <div
            class="action-item"
            v-for="action in visibleQuickActions"
            :key="action.key"
            @click="handleQuickAction(action)"
          >
            <div class="action-icon" :style="{ background: action.gradient || action.color }">
              <el-icon :size="quickActionsColumns === 3 ? 18 : 20">
                <component :is="action.icon" />
              </el-icon>
            </div>
            <div class="action-label">{{ action.label }}</div>
          </div>
          <div v-if="visibleQuickActions.length === 0" class="quick-actions-empty">
            <el-empty description="暂无可用的快捷操作" :image-size="60">
              <el-button type="primary" size="small" @click="openQuickSettings">去设置</el-button>
            </el-empty>
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
          <!-- 🔥 公告类型使用v-html渲染富文本内容 -->
          <div v-if="(selectedMessage as any).isAnnouncement" class="announcement-html-content" v-html="sanitizeHtml(selectedMessage.content)"></div>
          <p v-else>{{ selectedMessage.content }}</p>
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

    <!-- 快捷操作设置弹窗 -->
    <el-dialog
      v-model="showQuickSettings"
      title=""
      width="620px"
      :close-on-click-modal="false"
      class="quick-settings-dialog"
    >
      <template #header>
        <div class="qs-dialog-header">
          <div class="qs-dialog-title">
            <el-icon :size="20" color="#409EFF"><Setting /></el-icon>
            <span>自定义快捷操作</span>
          </div>
          <div class="qs-dialog-subtitle">选择最多 6 个快捷操作显示在数据看板，仅展示您有权限的功能</div>
        </div>
      </template>

      <!-- 布局设置区 -->
      <div class="qs-layout-section">
        <div class="qs-layout-row">
          <span class="qs-layout-label">卡片布局</span>
          <el-radio-group v-model="tempQuickColumns" size="small">
            <el-radio-button :label="2">
              <el-icon :size="14"><Grid /></el-icon> 一行2个
            </el-radio-button>
            <el-radio-button :label="3">
              <el-icon :size="14"><Menu /></el-icon> 一行3个
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="qs-selected-count" :class="{ 'qs-count-full': tempSelectedKeys.length >= 6 }">
          已选 <strong>{{ tempSelectedKeys.length }}</strong> / 6
        </div>
      </div>

      <!-- 分类快捷操作选择区 -->
      <div class="qs-actions-container">
        <div
          v-for="category in pagedCategories"
          :key="category.name"
          class="qs-category"
        >
          <div class="qs-category-header">
            <el-icon :size="14" :style="{ color: category.color }"><component :is="category.icon" /></el-icon>
            <span>{{ category.name }}</span>
          </div>
          <div class="qs-category-grid">
            <div
              v-for="item in category.actions"
              :key="item.key"
              class="qs-action-card"
              :class="{
                'qs-action-selected': tempSelectedKeys.includes(item.key),
                'qs-action-disabled': !tempSelectedKeys.includes(item.key) && tempSelectedKeys.length >= 6
              }"
              @click="toggleQuickAction(item.key)"
            >
              <div class="qs-action-icon" :style="{ background: item.gradient || item.color }">
                <el-icon :size="16"><component :is="item.icon" /></el-icon>
              </div>
              <span class="qs-action-name">{{ item.label }}</span>
              <div class="qs-action-check" v-if="tempSelectedKeys.includes(item.key)">
                <el-icon :size="12"><CircleCheck /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 翻页控制 -->
      <div class="qs-pagination" v-if="totalCategoryPages > 1">
        <el-button :disabled="categoryPage === 1" link @click="categoryPage--">
          <el-icon><ArrowLeft /></el-icon> 上一页
        </el-button>
        <span class="qs-page-info">{{ categoryPage }} / {{ totalCategoryPages }}</span>
        <el-button :disabled="categoryPage === totalCategoryPages" link @click="categoryPage++">
          下一页 <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>

      <template #footer>
        <div class="qs-dialog-footer">
          <el-button @click="resetQuickActions">
            <el-icon><RefreshLeft /></el-icon> 恢复默认
          </el-button>
          <div>
            <el-button @click="showQuickSettings = false">取消</el-button>
            <el-button type="primary" @click="saveQuickActions">
              <el-icon><CircleCheck /></el-icon> 保存设置
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleCheck, Delete, Setting, Grid, Menu, ArrowLeft, ArrowRight, RefreshLeft } from '@element-plus/icons-vue'
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
import { useMessageStore } from '@/stores/message'
import { useOrderStore } from '@/stores/order'
import { usePerformanceStore } from '@/stores/performance'
import { useDepartmentStore } from '@/stores/department'
import { useCustomerStore } from '@/stores/customer'
import { dashboardApi, type DashboardTodo, type DashboardQuickAction } from '@/api/dashboard'
import { messageApi } from '@/api/message'
import { sanitizeHtml } from '@/utils/sanitize'
import { menuConfig } from '@/config/menu'
import { hasMenuPermission } from '@/utils/menu'

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
const messageStore = useMessageStore()
const orderStore = useOrderStore()
const departmentStore = useDepartmentStore()
const performanceStore = usePerformanceStore()

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
  if (!currentUserId) {
    // 🔥 修复：排除announcement类型，公告已单独合并到recentMessages
    return allMessages.filter(msg => msg.type !== 'announcement')
  }

  // 过滤消息：显示发给当前用户的消息或没有指定目标用户的全局消息
  // 🔥 修复：排除announcement类型，避免与公告重复
  return allMessages.filter(msg => {
    if (msg.type === 'announcement') return false
    if (!msg.targetUserId) return true
    return String(msg.targetUserId) === String(currentUserId)
  })
})

// 计算属性 - 使用新的消息服务（去重：排除与公告重复的系统消息）
const unreadCount = computed(() => {
  // 🔥 系统消息未读数（messages已排除announcement类型）
  const msgUnread = messages.value.filter(msg => !msg.read).length
  // 🔥 公告未读数（排除静默公告，即用户注册前发布的历史公告）
  const annUnread = (messageStore.announcements || []).filter((a: any) => a.status === 'published' && !a.read && !a.silent).length
  return msgUnread + annUnread
})

const recentMessages = computed(() => {
  // 系统消息（已排除announcement类型）- 按时间排序
  const sortedMessages = [...messages.value]
    .sort((a, b) => {
      const timeA = new Date(a.time).getTime()
      const timeB = new Date(b.time).getTime()
      return timeB - timeA // 倒序：最新的在前
    })

  // 🔥 将公告也合并到消息提醒列表中（仅显示未读且非静默的公告）
  const announcementMessages = (messageStore.announcements || [])
    .filter((a: any) => a.status === 'published' && !a.read && !a.silent)
    .map((a: any) => ({
      id: 'ann_' + a.id,
      title: `📢 ${a.title}`,
      content: a.content ? a.content.replace(/<[^>]+>/g, '').substring(0, 80) : '',
      time: a.publishedAt || a.createdAt,
      read: !!a.read,
      icon: 'ChatDotRound',
      color: a.source === 'system' ? '#f56c6c' : '#409eff',
      type: 'announcement',
      category: a.source === 'system' ? '系统公告' : '公司公告'
    }))

  // 合并并按时间排序
  const allItems = [...sortedMessages, ...announcementMessages]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return allItems.slice(0, 5)
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
    trendLabel: '较昨日',
    icon: 'ShoppingCart',
    color: '#409EFF'
  },
  {
    key: 'customers',
    label: '新增客户',
    value: '0',
    change: '+0%',
    trend: 'up',
    trendLabel: '较昨日',
    icon: 'User',
    color: '#67C23A'
  },
  {
    key: 'revenue',
    label: '今日业绩',
    value: '¥0',
    change: '+0%',
    trend: 'up',
    trendLabel: '较昨日',
    icon: 'TrendCharts',
    color: '#E6A23C'
  },
  {
    key: 'monthly-orders',
    label: '本月单数',
    value: '0',
    change: '+0%',
    trend: 'up',
    trendLabel: '较上月',
    icon: 'DataBoard',
    color: '#722ED1'
  },
  {
    key: 'monthly-revenue',
    label: '本月业绩',
    value: '¥0',
    change: '+0%',
    trend: 'up',
    trendLabel: '较上月',
    icon: 'Coin',
    color: '#13C2C2'
  },
  {
    key: 'service',
    label: '待处理售后',
    value: '0',
    change: '+0%',
    trend: 'up',
    trendLabel: '较昨日',
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
    trendLabel: '较昨日',
    icon: 'DocumentChecked',
    color: '#909399'
  },
  {
    key: 'logistics',
    label: '待发货订单',
    value: '0',
    change: '+0%',
    trendLabel: '较昨日',
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
    trendLabel: '较上月',
    icon: 'CircleCheck',
    color: '#52C41A'
  },
  {
    key: 'monthly-sign-revenue',
    label: '本月签收业绩',
    value: '¥0',
    change: '+0%',
    trend: 'up',
    trendLabel: '较上月',
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

// 快捷操作数据 - 可自定义的快捷入口（带权限控制）
const showQuickSettings = ref(false)
const QUICK_ACTIONS_STORAGE_KEY = 'crm_dashboard_quick_actions'
const QUICK_LAYOUT_STORAGE_KEY = 'crm_dashboard_quick_layout'
const MAX_QUICK_ACTIONS = 6
const CATEGORIES_PER_PAGE = 4

// 布局设置：一行几个按钮（默认2）
const quickActionsColumns = ref<2 | 3>(2)

// 弹窗临时编辑状态
const tempSelectedKeys = ref<string[]>([])
const tempQuickColumns = ref<2 | 3>(2)
const categoryPage = ref(1)

// 所有可选的快捷操作定义（包含权限码映射 + 分类）
interface QuickActionDef extends QuickAction {
  permissions: string[]
  category: string
}

const allQuickActions: QuickActionDef[] = [
  // ── 客户管理 ──
  { key: 'add-customer', label: '新增客户', icon: 'UserFilled', route: '/customer/add',
    color: '#409EFF', gradient: 'linear-gradient(135deg, #409EFF 0%, #1890ff 100%)',
    permissions: ['customer:add', 'customer:add:create', 'customer:list:create'], category: '客户管理' },
  { key: 'customer-list', label: '客户列表', icon: 'User', route: '/customer/list',
    color: '#1890FF', gradient: 'linear-gradient(135deg, #1890FF 0%, #096dd9 100%)',
    permissions: ['customer:list', 'customer:list:view'], category: '客户管理' },
  { key: 'search-customer', label: '客户查询', icon: 'Search', route: '/data/search',
    color: '#E6A23C', gradient: 'linear-gradient(135deg, #E6A23C 0%, #fa8c16 100%)',
    permissions: ['data:search', 'data:search:view'], category: '客户管理' },
  { key: 'customer-tags', label: '客户标签', icon: 'PriceTag', route: '/customer/tags',
    color: '#9C27B0', gradient: 'linear-gradient(135deg, #9C27B0 0%, #7b1fa2 100%)',
    permissions: ['customer:tags', 'customer:tags:view'], category: '客户管理' },
  // ── 订单管理 ──
  { key: 'add-order', label: '新增订单', icon: 'DocumentAdd', route: '/order/add',
    color: '#67C23A', gradient: 'linear-gradient(135deg, #67C23A 0%, #52c41a 100%)',
    permissions: ['order:add', 'order:add:create'], category: '订单管理' },
  { key: 'order-list', label: '订单列表', icon: 'List', route: '/order/list',
    color: '#909399', gradient: 'linear-gradient(135deg, #909399 0%, #606266 100%)',
    permissions: ['order:list', 'order:list:view'], category: '订单管理' },
  { key: 'order-audit', label: '订单审核', icon: 'Stamp', route: '/order/audit',
    color: '#722ED1', gradient: 'linear-gradient(135deg, #722ED1 0%, #531dab 100%)',
    permissions: ['order:audit', 'order:audit:view'], category: '订单管理' },
  // ── 物流管理 ──
  { key: 'search-logistics', label: '物流查询', icon: 'Van', route: '/logistics/list',
    color: '#F56C6C', gradient: 'linear-gradient(135deg, #F56C6C 0%, #ff4d4f 100%)',
    permissions: ['logistics:list', 'logistics:list:view'], category: '物流管理' },
  { key: 'shipping-list', label: '发货列表', icon: 'Box', route: '/logistics/shipping',
    color: '#FA8C16', gradient: 'linear-gradient(135deg, #FA8C16 0%, #d48806 100%)',
    permissions: ['logistics:shipping', 'logistics:shipping:view'], category: '物流管理' },
  { key: 'logistics-track', label: '物流跟踪', icon: 'MapLocation', route: '/logistics/track',
    color: '#00BCD4', gradient: 'linear-gradient(135deg, #00BCD4 0%, #0097a7 100%)',
    permissions: ['logistics:track', 'logistics:track:view'], category: '物流管理' },
  { key: 'logistics-companies', label: '物流公司', icon: 'OfficeBuilding', route: '/logistics/companies',
    color: '#795548', gradient: 'linear-gradient(135deg, #795548 0%, #5d4037 100%)',
    permissions: ['logistics:companies', 'logistics:companies:view'], category: '物流管理' },
  // ── 售后管理 ──
  { key: 'add-service', label: '新建售后', icon: 'Headset', route: '/service/add',
    color: '#E91E63', gradient: 'linear-gradient(135deg, #E91E63 0%, #c2185b 100%)',
    permissions: ['service:add', 'service:add:create'], category: '售后管理' },
  { key: 'service-list', label: '售后订单', icon: 'DocumentChecked', route: '/service/list',
    color: '#13C2C2', gradient: 'linear-gradient(135deg, #13C2C2 0%, #08979c 100%)',
    permissions: ['service:list', 'service:list:view'], category: '售后管理' },
  { key: 'service-data', label: '售后数据', icon: 'DataBoard', route: '/service/data',
    color: '#FF5722', gradient: 'linear-gradient(135deg, #FF5722 0%, #e64a19 100%)',
    permissions: ['service:data', 'service:data:view'], category: '售后管理' },
  // ── 业绩统计 ──
  { key: 'performance-personal', label: '个人业绩', icon: 'TrendCharts', route: '/performance/personal',
    color: '#52C41A', gradient: 'linear-gradient(135deg, #52C41A 0%, #389e0d 100%)',
    permissions: ['performance:personal', 'performance:personal:view'], category: '业绩统计' },
  { key: 'performance-team', label: '团队业绩', icon: 'DataAnalysis', route: '/performance/team',
    color: '#2F54EB', gradient: 'linear-gradient(135deg, #2F54EB 0%, #1d39c4 100%)',
    permissions: ['performance:team', 'performance:team:view'], category: '业绩统计' },
  { key: 'performance-analysis', label: '业绩分析', icon: 'PieChart', route: '/performance/analysis',
    color: '#EB2F96', gradient: 'linear-gradient(135deg, #EB2F96 0%, #c41d7f 100%)',
    permissions: ['performance:analysis', 'performance:analysis:view'], category: '业绩统计' },
  { key: 'performance-share', label: '业绩分享', icon: 'Share', route: '/performance/share',
    color: '#FAAD14', gradient: 'linear-gradient(135deg, #FAAD14 0%, #d48806 100%)',
    permissions: ['performance:share', 'performance:share:view'], category: '业绩统计' },
  // ── 商品管理 ──
  { key: 'product-list', label: '商品列表', icon: 'Goods', route: '/product/list',
    color: '#4CAF50', gradient: 'linear-gradient(135deg, #4CAF50 0%, #388e3c 100%)',
    permissions: ['product:list', 'product:list:view'], category: '商品管理' },
  { key: 'product-inventory', label: '库存管理', icon: 'Files', route: '/product/inventory',
    color: '#FF9800', gradient: 'linear-gradient(135deg, #FF9800 0%, #f57c00 100%)',
    permissions: ['product:inventory', 'product:inventory:view'], category: '商品管理' },
  // ── 财务管理 ──
  { key: 'finance-performance', label: '绩效数据', icon: 'Coin', route: '/finance/performance-data',
    color: '#FFB300', gradient: 'linear-gradient(135deg, #FFB300 0%, #ff8f00 100%)',
    permissions: ['finance:performance_data', 'finance:performance_data:view'], category: '财务管理' },
  // ── 资料管理 ──
  { key: 'data-list', label: '资料列表', icon: 'Folder', route: '/data/list',
    color: '#607D8B', gradient: 'linear-gradient(135deg, #607D8B 0%, #455a64 100%)',
    permissions: ['data:list', 'data:list:view'], category: '资料管理' },
  { key: 'data-recycle', label: '回收站', icon: 'Delete', route: '/data/recycle',
    color: '#9E9E9E', gradient: 'linear-gradient(135deg, #9E9E9E 0%, #757575 100%)',
    permissions: ['data:recycle', 'data:recycle:view'], category: '资料管理' },
  // ── 服务管理 ──
  { key: 'sms-management', label: '短信管理', icon: 'ChatLineSquare', route: '/service-management/sms',
    color: '#3F51B5', gradient: 'linear-gradient(135deg, #3F51B5 0%, #303f9f 100%)',
    permissions: ['service:sms', 'service:sms:view'], category: '服务管理' },
  { key: 'call-management', label: '通话管理', icon: 'Phone', route: '/service-management/call',
    color: '#009688', gradient: 'linear-gradient(135deg, #009688 0%, #00796b 100%)',
    permissions: ['service:call', 'service:call:view'], category: '服务管理' },
  // ── 系统管理 ──
  { key: 'system-users', label: '用户管理', icon: 'UserFilled', route: '/system/users',
    color: '#546E7A', gradient: 'linear-gradient(135deg, #546E7A 0%, #37474f 100%)',
    permissions: ['system:users', 'system:users:view'], category: '系统管理' },
  { key: 'system-departments', label: '部门管理', icon: 'OfficeBuilding', route: '/system/departments',
    color: '#8D6E63', gradient: 'linear-gradient(135deg, #8D6E63 0%, #6d4c41 100%)',
    permissions: ['system:departments', 'system:departments:view'], category: '系统管理' }
]

// 分类图标和颜色映射
const categoryMeta: Record<string, { icon: string; color: string }> = {
  '客户管理': { icon: 'User', color: '#409EFF' },
  '订单管理': { icon: 'ShoppingCart', color: '#67C23A' },
  '物流管理': { icon: 'Van', color: '#F56C6C' },
  '售后管理': { icon: 'Headset', color: '#E91E63' },
  '业绩统计': { icon: 'TrendCharts', color: '#2F54EB' },
  '商品管理': { icon: 'Goods', color: '#4CAF50' },
  '财务管理': { icon: 'Coin', color: '#FFB300' },
  '资料管理': { icon: 'Folder', color: '#607D8B' },
  '服务管理': { icon: 'ChatLineSquare', color: '#3F51B5' },
  '系统管理': { icon: 'Setting', color: '#546E7A' }
}

// 各角色的默认快捷操作
const DEFAULT_QUICK_KEYS_BY_ROLE: Record<string, string[]> = {
  super_admin: ['add-customer', 'add-order', 'search-customer', 'search-logistics'],
  admin: ['add-customer', 'add-order', 'search-customer', 'search-logistics'],
  department_manager: ['add-customer', 'add-order', 'search-customer', 'search-logistics'],
  sales_staff: ['add-customer', 'add-order', 'search-customer', 'search-logistics'],
  customer_service: ['order-list', 'service-list', 'shipping-list', 'search-logistics']
}
const DEFAULT_QUICK_KEYS = ['add-customer', 'add-order', 'search-customer', 'search-logistics']

const selectedQuickKeys = ref<string[]>([...DEFAULT_QUICK_KEYS])

// 权限过滤：严格基于侧边栏菜单可见路径判断快捷操作是否可用
const permittedQuickActions = computed(() => {
  const user = userStore.currentUser
  if (!user) return []
  const userRole = user.role || ''
  const userPerms = userStore.permissions || []
  // 管理员拥有所有快捷操作
  if (userRole === 'super_admin' || userRole === 'admin' || userPerms.includes('*')) {
    return allQuickActions
  }
  // 收集侧边栏当前角色可见的所有二级菜单路径
  const visiblePaths = new Set<string>()
  for (const topMenu of menuConfig) {
    if (!hasMenuPermission(topMenu, userRole, userPerms)) continue
    if (topMenu.path) visiblePaths.add(topMenu.path)
    if (topMenu.children) {
      for (const child of topMenu.children) {
        if (child.path && hasMenuPermission(child, userRole, userPerms)) {
          visiblePaths.add(child.path)
        }
      }
    }
  }
  return allQuickActions.filter(action => visiblePaths.has(action.route))
})

// 按分类组织有权限的操作（用于设置弹窗）
const categorizedActions = computed(() => {
  const map = new Map<string, QuickActionDef[]>()
  for (const action of permittedQuickActions.value) {
    const cat = action.category || '其他'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(action)
  }
  return Array.from(map.entries()).map(([name, actions]) => ({
    name,
    actions,
    icon: categoryMeta[name]?.icon || 'More',
    color: categoryMeta[name]?.color || '#909399'
  }))
})

// 翻页
const totalCategoryPages = computed(() => Math.max(1, Math.ceil(categorizedActions.value.length / CATEGORIES_PER_PAGE)))
const pagedCategories = computed(() => {
  const start = (categoryPage.value - 1) * CATEGORIES_PER_PAGE
  return categorizedActions.value.slice(start, start + CATEGORIES_PER_PAGE)
})

// 实际显示的快捷操作（按选择顺序 + 权限过滤）
const visibleQuickActions = computed(() => {
  const permittedKeys = new Set(permittedQuickActions.value.map(a => a.key))
  return selectedQuickKeys.value
    .filter(key => permittedKeys.has(key))
    .map(key => allQuickActions.find(a => a.key === key))
    .filter(Boolean) as typeof allQuickActions
})

// 打开设置弹窗时，拷贝一份临时编辑数据
const openQuickSettings = () => {
  tempSelectedKeys.value = [...selectedQuickKeys.value]
  tempQuickColumns.value = quickActionsColumns.value
  categoryPage.value = 1
  showQuickSettings.value = true
}

// 点选/取消快捷操作
const toggleQuickAction = (key: string) => {
  const idx = tempSelectedKeys.value.indexOf(key)
  if (idx >= 0) {
    tempSelectedKeys.value.splice(idx, 1)
  } else if (tempSelectedKeys.value.length < MAX_QUICK_ACTIONS) {
    tempSelectedKeys.value.push(key)
  }
}

// 从 localStorage 加载用户自定义的快捷操作
const loadQuickActions = () => {
  const user = userStore.currentUser
  const storageKey = user ? `${QUICK_ACTIONS_STORAGE_KEY}_${user.id}` : QUICK_ACTIONS_STORAGE_KEY
  const layoutKey = user ? `${QUICK_LAYOUT_STORAGE_KEY}_${user.id}` : QUICK_LAYOUT_STORAGE_KEY
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const keys = JSON.parse(stored) as string[]
      if (Array.isArray(keys) && keys.length > 0) {
        selectedQuickKeys.value = keys.slice(0, MAX_QUICK_ACTIONS)
      }
    }
    const layoutVal = localStorage.getItem(layoutKey)
    if (layoutVal === '3') {
      quickActionsColumns.value = 3
    } else {
      quickActionsColumns.value = 2
    }
    if (selectedQuickKeys.value.length > 0) return
  } catch { /* 使用默认值 */ }

  // 使用角色对应的默认快捷操作
  const role = user?.role || ''
  const roleDefaults = DEFAULT_QUICK_KEYS_BY_ROLE[role] || DEFAULT_QUICK_KEYS
  const permittedKeys = new Set(permittedQuickActions.value.map(a => a.key))
  selectedQuickKeys.value = roleDefaults.filter(key => permittedKeys.has(key)).slice(0, MAX_QUICK_ACTIONS)
}

// 保存快捷操作配置
const saveQuickActions = () => {
  const user = userStore.currentUser
  const storageKey = user ? `${QUICK_ACTIONS_STORAGE_KEY}_${user.id}` : QUICK_ACTIONS_STORAGE_KEY
  const layoutKey = user ? `${QUICK_LAYOUT_STORAGE_KEY}_${user.id}` : QUICK_LAYOUT_STORAGE_KEY
  const permittedKeys = new Set(permittedQuickActions.value.map(a => a.key))
  selectedQuickKeys.value = tempSelectedKeys.value.filter(key => permittedKeys.has(key))
  quickActionsColumns.value = tempQuickColumns.value
  localStorage.setItem(storageKey, JSON.stringify(selectedQuickKeys.value))
  localStorage.setItem(layoutKey, String(quickActionsColumns.value))
  showQuickSettings.value = false
  ElMessage.success('快捷操作设置已保存')
}

// 恢复默认快捷操作
const resetQuickActions = () => {
  const role = userStore.currentUser?.role || ''
  const roleDefaults = DEFAULT_QUICK_KEYS_BY_ROLE[role] || DEFAULT_QUICK_KEYS
  const permittedKeys = new Set(permittedQuickActions.value.map(a => a.key))
  tempSelectedKeys.value = roleDefaults.filter(key => permittedKeys.has(key)).slice(0, MAX_QUICK_ACTIONS)
  tempQuickColumns.value = 2
}

// 业绩趋势图表数据
const performanceChartData = ref({
  xAxisData: [] as string[],
  orderData: [] as number[],
  signData: [] as number[],
  orderCountData: [] as number[],
  signCountData: [] as number[],
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
      formatter: function(params: Array<{axisValue: string, value: number, marker: string, seriesName: string, dataIndex: number}>) {
        let result = `${params[0].axisValue}<br/>`
        params.forEach((param) => {
          // 🔥 修复：业绩趋势图显示金额和单数
          const value = `¥${param.value.toLocaleString()}`
          // 根据系列名称获取对应的单数
          let count = 0
          if (param.seriesName === '下单业绩') {
            count = performanceChartData.value.orderCountData[param.dataIndex] || 0
          } else if (param.seriesName === '签收业绩') {
            count = performanceChartData.value.signCountData[param.dataIndex] || 0
          }
          result += `${param.marker}${param.seriesName}: ${value}（${count}单）<br/>`
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
    'data_batch_assigned': '批量分配完成',
    // 在线席位
    'online_seat_full': '席位不足',
    // 公告
    'announcement': '系统公告'
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
  // 🔥 如果是公告类型消息，找到原始公告显示完整内容
  if (message.type === 'announcement' && message.id?.startsWith('ann_')) {
    const annId = message.id.replace('ann_', '')
    const announcement = (messageStore.announcements || []).find((a: any) => a.id === annId)
    if (announcement) {
      // 标记公告为已读
      if (!announcement.read) {
        messageStore.markAnnouncementAsRead(annId)
      }
      // 显示公告详情
      selectedMessage.value = {
        ...message,
        content: announcement.content, // 使用完整的HTML内容
        isAnnouncement: true
      } as any
      showMessageDetailDialog.value = true
      return
    }
  }
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
// 标记所有消息为已读 - 🔥 同时处理系统消息和公告
const markAllAsRead = async () => {
  try {
    // 标记所有系统消息为已读
    await notificationStore.markAllAsReadWithAPI()
    // 🔥 标记所有公告为已读
    await messageStore.markAllAnnouncementsAsRead()
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
    // 🔥 清空系统消息
    await notificationStore.clearAllMessagesWithAPI()
    // 🔥 标记所有公告为已读（公告不删除，只标记已读）
    await messageStore.markAllAnnouncementsAsRead()
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
    console.log('[Dashboard] 本月订单环比:', metricsData.monthlyOrdersChange, '%')
    console.log('[Dashboard] 本月业绩环比:', metricsData.monthlyRevenueChange, '%')

    // 更新指标
    const labels = getMetricLabels()

    // 辅助函数：格式化环比显示，避免-0%的情况
    const formatChange = (change: number | null | undefined): string => {
      const value = change ?? 0
      console.log('[Dashboard] formatChange 输入:', change, '输出:', value)
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

      // 🔥 【守恒定律】后端API只处理了金额拆分，需要前端补充订单数拆分
      // 构建成员ID到订单数调整量的映射
      const orderCountAdjust = new Map<string, number>()
      if (performanceStore.performanceShares) {
        performanceStore.performanceShares.forEach(share => {
          if (share.status !== 'active' && share.status !== 'completed') return
          // 检查分享的订单是否在本月
          const shareOrder = orderStore.orders.find((o: any) =>
            o.orderNumber === share.orderNumber || o.id === share.orderId
          )
          // 🔥 找不到原始订单时，使用分享记录的createTime作为兜底
          const orderTimeStr = shareOrder?.createTime || share.createTime || ''
          if (orderTimeStr) {
            const orderTime = new Date(orderTimeStr.replace(/\//g, '-')).getTime()
            if (orderTime < monthStart.getTime()) return
          }

          const totalSharedPct = (share.shareMembers || []).reduce((sum: number, m: any) => sum + (m.percentage || 0), 0)
          const sharedRatio = totalSharedPct / 100

          // 原始下单人扣减
          const creatorId = String(share.createdById)
          orderCountAdjust.set(creatorId, (orderCountAdjust.get(creatorId) || 0) - sharedRatio)

          // 接收人增加
          ;(share.shareMembers || []).forEach((sm: any) => {
            const receiverId = String(sm.userId)
            const myRatio = (sm.percentage || 0) / 100
            orderCountAdjust.set(receiverId, (orderCountAdjust.get(receiverId) || 0) + myRatio)
          })
        })
      }

      // 转换为排名格式，应用订单数调整
      const salesRankings = members
        .map((m: any) => {
          const adjust = orderCountAdjust.get(String(m.id)) || 0
          return {
            id: m.id,
            name: m.name || m.username || '未知',
            avatar: '',
            department: m.department || '未分配部门',
            orders: Math.max(0, (m.orderCount || 0) + adjust),
            revenue: m.orderAmount || 0
          }
        })
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
      if (share.status !== 'active' && share.status !== 'completed') return

      // 检查分享的订单是否在本月
      const shareOrder = monthOrders.find(o => o.orderNumber === share.orderNumber)
      if (!shareOrder) return

      // 🔥 修复：计算分享出去的总比例，按比例扣减
      const totalSharedPercentage = (share.shareMembers || []).reduce((sum: number, m: any) => sum + (m.percentage || 0), 0)
      const sharedRatio = totalSharedPercentage / 100

      // 【批次207修复】减少原下单员的业绩和订单数
      if (salesMap.has(share.createdById)) {
        const creator = salesMap.get(share.createdById)
        creator.sharedAmount = (creator.sharedAmount || 0) + share.orderAmount * sharedRatio
        if (!creator.sharedOrderCount) {
          creator.sharedOrderCount = 0
        }
        creator.sharedOrderCount += sharedRatio
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
let chartRequestSeq = 0 // 🔥 竞态保护：图表请求序号
const loadRealChartData = async () => {
  const mySeq = ++chartRequestSeq // 记录本次请求序号
  try {
    console.log('[Dashboard] 开始加载图表数据，时间段:', performancePeriod.value, '请求序号:', mySeq)

    // 调用后端API获取图表数据（后端会根据用户角色自动过滤数据）
    const chartData = await dashboardApi.getChartData({ period: performancePeriod.value as 'day' | 'week' | 'month' })
    console.log('[Dashboard] 后端返回图表数据:', chartData, '请求序号:', mySeq)

    // 🔥 竞态保护：如果在等待API返回期间又有新请求，丢弃当前旧请求的结果
    if (mySeq !== chartRequestSeq) {
      console.log('[Dashboard] 图表请求已过期，丢弃结果。当前序号:', mySeq, '最新序号:', chartRequestSeq)
      return
    }

    if (chartData && chartData.revenue && chartData.revenue.length > 0) {
      // 更新业绩趋势图数据
      // 🔥 签收业绩使用 revenue 数组中的 deliveredAmount 字段
      performanceChartData.value = {
        xAxisData: chartData.revenue.map((item: { date: string }) => item.date),
        orderData: chartData.revenue.map((item: { amount: number }) => item.amount),
        signData: chartData.revenue.map((item: { deliveredAmount?: number }) => item.deliveredAmount || 0),
        orderCountData: chartData.revenue.map((item: { orderCount?: number }) => item.orderCount || 0),
        signCountData: chartData.revenue.map((item: { deliveredCount?: number }) => item.deliveredCount || 0),
        title: getPerformanceTitle()
      }
    } else {
      // 如果没有数据，设置空数据
      performanceChartData.value = {
        xAxisData: [],
        orderData: [],
        signData: [],
        orderCountData: [],
        signCountData: [],
        title: getPerformanceTitle()
      }
    }

    // 🔥 对非管理员用户，将接收到的分享业绩叠加到趋势图中（在if-else之后，确保空数据也能执行）
    const curUser = userStore.currentUser
    const isAdminUser = curUser?.role === 'super_admin' || curUser?.role === 'admin'
    const sharesArr = performanceStore.performanceShares || []
    console.log('[Dashboard 图表分享叠加] isAdmin:', isAdminUser, 'userId:', curUser?.id, '分享记录数:', sharesArr.length, 'xAxis长度:', performanceChartData.value.xAxisData.length)
    if (!isAdminUser && curUser?.id && sharesArr.length > 0) {
      // 🔥 如果后端返回空数据（接收人没有自己的订单），需要先生成日期轴框架
      if (performanceChartData.value.xAxisData.length === 0) {
        const now = new Date()
        const period = performancePeriod.value
        if (period === 'day') {
          // 按小时：00:00 ~ 23:00
          for (let h = 0; h < 24; h++) {
            performanceChartData.value.xAxisData.push(`${String(h).padStart(2, '0')}:00`)
            performanceChartData.value.orderData.push(0)
            performanceChartData.value.signData.push(0)
            performanceChartData.value.orderCountData.push(0)
            performanceChartData.value.signCountData.push(0)
          }
        } else if (period === 'week') {
          // 最近7天
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
            const mm = String(d.getMonth() + 1).padStart(2, '0')
            const dd = String(d.getDate()).padStart(2, '0')
            performanceChartData.value.xAxisData.push(`${mm}-${dd}`)
            performanceChartData.value.orderData.push(0)
            performanceChartData.value.signData.push(0)
            performanceChartData.value.orderCountData.push(0)
            performanceChartData.value.signCountData.push(0)
          }
        } else {
          // 本月每天
          const year = now.getFullYear()
          const month = now.getMonth()
          const daysInMonth = new Date(year, month + 1, 0).getDate()
          for (let day = 1; day <= daysInMonth; day++) {
            performanceChartData.value.xAxisData.push(`${day}日`)
            performanceChartData.value.orderData.push(0)
            performanceChartData.value.signData.push(0)
            performanceChartData.value.orderCountData.push(0)
            performanceChartData.value.signCountData.push(0)
          }
        }
        console.log('[Dashboard 图表分享叠加] 已生成日期轴框架:', performanceChartData.value.xAxisData.length, '个点')
      }

      const xAxisDates = performanceChartData.value.xAxisData
      let overlayCount = 0
      sharesArr.forEach(share => {
        if (share.status !== 'active' && share.status !== 'completed') return

        // 🔥 原始下单人：扣除分享出去的比例
        if (String(share.createdById) === String(curUser.id)) {
          const shareOrder = orderStore.orders.find((o: any) =>
            o.orderNumber === share.orderNumber || o.id === share.orderId
          )
          if (shareOrder) {
            const totalSharedPct = share.shareMembers.reduce((sum, m) => sum + m.percentage, 0)
            const sharedRatio = totalSharedPct / 100
            const orderTime = shareOrder.createTime || share.createTime || ''
            const orderDateObj = new Date(String(orderTime).replace(/\//g, '-'))
            if (!isNaN(orderDateObj.getTime())) {
              const dayNum = orderDateObj.getDate()
              const mmS = String(orderDateObj.getMonth() + 1).padStart(2, '0')
              const ddS = String(orderDateObj.getDate()).padStart(2, '0')
              const yyyyS = orderDateObj.getFullYear()
              const hourS = String(orderDateObj.getHours()).padStart(2, '0')
              const candidates = [
                `${dayNum}日`, `${mmS}-${ddS}`, `${yyyyS}-${mmS}-${ddS}`,
                `${Number(mmS)}-${Number(ddS)}`, `${hourS}:00`,
                `${Number(mmS)}/${Number(ddS)}`, `${mmS}/${ddS}`, `${hourS}时`
              ]
              const idx = xAxisDates.findIndex((d: string) => candidates.includes(d))
              if (idx >= 0) {
                const deductAmount = (share.orderAmount || 0) * sharedRatio
                performanceChartData.value.orderData[idx] = Math.round(((performanceChartData.value.orderData[idx] || 0) - deductAmount) * 100) / 100
                performanceChartData.value.orderCountData[idx] = Math.round(((performanceChartData.value.orderCountData[idx] || 0) - sharedRatio) * 100) / 100
                overlayCount++
                console.log('[Dashboard 图表分享叠加] 下单人扣除:', share.orderNumber, '金额:', deductAmount, '日期idx:', idx)
              }
            }
          }
        }

        // 🔥 接收人：增加接收到的比例
        share.shareMembers.forEach(member => {
          if (String(member.userId) !== String(curUser.id)) return
          const myRatio = member.percentage / 100
          const myAmount = (share.orderAmount || 0) * myRatio
          // 用原始订单的时间，找不到就用分享的createTime
          const originalOrder = orderStore.orders.find((o: any) =>
            o.orderNumber === share.orderNumber || o.id === share.orderId
          )
          const orderTime = originalOrder?.createTime || share.createTime || ''
          console.log('[Dashboard 图表分享叠加] 检查分享:', share.id, 'member:', member.userId, '==', curUser.id, 'orderTime:', orderTime, 'amount:', myAmount)
          const orderDateObj = new Date(String(orderTime).replace(/\//g, '-'))
          if (isNaN(orderDateObj.getTime())) {
            console.warn('[Dashboard 图表分享叠加] 日期解析失败:', orderTime)
            return
          }
          const mm = String(orderDateObj.getMonth() + 1).padStart(2, '0')
          const dd = String(orderDateObj.getDate()).padStart(2, '0')
          const yyyy = orderDateObj.getFullYear()
          const dayNum = orderDateObj.getDate()
          const hour = String(orderDateObj.getHours()).padStart(2, '0')
          // 尝试多种日期格式匹配（月模式用"X日"，周模式用"M/D"或"MM-DD"，日模式用"H:00"或"HH:00"）
          const candidates = [
            `${dayNum}日`, `${mm}-${dd}`, `${yyyy}-${mm}-${dd}`,
            `${Number(mm)}-${Number(dd)}`, `${hour}:00`,
            `${Number(mm)}/${Number(dd)}`, `${mm}/${dd}`,
            `${Number(hour)}:00`, `${hour}时`
          ]
          const idx = xAxisDates.findIndex((d: string) => candidates.includes(d))
          console.log('[Dashboard 图表分享叠加] 日期匹配:', dayNum, '日 candidates:', candidates, 'xAxis前3个:', xAxisDates.slice(0, 3), 'idx:', idx)
          if (idx >= 0) {
            performanceChartData.value.orderData[idx] = Math.round(((performanceChartData.value.orderData[idx] || 0) + myAmount) * 100) / 100
            performanceChartData.value.orderCountData[idx] = Math.round(((performanceChartData.value.orderCountData[idx] || 0) + myRatio) * 100) / 100
            overlayCount++
            console.log('[Dashboard 图表分享叠加] ✅ 已叠加:', share.orderNumber, '金额:', myAmount, '到索引:', idx)
          } else {
            console.warn('[Dashboard 图表分享叠加] ❌ 未匹配到日期:', orderTime, 'candidates:', candidates)
          }
        })
      })
      console.log('[Dashboard 图表分享叠加] 共叠加', overlayCount, '条分享数据')
    }

    console.log('[Dashboard] 业绩趋势图数据已更新:', performanceChartData.value)

    let statusData: Array<{ value: number; name: string; amount: number; itemStyle: { color: string } }> = []

    if (chartData && chartData.orderStatus && chartData.orderStatus.length > 0) {
      // 更新订单状态分布图数据
      statusData = chartData.orderStatus.map((item: any) => ({
        value: item.count,
        name: item.status,
        amount: item.amount || 0,
        itemStyle: { color: getStatusColor(item.status) }
      }))
    }

    // 🔥 对非管理员用户，应用分享守恒定律调整订单状态分布（无论后端数据是否为空都执行）
    {
      const currentUser = userStore.currentUser
      const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin'
      const sharesForStatus = performanceStore.performanceShares || []
      console.log('[Dashboard 状态分布分享叠加] isAdmin:', isAdmin, 'userId:', currentUser?.id, '分享记录数:', sharesForStatus.length)
      if (!isAdmin && currentUser?.id && sharesForStatus.length > 0) {
        const statusAdjust = new Map<string, { countDelta: number; amountDelta: number }>()

        const statusNames: Record<string, string> = {
          'pending_transfer': '待流转', 'pending_audit': '待审核', 'audit_rejected': '审核拒绝',
          'pending_shipment': '待发货', 'shipped': '已发货', 'delivered': '已签收',
          'logistics_returned': '物流部退回', 'logistics_cancelled': '物流部取消',
          'package_exception': '包裹异常', 'rejected': '拒收', 'rejected_returned': '拒收已退回',
          'after_sales_created': '已建售后', 'pending_cancel': '待取消', 'cancel_failed': '取消失败',
          'cancelled': '已取消', 'draft': '草稿', 'refunded': '已退款',
          'pending': '待审核', 'paid': '已付款', 'completed': '已完成', 'signed': '已签收'
        }

        const addAdjust = (statusName: string, countDelta: number, amountDelta: number) => {
          if (statusAdjust.has(statusName)) {
            const existing = statusAdjust.get(statusName)!
            existing.countDelta += countDelta
            existing.amountDelta += amountDelta
          } else {
            statusAdjust.set(statusName, { countDelta, amountDelta })
          }
        }

        performanceStore.performanceShares.forEach(share => {
          if (share.status !== 'active' && share.status !== 'completed') return

          // 原始下单人：扣除分享出去的比例
          if (String(share.createdById) === String(currentUser.id)) {
            const shareOrder = orderStore.orders.find((o: any) =>
              o.orderNumber === share.orderNumber || o.id === share.orderId
            )
            if (shareOrder) {
              const totalSharedPct = share.shareMembers.reduce((sum, m) => sum + m.percentage, 0)
              const sharedRatio = totalSharedPct / 100
              const statusName = statusNames[shareOrder.status] || shareOrder.status
              addAdjust(statusName, -sharedRatio, -(share.orderAmount || 0) * sharedRatio)
            }
          }

          // 接收人：增加接收到的比例
          share.shareMembers.forEach(member => {
            if (String(member.userId) === String(currentUser.id)) {
              const originalOrder = orderStore.orders.find((o: any) =>
                o.orderNumber === share.orderNumber || o.id === share.orderId
              )
              const myRatio = member.percentage / 100
              // 🔥 找不到原始订单时（接收人的orderStore没有），归入"已分享接收"类别
              const statusName = originalOrder
                ? (statusNames[originalOrder.status] || originalOrder.status)
                : '已分享接收'
              addAdjust(statusName, myRatio, (share.orderAmount || 0) * myRatio)
            }
          })
        })

        // 应用调整量到状态数据
        statusAdjust.forEach((adjust, statusName) => {
          const existing = statusData.find((d: any) => d.name === statusName)
          if (existing) {
            existing.value = Math.max(0, Math.round((existing.value + adjust.countDelta) * 10) / 10)
            existing.amount = Math.max(0, Math.round((existing.amount + adjust.amountDelta) * 100) / 100)
          } else if (adjust.countDelta > 0) {
            statusData.push({
              value: Math.round(adjust.countDelta * 10) / 10,
              name: statusName,
              amount: Math.round(adjust.amountDelta * 100) / 100,
              itemStyle: { color: getStatusColor(statusName) }
            })
          }
        })

        // 过滤掉 value 为 0 的状态
        statusData = statusData.filter((d: any) => d.value > 0)
      }
    }

    orderStatusChartData.value = statusData
    console.log('[Dashboard] 订单状态分布图数据已更新:', orderStatusChartData.value)

  } catch (error) {
    console.error('[Dashboard] 加载图表数据失败:', error)
    // 如果API失败，保持原有的空数据
    performanceChartData.value = {
      xAxisData: [],
      orderData: [],
      signData: [],
      orderCountData: [],
      signCountData: [],
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

/**
 * 🔥 处理业绩数据更新事件（来自分享页面的取消/创建/编辑操作）
 */
const handlePerformanceDataUpdate = async () => {
  console.log('[Dashboard] 收到业绩数据更新事件，重新加载数据')
  try {
    await Promise.all([
      performanceStore.loadPerformanceShares({ limit: 500 }),
      orderStore.loadOrdersFromAPI?.(true)
    ])
  } catch (e) {
    console.warn('[Dashboard] 重新加载数据失败:', e)
  }
  // 重新计算仪表板数据
  loadDashboardData()
}

onMounted(async () => {
  // 🔥 优化：先显示页面，再加载数据，提升用户体验
  const startTime = Date.now()

  // 🔥 加载用户自定义快捷操作配置
  loadQuickActions()

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

    // 🔥 关键修复：加载业绩分享数据，确保数据看板能正确反映分享调整
    try {
      await performanceStore.loadPerformanceShares({ limit: 500 })
      console.log(`[Dashboard] 业绩分享数据加载完成，共 ${performanceStore.performanceShares?.length || 0} 条`)
    } catch (e) {
      console.warn('[Dashboard] 加载业绩分享数据失败:', e)
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

  // 🔥 关键修复：监听业绩数据更新事件（来自分享页面的取消/创建/编辑操作）
  window.addEventListener('performanceDataUpdate', handlePerformanceDataUpdate)
  window.addEventListener('dataSync', handlePerformanceDataUpdate)
})

onUnmounted(() => {
  // 清理事件监听
  eventBus.off(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChanged)
  eventBus.off(EventNames.REFRESH_ORDER_LIST, handleOrderStatusChanged)

  // 🔥 清理全局事件监听
  window.removeEventListener('performanceDataUpdate', handlePerformanceDataUpdate)
  window.removeEventListener('dataSync', handlePerformanceDataUpdate)
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

.metric-change .trend-period {
  font-size: 10px;
  opacity: 0.6;
  margin-left: 2px;
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
  gap: 12px;
}

.quick-actions.cols-3 {
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #ebeef5;
  background: #fff;
}

.quick-actions.cols-3 .action-item {
  padding: 10px 6px;
  gap: 4px;
}

.action-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #dcdfe6;
  background: #fff;
}

.action-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.quick-actions.cols-3 .action-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
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
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.action-label {
  font-size: 13px;
  color: #303133;
  text-align: center;
  line-height: 1.3;
  word-break: keep-all;
}

.quick-actions.cols-3 .action-label {
  font-size: 12px;
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

  .quick-actions,
  .quick-actions.cols-3 {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
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

/* 公告富文本内容样式 */
.announcement-html-content {
  font-size: 14px;
  line-height: 1.8;
  color: #303133;
  margin-bottom: 16px;
  word-break: break-word;
}

.announcement-html-content :deep(p) {
  margin: 0 0 8px 0;
}

.announcement-html-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.announcement-html-content :deep(a) {
  color: #409eff;
}

.announcement-html-content :deep(blockquote) {
  margin: 8px 0;
  padding: 8px 16px;
  border-left: 4px solid #dcdfe6;
  color: #606266;
  background: #f9f9f9;
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
  background-color: transparent;
}

/* 快捷操作设置按钮 */
.quick-settings-btn {
  opacity: 0.6;
  transition: opacity 0.3s;
}

.quick-actions-card:hover .quick-settings-btn {
  opacity: 1;
}

/* ── 快捷操作设置弹窗（全新UI）── */
.quick-settings-dialog :deep(.el-dialog__header) {
  padding-bottom: 0;
  border-bottom: none;
}

.qs-dialog-header {
  padding-bottom: 4px;
}

.qs-dialog-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.qs-dialog-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
}

/* 布局设置区 */
.qs-layout-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%);
  border-radius: 10px;
  border: 1px solid #d9ecff;
}

.qs-layout-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 修复 radio-button 内图标和文字垂直居中 */
.qs-layout-row :deep(.el-radio-button__inner) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.qs-layout-label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.qs-selected-count {
  font-size: 13px;
  color: #909399;
  padding: 4px 12px;
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s;
}

.qs-selected-count.qs-count-full {
  color: #E6A23C;
  border-color: #faecd8;
  background: #fdf6ec;
}

/* 操作选择容器 */
.qs-actions-container {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.qs-actions-container::-webkit-scrollbar {
  width: 4px;
}

.qs-actions-container::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 4px;
}

/* 分类 */
.qs-category {
  margin-bottom: 16px;
}

.qs-category:last-child {
  margin-bottom: 0;
}

.qs-category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
  padding-left: 2px;
}

/* 分类内网格 */
.qs-category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

/* 操作卡片 */
.qs-action-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
  background: #fff;
  user-select: none;
}

.qs-action-card:hover {
  border-color: #c0c4cc;
  background: #f5f7fa;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.qs-action-card.qs-action-selected {
  border-color: #409EFF;
  background: #ecf5ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.qs-action-card.qs-action-disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.qs-action-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.qs-action-name {
  font-size: 13px;
  color: #303133;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qs-action-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #409EFF;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  animation: qs-check-pop 0.25s ease;
}

@keyframes qs-check-pop {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 翻页 */
.qs-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.qs-page-info {
  font-size: 13px;
  color: #909399;
}

/* 底部按钮 */
.qs-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.qs-dialog-footer > div {
  display: flex;
  gap: 8px;
}

.quick-actions-empty {
  grid-column: 1 / -1;
  padding: 16px 0;
}
</style>
