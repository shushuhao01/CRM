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
        <!-- 状态统计 -->
        <el-card class="status-card">
          <template #header>
            <div class="card-header">
              <span>配送进度</span>
            </div>
          </template>
          
          <div class="progress-info">
            <el-progress
              :percentage="getProgressPercentage()"
              :color="getProgressColor()"
              :stroke-width="8"
              text-inside
            />
            <div class="progress-text">
              {{ getProgressText() }}
            </div>
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
  Location
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
const trackingHistory = ref([])

/**
 * 获取状态颜色
 */
const getStatusColor = (status: string) => {
  const colorMap = {
    'pending': 'info',
    'picked_up': 'warning',
    'in_transit': 'primary',
    'out_for_delivery': 'warning',
    'delivered': 'success',
    'exception': 'danger',
    'returned': 'info'
  }
  return colorMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const textMap = {
    'pending': '待发货',
    'picked_up': '已揽收',
    'in_transit': '运输中',
    'out_for_delivery': '派送中',
    'delivered': '已签收',
    'exception': '异常',
    'returned': '已退回'
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
 * 获取进度百分比
 */
const getProgressPercentage = () => {
  const statusMap = {
    'pending': 0,
    'picked_up': 20,
    'in_transit': 60,
    'out_for_delivery': 80,
    'delivered': 100,
    'exception': 50,
    'returned': 0
  }
  return statusMap[trackingInfo.status] || 0
}

/**
 * 获取进度颜色
 */
const getProgressColor = () => {
  const colorMap = {
    'pending': '#909399',
    'picked_up': '#E6A23C',
    'in_transit': '#409EFF',
    'out_for_delivery': '#E6A23C',
    'delivered': '#67C23A',
    'exception': '#F56C6C',
    'returned': '#909399'
  }
  return colorMap[trackingInfo.status] || '#909399'
}

/**
 * 获取进度文本
 */
const getProgressText = () => {
  return getStatusText(trackingInfo.status)
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
    const trackingNo = route.params.trackingNo || route.query.trackingNo
    const companyCode = route.query.company
    
    // 从订单store中查找对应的订单
    const allOrders = orderStore.getOrders()
    const order = allOrders.find(o => 
      o.trackingNumber === trackingNo || 
      o.expressNo === trackingNo
    )
    
    if (!order) {
      ElMessage.error('未找到对应的订单信息')
      if (!isUnmounted.value) {
        loading.value = false
      }
      return
    }
    
    // 检查组件是否已卸载
    if (isUnmounted.value) return
    
    // 获取物流公司信息
    const expressCompany = order.expressCompany || companyCode || 'SF'
    const companyContact = getCompanyContact(expressCompany)
    
    // 使用真实订单数据
    Object.assign(trackingInfo, {
      trackingNo: order.trackingNumber || order.expressNo || trackingNo || '',
      companyName: getExpressCompanyName(expressCompany),
      companyCode: expressCompany,
      senderName: '发货方', // 可以从订单或配置中获取
      senderAddress: '', // 可以从订单或配置中获取
      receiverName: order.receiverName || '',
      receiverAddress: order.receiverAddress || '',
      shipTime: order.shippingTime || order.shipTime || '',
      estimatedTime: order.estimatedDeliveryTime || '',
      status: order.logisticsStatus || mapOrderStatusToLogisticsStatus(order.status),
      serviceType: '标准快递', // 可以从订单或配置中获取
      servicePhone: companyContact.service,
      complaintPhone: companyContact.complaint,
      website: companyContact.website
    })
    
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
 * 获取物流状态文本
 */
const getLogisticsStatusText = (status: string): string => {
  const textMap: Record<string, string> = {
    'pending': '待发货',
    'picked_up': '已揽收',
    'shipped': '已发货',
    'in_transit': '运输中',
    'out_for_delivery': '派送中',
    'delivered': '已签收',
    'exception': '异常',
    'rejected': '拒收',
    'returned': '已退回'
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
    'shipped': 'shipped',
    'delivered': 'delivered',
    'in_transit': 'in_transit',
    'out_for_delivery': 'out_for_delivery',
    'package_exception': 'exception'
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

.progress-info {
  text-align: center;
}

.progress-text {
  margin-top: 15px;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.time-info,
.contact-info {
  space-y: 12px;
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