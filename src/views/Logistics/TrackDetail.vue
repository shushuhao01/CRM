<template>
  <div class="track-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" :icon="ArrowLeft" circle />
        <div class="header-info">
          <h2>物流跟踪详情</h2>
          <div class="header-meta">
            <span class="tracking-no">{{ trackingInfo.trackingNo }}</span>
            <el-tag :type="getStatusColor(trackingInfo.status)" size="large">
              {{ getStatusText(trackingInfo.status) }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="handleRefresh" :icon="Refresh" :loading="loading">
          刷新轨迹
        </el-button>
        <el-button @click="handleShare" :icon="Share">
          分享
        </el-button>
        <el-button @click="handlePrint" :icon="Printer">
          打印
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 左侧轨迹信息 -->
      <el-col :span="16">
        <!-- 基本信息卡片 -->
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
            </div>
          </template>

          <div class="info-grid">
            <div class="info-item">
              <span class="label">物流单号：</span>
              <span class="value">{{ trackingInfo.trackingNo }}</span>
            </div>
            <div class="info-item">
              <span class="label">物流公司：</span>
              <span class="value">{{ trackingInfo.companyName }}</span>
            </div>
            <div class="info-item">
              <span class="label">发件人：</span>
              <span class="value">{{ trackingInfo.senderName }}</span>
            </div>
            <div class="info-item">
              <span class="label">收件人：</span>
              <span class="value">{{ trackingInfo.receiverName }}</span>
            </div>
            <div class="info-item">
              <span class="label">发件地址：</span>
              <span class="value">{{ trackingInfo.senderAddress }}</span>
            </div>
            <div class="info-item">
              <span class="label">收件地址：</span>
              <span class="value">{{ trackingInfo.receiverAddress }}</span>
            </div>
            <div class="info-item">
              <span class="label">发货时间：</span>
              <span class="value">{{ trackingInfo.shipTime }}</span>
            </div>
            <div class="info-item">
              <span class="label">预计送达：</span>
              <span class="value">{{ trackingInfo.estimatedTime }}</span>
            </div>
          </div>
        </el-card>

        <!-- 物流轨迹 -->
        <el-card class="track-card">
          <template #header>
            <div class="card-header">
              <span>物流轨迹</span>
              <span class="track-count">共 {{ trackingHistory.length }} 条记录</span>
            </div>
          </template>

          <div v-loading="loading" class="track-timeline">
            <el-timeline>
              <el-timeline-item
                v-for="(item, index) in trackingHistory"
                :key="index"
                :timestamp="item.time"
                :type="getTimelineType(item.type)"
                :size="index === 0 ? 'large' : 'normal'"
                placement="top"
              >
                <div class="track-item">
                  <div class="track-status" :class="item.type">
                    {{ item.status }}
                  </div>
                  <div class="track-description">
                    {{ item.description }}
                  </div>
                  <div class="track-location" v-if="item.location">
                    <el-icon><Location /></el-icon>
                    {{ item.location }}
                  </div>
                  <div class="track-operator" v-if="item.operator">
                    操作员：{{ item.operator }}
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧信息 -->
      <el-col :span="8">
        <!-- 配送进度 -->
        <el-card class="status-card">
          <template #header>
            <div class="card-header">
              <span>配送进度</span>
            </div>
          </template>

          <div class="progress-steps">
            <div
              v-for="(step, idx) in progressSteps"
              :key="idx"
              class="progress-step"
              :class="{ active: step.active, current: step.current }"
            >
              <div class="step-icon">
                <el-icon v-if="step.active && !step.current" :size="16"><Check /></el-icon>
                <span v-else>{{ idx + 1 }}</span>
              </div>
              <div class="step-label">{{ step.label }}</div>
              <div v-if="idx < progressSteps.length - 1" class="step-line" :class="{ filled: step.active && !step.current }"></div>
            </div>
          </div>
          <div class="progress-summary">
            <el-tag :type="getStatusColor(trackingInfo.status)" effect="dark" size="large">
              {{ getStatusText(trackingInfo.status) }}
            </el-tag>
          </div>
        </el-card>

        <!-- 时效信息 -->
        <el-card class="time-card">
          <template #header>
            <div class="card-header">
              <span>时效信息</span>
            </div>
          </template>

          <div class="time-info">
            <div class="time-item">
              <span class="label">已用时长：</span>
              <span class="value">{{ getUsedTime() }}</span>
            </div>
            <div class="time-item" v-if="trackingInfo.status !== 'delivered'">
              <span class="label">预计剩余：</span>
              <span class="value">{{ getRemainingTime() }}</span>
            </div>
            <div class="time-item">
              <span class="label">服务标准：</span>
              <span class="value">{{ trackingInfo.serviceType || '标准快递' }}</span>
            </div>
          </div>
        </el-card>

        <!-- 联系信息 -->
        <el-card class="contact-card">
          <template #header>
            <div class="card-header">
              <span>联系信息</span>
            </div>
          </template>

          <div class="contact-info">
            <div class="contact-item">
              <span class="label">客服电话：</span>
              <span class="value">{{ trackingInfo.servicePhone || '400-800-8888' }}</span>
            </div>
            <div class="contact-item">
              <span class="label">投诉电话：</span>
              <span class="value">{{ trackingInfo.complaintPhone || '400-800-9999' }}</span>
            </div>
            <div class="contact-item">
              <span class="label">官方网站：</span>
              <el-link :href="trackingInfo.website" target="_blank" type="primary">
                {{ trackingInfo.website || 'www.express.com' }}
              </el-link>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Refresh,
  Share,
  Printer,
  Location,
  Check
} from '@element-plus/icons-vue'
import { useOrderStore } from '@/stores/order'

// 路由
const router = useRouter()
const route = useRoute()

// Store
const orderStore = useOrderStore()

// 响应式数据
const loading = ref(false)

// 超时ID跟踪
const timeoutIds = new Set<number>()

// 组件卸载状态跟踪
const isUnmounted = ref(false)

// 物流信息
const trackingInfo = reactive({
  trackingNo: '',
  companyName: '',
  companyCode: '',
  senderName: '',
  senderAddress: '',
  receiverName: '',
  receiverAddress: '',
  shipTime: '',
  estimatedTime: '',
  status: '',
  serviceType: '',
  servicePhone: '',
  complaintPhone: '',
  website: ''
})

// 物流轨迹
interface TrackingHistoryItem {
  time: string
  status: string
  description: string
  location: string
  operator: string
  type: string
}
const trackingHistory = ref<TrackingHistoryItem[]>([])

/**
 * 配送进度步骤（根据当前状态实时计算）
 */
const progressSteps = computed(() => {
  const steps = [
    { label: '已揽收', key: 'picked_up', active: false, current: false },
    { label: '运输中', key: 'in_transit', active: false, current: false },
    { label: '派送中', key: 'out_for_delivery', active: false, current: false },
    { label: '已签收', key: 'delivered', active: false, current: false }
  ]

  const status = trackingInfo.status
  const statusOrder = ['picked_up', 'shipped', 'in_transit', 'out_for_delivery', 'delivering', 'delivered']
  const currentIndex = statusOrder.indexOf(status)

  // 异常/拒收/退回特殊处理
  if (['exception', 'rejected', 'returned'].includes(status)) {
    // 标记前面已完成的步骤
    steps.forEach((step, idx) => {
      if (idx < steps.length - 1) {
        step.active = true
      }
    })
    return steps
  }

  steps.forEach((step) => {
    const stepIndex = statusOrder.indexOf(step.key)
    if (currentIndex >= 0 && stepIndex >= 0 && stepIndex <= currentIndex) {
      step.active = true
    }
    if (step.key === status || (status === 'shipped' && step.key === 'picked_up') || (status === 'delivering' && step.key === 'out_for_delivery')) {
      step.current = true
    }
  })

  return steps
})

/**
 * 获取状态颜色
 */
const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    'pending': 'info',
    'pending_shipment': 'info',
    'shipped': 'primary',
    'picked_up': 'warning',
    'picked': 'warning',
    'in_transit': 'primary',
    'shipping': 'primary',
    'out_for_delivery': 'warning',
    'delivering': 'warning',
    'delivered': 'success',
    'exception': 'danger',
    'package_exception': 'danger',
    'rejected': 'danger',
    'rejected_returned': 'danger',
    'returned': 'info',
    'cancelled': 'info'
  }
  return colorMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    'pending': '待发货',
    'pending_shipment': '待发货',
    'shipped': '已发货',
    'picked_up': '已揽收',
    'picked': '已揽收',
    'in_transit': '运输中',
    'shipping': '运输中',
    'out_for_delivery': '派送中',
    'delivering': '派送中',
    'delivered': '已签收',
    'exception': '异常',
    'package_exception': '包裹异常',
    'rejected': '拒收',
    'rejected_returned': '拒收退回',
    'returned': '已退回',
    'cancelled': '已取消',
    'unknown': '未知'
  }
  return textMap[status] || '未知状态'
}

/**
 * 获取时间轴类型
 */
const getTimelineType = (type: string) => {
  const typeMap = {
    'success': 'success',
    'warning': 'warning',
    'danger': 'danger',
    'info': 'primary'
  }
  return typeMap[type] || 'primary'
}


/**
 * 获取已用时长
 */
const getUsedTime = () => {
  if (!trackingInfo.shipTime) return '-'

  const shipTime = new Date(trackingInfo.shipTime)
  const now = new Date()
  const diff = now.getTime() - shipTime.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `${days}天${hours}小时`
  } else {
    return `${hours}小时`
  }
}

/**
 * 获取剩余时长
 */
const getRemainingTime = () => {
  if (!trackingInfo.estimatedTime) return '-'

  const estimatedTime = new Date(trackingInfo.estimatedTime)
  const now = new Date()
  const diff = estimatedTime.getTime() - now.getTime()

  if (diff <= 0) return '已超时'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `${days}天${hours}小时`
  } else {
    return `${hours}小时`
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  router.back()
}

/**
 * 刷新轨迹
 */
const handleRefresh = () => {
  loadTrackingData()
}

/**
 * 分享
 */
const handleShare = () => {
  const url = window.location.href
  navigator.clipboard.writeText(url).then(() => {
    ElMessage.success('链接已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制链接')
  })
}

/**
 * 打印
 */
const handlePrint = () => {
  window.print()
}

/**
 * 获取物流公司名称
 */
const getExpressCompanyName = (code: string) => {
  const companies: Record<string, string> = {
    'SF': '顺丰速运',
    'YTO': '圆通速递',
    'ZTO': '中通快递',
    'STO': '申通快递',
    'YD': '韵达速递',
    'HTKY': '百世快递',
    'JD': '京东物流',
    'EMS': '中国邮政',
    'DBKD': '德邦快递',
    'UC': '优速快递'
  }
  return companies[code] || code
}

/**
 * 获取物流公司联系方式
 */
const getCompanyContact = (code: string) => {
  const contacts: Record<string, { service: string; complaint: string; website: string }> = {
    'SF': { service: '95338', complaint: '400-889-5338', website: 'https://www.sf-express.com' },
    'YTO': { service: '95554', complaint: '400-500-6666', website: 'https://www.yto.net.cn' },
    'ZTO': { service: '95311', complaint: '400-827-0270', website: 'https://www.zto.com' },
    'STO': { service: '95543', complaint: '400-889-5543', website: 'https://www.sto.cn' },
    'YD': { service: '95546', complaint: '400-821-6789', website: 'https://www.yundaex.com' }
  }
  return contacts[code] || { service: '400-800-8888', complaint: '400-800-9999', website: 'https://www.express.com' }
}

/**
 * 加载物流数据
 */
const loadTrackingData = async () => {
  if (isUnmounted.value) return

  loading.value = true

  try {
    const paramId = route.params.trackingNo || route.query.trackingNo
    const companyCode = route.query.company

    console.log('[物流跟踪详情] 加载数据，参数ID:', paramId)

    // 🔥 首先尝试从API获取订单数据
    let order = null
    try {
      const { apiService } = await import('@/services/apiService')
      // 尝试通过订单ID获取
      const response = await apiService.get(`/orders/${paramId}`)
      // 🔥 修复：apiService.get 直接返回 data，不需要再访问 .data
      if (response) {
        order = response
        console.log('[物流跟踪详情] 从API获取订单成功:', order.orderNumber)
      }
    } catch (_apiError) {
      console.log('[物流跟踪详情] API获取失败，尝试从store查找')
    }

    // 如果API获取失败，从订单store中查找
    if (!order) {
      const allOrders = orderStore.getOrders()
      console.log('[物流跟踪详情] store中订单总数:', allOrders.length)

      // 🔥 修复：支持通过订单ID、物流单号、订单号等多种方式查找
      order = allOrders.find(o =>
        o.id === paramId ||
        o.id === String(paramId) ||
        String(o.id) === String(paramId)
      )

      // 如果通过ID找不到，尝试通过物流单号查找
      if (!order) {
        order = allOrders.find(o =>
          o.trackingNumber === paramId ||
          o.expressNo === paramId
        )
      }

      // 如果还找不到，尝试通过订单号查找
      if (!order) {
        order = allOrders.find(o => o.orderNumber === paramId)
      }
    }

    if (!order) {
      console.error('[物流跟踪详情] 未找到订单，参数ID:', paramId)
      ElMessage.error('未找到对应的订单信息')
      if (!isUnmounted.value) {
        loading.value = false
      }
      return
    }

    console.log('[物流跟踪详情] 找到订单:', order.orderNumber, order.id)

    // 检查组件是否已卸载
    if (isUnmounted.value) return

    // 获取物流公司信息
    const expressCompany = order.expressCompany || companyCode || 'SF'
    const companyContact = getCompanyContact(expressCompany)

    // 使用真实订单数据
    Object.assign(trackingInfo, {
      trackingNo: order.trackingNumber || paramId || '',
      companyName: getExpressCompanyName(expressCompany),
      companyCode: expressCompany,
      senderName: '发货方', // 可以从订单或配置中获取
      senderAddress: '', // 可以从订单或配置中获取
      receiverName: order.receiverName || order.customerName || '',
      receiverAddress: order.receiverAddress || '',
      // 🔥 修复：优先使用shippingTime，其次shippedAt
      shipTime: order.shippingTime || order.shippedAt || '',
      estimatedTime: order.expectedDeliveryDate || '',
      status: order.logisticsStatus || mapOrderStatusToLogisticsStatus(order.status),
      serviceType: '标准快递', // 可以从订单或配置中获取
      servicePhone: companyContact.service,
      complaintPhone: companyContact.complaint,
      website: companyContact.website
    })

    console.log('[物流跟踪详情] 物流信息已加载:', trackingInfo)

    // 🔥 优先从真实API获取物流轨迹
    await fetchRealTraces(order)

    // 如果API没有获取到轨迹，尝试使用订单本地数据
    if (trackingHistory.value.length === 0) {
      // 使用真实物流轨迹数据
      if (order.logisticsHistory && Array.isArray(order.logisticsHistory) && order.logisticsHistory.length > 0) {
        trackingHistory.value = order.logisticsHistory.map((item: any) => ({
          time: item.time || '',
          status: getLogisticsStatusText(item.status),
          description: item.description || '',
          location: item.location || '',
          operator: item.operator || '',
          type: getTimelineTypeByStatus(item.status)
        })).reverse() // 倒序显示，最新的在上面
      } else {
        // 如果没有物流历史，从状态历史中提取物流相关信息
        if (order.statusHistory && Array.isArray(order.statusHistory)) {
          const logisticsStatuses = ['shipped', 'delivered', 'in_transit', 'out_for_delivery', 'picked_up']
          const logisticsHistoryItems = order.statusHistory
            .filter((h: any) => logisticsStatuses.includes(h.status))
            .map((h: any) => ({
              time: h.time || '',
              status: getLogisticsStatusText(h.status),
              description: h.description || h.remark || '',
              location: '',
              operator: h.operator || '',
              type: getTimelineTypeByStatus(h.status)
            }))

          trackingHistory.value = logisticsHistoryItems.reverse()
        } else {
          trackingHistory.value = []
        }
      }
    }

  } catch (error) {
    console.error('加载物流信息失败:', error)
    if (!isUnmounted.value) {
      ElMessage.error('加载物流信息失败')
    }
  } finally {
    if (!isUnmounted.value) {
      loading.value = false
    }
  }
}

/**
 * 🔥 从真实API获取物流轨迹
 */
const fetchRealTraces = async (order: any) => {
  try {
    const trackingNo = order.trackingNumber || order.expressNo
    const companyCode = order.expressCompany
    if (!trackingNo || !companyCode) {
      console.log('[物流跟踪详情] 缺少物流单号或快递公司代码，跳过API查询')
      return
    }

    const { logisticsApi } = await import('@/api/logistics')
    const phone = order.receiverPhone || order.customerPhone || undefined
    const response = await logisticsApi.queryTrace(trackingNo, companyCode, phone)

    console.log('[物流跟踪详情] API轨迹查询响应:', response)

    if (response?.success && response.data) {
      const data = response.data

      if (data.success && data.traces && data.traces.length > 0) {
        // 按时间排序（最新的在上面）
        const sortedTraces = [...data.traces].sort((a: any, b: any) => {
          const timeA = new Date(a.time).getTime()
          const timeB = new Date(b.time).getTime()
          return timeB - timeA
        })

        trackingHistory.value = sortedTraces.map((trace: any, index: number) => ({
          time: trace.time || '',
          status: trace.status || detectStatusFromDescription(trace.description),
          description: trace.description || '',
          location: trace.location || '',
          operator: trace.operator || '',
          type: index === 0 ? 'success' : 'primary'
        }))

        // 🔥 同步更新物流状态（使用最新轨迹的信息）
        if (sortedTraces.length > 0) {
          const latestDesc = sortedTraces[0].description || ''
          const detectedStatus = detectLogisticsStatusFromDesc(latestDesc)
          if (detectedStatus && detectedStatus !== trackingInfo.status) {
            trackingInfo.status = detectedStatus
          }
          // 更新API返回的状态
          if (data.status && data.status !== 'error' && data.status !== 'need_phone_verify') {
            trackingInfo.status = data.status
          }
        }

        // 更新预计送达时间
        if (data.estimatedDeliveryTime) {
          trackingInfo.estimatedTime = data.estimatedDeliveryTime
        }

        console.log('[物流跟踪详情] 从API获取到', trackingHistory.value.length, '条轨迹')
      } else {
        console.log('[物流跟踪详情] API返回无轨迹数据:', data.statusText)
      }
    }
  } catch (error) {
    console.error('[物流跟踪详情] 调用物流API失败:', error)
  }
}

/**
 * 根据描述检测状态文本
 */
const detectStatusFromDescription = (desc: string): string => {
  if (!desc) return '物流动态'
  const d = desc.toLowerCase()
  if (d.includes('签收') || d.includes('已送达') || d.includes('代收')) return '已签收'
  if (d.includes('派送') || d.includes('派件') || d.includes('投递') || d.includes('送货')) return '派送中'
  if (d.includes('到达') || d.includes('运输') || d.includes('转运') || d.includes('发往') || d.includes('离开')) return '运输中'
  if (d.includes('揽收') || d.includes('收件') || d.includes('已收取') || d.includes('快件已收')) return '已揽收'
  if (d.includes('拒收') || d.includes('拒签')) return '拒收'
  if (d.includes('退回') || d.includes('退件')) return '退回'
  if (d.includes('异常') || d.includes('问题件')) return '异常'
  return '物流动态'
}

/**
 * 根据描述检测物流状态code
 */
const detectLogisticsStatusFromDesc = (desc: string): string => {
  if (!desc) return ''
  const d = desc.toLowerCase()
  if (d.includes('签收') || d.includes('已送达') || d.includes('代收')) return 'delivered'
  if (d.includes('派送') || d.includes('派件') || d.includes('投递')) return 'out_for_delivery'
  if (d.includes('到达') || d.includes('运输') || d.includes('转运') || d.includes('发往')) return 'in_transit'
  if (d.includes('揽收') || d.includes('收件') || d.includes('已收取')) return 'picked_up'
  if (d.includes('拒收')) return 'rejected'
  if (d.includes('退回')) return 'returned'
  if (d.includes('异常')) return 'exception'
  return ''
}

/**
 * 获取物流状态文本
 */
const getLogisticsStatusText = (status: string): string => {
  const textMap: Record<string, string> = {
    'pending': '待发货',
    'pending_shipment': '待发货',
    'picked_up': '已揽收',
    'picked': '已揽收',
    'shipped': '已发货',
    'in_transit': '运输中',
    'shipping': '运输中',
    'out_for_delivery': '派送中',
    'delivering': '派送中',
    'delivered': '已签收',
    'exception': '异常',
    'package_exception': '包裹异常',
    'rejected': '拒收',
    'rejected_returned': '拒收退回',
    'returned': '已退回',
    'cancelled': '已取消',
    'unknown': '未知'
  }
  return textMap[status] || status
}

/**
 * 根据状态获取时间轴类型
 */
const getTimelineTypeByStatus = (status: string): string => {
  const typeMap: Record<string, string> = {
    'delivered': 'success',
    'out_for_delivery': 'warning',
    'shipped': 'primary',
    'in_transit': 'info',
    'picked_up': 'info',
    'exception': 'danger',
    'rejected': 'danger',
    'returned': 'info',
    'pending': 'warning'
  }
  return typeMap[status] || 'info'
}

/**
 * 映射订单状态到物流状态
 */
const mapOrderStatusToLogisticsStatus = (orderStatus: string): string => {
  const statusMap: Record<string, string> = {
    'pending_shipment': 'pending',
    'pending': 'pending',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'in_transit': 'in_transit',
    'shipping': 'in_transit',
    'out_for_delivery': 'out_for_delivery',
    'delivering': 'out_for_delivery',
    'package_exception': 'exception',
    'exception': 'exception',
    'rejected': 'rejected',
    'rejected_returned': 'returned',
    'returned': 'returned',
    'picked_up': 'picked_up',
    'picked': 'picked_up',
    'cancelled': 'cancelled'
  }
  return statusMap[orderStatus] || 'pending'
}

// 页面加载时获取数据
onMounted(() => {
  loadTrackingData()
})

// 组件卸载前清理
onBeforeUnmount(() => {
  // 设置组件卸载状态
  isUnmounted.value = true

  // 清理所有未完成的 setTimeout
  timeoutIds.forEach(id => clearTimeout(id))
  timeoutIds.clear()
})
</script>

<style scoped>
.track-detail {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-info h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tracking-no {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #409EFF;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.info-card,
.track-card,
.status-card,
.time-card,
.contact-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.track-count {
  color: #909399;
  font-size: 14px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item .label {
  color: #909399;
  margin-right: 8px;
  min-width: 80px;
}

.info-item .value {
  color: #303133;
  font-weight: 500;
}

.track-timeline {
  padding: 20px 0;
}

.track-item {
  padding-left: 20px;
}

.track-status {
  font-weight: bold;
  margin-bottom: 8px;
}

.track-status.success {
  color: #67C23A;
}

.track-status.warning {
  color: #E6A23C;
}

.track-status.danger {
  color: #F56C6C;
}

.track-status.info {
  color: #409EFF;
}

.track-description {
  color: #606266;
  margin-bottom: 8px;
  line-height: 1.5;
}

.track-location {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 14px;
  margin-bottom: 4px;
}

.track-operator {
  color: #909399;
  font-size: 14px;
}

.progress-steps {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
  padding: 10px 0 20px;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
  z-index: 1;
}

.step-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
  background: #e4e7ed;
  color: #909399;
  border: 2px solid #dcdfe6;
  transition: all 0.3s;
}

.progress-step.active .step-icon {
  background: #67C23A;
  color: #fff;
  border-color: #67C23A;
}

.progress-step.current .step-icon {
  background: #409EFF;
  color: #fff;
  border-color: #409EFF;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(64, 158, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(64, 158, 255, 0); }
}

.step-label {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  text-align: center;
  white-space: nowrap;
}

.progress-step.active .step-label,
.progress-step.current .step-label {
  color: #303133;
  font-weight: 500;
}

.step-line {
  position: absolute;
  top: 16px;
  left: calc(50% + 20px);
  width: calc(100% - 40px);
  height: 2px;
  background: #dcdfe6;
  z-index: 0;
}

.step-line.filled {
  background: #67C23A;
}

.progress-summary {
  text-align: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f2f5;
}

.time-info,
.contact-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.time-item,
.contact-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #F5F7FA;
}

.time-item:last-child,
.contact-item:last-child {
  border-bottom: none;
}

.time-item .label,
.contact-item .label {
  color: #909399;
}

.time-item .value,
.contact-item .value {
  color: #303133;
  font-weight: 500;
}

@media print {
  .page-header .header-actions {
    display: none;
  }

  .track-detail {
    padding: 0;
  }
}
</style>
