﻿﻿﻿﻿﻿<template>
  <LogisticsStatusPermission>
    <div class="logistics-status-update">
    <!-- 数据汇总卡片 -->
    <div class="summary-cards">
      <div class="summary-header">
        <h3>数据汇总</h3>
        <div class="header-actions">
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
            <span>待更新 <el-badge v-if="summaryData.pending > 0" :value="summaryData.pending" class="item pending-badge" /></span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="已更新" name="updated">
          <template #label>
            <span>已更新</span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="待办" name="todo">
          <template #label>
            <span>待办 <el-badge v-if="summaryData.todo > 0" :value="summaryData.todo" class="item todo-badge" /></span>
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
        <el-table-column type="selection" width="55" />
        <el-table-column prop="index" label="序号" width="70" />
        <el-table-column prop="orderNo" label="订单号" min-width="140">
          <template #default="{ row }">
            <el-link type="primary" @click="handleOrderClick(row.orderId)">
              {{ row.orderNo }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户名称" min-width="100">
          <template #default="{ row }">
            <el-link type="primary" @click="handleCustomerClick(row.customerId)">
              {{ row.customerName }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" min-width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" min-width="90">
          <template #default="{ row }">
            ¥{{ row.amount }}
          </template>
        </el-table-column>
        <el-table-column prop="trackingNo" label="快递单号" min-width="160">
          <template #default="{ row }">
            <div v-if="row.trackingNo" style="display: flex; align-items: center; gap: 8px;">
              <el-button
                type="text"
                @click="handleViewTracking(row)"
              >
                {{ row.trackingNo }}
              </el-button>
              <el-button
                size="small"
                type="text"
                @click.stop="handleTrackingNoClick(row.trackingNo)"
                title="复制并查询"
              >
                <el-icon><Search /></el-icon>
              </el-button>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="latestUpdate" label="物流最新动态" min-width="180">
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
        <el-table-column prop="assignedTo" label="归属人" min-width="90" />
        <el-table-column prop="orderDate" label="下单日期" min-width="110" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewOrder(row)">查看</el-button>
            <el-button
              size="small"
              type="primary"
              @click="updateStatus(row)"
              v-if="activeTab === 'pending' || activeTab === 'todo'"
            >
              更新状态
            </el-button>
            <el-button
              size="small"
              type="warning"
              @click="setTodo(row)"
              v-if="activeTab === 'pending'"
            >
              待办
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
import { ref, reactive, onMounted, onUnmounted, watch, provide, computed } from 'vue'
import { useRouter } from 'vue-router'
import LogisticsStatusPermission from '@/components/Permission/LogisticsStatusPermission.vue'
import StatusUpdateDialog from '@/components/Logistics/StatusUpdateDialog.vue'
import TodoDialog from '@/components/Logistics/TodoDialog.vue'
import TrackingDialog from '@/components/Logistics/TrackingDialog.vue'
import AutoSyncSettings from '@/components/Logistics/AutoSyncSettings.vue'
import OrderDetailDialog from './components/OrderDetailDialog.vue'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { useNotificationStore, MessageType } from '@/stores/notification'
import { ElMessage, ElMessageBox } from 'element-plus'
import { eventBus, EventNames } from '@/utils/eventBus'
import {
  Clock,
  Check,
  Timer,
  DataLine,
  Search,
  Refresh,
  Loading
} from '@element-plus/icons-vue'

// Router
const router = useRouter()

// Store
const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const notificationStore = useNotificationStore()

// 响应式数据
const loading = ref(false)
const activeTab = ref('pending')
const activeQuickFilter = ref('today')
const dateRange = ref<[string, string]>(['', ''])
const searchKeyword = ref('')
const statusFilter = ref('')
const orderList = ref([])
const selectedOrders = ref([])
const currentOrder = ref(null)

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
      const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
      dateRange.value = ['', formatDate(threeDaysAgo)]
      break
    case '5days':
      const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
      dateRange.value = ['', formatDate(fiveDaysAgo)]
      break
    case '10days':
      const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
      dateRange.value = ['', formatDate(tenDaysAgo)]
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

const handleSelectionChange = (selection: unknown[]) => {
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

const viewOrder = (row: unknown) => {
  currentOrder.value = row
  orderDetailDialogVisible.value = true
}

// 点击订单号：跳转到订单详情
const handleOrderClick = (orderId: string) => {
  if (orderId) {
    router.push(`/order/detail/${orderId}`)
  }
}

// 点击客户姓名：跳转到客户详情
const handleCustomerClick = (customerId: string) => {
  if (customerId) {
    router.push(`/customer/detail/${customerId}`)
  }
}

// 点击快递单号查询图标：复制并提示选择查询网站
const handleTrackingNoClick = async (trackingNo: string) => {
  // 复制物流单号
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(trackingNo)
      ElMessage.success('快递单号已复制到剪贴板')
    } else {
      // 降级方案：使用 document.execCommand
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

  // 提示选择跳转网站
  ElMessageBox.confirm(
    '请选择要跳转的查询网站',
    '选择查询网站',
    {
      confirmButtonText: '顺丰官网',
      cancelButtonText: '快递100',
      distinguishCancelAndClose: true,
      type: 'info'
    }
  ).then(() => {
    // 点击确认，跳转顺丰官网
    window.open('https://www.sf-express.com/chn/sc/waybill/list', '_blank')
  }).catch((action) => {
    if (action === 'cancel') {
      // 点击取消，跳转快递100
      window.open('https://www.kuaidi100.com/', '_blank')
    }
  })
}

const updateStatus = (row: unknown) => {
  currentOrder.value = row
  selectedOrders.value = []
  statusDialogVisible.value = true
}

const setTodo = (row: unknown) => {
  currentOrder.value = row
  todoDialogVisible.value = true
}

// 批量更新状态
const handleBatchUpdate = () => {
  if (!selectedOrders.value || selectedOrders.value.length === 0) {
    ElMessage.warning('请先选择要更新的订单')
    return
  }

  console.log('[状态更新] 批量更新订单:', selectedOrders.value.length, '个')
  // 打开批量更新对话框
  currentOrder.value = null
  statusDialogVisible.value = true
}

// 提供给子组件使用
provide('selectedCount', computed(() => selectedOrders.value.length))
provide('handleBatchUpdate', handleBatchUpdate)

// 【修复】处理状态更新成功 - 同步更新 orderStore
const handleUpdateSuccess = async (updatedInfo?: { orders: unknown[], newStatus: string }) => {
  console.log('[状态更新] 收到更新成功回调:', updatedInfo)

  // 【关键修复】同步更新 orderStore 中的订单物流状态
  if (updatedInfo && updatedInfo.orders && updatedInfo.orders.length > 0) {
    updatedInfo.orders.forEach(order => {
      // 根据订单号找到 orderStore 中的订单
      const storeOrder = orderStore.getOrderByNumber(order.orderNo)
      if (storeOrder) {
        console.log(`[状态更新] 更新订单 ${order.orderNo} 的物流状态: ${updatedInfo.newStatus}`)
        // 更新订单的物流状态
        orderStore.updateOrder(storeOrder.id, {
          logisticsStatus: updatedInfo.newStatus as unknown
        })

        // 【新增】根据订单状态发送系统通知
        const statusText = getStatusText(updatedInfo.newStatus)
        let messageType = null
        let notificationContent = ''

        // 【批次201修复】根据订单状态选择对应的消息类型 - 覆盖所有状态
        switch (updatedInfo.newStatus) {
          case 'delivered':
          case 'signed':
            messageType = MessageType.ORDER_SIGNED
            notificationContent = `订单 ${order.orderNo} 已签收，客户：${order.customerName}`
            break
          case 'rejected':
            messageType = MessageType.CUSTOMER_REJECTED
            notificationContent = `订单 ${order.orderNo} 客户拒收，客户：${order.customerName}，请及时处理`
            break
          case 'rejected_returned':
            messageType = MessageType.CUSTOMER_REJECTED
            notificationContent = `订单 ${order.orderNo} 拒收已退回发货地，客户：${order.customerName}`
            break
          case 'refunded':
          case 'returned':
            messageType = MessageType.ORDER_REFUNDED
            notificationContent = `订单 ${order.orderNo} 已退货退款，客户：${order.customerName}`
            break
          case 'after_sales_created':
            messageType = MessageType.AFTER_SALES_CREATED
            notificationContent = `订单 ${order.orderNo} 已创建售后订单，客户：${order.customerName}，请及时处理`
            break
          case 'abnormal':
          case 'exception':
            messageType = MessageType.PACKAGE_ANOMALY
            notificationContent = `订单 ${order.orderNo} 物流状态异常，客户：${order.customerName}，请及时处理`
            break
          case 'in_transit':
            messageType = MessageType.LOGISTICS_IN_TRANSIT
            notificationContent = `订单 ${order.orderNo} 运输中，客户：${order.customerName}`
            break
          case 'out_for_delivery':
            messageType = MessageType.LOGISTICS_DELIVERED
            notificationContent = `订单 ${order.orderNo} 派送中，客户：${order.customerName}`
            break
        }

        // 发送通知
        if (messageType) {
          notificationStore.sendMessage(messageType, notificationContent, {
            relatedId: storeOrder.id,
            relatedType: 'order',
            actionUrl: `/order/detail/${storeOrder.id}`
          })
        }
      } else {
        console.warn(`[状态更新] 未找到订单: ${order.orderNo}`)
      }
    })
  }

  ElMessage.success('状态更新成功')

  // 重新加载当前标签页的数据
  await loadData()
  await loadSummaryData(true) // 重新加载汇总数据并显示动画
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

  // 【修复】使用 eventBus 通知其他页面数据已更新
  eventBus.emit(EventNames.ORDER_STATUS_CHANGED, {
    timestamp: Date.now(),
    updatedOrders: updatedInfo?.orders || [],
    newStatus: updatedInfo?.newStatus
  })
  eventBus.emit(EventNames.REFRESH_LOGISTICS_LIST)
  eventBus.emit(EventNames.REFRESH_SHIPPING_LIST)
  eventBus.emit(EventNames.REFRESH_ORDER_LIST)

  console.log('[状态更新] 已发送事件通知所有页面刷新')
}

// 【修复】处理待办设置成功 - 同步更新 orderStore
const handleTodoSuccess = async (todoInfo?: { orderNo: string, days: number, remark?: string }) => {
  console.log('[状态更新] 收到待办设置成功回调:', todoInfo)

  // 【关键修复】同步更新 orderStore 中的订单待办状态
  if (todoInfo && todoInfo.orderNo) {
    const storeOrder = orderStore.getOrderByNumber(todoInfo.orderNo)
    if (storeOrder) {
      console.log(`[状态更新] 设置订单 ${todoInfo.orderNo} 为待办`)
      // 更新订单的待办状态
      orderStore.updateOrder(storeOrder.id, {
        isTodo: true,
        todoRemark: todoInfo.remark
      } as unknown)
    }
  }

  ElMessage.success('待办设置成功')
  await loadData() // 重新加载订单列表
  await loadSummaryData(true) // 重新加载汇总数据并显示动画

  // 【修复】使用 eventBus 通知其他页面数据已更新
  eventBus.emit(EventNames.ORDER_STATUS_CHANGED, {
    timestamp: Date.now()
  })
}

// 处理详情对话框中的更新状态按钮
const handleDetailUpdateStatus = (order: unknown) => {
  orderDetailDialogVisible.value = false
  currentOrder.value = order
  selectedOrders.value = []
  statusDialogVisible.value = true
}

// 处理详情对话框中的设置待办按钮
const handleDetailSetTodo = (order: unknown) => {
  orderDetailDialogVisible.value = false
  currentOrder.value = order
  todoDialogVisible.value = true
}

// 【修复】处理订单发货事件 - 使用 eventBus
const handleOrderShipped = () => {
  console.log('[状态更新] 收到订单发货事件')

  // 刷新数据以显示新发货的订单
  loadData()
  loadSummaryData(true)

  // 如果当前在待更新标签页，显示提示
  if (activeTab.value === 'pending') {
    ElMessage.info('检测到新的发货订单，已自动刷新列表')
  }
}

// 【修复】处理订单取消事件
const handleOrderCancelled = () => {
  console.log('[状态更新] 收到订单取消事件')
  loadData()
  loadSummaryData(true)
}

// 【修复】处理订单退回事件
const handleOrderReturned = () => {
  console.log('[状态更新] 收到订单退回事件')
  loadData()
  loadSummaryData(true)
}

// 【修复】处理刷新物流列表事件
const handleRefreshLogisticsList = () => {
  console.log('[状态更新] 收到刷新物流列表事件')
  loadData()
  loadSummaryData(true)
}

// 【修复】处理订单状态变化事件
const handleOrderStatusChanged = (order: unknown) => {
  console.log('[状态更新] 收到订单状态变化事件:', order)

  // 如果订单状态变更为已发货，则刷新物流状态页面
  if (order && order.status === 'shipped') {
    loadData()
    loadSummaryData(true)

    // 显示提示信息
    if (activeTab.value === 'pending') {
      ElMessage.success(`订单 ${order.orderNumber} 已发货，已同步到物流状态列表`)
    }
  }
}

// 查看物流轨迹
const handleViewTracking = (order) => {
  currentTrackingNo.value = order.trackingNo
  currentLogisticsCompany.value = order.logisticsCompany
  trackingDialogVisible.value = true
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
    // 确保客户数据已加载
    if (customerStore.customers.length === 0) {
      await customerStore.loadCustomers()
    }

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 300))

    // 从订单store获取“已发货”可见范围的订单（与发货列表一致的权限策略）
    const allOrders = orderStore.getOrders()

    // 筛选已发货的订单（包括shipped和delivered状态），且有物流信息
    // 注意：trackingNumber 和 expressNo 都可能存在，expressCompany 也可能为空字符串，需要检查
    let shippedOrders = allOrders.filter(order => {
      // 检查订单状态是否为已发货
      const isShipped = order.status === 'shipped' || order.status === 'delivered'
      if (!isShipped) {
        return false
      }

      // 检查是否有物流单号（trackingNumber 或 expressNo）
      const trackingNo = order.trackingNumber || order.expressNo
      const hasTrackingNumber = !!(trackingNo && trackingNo.trim() !== '')
      if (!hasTrackingNumber) {
        console.log(`[状态更新] 订单 ${order.orderNumber} 没有物流单号，跳过`)
        return false
      }

      // 检查是否有快递公司（支持 expressCompany 或 logisticsCompany）
      const company = order.expressCompany || order.logisticsCompany
      const hasExpressCompany = company && company.trim() !== ''
      if (!hasExpressCompany) {
        console.log(`[状态更新] 订单 ${order.orderNumber} 没有快递公司，跳过`)
        return false
      }

      console.log(`[状态更新] ✅ 订单 ${order.orderNumber} 通过筛选`, {
        status: order.status,
        trackingNumber: trackingNo,
        expressCompany: company
      })
      return true
    })

    console.log(`[状态更新] 筛选出 ${shippedOrders.length} 个已发货订单（总订单数：${allOrders.length}）`)

    // 根据tab筛选
    if (activeTab.value === 'pending') {
      // 待更新：已发货但物流状态还未更新的订单，且不是待办订单
      // 物流状态为空、picked_up（已揽收）或 in_transit（运输中）都算待更新
      shippedOrders = shippedOrders.filter(order => {
        // 排除待办订单
        if (order.isTodo === true) {
          return false
        }
        const logisticsStatus = order.logisticsStatus
        return !logisticsStatus ||
               logisticsStatus === 'picked_up' ||
               logisticsStatus === 'in_transit' ||
               logisticsStatus === 'pending'
      })
      console.log(`[状态更新] 待更新标签页，筛选后订单数: ${shippedOrders.length}`)
    } else if (activeTab.value === 'updated') {
      // 已更新：物流状态已更新为最终状态的订单
      shippedOrders = shippedOrders.filter(order =>
        order.logisticsStatus &&
        ['delivered', 'out_for_delivery', 'exception', 'rejected', 'returned'].includes(order.logisticsStatus)
      )
      console.log(`[状态更新] 已更新标签页，筛选后订单数: ${shippedOrders.length}`)
    } else if (activeTab.value === 'todo') {
      // 待办：标记为待办的订单
      shippedOrders = shippedOrders.filter(order => order.isTodo === true)
      console.log(`[状态更新] 待办标签页，筛选后订单数: ${shippedOrders.length}`)
    }

    // 按发货时间筛选（如果有日期范围参数）
    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      const [startDate, endDate] = dateRange.value
      shippedOrders = shippedOrders.filter(order => {
        const shippingTime = order.shippingTime || order.createTime
        if (!shippingTime) return false
        const shippingDate = shippingTime.split(' ')[0] // 提取日期部分
        return shippingDate >= startDate && shippingDate <= endDate
      })
    } else if (dateRange.value && dateRange.value.length === 2 && dateRange.value[1]) {
      // 如果只有endDate（用于"X天前"筛选）
      const endDate = dateRange.value[1]
      shippedOrders = shippedOrders.filter(order => {
        const shippingTime = order.shippingTime || order.createTime
        if (!shippingTime) return false
        const shippingDate = shippingTime.split(' ')[0]
        return shippingDate <= endDate
      })
    }

    // 关键词搜索
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase()
      shippedOrders = shippedOrders.filter(order =>
        order.orderNumber.toLowerCase().includes(keyword) ||
        order.customerName.toLowerCase().includes(keyword) ||
        (order.trackingNumber && order.trackingNumber.toLowerCase().includes(keyword))
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
      const timeA = new Date(a.shippingTime || a.createTime || 0).getTime()
      const timeB = new Date(b.shippingTime || b.createTime || 0).getTime()
      return timeB - timeA // 倒序：最新的在上面
    })

    // 【修复】转换为物流状态格式，确保字段映射正确
    const logisticsData = shippedOrders.map((order, index) => {
      // 获取客户信息
      const customer = order.customerId ? customerStore.getCustomerById(order.customerId) : null

      const mappedData = {
        id: order.id,
        orderId: order.id,
        customerId: order.customerId,
        index: (pagination.currentPage - 1) * pagination.pageSize + index + 1,
        orderNo: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone || order.receiverPhone || customer?.phone || '-',
        customerHeight: customer?.height ? `${customer.height}` : '-',
        customerWeight: customer?.weight ? `${customer.weight}` : '-',
        customerDisease: customer?.medicalHistory || customer?.disease || '-',
        serviceWechat: order.serviceWechat || customer?.serviceWechat || customer?.wechat || customer?.wechatId || '-',
        orderSource: order.orderSource || '-',
        status: order.logisticsStatus || 'picked_up',
        amount: order.totalAmount,
        trackingNo: order.trackingNumber || order.expressNo || '',
        logisticsCompany: order.expressCompany || order.logisticsCompany || '',
        latestUpdate: order.logisticsHistory && order.logisticsHistory.length > 0
          ? order.logisticsHistory[0].description
          : (order.statusHistory && order.statusHistory.length > 0
            ? order.statusHistory[order.statusHistory.length - 1].description
            : '已发货'),
        assignedTo: order.createdBy || '',
        orderDate: order.createTime ? order.createTime.split(' ')[0] : '',
        shippingTime: order.shippingTime || order.createTime,
        productName: order.products?.map((p: unknown) => p.name).join('、') || '商品',
        quantity: order.products?.reduce((sum: number, p: unknown) => sum + (p.quantity || 0), 0) || 1,
        remark: order.remark || ''
      }

      return mappedData
    })

    console.log(`[状态更新] 映射后的数据数量: ${logisticsData.length}`)
    console.log(`[状态更新] 映射后的第一条数据:`, logisticsData[0])

    // 分页处理
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    orderList.value = logisticsData.slice(startIndex, endIndex)
    pagination.total = logisticsData.length

    console.log(`[状态更新] 分页后的数据数量: ${orderList.value.length}`)
    console.log(`[状态更新] orderList.value:`, orderList.value)

  } catch (error) {
    console.error('订单列表加载失败:', error)
    console.error('错误详情:', error)
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
    // 【修复】直接使用 getOrders() 获取权限过滤后的所有订单
    const allOrders = orderStore.getOrders()

    // 筛选已发货的订单（包括shipped和delivered状态），且有物流信息
    let shippedOrders = allOrders.filter(order => {
      // 检查订单状态是否为已发货
      const isShipped = order.status === 'shipped' || order.status === 'delivered'
      if (!isShipped) {
        return false
      }

      // 检查是否有物流单号
      const hasTrackingNumber = !!(order.trackingNumber && order.trackingNumber.trim() !== '')
      if (!hasTrackingNumber) {
        return false
      }

      // 检查是否有快递公司（支持 expressCompany 或 logisticsCompany）
      const company = order.expressCompany || order.logisticsCompany
      const hasExpressCompany = !!(company && company.trim() !== '')

      return hasExpressCompany
    })

    // 按发货时间筛选（如果有日期范围参数）
    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      const [startDate, endDate] = dateRange.value
      shippedOrders = shippedOrders.filter(order => {
        const shippingTime = order.shippingTime || order.createTime
        if (!shippingTime) return false
        const shippingDate = shippingTime.split(' ')[0]
        return shippingDate >= startDate && shippingDate <= endDate
      })
    } else if (dateRange.value && dateRange.value.length === 2 && dateRange.value[1]) {
      const endDate = dateRange.value[1]
      shippedOrders = shippedOrders.filter(order => {
        const shippingTime = order.shippingTime || order.createTime
        if (!shippingTime) return false
        const shippingDate = shippingTime.split(' ')[0]
        return shippingDate <= endDate
      })
    }

    // 计算各状态的数量
    const pending = shippedOrders.filter(order => {
      // 排除待办订单
      if (order.isTodo === true) {
        return false
      }
      const logisticsStatus = order.logisticsStatus
      return !logisticsStatus ||
             logisticsStatus === 'picked_up' ||
             logisticsStatus === 'in_transit' ||
             logisticsStatus === 'pending'
    }).length
    const updated = shippedOrders.filter(order =>
      order.logisticsStatus &&
      ['delivered', 'out_for_delivery', 'exception', 'rejected', 'returned'].includes(order.logisticsStatus)
    ).length
    const todo = shippedOrders.filter(order => order.isTodo === true).length
    const total = shippedOrders.length

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

// 【修复】获取订单状态文本 - 使用订单状态而不是物流状态
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    // 订单状态
    pending_transfer: '待流转',
    pending_audit: '待审核',
    audit_rejected: '审核拒绝',
    pending_shipment: '待发货',
    shipped: '已发货',
    delivered: '已签收',
    logistics_returned: '物流部退回',
    logistics_cancelled: '物流部取消',
    package_exception: '包裹异常',
    rejected: '拒收',
    rejected_returned: '拒收已退回',
    after_sales_created: '已建售后',
    pending_cancel: '待取消',
    cancel_failed: '取消失败',
    cancelled: '已取消',
    draft: '草稿',
    // 物流状态（兼容）
    picked_up: '已揽收',
    in_transit: '运输中',
    out_for_delivery: '派送中',
    exception: '异常',
    returned: '已退回',
    refunded: '退货退款',
    abnormal: '状态异常',
    todo: '待办'
  }
  return statusMap[status] || status
}

// 【修复】获取订单状态类型 - 使用订单状态而不是物流状态
const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    // 订单状态
    pending_transfer: 'info',
    pending_audit: 'warning',
    audit_rejected: 'danger',
    pending_shipment: 'primary',
    shipped: 'success',
    delivered: 'success',
    logistics_returned: 'warning',
    logistics_cancelled: 'info',
    package_exception: 'danger',
    rejected: 'danger',
    rejected_returned: 'warning',
    after_sales_created: 'info',
    pending_cancel: 'warning',
    cancel_failed: 'danger',
    cancelled: 'info',
    draft: 'info',
    // 物流状态（兼容）
    picked_up: 'primary',
    in_transit: 'primary',
    out_for_delivery: 'warning',
    exception: 'danger',
    returned: 'danger',
    refunded: 'danger',
    abnormal: 'danger',
    todo: 'info'
  }
  return typeMap[status] || 'info'
}

// 初始化
onMounted(() => {
  handleQuickFilter('today') // 默认显示今日数据
  loadSummaryData()
  startAutoRefresh() // 启动自动刷新

  // 【修复】监听 eventBus 事件，与发货列表保持一致
  eventBus.on(EventNames.ORDER_SHIPPED, handleOrderShipped)
  eventBus.on(EventNames.ORDER_CANCELLED, handleOrderCancelled)
  eventBus.on(EventNames.ORDER_RETURNED, handleOrderReturned)
  eventBus.on(EventNames.REFRESH_LOGISTICS_LIST, handleRefreshLogisticsList)
  eventBus.on(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChanged)
  console.log('[状态更新] 事件监听器已注册')
})

// 组件卸载时清理定时器和事件监听器
onUnmounted(() => {
  stopAutoRefresh()

  // 【修复】清理 eventBus 事件监听器
  eventBus.off(EventNames.ORDER_SHIPPED, handleOrderShipped)
  eventBus.off(EventNames.ORDER_CANCELLED, handleOrderCancelled)
  eventBus.off(EventNames.ORDER_RETURNED, handleOrderReturned)
  eventBus.off(EventNames.REFRESH_LOGISTICS_LIST, handleRefreshLogisticsList)
  eventBus.off(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChanged)
  console.log('[状态更新] 事件监听器已清理')
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-update-btn {
  margin-right: 8px;
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
