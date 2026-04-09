<template>
  <div class="order-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" :icon="ArrowLeft" circle />
        <div class="header-info">
          <h2>订单详情</h2>
          <div class="order-number">订单号：{{ orderDetail.orderNumber }}</div>
        </div>
      </div>
      <div class="header-actions">
        <el-tooltip
          :content="canCreateAfterSales ? '点击创建售后服务' : '订单需要发货后才能建立售后'"
          placement="bottom"
        >
          <el-button
            type="primary"
            :disabled="!canCreateAfterSales"
            @click="createAfterSales"
          >
            建立售后
          </el-button>
        </el-tooltip>
        <el-dropdown @command="handleMarkCommand" class="mark-dropdown" :disabled="!canModifyMark">
          <el-button :icon="Sell" :type="getMarkButtonType()" :disabled="!canModifyMark">
            标记 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="reserved" :disabled="orderDetail.markType === 'reserved'">预留单</el-dropdown-item>
              <el-dropdown-item command="normal" :disabled="orderDetail.markType === 'normal'">正常发货单</el-dropdown-item>
              <el-dropdown-item command="return" :disabled="orderDetail.markType === 'return'">退单</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <!-- 审核中不可修改提示 -->
        <el-tooltip v-if="!canModifyMark && isInAuditProcess" content="订单正在审核中，无法修改标记" placement="top">
          <el-icon class="audit-lock-icon"><Lock /></el-icon>
        </el-tooltip>
        <!-- 标记状态显示 -->
        <div v-if="orderDetail.markType" class="mark-status">
          <el-tag :type="getMarkTagType(orderDetail.markType)" size="default" effect="dark">
            {{ getMarkText(orderDetail.markType) }}
          </el-tag>
        </div>
        <el-button v-if="canApprove" type="success" @click="approveOrder">审核通过</el-button>
        <el-button v-if="canReject" type="danger" @click="rejectOrder">审核拒绝</el-button>
      </div>
    </div>


    <!-- 客户+订单状态+收货+订单信息 -->
    <OrderInfoCards
      :orderDetail="orderDetail"
      :showCountdown="showCountdown"
      :countdownText="countdownText"
      :canChangeToReserved="canChangeToReserved"
      :hasShippedWithTracking="hasShippedWithTracking"
      :customFields="orderFieldConfigStore.customFields"
      :getCustomFieldValue="getCustomFieldValue"
      :formatCustomFieldValue="formatCustomFieldValue"
      :userId="userStore.currentUser?.id || ''"
      @go-customer-detail="goToCustomerDetail"
      @call-customer="callCustomer"
      @track-express="trackExpress"
    />

    <!-- 商品清单 -->
    <OrderProductsCard
      :orderDetail="orderDetail"
      :calculatedSubtotal="calculatedSubtotal"
      :depositScreenshotList="depositScreenshotList"
      :canApplyCodCancel="canApplyCodCancel"
      :codCancelDisabledReason="codCancelDisabledReason"
      @apply-cod-cancel="handleApplyCodCancel"
    />

    <!-- 物流跟踪+订单轨迹+售后历史 -->
    <OrderTrackingSections
      :logisticsInfo="logisticsInfo"
      :logisticsLoading="logisticsLoading"
      :orderTimeline="orderTimeline"
      :afterSalesHistory="afterSalesHistory"
      @refresh-logistics="refreshLogistics"
    />

    <!-- 手机号验证对话框（统一组件） -->
    <PhoneVerifyDialog
      v-model:visible="phoneVerifyDialogVisible"
      :tracking-no="pendingTrackingNo"
      :loading="logisticsLoading"
      @submit="handlePhoneVerifySubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PhoneVerifyDialog from '@/components/Logistics/PhoneVerifyDialog.vue'
// 拆分的子组件
import OrderInfoCards from './Detail/OrderInfoCards.vue'
import OrderProductsCard from './Detail/OrderProductsCard.vue'
import OrderTrackingSections from './Detail/OrderTrackingSections.vue'
import {
  ArrowLeft, Clock, User, Phone, Message, Location, Van, Document,
  ShoppingBag, Money, List, Sell, Check, Plus, ArrowDown, ArrowUp, Service, Lock, Timer, ZoomIn,
  Warning, Close, ArrowRight, CreditCard, Wallet
} from '@element-plus/icons-vue'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { useNotificationStore } from '@/stores/notification'
import { orderApi } from '@/api/order'
import { orderDetailApi } from '@/api/orderDetail'
import { customerApi } from '@/api/customer'
import { useServiceStore } from '@/stores/service'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { useUserStore } from '@/stores/user'
import { createSafeNavigator } from '@/utils/navigation'
import { useOrderFieldConfigStore } from '@/stores/orderFieldConfig'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'
import { formatDateTime } from '@/utils/dateFormat'
import { getCompanyShortName, getTrackingUrl, KUAIDI100_URL } from '@/utils/logisticsCompanyConfig'
import { calculateEstimatedDelivery, detectLogisticsStatusFromDescription } from '@/utils/logisticsStatusConfig'

const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)
const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const notificationStore = useNotificationStore()
const serviceStore = useServiceStore()
const userStore = useUserStore()
const orderFieldConfigStore = useOrderFieldConfigStore()

// 响应式数据
const loading = ref(false)
const orderId = route.params.id as string

// 倒计时相关
const countdownSeconds = ref(180) // 3分钟 = 180秒
const countdownTimer = ref(null)
const countdownText = ref('03:00')

// 订单详情数据
const orderDetail = reactive({
  id: '',
  orderNumber: '',
  status: 'pending',
  auditStatus: 'pending', // 审核状态：pending, approved, rejected
  markType: '', // 标记类型：reserved, normal, return
  createTime: '',
  updateTime: '',
  auditTransferTime: '', // 流转审核时间
  isAuditTransferred: false, // 是否已流转到审核
  // 🔥 操作人信息
  createdBy: '',
  createdByName: '',
  auditBy: '',
  auditByName: '',
  auditRemark: '',
  shippedBy: '',
  shippedByName: '',
  cancelledBy: '',
  cancelledByName: '',
  customer: {
    id: '',
    name: '',
    phone: '',
    wechat: '',
    address: '',
    level: 'normal',
    avatar: ''
  },
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  expressCompany: '',
  trackingNumber: '',
  serviceWechat: '',
  orderSource: '',
  expectedShipDate: '',
  expectedDeliveryDate: '',
  products: [],
  subtotal: 0,
  discount: 0,
  totalAmount: 0,
  depositAmount: 0,
  codAmount: 0, // 代收金额
  codStatus: 'pending', // 代收状态：pending, cancelled, returned
  hasPendingCodApplication: false, // 是否有待审核的取消代收申请
  depositScreenshot: '',
  depositScreenshots: [],
  paymentMethod: '',
  paymentMethodOther: '',
  remark: '',
  customFields: {} as Record<string, any>
})

// 订单时间轴
const orderTimeline = ref([])

// 物流信息
interface LogisticsItem {
  time: string
  status: string
  statusText: string
  description: string
  location: string
}
const logisticsInfo = ref<LogisticsItem[]>([])

// 售后历史
const afterSalesHistory = ref([])

// 折叠状态
const statusTimelineCollapsed = ref(true)
const afterSalesCollapsed = ref(true)
const logisticsCollapsed = ref(false) // 物流信息默认展开

// 物流轨迹相关
const logisticsLoading = ref(false)

// 手机号验证相关
const phoneVerifyDialogVisible = ref(false)
const pendingTrackingNo = ref('')
const pendingCompanyCode = ref('')

// 事件监听器引用
const operationLogListener = (_event: CustomEvent) => {
  // 操作记录功能已移除，此监听器保留但不执行任何操作
}

const orderStatusListener = (event: CustomEvent) => {
  const { orderId, newStatus } = event.detail
  if (orderId === route.params.id) {
    orderDetail.status = newStatus
    // 刷新状态轨迹
    loadOrderTimeline()
  }
}

const logisticsStatusListener = (event: CustomEvent) => {
  const result = event.detail
  if (orderDetail.trackingNumber === result.trackingNumber) {
    refreshLogistics()
  }
}

const afterSalesUpdateListener = (event: CustomEvent) => {
  const { orderId, serviceId } = event.detail
  if (orderId === route.params.id) {
    // 重新加载售后历史数据
    loadAfterSalesHistory()
  }
}

const serviceStatusUpdateListener = (event: CustomEvent) => {
  const { orderId, serviceId, newStatus } = event.detail
  if (orderId === route.params.id) {
    // 重新加载售后历史数据
    loadAfterSalesHistory()
  }
}

// 设置事件监听器
const setupEventListeners = () => {
  window.addEventListener('operation-log-update', operationLogListener)
  window.addEventListener('order-status-update', orderStatusListener)
  window.addEventListener('logistics-status-update', logisticsStatusListener)
  window.addEventListener('after-sales-update', afterSalesUpdateListener)
  window.addEventListener('service-status-update', serviceStatusUpdateListener)
}

// 加载售后历史数据 - 从后端API获取
const loadAfterSalesHistory = async () => {
  try {
    const services = await orderDetailApi.getAfterSalesHistory(orderId)

    // 将售后服务数据转换为历史轨迹格式
    afterSalesHistory.value = services.map((service: any) => ({
      timestamp: service.timestamp,
      type: service.type,
      title: service.title || getAfterSalesTitle(service.type, service.status),
      description: service.description,
      operator: service.operator,
      amount: service.amount || 0,
      status: service.status,
      serviceNumber: service.serviceNumber
    }))

    // 按时间倒序排列
    afterSalesHistory.value.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    console.log(`[订单详情] 加载到 ${afterSalesHistory.value.length} 条售后记录`)
  } catch (error) {
    console.error('加载售后历史失败，尝试从本地store获取:', error)
    // 如果API失败，尝试从本地store获取
    try {
      const afterSalesServices = serviceStore.getServicesByOrderId(orderDetail.id)
      afterSalesHistory.value = afterSalesServices.map((service: any) => ({
        timestamp: service.createTime,
        type: service.serviceType,
        title: getAfterSalesTitle(service.serviceType, service.status),
        description: service.description || service.reason,
        operator: service.createdBy,
        amount: service.price || 0,
        status: service.status,
        serviceNumber: service.serviceNumber
      }))
    } catch (e) {
      afterSalesHistory.value = []
    }
  }
}

// 获取售后标题
const getAfterSalesTitle = (type: string, status: string) => {
  const typeTexts = {
    'return': '退货申请',
    'exchange': '换货申请',
    'repair': '维修申请',
    'refund': '退款申请'
  }

  const statusTexts = {
    'pending': '已提交',
    'processing': '处理中',
    'resolved': '已解决',
    'closed': '已关闭'
  }

  return `${typeTexts[type] || '售后申请'} - ${statusTexts[status] || status}`
}

// 加载订单状态轨迹 - 从后端API获取
const loadOrderTimeline = async () => {
  try {
    const statusHistory = await orderDetailApi.getStatusHistory(orderId)

    if (statusHistory && statusHistory.length > 0) {
      // 使用真实的状态历史数据
      orderTimeline.value = statusHistory.map((history: any) => ({
        timestamp: history.timestamp,
        type: getTimelineType(history.status),
        icon: getTimelineIcon(history.status),
        color: getTimelineColor(history.status),
        title: history.title || getStatusText(history.status),
        description: history.description || `订单状态变更为：${getStatusText(history.status)}`,
        operator: history.operator || '系统'
      }))
      console.log(`[订单详情] 加载到 ${orderTimeline.value.length} 条状态历史`)
    } else {
      // 🔥 如果没有状态历史，根据订单当前状态生成完整轨迹
      orderTimeline.value = generateTimelineFromStatus()
    }

    // 按时间倒序排列
    orderTimeline.value.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  } catch (error) {
    console.error('加载订单状态轨迹失败，尝试从本地store获取:', error)
    // 如果API失败，尝试从本地store获取
    const localHistory = orderStore.getOrderStatusHistory(orderId)
    if (localHistory && localHistory.length > 0) {
      orderTimeline.value = localHistory.map((history: any) => ({
        timestamp: history.timestamp,
        type: getTimelineType(history.status),
        icon: getTimelineIcon(history.status),
        color: getTimelineColor(history.status),
        title: history.title || getStatusText(history.status),
        description: history.description || `订单状态变更为：${getStatusText(history.status)}`,
        operator: history.operator || '系统'
      }))
    } else {
      // 🔥 根据订单当前状态生成完整轨迹
      orderTimeline.value = generateTimelineFromStatus()
    }
  }
}

/**
 * 🔥 根据订单当前状态生成完整的状态轨迹
 */
const generateTimelineFromStatus = () => {
  const timeline: any[] = []
  const currentStatus = orderDetail.status

  // 订单状态流程定义
  const statusFlow = [
    { status: 'pending_transfer', title: '订单创建', description: `订单创建成功，订单号：${orderDetail.orderNumber}` },
    { status: 'pending_audit', title: '待审核', description: '订单已提交审核' },
    { status: 'pending_shipment', title: '审核通过', description: '订单审核通过，等待发货' },
    { status: 'shipped', title: '已发货', description: `订单已发货，快递公司：${orderDetail.expressCompany || '未知'}，单号：${orderDetail.trackingNumber || '未知'}` },
    { status: 'delivered', title: '已签收', description: '订单已签收' }
  ]

  // 状态优先级映射
  const statusPriority: Record<string, number> = {
    'pending_transfer': 0,
    'pending': 0,
    'draft': 0,
    'pending_audit': 1,
    'audit_rejected': 1,
    'pending_shipment': 2,
    'approved': 2,
    'shipped': 3,
    'in_transit': 3,
    'out_for_delivery': 3,
    'delivered': 4,
    'completed': 4,
    'cancelled': -1,
    'rejected': -1
  }

  const currentPriority = statusPriority[currentStatus] ?? 0

  // 生成已经过的状态轨迹
  const baseTime = new Date(orderDetail.createTime || new Date())
  const creatorName = orderDetail.createdByName || '销售员'

  for (const step of statusFlow) {
    const stepPriority = statusPriority[step.status] ?? 0

    if (stepPriority <= currentPriority) {
      // 计算时间（每个状态间隔一些时间）
      const timestamp = new Date(baseTime.getTime() + stepPriority * 3600000)

      // 🔥 根据状态确定操作人
      let operator = creatorName
      if (step.status === 'pending_audit') {
        operator = creatorName // 提交审核的是创建人
      } else if (step.status === 'pending_shipment') {
        operator = orderDetail.auditByName || '审核员'
      } else if (step.status === 'shipped') {
        operator = orderDetail.shippedByName || '物流部'
      } else if (step.status === 'delivered') {
        operator = '快递员'
      }

      timeline.push({
        timestamp: timestamp.toISOString(),
        type: getTimelineType(step.status),
        icon: getTimelineIcon(step.status),
        color: getTimelineColor(step.status),
        title: step.title,
        description: step.description,
        operator
      })
    }
  }

  // 如果是特殊状态（取消、拒绝等），添加对应的轨迹
  if (currentStatus === 'cancelled') {
    timeline.push({
      timestamp: orderDetail.updateTime || new Date().toISOString(),
      type: 'danger',
      icon: Close,
      color: '#F56C6C',
      title: '订单取消',
      description: '订单已取消',
      operator: orderDetail.cancelledByName || creatorName
    })
  } else if (currentStatus === 'audit_rejected') {
    timeline.push({
      timestamp: orderDetail.updateTime || new Date().toISOString(),
      type: 'danger',
      icon: Close,
      color: '#F56C6C',
      title: '审核拒绝',
      description: orderDetail.auditRemark || '订单审核被拒绝',
      operator: orderDetail.auditByName || '审核员'
    })
  }

  return timeline
}

// 获取时间轴类型
const getTimelineType = (status: string) => {
  const types = {
    'pending': 'info',
    'pending_approval': 'warning',
    'approved': 'success',
    'rejected': 'danger',
    'pending_shipment': 'warning',
    'shipped': 'primary',
    'delivered': 'success',
    'completed': 'success',
    'cancelled': 'danger'
  }
  return types[status] || 'info'
}

// 获取时间轴图标
const getTimelineIcon = (status: string) => {
  const icons = {
    'pending': Clock,
    'pending_approval': Clock,
    'approved': Check,
    'rejected': Close,
    'pending_shipment': Clock,
    'shipped': Van,
    'delivered': Check,
    'completed': Check,
    'cancelled': Close
  }
  return icons[status] || Clock
}

// 获取时间轴颜色
const getTimelineColor = (status: string) => {
  const colors = {
    'pending': '#909399',
    'pending_approval': '#e6a23c',
    'approved': '#67c23a',
    'rejected': '#f56c6c',
    'pending_shipment': '#e6a23c',
    'shipped': '#409eff',
    'delivered': '#67c23a',
    'completed': '#67c23a',
    'cancelled': '#f56c6c'
  }
  return colors[status] || '#909399'
}

// 计算属性
const showCountdown = computed(() => {
  // 只有在订单状态为pending_transfer（待流转）时显示倒计时
  return orderDetail.status === 'pending_transfer' &&
         orderDetail.markType === 'normal' &&
         orderDetail.auditTransferTime &&
         !orderDetail.isAuditTransferred
})

const canCreateAfterSales = computed(() => {
  // 建立售后按钮只有在已发货及之后的状态才可点击
  // 可点击状态：已发货、已送达、已完成、异常、拒收、拒收已退回等
  const allowedStatuses = ['shipped', 'delivered', 'completed', 'abnormal', 'rejected', 'rejected_returned']
  return allowedStatuses.includes(orderDetail.status)
})

const canApprove = computed(() => {
  return orderDetail.status === 'pending_approval'
})

const canReject = computed(() => {
  return orderDetail.status === 'pending_approval'
})

// 判断是否可以修改标记
const canModifyMark = computed(() => {
  // 已审核通过的订单不能修改标记
  if (orderDetail.auditStatus === 'approved') {
    return false
  }

  // 🔥 已流转到待审核状态（pending_audit）的订单不能修改标记
  // 只有待流转（pending_transfer）状态才能修改
  if (orderDetail.status === 'pending_audit') {
    return false
  }

  // 有取消申请的订单不能修改标记（待取消、已取消、取消失败）
  if (orderDetail.status === 'pending_cancel' ||
      orderDetail.status === 'cancelled' ||
      orderDetail.status === 'cancel_failed') {
    return false
  }

  // 🔥 待流转状态可以修改标记（在延迟提交审核的时间内）
  // 预留单和退单也可以修改（改回正常发货单）
  return true
})

// 判断是否在审核流程中（已锁定状态）
const isInAuditProcess = computed(() => {
  // 已流转到待审核状态
  return orderDetail.status === 'pending_audit'
})

// 图片查看器
const showImageViewer = ref(false)
const currentImageIndex = ref(0)

// 🔥 判断是否已发货且有物流单号（用于显示物流信息）
const hasShippedWithTracking = computed(() => {
  // 已发货及之后的状态，且有物流单号
  const shippedStatuses = ['shipped', 'delivered', 'completed', 'package_exception', 'rejected', 'rejected_returned']
  return shippedStatuses.includes(orderDetail.status) && !!orderDetail.trackingNumber
})

// 动态计算商品总额
const calculatedSubtotal = computed(() => {
  if (!orderDetail.products || orderDetail.products.length === 0) {
    return 0
  }
  return orderDetail.products.reduce((sum, product) => {
    return sum + ((product.price || 0) * (product.quantity || 0))
  }, 0)
})

// 计算是否可以修改为预留单（流转前）
const canChangeToReserved = computed(() => {
  return orderDetail.markType === 'normal' &&
         orderDetail.auditStatus === 'pending' &&
         !orderDetail.isAuditTransferred
})

// 计算是否可以申请改代收
const canApplyCodCancel = computed(() => {
  console.log('[改代收按钮] 检查条件:', {
    status: orderDetail.status,
    codStatus: orderDetail.codStatus,
    codAmount: orderDetail.codAmount,
    totalAmount: orderDetail.totalAmount,
    depositAmount: orderDetail.depositAmount,
    hasPendingApplication: orderDetail.hasPendingCodApplication
  })

  // 🔥 已签收和已完成的订单不能改代收（客户已经把钱给快递员了）
  const signedStatuses = ['delivered', 'completed']
  if (signedStatuses.includes(orderDetail.status)) {
    console.log('[改代收按钮] 订单已签收，不能改代收:', orderDetail.status)
    return false
  }

  // 订单需要已发货（但不能是已签收或已完成）
  if (orderDetail.status !== 'shipped') {
    console.log('[改代收按钮] 订单状态不符合:', orderDetail.status)
    return false
  }

  // 代收状态必须是待处理（pending）
  if (orderDetail.codStatus !== 'pending') {
    console.log('[改代收按钮] 代收状态不符合:', orderDetail.codStatus)
    return false
  }

  // 🔥 修复：计算原始代收金额（总额-定金），与显示逻辑保持一致
  const originalCodAmount = (orderDetail.totalAmount || 0) - (orderDetail.depositAmount || 0)

  // 必须有代收金额（使用原始计算值，而不是数据库中可能被修改过的codAmount）
  if (originalCodAmount <= 0) {
    console.log('[改代收按钮] 原始代收金额不符合:', originalCodAmount)
    return false
  }

  // 不能有待审核的取消代收申请
  if (orderDetail.hasPendingCodApplication) {
    console.log('[改代收按钮] 已有待审核申请')
    return false
  }

  console.log('[改代收按钮] 所有条件符合，按钮可用')
  return true
})

// 计算改代收按钮的禁用原因提示
const codCancelDisabledReason = computed(() => {
  // 优先检查是否有待审核申请
  if (orderDetail.hasPendingCodApplication) {
    return '该订单已有待审核的取消代收申请'
  }

  // 🔥 已签收和已完成的订单不能改代收
  const signedStatuses = ['delivered', 'completed']
  if (signedStatuses.includes(orderDetail.status)) {
    return '订单已签收，不支持改代收'
  }

  // 检查代收状态
  if (orderDetail.codStatus === 'cancelled') {
    // 已改代收，显示当前代收金额
    const currentCodAmount = orderDetail.codAmount !== undefined && orderDetail.codAmount !== null
      ? Number(orderDetail.codAmount)
      : 0

    if (currentCodAmount === 0) {
      return '已审核通过改代收为¥0.00，不再支持改代收'
    } else {
      return `已改代收为¥${currentCodAmount.toFixed(2)}，不再支持改代收`
    }
  }

  if (orderDetail.codStatus === 'returned') {
    return '该订单已返款，无法改代收'
  }

  // 检查订单状态（只允许已发货状态）
  if (orderDetail.status !== 'shipped') {
    return '订单需要已发货后才能改代收'
  }

  // 🔥 修复：计算原始代收金额（总额-定金），与显示和判断逻辑保持一致
  const originalCodAmount = (orderDetail.totalAmount || 0) - (orderDetail.depositAmount || 0)
  if (originalCodAmount <= 0) {
    return '该订单无代收金额'
  }

  // 如果所有条件都符合，返回空字符串（按钮可用）
  return ''
})

// 定金截图列表计算属性
const depositScreenshotList = computed(() => {
  // 优先使用新的多张截图字段，如果没有则使用单张截图字段
  if (orderDetail.depositScreenshots && orderDetail.depositScreenshots.length > 0) {
    return orderDetail.depositScreenshots
  } else if (orderDetail.depositScreenshot) {
    return [orderDetail.depositScreenshot]
  }
  return []
})

// 方法
const goBack = () => {
  router.back()
}

// 跳转到改代收申请页面
const handleApplyCodCancel = () => {
  // 跳转到取消代收申请页面，并传递订单ID
  router.push({
    path: '/order/my-cod-application',
    query: {
      orderId: orderDetail.id,
      autoFill: 'true'
    }
  })
}

// 预览定金截图
const previewScreenshot = (index: number) => {
  currentImageIndex.value = index
  showImageViewer.value = true
}

// 检查是否已存在售后记录
const checkExistingAfterSales = async (orderId: string) => {
  return await serviceStore.checkExistingAfterSales(orderId)
}

const createAfterSales = async () => {
  try {
    // 首先检查是否已存在售后记录
    const existingAfterSales = await checkExistingAfterSales(orderDetail.id)

    if (existingAfterSales) {
      // 如果已存在售后记录，直接跳转到售后详情页
      safeNavigator.push(`/service/detail/${existingAfterSales.id}`)
      ElMessage.info('该订单已有售后记录，已跳转到售后详情页')
    } else {
      // 如果不存在售后记录，跳转到新增售后页面并传递订单信息
      safeNavigator.push({
        path: '/service/add',
        query: {
          orderId: orderDetail.id,
          orderNumber: orderDetail.orderNumber,
          customerId: orderDetail.customer.id,
          customerName: orderDetail.customer.name,
          customerPhone: orderDetail.customer.phone
        }
      })
    }
  } catch (error) {
    console.error('检查售后记录失败:', error)
    // 如果检查失败，仍然跳转到新增页面
    safeNavigator.push({
      path: '/service/add',
      query: {
        orderId: orderDetail.id,
        orderNumber: orderDetail.orderNumber,
        customerId: orderDetail.customer.id,
        customerName: orderDetail.customer.name,
        customerPhone: orderDetail.customer.phone
      }
    })
  }
}

const handleMarkCommand = async (command: string) => {
  // 检查是否选择了相同的标记
  if (command === orderDetail.markType) {
    ElMessage.warning('订单已经是该标记状态')
    return
  }

  const markTypes: Record<string, string> = {
    'reserved': '预留单',
    'normal': '正常发货单',
    'return': '退单'
  }

  // 🔥 权限检查：只有待流转状态才能修改标记
  if (!canModifyMark.value) {
    if (orderDetail.auditStatus === 'approved') {
      ElMessage.warning('订单已审核通过，无法修改标记')
    } else if (orderDetail.status === 'pending_audit') {
      ElMessage.warning('订单已流转到审核，无法修改标记。如需修改，请等待审核完成或联系审核员退回订单。')
    } else {
      ElMessage.warning('当前状态下无法修改订单标记')
    }
    return
  }

  // 构建确认消息
  let confirmMessage = `确认将此订单标记为"${markTypes[command]}"？`
  if (command === 'reserved') {
    confirmMessage += '\n注意：修改为预留单后，订单将不会流转到审核，信息将保留在系统中。'
  } else if (command === 'return') {
    confirmMessage += '\n注意：修改为退单后，订单将不会流转到审核，信息将保留在系统中。'
  }

  try {
    await ElMessageBox.confirm(confirmMessage, '确认标记', { type: 'warning' })

    console.log('[订单详情] 开始更新标记，订单ID:', orderId, '新标记:', command)

    // 调用后端API更新标记
    const response = await orderApi.updateMarkType(orderId, { markType: command })
    console.log('[订单详情] API响应:', response)

    if (response && (response.success !== false)) {
      // 停止倒计时（如果正在运行）
      if (countdownTimer.value) {
        clearInterval(countdownTimer.value)
        countdownTimer.value = null
      }

      // 更新本地订单标记状态
      orderDetail.markType = command

      // 如果是预留单或退单，标记为已处理防止自动流转
      if (command === 'reserved' || command === 'return') {
        orderDetail.isAuditTransferred = true
      }

      // 更新orderStore中的数据
      orderStore.updateOrder(orderId, {
        markType: command,
        isAuditTransferred: command === 'reserved' || command === 'return'
      })

      // 显示成功提示
      if (command === 'return') {
        ElMessage.success('订单已标记为退单，信息已保留在系统中')
      } else if (command === 'reserved') {
        ElMessage.success('订单已标记为预留单，信息已保留在系统中')
      } else if (command === 'normal') {
        ElMessage.success('订单已标记为正常发货单')
      } else {
        ElMessage.success(`订单已标记为${markTypes[command]}`)
      }

      // 发送通知 - 使用正确的sendMessage签名: (type, content, options)
      notificationStore.sendMessage(
        notificationStore.MessageType.SYSTEM_UPDATE,
        `订单 ${orderDetail.orderNumber} 已标记为${markTypes[command]}`,
        {
          relatedId: orderDetail.id,
          relatedType: 'order',
          actionUrl: `/order/detail/${orderId}`
        }
      )
    } else {
      console.error('[订单详情] 更新标记失败，响应:', response)
      ElMessage.error(response?.message || '更新订单标记失败')
    }
  } catch (error: unknown) {
    // 用户取消操作
    if (error === 'cancel' || (error as Error)?.message === 'cancel') {
      return
    }
    console.error('[订单详情] 更新订单标记异常:', error)
    const errorMsg = (error as any)?.response?.data?.message || (error as Error)?.message || '更新订单标记失败，请重试'
    ElMessage.error(errorMsg)
  }
}

const approveOrder = async () => {
  try {
    await ElMessageBox.confirm('确认审核通过此订单？', '审核确认', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 使用store方法同步状态和添加操作记录
    orderStore.syncOrderStatus(orderId, 'pending_shipment', '审核员', '订单审核通过，等待发货')
    orderDetail.status = 'pending_shipment'

    // 发送通知消息 - 使用正确的sendMessage签名
    notificationStore.sendMessage(
      notificationStore.MessageType.ORDER_AUDIT_APPROVED,
      `订单 ${orderDetail.orderNumber} (客户: ${orderDetail.customer.name}, 金额: ¥${orderDetail.totalAmount?.toLocaleString()}) 已审核通过`,
      {
        relatedId: orderId,
        relatedType: 'order',
        actionUrl: `/order/detail/${orderId}`
      }
    )

    ElMessage.success('订单审核通过')
  } catch (error) {
    // 用户取消
  }
}

const rejectOrder = async () => {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '审核拒绝', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '请输入拒绝原因'
    })

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 使用store方法同步状态和添加操作记录
    orderStore.syncOrderStatus(orderId, 'audit_rejected', '审核员', `订单审核拒绝：${reason}`)
    orderDetail.status = 'audit_rejected'

    // 发送通知消息 - 使用正确的sendMessage签名
    notificationStore.sendMessage(
      notificationStore.MessageType.ORDER_AUDIT_REJECTED,
      `订单 ${orderDetail.orderNumber} (客户: ${orderDetail.customer.name}, 金额: ¥${orderDetail.totalAmount?.toLocaleString()}) 已审核拒绝，原因: ${reason}`,
      {
        relatedId: orderId,
        relatedType: 'order',
        actionUrl: `/order/detail/${orderId}`
      }
    )

    ElMessage.success('订单已拒绝')
  } catch (error) {
    // 用户取消
  }
}

// 🔥 点击电话号码跳转到通话管理页面发起外呼
const callCustomer = (phone?: string) => {
  const phoneNumber = phone || orderDetail.customer?.phone
  if (!phoneNumber) {
    ElMessage.warning('电话号码为空')
    return
  }

  safeNavigator.push({
    path: '/service-management/call',
    query: {
      action: 'outbound',
      customerId: orderDetail.customer?.id || '',
      customerName: orderDetail.customer?.name || orderDetail.customerName || '',
      customerPhone: phoneNumber,
      company: ''
    }
  })
}

const goToCustomerDetail = () => {
  console.log('goToCustomerDetail called')
  console.log('orderDetail.customer:', orderDetail.customer)
  console.log('customer id:', orderDetail.customer.id)
  console.log('跳转路径:', `/customer/detail/${orderDetail.customer.id}`)
  safeNavigator.push(`/customer/detail/${orderDetail.customer.id}`)
}

// 复制物流单号并提示选择跳转网站（使用统一的物流查询弹窗）
const trackExpress = async () => {
  if (!orderDetail.trackingNumber) {
    ElMessage.warning('物流单号不存在')
    return
  }

  const { showLogisticsQueryDialog } = await import('@/utils/logisticsQuery')
  showLogisticsQueryDialog({
    trackingNo: orderDetail.trackingNumber,
    companyCode: orderDetail.expressCompany,
    router
  })
}

// 动态更新预计到达时间（使用智能计算）
const updateEstimatedDeliveryTime = (logisticsResult: any) => {
  try {
    const tracks = logisticsResult.tracks || logisticsResult.traces || []
    const latestTrack = tracks[0] // 最新的物流信息

    if (!latestTrack) return

    const latestDescription = latestTrack.description || latestTrack.status || latestTrack.statusText || ''

    // 使用智能物流状态检测
    const detectedStatus = detectLogisticsStatusFromDescription(latestDescription)

    // 已签收，无需更新
    if (detectedStatus === 'delivered') return

    // 使用智能计算预计送达时间
    const estimated = calculateEstimatedDelivery({
      logisticsStatus: detectedStatus,
      companyCode: orderDetail.expressCompany,
      shipDate: orderDetail.shippedAt || orderDetail.shippingTime || '',
      latestLogisticsInfo: latestDescription,
      existingEstimatedDate: orderDetail.expectedDeliveryDate
    })

    if (estimated) {
      orderDetail.expectedDeliveryDate = estimated
    }
  } catch (error) {
    console.error('更新预计到达时间失败:', error)
  }
}

const refreshLogistics = async (phone?: string) => {
  if (!orderDetail.trackingNumber || !orderDetail.expressCompany) {
    // 🔥 改进提示：不要误导用户
    logisticsInfo.value = []
    ElMessage.warning('缺少快递单号或快递公司信息')
    return
  }

  try {
    logisticsLoading.value = true

    // 🔥 自动使用订单中的手机号（如果没有手动传入）
    // 确保手机号是字符串类型
    let phoneToUse = phone || ''
    if (!phoneToUse) {
      const rawPhone = orderDetail.receiverPhone || orderDetail.customer?.phone || ''
      phoneToUse = String(rawPhone || '')
    }
    console.log('[订单详情] 查询物流，使用手机号:', phoneToUse ? phoneToUse.slice(-4) + '****' : '未提供')

    // 🔥 直接调用物流API，支持手机号验证
    const { logisticsApi } = await import('@/api/logistics')

    let response: any
    try {
      response = await logisticsApi.queryTrace(
        orderDetail.trackingNumber,
        orderDetail.expressCompany,
        phoneToUse
      )
    } catch (apiError: any) {
      console.error('[订单详情] 物流API调用失败:', apiError)
      // 🔥 网络错误或API错误时，给出友好提示
      logisticsInfo.value = []
      const errorMsg = apiError?.message || apiError?.response?.data?.message || '网络请求失败'
      ElMessage.error(`查询失败: ${errorMsg}`)
      return
    }

    // 🔥 检查响应是否有效
    if (!response) {
      logisticsInfo.value = []
      ElMessage.info('暂无物流信息')
      return
    }

    if (response.success && response.data) {
      const data = response.data

      // 🔥 检查是否需要手机号验证（即使带了手机号也可能验证失败，因为可能是寄件人手机号）
      if (data.status === 'need_phone_verify' ||
          (!data.success && (data.statusText === '需要手机号验证' || data.statusText?.includes('routes为空')))) {
        // 弹出手机号验证对话框，让用户手动输入
        pendingTrackingNo.value = orderDetail.trackingNumber
        pendingCompanyCode.value = orderDetail.expressCompany
        phoneVerifyDialogVisible.value = true
        logisticsLoading.value = false
        return
      }

      if (data.success && data.traces && data.traces.length > 0) {
        // 🔥 去重：根据时间和描述去重
        const seen = new Set<string>()
        const uniqueTraces = data.traces.filter((track: any) => {
          const key = `${track.time}-${track.description}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })

        // 转换并显示物流轨迹数据 - 只保留必要信息
        const mappedTraces = uniqueTraces.map((track: any) => ({
          time: track.time,
          status: track.status || '',
          statusText: track.description || track.status || '',
          description: track.description || track.status || '状态更新',
          location: track.location || ''
        }))

        // 🔥 按时间倒序排列（最新的在最上面）
        logisticsInfo.value = mappedTraces.sort((a: any, b: any) => {
          const timeA = new Date(a.time).getTime()
          const timeB = new Date(b.time).getTime()
          return timeB - timeA
        })

        // 🔥 如果API返回了预计送达时间，更新订单详情
        if (data.estimatedDeliveryTime) {
          orderDetail.expectedDeliveryDate = data.estimatedDeliveryTime
        }

        ElMessage.success('物流信息已更新')
      } else {
        // 🔥 如果没有查询到数据，给出友好提示
        logisticsInfo.value = []
        const friendlyMessage = getFriendlyNoTraceMessage(data.statusText)
        ElMessage.info(friendlyMessage)
      }
    } else {
      logisticsInfo.value = []
      // 🔥 友好提示
      const friendlyMessage = getFriendlyNoTraceMessage(response?.message || response?.data?.statusText)
      ElMessage.info(friendlyMessage)
    }
  } catch (error: any) {
    console.error('[订单详情] 获取物流信息失败:', error)
    logisticsInfo.value = []
    // 🔥 改进错误提示，不要显示技术性错误
    const errorMsg = error?.message || '未知错误'
    if (errorMsg.includes('Network') || errorMsg.includes('timeout') || errorMsg.includes('ECONNREFUSED')) {
      ElMessage.error('网络连接失败，请检查网络后重试')
    } else {
      ElMessage.error('获取物流信息失败，请稍后重试')
    }
  } finally {
    logisticsLoading.value = false
  }
}

/**
 * 🔥 获取友好的无物流信息提示
 * 针对刚发货的订单给出更友好的提示
 */
const getFriendlyNoTraceMessage = (originalMessage?: string) => {
  // 如果是API未配置等技术性错误，给出友好提示
  if (originalMessage?.includes('API未配置') ||
      originalMessage?.includes('未查询到') ||
      originalMessage?.includes('routes为空') ||
      !originalMessage) {
    return '暂无物流信息，快递可能刚揽收，建议12-24小时后再查询'
  }
  // 其他情况返回原始消息
  return originalMessage
}

// 手机号验证后重新查询物流（统一组件回调）
const handlePhoneVerifySubmit = (phone: string) => {
  phoneVerifyDialogVisible.value = false
  refreshLogistics(phone)
}

// 物流轨迹相关辅助方法
const getLogisticsType = (status: string) => {
  if (!status) return 'info'

  const types = {
    // 英文状态
    'delivered': 'success',
    'out_for_delivery': 'primary',
    'in_transit': 'primary',
    'picked_up': 'info',
    'pending': 'info',
    'exception': 'warning',
    'rejected': 'danger',
    // 中文状态
    '已签收': 'success',
    '已送达': 'success',
    '派送中': 'primary',
    '运输中': 'primary',
    '在途': 'primary',
    '已揽收': 'info',
    '已发货': 'info',
    '待发货': 'info',
    '异常': 'warning',
    '拒收': 'danger',
    '退回': 'danger'
  }

  // 检查完全匹配
  if (types[status]) {
    return types[status]
  }

  // 检查包含关键词
  if (status.includes('签收') || status.includes('送达')) return 'success'
  if (status.includes('派送') || status.includes('运输') || status.includes('在途')) return 'primary'
  if (status.includes('揽收') || status.includes('发货')) return 'info'
  if (status.includes('异常') || status.includes('问题')) return 'warning'
  if (status.includes('拒收') || status.includes('退回')) return 'danger'

  return 'info'
}

const getLogisticsIcon = (status: string) => {
  const icons = {
    'delivered': Check,
    'out_for_delivery': Van,
    'in_transit': Van,
    'picked_up': Van,
    'pending': Clock,
    'exception': Warning,
    'rejected': Close
  }
  return icons[status] || Clock
}

// 辅助方法
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    // 新的状态枚举
    'pending_transfer': 'info',      // 待流转 - 灰色
    'pending_audit': 'warning',      // 待审核 - 橙色
    'audit_rejected': 'danger',      // 审核拒绝 - 红色
    'pending_shipment': 'primary',   // 待发货 - 蓝色
    'shipped': 'primary',            // 已发货 - 蓝色
    'delivered': 'success',          // 已签收 - 绿色
    'package_exception': 'warning',  // 包裹异常 - 橙色
    'rejected': 'danger',            // 拒收 - 红色
    'rejected_returned': 'info',     // 拒收已退回 - 灰色
    'after_sales_created': 'warning', // 已建售后 - 橙色
    'cancelled': 'info',             // 已取消 - 灰色
    'draft': 'info',                 // 草稿 - 灰色

    // 兼容旧状态
    'pending': 'warning',
    'pending_approval': 'warning',
    'approved': 'success',
    'paid': 'success',
    'completed': 'success',
    'confirmed': 'success'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts = {
    // 新的状态枚举
    'pending_transfer': '待流转',
    'pending_audit': '待审核',
    'audit_rejected': '审核拒绝',
    'pending_shipment': '待发货',
    'shipped': '已发货',
    'delivered': '已签收',
    'package_exception': '包裹异常',
    'rejected': '拒收',
    'rejected_returned': '拒收已退回',
    'after_sales_created': '已建售后',
    'cancelled': '已取消',
    'draft': '草稿',

    // 兼容旧状态
    'pending': '待处理',
    'pending_approval': '待审核',
    'approved': '已审核',
    'paid': '已付款',
    'completed': '已完成',
    'confirmed': '已确认'
  }
  return texts[status] || status
}

// 获取支付方式文本
const getPaymentMethodText = (method: string | null | undefined) => {
  if (!method) return '-'
  // 如果是"其他"且有自定义文本，显示自定义文本
  if (method === 'other' && orderDetail.paymentMethodOther) {
    return orderDetail.paymentMethodOther
  }
  const methodMap: Record<string, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
    bank_transfer: '银行转账',
    unionpay: '云闪付',
    cod: '货到付款',
    cash: '现金',
    card: '刷卡',
    other: '其他'
  }
  return methodMap[method] || method
}

const getLevelType = (level: string) => {
  const types = {
    'vip': 'warning',
    'premium': 'danger',
    'normal': 'info'
  }
  return types[level] || 'info'
}

const getLevelText = (level: string) => {
  const texts = {
    'vip': 'VIP客户',
    'premium': '高级客户',
    'normal': '普通客户'
  }
  return texts[level] || '普通客户'
}

const getExpressCompanyText = (code: string) => {
  if (!code) return '-'
  const companies: Record<string, string> = {
    'SF': '顺丰速运',
    'YTO': '圆通速递',
    'ZTO': '中通快递',
    'STO': '申通快递',
    'YD': '韵达快递',
    'JTSD': '极兔速递',
    'EMS': 'EMS',
    'YZBK': '邮政包裹',
    'DBL': '德邦快递',
    'JD': '京东物流',
    // 兼容小写键名
    'sf': '顺丰速运',
    'yto': '圆通速递',
    'zto': '中通快递',
    'sto': '申通快递',
    'yd': '韵达快递',
    'jtsd': '极兔速递',
    'ems': 'EMS',
    'yzbk': '邮政包裹',
    'dbl': '德邦快递',
    'jd': '京东物流'
  }
  return companies[code] || code
}

// 🔥 获取自定义字段值（支持customFields对象和独立字段两种格式）
const getCustomFieldValue = (fieldKey: string) => {
  // 优先从customFields对象获取
  if (orderDetail.customFields && orderDetail.customFields[fieldKey]) {
    return orderDetail.customFields[fieldKey]
  }
  // 兼容独立字段格式（如customField1）
  const independentKey = fieldKey.replace('custom_field', 'customField')
  if (orderDetail[independentKey]) {
    return orderDetail[independentKey]
  }
  return null
}

// 格式化自定义字段值
const formatCustomFieldValue = (field: any, value: any) => {
  if (value === null || value === undefined || value === '') return '-'
  if (field.fieldType === 'select' || field.fieldType === 'radio') {
    const option = field.options?.find((opt: any) => opt.value === value)
    return option?.label || value
  }
  if (field.fieldType === 'checkbox' && Array.isArray(value)) {
    return value.map((v: string) => {
      const option = field.options?.find((opt: any) => opt.value === v)
      return option?.label || v
    }).join(', ')
  }
  if (field.fieldType === 'date' || field.fieldType === 'datetime') {
    return formatDateTime(value)
  }
  return String(value)
}

const getOrderSourceText = (source: string) => {
  const sources = {
    'online_store': '线上商城',
    'wechat_mini': '微信小程序',
    'wechat_service': '微信客服',
    'phone_call': '电话咨询',
    'offline_store': '线下门店',
    'referral': '客户推荐',
    'advertisement': '广告投放',
    'other': '其他渠道'
  }
  return sources[source] || source
}

const getStatusCardClass = (status: string) => {
  const classes = {
    'draft': 'status-draft',
    'pending': 'status-pending',
    'pending_approval': 'status-pending-approval',
    'approved': 'status-approved',
    'rejected': 'status-rejected',
    'paid': 'status-paid',
    'shipped': 'status-shipped',
    'delivered': 'status-delivered',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled'
  }
  return classes[status] || ''
}

const getAfterSalesType = (type: string) => {
  const types = {
    'refund': 'warning',
    'return': 'danger',
    'exchange': 'primary',
    'repair': 'info',
    'complaint': 'danger'
  }
  return types[type] || 'info'
}

const getMarkType = (markType: string) => {
  const types = {
    'reserved': 'warning',
    'normal': 'success',
    'return': 'danger'
  }
  return types[markType] || 'info'
}

const getMarkText = (markType: string) => {
  const texts = {
    'reserved': '预留单',
    'normal': '正常发货单',
    'return': '退单'
  }
  return texts[markType] || markType
}

const getMarkButtonType = () => {
  if (!orderDetail.markType) return 'default'
  const types = {
    'reserved': 'warning',
    'normal': 'success',
    'return': 'danger'
  }
  return types[orderDetail.markType] || 'default'
}

const getMarkTagType = (markType: string) => {
  const types = {
    'reserved': 'warning',
    'normal': 'success',
    'return': 'danger'
  }
  return types[markType] || 'info'
}

// formatDateTime 已从 @/utils/dateFormat 导入

const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

// 加载订单详情
const loadOrderDetail = async () => {
  try {
    loading.value = true


    // 🔥 先尝试从API获取订单详情
    let order = null
    try {
      console.log('[订单详情] 正在从API加载订单:', orderId)
      const response = await orderApi.getDetail(orderId)
      if (response.success && response.data) {
        order = response.data
        console.log('[订单详情] API加载成功:', order.orderNumber)
      }
    } catch (apiError) {
      console.warn('[订单详情] API加载失败，尝试从本地store获取:', apiError)
    }

    // 如果API没有返回数据，从本地store获取
    if (!order) {
      order = orderStore.getOrderById(orderId)
    }

    if (!order) {
      ElMessage.error('订单不存在')
      safeNavigator.push('/order/list')
      return
    }

    // 按需获取客户信息（优先store缓存，否则API加载单个客户）
    let customer = customerStore.getCustomerById(order.customerId)
    if (!customer && order.customerId) {
      try {
        const res = await customerApi.getDetail(order.customerId)
        if (res.data) customer = res.data
      } catch (_e) {
        console.warn('[订单详情] 加载客户详情失败，使用订单中的客户基本信息')
      }
    }

    // 更新订单详情数据
    Object.assign(orderDetail, {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      auditStatus: order.auditStatus || 'pending', // 审核状态
      markType: order.markType || 'normal', // 默认为正常发货单
      createTime: order.createTime,
      updateTime: order.updateTime || order.createTime,
      auditTransferTime: order.auditTransferTime || '', // 流转审核时间
      isAuditTransferred: order.isAuditTransferred || false, // 是否已流转到审核
      // 🔥 操作人信息
      createdBy: order.createdBy || '',
      createdByName: order.createdByName || '系统',
      auditBy: order.auditBy || '',
      auditByName: order.auditByName || '',
      auditRemark: order.auditRemark || '',
      shippedBy: order.shippedBy || '',
      shippedByName: order.shippedByName || '',
      cancelledBy: order.cancelledBy || '',
      cancelledByName: order.cancelledByName || '',
      customer: customer ? {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        wechat: customer.wechatId || '',
        address: customer.address,
        level: customer.level,
        avatar: ''
      } : {
        id: order.customerId,
        name: order.customerName,
        phone: order.customerPhone,
        wechat: '',
        address: '',
        level: 'normal',
        avatar: ''
      },
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      receiverAddress: order.receiverAddress,
      expressCompany: order.expressCompany || '',
      trackingNumber: order.trackingNumber || '',
      serviceWechat: order.serviceWechat || '',
      orderSource: order.orderSource || '',
      expectedShipDate: order.expectedShipDate || '',
      expectedDeliveryDate: order.expectedDeliveryDate || '',
      products: order.products,
      subtotal: order.subtotal,
      discount: order.discount,
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      codAmount: order.codAmount !== undefined ? order.codAmount : ((order.totalAmount || 0) - (order.depositAmount || 0)),
      codStatus: order.codStatus || 'pending',
      hasPendingCodApplication: order.hasPendingCodApplication || false,
      depositScreenshot: order.depositScreenshot || '',
      depositScreenshots: order.depositScreenshots || [],
      paymentMethod: order.paymentMethod || '',
      paymentMethodOther: order.paymentMethodOther || '',
      remark: order.remark,
      customFields: order.customFields || {}
    })

    // 加载订单状态轨迹
    loadOrderTimeline()

    // 加载售后历史数据
    loadAfterSalesHistory()

    // 加载物流信息（如果有物流单号和快递公司）
    if (orderDetail.trackingNumber && orderDetail.expressCompany) {
      refreshLogistics()
    }

    // 设置事件监听
    setupEventListeners()

    // 初始化倒计时
    initCountdown()
  } catch (error) {
    ElMessage.error('加载订单详情失败')
    safeNavigator.push('/order/list')
  } finally {
    loading.value = false
  }
}

// 倒计时相关方法
const initCountdown = () => {
  console.log('[倒计时] 初始化倒计时', {
    markType: orderDetail.markType,
    status: orderDetail.status,
    auditStatus: orderDetail.auditStatus,
    isAuditTransferred: orderDetail.isAuditTransferred,
    auditTransferTime: orderDetail.auditTransferTime
  })

  // 清除之前的定时器
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }

  // 只有正常发货单且状态为pending_transfer才需要倒计时
  if (orderDetail.markType !== 'normal' || orderDetail.status !== 'pending_transfer') {
    console.log('[倒计时] 不满足倒计时条件，跳过')
    return
  }

  // 如果已流转，不需要倒计时
  if (orderDetail.isAuditTransferred) {
    console.log('[倒计时] 订单已流转，跳过')
    return
  }

  // 必须有流转时间
  if (!orderDetail.auditTransferTime) {
    console.log('[倒计时] 没有流转时间，无法启动倒计时')
    return
  }

  // 开始倒计时
  updateCountdown()
  countdownTimer.value = setInterval(updateCountdown, 1000)
  console.log('[倒计时] 倒计时已启动')
}

const updateCountdown = () => {
  if (!orderDetail.auditTransferTime) return

  const transferTime = new Date(orderDetail.auditTransferTime).getTime()
  const now = Date.now()
  const remaining = Math.max(0, transferTime - now)

  console.log('[倒计时] 更新倒计时', {
    流转时间字符串: orderDetail.auditTransferTime,
    流转时间戳: transferTime,
    当前时间戳: now,
    剩余毫秒: remaining,
    剩余秒数: Math.floor(remaining / 1000)
  })

  if (remaining <= 0) {
    // 时间到了，调用后端API执行流转
    countdownSeconds.value = 0
    countdownText.value = '正在流转...'
    if (countdownTimer.value) {
      clearInterval(countdownTimer.value)
      countdownTimer.value = null
    }

    // 调用后端流转API
    transferToAudit()
    return
  }

  countdownSeconds.value = Math.floor(remaining / 1000)

  // 格式化倒计时文本
  const minutes = Math.floor(countdownSeconds.value / 60)
  const seconds = countdownSeconds.value % 60
  countdownText.value = `${minutes}分${seconds.toString().padStart(2, '0')}秒`
}

const transferToAudit = () => {
  // 标记为已流转
  orderDetail.isAuditTransferred = true

  // 更新订单状态为待审核
  orderDetail.status = 'pending_audit'
  orderDetail.auditStatus = 'pending'

  // 更新store中的数据
  orderStore.updateOrder(orderId, {
    isAuditTransferred: true,
    status: 'pending_audit',
    auditStatus: 'pending'
  })

  // 调用store的检查和流转方法
  orderStore.checkAndTransferOrders()

  ElMessage.info('订单已自动流转到审核')

  // 发送通知 - 使用正确的sendMessage签名
  notificationStore.sendMessage(
    notificationStore.MessageType.ORDER_PENDING_AUDIT,
    `订单 ${orderDetail.orderNumber} 已自动流转到审核`,
    {
      relatedId: orderDetail.id,
      relatedType: 'order',
      actionUrl: `/order/detail/${orderId}`
    }
  )
}

onMounted(async () => {
  // 🔥 加载自定义字段配置（从数据库）
  await orderFieldConfigStore.loadConfig()

  // 注意：不要在这里调用 initializeWithMockData
  // createPersistentStore 会自动从 localStorage 恢复数据
  // 如果数据为空，说明确实没有数据，不应该强制初始化

  loadOrderDetail()
})

onUnmounted(() => {
  // 清理定时器
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }

  // 清理事件监听器
  window.removeEventListener('operation-log-update', operationLogListener)
  window.removeEventListener('order-status-update', orderStatusListener)
  window.removeEventListener('logistics-status-update', logisticsStatusListener)
  window.removeEventListener('after-sales-update', afterSalesUpdateListener)
  window.removeEventListener('service-status-update', serviceStatusUpdateListener)
})
</script>

<style scoped>
/* 子组件已各自包含自己的样式，父组件改为 scoped */
.order-detail {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-info h2 {
  margin: 0 0 4px 0;
  color: #303133;
}

.order-number {
  color: #606266;
  font-size: 14px;
}

.order-mark {
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mark-dropdown {
  position: relative;
}

.mark-status {
  margin-left: 8px;
  margin-right: 8px;
}

.mark-status .el-tag {
  font-weight: 600;
  border-radius: 6px;
  padding: 6px 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: 600;
  width: 100%;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-timeline-card {
  margin-bottom: 20px;
}

.timeline-content {
  padding: 8px 0;
}

.timeline-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.timeline-description {
  color: #606266;
  margin-bottom: 4px;
}

.timeline-operator {
  color: #909399;
  font-size: 12px;
}

/* 行布局样式 */
.row-layout {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  align-items: stretch; /* 确保所有卡片高度一致 */
}

.row-layout.full-width {
  display: block;
}

.row-left {
  flex: 2;
  display: flex;
  flex-direction: column;
}

.row-right {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.row-left-wide {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 确保第一排卡片高度一致 */
.row-layout .el-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.row-layout .el-card .el-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 金额信息卡片样式 */
.amount-info-card {
  margin-top: 20px;
}

.amount-info-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.amount-main-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.amount-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  background: #f8f9fa;
  min-width: 120px;
}

.amount-item.total {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.amount-item.deposit {
  background: linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%);
}

.amount-item.collect {
  background: linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%);
}

.amount-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.amount-value {
  font-size: 20px;
  font-weight: bold;
}

.total-value {
  color: #1976d2;
}

.deposit-value {
  color: #f57c00;
}

.collect-value {
  color: #7b1fa2;
}

.amount-detail-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  padding: 12px 0;
  border-top: 1px solid #e0e0e0;
}

.amount-detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-label {
  font-size: 14px;
  color: #666;
}

.detail-value {
  font-size: 16px;
  font-weight: bold;
}

.subtotal-value {
  color: #2e7d32;
}

.discount-value {
  color: #d32f2f;
}

/* 订单标记信息卡片样式 */
.mark-info-card {
  margin-bottom: 20px;
}

.mark-info-content {
  padding: 8px 0;
}

.mark-status-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.current-mark {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mark-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.mark-tag {
  font-size: 14px;
  padding: 8px 16px;
}

.mark-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.mark-locked {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f56c6c;
  font-size: 14px;
}

.lock-icon {
  font-size: 16px;
}

.lock-text {
  font-weight: 500;
}

/* 订单状态现代化样式 */
.order-status-modern {
  background: #ffffff;
  border: 1px solid #f0f2f5;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.order-status-modern:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.status-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon {
  font-size: 20px;
  color: #64748b;
}

.title-text {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.status-tag-modern {
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
}

.status-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
}

.timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 24px;
  width: 2px;
  height: calc(100% + 8px);
  background: linear-gradient(to bottom, #e2e8f0, transparent);
}

.timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #64748b;
  border: 3px solid #ffffff;
  box-shadow: 0 0 0 2px #e2e8f0;
  flex-shrink: 0;
  margin-top: 2px;
}

.countdown-dot {
  background: #f59e0b;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 4px;
  font-weight: 500;
}

.timeline-value {
  font-size: 15px;
  color: #1e293b;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.countdown-value {
  color: #f59e0b;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.countdown-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
}

.status-tip {
  margin-top: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.tip-icon {
  font-size: 18px;
  color: #f59e0b;
  flex-shrink: 0;
}

.tip-text {
  font-size: 14px;
  color: #92400e;
  line-height: 1.5;
}

/* 客户信息卡片 */
.customer-info {
  display: flex;
  gap: 16px;
  height: 100%;
}

.customer-avatar {
  flex-shrink: 0;
}

.customer-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.customer-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.customer-contact {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
}

.phone-item {
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.contact-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.call-button {
  min-width: 60px;
  height: 28px;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

.call-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(64, 158, 255, 0.4);
}

/* 收货信息紧凑样式 */
.delivery-compact {
  padding: 20px;
  background: linear-gradient(135deg, #f1f5f9 0%, #ffffff 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.delivery-compact:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.delivery-header-compact {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.delivery-icon {
  font-size: 18px;
  color: #64748b;
}

.delivery-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.delivery-content-compact {
  padding: 0;
}

.delivery-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.delivery-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.address-field {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field-value {
  font-size: 15px;
  color: #1e293b;
  font-weight: 600;
  line-height: 1.4;
}

.phone-clickable {
  cursor: pointer;
  color: #3b82f6;
  transition: all 0.2s ease;
  padding: 4px 8px;
  border-radius: 6px;
  margin: -4px -8px;
}

.phone-clickable:hover {
  background: #eff6ff;
  color: #1d4ed8;
  transform: scale(1.02);
}

.address-value {
  word-break: break-word;
  line-height: 1.5;
  color: #374151;
}

/* 收货信息现代化样式 */
.delivery-info-card {
  background: #ffffff;
  border: 1px solid #f0f2f5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.delivery-info-modern {
  padding: 0;
}

.delivery-grid-modern {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.delivery-field-modern {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.address-field-modern {
  grid-column: 1 / -1;
}

.field-label-modern {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.field-value-modern {
  font-size: 16px;
  color: #111827;
  font-weight: 600;
  line-height: 1.5;
}

.phone-clickable {
  cursor: pointer;
  color: #3b82f6;
  transition: all 0.2s ease;
  padding: 4px 8px;
  border-radius: 6px;
  margin: -4px -8px;
}

.phone-clickable:hover {
  background: #eff6ff;
  color: #1d4ed8;
  transform: scale(1.02);
}

.address-value-modern {
  word-break: break-word;
  line-height: 1.6;
  color: #374151;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .delivery-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .address-field {
    grid-column: 1;
  }

  .delivery-grid-modern {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .address-field-modern {
    grid-column: 1;
  }
}

/* 商品列表 */
.product-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.product-image {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-details {
  flex: 1;
}

.product-name {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.product-sku {
  color: #909399;
  font-size: 12px;
}

/* 金额信息 */
.amount-summary {
  margin-bottom: 20px;
}

.amount-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.amount-item:last-child {
  border-bottom: none;
}

.amount-item.total {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  border-top: 2px solid #e4e7ed;
  padding-top: 12px;
  margin-top: 8px;
}

.amount-item .label {
  color: #606266;
}

.amount-item .value {
  font-weight: 600;
  color: #303133;
}

.amount-item .value.discount {
  color: #67c23a;
}

.amount-item .value.deposit {
  color: #e6a23c;
}

.amount-item .value.collect {
  color: #f56c6c;
}

/* 金额横排显示样式 */
.amount-summary-horizontal {
  margin-top: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.amount-row-main {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.amount-card {
  flex: 1;
  min-width: 180px;
  max-width: 220px;
  padding: 20px 16px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.amount-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: inherit;
  opacity: 0.9;
  z-index: 1;
}

.amount-card > * {
  position: relative;
  z-index: 2;
}

.amount-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.amount-card.total-amount {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.amount-card.total-amount::after {
  content: '💰';
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 18px;
  opacity: 0.7;
  z-index: 2;
}

.amount-card.deposit-amount {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.amount-card.deposit-amount::after {
  content: '💳';
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 18px;
  opacity: 0.7;
  z-index: 2;
}

.amount-card.collect-amount {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.amount-card.collect-amount::after {
  content: '📦';
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 18px;
  opacity: 0.7;
  z-index: 2;
}

.amount-label {
  font-size: 13px;
  margin-bottom: 12px;
  opacity: 0.9;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.amount-value {
  font-size: 24px;
  font-weight: 700;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.amount-row-detail {
  display: flex;
  gap: 32px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(228, 231, 237, 0.6);
  backdrop-filter: blur(10px);
  margin-top: 8px;
}

.amount-detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  border: 1px solid rgba(228, 231, 237, 0.5);
  transition: all 0.2s ease;
}

.amount-detail-item:hover {
  background: rgba(255, 255, 255, 1);
  border-color: #409eff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.detail-label {
  color: #606266;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.detail-value {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.detail-value.subtotal {
  color: #2563eb;
  font-weight: 700;
}

.detail-value.discount {
  color: #dc2626;
  font-weight: 700;
}

.subtotal-item {
  border-left: 3px solid #2563eb;
}

.discount-item {
  border-left: 3px solid #dc2626;
}

.payment-item {
  border-left: 3px solid #8b5cf6;
}

.payment-item .detail-value.payment {
  color: #8b5cf6;
  font-weight: 600;
}

/* 现代化金额卡片样式 */
.amount-summary-modern {
  margin-top: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.amount-cards-modern {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.amount-card-modern {
  flex: 1;
  min-width: 200px;
  max-width: 280px;
  padding: 20px 16px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.amount-card-modern:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.amount-icon-modern {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 18px;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.total-modern .amount-icon-modern {
  background: #eff6ff;
  color: #2563eb;
}

.deposit-modern .amount-icon-modern {
  background: #fffbeb;
  color: #d97706;
}

.collect-modern .amount-icon-modern {
  background: #f0fdf4;
  color: #16a34a;
}

.amount-content-modern {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.amount-label-modern {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  letter-spacing: 0.3px;
  margin: 0;
}

.amount-value-modern {
  font-size: 22px;
  font-weight: 600;
  color: #111827;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.2;
  margin: 0;
}

.total-modern .amount-value-modern {
  color: #2563eb;
}

.deposit-modern .amount-value-modern {
  color: #d97706;
}

.collect-modern .amount-value-modern {
  color: #16a34a;
}

.detail-value.discount::before {
  content: '🎉';
  margin-right: 4px;
  font-size: 12px;
}

/* 定金截图横向显示样式 */
.deposit-screenshot-horizontal {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.1) 0%, rgba(103, 194, 58, 0.05) 100%);
  border-radius: 8px;
  border: 1px solid rgba(103, 194, 58, 0.2);
  margin-top: 12px;
  transition: all 0.2s ease;
}

.deposit-screenshot-horizontal:hover {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.15) 0%, rgba(103, 194, 58, 0.08) 100%);
  border-color: rgba(103, 194, 58, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.1);
}

.deposit-screenshot-horizontal .label {
  color: #67c23a;
  font-weight: 600;
  font-size: 14px;
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.deposit-screenshot-horizontal .label::before {
  content: '📸';
  margin-right: 6px;
  font-size: 16px;
}

.screenshots-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.screenshot-container {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.screenshot-count {
  color: #67c23a;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  background: rgba(103, 194, 58, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(103, 194, 58, 0.2);
  margin-left: 8px;
}

.deposit-screenshot-horizontal .el-image {
  border-radius: 8px !important;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.screenshot-container:hover .el-image {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-color: #67c23a;
}

.screenshot-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.screenshot-container:hover .screenshot-overlay {
  opacity: 1;
}

.zoom-icon {
  color: white;
  font-size: 20px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.deposit-screenshot h4 {
  margin: 0 0 12px 0;
  color: #606266;
}

.screenshot-preview {
  text-align: center;
}

/* 🔥 优化物流轨迹样式 - 简洁清晰 */
.logistics-trace-item {
  padding: 10px 14px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #dcdfe6;
  transition: all 0.3s ease;
}

.logistics-trace-item:hover {
  background: #f0f2f5;
}

.logistics-trace-first {
  background: linear-gradient(135deg, #ecf5ff 0%, #f0f9eb 100%);
  border-left-color: #409eff;
}

.logistics-trace-first .trace-description {
  color: #409eff;
  font-weight: 600;
}

.trace-description {
  color: #303133;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.trace-location {
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.trace-location .el-icon {
  font-size: 14px;
}

/* 保留旧样式兼容 */
.logistics-content {
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #dcdfe6;
  transition: all 0.3s ease;
}

.logistics-content:hover {
  background: #f0f2f5;
}

.logistics-content-first {
  background: linear-gradient(135deg, #ecf5ff 0%, #f0f9eb 100%);
  border-left-color: #409eff;
}

.logistics-status-text {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
  margin-bottom: 6px;
}

.logistics-content-first .logistics-status-text {
  color: #409eff;
}

.logistics-description {
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 8px;
}

.logistics-location {
  color: #909399;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tracking-number {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-remark {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

/* 售后历史 */
.after-sales-content {
  padding: 8px 0;
}

.after-sales-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.after-sales-description {
  color: #606266;
  margin-bottom: 4px;
}

.after-sales-operator {
  color: #909399;
  font-size: 12px;
  margin-bottom: 4px;
}

.after-sales-amount {
  color: #f56c6c;
  font-weight: 600;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .row-layout {
    flex-direction: column;
  }

  .row-left,
  .row-right {
    flex: 1;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .customer-info {
    flex-direction: column;
    text-align: center;
  }

  .status-info {
    gap: 12px;
  }

  .status-item {
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }
}

.order-remark h4 {
  margin: 0 0 8px 0;
  color: #606266;
}

.order-remark p {
  margin: 0;
  color: #303133;
  line-height: 1.6;
}

.operation-log-card {
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .detail-content {
    flex-direction: column;
  }

  .right-panel {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .order-detail {
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

  .customer-info {
    flex-direction: column;
    text-align: center;
  }

  .customer-contact {
    align-items: center;
  }

  .contact-item {
    justify-content: center;
  }
}

/* 物流轨迹样式 */
.logistics-track-card .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.logistics-header-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.tracking-number {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.logistics-loading {
  padding: 20px;
}

.logistics-content {
  padding: 8px 0;
}

.logistics-status {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.logistics-description {
  color: #606266;
  font-size: 14px;
  margin-bottom: 4px;
  line-height: 1.5;
}

.logistics-location {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 12px;
}

.logistics-actions {
  margin-top: 16px;
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

/* 现代化客户信息样式 */
.modern-card {
  border: 1px solid #f0f2f5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  overflow: hidden;
}

.card-header-modern {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  color: #409eff;
  font-size: 16px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
}

.view-more-btn {
  color: #409eff;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.view-more-btn:hover {
  background-color: #ecf5ff;
  color: #337ecc;
}

.customer-info-modern {
  padding: 0;
}

.customer-main {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.customer-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.customer-avatar-modern {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 24px;
  border: 3px solid #f8f9fa;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.customer-level-tag {
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
}

.customer-details-modern {
  flex: 1;
  min-width: 0;
}

.customer-name-modern {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  line-height: 1.4;
}

.customer-contact-modern {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-item-modern {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #f0f2f5;
  transition: all 0.3s ease;
  position: relative;
}

.contact-item-modern:hover {
  background: #f5f7fa;
  border-color: #e4e7ed;
}

.phone-item-modern {
  cursor: pointer;
  background: linear-gradient(135deg, #e8f4fd 0%, #f0f9ff 100%);
  border-color: #d1ecf1;
}

.phone-item-modern:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
  border-color: #bfdbfe;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.contact-icon {
  color: #409eff;
  font-size: 16px;
  flex-shrink: 0;
}

.phone-item-modern .contact-icon {
  color: #0ea5e9;
}

.contact-text {
  flex: 1;
  color: #303133;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.phone-item-modern .contact-text {
  color: #0369a1;
  font-weight: 600;
}

.call-icon {
  color: #0ea5e9;
  font-size: 14px;
  opacity: 0.7;
  transition: all 0.3s ease;
}

.phone-item-modern:hover .call-icon {
  opacity: 1;
  transform: scale(1.1);
}

.address-item {
  background: linear-gradient(135deg, #fef3e2 0%, #fef7ed 100%);
  border-color: #fed7aa;
}

.address-item:hover {
  background: linear-gradient(135deg, #fde68a 0%, #fef3c7 100%);
  border-color: #fbbf24;
}

.address-item .contact-icon {
  color: #f59e0b;
}

.address-item .contact-text {
  color: #92400e;
}

/* 订单信息现代化样式 */
.order-info-modern {
  padding: 0;
}

.order-basic-info {
  margin-bottom: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.info-item {
  padding: 16px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #f0f2f5;
  transition: all 0.3s ease;
}

.info-item:hover {
  background: #f5f7fa;
  border-color: #e4e7ed;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.info-label {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
  line-height: 1.4;
}

.order-number-value {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: #409eff;
  background: #ecf5ff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.logistics-section {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.section-title .el-icon {
  color: #10b981;
  font-size: 18px;
}

.status-indicator {
  margin-left: auto;
  border-radius: 12px;
  font-weight: 500;
}

.logistics-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.logistics-item {
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.logistics-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.logistics-item.highlight {
  background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
  border-color: #bfdbfe;
}

.logistics-item.highlight:hover {
  background: linear-gradient(135deg, #bfdbfe 0%, #dbeafe 100%);
  border-color: #93c5fd;
}

.logistics-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.logistics-value {
  font-size: 13px;
  color: #1e293b;
  font-weight: 600;
  line-height: 1.4;
}

.tracking-number-modern {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.track-btn {
  padding: 2px 6px;
  font-size: 11px;
  border-radius: 4px;
}

.estimated-delivery {
  color: #059669;
  font-weight: 700;
}

.logistics-info-grid.pending .logistics-item {
  background: #fefce8;
  border-color: #fde047;
}

.logistics-info-grid.pending .logistics-item:hover {
  background: #fef3c7;
  border-color: #fbbf24;
}

.pending-text {
  color: #92400e;
  font-style: italic;
}

.order-remark-modern {
  background: linear-gradient(135deg, #fef7ed 0%, #fefbf3 100%);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #fed7aa;
}

.remark-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
}

.remark-title .el-icon {
  color: #f59e0b;
}

.remark-content {
  color: #78350f;
  font-size: 14px;
  line-height: 1.6;
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #fde68a;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .customer-main {
    flex-direction: column;
    gap: 16px;
    align-items: center;
  }

  .customer-avatar-section {
    flex-direction: row;
    gap: 16px;
  }

  .customer-details-modern {
    width: 100%;
  }

  .customer-name-modern {
    text-align: center;
    margin-bottom: 12px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .logistics-info-grid {
    grid-template-columns: 1fr;
  }

  .logistics-section {
    padding: 16px;
  }
}

/* 水平布局状态样式 */
.status-header-horizontal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.status-right-section {
  display: flex;
  align-items: center;
  gap: 24px;
}

.status-timeline-horizontal {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.timeline-item-horizontal {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.timeline-item-horizontal:not(:last-child)::after {
  content: '';
  position: absolute;
  right: -20px;
  top: 50%;
  width: 8px;
  height: 2px;
  background: #e2e8f0;
  transform: translateY(-50%);
}

/* 倒计时样式 */
.countdown-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.countdown-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: 20px;
  color: #92400e;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.countdown-icon {
  font-size: 16px;
  color: #f59e0b;
  animation: pulse 2s infinite;
}

.countdown-text {
  font-size: 14px;
  min-width: 60px;
  text-align: center;
}

.countdown-tip {
  font-size: 12px;
  color: #78350f;
  text-align: center;
  white-space: nowrap;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

/* 打印样式 */
@media print {
  .page-header .header-actions,
  .el-button {
    display: none !important;
  }

  .order-detail {
    padding: 0;
  }

  .detail-content {
    flex-direction: column;
  }

  .right-panel {
    width: 100%;
  }
}
</style>
