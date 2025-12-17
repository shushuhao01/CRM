﻿<template>
  <LogisticsStatusPermission>
    <div class="logistics-status-update">
    <!-- 数据汇总卡片 -->
    <div class="summary-cards">
      <div class="summary-header">
        <h3>数据汇总</h3>
        <div class="auto-refresh-controls">
          <el-tooltip content="切换自动刷新">
            <el-button
              :type="isAutoRefreshEnabled ? 'success' : 'info'"
              :icon="isAutoRefreshEnabled ? 'Refresh' : 'VideoPause'"
              circle
              size="small"
              @click="toggleAutoRefresh"
            />
          </el-tooltip>
          <el-tooltip content="手动刷新">
            <el-button
              type="primary"
              icon="Refresh"
              circle
              size="small"
              @click="refreshData"
            />
          </el-tooltip>
          <span class="refresh-status" v-if="isAutoRefreshEnabled">
            <el-icon class="refresh-icon"><Loading /></el-icon>
            实时更新中
          </span>
        </div>
      </div>
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="summary-card">
            <div class="card-content">
              <div class="card-icon pending">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-title">待更新</div>
                <div class="card-value">{{ summaryData.pending }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="summary-card">
            <div class="card-content">
              <div class="card-icon updated">
                <el-icon><Check /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-title">已更新</div>
                <div class="card-value">{{ summaryData.updated }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="summary-card">
            <div class="card-content">
              <div class="card-icon todo">
                <el-icon><Timer /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-title">待办</div>
                <div class="card-value">{{ summaryData.todo }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="summary-card">
            <div class="card-content">
              <div class="card-icon total">
                <el-icon><DataLine /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-title">总计</div>
                <div class="card-value">{{ summaryData.total }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 快捷筛选 -->
    <div class="quick-filters">
      <el-button
        v-for="filter in quickFilters"
        :key="filter.value"
        :type="activeQuickFilter === filter.value ? 'primary' : ''"
        @click="handleQuickFilter(filter.value)"
        class="filter-button"
        round
      >
        {{ filter.label }}
      </el-button>
    </div>

    <!-- 搜索和筛选区域 -->
    <div class="search-filters">
      <el-row :gutter="20">
        <el-col :span="6">
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
        </el-col>
        <el-col :span="6">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索订单号、客户名称"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select
            v-model="statusFilter"
            placeholder="选择状态"
            clearable
            @change="handleStatusFilter"
          >
            <el-option label="已发货" value="shipped" />
            <el-option label="已签收" value="delivered" />
            <el-option label="拒收" value="rejected" />
            <el-option label="拒收已退回" value="returned" />
            <el-option label="退货退款" value="refunded" />
            <el-option label="状态异常" value="abnormal" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="refreshData">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 订单列表导航 -->
    <div class="list-navigation">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="待更新" name="pending">
          <template #label>
            <span>待更新 <el-badge :value="summaryData.pending" class="item pending-badge" /></span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="已更新" name="updated">
          <template #label>
            <span>已更新</span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="待办" name="todo">
          <template #label>
            <span>待办 <el-badge :value="summaryData.todo" class="item todo-badge" /></span>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 自动同步设置 -->
    <AutoSyncSettings />

    <!-- 订单列表 -->
    <div class="order-list">
      <el-table
        v-loading="loading"
        :data="orderList"
        stripe
        @selection-change="handleSelectionChange"
      >
        <template #empty>
          <div class="empty-data">
            <el-empty
              :description="getEmptyDescription()"
              :image-size="120"
            />
          </div>
        </template>
        <el-table-column type="selection" width="50" />
        <el-table-column prop="index" label="序号" width="60" />
        <el-table-column prop="orderNo" label="订单号" min-width="140" show-overflow-tooltip />
        <el-table-column prop="customerName" label="客户名称" min-width="100" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" min-width="90">
          <template #default="{ row }">
            <el-tag :style="getOrderStatusStyle(row.status)" size="small" effect="plain">
              {{ getUnifiedStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" min-width="90">
          <template #default="{ row }">
            ¥{{ row.amount }}
          </template>
        </el-table-column>
        <el-table-column prop="trackingNo" label="快递单号" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="row.trackingNo" class="tracking-no-cell">
              <el-button
                type="text"
                @click="handleViewTracking(row)"
              >
                {{ row.trackingNo }}
              </el-button>
              <el-tooltip content="查询物流" placement="top">
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click.stop="handleTrackingNoClick(row.trackingNo, row.logisticsCompany)"
                  class="search-tracking-btn"
                >
                  <el-icon><Search /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="latestUpdate" label="物流最新动态" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tooltip
              :content="row.latestUpdate"
              placement="top"
              v-if="row.latestUpdate"
            >
              <div class="logistics-update">
                {{ row.latestUpdate }}
              </div>
            </el-tooltip>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="assignedToName" label="归属人" min-width="90" show-overflow-tooltip />
        <el-table-column prop="orderDate" label="下单日期" min-width="110" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewOrder(row)">查看</el-button>
            <el-button
              size="small"
              type="primary"
              @click="updateStatus(row)"
            >
              更新状态
            </el-button>
            <el-button
              size="small"
              type="warning"
              @click="setTodo(row)"
              v-if="activeTab === 'pending' || activeTab === 'updated'"
            >
              {{ row.isTodo ? '取消待办' : '待办' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 状态更新弹窗 -->
    <StatusUpdateDialog
      v-model="statusDialogVisible"
      :order-info="currentOrder"
      :selected-orders="selectedOrders"
      @success="handleUpdateSuccess"
    />

    <!-- 待办设置弹窗 -->
    <TodoDialog
      v-model="todoDialogVisible"
      :order-info="currentOrder"
      @success="handleTodoSuccess"
    />

    <!-- 物流轨迹弹窗 -->
    <TrackingDialog
      v-model="trackingDialogVisible"
      :tracking-no="currentTrackingNo"
      :logistics-company="currentLogisticsCompany"
    />

    <!-- 订单详情弹窗 -->
    <OrderDetailDialog
      v-model:visible="orderDetailDialogVisible"
      :order="currentOrder"
      :show-action-buttons="activeTab === 'pending'"
      @update-status="handleDetailUpdateStatus"
      @set-todo="handleDetailSetTodo"
    />

    </div>
  </LogisticsStatusPermission>
</template>

<script setup lang="ts">
import { ref, reactive, computed, provide, onMounted, onUnmounted, watch } from 'vue'
import LogisticsStatusPermission from '@/components/Permission/LogisticsStatusPermission.vue'
import StatusUpdateDialog from '@/components/Logistics/StatusUpdateDialog.vue'
import TodoDialog from '@/components/Logistics/TodoDialog.vue'
import TrackingDialog from '@/components/Logistics/TrackingDialog.vue'
import AutoSyncSettings from '@/components/Logistics/AutoSyncSettings.vue'
import OrderDetailDialog from './components/OrderDetailDialog.vue'
import { useLogisticsStatusStore } from '@/stores/logisticsStatus'
import { useOrderStore } from '@/stores/order'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'
import { getCompanyShortName, getTrackingUrl, KUAIDI100_URL } from '@/utils/logisticsCompanyConfig'
import {
  Clock,
  Check,
  Timer,
  DataLine,
  Search,
  Refresh,
  Loading
} from '@element-plus/icons-vue'

// Store
const _logisticsStatusStore = useLogisticsStatusStore()
const orderStore = useOrderStore()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const activeTab = ref('pending')
// 🔥 修复：默认选择"全部"，不进行日期筛选
const activeQuickFilter = ref('all')
const dateRange = ref<[string, string]>(['', ''])
const searchKeyword = ref('')
const statusFilter = ref('')
const orderList = ref<any[]>([])
const selectedOrders = ref<any[]>([])
const currentOrder = ref<any>(null)

// 计算选中订单数量
const selectedCount = computed(() => selectedOrders.value.length)

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 对话框控制
const statusDialogVisible = ref(false)
const todoDialogVisible = ref(false)
const trackingDialogVisible = ref(false)
const orderDetailDialogVisible = ref(false)
const currentTrackingNo = ref('')
const currentLogisticsCompany = ref('')

// 实时更新相关
const autoRefreshTimer = ref<NodeJS.Timeout | null>(null)
const autoRefreshInterval = ref(30000) // 30秒自动刷新
const isAutoRefreshEnabled = ref(true)

// 汇总数据
const summaryData = reactive({
  pending: 0,
  updated: 0,
  todo: 0,
  total: 0
})

// 快捷筛选选项
const quickFilters = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '3天前', value: '3days' },
  { label: '5天前', value: '5days' },
  { label: '10天前', value: '10days' },
  { label: '本周', value: 'week' },
  { label: '30天', value: '30days' },
  { label: '今年', value: 'year' },
  { label: '全部', value: 'all' }
]

// 获取用户显示名称（真实姓名）
const getUserDisplayName = (userId: string | undefined): string => {
  if (!userId) return ''
  // 从userStore获取用户信息
  const users = userStore.users || []
  const user = users.find((u: any) => u.id === userId || (u as any).username === userId)
  if (user) {
    return (user as any).realName || user.name || (user as any).username || ''
  }
  return ''
}

// 方法
const handleQuickFilter = (value: string) => {
  activeQuickFilter.value = value
  // 根据快捷筛选设置日期范围
  const today = new Date()
  const formatDate = (date: Date) => date.toISOString().split('T')[0]

  switch (value) {
    case 'today':
      dateRange.value = [formatDate(today), formatDate(today)]
      break
    case 'yesterday':
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      dateRange.value = [formatDate(yesterday), formatDate(yesterday)]
      break
    case '3days':
      // 3天前：筛选发货日期在3天前及更早的订单（需要关注的老订单）
      const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
      // 开始日期设为90天前，覆盖大部分需要关注的订单
      const ninetyDaysAgo3 = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
      dateRange.value = [formatDate(ninetyDaysAgo3), formatDate(threeDaysAgo)]
      break
    case '5days':
      // 5天前：筛选发货日期在5天前及更早的订单
      const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
      const ninetyDaysAgo5 = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
      dateRange.value = [formatDate(ninetyDaysAgo5), formatDate(fiveDaysAgo)]
      break
    case '10days':
      // 10天前：筛选发货日期在10天前及更早的订单
      const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
      const ninetyDaysAgo10 = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
      dateRange.value = [formatDate(ninetyDaysAgo10), formatDate(tenDaysAgo)]
      break
    case 'week':
      const weekStart = new Date(today.getTime() - (today.getDay() - 1) * 24 * 60 * 60 * 1000)
      dateRange.value = [formatDate(weekStart), formatDate(today)]
      break
    case '30days':
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      dateRange.value = [formatDate(thirtyDaysAgo), formatDate(today)]
      break
    case 'year':
      const yearStart = new Date(today.getFullYear(), 0, 1)
      dateRange.value = [formatDate(yearStart), formatDate(today)]
      break
    case 'all':
      dateRange.value = ['', '']
      break
  }
  pagination.currentPage = 1
  loadData()
}

const handleDateChange = () => {
  pagination.currentPage = 1
  loadData()
}

const handleSearch = () => {
  pagination.currentPage = 1
  loadData()
}

const handleStatusFilter = () => {
  pagination.currentPage = 1
  loadData()
}

const handleTabChange = (tab: string) => {
  activeTab.value = tab
  pagination.currentPage = 1
  loadData()
}

const handleSelectionChange = (selection: any[]) => {
  selectedOrders.value = selection
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  loadData()
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  loadData()
}

const viewOrder = (row: any) => {
  currentOrder.value = row
  orderDetailDialogVisible.value = true
}

const updateStatus = (row: any) => {
  currentOrder.value = row
  selectedOrders.value = []
  statusDialogVisible.value = true
}

const handleBatchUpdateStatus = () => {
  if (!selectedOrders.value || selectedOrders.value.length === 0) {
    ElMessage.warning('请选择要更新的订单')
    return
  }
  currentOrder.value = null
  statusDialogVisible.value = true
}

// 提供给子组件AutoSyncSettings使用
provide('selectedCount', selectedCount)
provide('handleBatchUpdate', handleBatchUpdateStatus)

const setTodo = (row: any) => {
  currentOrder.value = row
  todoDialogVisible.value = true
}

const handleUpdateSuccess = (updatedInfo?: { orders: any[], newStatus: string }) => {
  ElMessage.success('状态更新成功')

  // 重新加载当前标签页的数据
  loadData()
  loadSummaryData(true) // 重新加载汇总数据并显示动画
  selectedOrders.value = []

  // 如果有更新的订单信息，并且当前在待更新标签页，显示提示
  if (updatedInfo && activeTab.value === 'pending') {
    const statusText = getStatusText(updatedInfo.newStatus)
    const orderCount = updatedInfo.orders.length
    if (orderCount === 1) {
      ElMessage.info(`订单已更新为"${statusText}"状态，可在"已更新"标签页查看`)
    } else {
      ElMessage.info(`${orderCount}个订单已更新为"${statusText}"状态，可在"已更新"标签页查看`)
    }
  }

  // 通知其他页面数据已更新
  window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
    detail: {
      timestamp: Date.now(),
      updatedOrders: updatedInfo?.orders || [],
      newStatus: updatedInfo?.newStatus
    }
  }))
}

const handleTodoSuccess = () => {
  ElMessage.success('待办设置成功')
  loadData() // 重新加载订单列表
  loadSummaryData(true) // 重新加载汇总数据并显示动画

  // 通知其他页面数据已更新
  window.dispatchEvent(new CustomEvent('todoStatusUpdated', {
    detail: { timestamp: Date.now() }
  }))
}

// 处理详情对话框中的更新状态按钮
const handleDetailUpdateStatus = (order: any) => {
  orderDetailDialogVisible.value = false
  currentOrder.value = order
  selectedOrders.value = []
  statusDialogVisible.value = true
}

// 处理详情对话框中的设置待办按钮
const handleDetailSetTodo = (order: any) => {
  orderDetailDialogVisible.value = false
  currentOrder.value = order
  todoDialogVisible.value = true
}

// 处理订单发货事件
const handleOrderShipped = (event: CustomEvent) => {
  console.log('检测到订单发货事件:', event.detail)

  // 刷新数据以显示新发货的订单
  loadData()
  loadSummaryData(true)

  // 如果当前在待更新标签页，显示提示
  if (activeTab.value === 'pending') {
    ElMessage.info('检测到新的发货订单，已自动刷新列表')
  }
}

// 处理订单状态更新事件（来自订单系统）
const handleOrderStatusUpdate = (event: CustomEvent) => {
  const { orderId, oldStatus, newStatus, operator } = event.detail
  console.log('检测到订单状态更新:', { orderId, oldStatus, newStatus, operator })

  // 如果订单状态变更为已发货，则刷新物流状态页面
  if (newStatus === 'shipped') {
    loadData()
    loadSummaryData(true)

    // 显示提示信息
    ElMessage.success(`订单 ${orderId} 已发货，已同步到物流状态列表`)
  }
  // 如果是其他状态变更，也刷新数据以保持同步
  else if (['delivered', 'rejected', 'returned', 'abnormal'].includes(newStatus)) {
    loadData()
    loadSummaryData(true)
  }
}

// 处理其他页面的订单状态更新事件
const handleExternalOrderStatusUpdate = (event: CustomEvent) => {
  console.log('检测到外部订单状态更新:', event.detail)

  // 刷新数据
  loadData()
  loadSummaryData(true)
}

// 查看物流轨迹
const handleViewTracking = (order: any) => {
  currentTrackingNo.value = order.trackingNo
  currentLogisticsCompany.value = order.logisticsCompany
  trackingDialogVisible.value = true
}

// 🔥 点击查询图标：复制单号并弹窗选择查询网站
const handleTrackingNoClick = async (trackingNo: string, logisticsCompany?: string) => {
  // 复制物流单号
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(trackingNo)
      ElMessage.success('快递单号已复制到剪贴板')
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = trackingNo
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const result = document.execCommand('copy')
      document.body.removeChild(textArea)
      if (result) {
        ElMessage.success('快递单号已复制到剪贴板')
      } else {
        ElMessage.error('复制失败，请手动复制')
        return
      }
    }
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
    return
  }

  // 根据物流公司动态获取官网按钮名称和URL
  const companyShortName = getCompanyShortName(logisticsCompany || '')
  const companyUrl = getTrackingUrl(logisticsCompany || '', trackingNo)
  const kuaidi100Url = KUAIDI100_URL.replace('{trackingNo}', trackingNo)

  // 提示选择跳转网站
  ElMessageBox.confirm(
    '请选择要跳转的查询网站',
    '选择查询网站',
    {
      confirmButtonText: `${companyShortName}官网`,
      cancelButtonText: '快递100',
      distinguishCancelAndClose: true,
      type: 'info'
    }
  ).then(() => {
    window.open(companyUrl, '_blank')
  }).catch((action) => {
    if (action === 'cancel') {
      window.open(kuaidi100Url, '_blank')
    }
  })
}


const refreshData = () => {
  loadData(true) // 手动刷新时显示消息
  loadSummaryData(true) // 刷新时显示动画
}

// 启动自动刷新
const startAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
  }

  if (isAutoRefreshEnabled.value) {
    autoRefreshTimer.value = setInterval(() => {
      loadSummaryData(true) // 自动刷新时显示动画
    }, autoRefreshInterval.value)
  }
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

// 切换自动刷新状态
const toggleAutoRefresh = () => {
  isAutoRefreshEnabled.value = !isAutoRefreshEnabled.value
  if (isAutoRefreshEnabled.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

const loadData = async (showMessage = false) => {
  loading.value = true
  try {
    // 🔥 直接从API获取已发货订单，确保数据实时性
    let allOrders: any[] = []
    try {
      const { orderApi } = await import('@/api/order')
      const response = await orderApi.getShippingShipped() as any
      // 🔥 修复：正确解析API响应数据
      allOrders = response?.data?.list || response?.list || response?.data || []
      console.log('[状态更新] 从API获取已发货订单:', allOrders.length, '条')
      console.log('[状态更新] API响应结构:', {
        hasData: !!response?.data,
        hasList: !!response?.data?.list,
        directList: !!response?.list,
        responseKeys: Object.keys(response || {})
      })
    } catch (apiError) {
      console.warn('[状态更新] API获取失败，回退到store:', apiError)
      // 回退到store获取
      await orderStore.loadOrdersFromAPI(true)
      allOrders = orderStore.getOrders()
    }

    // 筛选已发货的订单（只要是已发货状态就显示，不再强制要求物流单号）
    let shippedOrders = allOrders.filter(order => {
      // 检查订单状态是否为已发货相关状态
      const validStatuses = ['shipped', 'delivered', 'in_transit', 'out_for_delivery', 'rejected', 'rejected_returned']
      const isShipped = validStatuses.includes(order.status)
      if (!isShipped) {
        return false
      }

      // 记录物流信息（仅用于日志，不作为筛选条件）
      const trackingNo = order.trackingNumber || order.expressNo
      const hasTrackingNumber = !!(trackingNo && trackingNo.trim() !== '')
      const hasExpressCompany = order.expressCompany && order.expressCompany.trim() !== ''

      console.log(`[状态更新] ✅ 订单 ${order.orderNumber} 通过筛选`, {
        status: order.status,
        trackingNumber: trackingNo || '未设置',
        expressCompany: order.expressCompany || '未设置',
        hasTrackingNumber,
        hasExpressCompany
      })
      return true
    })

    console.log(`[状态更新] 筛选出 ${shippedOrders.length} 个已发货订单（总订单数：${allOrders.length}）`)

    // 🔥 调试：输出订单状态分布（日期筛选前）
    const statusDistribution: Record<string, number> = {}
    const logisticsStatusDistribution: Record<string, number> = {}
    shippedOrders.forEach(order => {
      statusDistribution[order.status] = (statusDistribution[order.status] || 0) + 1
      const ls = order.logisticsStatus || '(空)'
      logisticsStatusDistribution[ls] = (logisticsStatusDistribution[ls] || 0) + 1
    })
    console.log('[状态更新] 订单状态分布:', statusDistribution)
    console.log('[状态更新] 物流状态分布:', logisticsStatusDistribution)
    console.log('[状态更新] 当前标签页:', activeTab.value)
    console.log('[状态更新] 日期范围:', dateRange.value)

    // 🔥 辅助函数：从日期字符串提取日期部分（支持多种格式）
    const extractDatePart = (dateStr: string) => {
      if (!dateStr) return ''
      try {
        // 处理 "2025/12/15 10:24:00" 格式
        if (dateStr.includes('/')) {
          return dateStr.split(' ')[0].replace(/\//g, '-')
        }
        // 处理 ISO 格式 "2025-12-15T10:24:00.000Z"
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return dateStr.split(' ')[0]
        return date.toISOString().split('T')[0]
      } catch {
        return dateStr.split(' ')[0]
      }
    }

    // 🔥 先进行日期筛选（在tab筛选之前）
    const beforeDateFilter = shippedOrders.length
    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      const [startDate, endDate] = dateRange.value
      console.log(`[状态更新] 日期筛选: ${startDate} ~ ${endDate}`)
      shippedOrders = shippedOrders.filter(order => {
        const shippingTime = order.shippedAt || order.shippingTime || order.shipTime || order.createTime
        const shippingDate = extractDatePart(shippingTime)
        const pass = shippingDate >= startDate && shippingDate <= endDate
        if (!pass && shippedOrders.length < 10) {
          console.log(`[状态更新] 订单 ${order.orderNumber} 被日期筛选过滤: ${shippingDate} 不在 ${startDate}~${endDate} 范围内`)
        }
        return pass
      })
      console.log(`[状态更新] 日期筛选后: ${beforeDateFilter} -> ${shippedOrders.length}`)
    } else if (dateRange.value && dateRange.value.length === 2 && dateRange.value[1] && !dateRange.value[0]) {
      // 如果只有endDate（用于"X天前"筛选）
      const endDate = dateRange.value[1]
      console.log(`[状态更新] 日期筛选(X天前): <= ${endDate}`)
      shippedOrders = shippedOrders.filter(order => {
        const shippingTime = order.shippedAt || order.shippingTime || order.shipTime || order.createTime
        const shippingDate = extractDatePart(shippingTime)
        return shippingDate <= endDate
      })
      console.log(`[状态更新] 日期筛选后: ${beforeDateFilter} -> ${shippedOrders.length}`)
    } else {
      console.log('[状态更新] 无日期筛选（全部）')
    }

    // 🔥 再进行tab筛选
    if (activeTab.value === 'pending') {
      // 待更新 = 订单状态为shipped的订单
      const beforeFilter = shippedOrders.length
      shippedOrders = shippedOrders.filter(order => order.status === 'shipped')
      console.log(`[状态更新] 待更新筛选: ${beforeFilter} -> ${shippedOrders.length}`)
    } else if (activeTab.value === 'updated') {
      // 已更新 = 订单状态为delivered/rejected等终态的订单
      const beforeFilter = shippedOrders.length
      shippedOrders = shippedOrders.filter(order => order.status !== 'shipped')
      console.log(`[状态更新] 已更新筛选: ${beforeFilter} -> ${shippedOrders.length}`)
    } else if (activeTab.value === 'todo') {
      // 待办：标记为待办的订单
      shippedOrders = shippedOrders.filter(order =>
        order.isTodo === true || order.logisticsStatus === 'todo'
      )
    }

    // 🔥 输出最终筛选结果
    console.log(`[状态更新] 最终筛选结果: ${shippedOrders.length} 条订单`)
    if (shippedOrders.length > 0 && shippedOrders.length <= 5) {
      shippedOrders.forEach(o => console.log(`  - ${o.orderNumber}: status=${o.status}`))
    }

    // 关键词搜索
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase()
      shippedOrders = shippedOrders.filter(order =>
        order.orderNumber.toLowerCase().includes(keyword) ||
        order.customerName.toLowerCase().includes(keyword) ||
        (order.trackingNumber && order.trackingNumber.toLowerCase().includes(keyword)) ||
        (order.expressNo && order.expressNo.toLowerCase().includes(keyword))
      )
    }

    // 状态筛选
    if (statusFilter.value) {
      shippedOrders = shippedOrders.filter(order =>
        order.logisticsStatus === statusFilter.value
      )
    }

    // 按发货时间倒序排序（最新的在上面）
    shippedOrders.sort((a, b) => {
      const timeA = new Date(a.shippingTime || a.shipTime || a.createTime || 0).getTime()
      const timeB = new Date(b.shippingTime || b.shipTime || b.createTime || 0).getTime()
      return timeB - timeA // 倒序：最新的在上面
    })

    // 转换为物流状态格式
    const logisticsData = shippedOrders.map((order, index) => ({
      id: order.id,
      index: (pagination.currentPage - 1) * pagination.pageSize + index + 1,
      orderNo: order.orderNumber,
      customerName: order.customerName,
      // 🔥 修复：status字段应该显示订单状态，而不是物流状态
      status: order.status || 'shipped',
      // 保留物流状态字段用于其他用途
      logisticsStatus: order.logisticsStatus || '',
      amount: order.totalAmount,
      trackingNo: order.trackingNumber || order.expressNo || '',
      logisticsCompany: order.expressCompany || '',
      latestUpdate: order.logisticsHistory && order.logisticsHistory.length > 0
        ? order.logisticsHistory[order.logisticsHistory.length - 1].description
        : (order.statusHistory && order.statusHistory.length > 0
          ? order.statusHistory[order.statusHistory.length - 1].description
          : ''),
      assignedTo: order.salesPersonId || order.createdBy || '',
      assignedToName: order.createdByName || order.salesPersonName || getUserDisplayName(order.salesPersonId || order.createdBy) || order.createdBy || '-',
      orderDate: formatOrderDate(order.createTime),
      shippingTime: order.shippingTime || order.shipTime || order.createTime,
      customerPhone: order.receiverPhone || order.customerPhone,
      productName: order.products?.map((p: any) => p.name).join('、') || '商品',
      quantity: order.products?.reduce((sum: number, p: any) => sum + p.quantity, 0) || 1,
      remark: order.remark || '',
      isTodo: order.isTodo || false
    }))

    // 分页处理
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    orderList.value = logisticsData.slice(startIndex, endIndex)
    pagination.total = logisticsData.length

    if (showMessage) {
      ElMessage.success('数据刷新成功')
    }
  } catch (error) {
    console.error('订单列表加载失败:', error)
    orderList.value = []
    pagination.total = 0

    if (showMessage) {
      ElMessage.error('数据加载失败，请检查网络连接或联系管理员')
    }
  } finally {
    loading.value = false
  }
}



const loadSummaryData = async (showAnimation = false) => {
  try {
    // 🔥 修复：从API获取已发货订单，与loadData保持一致
    let allOrders: any[] = []
    try {
      const { orderApi } = await import('@/api/order')
      const response = await orderApi.getShippingShipped() as any
      allOrders = response?.data?.list || response?.list || response?.data || []
    } catch {
      // 回退到store
      allOrders = orderStore.getOrders()
    }

    // 筛选已发货的订单（只要是已发货状态就显示，不再强制要求物流单号）
    let shippedOrders = allOrders.filter((order: any) => {
      // 检查订单状态是否为已发货相关状态
      const validStatuses = ['shipped', 'delivered', 'in_transit', 'out_for_delivery', 'rejected', 'rejected_returned']
      return validStatuses.includes(order.status)
    })

    // 按发货时间筛选（如果有日期范围参数）
    // 辅助函数：从日期字符串提取日期部分（支持ISO格式和普通格式）
    const extractDatePartForSummary = (dateStr: string) => {
      if (!dateStr) return ''
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return dateStr.split(' ')[0]
        return date.toISOString().split('T')[0]
      } catch {
        return dateStr.split(' ')[0]
      }
    }

    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      const [startDate, endDate] = dateRange.value
      shippedOrders = shippedOrders.filter(order => {
        const shippingTime = order.shippingTime || order.shipTime || order.createTime
        const shippingDate = extractDatePartForSummary(shippingTime)
        return shippingDate >= startDate && shippingDate <= endDate
      })
    } else if (dateRange.value && dateRange.value.length === 2 && dateRange.value[1]) {
      const endDate = dateRange.value[1]
      shippedOrders = shippedOrders.filter(order => {
        const shippingTime = order.shippingTime || order.shipTime || order.createTime
        const shippingDate = extractDatePartForSummary(shippingTime)
        return shippingDate <= endDate
      })
    }

    // 🔥 修复：计算各状态的数量（与列表筛选逻辑保持一致）
    // 待更新 = 订单状态为shipped的订单（已发货但未签收）
    const pending = shippedOrders.filter(order => order.status === 'shipped').length
    // 已更新 = 订单状态不是shipped的订单（已签收、拒收等终态）
    const updated = shippedOrders.filter(order => order.status !== 'shipped').length
    // 待办 = 标记为待办的订单
    const todo = shippedOrders.filter(order => order.isTodo === true || order.logisticsStatus === 'todo').length
    const total = shippedOrders.length

    console.log('[状态更新] 汇总数据计算:', { pending, updated, todo, total })

    const newSummaryData = {
      pending,
      updated,
      todo,
      total
    }

    // 如果需要动画效果，先清零再更新
    if (showAnimation) {
      const oldData = { ...summaryData }
      summaryData.pending = 0
      summaryData.updated = 0
      summaryData.todo = 0
      summaryData.total = 0

      // 延迟更新以显示动画
      setTimeout(() => {
        animateNumber('pending', oldData.pending, newSummaryData.pending)
        animateNumber('updated', oldData.updated, newSummaryData.updated)
        animateNumber('todo', oldData.todo, newSummaryData.todo)
        animateNumber('total', oldData.total, newSummaryData.total)
      }, 100)
    } else {
      // 直接更新数据
      Object.assign(summaryData, newSummaryData)
    }
  } catch (error) {
    console.error('汇总数据加载失败:', error)
    // 重置为0，显示真实的错误状态
    summaryData.pending = 0
    summaryData.updated = 0
    summaryData.todo = 0
    summaryData.total = 0
    ElMessage.error('汇总数据加载失败')
  }
}

// 数字动画函数
const animateNumber = (key: keyof typeof summaryData, from: number, to: number) => {
  const duration = 1000 // 1秒动画
  const steps = 30
  const stepValue = (to - from) / steps
  let currentStep = 0

  const timer = setInterval(() => {
    currentStep++
    if (currentStep >= steps) {
      summaryData[key] = to
      clearInterval(timer)
    } else {
      summaryData[key] = Math.round(from + stepValue * currentStep)
    }
  }, duration / steps)
}

// 获取空数据提示文本
const getEmptyDescription = () => {
  switch (activeTab.value) {
    case 'pending':
      return '暂无待更新订单'
    case 'updated':
      return '暂无已发货订单'
    case 'todo':
      return '暂无待办订单'
    default:
      return '暂无数据'
  }
}

// 格式化订单日期（处理ISO格式和普通格式）
const formatOrderDate = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}/${month}/${day} ${hours}:${minutes}`
  } catch {
    return dateStr
  }
}

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待发货',
    shipped: '已发货',
    delivered: '已签收',
    rejected: '拒收',
    returned: '拒收已退回',
    refunded: '退货退款',
    abnormal: '状态异常',
    todo: '待办'
  }
  return statusMap[status] || status
}

// 获取状态类型
const _getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    pending: 'warning',
    shipped: 'primary',           // 已发货用蓝色
    delivered: 'success',         // 已签收用绿色
    rejected: 'warning',
    returned: 'danger',
    refunded: 'danger',
    abnormal: 'danger',
    todo: 'info'
  }
  return typeMap[status] || 'info'
}

// 初始化
onMounted(async () => {
  // 🔥 确保从API加载最新订单数据
  console.log('[状态更新] 页面初始化，从API加载订单数据...')
  try {
    await orderStore.loadOrdersFromAPI(true) // 强制刷新
    console.log('[状态更新] API数据加载完成，订单总数:', orderStore.orders.length)
  } catch (error) {
    console.error('[状态更新] API数据加载失败:', error)
  }

  // 🔥 修复：默认显示全部数据，不进行日期筛选
  handleQuickFilter('all')
  loadSummaryData()
  startAutoRefresh() // 启动自动刷新

  // 监听订单发货事件
  window.addEventListener('orderStatusUpdated', handleExternalOrderStatusUpdate as EventListener)
  window.addEventListener('order-status-update', handleOrderStatusUpdate as EventListener)
  window.addEventListener('order-shipped', handleOrderShipped as EventListener)
  window.addEventListener('logistics-status-update', handleOrderShipped as EventListener)
})

// 组件卸载时清理定时器和事件监听器
onUnmounted(() => {
  stopAutoRefresh()

  // 清理事件监听器
  window.removeEventListener('orderStatusUpdated', handleExternalOrderStatusUpdate as EventListener)
  window.removeEventListener('order-status-update', handleOrderStatusUpdate as EventListener)
  window.removeEventListener('order-shipped', handleOrderShipped as EventListener)
  window.removeEventListener('logistics-status-update', handleOrderShipped as EventListener)
})

// 监听筛选条件变化，重新加载汇总数据
watch([dateRange, statusFilter, searchKeyword], () => {
  loadSummaryData(true)
}, { deep: true })
</script>

<style scoped>
.logistics-status-update {
  padding: 20px;
}

/* 快递单号单元格样式 */
.tracking-no-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-tracking-btn {
  padding: 2px;
  margin-left: 4px;
}

.summary-cards {
  margin-bottom: 20px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.summary-header h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.auto-refresh-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-status {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #67c23a;
  font-size: 12px;
  font-weight: 500;
}

.refresh-icon {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.summary-card {
  height: 100px;
}

.card-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.card-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.card-icon.pending {
  background: #e6a23c;
}

.card-icon.updated {
  background: #67c23a;
}

.card-icon.todo {
  background: #409eff;
}

.card-icon.total {
  background: #909399;
}

.card-info {
  flex: 1;
}

.card-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.quick-filters {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-button {
  margin: 0;
  border-radius: 20px;
  padding: 8px 20px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.filter-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.search-filters {
  margin-bottom: 20px;
}

.list-navigation {
  margin-bottom: 20px;
}

.order-list {
  background: white;
  border-radius: 4px;
}

.logistics-update {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.tracking-timeline {
  max-height: 400px;
  overflow-y: auto;
}

/* 标签页badge样式 */
:deep(.pending-badge .el-badge__content) {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  color: white !important;
}

:deep(.todo-badge .el-badge__content) {
  background-color: #909399 !important;
  border-color: #909399 !important;
  color: white !important;
}
</style>
